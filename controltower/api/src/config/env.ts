import dotenv from 'dotenv';
dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string, defaultValue: string): string {
  return process.env[name] ?? defaultValue;
}

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || secret === 'your-super-secret-jwt-key-min-32-chars-change-in-production') {
    if (isProduction) {
      throw new Error(
        'JWT_SECRET is required in production and must not be the default placeholder. ' +
        'Set a secure random string (min 32 chars) in the environment.'
      );
    }
    console.warn(
      '⚠️  JWT_SECRET is using default placeholder. ' +
      'This is OK for development only. Set a real secret for production.'
    );
    return 'dev-only-insecure-secret-do-not-use-in-production';
  }

  return secret;
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:5173'),

  databaseUrl: required('DATABASE_URL'),

  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '7d'),

  corsOrigins: optional('CORS_ORIGINS', 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  evolutionApiUrl: required('EVOLUTION_API_URL'),
  evolutionApiKey: required('EVOLUTION_API_KEY'),
  evolutionInstance: required('EVOLUTION_INSTANCE'),

  groqApiKey: optional('GROQ_API_KEY', ''),
  groqTextModel: optional('GROQ_TEXT_MODEL', 'groq/compound'),
  groqWhisperModel: optional('GROQ_WHISPER_MODEL', 'whisper-large-v3-turbo'),
  groqChatModel: optional('GROQ_CHAT_MODEL', 'openai/gpt-oss-20b'),

  geminiApiKey: optional('GEMINI_API_KEY', ''),
  geminiModel: optional('GEMINI_MODEL', 'gemini-2.5-flash'),

  openaiApiKey: optional('OPENAI_API_KEY', ''),

  aiPrimaryProvider: optional('AI_PRIMARY_PROVIDER', 'groq'),
  aiFallbackProvider: optional('AI_FALLBACK_PROVIDER', 'gemini'),

  whatsappWebhookSecret: required('WHATSAPP_WEBHOOK_SECRET'),

  cartoApiKey: optional('VITE_CARTO_API_KEY', ''),

  seedDemoData: optional('SEED_DEMO_DATA', 'false') === 'true',
};

export function buildCorsOrigin(): string | string[] {
  if (config.nodeEnv === 'production') {
    return config.corsOrigins;
  }
  return true;
}

export type AppConfig = typeof config;