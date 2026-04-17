import { lazy, Suspense, useEffect, useState } from 'react';

const DesktopStorefrontSettings = lazy(() => import('@/components/StorefrontSettings'));
const MobileStorefrontPage = lazy(() => import('./MobileStorefrontPage.jsx'));

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

export default function StorefrontRouteGate() {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
      {isMobile ? <MobileStorefrontPage /> : <DesktopStorefrontSettings />}
    </Suspense>
  );
}
