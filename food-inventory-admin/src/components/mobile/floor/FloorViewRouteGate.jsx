import { lazy, Suspense, useEffect, useState } from 'react';

const DesktopFloorView = lazy(() => import('@/components/FloorView.jsx'));
const MobileFloorViewPage = lazy(() => import('./MobileFloorView.jsx'));

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

export default function FloorViewRouteGate() {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      {isMobile ? <MobileFloorViewPage /> : <DesktopFloorView />}
    </Suspense>
  );
}
