// ai/providers/groq.ts — Implementación del proveedor Groq (OpenAI-compatible).
// Solo router.ts puede llamar a este módulo.

import { config } from "../../config/env";
import type { ChatMessage, ChatOptions } from "../router";

export class GroqError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: string) {
    super(message);
    this.name = "GroqError";
  }
}

export interface GroqResult {
  text: string;
  model: string;
}

const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function callGroq(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<GroqResult> {
  const model = options.model ?? config.ai.groq.chatModel;
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: options.temperature ?? 0.2,
    max_tokens: options.maxOutputTokens ?? config.ai.maxOutputTokens
  };
  if (options.jsonMode) body.response_format = { type: "json_object" };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), config.ai.timeoutMs);

  try {
    const res = await fetch(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.groq.apiKey}`
      },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new GroqError(res.status, `Groq ${res.status}: ${errBody.slice(0, 200)}`, errBody);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text) throw new GroqError(502, "Groq devolvió respuesta vacía");
    return { text, model };
  } finally {
    clearTimeout(timeout);
  }
}

export function isGroqRetryable(err: unknown): boolean {
  if (!(err instanceof GroqError)) return false;
  // 5xx y timeouts sí reintentan.
  // 429 NO se reintenta: saltamos directo al fallback.
  // 401/403/404 NO se reintentan.
  if (err.status === 429) return false;
  if (err.status === 401 || err.status === 403 || err.status === 404) return false;
  if (err.status >= 500) return true;
  return false;
}
