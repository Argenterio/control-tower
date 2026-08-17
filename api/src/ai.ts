// ai.ts - Integración IA para Control Tower (Groq free / Google Gemini fallback)
// Procesa lenguaje natural de choferes por WhatsApp y asistente operativo para la consola de tráfico

import { dbService } from "./database";
import type { Driver, Trip, MessageInterpretation } from "./types";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "groq/compound";

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
    code?: number;
  };
}

/**
 * Llamada genérica a la API REST de Groq (OpenAI-compatible)
 */
async function callGroq(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<string> {
  const url = "https://api.groq.com/openai/v1/chat/completions";

  const messages: any[] = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body = {
    model: GROQ_MODEL,
    messages,
    temperature,
    max_tokens: 1024
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Groq API Warning] Status ${response.status}:`, errText);
      throw new Error(`Groq API error: ${response.statusText}`);
    }

    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new Error("Groq returned empty response");
    return text;
  } catch (err: any) {
    console.error("[Groq Error]:", err.message);
    throw err;
  }
}

/**
 * Llamada genérica a la API REST de Google Gemini
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string,
  temperature: number = 0.2
): Promise<string> {
  // Si hay GROQ_API_KEY, usamos Groq como proveedor principal (plan free)
  if (GROQ_API_KEY) {
    try {
      return await callGroq(prompt, systemInstruction, temperature);
    } catch (err: any) {
      console.warn("[Groq fallback to Gemini]:", err.message);
      if (!GEMINI_API_KEY) throw err;
    }
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature,
      maxOutputTokens: 1024,
    }
  };

  if (systemInstruction) {
    body.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(6000) // Timeout rápido de 6 segundos
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`[Gemini API Warning] Status ${response.status}:`, errText);
      // Fallback a otro modelo si el principal no está disponible
      if (GEMINI_MODEL !== "gemini-3.6-flash") {
        return callGeminiFallback(prompt, systemInstruction, temperature);
      }
      throw new Error(`Gemini API error: ${response.statusText}`);
    }

    const data = (await response.json()) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response");
    return text;
  } catch (err: any) {
    console.error("[Gemini Error]:", err.message);
    throw err;
  }
}

async function callGeminiFallback(prompt: string, systemInstruction?: string, temperature: number = 0.2): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens: 1024 }
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(6000)
  });
  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini fallback returned empty response");
  return text;
}

/**
 * 1. Interpretación Inteligente de Mensajes de Choferes por WhatsApp
 */
export async function interpretDriverMessageWithAI(
  rawText: string,
  driver: (Driver & { companyName?: string }) | null,
  activeTrip: Trip | null
): Promise<MessageInterpretation | null> {
  const systemInstruction = `Sos el copiloto de Inteligencia Artificial de "Control Tower", un sistema de gestión y monitoreo logístico de transporte de cargas en Argentina.
Tu trabajo es analizar el mensaje que envía un chofer por WhatsApp, determinar la intención/acción logística exacta y generar una respuesta empática, profesional, clara y concisa en español argentino (usá voseo amigable: "Manejá con cuidado", "Ya avisamos a base", etc.).

Acciones posibles:
- "trip_departure": Avisa que salió, arrancó, viaja o está en ruta hacia el destino.
- "trip_arrival": Avisa que llegó a destino o planta.
- "loading_start": Avisa que está cargando mercadería.
- "unloading_start": Avisa que está descargando mercadería.
- "delay": Avisa demora, tránsito pesado, corte de ruta, piquete, espera en aduana o planta.
- "breakdown": Reporta avería mecánica, pinchadura, rotura, desperfecto de motor o camión.
- "accident": Reporta siniestro, choque o emergencia.
- "fuel_stop": Avisa parada a cargar combustible o envía ticket.
- "status_query": Pregunta por su próximo viaje, itinerario o instrucciones.
- "general_message": Cualquier otro saludo o mensaje general.

Respondé ÚNICAMENTE un objeto JSON válido con el siguiente esquema exacto (sin markdown ni explicaciones):
{
  "action": "trip_departure" | "trip_arrival" | "loading_start" | "unloading_start" | "delay" | "breakdown" | "accident" | "fuel_stop" | "status_query" | "general_message",
  "confidence": 0.95,
  "responseMessage": "Texto de respuesta para enviarle por WhatsApp al chofer",
  "incidentType": "delay" | "breakdown" | "accident" | null,
  "incidentDescription": "Resumen claro del incidente para tráfico si corresponde" | null,
  "newStatus": "en_route" | "arrived" | "loading" | "unloading" | "delayed" | null
}`;

  const contextPrompt = `Contexto del Chofer:
- Nombre: ${driver ? driver.fullName : "Chofer no registrado"}
- Teléfono: ${driver ? driver.phone : "Desconocido"}
- Empresa: ${driver?.companyName || "Transporte"}
- Viaje Activo: ${
    activeTrip
      ? `ID: #${activeTrip.id.replace("trip-", "")}, Origen: ${activeTrip.origin}, Destino: ${activeTrip.destination}, Estado actual: ${activeTrip.status}`
      : "Sin viaje activo en curso"
  }

Mensaje del chofer: "${rawText}"`;

  try {
    const rawResult = await callGemini(contextPrompt, systemInstruction, 0.1);
    // Limpiar posibles bloques ```json ``` de la respuesta
    const cleanJson = rawResult.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const interpretation: MessageInterpretation = {
      action: parsed.action || "general_message",
      confidence: parsed.confidence || 0.9,
      responseMessage: parsed.responseMessage || "Mensaje recibido y registrado en Control Tower."
    };

    if (parsed.incidentType && activeTrip) {
      interpretation.incident = {
        type: parsed.incidentType,
        description: parsed.incidentDescription || rawText
      };
    }

    if (parsed.newStatus && activeTrip) {
      interpretation.tripUpdate = {
        tripId: activeTrip.id,
        newStatus: parsed.newStatus
      };
    }

    return interpretation;
  } catch (err: any) {
    console.warn("[AI WhatsApp Interpretation Fallback]:", err.message);
    return null; // Fallback al parser tradicional si la IA falla
  }
}

/**
 * 2. Asistente Operativo Copilot de la Flota para la Consola Web
 */
export async function askFleetAssistant(
  companyId: string,
  userQuestion: string
): Promise<{ answer: string; sources?: any }> {
  // Cargar estado de la base de datos para darle contexto rico a Gemini
  const vehicles = dbService.getVehicles(companyId);
  const trips = dbService.getTrips(companyId);
  const activeTrips = trips.filter((t: any) => t.status !== "completed" && t.status !== "cancelled");
  const incidents = dbService.getIncidents(companyId);
  const maintenance = dbService.getMaintenance(companyId);
  const fuel = dbService.getFuelEntries(companyId);
  const documents = dbService.getDocuments(companyId);

  const systemInstruction = `Sos "Control Tower AI Copilot", el asistente inteligente para los despachantes y directores de empresas de transporte de carga en Argentina.
Tenés acceso en tiempo real a todos los datos de la flota de la empresa: camiones, choferes, viajes activos, alertas, combustible, órdenes de taller y vencimientos legales.

Respondé en español claro, profesional, directo y al grano. Usá viñetas y formato Markdown legible cuando enumeres unidades o viajes. Si te piden un resumen, destacá prioridades operativas (incidentes, demoras, documentos por vencer).`;

  const contextData = {
    resumenFlota: {
      totalCamiones: vehicles.length,
      camionesEnViaje: vehicles.filter((v: any) => v.status === "in_transit" || v.status === "active").length,
      camionesEnTaller: vehicles.filter((v: any) => v.status === "maintenance").length,
      camionesDisponibles: vehicles.filter((v: any) => v.status === "available").length
    },
    viajesActivos: activeTrips.map((t: any) => ({
      id: t.id,
      origen: t.origin,
      destino: t.destination,
      estado: t.status,
      distanciaKm: t.distanceKm
    })),
    incidentesRecientes: incidents.slice(0, 5).map((inc: any) => ({
      tipo: inc.type,
      descripcion: inc.description,
      estado: inc.status,
      fecha: inc.occurredAt
    })),
    documentosPorVencerOVencidos: documents.filter((d: any) => d.status === "expired" || d.status === "expiring").map((d: any) => ({
      tipo: d.type,
      titulo: d.title,
      vencimiento: d.expiryDate,
      entidad: d.vehiclePlate || d.driverName || "Empresa"
    })),
    ultimoGastoCombustible: fuel.slice(0, 5).map((f: any) => ({
      unidad: f.licensePlate,
      litros: f.liters,
      estacion: f.station,
      total: f.totalAmount,
      consumo: f.consumptionLPer100Km
    }))
  };

  const prompt = `Datos en tiempo real de la flota:
\`\`\`json
${JSON.stringify(contextData, null, 2)}
\`\`\`

Pregunta del operador de tráfico:
"${userQuestion}"`;

  try {
    const answer = await callGemini(prompt, systemInstruction, 0.3);
    return { answer, sources: contextData };
  } catch (err: any) {
    console.error("[Fleet Assistant error]:", err.message);
    return {
      answer: `⚠️ No pude procesar la consulta con la IA en este momento (${err.message}). Por favor verificá que la clave del proveedor IA (GROQ_API_KEY o GEMINI_API_KEY) esté configurada en las variables de entorno.`,
      sources: null
    };
  }
}
