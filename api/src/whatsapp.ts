// whatsapp.ts - Motor de procesamiento e interpretación de mensajes WhatsApp
// Conecta Evolution API (vía n8n) con Control Tower

import { dbService } from "./database";
import { interpretDriverMessageWithAI } from "./ai";
import type {
  WhatsappIncomingPayload,
  WhatsappProcessResult,
  MessageInterpretation,
  InterpretedAction,
  Trip,
  Driver
} from "./types";

// Normalizar texto para análisis NLP simple
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .trim();
}

// Interpretar mensaje en lenguaje natural del chofer
export function interpretDriverMessage(
  rawText: string,
  payload: WhatsappIncomingPayload,
  driver: (Driver & { companyName?: string }) | null,
  activeTrip: Trip | null
): MessageInterpretation {
  const text = normalizeText(rawText);

  // 1. Manejo de ubicaciones GPS compartidas por WhatsApp
  if (payload.messageType === "location" && payload.latitude !== undefined && payload.longitude !== undefined) {
    return {
      action: "location_share",
      confidence: 1.0,
      gpsPosition: {
        latitude: payload.latitude,
        longitude: payload.longitude
      },
      responseMessage: activeTrip
        ? `📍 Ubicación recibida y registrada en el Viaje #${activeTrip.id.replace('trip-', '')}. ¡Buen viaje!`
        : `📍 Ubicación recibida. (No tenés un viaje activo asignado en este momento).`
    };
  }

  // 2. Manejo de imágenes / fotos (remito, ticket combustible, incidente)
  if (payload.messageType === "image" || payload.messageType === "document") {
    const isFuel = text.includes("ticket") || text.includes("combustible") || text.includes("nafta") || text.includes("gasoil");
    const isIncident = text.includes("rotura") || text.includes("choque") || text.includes("goma") || text.includes("dano");

    if (isFuel) {
      return {
        action: "fuel_stop",
        confidence: 0.9,
        responseMessage: `⛽ Comprobante de combustible recibido. Se registrará en la auditoría de costos de la unidad.`
      };
    }

    if (isIncident && activeTrip) {
      return {
        action: "breakdown",
        confidence: 0.85,
        incident: {
          type: "breakdown",
          description: `Foto de incidente adjunta: ${rawText || "Sin descripción"}`
        },
        responseMessage: `⚠️ Registro fotográfico de novedad recibido. Equipo de operaciones notificado para asistencia.`
      };
    }

    return {
      action: "document_upload",
      confidence: 0.95,
      responseMessage: activeTrip
        ? `📄 Documento/Remito recibido para el Viaje #${activeTrip.id.replace('trip-', '')}. Adjuntado al legajo digital.`
        : `📄 Documento recibido y archivado en el sistema.`
    };
  }

  // 3. Salida / Inicio de viaje
  const departureKeywords = ["sali", "arranque", "arrancando", "en viaje", "en camino", "saliendo", "iniciando", "partiendo", "en ruta"];
  if (departureKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "trip_departure",
        confidence: 0.95,
        tripUpdate: {
          tripId: activeTrip.id,
          newStatus: "en_route"
        },
        responseMessage: `✅ ¡Excelente ${driver ? driver.fullName.split(" ")[0] : ""}! Viaje #${activeTrip.id.replace('trip-', '')} actualizado a EN RUTA (${activeTrip.origin} ➔ ${activeTrip.destination}). Manejá con precaución.`
      };
    }
    return {
      action: "trip_departure",
      confidence: 0.6,
      responseMessage: `⚠️ Registramos tu aviso de salida, pero no tenés ningún viaje pendiente en el sistema. Contactá a tráfico.`
    };
  }

  // 4. Llegada a destino
  const arrivalKeywords = ["llegue", "en destino", "llegando a destino", "arribe", "estoy en planta", "llegamos"];
  if (arrivalKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "trip_arrival",
        confidence: 0.95,
        tripUpdate: {
          tripId: activeTrip.id,
          newStatus: "arrived"
        },
        responseMessage: `🏁 ¡Llegada registrada! Viaje #${activeTrip.id.replace('trip-', '')} en ${activeTrip.destination}. Recordá enviar foto del remito firmado al terminar la descarga.`
      };
    }
    return {
      action: "trip_arrival",
      confidence: 0.6,
      responseMessage: `🏁 Llegada registrada en el sistema.`
    };
  }

  // 5. Carga de mercadería
  const loadingKeywords = ["cargando", "estoy cargando", "en carga", "inicio de carga", "cargaron"];
  if (loadingKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "loading",
        confidence: 0.9,
        tripUpdate: {
          tripId: activeTrip.id,
          newStatus: "loading"
        },
        responseMessage: `📦 Estado actualizado: CARGANDO en ${activeTrip.origin}. Avisá cuando salgas a ruta.`
      };
    }
    return {
      action: "loading",
      confidence: 0.6,
      responseMessage: `📦 Estado de carga registrado.`
    };
  }

  // 6. Descarga de mercadería / Fin
  const unloadingKeywords = ["descargando", "estoy descargando", "en descarga", "bajando mercaderia", "vaciando"];
  if (unloadingKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "unloading",
        confidence: 0.9,
        tripUpdate: {
          tripId: activeTrip.id,
          newStatus: "unloading"
        },
        responseMessage: `📥 Estado actualizado: DESCARGANDO en ${activeTrip.destination}. Recordá pedir firma del remito/POD.`
      };
    }
  }

  // 7. Viaje finalizado / Completado
  const completedKeywords = ["termine", "descarga completa", "viaje cerrado", "remito firmado", "fin de viaje", "entregado"];
  if (completedKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "trip_arrival",
        confidence: 0.95,
        tripUpdate: {
          tripId: activeTrip.id,
          newStatus: "completed"
        },
        responseMessage: `🎉 Viaje #${activeTrip.id.replace('trip-', '')} COMPLETADO con éxito. Gracias por el reporte.`
      };
    }
  }

  // 8. Demoras / Tránsito
  const delayKeywords = ["demora", "demorado", "trancado", "transito", "congestion", "corte", "piquete", "parado", "espera"];
  if (delayKeywords.some(k => text.includes(k))) {
    return {
      action: "delay",
      confidence: 0.9,
      incident: {
        type: "delay",
        description: `Demora reportada por chofer: "${rawText}"`
      },
      tripUpdate: activeTrip ? {
        tripId: activeTrip.id,
        newStatus: "delayed"
      } : undefined,
      responseMessage: `⏳ Demora registrada en el Control Tower. La torre de control recalculará la ETA para informar al cliente.`
    };
  }

  // 9. Neumáticos / Gomería
  const tireKeywords = ["goma", "pinchazo", "pinche", "cubierta", "desinflada", "gomeria"];
  if (tireKeywords.some(k => text.includes(k))) {
    return {
      action: "tire_issue",
      confidence: 0.92,
      incident: {
        type: "tire",
        description: `Novedad de neumáticos: "${rawText}"`
      },
      responseMessage: `🛞 Incidencia de neumático registrada. Mantenimiento y operaciones están avisados.`
    };
  }

  // 10. Avería mecánica / Falla
  const breakdownKeywords = ["se rompio", "rompi", "mecanico", "averia", "falla", "motor", "temperatura", "recalento", "taller", "grua", "no arranca"];
  if (breakdownKeywords.some(k => text.includes(k))) {
    return {
      action: "breakdown",
      confidence: 0.92,
      incident: {
        type: "breakdown",
        description: `Falla mecánica: "${rawText}"`
      },
      responseMessage: `🔧 ALERTA DE AVERÍA registrada. Notificamos al jefe de taller y supervisor de flota para darte soporte.`
    };
  }

  // 11. Accidente / Emergencia
  const accidentKeywords = ["accidente", "choque", "chocaron", "choque", "volco", "herido", "siniestro"];
  if (accidentKeywords.some(k => text.includes(k))) {
    return {
      action: "accident",
      confidence: 0.98,
      incident: {
        type: "accident",
        description: `URGENTE - Reporte de siniestro: "${rawText}"`
      },
      responseMessage: `🚨 ALERTA CRÍTICA: Se activó protocolo de emergencia en la Torre de Control. Si hay personas heridas, llamá inmediatamente al 911 / 107.`
    };
  }

  // 12. Saludo / Estado general
  const greetingKeywords = ["hola", "buen dia", "buenas tardes", "buenas noches", "que tal", "comandos", "ayuda"];
  if (greetingKeywords.some(k => text.includes(k))) {
    const driverName = driver ? driver.fullName : "Chofer";
    let msg = `👋 Hola ${driverName}, soy el asistente del Centro de Control Operativo.\n\n`;
    if (activeTrip) {
      msg += `📋 *Viaje Activo:* #${activeTrip.id.replace('trip-', '')}\n`;
      msg += `📍 *Origen:* ${activeTrip.origin}\n`;
      msg += `🏁 *Destino:* ${activeTrip.destination}\n`;
      msg += `🚦 *Estado actual:* ${activeTrip.status.toUpperCase()}\n\n`;
      msg += `Podés enviarme:\n• "Salí" o "En camino"\n• "Llegué" o "Cargando"\n• "Demora [motivo]"\n• Fotos de remitos o tickets\n• Tu ubicación en tiempo real`;
    } else {
      msg += `No tenés un viaje asignado en este momento. Te notificaremos cuando se programe uno.`;
    }
    return {
      action: "greeting",
      confidence: 1.0,
      responseMessage: msg
    };
  }

  // 13. Consulta de viaje
  const queryKeywords = ["mi viaje", "que viaje", "proximo viaje", "donde voy", "destino"];
  if (queryKeywords.some(k => text.includes(k))) {
    if (activeTrip) {
      return {
        action: "status_query",
        confidence: 0.95,
        responseMessage: `📋 *Tu Viaje Actual (#${activeTrip.id.replace('trip-', '')}):*\n• Origen: ${activeTrip.origin}\n• Destino: ${activeTrip.destination}\n• Estado: ${activeTrip.status}\n• Tarifa asignada: $${activeTrip.fare?.toLocaleString('es-AR') || '-'}\n• Km estimados: ${activeTrip.kmTotal || '-'}`
      };
    }
    return {
      action: "status_query",
      confidence: 0.9,
      responseMessage: `No registrás viajes activos en este momento.`
    };
  }

  // 14. Texto desconocido
  return {
    action: "unknown",
    confidence: 0.3,
    responseMessage: `Mensaje recibido en Control Tower: "${rawText}". Tu supervisor operativo lo tiene disponible en la consola.`
  };
}

