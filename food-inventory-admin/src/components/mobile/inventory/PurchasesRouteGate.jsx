import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const DesktopCompras = lazy(() => import('@/components/ComprasManagement.jsx'));

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
 * En móvil, Compras vive como tab dentro de MobileInventoryPage (con su flujo
 * completo de listar + crear OC). El standalone /purchases solo tiene la UI
 * desktop (ComprasManagement), así que en móvil redirigimos al tab real en vez
 * de mostrar la versión desktop comprimida.
 */
export default function PurchasesRouteGate() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Navigate to="/inventory-management?tab=purchases" replace />;
  }

  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando…</div>}>
      <DesktopCompras />
    </Suspense>
  );
}
