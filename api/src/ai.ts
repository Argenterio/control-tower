// ai.ts - Capa de Inteligencia Artificial de Control Tower 360
// Estrategia: Groq como proveedor primario (rápido, barato, free tier), con Gemini como fallback.
// - Texto/JSON  -> Groq (modelo configurable, default: llama-3.3-70b-versatile)
// - Audio (Whisper) -> Groq Whisper API (whisper-large-v3-turbo). Si n8n ya transcribió, se respeta el transcript.
// - OCR / Visión -> dejamos el slot listo (provider OCR_VISION_PROVIDER, default: groq|gemini). Por ahora stub hasta Fase 2.

import { dbService } from "./database";
import type { Driver, Trip } from "./types";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_TEXT_MODEL = process.env.GROQ_TEXT_MODEL || "groq/compound";
const GROQ_WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || "whisper-large-v3-turbo";

// Cache del modelo Groq disponible. Si el modelo default falla, probamos alternativas y guardamos el primero que funcione.
let resolvedGroqModel: string | null = null;
async function resolveGroqModel(): Promise<string> {
  if (process.env.GROQ_TEXT_MODEL) return process.env.GROQ_TEXT_MODEL;
  if (resolvedGroqModel) return resolvedGroqModel;
  const candidates = [
    "groq/compound",
    "groq/compound-mini",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "qwen/qwen3.6-27b",
    "allam-2-7b"
  ];
  for (const m of candidates) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify({ model: m, messages: [{ role: "user", content: "ok" }], max_tokens: 4 }),
        signal: AbortSignal.timeout(5000)
      });
      if (r.ok) { resolvedGroqModel = m; console.log(`[ai] Groq modelo seleccionado: ${m}`); return m; }
    } catch { /* keep trying */ }
  }
  throw new Error("Ningún modelo Groq disponible para esta API key");
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";

// Tipado de la respuesta estructurada de la IA para interpretación de mensajes de choferes
export type AiDriverInterpretation = {
  action:
    | "trip_departure" | "trip_arrival" | "loading" | "unloading"
    | "delay" | "breakdown" | "accident" | "tire_issue" | "fuel_stop"
    | "document_upload" | "location_share" | "greeting" | "status_query"
    | "general_message";
  confidence: number;
  priority: "critica" | "alta" | "atencion" | "informativa";
  requiresIntervention: boolean;
  responseMessage: string;
  // Cambios sugeridos al viaje (Nivel 1: aplicar automático. Nivel 2: requieren aprobación humana.)
  tripUpdate?: { tripId: string; newStatus: "pending" | "loading" | "en_route" | "arrived" | "unloading" | "delayed" | "completed" | "cancelled"; approvalRequired?: boolean };
  // Evento operacional a registrar (fase 1)
  event?: {
    type: "departure" | "arrival" | "loading" | "unloading" | "delay" | "breakdown" | "accident" | "tire" | "fuel" | "document" | "location" | "eta_update" | "custom";
    category?: string;
    title?: string;
    description?: string;
    metadata?: Record<string, unknown>;
  } | null;
  // Alerta a crear (si priority es critica/alta)
  alert?: {
    title: string;
    message: string;
    entityType?: "trip" | "driver" | "vehicle" | "customer";
    entityLabel?: string;
  } | null;
  // ETA estimada
  eta?: { nuevoEta?: string; demoraMinutos?: number } | null;
};

// === Groq: llamada genérica chat-completions ===
async function callGroqChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options: { model?: string; temperature?: number; maxTokens?: number; jsonMode?: boolean; timeoutMs?: number } = {}
): Promise<string> {
  if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY no configurada");

  const model = options.model || await resolveGroqModel();
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxTokens ?? 1024
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(options.timeoutMs ?? 15000)
  });

  if (!response.ok) {
    const errText = await response.text();
    // Si fue model-not-found, invalidar cache y reintentar una vez con resolución automática
    if (errText.includes("model") && errText.includes("not exist") && !options.model) {
      resolvedGroqModel = null;
      const newModel = await resolveGroqModel();
      body.model = newModel;
      const r2 = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${GROQ_API_KEY}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(options.timeoutMs ?? 15000)
      });
      if (r2.ok) {
        const d2 = await r2.json() as { choices?: Array<{ message?: { content?: string } }> };
        const t = d2.choices?.[0]?.message?.content;
        if (t) return t;
      }
    }
    throw new Error(`Groq ${response.status}: ${errText}`);
  }
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Groq devolvió respuesta vacía");
  return text;
}

