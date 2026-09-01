// whatsapp/mediaKey.ts — Normalizador del mediaKey de WhatsApp/Evolution.
// Acepta string Base64, Buffer u objeto anidado (Baileys, n8n, etc.).
// Busca recursivamente en cualquier key cuya valor sea Base64 de 32 bytes.

const WA_MEDIA_KEY_LEN = 32;

export function normalizeMediaKey(raw: unknown): Buffer | null {
  if (raw === undefined || raw === null) return null;
  if (Buffer.isBuffer(raw)) {
    return raw.length === WA_MEDIA_KEY_LEN ? raw : null;
  }
  if (typeof raw === "string") {
    return decodeBase64IfMatches(raw, WA_MEDIA_KEY_LEN);
  }
  if (typeof raw === "object") {
    // Caso 1: objeto indexado tipo byte array {0:21, 1:133, ...}
    const indexedBuf = fromIndexedObject(raw);
    if (indexedBuf && indexedBuf.length === WA_MEDIA_KEY_LEN) return indexedBuf;

    // Caso 2: objeto anidado con algún string Base64 de 32 bytes adentro
    const found = deepSearch(raw, WA_MEDIA_KEY_LEN, 0, new WeakSet());
    if (found) return found;
  }
  return null;
}

function fromIndexedObject(obj: unknown): Buffer | null {
  if (typeof obj !== "object" || obj === null) return null;
  const keys = Object.keys(obj as object);
  if (keys.length === 0) return null;
  // Si todas las keys son índices numéricos consecutivos empezando en 0,
  // es un byte array serializado como objeto plano.
  const numericKeys = keys.filter(k => /^\d+$/.test(k));
  if (numericKeys.length !== keys.length) return null;
  const max = Math.max(...numericKeys.map(Number));
  if (max !== keys.length - 1) return null; // tienen que ser 0..N-1
  const arr = new Array<number>(keys.length);
  for (const k of numericKeys) {
    const v = (obj as Record<string, unknown>)[k];
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 255) return null;
    arr[Number(k)] = n;
  }
  return Buffer.from(arr);
}

function decodeBase64IfMatches(s: string, expectedLen: number): Buffer | null {
  // Heurística de longitud para evitar decodificar strings gigantes
  // (32 bytes Base64 ≈ 44 chars con padding).
  if (s.length < 30 || s.length > 200) return null;
  try {
    const buf = Buffer.from(s, "base64");
    return buf.length === expectedLen ? buf : null;
  } catch {
    return null;
  }
}

function deepSearch(node: unknown, expectedLen: number, depth: number, visited: WeakSet<object>): Buffer | null {
  if (depth > 5) return null;
  if (node === null || node === undefined) return null;
  if (typeof node !== "object") return null;
  if (visited.has(node as object)) return null;
  visited.add(node as object);

  for (const key of Object.keys(node as object)) {
    try {
      const value = (node as Record<string, unknown>)[key];
      if (typeof value === "string") {
        const decoded = decodeBase64IfMatches(value, expectedLen);
        if (decoded) return decoded;
      } else if (typeof value === "object" && value !== null) {
        const sub = deepSearch(value, expectedLen, depth + 1, visited);
        if (sub) return sub;
      }
    } catch {
      /* ignore keys que tiren (getter extraño) */
    }
  }
  return null;
}
