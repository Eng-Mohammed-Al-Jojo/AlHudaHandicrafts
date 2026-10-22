/**
 * Normalize a WhatsApp number to international digits.
 * Local Palestinian numbers starting with 0 are converted to the 970 country code,
 * so links and copies work directly inside WhatsApp.
 */
export function normalizeWhatsAppNumber(raw: string): string {
  let digits = (raw || '').replace(/[^\d+]/g, '').replace(/\+/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0')) digits = `970${digits.slice(1)}`
  return digits
}

/** A usable WhatsApp number has 8–15 digits after normalization. */
export function isValidWhatsAppNumber(raw: string): boolean {
  const digits = normalizeWhatsAppNumber(raw)
  return digits.length >= 8 && digits.length <= 15
}

/** Build a clickable WhatsApp chat link for a stored number. */
export function whatsappLink(raw: string): string {
  return `https://wa.me/${normalizeWhatsAppNumber(raw)}`
}

/** Display a stored number in a friendly international format. */
export function formatWhatsAppNumber(raw: string): string {
  const digits = normalizeWhatsAppNumber(raw)
  return digits ? `+${digits}` : ''
}
