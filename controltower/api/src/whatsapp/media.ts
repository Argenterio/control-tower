// whatsapp/media.ts — Pipeline de descarga, validación y almacenamiento de media.
// Sin objetos JS como archivos. Sin .enc legacy. Sin nombres mágicos.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import mime from "mime-types";
import { config } from "../config/env";
import { normalizeMediaKey } from "./mediaKey";
import { transcribeWithGroqWhisper } from "../ai/providers/groqWhisper";
import { transcribeWithOpenAI } from "../ai/providers/openai";

export { normalizeMediaKey } from "./mediaKey";

const WA_MEDIA_KEY_LEN = 32;

// Tamaño mínimo (en bytes) que debe tener un adjunto para considerarse válido.
// Por debajo de esto lo descartamos (WhatsApp a veces entrega un stub de 14 bytes
// cuando la URL firmada expiró o el base64 viene truncado). Esto evita que se
// guarden archivos vacíos como evidencia y que el frontend muestre "0:00 / 0:00".
export const MIN_MEDIA_BYTES = 1024;
const WA_HKDF_INFO: Record<string, string> = {
  image: "WhatsApp Image Keys",
  video: "WhatsApp Video Keys",
  audio: "WhatsApp Audio Keys",
  document: "WhatsApp Document Keys",
  sticker: "WhatsApp Image Keys"
};

function hkdfExpand(key: Buffer, length: number, info: string): Buffer {
  const prk = key;
  const infoBuf = Buffer.from(info, "utf-8");
  const hashLen = 32;
  const n = Math.ceil(length / hashLen);
  let t = Buffer.alloc(0);
  const okm = Buffer.alloc(n * hashLen);
  for (let i = 1; i <= n; i++) {
    const hmac = crypto.createHmac("sha256", prk);
    hmac.update(Buffer.concat([t, infoBuf, Buffer.from([i])]));
    t = hmac.digest();
    t.copy(okm, (i - 1) * hashLen);
  }
  return okm.subarray(0, length);
}

function decryptWhatsAppMedia(encryptedBuf: Buffer, mediaKeyB64: string | Buffer, kind: string): Buffer | null {
  try {
    const mediaKey = typeof mediaKeyB64 === "string"
      ? Buffer.from(mediaKeyB64, "base64")
      : mediaKeyB64;
    if (mediaKey.length !== WA_MEDIA_KEY_LEN) return null;
    const info = WA_HKDF_INFO[kind] || WA_HKDF_INFO.document;
    const expanded = hkdfExpand(mediaKey, 112, info);
    const iv = expanded.subarray(0, 16);
    const cipherKey = expanded.subarray(16, 48);
    const macKey = expanded.subarray(48, 80);
    if (encryptedBuf.length < 10) return null;
    const fileEnc = encryptedBuf.subarray(0, encryptedBuf.length - 10);
    const macFromFile = encryptedBuf.subarray(encryptedBuf.length - 10);
    const macComputed = crypto.createHmac("sha256", macKey).update(Buffer.concat([iv, fileEnc])).digest().subarray(0, 10);
    if (!macComputed.equals(macFromFile)) {
      // MAC inválido: devolvemos null y dejamos que el caller intente el archivo crudo.
      return null;
    }
    
    // Intento 1: Decipher con auto-padding estándar PKCS7
    try {
      const decipher = crypto.createDecipheriv("aes-256-cbc", cipherKey, iv);
      decipher.setAutoPadding(true);
      return Buffer.concat([decipher.update(fileEnc), decipher.final()]);
    } catch {
      // Intento 2: Decipher sin padding + remoción manual del byte de padding
      const decipher = crypto.createDecipheriv("aes-256-cbc", cipherKey, iv);
      decipher.setAutoPadding(false);
      let buf = Buffer.concat([decipher.update(fileEnc), decipher.final()]);
      if (buf.length > 0) {
        const pad = buf[buf.length - 1];
        if (pad >= 1 && pad <= 16) {
          let valid = true;
          for (let i = 1; i <= pad; i++) {
            if (buf[buf.length - i] !== pad) { valid = false; break; }
          }
          if (valid) buf = buf.subarray(0, buf.length - pad);
        }
      }
      return buf;
    }
  } catch {
    return null;
  }
}

