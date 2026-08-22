// whatsapp.ts - Motor de procesamiento e interpretación de mensajes WhatsApp
// Conecta Evolution API (vía n8n) con Control Tower 360
//
// Cadencia esperada desde n8n (Fase 1):
//   n8n recibe webhook Meta -> identifica tipo (text/audio/image/document/location)
//     - audio: n8n descarga y llama Whisper (Groq/OpenAI) -> manda { messageType:"audio", transcript:"...", mediaUrl }
//     - image/document: n8n puede mandar { messageType:"image", mediaUrl, caption }
//     - location: manda { messageType:"location", latitude, longitude }
//     - text: manda { messageType:"text", message }
//   n8n -> POST /api/whatsapp/incoming -> backend identifica chofer + viaje + interpreta
//
// Este archivo se mantiene retrocompatible: si la IA no está disponible, usa parser determinístico.

import fs from "fs";
import path from "path";
import crypto from "crypto";
import { dbService } from "./database";

// Directorio de almacenamiento de multimedia (imágenes, audios, documentos)
function getResolvedUploadDir(): string {
  const dirs = [
    process.env.UPLOAD_DIR,
    path.join(process.cwd(), "public", "uploads", "media"),
    path.join(process.cwd(), "uploads", "media"),
    "/data/uploads/media"
  ].filter(Boolean) as string[];

  for (const dir of dirs) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      return dir;
    } catch {
      // Intentar el siguiente directorio
    }
  }
  const fallback = path.join(process.cwd(), "uploads");
  try { fs.mkdirSync(fallback, { recursive: true }); } catch { /* ignore */ }
  return fallback;
}

const UPLOAD_DIR = getResolvedUploadDir();

function ensureUploadDir(): string {
  try {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
  return UPLOAD_DIR;
}

function extFromUrl(url: string, contentType?: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
    "audio/ogg": "ogg", "audio/mpeg": "mp3", "audio/mp4": "m4a", "audio/amr": "amr", "audio/wav": "wav",
    "application/pdf": "pdf", "application/zip": "zip"
  };
  if (contentType && map[contentType]) return map[contentType];
  const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "bin";
}

// Devuelve la ruta local servible (/api/media/<file>) o la URL original si ya es servible
async function downloadAndStoreMedia(mediaInput: string, kind: string): Promise<string | null> {
  if (!mediaInput) return null;

  // Si ya es una ruta local de nuestra API (/api/media/...)
  if (mediaInput.startsWith("/api/media/")) return mediaInput;

  ensureUploadDir();

  // Caso 1: Data URL o Base64 directo
  if (mediaInput.startsWith("data:") || (!mediaInput.startsWith("http") && mediaInput.length > 100)) {
    try {
      let ext = kind === "audio" ? "ogg" : kind === "image" ? "jpg" : "pdf";
      let base64Data = mediaInput;
      if (mediaInput.startsWith("data:")) {
        const match = mediaInput.match(/^data:([^;]+);base64,(.*)$/);
        if (match) {
          ext = extFromUrl("", match[1]) || ext;
          base64Data = match[2];
        }
      }
      const buf = Buffer.from(base64Data, "base64");
      if (buf.length === 0) return null;
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      console.log(`[media] Base64 guardado OK: /api/media/${filename} (${(buf.length / 1024).toFixed(1)} KB)`);
      return `/api/media/${filename}`;
    } catch (e) {
      console.warn(`[media] Error guardando Base64 ${kind}:`, (e as Error).message);
      return null;
    }
  }

  // Caso 2: URL HTTP / HTTPS
  if (/^https?:\/\//i.test(mediaInput)) {
    try {
      console.log(`[media] Descargando ${kind}: ${mediaInput.substring(0, 80)}...`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(mediaInput, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        console.warn(`[media] HTTP ${res.status} al descargar ${kind}`);
        return mediaInput; // Mantener URL externa si no se pudo descargar
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length === 0) return mediaInput;
      const contentType = res.headers.get("content-type") || "";
      const ext = extFromUrl(mediaInput, contentType) || (kind === "audio" ? "ogg" : kind === "image" ? "jpg" : "pdf");
      const filename = `${crypto.randomUUID()}.${ext}`;
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), buf);
      const localPath = `/api/media/${filename}`;
      console.log(`[media] Guardado OK: ${localPath} (${(buf.length / 1024).toFixed(1)} KB, ${contentType})`);
      return localPath;
    } catch (e) {
      console.warn(`[media] Error descargando ${kind}: ${(e as Error).message}`);
      return mediaInput;
    }
  }

  return null;
}
import {
  interpretDriverMessageWithAI,
  transcribeAudio,
  type AiDriverInterpretation,
  type InterpretResult
} from "./ai";
import type {
  WhatsappIncomingPayload,
  WhatsappProcessResult,
  MessageInterpretation,
  Trip,
  Driver
} from "./types";

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

