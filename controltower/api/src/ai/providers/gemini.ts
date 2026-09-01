// ai/providers/gemini.ts — Implementación del proveedor Gemini (Google AI Studio).
// Solo router.ts puede llamar a este módulo.

import { config } from "../../config/env";
import type { ChatMessage, ChatOptions } from "../router";

export class GeminiError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: string) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface GeminiResult {
  text: string;
  model: string;
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export async function callGemini(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<GeminiResult> {
  const model = options.model ?? config.ai.gemini.model;
  const systemParts: string[] = [];
  const userParts: string[] = [];

  for (const m of messages) {
    if (m.role === "system") systemParts.push(m.content);
    else if (m.role === "user") userParts.push(m.content);
    else if (m.role === "assistant") userParts.push(m.content); // Gemini no distingue assistant; los unimos.
  }

  const body: Record<string, unknown> = {
    contents: [{ role: "user", parts: [{ text: userParts.join("\n\n") || " " }] }],
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? config.ai.maxOutputTokens
    }
  };
  if (systemParts.length > 0) {
    body.systemInstruction = { parts: systemParts.map((t) => ({ text: t })) };
  }
  if (options.jsonMode) {
    (body.generationConfig as Record<string, unknown>).responseMimeType = "application/json";
  }

  const url = `${GEMINI_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(config.ai.gemini.apiKey)}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new GeminiError(res.status, `Gemini ${res.status}: ${errBody.slice(0, 200)}`, errBody);
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    if (!text) throw new GeminiError(502, "Gemini devolvió respuesta vacía");
    return { text, model };
  } finally {
    clearTimeout(timeout);
  }
}

export function isGeminiRetryable(err: unknown): boolean {
  if (!(err instanceof GeminiError)) return false;
  if (err.status === 429) return false;
  if (err.status === 401 || err.status === 403 || err.status === 404) return false;
  if (err.status >= 500) return true;
  return false;
}