function getResolvedUploadDir(): string {
  const dirs = [
    config.media.uploadDir,
    path.join(process.cwd(), "public", "uploads", "media"),
    path.join(process.cwd(), "uploads", "media"),
    "/data/uploads/media"
  ].filter(Boolean) as string[];

  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      /* continue */
    }
  }
  const fallback = path.join(process.cwd(), "uploads");
  try { fs.mkdirSync(fallback, { recursive: true }); } catch { /* ignore */ }
  return fallback;
}

const UPLOAD_DIR = getResolvedUploadDir();

/**
 * Descarga media directamente desde Evolution API usando messageId + instance.
 * Esto es el ÚNICO path confiable: las URLs firmadas que Evolution entrega en
 * los webhooks (mmg.whatsapp.net, *.whatsapp.net) caducan en minutos, por lo que
 * si n8n las reenvía tal cual llegan a este server, ya están expiradas y
 * obtenemos un cuerpo de 14 bytes que no es audio.
 *
 * Endpoint Evolution: GET /chat/getBase64FromMediaMessage/{instance}
 *   body: { message: { key: { remoteJid, fromMe, id } }, convertToMp4: false }
 *   resp: { base64: "...", mimetype: "audio/ogg; codecs=opus" }
 *
 * Si no hay messageId o falla, devuelve null (el caller seguirá intentando
 * la URL firmada como fallback).
 */
async function downloadFromEvolutionApi(
  messageId: string | null,
  remoteJid: string | null
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!messageId || !config.whatsapp.evolutionApiKey) return null;
  const baseUrl = (config.whatsapp.evolutionApiUrl || "").replace(/\/+$/, "");
  const instance = config.whatsapp.evolutionInstance;
  if (!baseUrl || !instance) return null;

  const url = `${baseUrl}/chat/getBase64FromMediaMessage/${instance}`;
  const body = {
    message: {
      key: {
        remoteJid: remoteJid || "unknown@s.whatsapp.net",
        fromMe: false,
        id: messageId
      }
    },
    convertToMp4: false
  };

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), config.media.downloadTimeoutMs);
    const res = await fetch(url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "apikey": config.whatsapp.evolutionApiKey
      },
      body: JSON.stringify(body)
    });
    clearTimeout(timeout);
    if (!res.ok) {
      console.warn(`[media] Evolution getBase64FromMediaMessage HTTP ${res.status}`);
      return null;
    }
    const data: any = await res.json().catch(() => null);
    const b64 = data?.base64 || data?.data?.base64;
    if (typeof b64 !== "string" || b64.length < 100) {
      console.warn(`[media] Evolution base64 inválido (len=${b64?.length ?? 0})`);
      return null;
    }
    // La API a veces devuelve el prefijo "data:audio/ogg;base64,XXX"
    const cleaned = b64.includes(",") ? b64.split(",").pop() || b64 : b64;
    const buf = Buffer.from(cleaned, "base64");
    if (buf.length < MIN_MEDIA_BYTES) {
      console.warn(`[media] Evolution devolvió buffer muy pequeño (${buf.length} bytes)`);
      return null;
    }
    const ct = (data?.mimetype || data?.data?.mimetype || "") as string;
    console.log(`[media] ✅ Evolution download OK: ${(buf.length / 1024).toFixed(1)} KB (${ct || "?"})`);
    return { buffer: buf, contentType: ct || "" };
  } catch (e) {
    console.warn(`[media] Evolution download error: ${(e as Error).message}`);
    return null;
  }
}

function extFromMagicBytes(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return "gif";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return "webp";
  if (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) return "ogg";
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf.length >= 12 && buf[8] === 0x57 && buf[9] === 0x41 && buf[10] === 0x56 && buf[11] === 0x45) return "wav";
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return "pdf";
  if (buf.length >= 8 && buf[4] === 0x66 && buf[5] === 0x74 && buf[6] === 0x79 && buf[7] === 0x70) return "mp4";
  if (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) return "webm";
  if (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) return "mp3";
  if (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) return "mp3";
  return null;
}

