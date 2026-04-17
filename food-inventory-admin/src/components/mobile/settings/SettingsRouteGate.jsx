import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  // When a section is selected, show the desktop settings page
  // which already handles tab/section navigation internally
  const hasSection = searchParams.has('section');

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
      {isMobile && !hasSection ? <MobileSettingsPage /> : <DesktopSettingsPage />}
    </Suspense>
  );
}
