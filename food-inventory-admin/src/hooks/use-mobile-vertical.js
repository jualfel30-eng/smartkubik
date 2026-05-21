import { useAuth } from './use-auth.jsx';

const BEAUTY_KEYS = new Set(['beauty', 'services-beauty', 'beauty-salon', 'barbershop', 'barbershop-salon', 'clinic-spa']);
const COMMERCE_KEYS = new Set(['food-service', 'manufacturing', 'auto-parts']);

export function useMobileVertical() {
  const { tenant } = useAuth();
  const rawKey = tenant?.verticalProfile?.key || tenant?.vertical || '';
  const key = String(rawKey).toLowerCase();

  const isBeauty = BEAUTY_KEYS.has(key) || key.includes('beauty') || key.includes('salon');
  const isFoodService = key === 'food-service' || tenant?.vertical === 'FOOD_SERVICE';
  const isRetail = key.startsWith('retail') || tenant?.vertical === 'RETAIL';
  const isServices = key.startsWith('services') || tenant?.vertical === 'SERVICES';
  const isManufacturing = key === 'manufacturing' || tenant?.vertical === 'MANUFACTURING';

  // Commerce track: inventory-first verticals (food-service, retail-*, manufacturing, auto-parts).
  // Non-beauty services (mechanic-shop, hospitality fallback) keep using `default`.
  const isCommerce = !isBeauty && (
    COMMERCE_KEYS.has(key) ||
    key.startsWith('retail') ||
    isFoodService ||
    isRetail ||
    isManufacturing
  );

  const isEducation = key === 'education' || tenant?.vertical === 'EDUCATION';

  return {
    key,
    isBeauty,
    isFoodService,
    isRetail,
    isServices,
    isManufacturing,
    isCommerce,
    isEducation,
  };
}
