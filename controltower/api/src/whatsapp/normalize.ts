// whatsapp/normalize.ts — Normalizador del payload entrante de WhatsApp/Evolution API.
// Único punto de extracción: todos los módulos posteriores consumen NormalizedWhatsAppMessage,
// nunca vuelven a leer el payload crudo.

import type { WhatsappIncomingPayload } from "../types";
import { normalizeMediaKey } from "./mediaKey";

export type NormalizedMessageType =
  | "text"
  | "audio"
  | "image"
  | "video"
  | "document"
  | "sticker"
  | "location"
  | "unknown";

export interface NormalizedWhatsAppMessage {
  messageId: string | null;
  phone: string | null;
  remoteJid: string | null;
  fromMe: boolean;
  messageType: NormalizedMessageType;
  text: string | null;
  /** URL HTTP del adjunto, Base64 inline o data URL. */
  mediaInput: string | null;
  /** Clave de WhatsApp normalizada a Buffer si fue posible extraerla. */
  mediaKey: Buffer | null;
  mimeType: string | null;
  latitude: number | null;
  longitude: number | null;
  pushName: string | null;
  /** URL firmada original cuando aplica (ej: mmg.whatsapp.net). */
  mediaUrl: string | null;
  /** Cuerpo crudo original — sólo para auditoría. */
  raw: unknown;
}

const JID_SUFFIXES = ["@s.whatsapp.net", "@c.us", "@g.us", "@broadcast"];

function stripJid(value: string | null | undefined): string | null {
  if (!value) return null;
  let v = String(value).trim();
  for (const suffix of JID_SUFFIXES) {
    if (v.endsWith(suffix)) v = v.slice(0, -suffix.length);
  }
  return v || null;
}

function safeParseJson(raw: unknown): any {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function pickFromPath(obj: any, path: Array<string>): unknown {
  let cur: any = obj;
  for (const key of path) {
    if (cur === null || cur === undefined || typeof cur !== "object") return undefined;
    cur = cur[key];
  }
  return cur;
}

function pickBase64(msg: any): string | undefined {
  if (!msg || typeof msg !== "object") return undefined;
  const candidates = [
    msg.base64,
    msg?.audioMessage?.base64,
    msg?.imageMessage?.base64,
    msg?.documentMessage?.base64,
    msg?.videoMessage?.base64,
    msg?.stickerMessage?.base64
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 100) return c;
  }
  return undefined;
}

function inferTypeFromKey(msg: any): { type: NormalizedMessageType; mediaField: string; mediaKeyField: string; mimeField: string } | null {
  if (!msg || typeof msg !== "object") return null;
  if (msg.imageMessage) return { type: "image", mediaField: "imageMessage", mediaKeyField: "imageMessage", mimeField: "imageMessage" };
  if (msg.audioMessage) return { type: "audio", mediaField: "audioMessage", mediaKeyField: "audioMessage", mimeField: "audioMessage" };
  if (msg.videoMessage) return { type: "video", mediaField: "videoMessage", mediaKeyField: "videoMessage", mimeField: "videoMessage" };
  if (msg.stickerMessage) return { type: "sticker", mediaField: "stickerMessage", mediaKeyField: "stickerMessage", mimeField: "stickerMessage" };
  if (msg.documentMessage) return { type: "document", mediaField: "documentMessage", mediaKeyField: "documentMessage", mimeField: "documentMessage" };
  if (msg.locationMessage || msg.liveLocationMessage) return { type: "location", mediaField: "", mediaKeyField: "", mimeField: "" };
  return null;
}

