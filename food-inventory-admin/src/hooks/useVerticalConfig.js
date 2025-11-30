import { useMemo } from 'react';
import { useAuth } from './use-auth.jsx';
import { DEFAULT_VERTICAL_KEY, getVerticalProfile } from '@/config/verticalProfiles.js';

export const useVerticalConfig = () => {
  const { tenant } = useAuth();
  const key = tenant?.verticalProfile?.key || DEFAULT_VERTICAL_KEY;
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
