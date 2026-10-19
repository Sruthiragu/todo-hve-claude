/**
 * Creates a unique ID. `crypto.randomUUID` is only available in secure
 * contexts (HTTPS or localhost), so plain-HTTP origins such as a LAN dev
 * server fall back to a v4-style ID built from `crypto.getRandomValues`.
 */
export function createId(): string {
  if (globalThis.isSecureContext && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID()
    } catch {
      // Fall through to the manual version below.
    }
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