export function normalizeIncomingWhatsAppMessage(payload: WhatsappIncomingPayload): NormalizedWhatsAppMessage {
  const phone = stripJid(payload.phone);
  const remoteJidRaw = payload.remoteJid ?? null;
  const remoteJid = stripJid(remoteJidRaw);

  let messageId: string | null = null;
  if (payload.messageId && typeof payload.messageId === "string" && payload.messageId.trim().length > 0) {
    messageId = payload.messageId.trim();
  }

  let fromMe = false;
  if (payload.fromMe === true) fromMe = true;
  if (typeof payload.fromMe === "string" && (payload.fromMe === "true" || payload.fromMe === "1")) fromMe = true;

  let messageType: NormalizedMessageType = "unknown";
  let text: string | null = (payload.message ?? "").toString() || null;
  let mediaInput: string | null = null;
  let mediaUrl: string | null = null;
  let mediaKey: Buffer | null = null;
  let mimeType: string | null = payload.mimeType ?? null;
  let latitude: number | null = payload.latitude ?? null;
  let longitude: number | null = payload.longitude ?? null;
  let pushName: string | null = payload.pushName ?? null;
  let rawData: any = null;

  if (payload.rawPayload !== undefined) {
    const parsed = safeParseJson(payload.rawPayload);
    if (parsed) {
      rawData = parsed;
      const data = parsed.data ?? parsed;
      const key = data?.key ?? parsed?.key ?? {};
      const msg = data?.message ?? parsed?.message ?? {};

      // messageId
      if (!messageId && typeof key.id === "string" && key.id.length > 0) {
        messageId = key.id;
      } else if (!messageId && typeof data.id === "string" && data.id.length > 0) {
        messageId = data.id;
      }

      // fromMe
      if (key.fromMe === true) fromMe = true;

      // pushName
      if (!pushName && typeof data.pushName === "string") pushName = data.pushName;

      // messageType — detectar desde sub-objeto message
      const inferred = inferFromKey(msg);
      if (inferred) messageType = inferred.type;

      // Texto plano
      if (msg.conversation && typeof msg.conversation === "string") {
        text = msg.conversation;
      } else if (msg.extendedTextMessage && typeof msg.extendedTextMessage.text === "string") {
        text = msg.extendedTextMessage.text;
      } else if (msg.imageMessage?.caption) {
        text = msg.imageMessage.caption;
      } else if (msg.videoMessage?.caption) {
        text = msg.videoMessage.caption;
      } else if (msg.documentMessage?.caption) {
        text = msg.documentMessage.caption;
      }

      // Media URL/Key por tipo
      const base64 = pickBase64(msg);
      const explicitUrl = pickMediaUrl(msg, inferred?.mediaField);
      if (base64) {
        mediaInput = base64.startsWith("data:") ? base64 : `data:${inferred?.mimeField ? msg[inferred.mimeField]?.mimetype || "application/octet-stream" : "application/octet-stream"};base64,${base64}`;
      } else if (explicitUrl) {
        mediaInput = explicitUrl;
        mediaUrl = explicitUrl;
      }
      if (!mediaUrl && typeof data.mediaUrl === "string") mediaUrl = data.mediaUrl;
      if (!mediaUrl && typeof data.url === "string") mediaUrl = data.url;

      // mediaKey raw (Buffer|string|object)
      const rawKey = pickMediaKeyRaw(msg, inferred?.mediaKeyField) ?? data.mediaKey ?? parsed.mediaKey;
      if (rawKey !== undefined && rawKey !== null) {
        mediaKey = normalizeMediaKey(rawKey);
      }

      // mimeType
      if (!mimeType && inferred?.mimeField) {
        const m = msg[inferred.mimeField]?.mimetype;
        if (typeof m === "string") mimeType = m;
      }

      // location
      if (latitude === null || longitude === null) {
        const loc = msg.locationMessage || msg.liveLocationMessage;
        if (loc) {
          if (typeof loc.degreesLatitude === "number") latitude = loc.degreesLatitude;
          if (typeof loc.degreesLongitude === "number") longitude = loc.degreesLongitude;
        }
      }
    }
  }

  // Fallback: type viene en payload directo
  if (messageType === "unknown") {
    const t = (payload.messageType ?? "").toString().toLowerCase();
    if (t === "text" || t === "audio" || t === "image" || t === "video" ||
        t === "document" || t === "sticker" || t === "location") {
      messageType = t as NormalizedMessageType;
    } else if (payload.mediaUrl || payload.mediaKey) {
      messageType = "image";
    }
  }

  // Fallback mediaUrl explícito en el payload plano
  if (!mediaInput && typeof payload.mediaUrl === "string" && payload.mediaUrl.length > 0) {
    mediaInput = payload.mediaUrl;
    mediaUrl = payload.mediaUrl;
  }
  if (!mimeType && typeof payload.mimeType === "string") mimeType = payload.mimeType;
  if (!mediaKey && payload.mediaKey !== undefined && payload.mediaKey !== null) {
    mediaKey = normalizeMediaKey(payload.mediaKey);
  }

  // Empty-text para mensajes multimedia puros
  if ((messageType === "image" || messageType === "video" || messageType === "document" || messageType === "sticker" || messageType === "audio") &&
      (!text || text.trim().length === 0)) {
    text = null;
  }

  return {
    messageId,
    phone,
    remoteJid: remoteJidRaw ?? (remoteJid ? `${remoteJid}@s.whatsapp.net` : null),
    fromMe,
    messageType,
    text,
    mediaInput,
    mediaKey,
    mimeType,
    latitude,
    longitude,
    pushName,
    mediaUrl,
    raw: rawData ?? payload.rawPayload ?? null
  };
}

function inferFromKey(msg: any): { type: NormalizedMessageType; mediaField: string; mediaKeyField: string; mimeField: string } | null {
  return inferTypeFromKey(msg);
}

function pickMediaUrl(msg: any, field: string | undefined): string | null {
  if (!field || !msg || !msg[field]) return null;
  return msg[field].url ?? null;
}

function pickMediaKeyRaw(msg: any, field: string | undefined): unknown {
  if (!field || !msg || !msg[field]) return undefined;
  return msg[field].mediaKey;
}
