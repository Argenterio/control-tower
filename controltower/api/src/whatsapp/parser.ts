// whatsapp/parser.ts — Parser determinístico (reglas) + DriverIntent schema.
// Se ejecuta ANTES de la IA. Si la confianza es alta, NO se llama a la IA.

import type { NormalizedWhatsAppMessage } from "./normalize";

export type DriverIntent =
  | "ARRIVED"
  | "DEPARTED"
  | "LOADED"
  | "UNLOADED"
  | "IN_TRANSIT"
  | "DELAY"
  | "INCIDENT"
  | "DELIVERY"
  | "LOCATION"
  | "QUESTION"
  | "OTHER";

export type TripStatus =
  | "pending"
  | "loading"
  | "en_route"
  | "arrived"
  | "unloading"
  | "delayed"
  | "completed"
  | "cancelled";

export interface IntentResult {
  intent: DriverIntent;
  confidence: number; // 0.0 - 1.0
  tripUpdate?: { tripId: string | null; newStatus: TripStatus; approvalRequired: boolean };
  notes?: string;
  requiresHuman?: boolean;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[¿?!¡.,;:()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Rule {
  intent: DriverIntent;
  patterns: string[];
  newStatus?: TripStatus;
  confidence: number;
  requiresHuman?: boolean;
}

const RULES: Rule[] = [
  {
    intent: "DEPARTED",
    patterns: ["ya sali", "saliendo", "arranque", "arrancando", "partiendo", "en camino", "en viaje", "en ruta", "voy para ", "rumbo a"],
    newStatus: "en_route",
    confidence: 0.95
  },
  {
    intent: "ARRIVED",
    patterns: ["ya llegue", "arribe", "estoy en planta", "llegamos", "en destino", "estoy en destino", "ya estoy en"],
    newStatus: "arrived",
    confidence: 0.95
  },
  {
    intent: "LOADED",
    patterns: ["ya cargue", "ya cargaron", "carga lista", "carga completa", "ya esta cargado", "ya esta cargada", "termine de cargar"],
    newStatus: "loading",
    confidence: 0.9
  },
  {
    intent: "UNLOADED",
    patterns: ["ya descargue", "descarga lista", "descarga completa", "termine de descargar", "ya esta descargado"],
    newStatus: "unloading",
    confidence: 0.9
  },
  {
    intent: "IN_TRANSIT",
    patterns: ["sigo en ruta", "continuo viaje", "sigo viaje", "todavia en camino", "sigo camino", "de camino"],
    confidence: 0.85
  },
  {
    intent: "DELAY",
    patterns: ["demora", "demorado", "trancado", "congestion", "piquete", "corte de ruta", "parado", "espera", "me detuve", "atasco"],
    newStatus: "delayed",
    confidence: 0.85
  },
  {
    intent: "INCIDENT",
    patterns: ["accidente", "choque", "chocaron", "volco", "volcamos", "siniestro", "se rompio", "rompi", "averia", "no arranca", "goma pinchada", "pinchazo", "pinchadura", "revento cubierta"],
    confidence: 0.92,
    requiresHuman: true
  }
];

export interface ParserContext {
  activeTripId: string | null;
  driverId: string | null;
}

/**
 * Parser determinístico de mensajes de chofer. Devuelve { intent, confidence }
 * basado en reglas. Si la confianza es >= 0.9, no se llama a la IA.
 */
export function parseDriverMessageDeterministic(
  msg: NormalizedWhatsAppMessage,
  ctx: ParserContext
): IntentResult | null {
  if (msg.messageType === "location") {
    return {
      intent: "LOCATION",
      confidence: 1.0,
      notes: "Mensaje de ubicación GPS"
    };
  }

  if (msg.messageType === "image" || msg.messageType === "video" || msg.messageType === "document") {
    return {
      intent: "DELIVERY",
      confidence: 0.85,
      notes: "Evidencia adjunta"
    };
  }

  if (msg.messageType === "audio") {
    // Audios sin transcripción no podemos resolverlos por reglas.
    return null;
  }

  const text = msg.text ?? "";
  if (text.length === 0) return null;

  const n = normalize(text);

  // Saludos / ayuda
  if (/^(hola|buen[oa]s?|que tal|comandos|ayuda|menu)\b/.test(n)) {
    return { intent: "OTHER", confidence: 0.95, notes: "Saludo" };
  }

  // Preguntas de estado
  if (/como va|cual es mi|donde esta|como estoy|cuando (llego|llegamos)/.test(n)) {
    return { intent: "QUESTION", confidence: 0.9, notes: "Consulta de estado" };
  }

  for (const rule of RULES) {
    for (const p of rule.patterns) {
      if (n.includes(p)) {
        const tripUpdate = rule.newStatus && ctx.activeTripId
          ? { tripId: ctx.activeTripId, newStatus: rule.newStatus, approvalRequired: false }
          : undefined;
        return {
          intent: rule.intent,
          confidence: rule.confidence,
          tripUpdate,
          requiresHuman: rule.requiresHuman === true,
          notes: `matched pattern "${p}"`
        };
      }
    }
  }

  return null;
}

/**
 * Convierte un IntentResult a un evento operacional (compatible con la DB existente).
 */
export function intentToOperationalEvent(intent: DriverIntent): { type: string; title: string; priority: string; requiresIntervention: boolean } | null {
  switch (intent) {
    case "DEPARTED": return { type: "departure", title: "Salida confirmada", priority: "informativa", requiresIntervention: false };
    case "ARRIVED": return { type: "arrival", title: "Llegada confirmada", priority: "informativa", requiresIntervention: false };
    case "LOADED": return { type: "loading", title: "Carga confirmada", priority: "informativa", requiresIntervention: false };
    case "UNLOADED": return { type: "unloading", title: "Descarga confirmada", priority: "informativa", requiresIntervention: false };
    case "IN_TRANSIT": return { type: "departure", title: "En ruta", priority: "informativa", requiresIntervention: false };
    case "DELAY": return { type: "delay", title: "Demora reportada", priority: "atencion", requiresIntervention: false };
    case "INCIDENT": return { type: "breakdown", title: "Incidente reportado", priority: "alta", requiresIntervention: true };
    case "DELIVERY": return { type: "document", title: "Evidencia recibida", priority: "informativa", requiresIntervention: false };
    case "LOCATION": return { type: "location", title: "Ubicación compartida", priority: "informativa", requiresIntervention: false };
    case "QUESTION": return null;
    case "OTHER": return null;
  }
}
