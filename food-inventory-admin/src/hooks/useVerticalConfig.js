import { useMemo } from 'react';
import { useAuth } from './use-auth.jsx';
import { DEFAULT_VERTICAL_KEY, getVerticalProfile } from '@/config/verticalProfiles.js';

export const useVerticalConfig = () => {
  const { tenant } = useAuth();

  let key = tenant?.verticalProfile?.key;

  // Fallback logic if verticalProfile is missing
  if (!key) {
    if (tenant?.vertical === 'RETAIL' || tenant?.businessType === 'retail') {
      // Default to a retail profile if generic 'RETAIL' is found
      key = 'retail-fashion';
    } else if (tenant?.vertical === 'FOOD_SERVICE') {
      key = 'food-service';
    } else {
      key = DEFAULT_VERTICAL_KEY;
    }
  }

  const overrides = useMemo(
    () => tenant?.verticalProfile?.overrides || {},
    [tenant?.verticalProfile?.overrides],
  );

  return useMemo(() => getVerticalProfile(key, overrides), [key, overrides]);
};

export const useVerticalKey = () => {
  const { tenant } = useAuth();
  return tenant?.verticalProfile?.key || DEFAULT_VERTICAL_KEY;
};