// === Gemini: fallback ===
async function callGeminiChat(prompt: string, systemInstruction?: string, temperature = 0.2): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY no configurada");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 1024 }
  };
  if (systemInstruction) body.systemInstruction = { parts: [{ text: systemInstruction }] };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) {
    throw new Error(`Gemini ${response.status}: ${await response.text()}`);
  }
  const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// === Router: Groq primario, Gemini fallback ===
async function callChat(prompt: string, systemInstruction?: string, opts: { temperature?: number; jsonMode?: boolean } = {}): Promise<{ text: string; provider: "groq" | "gemini"; model: string; latencyMs: number }> {
  const t0 = Date.now();
  if (GROQ_API_KEY) {
    try {
      const messages: Array<{ role: "system" | "user"; content: string }> = [];
      if (systemInstruction) messages.push({ role: "system", content: systemInstruction });
      messages.push({ role: "user", content: prompt });
      const text = await callGroqChat(messages, { temperature: opts.temperature, jsonMode: opts.jsonMode });
      return { text, provider: "groq", model: GROQ_TEXT_MODEL, latencyMs: Date.now() - t0 };
    } catch (err) {
      console.warn("[Groq falló, usando Gemini]:", (err as Error).message);
    }
  }
  if (GEMINI_API_KEY) {
    const text = await callGeminiChat(prompt, systemInstruction, opts.temperature);
    return { text, provider: "gemini", model: GEMINI_MODEL, latencyMs: Date.now() - t0 };
  }
  throw new Error("No hay proveedor IA configurado (GROQ_API_KEY ni GEMINI_API_KEY)");
}

// === Whisper (Groq primario, OpenAI fallback) ===
export async function transcribeAudio(audioUrlOrBase64: string, mimeType = "audio/ogg"): Promise<string> {
  if (GROQ_API_KEY) {
    try {
      return await transcribeWithGroq(audioUrlOrBase64, mimeType);
    } catch (err) {
      console.warn("[Groq Whisper falló, usando OpenAI]:", (err as Error).message);
      if (OPENAI_API_KEY) return await transcribeWithOpenAI(audioUrlOrBase64, mimeType);
      throw err;
    }
  }
  if (OPENAI_API_KEY) return await transcribeWithOpenAI(audioUrlOrBase64, mimeType);
  throw new Error("No hay proveedor de transcripción configurado");
}

async function transcribeWithGroq(audioUrlOrBase64: string, mimeType: string): Promise<string> {
  let audioBlob: Blob;
  if (audioUrlOrBase64.startsWith("http")) {
    const r = await fetch(audioUrlOrBase64);
    if (!r.ok) throw new Error(`No se pudo descargar audio: ${r.status}`);
    audioBlob = await r.blob();
  } else {
    const base64 = audioUrlOrBase64.replace(/^data:.*;base64,/, "");
    audioBlob = new Blob([Buffer.from(base64, "base64")], { type: mimeType });
  }

  const form = new FormData();
  form.append("file", audioBlob, `audio.${(mimeType.split("/")[1] || "ogg")}`);
  form.append("model", GROQ_WHISPER_MODEL);
  form.append("language", "es");

  const r = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
    body: form,
    signal: AbortSignal.timeout(25000)
  });
  if (!r.ok) throw new Error(`Groq Whisper ${r.status}: ${await r.text()}`);
  const data = await r.json() as { text?: string };
  if (!data.text) throw new Error("Whisper sin texto");
  return data.text.trim();
}

