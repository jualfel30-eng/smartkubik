import { lazy, Suspense, useEffect, useState } from 'react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';

const MobileServicesPage = lazy(() => import('./MobileServicesPage.jsx'));
const DesktopServices = lazy(() => import('@/components/ServicesManagement.jsx'));

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

/**
 * En móvil + beauty → MobileServicesPage (cards, inline edit, reorder).
 * En desktop o verticales distintas → ServicesManagement estándar.
 */
export default function ServicesRouteGate() {
  const isMobile = useIsMobile();
  const { isBeauty } = useMobileVertical();
  const useMobile = isMobile && isBeauty;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      {useMobile ? <MobileServicesPage /> : <DesktopServices />}
    </Suspense>
  );
}
