/**
 * Shared data normalization utilities for import processing.
 * Extends patterns from bank-statement.parser.ts.
 */

/** Normalize monetary/numeric amounts (handles VES/USD formatting) */
export function normalizeAmount(raw: any): number {
  if (typeof raw === "number") return raw;
  if (raw == null || raw === "") return 0;

  const cleaned = String(raw)
    .replace(/[\s$]/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".")
    .replace(/\((.*)\)/, "-$1");

  const amount = Number.parseFloat(cleaned);
  return Number.isNaN(amount) ? 0 : amount;
}

/** Normalize date values (Excel serial, dd/mm/yyyy, ISO, etc.) */
export function normalizeDate(raw: any): Date | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) return raw;

  if (typeof raw === "number") {
    // Excel serial date
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + raw * 24 * 60 * 60 * 1000);
  }

  const value = String(raw).trim();
  if (!value) return null;

  // dd/mm/yyyy or dd-mm-yyyy
  const parts = value.split(/[/\-]/);
  if (parts.length === 3 && parts[0].length <= 2) {
    const [day, month, year] = parts.map((p) => Number.parseInt(p, 10));
    if (!Number.isNaN(day) && !Number.isNaN(month) && !Number.isNaN(year)) {
      const fullYear = year < 100 ? 2000 + year : year;
      const date = new Date(fullYear, month - 1, day);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  // ISO format or other parseable string
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Normalize boolean values (si/no, yes/no, true/false, 1/0, S/N) */
export function normalizeBoolean(raw: any): boolean | null {
  if (typeof raw === "boolean") return raw;
  if (raw == null || raw === "") return null;

  const value = String(raw).trim().toLowerCase();
  const truthy = ["si", "sí", "yes", "true", "1", "s", "y", "verdadero", "v"];
  const falsy = ["no", "false", "0", "n", "falso", "f"];

  if (truthy.includes(value)) return true;
  if (falsy.includes(value)) return false;
  return null;
}

/** Split array string by separator and trim each element */
export function normalizeArray(
  raw: any,
  separator: string = ",",
): string[] {
  if (Array.isArray(raw)) return raw.map((v) => String(v).trim()).filter(Boolean);
  if (raw == null || raw === "") return [];

  return String(raw)
    .split(separator)
    .map((v) => v.trim())
    .filter(Boolean);
}

/** Clean string: trim whitespace, collapse multiple spaces */
export function normalizeString(raw: any): string {
  if (raw == null) return "";
  return String(raw).trim().replace(/\s+/g, " ");
}

/** Normalize numeric value (non-monetary, no thousand-separator handling) */
export function normalizeNumber(raw: any): number | null {
  if (typeof raw === "number") return raw;
  if (raw == null || raw === "") return null;

  const cleaned = String(raw).trim().replace(/,/g, ".");
  const num = Number.parseFloat(cleaned);
  return Number.isNaN(num) ? null : num;
}

/** Normalize row keys to lowercase + trimmed (same as bank-statement.parser.ts) */
export function normalizeKeys(
  row: Record<string, any>,
): Record<string, any> {
  const normalized: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.trim().toLowerCase()] = value;
  }
  return normalized;
}

/**
 * Sanitize string to prevent injection attacks.
 * Removes leading =, +, -, @ characters that could trigger CSV formula injection.
 */
export function sanitizeString(raw: any): string {
  if (raw == null) return "";
  let value = String(raw).trim();
  // Strip CSV formula injection characters at start
  while (value.length > 0 && /^[=+\-@\t\r]/.test(value)) {
    value = value.substring(1).trim();
  }
  return value;
}
