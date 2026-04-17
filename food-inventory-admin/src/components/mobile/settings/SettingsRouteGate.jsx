import { lazy, Suspense, useEffect, useState } from 'react';

const DesktopSettingsPage = lazy(() => import('@/components/SettingsPage.jsx'));
const MobileSettingsPage = lazy(() => import('./MobileSettingsPage.jsx'));

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767.98px)').matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767.98px)');
    const onChange = (e) => setIsMobile(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

export default function SettingsRouteGate() {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
      {isMobile ? <MobileSettingsPage /> : <DesktopSettingsPage />}
    </Suspense>
  );
}
