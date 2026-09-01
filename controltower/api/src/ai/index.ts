// ai/index.ts — Re-exports para compatibilidad con código existente.
// Capa fina: ningún módulo fuera de src/ai/ debe importar de sub-archivos.

export { callChat, AIRouterError } from "./router";
export type { ChatMessage, ChatOptions, ChatResponse } from "./router";

export {
  interpretDriverMessageWithAI
} from "./interpret";
export type { InterpretResult, AiDriverInterpretation, IntentAction } from "./interpret";

export { transcribeWithGroqWhisper, GroqWhisperError } from "./providers/groqWhisper";
export { transcribeWithOpenAI, OpenAIError } from "./providers/openai";
