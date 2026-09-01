// ai/interpret.ts — Interpretación de mensajes de chofer usando AI Router.
//
// Prompt compacto: sólo lo necesario para decidir la acción. Sin payloads gigantes,
// sin contexto redundante, sin historial completo.

import { config } from "../config/env";
import { dbService } from "../database";
import type { Driver, Trip } from "../types";
import { callChat } from "./router";
import type { ChatResponse } from "./router";

export type IntentAction =
  | "trip_departure" | "trip_arrival" | "loading" | "unloading"
  | "delay" | "breakdown" | "accident" | "tire_issue" | "fuel_stop"
  | "document_upload" | "location_share" | "greeting" | "status_query"
  | "general_message";

export interface AiDriverInterpretation {
  action: IntentAction;
  confidence: number;
  priority: "critica" | "alta" | "atencion" | "informativa";
  requiresIntervention: boolean;
  responseMessage: string;
  tripUpdate?: { tripId: string; newStatus: string; approvalRequired?: boolean };
  event?: { type: string; category?: string; title?: string; description?: string; metadata?: Record<string, unknown> } | null;
  alert?: { title: string; message: string; entityType?: string; entityLabel?: string } | null;
  eta?: { nuevoEta?: string; demoraMinutos?: number } | null;
}

export interface InterpretResult {
  interpretation: AiDriverInterpretation | null;
  provider: string;
  model: string;
  latencyMs: number;
  fallback?: { from: string; reason: string };
}

export interface InterpretInput {
  messageType: "text" | "audio" | "image" | "document" | "location" | "video" | "sticker" | "unknown";
  text: string | null;
  driver: (Driver & { companyName?: string }) | null;
  activeTrip: Trip | null;
  messageId?: string | null;
}

const SYSTEM_INSTRUCTION = `Usted es el asistente operativo y copiloto de IA de "Control Tower 360" (Plataforma corporativa de gestión de transporte de cargas y logística).
Su función es clasificar con precisión los mensajes de los conductores y generar una respuesta profesional, concisa, cortés y orientada a la operación logística.
Devuelva un objeto JSON estricto con el esquema indicado. Sin formato markdown ni texto adicional.

Esquema JSON:
{
  "action": "trip_departure" | "trip_arrival" | "loading" | "unloading" | "delay" | "breakdown" | "accident" | "tire_issue" | "fuel_stop" | "document_upload" | "location_share" | "greeting" | "status_query" | "general_message",
  "confidence": 0.0-1.0,
  "priority": "critica" | "alta" | "atencion" | "informativa",
  "requiresIntervention": boolean,
  "responseMessage": "Mensaje breve (máx 150 caracteres), cortés y profesional para el conductor (trato respetuoso, claro y corporativo)",
  "tripUpdate": { "tripId": "<id>", "newStatus": "pending" | "loading" | "en_route" | "arrived" | "unloading" | "delayed" | "completed" | "cancelled", "approvalRequired": false } | null,
  "eta": { "nuevoEta": "HH:MM", "demoraMinutos": number } | null
}

Reglas:
- Tono: Profesional, ejecutivo y cortés (sin modismos informales ni lenguaje coloquial).
- action: "general_message" si no aplica ninguna otra categoría.
- priority: "critica" solo si hay accidente o riesgo para personas; "alta" para averías graves o demoras mayores a 30 minutos.
- requiresIntervention: true solo si la prioridad es "critica" o "alta".
- responseMessage: Siempre presente, breve y profesional confirmando la recepción y la acción tomada.
- tripUpdate: null si no existe un viaje activo para el conductor.`;

function buildUserPrompt(input: InterpretInput): string {
  const driver = input.driver;
  const trip = input.activeTrip;

  const lines: string[] = [];
  lines.push(`Chofer: ${driver?.fullName ?? "desconocido"} (${driver?.phone ?? "s/n"})`);

  if (trip) {
    const tid = trip.id.replace(/^trip-/, "");
    lines.push(`Viaje activo: #${tid} | ${trip.origin} -> ${trip.destination} | estado=${trip.status}`);
  } else {
    lines.push("Viaje activo: ninguno");
  }

  if (input.messageType !== "text") {
    lines.push(`Tipo: ${input.messageType}`);
  }

  const text = (input.text ?? "").trim();
  if (text.length > 0) {
    lines.push(`Mensaje: "${text.slice(0, 300)}"`);
  } else {
    lines.push("Mensaje: (sin texto)");
  }

  return lines.join("\n");
}

function safeParseJson<T>(raw: string): T | null {
  let cleaned = raw.trim();
  // Strip code fences if model leaks them
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}

