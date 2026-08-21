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

import { dbService } from "./database";
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
// PROCESO PRINCIPAL
// =====================================================
export async function processIncomingWhatsappMessage(
  payload: WhatsappIncomingPayload
): Promise<WhatsappProcessResult> {
  const cleanPhone = payload.phone || "";
  const rawText = payload.message || "";

  // 1. Identificar chofer y viaje activo
  const driver = dbService.findDriverByPhone(cleanPhone);
  const companyId = driver?.companyId || "default-company";
  const activeTrip = driver ? dbService.getActiveTrip(driver.id) : null;

  // 2. Si es audio y NO viene transcripto, lo transcribimos nosotros (Whisper)
  let transcript = rawText;
  if (payload.messageType === "audio" && (!transcript || transcript.trim().length < 2) && payload.mediaUrl) {
    try {
      transcript = await transcribeAudio(payload.mediaUrl, "audio/ogg");
    } catch (e) {
      console.warn("[transcribeAudio] falló:", (e as Error).message);
    }
  }

  // 3. Interpretar con IA (Groq -> Gemini fallback)
  let aiResult: InterpretResult | null = null;
  let interpretation: MessageInterpretation | null = null;

  if (transcript && payload.messageType !== "location") {
    try {
      aiResult = await interpretDriverMessageWithAI(transcript, driver, activeTrip);
    } catch (e) {
      console.warn("AI interpretation failed:", (e as Error).message);
    }
  }

  // Si la IA devolvió interpretación, la usamos como fuente principal.
  // Si no, usamos el parser determinístico PERO igual emitimos un evento operacional mínimo
  // para que la cadena (evento → alerta) siga funcionando aunque la IA esté caída.
  const usingAI = !!aiResult?.interpretation;
  if (usingAI) {
    interpretation = aiToMessageInterpretation(aiResult!.interpretation!, payload, driver, activeTrip);
  } else {
    interpretation = interpretDriverMessage(transcript, payload, driver, activeTrip);
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
        companyId,
        vehicleId: driver.vehicleId,
        driverId: driver.id,
        type: interpretation.incident.type,
        description: interpretation.incident.description,
        location: payload.latitude ? `${payload.latitude}, ${payload.longitude}` : undefined
      });
      incidentCreated = true;
    } catch (err) {
      console.error("Error al crear incidente vía WhatsApp:", err);
    }
  }

  // C. GPS / ubicación
  if (payload.messageType === "location" && payload.latitude !== undefined && payload.longitude !== undefined) {
    try {
      if (activeTrip) {
        dbService.createGpsPosition(activeTrip.id, payload.latitude, payload.longitude, 0);
      }
      dbService.createDriverLocation({
        companyId,
        driverId: driver?.id,
        tripId: activeTrip?.id,
        vehicleId: driver?.vehicleId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        source: "whatsapp",
        label: payload.message
      });
    } catch (err) {
      console.error("Error al guardar location:", err);
    }
  }

  // D. Evidencia (audio, imagen, documento) -> trip_evidence
  if ((payload.messageType === "image" || payload.messageType === "audio" || payload.messageType === "document") && (payload.mediaUrl || transcript)) {
    try {
      const kind: "audio" | "image" | "document" =
        payload.messageType === "audio" ? "audio" :
        payload.messageType === "image" ? "image" : "document";
      dbService.createTripEvidence({
        companyId,
        tripId: activeTrip?.id,
        driverId: driver?.id,
        kind,
        title: payload.pushName || undefined,
        description: transcript || payload.message || undefined,
        mediaUrl: payload.mediaUrl,
        transcript: kind === "audio" ? transcript : undefined,
        source: "whatsapp",
        capturedAt: payload.timestamp
      });
      evidenceCreated = true;
    } catch (err) {
      console.error("Error al guardar evidencia:", err);
    }
  }

  // E. Evento operacional (siempre, tanto si vino de IA como del parser determinístico)
  if (ai.event) {
    try {
      dbService.createOperationalEvent({
        companyId,
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
        companyId,
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
    companyId,
    driverId: driver?.id,
    phone: cleanPhone,
    direction: "incoming",
    messageType: payload.messageType,
    content: transcript,
    mediaUrl: payload.mediaUrl,
    interpretedAction: interpretation.action,
    interpretedConfidence: interpretation.confidence,
    tripId: activeTrip?.id,
    processed: true,
    rawPayload: payload.rawPayload || JSON.stringify(payload),
    responseMessage: interpretation.responseMessage
  });

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
