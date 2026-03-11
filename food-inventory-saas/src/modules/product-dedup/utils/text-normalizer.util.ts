/**
 * Text normalization utilities for product duplicate detection.
 */

export function removeAccents(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const UNIT_MAP: Record<string, string> = {
  mililitros: "ml",
  mililitro: "ml",
  ml: "ml",
  litros: "l",
  litro: "l",
  lt: "l",
  lts: "l",
  l: "l",
  kilogramos: "kg",
  kilogramo: "kg",
  kilos: "kg",
  kilo: "kg",
  kg: "kg",
  gramos: "g",
  gramo: "g",
  gr: "g",
  grs: "g",
  g: "g",
  onzas: "oz",
  onza: "oz",
  oz: "oz",
  libras: "lb",
  libra: "lb",
  lbs: "lb",
  lb: "lb",
  unidades: "und",
  unidad: "und",
  uds: "und",
  und: "und",
  pza: "und",
  pzas: "und",
  cajas: "caja",
  caja: "caja",
  paquetes: "paq",
  paquete: "paq",
  paq: "paq",
  pack: "paq",
  botellas: "bot",
  botella: "bot",
  bot: "bot",
  latas: "lata",
  lata: "lata",
  sobres: "sobre",
  sobre: "sobre",
};

export function normalizeUnits(str: string): string {
  let result = str;
  for (const [from, to] of Object.entries(UNIT_MAP)) {
    const regex = new RegExp(`\\b${from}\\b`, "gi");
    result = result.replace(regex, to);
  }
  // Collapse "600 ml" → "600ml"
  result = result.replace(
    /(\d+(?:\.\d+)?)\s*(ml|l|kg|g|oz|lb|und|caja|paq|bot|lata|sobre)\b/gi,
    "$1$2",
  );
  return result;
}

export function normalizeProductName(name: string): string {
  if (!name) return "";
  let normalized = name.toLowerCase().trim();
  normalized = removeAccents(normalized);
  // Split digits from letters: "250grs" → "250 grs", "500ml" → "500 ml"
  normalized = normalized.replace(/(\d)([a-z])/g, "$1 $2");
  normalized = normalizeUnits(normalized);
  // Strip special characters except numbers, letters, dots, and spaces
  normalized = normalized.replace(/[^a-z0-9\s.]/g, "");
  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, " ").trim();
  return normalized;
}

export function normalizeSku(sku: string): string {
  if (!sku) return "";
  let normalized = sku.toUpperCase().trim();
  // Strip dashes, dots, underscores, spaces
  normalized = normalized.replace(/[-._\s]/g, "");
  // Strip leading zeros after letters: PROD001 → PROD1
  normalized = normalized.replace(/([A-Z]+)0+(\d+)/g, "$1$2");
  return normalized;
}

export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function stringSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(a, b);
  return Math.round((1 - distance / maxLen) * 100);
}

/**
 * Extract size/quantity tokens from a normalized product name.
 * Returns the base name (without sizes) and a canonical sizeKey for comparison.
 * E.g. "aceite de oliva 500ml" → { baseName: "aceite de oliva", sizeKey: "500ml" }
 */
export function extractSize(normalizedName: string): {
  baseName: string;
  sizeKey: string;
} {
  const SIZE_REGEX =
    /(\d+(?:\.\d+)?)(ml|l|kg|g|oz|lb|cc|und|caja|paq|bot|lata|sobre)\b/gi;
  const COUNT_REGEX = /(?:x\s?|c\/|pack\s?)(\d+)\b/gi;

  const sizes: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = SIZE_REGEX.exec(normalizedName)) !== null) {
    sizes.push(`${match[1]}${match[2].toLowerCase()}`);
  }
  while ((match = COUNT_REGEX.exec(normalizedName)) !== null) {
    sizes.push(`x${match[1]}`);
  }

  let baseName = normalizedName
    .replace(
      /(\d+(?:\.\d+)?)(ml|l|kg|g|oz|lb|cc|und|caja|paq|bot|lata|sobre)\b/gi,
      " ",
    )
    .replace(/(?:x\s?|c\/|pack\s?)(\d+)\b/gi, " ");
  baseName = baseName.replace(/\s+/g, " ").trim();

  const sizeKey = sizes.sort().join("|");
  return { baseName, sizeKey };
}

/**
 * Detect if two base names differ in ways that indicate genuinely
 * different products (not just typos/formatting).
 * Returns true if the products should NOT be merged.
 */
const VARIANT_WORDS = new Set([
  "con",
  "sin",
  "light",
  "zero",
  "diet",
  "regular",
  "blanco",
  "blanca",
  "negro",
  "negra",
  "rojo",
  "roja",
  "verde",
  "azul",
  "amarillo",
  "natural",
  "organico",
  "integral",
  "refinado",
  "refinada",
  "dulce",
  "salado",
  "salada",
  "picante",
  "amargo",
  "amarga",
  "entero",
  "entera",
  "descremado",
  "descremada",
  "semidescremado",
  "tinto",
  "rosado",
  "seco",
  "semiseco",
]);

export function hasSignificantWordDiff(
  base1: string,
  base2: string,
): boolean {
  const words1 = new Set(base1.split(" "));
  const words2 = new Set(base2.split(" "));
  const diff1 = [...words1].filter((w) => !words2.has(w));
  const diff2 = [...words2].filter((w) => !words1.has(w));

  if (diff1.length === 0 && diff2.length === 0) return false;

  // con ↔ sin swap = different product
  if (
    (diff1.includes("con") && diff2.includes("sin")) ||
    (diff1.includes("sin") && diff2.includes("con"))
  ) {
    return true;
  }

  // Any meaningful variant word in the diff = different product
  if (
    diff1.some((w) => VARIANT_WORDS.has(w)) ||
    diff2.some((w) => VARIANT_WORDS.has(w))
  ) {
    return true;
  }

  // Different numbers remaining in base name (e.g. "20 mesh" vs "40 mesh")
  const nums1 = new Set((base1.match(/\d+(?:[.,]\d+)?/g) || []).sort());
  const nums2 = new Set((base2.match(/\d+(?:[.,]\d+)?/g) || []).sort());
  if (nums1.size !== nums2.size) return true;
  for (const n of nums1) {
    if (!nums2.has(n)) return true;
  }

  return false;
}
