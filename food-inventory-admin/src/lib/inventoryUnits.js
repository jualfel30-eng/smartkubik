/**
 * inventoryUnits.js
 *
 * Helpers para decidir si el ajuste de inventario de un item debe permitir
 * cantidades fraccionarias.
 *
 * Contexto: el backend guarda el stock en la unidad base (totalQuantity) y
 * valida newQuantity con @IsNumber()/@Min(0) — acepta decimales sin problema.
 * El bloqueo histórico era 100% del frontend, que cableaba los inputs a enteros
 * (step=1 / parseInt / Math.round). Para productos vendidos por peso (kg, g, lb)
 * eso impedía dos cosas: (1) teclear decimales y (2) editar un item cuyo stock
 * actual YA es fraccionario (un "0.5" con input entero queda atascado porque
 * cualquier pulsación intermedia con punto se rechaza).
 */

/** Extrae el producto poblado del registro de inventario, si viene como objeto. */
function getProduct(record) {
  return record?.productId && typeof record.productId === 'object'
    ? record.productId
    : null;
}

/** Cantidad de stock actual del registro, tolerando los distintos shapes. */
export function currentStockOf(record) {
  return Number(
    record?.totalQuantity ??
      record?.availableQuantity ??
      record?.currentStock ??
      record?.quantity ??
      0,
  );
}

/**
 * Decide si el ajuste de este item debe aceptar decimales.
 * True si el producto se vende por peso, o si el stock actual ya es fraccionario
 * (defensa: garantiza que un item fraccionario nunca quede ineditable aunque el
 * flag isSoldByWeight no esté poblado).
 */
export function allowsFractionalStock(record) {
  if (!record) return false;
  const product = getProduct(record);
  const soldByWeight = product?.isSoldByWeight ?? record.isSoldByWeight ?? false;
  if (soldByWeight) return true;
  const current = currentStockOf(record);
  return Number.isFinite(current) && !Number.isInteger(current);
}

/** Etiqueta de la unidad base del item (ej: "kg", "unidad"), o '' si no aplica. */
export function inventoryUnitLabel(record) {
  const product = getProduct(record);
  return product?.unitOfMeasure ?? record?.unitOfMeasure ?? '';
}

/** Redondeo a 4 decimales, igual que UnitConversionUtil en el backend. */
const round4 = (n) => Math.round(Number(n) * 10000) / 10000;

export const BASE_UNIT_KEY = '__base__';

/**
 * Opciones de unidad para el ajuste: la unidad base (factor 1) seguida de las
 * sellingUnits activas con factor válido. Cada opción lleva su conversionFactor
 * a unidad base, de modo que baseQty = qty * conversionFactor (igual que ventas).
 */
export function getUnitOptions(record) {
  const product = getProduct(record);
  const baseAbbr = product?.unitOfMeasure ?? record?.unitOfMeasure ?? 'und';
  const base = {
    key: BASE_UNIT_KEY,
    label: baseAbbr,
    conversionFactor: 1,
    isBase: true,
    isDefault: false,
  };
  const selling = (product?.sellingUnits || [])
    .filter((u) => u && u.isActive !== false && Number(u.conversionFactor) > 0)
    .map((u) => ({
      key: u.abbreviation || u.name,
      label: u.abbreviation || u.name,
      conversionFactor: Number(u.conversionFactor),
      isBase: false,
      isDefault: !!u.isDefault,
      isSoldByWeight: !!u.isSoldByWeight,
    }));
  return [base, ...selling];
}

/** True si el item tiene unidades de venta además de la base (mostrar selector). */
export function hasUnitChoices(record) {
  return getUnitOptions(record).length > 1;
}

/** Key de la unidad preseleccionada: la sellingUnit isDefault, o la base. */
export function defaultUnitKey(record) {
  const opts = getUnitOptions(record);
  return (opts.find((o) => o.isDefault) || opts[0]).key;
}

/** Busca una opción de unidad por su key. */
export function findUnitOption(record, key) {
  const opts = getUnitOptions(record);
  return opts.find((o) => o.key === key) || opts[0];
}

/** Cantidad en unidad seleccionada → unidad base (baseQty = qty * factor). */
export function toBaseUnit(qty, conversionFactor) {
  return round4(Number(qty) * Number(conversionFactor || 1));
}

/** Unidad base → unidad seleccionada (para mostrar el stock actual editable). */
export function fromBaseUnit(baseQty, conversionFactor) {
  const f = Number(conversionFactor || 1);
  if (!f) return round4(baseQty);
  return round4(Number(baseQty) / f);
}
