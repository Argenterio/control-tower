// ai.ts — Capa de compatibilidad. Toda la lógica vive en src/ai/.
// Este archivo se mantiene para que imports antiguos (`./ai`) sigan funcionando.

export { callChat, AIRouterError } from "./ai/router";
export type { ChatMessage, ChatOptions, ChatResponse } from "./ai/router";

export { interpretDriverMessageWithAI } from "./ai/interpret";
export type { InterpretResult, AiDriverInterpretation, IntentAction } from "./ai/interpret";

export { transcribeAudio } from "./whatsapp/media";
export { transcribeWithGroqWhisper as _transcribeWithGroqWhisper } from "./ai/providers/groqWhisper";
export { transcribeWithOpenAI as _transcribeWithOpenAI } from "./ai/providers/openai";

import { dbService } from "./database";
import { callChat } from "./ai/router";

/**
 * Asistente de IA para la consola web (Copiloto Operativo).
 * Usa el AI Router.
 */
export async function askFleetAssistant(
  companyId: string,
  userQuestion: string
): Promise<{ answer: string; sources?: unknown }> {
  const vehicles = dbService.getVehicles(companyId);
  const trips = dbService.getTrips(companyId);
  const incidents = dbService.getIncidents(companyId);
  const maintenance = dbService.getMaintenance(companyId);
  const fuel = dbService.getFuelEntries(companyId);
  const documents = dbService.getDocuments(companyId);
  const summary = dbService.getOperationSummary(companyId);

  const systemInstruction = `Usted es el Copiloto Operativo de "Control Tower 360", plataforma corporativa de transporte de carga y logística. Responda en español profesional, preciso, claro y respetuoso. Si le consultan qué requiere atención, detalle las alertas críticas y de prioridad alta pendientes.`;

  const contextData = {
    resumen: summary.totals,
    requiereAtencion: (summary.requiresAttention ?? []).slice(0, 5),
    viajesActivos: trips.filter((t) => t.status !== "completed" && t.status !== "cancelled").slice(0, 10).map((t) => ({
      id: t.id, origen: t.origin, destino: t.destination, estado: t.status
    })),
    incidentesRecientes: incidents.slice(0, 5).map((i) => ({ tipo: i.type, descripcion: i.description, estado: i.status, fecha: i.occurredAt })),
    documentosPorVencer: documents.filter((d) => d.status === "expired").slice(0, 5).map((d) => ({
      tipo: d.type, titulo: d.title, vencimiento: d.expiryDate, entidad: d.vehiclePlate || d.driverName || "Empresa"
    })),
    combustibleReciente: fuel.slice(0, 5).map((f) => ({ unidad: f.licensePlate, litros: f.liters, total: f.totalAmount, consumo: f.consumptionLPer100Km }))
  };

  const messages = [
    { role: "system" as const, content: systemInstruction },
    {
      role: "user" as const,
      content: `Datos (JSON):\n${JSON.stringify(contextData)}\n\nPregunta: "${userQuestion.slice(0, 500)}"`
    }
  ];

  try {
    const r = await callChat(messages, { temperature: 0.3 });
    dbService.createAiInteraction({
      companyId,
      provider: r.provider,
      model: r.model,
      purpose: "ask_copilot",
      input: userQuestion.slice(0, 500),
      output: r.text.slice(0, 500),
      success: true,
      latencyMs: r.latencyMs
    });
    return { answer: r.text, sources: contextData };
  } catch (err) {
    const msg = (err as Error).message;
    return {
      answer: `⚠️ No fue posible consultar al asistente IA (${msg}). Verifique las credenciales de GROQ_API_KEY y/o GEMINI_API_KEY.`,
      sources: null
    };
  }
}

/**
 * Resumen ejecutivo de la operación. Prompt compacto.
 */
export async function summarizeOperation(companyId: string): Promise<{
  totals: {
    activeTrips: number;
    normalTrips: number;
    delayedTrips: number;
    incidentTrips: number;
    criticalOpen: number;
    messagesToday: number;
    driversActiveToday: number;
  };
  requiresAttention: unknown[];
  narrative: string;
}> {
  const summary = dbService.getOperationSummary(companyId);
  const { totals, requiresAttention } = summary;

  const narrative_default = `${totals.activeTrips} viajes activos. ${totals.normalTrips} normales. ${totals.delayedTrips} con demoras. ${totals.incidentTrips} con incidentes. ${totals.criticalOpen} alertas críticas/altas abiertas.`;

  const messages = [
    { role: "system" as const, content: "Usted es el asistente ejecutivo de Control Tower 360." },
    {
      role: "user" as const,
      content: `Genere un resumen ejecutivo profesional y conciso en español formal (máximo 3 líneas) sintetizando los siguientes indicadores: activos=${totals.activeTrips}, normales=${totals.normalTrips}, demoras=${totals.delayedTrips}, incidentes=${totals.incidentTrips}, alertas=${totals.criticalOpen}, mensajes_hoy=${totals.messagesToday}, conductores_hoy=${totals.driversActiveToday}.`
    }
  ];

  let narrative = narrative_default;
  try {
    const r = await callChat(messages, { temperature: 0.4, maxOutputTokens: 200 });
    narrative = r.text.trim() || narrative_default;
  } catch {
    /* mantener default */
  }

  return { totals, requiresAttention, narrative };
}
