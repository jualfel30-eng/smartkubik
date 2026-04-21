import { lazy, Suspense, useEffect, useState } from 'react';

const MobileLoginBeauty = lazy(() => import('./MobileLoginBeauty.jsx'));
const LoginV2 = lazy(() => import('./LoginV2.jsx'));

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

export default function LoginRouteGate() {
  const isMobile = useIsMobile();

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0e1a]" />}>
      {isMobile ? <MobileLoginBeauty /> : <LoginV2 />}
    </Suspense>
  );
}