// Mantengo un parser determinístico como fallback (Nivel 1 - automático)
export function interpretDriverMessage(
  rawText: string,
  payload: WhatsappIncomingPayload,
  driver: (Driver & { companyName?: string }) | null,
  activeTrip: Trip | null
): MessageInterpretation {
  const text = normalizeText(rawText);

  if (payload.messageType === "location" && payload.latitude !== undefined && payload.longitude !== undefined) {
    return {
      action: "location_share",
      confidence: 1.0,
      gpsPosition: { latitude: payload.latitude, longitude: payload.longitude },
      responseMessage: activeTrip
        ? `📍 Ubicación recibida y registrada en el Viaje #${activeTrip.id.replace('trip-', '')}.`
        : `📍 Ubicación recibida.`
    };
  }

  if (payload.messageType === "image" || payload.messageType === "document" || payload.messageType === "audio") {
    return {
      action: payload.messageType === "audio" ? "general_message" : "document_upload",
      confidence: 0.9,
      responseMessage: activeTrip
        ? `📄 Contenido recibido para el Viaje #${activeTrip.id.replace('trip-', '')}.`
        : `📄 Contenido recibido y archivado.`
    };
  }

  const kw = (arr: string[]) => arr.some(k => text.includes(k));
  if (kw(["sali", "arranque", "arrancando", "en viaje", "en camino", "saliendo", "iniciando", "partiendo", "en ruta"])) {
    if (activeTrip) {
      return {
        action: "trip_departure", confidence: 0.95,
        tripUpdate: { tripId: activeTrip.id, newStatus: "en_route" },
        responseMessage: `✅ Viaje #${activeTrip.id.replace('trip-', '')} actualizado a EN RUTA.`
      };
    }
  }
  if (kw(["llegue", "en destino", "llegando a destino", "arribe", "estoy en planta", "llegamos"])) {
    if (activeTrip) {
      return {
        action: "trip_arrival", confidence: 0.95,
        tripUpdate: { tripId: activeTrip.id, newStatus: "arrived" },
        responseMessage: `🏁 Llegada registrada en ${activeTrip.destination}.`
      };
    }
  }
  if (kw(["cargando", "estoy cargando", "en carga", "inicio de carga", "cargaron"])) {
    if (activeTrip) {
      return {
        action: "loading", confidence: 0.9,
        tripUpdate: { tripId: activeTrip.id, newStatus: "loading" },
        responseMessage: `📦 Estado actualizado: CARGANDO en ${activeTrip.origin}.`
      };
    }
  }
  if (kw(["descargando", "estoy descargando", "en descarga"])) {
    if (activeTrip) {
      return {
        action: "unloading", confidence: 0.9,
        tripUpdate: { tripId: activeTrip.id, newStatus: "unloading" },
        responseMessage: `📥 Estado actualizado: DESCARGANDO en ${activeTrip.destination}.`
      };
    }
  }
  if (kw(["demora", "demorado", "trancado", "transito", "congestion", "corte", "piquete", "parado", "espera"])) {
    return {
      action: "delay", confidence: 0.9,
      incident: { type: "delay", description: `Demora reportada por chofer: "${rawText}"` },
      tripUpdate: activeTrip ? { tripId: activeTrip.id, newStatus: "delayed" } : undefined,
      responseMessage: `⏳ Demora registrada. La torre recalculará la ETA.`
    };
  }
  if (kw(["accidente", "choque", "chocaron", "volco", "herido", "siniestro"])) {
    return {
      action: "accident", confidence: 0.98,
      incident: { type: "accident", description: `Siniestro: "${rawText}"` },
      responseMessage: `🚨 Alerta crítica registrada. Si hay heridos llamá 911/107.`
    };
  }
  if (kw(["se rompio", "rompi", "mecanico", "averia", "falla", "motor", "temperatura", "recalento", "taller", "grua", "no arranca"])) {
    return {
      action: "breakdown", confidence: 0.92,
      incident: { type: "breakdown", description: `Falla mecánica: "${rawText}"` },
      responseMessage: `🔧 Avería registrada. Notificamos a taller.`
    };
  }
  if (kw(["goma", "pinchazo", "pinche", "cubierta", "desinflada", "gomeria"])) {
    return {
      action: "tire_issue", confidence: 0.92,
      incident: { type: "tire", description: `Neumático: "${rawText}"` },
      responseMessage: `🛞 Novedad de neumático registrada.`
    };
  }
  if (kw(["hola", "buen dia", "buenas tardes", "buenas noches", "que tal", "comandos", "ayuda"])) {
    let msg = `👋 Hola ${driver?.fullName || "Chofer"}, soy Control Tower 360.\n`;
    if (activeTrip) {
      msg += `📋 Viaje Activo: #${activeTrip.id.replace('trip-', '')} ${activeTrip.origin} ➔ ${activeTrip.destination} (${activeTrip.status.toUpperCase()})\n`;
    }
    return { action: "greeting", confidence: 1.0, responseMessage: msg };
  }

  return {
    action: "unknown", confidence: 0.3,
    responseMessage: `Mensaje recibido en Control Tower 360. Tu supervisor lo tiene disponible.`
  };
}

