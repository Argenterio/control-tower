// whatsapp.ts — Capa de compatibilidad. Lógica real en src/whatsapp/.

export { processIncomingWhatsappMessage } from "./whatsapp/process";
export { normalizeIncomingWhatsAppMessage } from "./whatsapp/normalize";
export { parseDriverMessageDeterministic, intentToOperationalEvent } from "./whatsapp/parser";
export { downloadAndStoreMedia, transcribeAudio, normalizeMediaKey } from "./whatsapp/media";
export type { NormalizedWhatsAppMessage, NormalizedMessageType } from "./whatsapp/normalize";
export type { IntentResult, DriverIntent, TripStatus } from "./whatsapp/parser";
export type { MediaFinal } from "./whatsapp/media";
