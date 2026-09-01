// ai/router.ts — Punto ÚNICO de entrada para llamadas de IA.
// Ningún módulo debe llamar a Groq/Gemini/OpenAI directamente. Solo `callChat()`.
//
// Estrategia de fallback:
//   primary (config.ai.primary) → si falla → fallback → si falla → error controlado
//
// Reglas:
// - 429 (rate limit)   → NO reintentar; cambiar de proveedor
// - 401/403 (auth)     → NO reintentar; cambiar de proveedor
// - 404 (model)        → NO reintentar; cambiar de proveedor
// - 5xx / timeout      → retry controlado (maxRetries), luego fallback
// - 4xx genérico       → cambiar de proveedor
//
// Logueamos: provider, model, status, latencyMs, fallback reason.

import { config } from "../config/env";
import { callGroq, GroqError, isGroqRetryable } from "./providers/groq";
import { callGemini, GeminiError, isGeminiRetryable } from "./providers/gemini";

export type AIProviderName = "groq" | "gemini" | "openai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
  /** Override del proveedor primario (útil para tests). */
  forceProvider?: AIProviderName;
}

export interface ChatResponse {
  text: string;
  provider: AIProviderName;
  model: string;
  latencyMs: number;
  /** Si fue un fallback, cuál era el proveedor original. */
  fallbackFrom?: AIProviderName;
  fallbackReason?: string;
}

export class AIRouterError extends Error {
  constructor(public readonly causes: Array<{ provider: AIProviderName; reason: string }>) {
    super(`AI Router falló: ${causes.map((c) => `${c.provider}:${c.reason}`).join(" | ")}`);
    this.name = "AIRouterError";
  }
}

interface ProviderAttempt {
  provider: AIProviderName;
  ok: boolean;
  text?: string;
  model?: string;
  latencyMs?: number;
  reason?: string;
}

/**
 * Router principal. Devuelve SIEMPRE un objeto ChatResponse o lanza AIRouterError.
 */
export async function callChat(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<ChatResponse> {
  const requested = options.forceProvider ?? config.ai.primary;
  const order = buildProviderOrder(requested);

  const attempts: ProviderAttempt[] = [];

  for (const provider of order) {
    const avail = isProviderAvailable(provider);
    if (!avail) {
      attempts.push({ provider, ok: false, reason: "not_configured" });
      continue;
    }

    const t0 = Date.now();
    try {
      const result = await callProviderWithRetry(provider, messages, options);
      const latencyMs = Date.now() - t0;
      attempts.push({
        provider,
        ok: true,
        text: result.text,
        model: result.model,
        latencyMs
      });
      logSuccess(provider, result.model, latencyMs, attempts);
      return {
        text: result.text,
        provider,
        model: result.model,
        latencyMs,
        fallbackFrom: provider !== requested ? requested : undefined,
        fallbackReason: attempts.length > 1 ? attempts[attempts.length - 2].reason : undefined
      };
    } catch (err) {
      const latencyMs = Date.now() - t0;
      const reason = classifyError(err);
      attempts.push({ provider, ok: false, reason, latencyMs });
      logFallback(provider, requested, reason, latencyMs);
      // continuar con el siguiente proveedor
    }
  }

  throw new AIRouterError(attempts.map((a) => ({ provider: a.provider, reason: a.reason || "unknown" })));
}

function buildProviderOrder(requested: AIProviderName): AIProviderName[] {
  const order: AIProviderName[] = [requested];
  if (config.ai.fallback && config.ai.fallback !== requested) {
    order.push(config.ai.fallback);
  }
  // Si el primario es groq/gemini y ninguno fue fallback, agregamos el otro como último recurso.
  if (order.length < 2) {
    if (requested === "groq") order.push("gemini");
    else order.push("groq");
  }
  return order;
}

function isProviderAvailable(p: AIProviderName): boolean {
  if (p === "groq") return config.ai.groq.available;
  if (p === "gemini") return config.ai.gemini.available;
  if (p === "openai") return config.ai.openai.available;
  return false;
}

async function callProviderWithRetry(
  provider: AIProviderName,
  messages: ChatMessage[],
  options: ChatOptions
): Promise<{ text: string; model: string }> {
  let lastErr: unknown;
  const maxAttempts = Math.max(1, config.ai.maxRetries);
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (provider === "groq") {
        const r = await callGroq(messages, options);
        return { text: r.text, model: r.model };
      }
      if (provider === "gemini") {
        const r = await callGemini(messages, options);
        return { text: r.text, model: r.model };
      }
      throw new AIRouterError([{ provider, reason: "unsupported_provider" }]);
    } catch (err) {
      lastErr = err;
      const retryable =
        (provider === "groq" && isGroqRetryable(err)) ||
        (provider === "gemini" && isGeminiRetryable(err));
      if (!retryable || attempt === maxAttempts) {
        throw err;
      }
      // backoff exponencial: 250ms, 500ms, 1000ms…
      const delay = 250 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

function classifyError(err: unknown): string {
  if (err instanceof GroqError) {
    if (err.status === 429) return "429_rate_limit";
    if (err.status === 401 || err.status === 403) return `${err.status}_auth`;
    if (err.status === 404) return "404_model";
    if (err.status >= 500) return `${err.status}_server`;
    return `${err.status}_error`;
  }
  if (err instanceof GeminiError) {
    if (err.status === 429) return "429_rate_limit";
    if (err.status === 401 || err.status === 403) return `${err.status}_auth`;
    if (err.status === 404) return "404_model";
    if (err.status >= 500) return `${err.status}_server`;
    return `${err.status}_error`;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError" || err.message.toLowerCase().includes("timeout")) return "timeout";
    return err.message.slice(0, 80);
  }
  return "unknown";
}

function logSuccess(provider: AIProviderName, model: string, latencyMs: number, attempts: ProviderAttempt[]): void {
  if (attempts.length > 1) {
    const prev = attempts[attempts.length - 2];
    console.log(`[ai] provider=${provider} model=${model} status=success latencyMs=${latencyMs} fallback=true reason=${prev.reason}`);
  } else {
    console.log(`[ai] provider=${provider} model=${model} status=success latencyMs=${latencyMs}`);
  }
}

function logFallback(failed: AIProviderName, requested: AIProviderName, reason: string, latencyMs: number): void {
  console.warn(`[ai] fallback from=${failed} to=next reason=${reason} latencyMs=${latencyMs}`);
}