async function transcribeWithOpenAI(audioUrlOrBase64: string, mimeType: string): Promise<string> {
  let audioBlob: Blob;
  if (audioUrlOrBase64.startsWith("http")) {
    const r = await fetch(audioUrlOrBase64);
    audioBlob = await r.blob();
  } else {
    const base64 = audioUrlOrBase64.replace(/^data:.*;base64,/, "");
    audioBlob = new Blob([Buffer.from(base64, "base64")], { type: mimeType });
  }
  const form = new FormData();
  form.append("file", audioBlob, "audio.ogg");
  form.append("model", "whisper-1");
  form.append("language", "es");
  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: form
  });
  if (!r.ok) throw new Error(`OpenAI Whisper ${r.status}: ${await r.text()}`);
  const data = await r.json() as { text?: string };
  return (data.text || "").trim();
}

// === Prompt del sistema para interpretación de mensajes de choferes ===
const DRIVER_INTERPRETATION_SYSTEM = `Sos el copiloto de IA de "Control Tower 360", centro de control operativo, flota y comunicación inteligente para empresas de transporte de cargas en Argentina.
Tu tarea es analizar el mensaje en español rioplatense (voseo) que un chofer envía por WhatsApp e identificar QUÉ PASÓ OPERATIVAMENTE.

Devolvé ÚNICAMENTE un objeto JSON válido (sin markdown, sin explicaciones, sin bloques \`\`\`).

Esquema exacto:
{
  "action": "trip_departure" | "trip_arrival" | "loading" | "unloading" | "delay" | "breakdown" | "accident" | "tire_issue" | "fuel_stop" | "document_upload" | "location_share" | "greeting" | "status_query" | "general_message",
  "confidence": 0.0 a 1.0,
  "priority": "critica" | "alta" | "atencion" | "informativa",
  "requiresIntervention": boolean,
  "responseMessage": "Mensaje para devolverle al chofer por WhatsApp (voseo argentino, breve, empático)",
  "event": {
    "type": "departure" | "arrival" | "loading" | "unloading" | "delay" | "breakdown" | "accident" | "tire" | "fuel" | "document" | "location" | "eta_update" | "custom",
    "category": "vehicle" | "trip" | "driver" | "cargo" | "customer" | null,
    "title": "Título corto del evento",
    "description": "Descripción en una línea",
    "metadata": { "demoraMinutos": number, "nuevoEta": "HH:MM", "ubicacion": "string", "causa": "string" } | null
  } | null,
  "alert": {
    "title": "Título de la alerta",
    "message": "Detalle para el operador",
    "entityType": "trip" | "driver" | "vehicle" | "customer",
    "entityLabel": "Etiqueta legible (#4821, AA123BB, etc.)"
  } | null,
  "tripUpdate": {
    "tripId": "<id del viaje activo>",
    "newStatus": "pending" | "loading" | "en_route" | "arrived" | "unloading" | "delayed" | "completed" | "cancelled",
    "approvalRequired": boolean
  } | null,
  "eta": { "nuevoEta": "HH:MM", "demoraMinutos": number } | null
}

Reglas:
- priority: "critica" si hay accidente/heridos/siniestro. "alta" si hay rotura grave, pinchadura, demora > 30 min. "atencion" si hay demora leve, desvío, ticket combustible. "informativa" si es saludo, confirmación de salida/llegada, estado normal.
- requiresIntervention: true solo si la prioridad es critica/alta y el operador debe actuar.
- tripUpdate.approvalRequired: true para cancelar viaje, modificar destino, cerrar incidente. false para cambios operativos normales (status: en_route, arrived, delayed).
- Si no podés inferir el evento, devolvé event = null y alert = null.
- responseMessage debe ser corto y amable.`;

export type InterpretResult = {
  interpretation: AiDriverInterpretation | null;
  provider: string;
  model: string;
  latencyMs: number;
};

/**
 * Interpreta el mensaje de un chofer. Devuelve:
 *  - interpretation estructurada (json validado)
 *  - provider / model / latency para auditoría
 *  - null si la IA falló (queda el fallback de reglas)
 */
