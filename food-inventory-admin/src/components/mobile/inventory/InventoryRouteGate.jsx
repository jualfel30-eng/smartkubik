import { lazy, Suspense, useEffect, useState } from 'react';

const DesktopInventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const MobileInventoryPage = lazy(() => import('./MobileInventoryPage.jsx'));

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

export default function InventoryRouteGate() {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
      {isMobile ? <MobileInventoryPage /> : <DesktopInventoryDashboard />}
    </Suspense>
  );
}
