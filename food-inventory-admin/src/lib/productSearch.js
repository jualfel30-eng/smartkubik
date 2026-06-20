/**
 * Búsqueda de productos unificada (lado cliente).
 *
 * UNA sola fuente de verdad para TODOS los buscadores de producto del front
 * (POS, traslados, resúmenes…) para no volver a divergir — ver incidente
 * docs/wiki/incidents/2026-06-20-product-search-regressions.md.
 *
 * Reglas (espejan el backend inventory.service / products.service):
 *  - Tokenizado: cada palabra del término debe aparecer en ALGÚN campo
 *    (AND entre palabras, OR entre campos). Así "aceite oliva" matchea
 *    "Aceite de Oliva" y "avellanas mary" matchea nombre + marca.
 *  - Insensible a acentos: "pina" encuentra "Piña", "jalapeno" → "Jalapeño".
 *  - Insensible a mayúsculas.
 */

const strip = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * @param {string} term  Texto buscado.
 * @param {Array}  fields  Campos donde buscar (strings; se aceptan arrays
 *   anidados, p.ej. category puede ser array — se aplanan). null/'' se ignoran.
 * @returns {boolean} true si todas las palabras del término aparecen.
 */
export function matchesProductSearch(term, fields) {
  const words = strip(term).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const haystack = (Array.isArray(fields) ? fields : [fields])
    .flat()
    .filter((v) => v != null && v !== '')
    .map(strip)
    .join(' ');
  return words.every((w) => haystack.includes(w));
}
