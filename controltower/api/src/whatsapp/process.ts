// whatsapp/process.ts — Orquestador principal del pipeline de WhatsApp.
//
// Flujo (orden obligatorio):
//   1. Anti-loop defenses (rate limit, fromMe, BOT_PHONE, content markers)
//   2. Normalizar payload → NormalizedWhatsAppMessage
//   3. Idempotencia por messageId
//   4. Resolver driver y activeTrip
//   5. Descargar media (si hay) — guardar evidencia PRIMERO
//   6. Persistir mensaje incoming en whatsapp_messages
//   7. Si hay audio y no hay transcripción → Whisper
//   8. Parser determinístico (reglas)
//   9. Si confianza < umbral → AI Router (Groq → Gemini)
//  10. Validar Intent (tripUpdate debe pertenecer al chofer)
//  11. Ejecutar efectos (trip status, incident, location, event, alert)
//  12. Persistir respuesta outgoing (messageId cuando esté disponible)

import { dbService } from "../database";
import { config } from "../config/env";
import type { Driver, Trip, WhatsappIncomingPayload, WhatsappProcessResult, MessageInterpretation } from "../types";
import { normalizeIncomingWhatsAppMessage, NormalizedWhatsAppMessage } from "./normalize";
import { parseDriverMessageDeterministic, IntentResult, intentToOperationalEvent } from "./parser";
import { downloadAndStoreMedia, transcribeAudio, MediaFinal } from "./media";
import { interpretDriverMessageWithAI, AiDriverInterpretation } from "../ai/interpret";

// ============================================
// Anti-loop defenses
// ============================================

const LOOP_GUARD_MS = config.whatsapp.loopGuardMs;
const lastResponseByPhone = new Map<string, number>();

const GLOBAL_RATE_WINDOW_MS = 10_000;
const GLOBAL_RATE_MAX = 20;
const webhookTimestamps: number[] = [];

function isGloballyRateLimited(): boolean {
  const now = Date.now();
  webhookTimestamps.push(now);
  while (webhookTimestamps.length > 0 && webhookTimestamps[0] < now - GLOBAL_RATE_WINDOW_MS) {
    webhookTimestamps.shift();
  }
  if (webhookTimestamps.length > GLOBAL_RATE_MAX) {
    console.error(`[anti-loop] RATE LIMIT GLOBAL: ${webhookTimestamps.length} webhooks en ${GLOBAL_RATE_WINDOW_MS / 1000}s`);
    return true;
  }
  return false;
}

const OWN_RESPONSE_MARKERS = [
  "mensaje recibido en control tower 360",
  "tu supervisor lo tiene disponible",
  "🟢 procesado",
  "soy control tower 360"
];

function normalizeText(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function ignoredResult(reason: string, payload: WhatsappIncomingPayload): WhatsappProcessResult {
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
    incidentCreated: false
  };
}

// ============================================
// Tipos auxiliares
// ============================================

interface ProcessEffects {
  tripUpdated: boolean;
  incidentCreated: boolean;
  evidenceCreated: boolean;
  eventCreated: boolean;
  alertCreated: boolean;
}

// ============================================
// Función principal
// ============================================

const DETERMINISTIC_THRESHOLD = 0.9;

