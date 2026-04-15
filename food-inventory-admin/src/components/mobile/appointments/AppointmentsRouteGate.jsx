import { lazy, Suspense, useEffect, useState } from 'react';
import { useMobileVertical } from '@/hooks/use-mobile-vertical';

const DesktopAppointments = lazy(() => import('@/components/AppointmentsManagement'));
const MobileAppointmentsPage = lazy(() => import('./MobileAppointmentsPage.jsx'));

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

// En móvil + beauty, renderiza la nueva experiencia; en cualquier otro caso,
// cae al CRUD completo existente. Esto nos permite iterar sin tocar desktop.
export default function AppointmentsRouteGate() {
  const isMobile = useIsMobile();
  const { isBeauty } = useMobileVertical();
  const useMobile = isMobile && isBeauty;

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      {useMobile ? <MobileAppointmentsPage /> : <DesktopAppointments />}
    </Suspense>
  );
}
