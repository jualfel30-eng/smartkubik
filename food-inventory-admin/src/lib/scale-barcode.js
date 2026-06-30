/**
 * Parser de códigos de barra de balanza con PRECIO embebido (EAN-13 "tipo 2").
 *
 * El código que imprime la báscula lleva: prefijo + PLU del producto + precio
 * de esa etiqueta + dígito(s) verificador(es). Devuelve { scaleCode, price } si
 * el código matchea el formato configurado, o `null` si no (→ el POS sigue su
 * flujo normal de lookup por código de barras).
 *
 * El parseo es POSICIONAL según la config del tenant (no asume EAN-13 de 13
 * dígitos), así se adapta a distintas básculas.
 *
 * @param {string} rawCode  código escaneado
 * @param {object} config   tenant.scaleBarcodeConfig { enabled, prefix, pluLength, priceLength, priceDecimals }
 * @returns {{ scaleCode: string, price: number } | null}
 */
export function parseScaleBarcode(rawCode, config) {
  if (!config || !config.enabled) return null;

  const code = String(rawCode || '').trim();
  const prefix = String(config.prefix ?? '');
  const pluLength = Number(config.pluLength) || 0;
  const priceLength = Number(config.priceLength) || 0;
  const priceDecimals = Number(config.priceDecimals) || 0;

  if (pluLength <= 0 || priceLength <= 0) return null;
  if (!/^\d+$/.test(code)) return null; // solo dígitos
  if (prefix && !code.startsWith(prefix)) return null;

  const minLen = prefix.length + pluLength + priceLength;
  if (code.length < minLen) return null;

  const pluStart = prefix.length;
  const priceStart = pluStart + pluLength;

  const scaleCode = code.substring(pluStart, priceStart);
  const priceRaw = code.substring(priceStart, priceStart + priceLength);
  const price = parseInt(priceRaw, 10) / Math.pow(10, priceDecimals);

  if (!scaleCode || Number.isNaN(price)) return null;

  return { scaleCode, price };
}
