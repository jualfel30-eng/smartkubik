import { lazy, Suspense, useEffect, useState, Component } from 'react';

const DesktopInventoryDashboard = lazy(() => import('@/components/InventoryDashboard.jsx'));
const MobileInventoryPage = lazy(() => import('./MobileInventoryPage.jsx'));

class RouteGateErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null, componentStack: '' }; }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    this.setState({ componentStack: info?.componentStack || '' });
    console.error('[RouteGateErrorBoundary] CAUGHT:', error?.message, '\nComponentStack:', info?.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, margin: 16, background: '#1a0000', border: '2px solid #ff4444', borderRadius: 8, color: '#ff8888', fontSize: 12, fontFamily: 'monospace', maxHeight: '90vh', overflow: 'auto' }}>
          <p style={{ fontWeight: 'bold', marginBottom: 8, fontSize: 14 }}>ERROR CAPTURADO</p>
          <p style={{ wordBreak: 'break-all', marginBottom: 8 }}>{String(this.state.error?.message || this.state.error)}</p>
          <p style={{ fontWeight: 'bold', marginBottom: 4, color: '#ffaa44' }}>Component Stack:</p>
          <pre style={{ fontSize: 10, whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', color: '#ffaa44', background: '#0a0000', padding: 8, borderRadius: 4 }}>{this.state.componentStack || 'No component stack available'}</pre>
          <p style={{ fontWeight: 'bold', marginTop: 8, marginBottom: 4, color: '#aa6666' }}>JS Stack:</p>
          <pre style={{ fontSize: 9, whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto', color: '#aa6666' }}>{this.state.error?.stack}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 12, padding: '8px 16px', background: '#ff4444', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13 }}>Recargar</button>
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