export async function interpretDriverMessageWithAI(
  rawText: string,
  driver: (Driver & { companyName?: string }) | null,
  activeTrip: Trip | null
): Promise<InterpretResult | null> {
  if (!rawText || rawText.trim().length < 2) return null;

  const tripContext = activeTrip
    ? `Viaje Activo: id=${activeTrip.id}, origen=${activeTrip.origin}, destino=${activeTrip.destination}, estado=${activeTrip.status}`
    : "Sin viaje activo";

  const userPrompt = `Chofer: ${driver ? driver.fullName : "Desconocido"} (${driver?.phone || "s/n"})
Empresa: ${driver?.companyName || "Transporte"}
${tripContext}

Mensaje del chofer:
"${rawText}"`;

  const t0 = Date.now();
  try {
    const { text, provider, model } = await callChat(userPrompt, DRIVER_INTERPRETATION_SYSTEM, {
      temperature: 0.1,
      jsonMode: true
    });

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean) as AiDriverInterpretation;

    // Saneamiento de campos críticos
    if (typeof parsed.confidence !== "number") parsed.confidence = 0.8;
    if (!parsed.priority) parsed.priority = "informativa";
    if (typeof parsed.requiresIntervention !== "boolean") parsed.requiresIntervention = parsed.priority === "critica" || parsed.priority === "alta";
    if (!parsed.action) parsed.action = "general_message";
    if (!parsed.responseMessage) parsed.responseMessage = "Mensaje recibido y registrado en Control Tower 360.";

    // Si hay viaje activo y la IA sugiere tripUpdate, inyectar tripId si no lo puso
    if (parsed.tripUpdate && activeTrip && !parsed.tripUpdate.tripId) {
      parsed.tripUpdate.tripId = activeTrip.id;
    }

    // Si no puso event pero la action es clara, autoderivar
    if (!parsed.event && activeTrip) {
      const map: Record<string, AiDriverInterpretation["event"]> = {
        trip_departure: { type: "departure", title: "Salida confirmada", description: rawText },
        trip_arrival: { type: "arrival", title: "Llegada confirmada", description: rawText },
        loading: { type: "loading", title: "Inicio de carga", description: rawText },
        unloading: { type: "unloading", title: "Inicio de descarga", description: rawText },
        delay: { type: "delay", title: "Demora reportada", description: rawText, metadata: { demoraMinutos: parsed.eta?.demoraMinutos } },
        breakdown: { type: "breakdown", title: "Avería reportada", description: rawText, category: "vehicle" },
        accident: { type: "accident", title: "Accidente reportado", description: rawText, category: "vehicle" },
        tire_issue: { type: "tire", title: "Problema de neumático", description: rawText, category: "vehicle" },
        fuel_stop: { type: "fuel", title: "Parada de combustible", description: rawText },
        document_upload: { type: "document", title: "Evidencia/documento recibido", description: rawText },
        location_share: { type: "location", title: "Ubicación compartida", description: rawText }
      };
      parsed.event = map[parsed.action] || null;
    }

    // Auditoría
    if (driver?.companyId) {
      try {
        dbService.createAiInteraction({
          companyId: driver.companyId,
          driverId: driver.id,
          tripId: activeTrip?.id,
          provider,
          model,
          purpose: "interpret_driver",
          input: userPrompt,
          output: text,
          parsedJson: JSON.stringify(parsed),
          confidence: parsed.confidence,
          latencyMs: Date.now() - t0,
          success: true
        });
      } catch (e) {
        console.warn("[audit ai_interaction]", (e as Error).message);
      }
    }

    return { interpretation: parsed, provider, model, latencyMs: Date.now() - t0 };
  } catch (err) {
    // Registrar fallo
    if (driver?.companyId) {
      try {
        dbService.createAiInteraction({
          companyId: driver.companyId,
          driverId: driver.id,
          tripId: activeTrip?.id,
          provider: GROQ_API_KEY ? "groq" : (GEMINI_API_KEY ? "gemini" : "none"),
          model: GROQ_API_KEY ? GROQ_TEXT_MODEL : GEMINI_MODEL,
          purpose: "interpret_driver",
          input: userPrompt,
          success: false,
          error: (err as Error).message,
          latencyMs: Date.now() - t0
        });
      } catch {}
    }
    console.warn("[interpretDriverMessageWithAI] Falló, usando parser determinístico:", (err as Error).message);
    return null;
  }
}

