import { useAuth } from './use-auth.jsx';

const BEAUTY_KEYS = new Set(['beauty', 'services-beauty', 'beauty-salon', 'barbershop']);

export function useMobileVertical() {
  const { tenant } = useAuth();
  const rawKey = tenant?.verticalProfile?.key || tenant?.vertical || '';
  const key = String(rawKey).toLowerCase();

  return {
    key,
    isBeauty: BEAUTY_KEYS.has(key) || key.includes('beauty') || key.includes('salon'),
    isFoodService: key === 'food-service' || tenant?.vertical === 'FOOD_SERVICE',
    isRetail: key.startsWith('retail') || tenant?.vertical === 'RETAIL',
    isServices: key.startsWith('services') || tenant?.vertical === 'SERVICES',
  };
}
