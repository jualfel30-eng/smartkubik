import { lazy, Suspense } from 'react';
import { useAuth } from '@/hooks/use-auth';

const OnboardingWizard = lazy(() => import('../OnboardingWizard'));
const MobileOnboardingBeauty = lazy(() =>
  import('./beauty/MobileOnboardingBeauty')
);

const BEAUTY_KEYS = new Set([
  'barbershop-salon',
  'beauty-salon',
  'spa-wellness',
  'nail-salon',
]);

export default function OnboardingGate() {
  const { tenant } = useAuth();
  const profileKey = tenant?.verticalProfile?.key;

  const isBeauty = BEAUTY_KEYS.has(profileKey);

  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 bg-[#0a0e1a] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      {isBeauty ? <MobileOnboardingBeauty /> : <OnboardingWizard />}
    </Suspense>
  );
}