// =====================================================
// DEFENSAS ANTI-LOOP (evitan que el bot se bannee a sí mismo)
// =====================================================

// Ventana de debounce: no generamos más de 1 respuesta por teléfono en este lapso.
// Rompe cualquier loop aunque n8n reenvíe el mensaje saliente con el teléfono del chofer.
const LOOP_GUARD_MS = Number(process.env.LOOP_GUARD_MS || 30000);
const lastResponseByPhone = new Map<string, number>();

// Frases que el bot envía como respuesta propia. Si un mensaje las contiene, lo ignoramos
// (backstop contra loops donde el mensaje saliente vuelve como entrante).
const OWN_RESPONSE_MARKERS = [
  "mensaje recibido en control tower 360",
  "tu supervisor lo tiene disponible",
  "🟢 procesado",
  "soy control tower 360"
];

// DEFENSA GLOBAL: rate limiter por IP/origen
// Si llegan más de 20 webhooks en 10 segundos desde la misma fuente, bloqueamos todo.
const GLOBAL_RATE_WINDOW_MS = 10_000;
const GLOBAL_RATE_MAX = 20;
const webhookTimestamps: number[] = [];

function isGloballyRateLimited(): boolean {
  const now = Date.now();
  webhookTimestamps.push(now);
  // Limpiar timestamps viejos
  while (webhookTimestamps.length > 0 && webhookTimestamps[0] < now - GLOBAL_RATE_WINDOW_MS) {
    webhookTimestamps.shift();
  }
  if (webhookTimestamps.length > GLOBAL_RATE_MAX) {
    console.error(`[anti-loop] RATE LIMIT GLOBAL: ${webhookTimestamps.length} webhooks en los últimos ${GLOBAL_RATE_WINDOW_MS/1000}s`);
    return true;
  }
  return false;
}

