// ai/providers/openai.ts — Proveedor OpenAI (Whisper API + chat opcional futuro).

import { config } from "../../config/env";

export class OpenAIError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: string) {
    super(message);
    this.name = "OpenAIError";
  }
}

export interface WhisperResult {
  text: string;
  language?: string;
}

/**
 * Llama a OpenAI Whisper. Recibe Buffer + filename + mime; NUNCA un objeto JS.
 */
export async function transcribeWithOpenAI(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<WhisperResult> {
  if (!config.ai.openai.available) {
    throw new OpenAIError(503, "OPENAI_API_KEY no configurada");
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new OpenAIError(400, "Audio inválido: buffer vacío");
  }

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", config.ai.openai.whisperModel);
  form.append("language", "es");

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), config.ai.timeoutMs * 2);

  try {
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.ai.openai.apiKey}` },
      body: form,
      signal: ctrl.signal
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new OpenAIError(res.status, `OpenAI Whisper ${res.status}: ${errBody.slice(0, 200)}`, errBody);
    }

    const data = (await res.json()) as { text?: string; language?: string };
    if (!data.text) throw new OpenAIError(502, "Whisper sin texto");
    return { text: data.text.trim(), language: data.language };
  } finally {
    clearTimeout(timeout);
  }
}