/**
 * Asistente de IA para la consola web (Copiloto Operativo)
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

  const systemInstruction = `Sos "Control Tower 360 Copilot", asistente de IA para despachantes y directores de empresas de transporte de carga en Argentina.
Respondé en español claro, profesional y directo. Usá viñetas cuando enumeres viajes o unidades. Si te preguntan "¿qué requiere atención?", destacá las alertas de prioridad CRÍTICA y ALTA que estén abiertas.`;

  const contextData = {
    resumen: summary.totals,
    requiereAtencion: summary.requiresAttention.slice(0, 5),
    viajesActivos: trips.filter(t => t.status !== "completed" && t.status !== "cancelled").slice(0, 10).map(t => ({
      id: t.id,
      origen: t.origin,
      destino: t.destination,
      estado: t.status
    })),
    incidentesRecientes: incidents.slice(0, 5).map(i => ({ tipo: i.type, descripcion: i.description, estado: i.status, fecha: i.occurredAt })),
    documentosPorVencer: documents.filter(d => d.status === "expired").slice(0, 5).map(d => ({ tipo: d.type, titulo: d.title, vencimiento: d.expiryDate, entidad: d.vehiclePlate || d.driverName || "Empresa" })),
    combustibleReciente: fuel.slice(0, 5).map(f => ({ unidad: f.licensePlate, litros: f.liters, total: f.totalAmount, consumo: f.consumptionLPer100Km }))
  };

  const prompt = `Datos en tiempo real de la flota (JSON):
${JSON.stringify(contextData, null, 2)}

Pregunta del operador:
"${userQuestion}"`;

  try {
    const { text, provider, model, latencyMs } = await callChat(prompt, systemInstruction, { temperature: 0.3 });
    dbService.createAiInteraction({
      companyId, provider, model, purpose: "ask_copilot",
      input: prompt, output: text, success: true, latencyMs
    });
    return { answer: text, sources: contextData };
  } catch (err) {
    const msg = (err as Error).message;
    return {
      answer: `⚠️ No pude consultar al copiloto IA (${msg}). Verificá que GROQ_API_KEY o GEMINI_API_KEY estén configuradas.`,
      sources: null
    };
  }
}

/**
 * Resumen ejecutivo de la operación (para el header "Resumen IA de la Torre")
 */
export async function summarizeOperation(companyId: string): Promise<{
  totals: { activeTrips: number; normalTrips: number; delayedTrips: number; incidentTrips: number; criticalOpen: number; messagesToday: number; driversActiveToday: number };
  requiresAttention: unknown[];
  narrative: string;
}> {
  const summary = dbService.getOperationSummary(companyId);
  const { totals, requiresAttention } = summary;

  const prompt = `Generá un párrafo ejecutivo en español (máximo 4 líneas, voseo argentino, tono profesional) que resuma la operación de transporte con estos números:
- Viajes activos: ${totals.activeTrips}
- Operan normalmente: ${totals.normalTrips}
- Con demora: ${totals.delayedTrips}
- Con incidentes: ${totals.incidentTrips}
- Alertas críticas/altas abiertas: ${totals.criticalOpen}
- Mensajes de choferes en las últimas 24h: ${totals.messagesToday}
- Choferes activos reportando: ${totals.driversActiveToday}

Empezá con una frase de estado general.`;

  let narrative = `${totals.activeTrips} viajes activos. ${totals.normalTrips} operan normalmente. ${totals.delayedTrips} con demoras. ${totals.incidentTrips} con incidentes. ${totals.criticalOpen} alertas críticas/altas abiertas.`;
  try {
    const { text } = await callChat(prompt, "Sos el copiloto de Control Tower 360.", { temperature: 0.4 });
    narrative = text.trim();
  } catch {
    // mantener narrativa por defecto
  }

  return { totals, requiresAttention, narrative };
}
