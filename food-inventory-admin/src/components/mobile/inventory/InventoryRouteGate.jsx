import { lazy, Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

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
  const [searchParams] = useSearchParams();
  // When a specific tab is selected (products, purchases, etc.),
  // show the desktop dashboard which handles those tabs
  const hasTab = searchParams.has('tab');

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
      {isMobile && !hasTab ? <MobileInventoryPage /> : <DesktopInventoryDashboard />}
    </Suspense>
  );
}