export async function processIncomingWhatsappMessage(
  payload: WhatsappIncomingPayload
): Promise<WhatsappProcessResult> {
  // ──────────────────────────────────────────────
  // FASE 1: Anti-loop defenses
  // ──────────────────────────────────────────────
  if (isGloballyRateLimited()) {
    return ignoredResult("Rate limit global activado", payload);
  }
  if (payload.fromMe === true) {
    return ignoredResult("fromMe=true (mensaje del propio bot)", payload);
  }
  const cleanPhone = (payload.phone || "").replace("@s.whatsapp.net", "").replace("@c.us", "");
  const remotePhone = (payload.remoteJid || "").replace("@s.whatsapp.net", "").replace("@c.us", "");
  if (cleanPhone === config.whatsapp.botPhone || remotePhone === config.whatsapp.botPhone) {
    return ignoredResult(`Mensaje del número del bot (${config.whatsapp.botPhone})`, payload);
  }

  // ──────────────────────────────────────────────
  // FASE 2: Normalizar payload
  // ──────────────────────────────────────────────
  const norm = normalizeIncomingWhatsAppMessage(payload);
  if (!norm.phone) {
    return ignoredResult("phone ausente o inválido", payload);
  }

  if (!norm.messageId) {
    console.warn("[whatsapp] messageId missing");
  } else {
    console.log(`[whatsapp] inbound phone=${norm.phone} messageId=${norm.messageId} type=${norm.messageType} fromMe=${norm.fromMe}`);
  }

  const normText = normalizeText(norm.text ?? "");
  if (normText.length > 0 && OWN_RESPONSE_MARKERS.some((m) => normText.includes(m))) {
    return ignoredResult("Mensaje coincide con respuesta propia del bot", payload);
  }

  const companyId = payload.companyId || "default-company";

  // ──────────────────────────────────────────────
  // FASE 3: Idempotencia por messageId
  // ──────────────────────────────────────────────
  if (norm.messageId) {
    const existing = dbService.findWhatsappMessageByMessageId(companyId, norm.messageId);
    if (existing) {
      const driver = existing.driverId ? dbService.getDriver(existing.driverId) : null;
      return {
        messageId: existing.id,
        phone: existing.phone,
        remoteJid: existing.messageId ?? norm.remoteJid ?? undefined,
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

  // Debounce secundario
  const now = Date.now();
  const lastResp = lastResponseByPhone.get(norm.phone);
  if (lastResp && now - lastResp < LOOP_GUARD_MS) {
    return ignoredResult(`Debounce anti-loop: respuesta reciente para ${norm.phone}`, payload);
  }

  // ──────────────────────────────────────────────
  // FASE 4: Resolver driver y activeTrip
  // SECURITY: la empresa se resuelve PRIMARIO desde el conductor identificado.
  // Si llega payload.companyId y contradice al conductor, se ignora y se loguea.
  // ──────────────────────────────────────────────
  const driver = dbService.findDriverByPhone(norm.phone);
  let resolvedCompanyId = driver?.companyId || companyId;

  // Defensa anti-IDOR en webhook público:
  // si el payload dice "companyId=X" y el conductor pertenece a "Y", confiamos en Y.
  if (driver && payload.companyId && payload.companyId !== driver.companyId) {
    console.warn(
      `[whatsapp] ⚠️  IDOR detectado: payload.companyId=${payload.companyId} != driver.companyId=${driver.companyId} para phone=${norm.phone}. Se ignora payload.companyId.`
    );
    // No se rechaza el mensaje: el pipeline sigue con la empresa correcta del conductor.
  }

  // Si NO se identificó conductor y tampoco llegó companyId válido del payload,
  // se rechaza el mensaje (no se puede asignar a ninguna empresa).
  if (!driver && !resolvedCompanyId) {
    return ignoredResult("No se pudo determinar empresa del mensaje (sin chofer ni companyId)", payload);
  }

  const activeTrip = driver ? dbService.getActiveTrip(driver.id) : null;

  // ──────────────────────────────────────────────
  // FASE 5: Descargar/guardar media (evidencia)
  // ──────────────────────────────────────────────
  let storedMedia: MediaFinal | null = null;
  if (norm.mediaInput && norm.messageType !== "text" && norm.messageType !== "location" && norm.messageType !== "unknown") {
    storedMedia = await downloadAndStoreMedia(
      norm.mediaInput,
      norm.messageType === "sticker" ? "sticker" : (norm.messageType as any),
      norm.mimeType,
      norm.mediaKey,
      { messageId: norm.messageId, remoteJid: norm.remoteJid }
    );
    if (!storedMedia) {
      console.warn(`[media] ⚠️ No se pudo obtener media válida para messageId=${norm.messageId} type=${norm.messageType} — se omite evidencia`);
    }
  }

  // ──────────────────────────────────────────────
  // FASE 6: Persistir mensaje incoming (auditoría)
  // Se hace ANTES de llamar a IA. Si la IA falla, el mensaje ya queda guardado.
  // ──────────────────────────────────────────────
  const incomingRow = dbService.createWhatsappMessage({
    companyId: resolvedCompanyId,
    driverId: driver?.id,
    phone: norm.phone,
    direction: "incoming",
    messageType: (norm.messageType === "unknown" ? "text" : norm.messageType) as any,
    content: norm.text ?? undefined,
    mediaUrl: storedMedia?.url,
    mimeType: storedMedia?.mimeType,
    mediaKind: storedMedia?.kind,
    fileName: storedMedia?.fileName,
    messageId: norm.messageId ?? undefined,
    tripId: activeTrip?.id,
    processed: false, // se actualizará al final
    rawPayload: payload.rawPayload || JSON.stringify(payload),
    responseMessage: ""
  });

  // ──────────────────────────────────────────────
  // FASE 7: Transcribir audio si hace falta
  // ──────────────────────────────────────────────
  let transcript: string | null = norm.text;
  const isAudio = norm.messageType === "audio";
  if (isAudio && storedMedia && (!transcript || transcript.trim().length < 2)) {
    if (storedMedia.mimeType && storedMedia.mimeType.startsWith("audio/")) {
      const t = await transcribeAudio(storedMedia.url, storedMedia.mimeType);
      if (t) transcript = t;
    }
  }

  // ──────────────────────────────────────────────
  // FASE 8: Parser determinístico
  // ──────────────────────────────────────────────
  let interpretation: MessageInterpretation | null = null;
  let aiShape: AiDriverInterpretation | null = null;
  let deterministic: IntentResult | null = null;
  let aiProvider: string | null = null;
  let aiModel: string | null = null;
  let aiLatencyMs: number | null = null;

  deterministic = parseDriverMessageDeterministic(norm, {
    activeTripId: activeTrip?.id ?? null,
    driverId: driver?.id ?? null
  });

  const deterministicConfident = deterministic && deterministic.confidence >= DETERMINISTIC_THRESHOLD;

  // ──────────────────────────────────────────────
  // FASE 9: AI Router (sólo si el parser no fue suficiente)
  // ──────────────────────────────────────────────
  if (!deterministicConfident) {
    const aiResult = await interpretDriverMessageWithAI({
      messageType: norm.messageType,
      text: transcript,
      driver,
      activeTrip,
      messageId: norm.messageId
    });

    if (aiResult?.interpretation) {
      aiShape = aiResult.interpretation;
      aiProvider = aiResult.provider;
      aiModel = aiResult.model;
      aiLatencyMs = aiResult.latencyMs;
      interpretation = aiToMessageInterpretation(aiShape, activeTrip, norm);
    }
  }

  // Si ni parser ni IA resolvieron, construimos una respuesta por defecto.
  if (!interpretation) {
    if (deterministic) {
      interpretation = intentToMessageInterpretation(deterministic, activeTrip, driver, transcript ?? "");
      aiShape = intentToAiShape(deterministic, transcript ?? "");
    } else {
      interpretation = {
        action: "unknown",
        confidence: 0,
        responseMessage: "Mensaje recibido en Control Tower 360."
      };
      aiShape = {
        action: "general_message",
        confidence: 0.3,
        priority: "informativa",
        requiresIntervention: false,
        responseMessage: interpretation.responseMessage
      };
    }
  }

  // ──────────────────────────────────────────────
  // FASE 10: Ejecutar efectos
  // ──────────────────────────────────────────────
  const effects: ProcessEffects = {
    tripUpdated: false,
    incidentCreated: false,
    evidenceCreated: false,
    eventCreated: false,
    alertCreated: false
  };

  // A) Trip update (con validación trip-pertenece-al-chofer)
  if (interpretation.tripUpdate) {
    try {
      let tripId = interpretation.tripUpdate.tripId;
      if (typeof tripId === "string") tripId = tripId.replace(/^#/, "").trim();
      const targetTrip = tripId ? safeGetTrip(tripId) : null;
      const isValid = targetTrip && (!driver || targetTrip.driverId === driver?.id);
      if (isValid && targetTrip) {
        dbService.updateTripStatus(targetTrip.id, interpretation.tripUpdate.newStatus as any, transcript ?? "");
        effects.tripUpdated = true;
        console.log(`[tripUpdate] tripId=${targetTrip.id} driver=${driver?.id} status=${interpretation.tripUpdate.newStatus}`);
      } else {
        console.warn(`[tripUpdate] IGNORED tripId=${tripId} driver=${driver?.id} reason=invalid_relationship`);
        // Si el chofer tiene viaje activo válido, actualizar ése en su lugar.
        if (activeTrip && interpretation.tripUpdate.newStatus) {
          dbService.updateTripStatus(activeTrip.id, interpretation.tripUpdate.newStatus as any, transcript ?? "");
          effects.tripUpdated = true;
        }
      }
    } catch (err) {
      console.error("[tripUpdate] error:", (err as Error).message);
    }
  }

  // B) Incidente
  if (interpretation.incident && driver) {
    try {
      dbService.createIncidentFromWhatsapp({
        companyId: resolvedCompanyId,
        vehicleId: driver.vehicleId,
        driverId: driver.id,
        type: interpretation.incident.type,
        description: interpretation.incident.description,
        location: norm.latitude !== null ? `${norm.latitude}, ${norm.longitude}` : undefined
      });
      effects.incidentCreated = true;
    } catch (err) {
      console.error("[incident] error:", (err as Error).message);
    }
  }

  // C) Location
  if (norm.messageType === "location" && norm.latitude !== null && norm.longitude !== null) {
    try {
      if (activeTrip) {
        dbService.createGpsPosition(activeTrip.id, norm.latitude, norm.longitude, 0);
      }
      dbService.createDriverLocation({
        companyId: resolvedCompanyId,
        driverId: driver?.id,
        tripId: activeTrip?.id,
        vehicleId: driver?.vehicleId,
        latitude: norm.latitude,
        longitude: norm.longitude,
        source: "whatsapp",
        label: norm.text ?? undefined
      });
    } catch (err) {
      console.error("[location] error:", (err as Error).message);
    }
  }

  // D) Evidencia — solo si hay media REAL descargada (no stub).
  // Antes esto creaba registros incluso para audios de 14 bytes; ahora sólo
  // persiste evidencia con bytes válidos para que el panel no muestre 0:00/0:00.
  if (storedMedia && storedMedia.sizeBytes > 0) {
    try {
      const kind = storedMedia.kind;
      dbService.createTripEvidence({
        companyId: resolvedCompanyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        kind: kind as any,
        title: norm.pushName ?? undefined,
        description: transcript ?? undefined,
        mediaUrl: storedMedia.url,
        mimeType: storedMedia.mimeType,
        fileName: storedMedia.fileName,
        transcript: kind === "audio" ? transcript ?? undefined : undefined,
        source: "whatsapp",
        sourceMessageId: incomingRow.id,
        capturedAt: payload.timestamp
      });
      effects.evidenceCreated = true;
      console.log(`[evidence] saved type=${kind} mime=${storedMedia.mimeType ?? "?"} size=${storedMedia.sizeBytes}B decryptFailed=${storedMedia.mediaDecryptFailed}`);
    } catch (err) {
      console.error("[evidence] error:", (err as Error).message);
    }
  } else if (isAudio) {
    console.warn(`[evidence] omitido: audio sin bytes válidos (descarga falló o stub)`);
  }

  // E) Evento operacional
  if (aiShape?.tripUpdate || deterministic) {
    const eventSource = aiShape ?? intentToAiShape(deterministic!, transcript ?? "");
    if (eventSource.event) {
      try {
        dbService.createOperationalEvent({
          companyId: resolvedCompanyId,
          tripId: activeTrip?.id,
          driverId: driver?.id,
          vehicleId: driver?.vehicleId,
          source: "whatsapp",
          sourceMessageId: incomingRow.id,
          type: eventSource.event.type as any,
          category: eventSource.event.category ?? undefined,
          priority: eventSource.priority,
          title: eventSource.event.title ?? eventSource.action,
          description: eventSource.event.description ?? transcript ?? undefined,
          metadata: eventSource.event.metadata ?? eventSource.eta ?? undefined,
          requiresIntervention: eventSource.requiresIntervention
        });
        effects.eventCreated = true;
      } catch (err) {
        console.error("[operational_event] error:", (err as Error).message);
      }
    }
  }

  // F) Alerta
  if (aiShape && (aiShape.priority === "critica" || aiShape.priority === "alta" || aiShape.requiresIntervention)) {
    try {
      const entityLabel = (activeTrip ? `#${activeTrip.id.replace(/^trip-/, "")}` : (driver?.fullName ?? "Operación"));
      dbService.createOperationalAlert({
        companyId: resolvedCompanyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        vehicleId: driver?.vehicleId,
        level: aiShape.priority,
        title: aiShape.event?.title ?? `${aiShape.action}`,
        message: aiShape.event?.description ?? transcript ?? "",
        entityType: activeTrip ? "trip" : (driver ? "driver" : "trip"),
        entityLabel,
        requiresIntervention: aiShape.requiresIntervention
      });
      effects.alertCreated = true;
    } catch (err) {
      console.error("[operational_alert] error:", (err as Error).message);
    }
  }

  // ──────────────────────────────────────────────
  // FASE 11: Actualizar mensaje incoming con el resultado
  // ──────────────────────────────────────────────
  dbService.markWhatsappMessageProcessed(
    incomingRow.id,
    interpretation.action,
    interpretation.confidence,
    interpretation.responseMessage
  );

  // ──────────────────────────────────────────────
  // FASE 12: Persistir respuesta outgoing
  // ──────────────────────────────────────────────
  if (interpretation.responseMessage) {
    try {
      dbService.createWhatsappMessage({
        companyId: resolvedCompanyId,
        driverId: driver?.id,
        phone: norm.phone,
        direction: "outgoing",
        messageType: "text",
        content: interpretation.responseMessage,
        tripId: activeTrip?.id,
        processed: true,
        responseMessage: interpretation.responseMessage,
        // messageId de outgoing se llenará cuando WhatsApp/Evolution lo entregue (via webhook).
        messageId: undefined
      });
    } catch (err) {
      console.warn("[outgoing] no se pudo persistir:", (err as Error).message);
    }
  }

  // Registrar timestamp para debounce secundario
  lastResponseByPhone.set(norm.phone, Date.now());

  return {
    messageId: incomingRow.id,
    phone: norm.phone,
    remoteJid: norm.remoteJid ?? undefined,
    driverFound: !!driver,
    driverName: driver?.fullName,
    companyId,
    interpretation,
    tripUpdated: effects.tripUpdated,
    incidentCreated: effects.incidentCreated
  };
}

// ============================================
// Helpers internos
// ============================================

function safeGetTrip(tripId: string): Trip | null {
  try {
    return dbService.getTrip(tripId);
  } catch {
    return null;
  }
}

function aiToMessageInterpretation(
  ai: AiDriverInterpretation,
  activeTrip: Trip | null,
  norm: NormalizedWhatsAppMessage
): MessageInterpretation {
  const result: MessageInterpretation = {
    action: ai.action,
    confidence: ai.confidence,
    responseMessage: ai.responseMessage
  };

  if (ai.tripUpdate) {
    result.tripUpdate = { tripId: ai.tripUpdate.tripId, newStatus: ai.tripUpdate.newStatus as any };
  }

  if (ai.event && (ai.event.type === "accident" || ai.event.type === "breakdown" || ai.event.type === "tire" || ai.event.type === "delay")) {
    result.incident = {
      type: ai.event.type === "tire" ? "tire" : ai.event.type,
      description: ai.event.description || ai.event.title || ""
    };
  }

  if (norm.messageType === "location" && norm.latitude !== null && norm.longitude !== null) {
    result.gpsPosition = { latitude: norm.latitude, longitude: norm.longitude };
  }

  return result;
}

function intentToMessageInterpretation(
  intent: IntentResult,
  activeTrip: Trip | null,
  driver: (Driver & { companyName?: string }) | null,
  transcript: string
): MessageInterpretation {
  const action = intentIntentToAction(intent.intent);
  const response = responseForIntent(intent, transcript, activeTrip, driver);
  const result: MessageInterpretation = {
    action,
    confidence: intent.confidence,
    responseMessage: response
  };
  if (intent.tripUpdate && activeTrip) {
    result.tripUpdate = {
      tripId: intent.tripUpdate.tripId || activeTrip.id,
      newStatus: intent.tripUpdate.newStatus
    };
  }
  if (intent.intent === "INCIDENT" && driver) {
    result.incident = { type: "breakdown", description: transcript };
  }
  return result;
}

function intentIntentToAction(intent: IntentResult["intent"]): MessageInterpretation["action"] {
  const map: Record<IntentResult["intent"], MessageInterpretation["action"]> = {
    DEPARTED: "trip_departure",
    ARRIVED: "trip_arrival",
    LOADED: "loading",
    UNLOADED: "unloading",
    IN_TRANSIT: "trip_departure",
    DELAY: "delay",
    INCIDENT: "breakdown",
    DELIVERY: "document_upload",
    LOCATION: "location_share",
    QUESTION: "status_query",
    OTHER: "general_message"
  };
  return map[intent];
}

function responseForIntent(intent: IntentResult, transcript: string, activeTrip: Trip | null, driver: (Driver & { companyName?: string }) | null): string {
  const tid = activeTrip ? `#${activeTrip.id.replace(/^trip-/, "")}` : "";
  switch (intent.intent) {
    case "DEPARTED": return `✅ Viaje ${tid} en ruta. Buen viaje.`;
    case "ARRIVED": return `🏁 Llegada registrada en ${tid}.`;
    case "LOADED": return `📦 Carga registrada para ${tid}.`;
    case "UNLOADED": return `📥 Descarga registrada para ${tid}.`;
    case "IN_TRANSIT": return `✅ Viaje ${tid} continúa en ruta.`;
    case "DELAY": return `⏳ Demora registrada en ${tid}.`;
    case "INCIDENT": return `🚨 Incidente reportado. Soporte notificado.`;
    case "DELIVERY": return `📄 Evidencia recibida y archivada.`;
    case "LOCATION": return `📍 Ubicación recibida.`;
    case "QUESTION": return `👋 Hola ${driver?.fullName ?? "Chofer"}${activeTrip ? `, tu viaje activo es ${tid} (${activeTrip.status.toUpperCase()})` : ""}.`;
    case "OTHER": return `👋 Hola, soy Control Tower 360.`;
  }
}

function intentToAiShape(intent: IntentResult, transcript: string): AiDriverInterpretation {
  const ev = intentToOperationalEvent(intent.intent);
  const priority = ev?.priority ?? "informativa";
  const requiresIntervention = ev?.requiresIntervention ?? intent.requiresHuman ?? false;
  return {
    action: intentIntentToAction(intent.intent) as AiDriverInterpretation["action"],
    confidence: intent.confidence,
    priority: priority as AiDriverInterpretation["priority"],
    requiresIntervention,
    responseMessage: transcript || "Mensaje recibido.",
    tripUpdate: intent.tripUpdate && intent.tripUpdate.tripId
      ? { tripId: intent.tripUpdate.tripId, newStatus: intent.tripUpdate.newStatus, approvalRequired: false }
      : undefined,
    event: ev
      ? {
          type: ev.type,
          title: ev.title,
          description: transcript
        }
      : null,
    alert: requiresIntervention
      ? { title: ev?.title ?? "Incidente", message: transcript }
      : null,
    eta: null
  };
}