export interface MediaFinal {
  url: string;
  mimeType: string;
  fileName: string;
  kind: "image" | "audio" | "video" | "document" | "sticker";
  sizeBytes: number;
  mediaDecryptFailed: boolean;
}

/**
 * Determina el MIME/extensión final a partir de:
 *   1. MIME declarado por el cliente (imageMessage.mimetype, etc.)
 *   2. Content-Type del HTTP
 *   3. Magic bytes del archivo
 *   4. Fallback por kind (nunca devuelve octet-stream para image/audio/video)
 */
function pickMediaMimeAndExt(opts: {
  declared?: string | null;
  contentType?: string | null;
  buffer?: Buffer;
  kind: string;
}): { mimeType: string; ext: string } {
  const declared = opts.declared?.trim();
  const ct = opts.contentType?.trim();

  let mimeType = "application/octet-stream";
  let ext = "bin";

  if (declared && !/octet-stream/i.test(declared) && !/encrypted/i.test(declared)) {
    mimeType = declared;
    ext = mime.extension(declared) || extFromMagicBytes(opts.buffer || Buffer.alloc(0)) || "bin";
  } else if (ct && !/octet-stream/i.test(ct) && !/encrypted/i.test(ct)) {
    mimeType = ct;
    ext = mime.extension(ct) || extFromMagicBytes(opts.buffer || Buffer.alloc(0)) || "bin";
  } else if (opts.buffer && opts.buffer.length > 0) {
    const magicExt = extFromMagicBytes(opts.buffer);
    if (magicExt) {
      const mimeFromExt = mime.lookup(magicExt);
      mimeType = (mimeFromExt as string) || declared || ct || "application/octet-stream";
      ext = magicExt;
    }
  } else {
    const kindMap: Record<string, { mimeType: string; ext: string }> = {
      image:    { mimeType: "image/jpeg",       ext: "jpg" },
      audio:    { mimeType: "audio/ogg",        ext: "ogg" },
      video:    { mimeType: "video/mp4",        ext: "mp4" },
      document: { mimeType: "application/pdf",  ext: "pdf" },
      sticker:  { mimeType: "image/webp",       ext: "webp" }
    };
    const k = (opts.kind || "").toLowerCase();
    if (kindMap[k]) {
      mimeType = kindMap[k].mimeType;
      ext = kindMap[k].ext;
    }
  }

  // Normalización crítica para Groq Whisper API:
  // Groq rechaza extensión .oga (HTTP 400); exige .ogg, .mp3, .m4a, .wav, .webm, etc.
  if (ext === "oga") ext = "ogg";

  return { mimeType, ext };
}

/**
 * Descarga / decodifica / valida / guarda un adjunto.
 *
 * - Acepta Base64 inline (con o sin prefijo data:) o URL HTTP.
 * - Si el archivo viene encriptado (.enc / octet-stream) y hay mediaKey, intenta
 *   desencriptar con HKDF + AES-256-CBC.
 * - Si la desencriptación falla pero el archivo tiene MIME declarado, guarda
 *   igualmente con la extensión correcta y marca mediaDecryptFailed=true.
 * - Si el resultado es demasiado pequeño (< MIN_MEDIA_BYTES), devuelve null
 *   para evitar guardar stubs vacíos como evidencia.
 * - Si el download falla pero tenemos messageId + remoteJid + Evolution API
 *   configurada, intenta como fallback pedirle a Evolution el base64 real.
 * - NUNCA devuelve un Buffer vacío o una URL inválida.
 */
