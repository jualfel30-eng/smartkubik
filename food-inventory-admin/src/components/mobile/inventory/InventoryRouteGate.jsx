import { lazy, Suspense, useEffect, useState, Component } from 'react';

const DesktopInventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const MobileInventoryPage = lazy(() => import('./MobileInventoryPage.jsx'));

class RouteGateErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('[RouteGateErrorBoundary] CAUGHT:', error?.message, '\nStack:', info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, margin: 16, background: '#1a0000', border: '2px solid #ff4444', borderRadius: 8, color: '#ff8888', fontSize: 13, fontFamily: 'monospace' }}>
          <p style={{ fontWeight: 'bold', marginBottom: 8 }}>ERROR CAPTURADO</p>
          <p style={{ wordBreak: 'break-all' }}>{String(this.state.error?.message || this.state.error)}</p>
          <pre style={{ fontSize: 10, marginTop: 8, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto', color: '#aa6666' }}>{this.state.error?.stack}</pre>
          <button onClick={() => { this.setState({ error: null }); window.location.reload(); }} style={{ marginTop: 8, padding: '6px 12px', background: '#ff4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <RouteGateErrorBoundary>
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Cargando...</div>}>
        {isMobile ? <MobileInventoryPage /> : <DesktopInventoryDashboard />}
      </Suspense>
    </RouteGateErrorBoundary>
  );
}