function validateAndSanitize(parsed: any, ctx: InterpretInput): AiDriverInterpretation {
  const validActions: IntentAction[] = [
    "trip_departure", "trip_arrival", "loading", "unloading", "delay",
    "breakdown", "accident", "tire_issue", "fuel_stop", "document_upload",
    "location_share", "greeting", "status_query", "general_message"
  ];
  const action: IntentAction = validActions.includes(parsed?.action) ? parsed.action : "general_message";

  const priority = ["critica", "alta", "atencion", "informativa"].includes(parsed?.priority)
    ? parsed.priority
    : "informativa";

  const confidence = typeof parsed?.confidence === "number"
    ? Math.max(0, Math.min(1, parsed.confidence))
    : 0.85;

  const requiresIntervention = typeof parsed?.requiresIntervention === "boolean"
    ? parsed.requiresIntervention
    : priority === "critica" || priority === "alta";

  let tripUpdate = undefined as AiDriverInterpretation["tripUpdate"];
  if (parsed?.tripUpdate && typeof parsed.tripUpdate === "object" && ctx.activeTrip) {
    const newStatus = parsed.tripUpdate.newStatus;
    const valid = ["pending", "loading", "en_route", "arrived", "unloading", "delayed", "completed", "cancelled"];
    if (typeof newStatus === "string" && valid.includes(newStatus)) {
      tripUpdate = {
        tripId: ctx.activeTrip.id,
        newStatus,
        approvalRequired: parsed.tripUpdate.approvalRequired === true
      };
    }
  }

  return {
    action,
    confidence,
    priority,
    requiresIntervention,
    responseMessage: typeof parsed?.responseMessage === "string"
      ? parsed.responseMessage.slice(0, 200)
      : defaultResponse(action, ctx),
    tripUpdate,
    eta: parsed?.eta ?? null
  };
}

function defaultResponse(action: IntentAction, ctx: InterpretInput): string {
  const tid = ctx.activeTrip ? `#${ctx.activeTrip.id.replace(/^trip-/, "")}` : "";
  switch (action) {
    case "trip_departure": return `✅ Viaje ${tid} en ruta. Buen viaje.`;
    case "trip_arrival": return `🏁 Llegada registrada en ${tid}.`;
    case "loading": return `📦 Carga registrada para ${tid}.`;
    case "unloading": return `📥 Descarga registrada para ${tid}.`;
    case "delay": return `⏳ Demora registrada en ${tid}.`;
    case "breakdown": return `🔧 Avería reportada. Notificamos a taller.`;
    case "accident": return `🚨 Alerta crítica registrada. Si hay heridos llamá 911/107.`;
    case "location_share": return `📍 Ubicación recibida.`;
    case "document_upload": return `📄 Evidencia recibida.`;
    default: return `Mensaje recibido en Control Tower 360.`;
  }
}

/**
 * Llama al AI Router para interpretar un mensaje. Devuelve null si:
 *   - el router falla completamente (todos los proveedores fallaron)
 *   - el modelo no devuelve JSON válido (se considera fallido)
 *
 * Audit logging: crea un registro en ai_interactions con provider/model/latency/error.
 */
export async function interpretDriverMessageWithAI(input: InterpretInput): Promise<InterpretResult | null> {
  // Si no hay texto ni tipo interpretable, no llamamos a IA.
  const text = (input.text ?? "").trim();
  const hasMedia = input.messageType === "image" || input.messageType === "video" ||
                   input.messageType === "document" || input.messageType === "audio" ||
                   input.messageType === "sticker";
  if (text.length === 0 && !hasMedia) return null;

  const messages = [
    { role: "system" as const, content: SYSTEM_INSTRUCTION },
    { role: "user" as const, content: buildUserPrompt(input) }
  ];

  const t0 = Date.now();
  let response: ChatResponse | null = null;
  try {
    response = await callChat(messages, { temperature: 0.1, jsonMode: true });
  } catch (err) {
    const latencyMs = Date.now() - t0;
    console.warn(`[ai] interpret failed: ${(err as Error).message}`);
    audit(input, response, latencyMs, false, (err as Error).message);
    return null;
  }

  const parsed = safeParseJson<any>(response.text);
  if (!parsed) {
    const latencyMs = Date.now() - t0;
    console.warn(`[ai] interpret JSON inválido: ${response.text.slice(0, 200)}`);
    audit(input, response, latencyMs, false, "json_invalid");
    return null;
  }

  const sanitized = validateAndSanitize(parsed, input);
  const latencyMs = Date.now() - t0;
  audit(input, response, latencyMs, true);

  return {
    interpretation: sanitized,
    provider: response.provider,
    model: response.model,
    latencyMs,
    fallback: response.fallbackFrom
      ? { from: response.fallbackFrom, reason: response.fallbackReason || "unknown" }
      : undefined
  };
}

function audit(
  input: InterpretInput,
  response: ChatResponse | null,
  latencyMs: number,
  success: boolean,
  error?: string
): void {
  const companyId = input.driver?.companyId;
  if (!companyId) return;
  try {
    dbService.createAiInteraction({
      companyId,
      driverId: input.driver?.id,
      tripId: input.activeTrip?.id,
      provider: response?.provider || (config.ai.groq.available ? "groq" : (config.ai.gemini.available ? "gemini" : "none")),
      model: response?.model || (config.ai.groq.available ? config.ai.groq.chatModel : config.ai.gemini.model),
      purpose: "interpret_driver",
      input: JSON.stringify({
        messageType: input.messageType,
        text: (input.text ?? "").slice(0, 200),
        hasDriver: !!input.driver,
        hasTrip: !!input.activeTrip
      }),
      output: response?.text?.slice(0, 500),
      success,
      latencyMs,
      ...(error ? { error } : {})
    });
  } catch (e) {
    console.warn("[audit ai_interaction]", (e as Error).message);
  }
}