function extractFromMeFromRaw(raw?: string): boolean {
  if (!raw) return false;
  try {
    const obj = JSON.parse(raw);
    if (obj?.key?.fromMe === true) return true;
    if (obj?.fromMe === true) return true;
    if (obj?.data?.key?.fromMe === true) return true;
    if (obj?.data?.fromMe === true) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function ignoredResult(payload: WhatsappIncomingPayload, reason: string): WhatsappProcessResult {
  // IMPORTANTE: responseMessage DEBE ser "" (vacío) para que n8n no envíe nada de vuelta.
  // Si devolvemos texto, n8n lo envía al chofer → puede generar loop infinito y ban de Meta.
  console.log(`[anti-loop] Ignorado: ${reason} | phone=${payload.phone} remoteJid=${payload.remoteJid}`);
  return {
    messageId: "",
    phone: payload.phone || "",
    remoteJid: payload.remoteJid || "",
    driverFound: false,
    driverName: undefined,
    companyId: payload.companyId || "default-company",
    interpretation: { action: "ignored", confidence: 1, responseMessage: "" },
    tripUpdated: false,
    incidentCreated: false,
    deduplicated: true
  };
}

function extractMediaAndDetailsFromPayload(payload: WhatsappIncomingPayload): {
  resolvedType: "text" | "audio" | "image" | "document" | "location";
  resolvedMediaUrl?: string;
  resolvedMessage: string;
  resolvedLat?: number;
  resolvedLng?: number;
  resolvedPushName?: string;
} {
  let resolvedType = payload.messageType || "text";
  let resolvedMediaUrl = payload.mediaUrl;
  let resolvedMessage = payload.message || "";
  let resolvedLat = payload.latitude;
  let resolvedLng = payload.longitude;
  let resolvedPushName = payload.pushName;

  if (payload.rawPayload) {
    try {
      const obj = typeof payload.rawPayload === "string" ? JSON.parse(payload.rawPayload) : payload.rawPayload;
      const data = obj.data || obj;
      const msg = data.message || {};

      if (!resolvedPushName && data.pushName) resolvedPushName = data.pushName;

      // Detectar imagen
      if (msg.imageMessage) {
        resolvedType = "image";
        if (!resolvedMediaUrl) resolvedMediaUrl = msg.imageMessage.url || data.mediaUrl || msg.base64 || data.base64;
        if (!resolvedMessage && msg.imageMessage.caption) resolvedMessage = msg.imageMessage.caption;
      }
      // Detectar audio
      else if (msg.audioMessage) {
        resolvedType = "audio";
        if (!resolvedMediaUrl) resolvedMediaUrl = msg.audioMessage.url || data.mediaUrl || msg.base64 || data.base64;
      }
      // Detectar documento
      else if (msg.documentMessage) {
        resolvedType = "document";
        if (!resolvedMediaUrl) resolvedMediaUrl = msg.documentMessage.url || data.mediaUrl || msg.base64 || data.base64;
        if (!resolvedMessage) resolvedMessage = msg.documentMessage.caption || msg.documentMessage.fileName || "";
      }
      // Detectar ubicación
      else if (msg.locationMessage) {
        resolvedType = "location";
        if (resolvedLat === undefined) resolvedLat = msg.locationMessage.degreesLatitude;
        if (resolvedLng === undefined) resolvedLng = msg.locationMessage.degreesLongitude;
      }

      // Propiedades de Evolution API v2 en raíz
      if (!resolvedMediaUrl && (data.mediaUrl || data.url)) {
        resolvedMediaUrl = data.mediaUrl || data.url;
      }
      if (!resolvedMediaUrl && (data.base64 || msg.base64)) {
        resolvedMediaUrl = data.base64 || msg.base64;
      }
    } catch {
      /* ignore JSON parse error */
    }
  }

  return {
    resolvedType: resolvedType as any,
    resolvedMediaUrl,
    resolvedMessage,
    resolvedLat,
    resolvedLng,
    resolvedPushName
  };
}

// =====================================================
// PROCESO PRINCIPAL
// =====================================================
export async function processIncomingWhatsappMessage(
  payload: WhatsappIncomingPayload
): Promise<WhatsappProcessResult> {
  // ===== DEFENSA 0: Rate limit global (máximo 20 webhooks por 10s) =====
  if (isGloballyRateLimited()) {
    return ignoredResult(payload, "Rate limit global activado. Webhooks bloqueados temporalmente.");
  }

  // ===== DEFENSA 1: fromMe (mensaje enviado por el propio bot) =====
  // Puede venir en el campo plano o dentro del rawPayload de Evolution API.
  const fromMe = payload.fromMe === true || extractFromMeFromRaw(payload.rawPayload);
  if (fromMe) {
    return ignoredResult(payload, "Mensaje propio del bot ignorado (fromMe=true).");
  }

  // ===== DEFENSA 2: número propio del bot =====
  const BOT_PHONE = process.env.BOT_PHONE || "5491173719972";
  const cleanPhone = (payload.phone || "").replace("@s.whatsapp.net", "").replace("@c.us", "");
  const _remotePhone = (payload.remoteJid || "").replace("@s.whatsapp.net", "").replace("@c.us", "");
  if (cleanPhone === BOT_PHONE || _remotePhone === BOT_PHONE) {
    return ignoredResult(payload, `Mensaje del número del bot (${BOT_PHONE}) ignorado.`);
  }

  const rawText = payload.message || "";

  // ===== DEFENSA 3: backstop de contenido (frases propias del bot) =====
  const norm = normalizeText(rawText);
  if (OWN_RESPONSE_MARKERS.some(m => norm.includes(m))) {
    return ignoredResult(payload, "Mensaje coincide con respuesta propia del bot; ignorado.");
  }

  const companyId = payload.companyId || "default-company";

  // ===== IDEMPOTENCIA =====
  // Si el webhook trae messageId (de Evolution/Meta) y ya lo procesamos, devolvemos
  // el resultado cacheado para evitar duplicados cuando Evolution API reintenta.
  const incomingMessageId = payload.messageId?.trim();
  if (incomingMessageId) {
    const existing = dbService.findWhatsappMessageByMessageId(companyId, incomingMessageId);
    if (existing) {
      const driver = existing.driverId ? dbService.getDriver(existing.driverId) : null;
      return {
        messageId: existing.id,
        phone: existing.phone,
        remoteJid: payload.remoteJid || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : undefined),
        driverFound: !!driver,
        driverName: driver?.fullName,
        companyId,
        interpretation: {
          action: (existing.interpretedAction as any) || "unknown",
          confidence: existing.interpretedConfidence || 0,
          responseMessage: existing.responseMessage || "Mensaje ya procesado (idempotencia)."
        },
        tripUpdated: false,
        incidentCreated: false,
        deduplicated: true
      };
    }
  }

  // ===== DEFENSA 4: debounce por teléfono =====
  // Backstop final: si ya generamos una respuesta para este teléfono hace poco,
  // no generamos otra. Esto garantiza que, pase lo que pase en n8n/Evolution,
  // el bot nunca dispara un loop de respuestas que lo banee.
  const now = Date.now();
  const lastResp = lastResponseByPhone.get(cleanPhone);
  if (lastResp && now - lastResp < LOOP_GUARD_MS) {
    return ignoredResult(payload, `Debounce anti-loop: respuesta reciente para ${cleanPhone}.`);
  }

  // Extraer datos multimedia o campos enriquecidos desde rawPayload si están disponibles
  const rawDetails = extractMediaAndDetailsFromPayload(payload);
  const effectiveMessageType = rawDetails.resolvedType;
  let effectiveMediaUrl = rawDetails.resolvedMediaUrl;
  let effectiveMessage = rawDetails.resolvedMessage || rawText;
  const effectiveLat = rawDetails.resolvedLat !== undefined ? rawDetails.resolvedLat : payload.latitude;
  const effectiveLng = rawDetails.resolvedLng !== undefined ? rawDetails.resolvedLng : payload.longitude;

  // 1. Identificar chofer y viaje activo
  const driver = dbService.findDriverByPhone(cleanPhone);
  const resolvedCompanyId = driver?.companyId || companyId;
  const activeTrip = driver ? dbService.getActiveTrip(driver.id) : null;

  // Guardar/Descargar media localmente si existe
  if (effectiveMediaUrl) {
    const local = await downloadAndStoreMedia(effectiveMediaUrl, effectiveMessageType);
    if (local) effectiveMediaUrl = local;
  }

  // 2. Si es audio y NO viene transcripto, lo transcribimos con Whisper
  let transcript = effectiveMessage;
  if (effectiveMessageType === "audio" && (!transcript || transcript.trim().length < 2) && effectiveMediaUrl) {
    try {
      transcript = await transcribeAudio(effectiveMediaUrl, "audio/ogg");
      console.log(`[whisper] Audio transcripto con éxito para ${cleanPhone}: "${transcript}"`);
    } catch (e) {
      console.warn("[transcribeAudio] falló:", (e as Error).message);
    }
  }

  // 3. Interpretar con IA (Groq -> Gemini fallback)
  let aiResult: InterpretResult | null = null;
  let interpretation: MessageInterpretation | null = null;

  try {
    aiResult = await interpretDriverMessageWithAI(transcript, driver, activeTrip, {
      messageType: effectiveMessageType,
      mediaUrl: effectiveMediaUrl,
      caption: effectiveMessage
    });
  } catch (e) {
    console.warn("AI interpretation failed:", (e as Error).message);
  }

  // Si la IA devolvió interpretación, la usamos como fuente principal.
  // Si no, usamos el parser determinístico PERO igual emitimos un evento operacional mínimo
  // para que la cadena (evento → alerta) siga funcionando aunque la IA esté caída.
  const usingAI = !!aiResult?.interpretation;
  if (usingAI) {
    interpretation = aiToMessageInterpretation(aiResult!.interpretation!, { ...payload, messageType: effectiveMessageType, latitude: effectiveLat, longitude: effectiveLng }, driver, activeTrip);
  } else {
    interpretation = interpretDriverMessage(transcript, { ...payload, messageType: effectiveMessageType, latitude: effectiveLat, longitude: effectiveLng }, driver, activeTrip);
  }

  // Garantía: si por alguna razón quedó null (no debería), devolvemos unknown
  if (!interpretation) {
    interpretation = {
      action: "unknown",
      confidence: 0,
      responseMessage: "Mensaje recibido en Control Tower 360."
    };
  }

  // Construir un "ai-shape" mínimo si NO vino de la IA, para que el resto del pipeline
  // (evento operacional + alerta) se ejecute igual.
  const ai = aiResult?.interpretation ?? legacyToAiShape(interpretation, transcript);
  let tripUpdated = false;
  let incidentCreated = false;
  let evidenceCreated = false;
  let eventCreated = false;
  let alertCreated = false;

  // 4. Aplicar efectos — Respetar niveles 1 (auto) y 2 (requieren aprobación)
  // `ai` siempre existe: o viene de la IA, o es un shape mínimo del parser determinístico.

  // A. Actualización de estado del viaje (Nivel 1: aplicar si no requiere aprobación)
  if (interpretation.tripUpdate && (!ai || !ai.tripUpdate?.approvalRequired)) {
    try {
      dbService.updateTripStatus(interpretation.tripUpdate.tripId, interpretation.tripUpdate.newStatus, transcript);
      tripUpdated = true;
    } catch (err) {
      console.error("Error al actualizar estado de viaje vía WhatsApp:", err);
    }
  }

  // B. Incidente (legado)
  if (interpretation.incident && driver) {
    try {
      dbService.createIncidentFromWhatsapp({
        companyId: resolvedCompanyId,
        vehicleId: driver.vehicleId,
        driverId: driver.id,
        type: interpretation.incident.type,
        description: interpretation.incident.description,
        location: effectiveLat ? `${effectiveLat}, ${effectiveLng}` : undefined
      });
      incidentCreated = true;
    } catch (err) {
      console.error("Error al crear incidente vía WhatsApp:", err);
    }
  }

  // C. GPS / ubicación
  if (effectiveMessageType === "location" && effectiveLat !== undefined && effectiveLng !== undefined) {
    try {
      if (activeTrip) {
        dbService.createGpsPosition(activeTrip.id, effectiveLat, effectiveLng, 0);
      }
      dbService.createDriverLocation({
        companyId: resolvedCompanyId,
        driverId: driver?.id,
        tripId: activeTrip?.id,
        vehicleId: driver?.vehicleId,
        latitude: effectiveLat,
        longitude: effectiveLng,
        source: "whatsapp",
        label: effectiveMessage
      });
    } catch (err) {
      console.error("Error al guardar location:", err);
    }
  }

  // D. Evidencia (audio, imagen, documento) -> trip_evidence
  if (effectiveMessageType === "image" || effectiveMessageType === "audio" || effectiveMessageType === "document" || effectiveMediaUrl) {
    console.log(`[evidence] Procesando ${effectiveMessageType} | mediaUrl=${effectiveMediaUrl ? "SI" : "NO"} | phone=${cleanPhone}`);
    try {
      const kind: "audio" | "image" | "document" =
        effectiveMessageType === "audio" ? "audio" :
        effectiveMessageType === "image" ? "image" : "document";

      dbService.createTripEvidence({
        companyId: resolvedCompanyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        kind,
        title: rawDetails.resolvedPushName || payload.pushName || undefined,
        description: transcript || effectiveMessage || undefined,
        mediaUrl: effectiveMediaUrl,
        transcript: kind === "audio" ? transcript : undefined,
        source: "whatsapp",
        capturedAt: payload.timestamp
      });
      evidenceCreated = true;
      console.log(`[evidence] Guardada OK: kind=${kind} storedUrl=${effectiveMediaUrl || "none"}`);
    } catch (err) {
      console.error("[evidence] Error al guardar evidencia:", err);
    }
  } else if (payload.messageType === "image" || payload.messageType === "audio" || payload.messageType === "document") {
    // MediaType es media pero no hay mediaUrl ni transcript → algo falló en n8n
    console.warn(`[evidence] ${payload.messageType} recibido pero SIN mediaUrl ni transcript. phone=${cleanPhone} | n8n no está enviando el contenido multimedia.`);
  }

  // E. Evento operacional (siempre, tanto si vino de IA como del parser determinístico)
  if (ai.event) {
    try {
      dbService.createOperationalEvent({
        companyId: resolvedCompanyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        vehicleId: driver?.vehicleId,
        source: "whatsapp",
        sourceMessageId: undefined,
        type: ai.event.type,
        category: ai.event.category || undefined,
        priority: ai.priority || "informativa",
        title: ai.event.title,
        description: ai.event.description,
        metadata: ai.event.metadata || ai.eta || undefined,
        requiresIntervention: ai.requiresIntervention
      });
      eventCreated = true;
    } catch (err) {
      console.error("Error al guardar operational_event:", err);
    }
  }

  // F. Alerta (si prioridad es critica/alta o requiresIntervention=true)
  if (ai.priority === "critica" || ai.priority === "alta" || ai.requiresIntervention) {
    try {
      const entityLabel = ai.alert?.entityLabel || (activeTrip ? `Viaje #${activeTrip.id.replace('trip-', '')}` : (driver ? driver.fullName : "Operación"));
      dbService.createOperationalAlert({
        companyId: resolvedCompanyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        vehicleId: driver?.vehicleId,
        level: ai.priority,
        title: ai.alert?.title || `${ai.action.toUpperCase()} — ${entityLabel}`,
        message: ai.alert?.message || ai.event?.description || transcript,
        entityType: ai.alert?.entityType || (activeTrip ? "trip" : (driver ? "driver" : "trip")),
        entityLabel,
        requiresIntervention: ai.requiresIntervention
      });
      alertCreated = true;
    } catch (err) {
      console.error("Error al guardar operational_alert:", err);
    }
  }

  // 5. Guardar mensaje en whatsapp_messages (auditoría)
  const savedMessage = dbService.createWhatsappMessage({
    companyId: resolvedCompanyId,
    driverId: driver?.id,
    phone: cleanPhone,
    direction: "incoming",
    messageType: payload.messageType,
    content: transcript,
    mediaUrl: payload.mediaUrl,
    interpretedAction: interpretation.action,
    interpretedConfidence: interpretation.confidence,
    tripId: activeTrip?.id,
    messageId: incomingMessageId,
    processed: true,
    rawPayload: payload.rawPayload || JSON.stringify(payload),
    responseMessage: interpretation.responseMessage
  });

  // Registrar timestamp de respuesta para el debounce anti-loop (Defensa 4)
  lastResponseByPhone.set(cleanPhone, Date.now());

  return {
    messageId: savedMessage.id,
    phone: cleanPhone,
    remoteJid: payload.remoteJid || (cleanPhone ? `${cleanPhone}@s.whatsapp.net` : undefined),
    driverFound: !!driver,
    driverName: driver?.fullName,
    companyId,
    interpretation,
    tripUpdated,
    incidentCreated
  };
}

// Conversión: AiDriverInterpretation -> MessageInterpretation (forma legacy que ya consume el resto)
function aiToMessageInterpretation(
  ai: AiDriverInterpretation,
  payload: WhatsappIncomingPayload,
  driver: (Driver & { companyName?: string }) | null,
  activeTrip: Trip | null
): MessageInterpretation {
  const result: MessageInterpretation = {
    action: ai.action,
    confidence: ai.confidence,
    responseMessage: ai.responseMessage
  };

  if (ai.tripUpdate) {
    result.tripUpdate = { tripId: ai.tripUpdate.tripId, newStatus: ai.tripUpdate.newStatus };
  }

  if (ai.event && (ai.event.type === "accident" || ai.event.type === "breakdown" || ai.event.type === "tire" || ai.event.type === "delay")) {
    result.incident = {
      type: ai.event.type === "tire" ? "tire" : ai.event.type,
      description: ai.event.description || ai.event.title || ""
    };
  }

  if (payload.messageType === "location" && payload.latitude !== undefined && payload.longitude !== undefined) {
    result.gpsPosition = { latitude: payload.latitude, longitude: payload.longitude };
  }

  return result;
}

// Convierte una MessageInterpretation (parser determinístico) en una AiDriverInterpretation
// mínima para que el resto del pipeline (evento + alerta) se ejecute igual cuando la IA falla.
function legacyToAiShape(
  interp: MessageInterpretation,
  rawText: string
): import("./ai").AiDriverInterpretation {
  const map: Record<string, { type: any; category?: string; title: string; priority: any; requiresIntervention: boolean }> = {
    trip_departure: { type: "departure", title: "Salida confirmada", priority: "informativa", requiresIntervention: false },
    trip_arrival:   { type: "arrival",   title: "Llegada confirmada", priority: "informativa", requiresIntervention: false },
    loading:        { type: "loading",    title: "Inicio de carga",    priority: "informativa", requiresIntervention: false },
    unloading:      { type: "unloading",  title: "Inicio de descarga", priority: "informativa", requiresIntervention: false },
    delay:          { type: "delay",      category: "trip", title: "Demora reportada", priority: "atencion", requiresIntervention: false },
    breakdown:      { type: "breakdown",  category: "vehicle", title: "Avería reportada", priority: "alta", requiresIntervention: true },
    accident:       { type: "accident",   category: "vehicle", title: "Accidente reportado", priority: "critica", requiresIntervention: true },
    tire_issue:     { type: "tire",       category: "vehicle", title: "Problema de neumático", priority: "alta", requiresIntervention: true },
    fuel_stop:      { type: "fuel",       title: "Parada de combustible", priority: "informativa", requiresIntervention: false },
    document_upload:{ type: "document",   title: "Evidencia recibida", priority: "informativa", requiresIntervention: false },
    location_share: { type: "location",   title: "Ubicación compartida", priority: "informativa", requiresIntervention: false },
    greeting:       { type: "custom",     title: "Saludo", priority: "informativa", requiresIntervention: false },
    status_query:   { type: "custom",     title: "Consulta de estado", priority: "informativa", requiresIntervention: false },
    general_message:{ type: "custom",     title: "Mensaje general", priority: "informativa", requiresIntervention: false }
  };
  const m = map[interp.action] || { type: "custom", title: "Mensaje", priority: "informativa", requiresIntervention: false };

  return {
    action: interp.action as any,
    confidence: interp.confidence || 0.8,
    priority: m.priority,
    requiresIntervention: m.requiresIntervention,
    responseMessage: interp.responseMessage,
    tripUpdate: interp.tripUpdate ? { tripId: interp.tripUpdate.tripId, newStatus: interp.tripUpdate.newStatus as any } : undefined,
    event: {
      type: m.type,
      category: m.category,
      title: m.title,
      description: rawText || interp.incident?.description
    },
    alert: (m.priority === "critica" || m.priority === "alta" || m.requiresIntervention) ? {
      title: m.title,
      message: rawText || interp.incident?.description || interp.responseMessage,
      entityType: "trip"
    } : null,
    eta: null
  };
}
