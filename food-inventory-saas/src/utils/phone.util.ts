/**
 * Centralized WhatsApp phone number normalization.
 * Strips non-digit characters and ensures a country code prefix.
 *
 * @param phone  Raw phone string (e.g. "+58 412-1234567", "04121234567")
 * @param defaultCountryCode  Country code to prepend when none is detected (default "58" — Venezuela)
 * @returns Digits-only string with country code (e.g. "584121234567")
 */
export function normalizeWhatsAppPhone(
  phone: string,
  defaultCountryCode = "58",
): string {
  // Remove all non-digit characters
  let normalized = phone.replace(/\D/g, "");

  // If it already starts with the country code, return as-is
  if (normalized.startsWith(defaultCountryCode)) {
    return normalized;
  }

  // Remove leading 0 (local format) before prepending country code
  if (normalized.startsWith("0")) {
    normalized = normalized.substring(1);
  }

  return defaultCountryCode + normalized;
}