// Procesa el mensaje recibido de Evolution API (vía n8n)
export async function processIncomingWhatsappMessage(
  payload: WhatsappIncomingPayload
): Promise<WhatsappProcessResult> {
  const cleanPhone = payload.phone || "";
  const rawText = payload.message || "";

  // 1. Buscar chofer por número de teléfono
  const driver = dbService.findDriverByPhone(cleanPhone);
  const companyId = driver?.companyId || "default-company";

  // 2. Buscar viaje activo del chofer
  const activeTrip = driver ? dbService.getActiveTrip(driver.id) : null;

  // 3. Interpretar el mensaje (Primero con Gemini AI, con fallback al parser de reglas)
  let interpretation: MessageInterpretation | null = null;
  
  // Si no es un mensaje binario (como solo GPS o imagen pura), probamos con Gemini Flash
  if (rawText && payload.messageType !== "location") {
    try {
      interpretation = await interpretDriverMessageWithAI(rawText, driver, activeTrip);
    } catch (e) {
      console.warn("AI interpretation failed, using deterministic parser:", e);
    }
  }

  // Fallback si la IA falló o si es un mensaje de GPS/Imagen
  if (!interpretation) {
    interpretation = interpretDriverMessage(rawText, payload, driver, activeTrip);
  }

  let tripUpdated = false;
  let incidentCreated = false;

  // 4. Aplicar efectos en la base de datos
  // A. Actualizar estado de viaje
  if (interpretation.tripUpdate) {
    try {
      dbService.updateTripStatus(
        interpretation.tripUpdate.tripId,
        interpretation.tripUpdate.newStatus,
        rawText
      );
      tripUpdated = true;
    } catch (err) {
      console.error("Error al actualizar estado de viaje vía WhatsApp:", err);
    }
  }

  // B. Crear incidente si aplica
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

  // C. Registrar posición GPS si fue compartida
  if (interpretation.gpsPosition && activeTrip) {
    try {
      dbService.createGpsPosition(
        activeTrip.id,
        interpretation.gpsPosition.latitude,
        interpretation.gpsPosition.longitude,
        0
      );
    } catch (err) {
      console.error("Error al registrar posición GPS vía WhatsApp:", err);
    }
  }

  // 5. Guardar el mensaje en el registro de auditoría de WhatsApp
  const savedMessage = dbService.createWhatsappMessage({
    companyId,
    driverId: driver?.id,
    phone: cleanPhone,
    direction: "incoming",
    messageType: payload.messageType,
    content: rawText,
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
    driverFound: !!driver,
    driverName: driver?.fullName,
    companyId,
    interpretation,
    tripUpdated,
    incidentCreated
  };
}
