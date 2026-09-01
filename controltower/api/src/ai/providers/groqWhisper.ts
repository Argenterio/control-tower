// ai/providers/groqWhisper.ts — Groq Whisper API. NO comparte conexión con chat Groq
// (distinto endpoint, distinto timeout, distinta autorización funcional).
import { config } from "../../config/env";
import { OpenAIError } from "./openai";

export class GroqWhisperError extends Error {
  constructor(public readonly status: number, message: string, public readonly body?: string) {
    super(message);
    this.name = "GroqWhisperError";
  }
}

export interface WhisperResult {
  text: string;
  language?: string;
}

export async function transcribeWithGroqWhisper(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<WhisperResult> {
  if (!config.ai.groq.available) {
    throw new OpenAIError(503, "GROQ_API_KEY no configurada");
  }
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new GroqWhisperError(400, "Audio inválido: buffer vacío");
  }

  const blob = new Blob([buffer], { type: mimeType });
  const form = new FormData();
  form.append("file", blob, filename);
  form.append("model", config.ai.groq.whisperModel);
  form.append("language", "es");

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), config.ai.timeoutMs * 2);

  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.ai.groq.apiKey}` },
      body: form,
      signal: ctrl.signal
    });
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new GroqWhisperError(res.status, `Groq Whisper ${res.status}: ${errBody.slice(0, 200)}`, errBody);
    }
    const data = (await res.json()) as { text?: string; language?: string };
    if (!data.text) throw new GroqWhisperError(502, "Whisper sin texto");
    return { text: data.text.trim(), language: data.language };
  } finally {
    clearTimeout(timeout);
  }
}
