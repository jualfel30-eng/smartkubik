/**
 * Cálculo del depósito de una reserva de beauty — fuente única de verdad.
 *
 * Usado tanto por beauty-bookings (al crear la reserva) como por
 * payment-requests (al armar el snapshot del PaymentRequest). Mantener la
 * fórmula en un solo lugar evita que el monto cobrado y el mostrado difieran.
 */

export interface DepositServiceConfig {
  requiresDeposit?: boolean;
  depositType?: 'fixed' | 'percentage';
  depositAmount?: number;
}

export interface BookingServiceLike {
  service: unknown; // ObjectId | string — id del BeautyService
  price?: number; // precio del servicio (incluye addons)
}

/**
 * Suma el depósito de los servicios que lo requieren.
 *   percentage → price * depositAmount / 100
 *   fixed      → depositAmount
 * Redondea a 2 decimales.
 */
export function computeBeautyBookingDeposit(
  bookingServices: BookingServiceLike[],
  configById: Map<string, DepositServiceConfig>,
): number {
  let total = 0;
  for (const bs of bookingServices || []) {
    const key = bs.service != null ? String(bs.service) : '';
    const cfg = configById.get(key);
    if (!cfg || !cfg.requiresDeposit) continue;
    const price = bs.price ?? 0;
    total +=
      cfg.depositType === 'percentage'
        ? (price * (cfg.depositAmount || 0)) / 100
        : cfg.depositAmount || 0;
  }
  return Math.round(total * 100) / 100;
}