export async function downloadAndStoreMedia(
  mediaInput: string,
  kind: "image" | "audio" | "video" | "document" | "sticker",
  declaredMime: string | null,
  mediaKey: Buffer | null,
  opts: { messageId?: string | null; remoteJid?: string | null } = {}
): Promise<MediaFinal | null> {
  if (!mediaInput) return null;

  // Ya es ruta local servida por la API
  if (mediaInput.startsWith("/api/media/")) {
    const filename = path.basename(mediaInput);
    const ext = path.extname(filename).replace(/^\./, "").toLowerCase();
    const mimeType = (ext && mime.lookup(ext)) || "application/octet-stream";
    const fp = path.join(UPLOAD_DIR, filename);
    const sizeBytes = fs.existsSync(fp) ? fs.statSync(fp).size : 0;
    if (sizeBytes < MIN_MEDIA_BYTES) {
      console.warn(`[media] /api/media local demasiado pequeño (${sizeBytes} bytes) — ${filename}`);
      return null;
    }
    return { url: mediaInput, mimeType: mimeType as string, fileName: filename, kind, sizeBytes, mediaDecryptFailed: false };
  }

  // Caso 1: data URL o Base64 inline
  if (mediaInput.startsWith("data:") || (!mediaInput.startsWith("http") && mediaInput.length > 100)) {
    try {
      let base64Data = mediaInput;
      let inlineMime: string | undefined;
      if (mediaInput.startsWith("data:")) {
        // Soporta MIME types con parámetros tipo "audio/ogg; codecs=opus"
        const match = mediaInput.match(/^data:([^,]+);base64,(.*)$/s);
        if (match) {
          inlineMime = match[1];
          base64Data = match[2];
        }
      }
      let buf = Buffer.from(base64Data, "base64");

      // Si el base64 inline es demasiado pequeño (típicamente un stub de 14 bytes
      // que n8n entrega cuando algo falla) o no parece audio real (pocos bytes
      // sin magic header), pedimos el archivo real a Evolution API.
      const looksLikeAudioMagic =
        buf.length >= 4 &&
        (
          (buf[0] === 0xFF && (buf[1] & 0xE0) === 0xE0) || // MP3
          (buf[0] === 0x4F && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) || // OGG
          (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) || // WAV/WEBP/AVI
          (buf[0] === 0x1A && buf[1] === 0x45 && buf[2] === 0xDF && buf[3] === 0xA3) || // WEBM/MKV
          (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) // MP3 ID3
        );

      if (buf.length === 0 || buf.length < MIN_MEDIA_BYTES || !looksLikeAudioMagic) {
        console.warn(`[media] Base64 inline inválido (len=${buf.length}, magicOk=${looksLikeAudioMagic}). Intentando Evolution fallback...`);
        const evo = await downloadFromEvolutionApi(opts.messageId ?? null, opts.remoteJid ?? null);
        if (evo && evo.buffer.length >= MIN_MEDIA_BYTES) {
          buf = Buffer.from(evo.buffer);
        } else if (buf.length < MIN_MEDIA_BYTES) {
          return null;
        }
        // Si buf del fallback es OK, seguimos; si no, descartamos abajo.
      }

      if (buf.length < MIN_MEDIA_BYTES) {
        console.warn(`[media] Base64 inline demasiado pequeño (${buf.length} bytes), descartando`);
        return null;
      }

      // Si el contenido está encriptado y tenemos mediaKey, intentamos descifrar.
      let mediaDecryptFailed = false;
      // WhatsApp envía audios cifrados con un header que NO es OGG magic; si parece
      // audio pero el magic no calza, intentamos descifrar.
      const looksEncrypted = !looksLikeAudioMagic && mediaKey && buf.length > 10;
      if (looksEncrypted && mediaKey) {
        const decrypted = decryptWhatsAppMedia(buf, mediaKey, kind);
        if (decrypted && decrypted.length > 0) {
          buf = Buffer.from(decrypted);
          console.log(`[media] 🔓 Desencriptado OK: ${(buf.length / 1024).toFixed(1)} KB`);
        } else {
          mediaDecryptFailed = true;
          console.warn(`[media] No se pudo desencriptar (clave inválida o archivo no encriptado).`);
        }
      } else if (!looksLikeAudioMagic && !mediaKey) {
        mediaDecryptFailed = true;
      }

      const { mimeType, ext } = pickMediaMimeAndExt({
        declared: declaredMime || inlineMime || null,
        buffer: buf,
        kind
      });
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      return { url: `/api/media/${filename}`, mimeType, fileName: filename, kind, sizeBytes: buf.length, mediaDecryptFailed };
    } catch (e) {
      console.warn(`[media] Error procesando base64 inline: ${(e as Error).message}`);
      return null;
    }
  }

  // Caso 2: URL HTTP / HTTPS
  if (/^https?:\/\//i.test(mediaInput)) {
    try {
      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), config.media.downloadTimeoutMs);
      const res = await fetch(mediaInput, { signal: ctrl.signal });
      clearTimeout(timeout);

      let buf: Buffer | null = null;
      let contentType = "";

      if (res.ok) {
        buf = Buffer.from(await res.arrayBuffer());
        contentType = res.headers.get("content-type") || "";

        // Si el cuerpo viene encriptado y tenemos mediaKey, desencriptar.
        const looksEncrypted = contentType.includes("octet-stream") || contentType.includes("encrypted");
        if (looksEncrypted && mediaKey && buf.length > 10) {
          const decrypted = decryptWhatsAppMedia(buf, mediaKey, kind);
          if (decrypted && decrypted.length > 0) {
            buf = Buffer.from(decrypted);
            console.log(`[media] 🔓 Desencriptado OK: ${(buf.length / 1024).toFixed(1)} KB`);
          }
        }
      } else {
        console.warn(`[media] HTTP ${res.status} al descargar ${kind} (URL firmada probablemente expirada)`);
      }

      // Si el resultado es un stub, intentar Evolution como fallback.
      if (!buf || buf.length < MIN_MEDIA_BYTES) {
        console.warn(`[media] Download directo inválido (${buf?.length ?? 0} bytes). Intentando Evolution fallback...`);
        const evo = await downloadFromEvolutionApi(opts.messageId ?? null, opts.remoteJid ?? null);
        if (evo && evo.buffer.length >= MIN_MEDIA_BYTES) {
          buf = evo.buffer;
          contentType = evo.contentType || contentType;
        } else {
          console.warn(`[media] Descartado: payload < ${MIN_MEDIA_BYTES} bytes y sin fallback exitoso.`);
          return null;
        }
      }

      let mediaDecryptFailed = false;
      const looksEncrypted = contentType.includes("octet-stream") || contentType.includes("encrypted");
      if (looksEncrypted && mediaKey) {
        const decrypted = decryptWhatsAppMedia(buf, mediaKey, kind);
        if (decrypted && decrypted.length > 0) {
          buf = Buffer.from(decrypted);
          console.log(`[media] 🔓 Desencriptado OK: ${(buf.length / 1024).toFixed(1)} KB`);
        } else {
          mediaDecryptFailed = true;
          console.warn(`[media] No se pudo desencriptar (clave inválida o archivo no encriptado). Se guardará lo recibido con MIME declarado.`);
        }
      } else if (looksEncrypted && !mediaKey) {
        mediaDecryptFailed = true;
      }

      const { mimeType, ext } = pickMediaMimeAndExt({
        declared: declaredMime,
        contentType,
        buffer: buf,
        kind
      });

      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      return {
        url: `/api/media/${filename}`,
        mimeType,
        fileName: filename,
        kind,
        sizeBytes: buf.length,
        mediaDecryptFailed
      };
    } catch (e) {
      console.warn(`[media] Error descargando ${kind}: ${(e as Error).message}`);
      return null;
    }
  }

  return null;
}

