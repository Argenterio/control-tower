// config/env.ts — Single source of truth para variables de entorno.
// Todas las claves/secrets se leen una sola vez, se validan y se exponen
// de manera controlada. Ningún otro módulo debe leer `process.env.*` directo.

export type AIProviderName = "groq" | "gemini" | "openai";

export interface AIConfig {
  primary: AIProviderName;
  fallback: AIProviderName | null;
  maxOutputTokens: number;
  timeoutMs: number;
  maxRetries: number;
  groq: {
    apiKey: string;
    chatModel: string;
    whisperModel: string;
    available: boolean;
  };
  gemini: {
    apiKey: string;
    model: string;
    available: boolean;
  };
  openai: {
    apiKey: string;
    whisperModel: string;
    available: boolean;
  };
}

export interface WhatsAppConfig {
  botPhone: string;
  webhookSecret: string | null;
  loopGuardMs: number;
  evolutionApiUrl: string;
  evolutionApiKey: string;
  evolutionInstance: string;
}

export interface MediaConfig {
  uploadDir: string;
  maxBytes: number;
  downloadTimeoutMs: number;
}

export interface AppConfig {
  ai: AIConfig;
  whatsapp: WhatsAppConfig;
  media: MediaConfig;
  jwtSecret: string;
  jwtExpiresIn: string;
}

function readEnv(key: string, fallback = ""): string {
  const v = process.env[key];
  return v === undefined || v === null ? fallback : String(v).trim();
}

function readInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === null || v === "") return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
}

function readProvider(name: string, fallback: AIProviderName): AIProviderName {
  const v = (name || "").toLowerCase().trim();
  if (v === "groq" || v === "gemini" || v === "openai") return v;
  return fallback;
}

/**
 * En producción, JWT_SECRET es OBLIGATORIO. Si no está definido, la app no inicia.
 * En desarrollo se permite un valor por defecto pero se loguea un warning.
 */
function resolveJwtSecret(): string {
  const fromEnv = readEnv("JWT_SECRET");
  const isProd = (process.env.NODE_ENV || "development").toLowerCase() === "production";
  if (fromEnv && fromEnv.length >= 16) {
    if (fromEnv.includes("change-me") || fromEnv.includes("change_me") || fromEnv.includes("cambiame")) {
      if (isProd) {
        throw new Error("JWT_SECRET contiene un valor placeholder. Configure un secreto real y robusto antes de iniciar en producción.");
      }
      console.warn("[config] ⚠️  JWT_SECRET contiene un valor placeholder. OK para desarrollo, NO para producción.");
      return fromEnv;
    }
    return fromEnv;
  }
  if (isProd) {
    throw new Error("JWT_SECRET no está definido o es demasiado corto (mínimo 16 caracteres). La aplicación no puede iniciar en producción sin un secreto JWT seguro.");
  }
  console.warn("[config] ⚠️  JWT_SECRET no definido — usando valor de desarrollo. NO apto para producción.");
  return "control-tower-dev-secret-change-me";
}

export function loadConfig(): AppConfig {
  const groqKey = readEnv("GROQ_API_KEY");
  const geminiKey = readEnv("GEMINI_API_KEY");
  const openaiKey = readEnv("OPENAI_API_KEY");

  // JWT_SECRET validado (lanza si NODE_ENV=production y falta)
  const jwtSecret = resolveJwtSecret();
  const jwtExpiresIn = readEnv("JWT_EXPIRES_IN", "12h");

  const primary = readProvider(readEnv("AI_PRIMARY_PROVIDER", "groq"), "groq");
  const fallbackRaw = readEnv("AI_FALLBACK_PROVIDER", "gemini");
  const fallback: AIProviderName | null = fallbackRaw ? readProvider(fallbackRaw, "gemini") : null;

  const ai: AIConfig = {
    primary,
    fallback: primary === fallback ? null : fallback,
    maxOutputTokens: readInt("AI_MAX_OUTPUT_TOKENS", 1000),
    timeoutMs: readInt("AI_TIMEOUT_MS", 30000),
    maxRetries: readInt("AI_MAX_RETRIES", 1),
    groq: {
      apiKey: groqKey,
      chatModel: readEnv("GROQ_CHAT_MODEL") || readEnv("GROQ_TEXT_MODEL") || "llama-3.1-8b-instant",
      whisperModel: readEnv("GROQ_WHISPER_MODEL", "whisper-large-v3-turbo"),
      available: groqKey.length > 0
    },
    gemini: {
      apiKey: geminiKey,
      model: (() => {
        const raw = readEnv("GEMINI_MODEL", "gemini-2.5-flash");
        // Auto-upgrade modelos retirados de Gemini para prevenir error 404 v1beta
        if (raw.includes("gemini-1.5")) return "gemini-2.5-flash";
        return raw;
      })(),
      available: geminiKey.length > 0
    },
    openai: {
      apiKey: openaiKey,
      whisperModel: readEnv("OPENAI_WHISPER_MODEL", "whisper-1"),
      available: openaiKey.length > 0
    }
  };

  const webhookSecretRaw = readEnv("WHATSAPP_WEBHOOK_SECRET");
  const webhookSecret = webhookSecretRaw && !webhookSecretRaw.startsWith("<") && !webhookSecretRaw.includes("random")
    ? webhookSecretRaw
    : null;

  const whatsapp: WhatsAppConfig = {
    botPhone: readEnv("BOT_PHONE", "5491173719972"),
    webhookSecret,
    loopGuardMs: readInt("LOOP_GUARD_MS", 30000),
    evolutionApiUrl: readEnv("EVOLUTION_API_URL", "https://trafic.generarise.space"),
    // SECURITY: NO hay fallback hardcoded. Si no hay env var, queda vacío y el
    // caller debe validar `config.whatsapp.evolutionApiKey` antes de llamar a Evolution.
    evolutionApiKey: readEnv("EVOLUTION_API_KEY", ""),
    evolutionInstance: (readEnv("EVOLUTION_INSTANCE", "control-tower") || "control-tower").toLowerCase()
  };

  const media: MediaConfig = {
    uploadDir: readEnv("UPLOAD_DIR", ""),
    maxBytes: readInt("MEDIA_MAX_BYTES", 50 * 1024 * 1024),
    downloadTimeoutMs: readInt("MEDIA_DOWNLOAD_TIMEOUT_MS", 15000)
  };

  return { ai, whatsapp, media, jwtSecret, jwtExpiresIn };
}

// Singleton congelado — los módulos importan esto y leen el objeto, no process.env.
export const config: AppConfig = loadConfig();

/**
 * Devuelve una vista segura del config para `/health/ai`.
 * NUNCA incluye API keys ni secretos.
 */
export function publicAIConfig(): {
  primary: AIProviderName;
  fallback: AIProviderName | null;
  groq: { configured: boolean; model: string };
  gemini: { configured: boolean; model: string };
  openai: { configured: boolean };
} {
  return {
    primary: config.ai.primary,
    fallback: config.ai.fallback,
    groq: { configured: config.ai.groq.available, model: config.ai.groq.chatModel },
    gemini: { configured: config.ai.gemini.available, model: config.ai.gemini.model },
    openai: { configured: config.ai.openai.available }
  };
}
