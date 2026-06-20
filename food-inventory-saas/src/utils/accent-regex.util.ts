/**
 * Búsqueda insensible a tildes/acentos.
 *
 * MongoDB `$regex` no pliega diacríticos y la collation no aplica a regex, así
 * que para que "cafe" encuentre "Café" (y "nino" encuentre "niño") construimos
 * una regex donde cada letra base se expande a una clase con sus variantes
 * acentuadas. No requiere migración ni campos nuevos: opera sobre los datos tal
 * como están. Usar SIEMPRE con el flag "i".
 *
 *   accentInsensitiveRegexSource("cafe")  ->  "c[aàáäâãå]f[eèéëê]"
 */

const ACCENT_CLASSES: Record<string, string> = {
  a: "aàáäâãå",
  e: "eèéëê",
  i: "iìíïî",
  o: "oòóöôõ",
  u: "uùúüû",
  n: "nñ",
  c: "cç",
  y: "yýÿ",
};

// Combining diacritical marks (U+0300–U+036F), separados por NFD.
const COMBINING_MARKS = /[̀-ͯ]/g;

function escapeRegExpChar(ch: string): string {
  return ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Devuelve el SOURCE de una regex que matchea `term` ignorando acentos y
 * mayúsculas (con el flag "i"). El término de entrada se normaliza quitándole
 * sus propios diacríticos, de modo que "café" y "cafe" generan el mismo patrón.
 */
export function accentInsensitiveRegexSource(term: string): string {
  const base = (term || "")
    .normalize("NFD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase();
  let out = "";
  for (const ch of base) {
    const cls = ACCENT_CLASSES[ch];
    out += cls ? `[${cls}]` : escapeRegExpChar(ch);
  }
  return out;
}

/** Conveniencia: construye directamente la RegExp insensible a acentos. */
export function accentInsensitiveRegex(term: string): RegExp {
  return new RegExp(accentInsensitiveRegexSource(term), "i");
}