// ============================================
// Transcripción de audio
// ============================================

export interface AudioResolved {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

function mimeToAudioExt(mimeType: string): string {
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("webm")) return "webm";
  return "ogg";
}

/**
 * Resuelve una URL/ruta/Base64 de audio a un Buffer válido + mime + filename.
 * Valida que sea realmente un Buffer con bytes.
 */
export async function resolveAudioBuffer(input: string, mimeHint: string | null): Promise<AudioResolved | null> {
  if (!input) return null;

  // Caso A: ruta local /api/media/...
  if (input.startsWith("/api/media/")) {
    const filename = path.basename(input);
    const fp = path.join(UPLOAD_DIR, filename);
    if (!fs.existsSync(fp)) return null;
    const buf = fs.readFileSync(fp);
    if (buf.length === 0) return null;
    if (buf.length < MIN_MEDIA_BYTES) {
      console.warn(`[media] resolveAudioBuffer: /api/media local demasiado pequeño (${buf.length} bytes)`);
      return null;
    }
    const ext = path.extname(filename).replace(/^\./, "").toLowerCase();
    const mimeType = (ext && mime.lookup(ext)) || mimeHint || "audio/ogg";
    return { buffer: buf, filename, mimeType: mimeType as string, sizeBytes: buf.length };
  }

  // Caso B: data URL o Base64 inline
  if (input.startsWith("data:") || (!input.startsWith("http") && input.length > 50)) {
    let base64Data = input;
    let mimeType = mimeHint || "audio/ogg";
    if (input.startsWith("data:")) {
      // Soporta MIME con parámetros, ej: "audio/ogg; codecs=opus"
      const match = input.match(/^data:([^,]+);base64,(.*)$/s);
      if (match) {
        mimeType = match[1] || mimeType;
        base64Data = match[2];
      }
    }
    const buf = Buffer.from(base64Data, "base64");
    if (buf.length === 0) return null;
    if (buf.length < MIN_MEDIA_BYTES) {
      console.warn(`[media] resolveAudioBuffer: base64 inline demasiado pequeño (${buf.length} bytes)`);
      return null;
    }
    const ext = mimeToAudioExt(mimeType);
    return { buffer: buf, filename: `audio.${ext}`, mimeType, sizeBytes: buf.length };
  }

  // Caso C: URL HTTP
  if (/^https?:\/\//i.test(input)) {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), config.media.downloadTimeoutMs);
    try {
      const res = await fetch(input, { signal: ctrl.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) return null;
      if (buf.length < MIN_MEDIA_BYTES) {
        console.warn(`[media] resolveAudioBuffer: download HTTP demasiado pequeño (${buf.length} bytes)`);
        return null;
      }
      const mimeType = res.headers.get("content-type") || mimeHint || "audio/ogg";
      const ext = mimeToAudioExt(mimeType);
      return { buffer: buf, filename: `audio.${ext}`, mimeType, sizeBytes: buf.length };
    } catch {
      clearTimeout(timeout);
      return null;
    }
  }

  return null;
}

/**
 * Transcribe audio usando Groq Whisper (primario) → OpenAI Whisper (fallback).
 * - Recibe siempre Buffer (no objetos JS).
 * - Valida MIME/extensión/tamaño/contenido.
 * - Si falla, devuelve error tipado (sin propagar a UI).
 */
export async function transcribeAudio(input: string, mimeHint: string | null): Promise<string | null> {
  const resolved = await resolveAudioBuffer(input, mimeHint);
  if (!resolved) {
    console.warn("[whisper] No se pudo resolver audio (URL/base64 inválido)");
    return null;
  }
  if (resolved.sizeBytes < 256) {
    console.warn(`[whisper] Audio demasiado pequeño (${resolved.sizeBytes} bytes), descartando`);
    return null;
  }
  if (resolved.mimeType && !resolved.mimeType.startsWith("audio/")) {
    console.warn(`[whisper] MIME ${resolved.mimeType} no es audio — descartando`);
    return null;
  }

  // Normalizar nombre de archivo para APIs Whisper (Groq/OpenAI exigen .ogg, no .oga)
  let cleanFilename = resolved.filename;
  if (cleanFilename.endsWith(".oga")) {
    cleanFilename = cleanFilename.replace(/\.oga$/, ".ogg");
  }

  // 1) Groq
  if (config.ai.groq.available) {
    try {
      const r = await transcribeWithGroqWhisper(resolved.buffer, cleanFilename, resolved.mimeType);
      console.log(`[whisper] provider=groq status=success size=${resolved.sizeBytes} textLen=${r.text.length}`);
      return r.text;
    } catch (err) {
      console.warn(`[whisper] provider=groq failed: ${(err as Error).message}`);
    }
  }

  // 2) OpenAI fallback
  if (config.ai.openai.available) {
    try {
      const r = await transcribeWithOpenAI(resolved.buffer, resolved.filename, resolved.mimeType);
      console.log(`[whisper] provider=openai status=success size=${resolved.sizeBytes} textLen=${r.text.length}`);
      return r.text;
    } catch (err) {
      console.warn(`[whisper] provider=openai failed: ${(err as Error).message}`);
    }
  }

  console.warn("[whisper] no provider configured");
  return null;
}
