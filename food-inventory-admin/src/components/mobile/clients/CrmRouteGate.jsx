import { lazy, Suspense, useEffect, useState } from 'react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';

const MobileClientsPage = lazy(() => import('./MobileClientsPage.jsx'));
const DesktopCRM = lazy(() => import('@/components/CRMManagement.jsx'));

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
 * En móvil + beauty → MobileClientsPage (lista con swipe, perfil, QR check-in).
 * En desktop o verticales distintas → CRMManagement estándar.
 */
export default function CrmRouteGate({ hideEmployeeTab }) {
  const isMobile = useIsMobile();
  const { isBeauty } = useMobileVertical();
  const useMobile = isMobile && isBeauty;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      {useMobile ? <MobileClientsPage /> : <DesktopCRM hideEmployeeTab={hideEmployeeTab} />}
    </Suspense>
  );
}
