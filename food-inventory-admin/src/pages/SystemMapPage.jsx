import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import {
  RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Database, Server, Globe, Boxes, ShoppingCart, Truck,
  Calculator, Users, ArrowRightLeft, Factory, Megaphone,
  Calendar, Utensils, Sparkles, Clock, Activity,
  ChevronDown, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const groupConfig = {
  infrastructure: { label: 'Infraestructura', icon: Server, color: 'slate' },
  core: { label: 'Core (Auth/Users)', icon: Users, color: 'blue' },
  products: { label: 'Productos', icon: Boxes, color: 'emerald' },
  inventory: { label: 'Inventario', icon: Database, color: 'green' },
  sales: { label: 'Ventas', icon: ShoppingCart, color: 'sky' },
  purchasing: { label: 'Compras', icon: Truck, color: 'purple' },
  crm: { label: 'CRM', icon: Users, color: 'pink' },
  finance: { label: 'Finanzas', icon: Calculator, color: 'amber' },
  transfers: { label: 'Transferencias', icon: ArrowRightLeft, color: 'cyan' },
  hr: { label: 'RRHH', icon: Calendar, color: 'indigo' },
  services: { label: 'Servicios/Citas', icon: Calendar, color: 'rose' },
  restaurant: { label: 'Restaurante', icon: Utensils, color: 'orange' },
  marketing: { label: 'Marketing', icon: Megaphone, color: 'violet' },
  storefront: { label: 'Storefront', icon: Globe, color: 'teal' },
  external: { label: 'Servicios Externos', icon: Sparkles, color: 'gray' },
};

const statusIcon = (status) => {
  if (status === 'ok') return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === 'error') return <XCircle className="w-4 h-4 text-red-500" />;
  return <AlertTriangle className="w-4 h-4 text-amber-500" />;
};

const statusBg = (status) => {
  if (status === 'ok') return 'bg-emerald-500/10 border-emerald-500/30';
  if (status === 'error') return 'bg-red-500/10 border-red-500/30';
  return 'bg-amber-500/10 border-amber-500/30';
};

const overallBadge = (status) => {
  if (status === 'healthy') return <Badge className="bg-emerald-600 text-white">Saludable</Badge>;
  if (status === 'critical') return <Badge className="bg-red-600 text-white">Crítico</Badge>;
  return <Badge className="bg-amber-600 text-white">Degradado</Badge>;
};

export default function SystemMapPage() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});
  const [filter, setFilter] = useState('all'); // 'all' | 'errors' | 'warnings'

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchApi('/health/system-map');
      setData(res.data);
      // Auto-expand groups with errors
      const groupsWithErrors = {};
      res.data.connections.forEach(c => {
        if (c.status === 'error') {
          const node = res.data.nodes.find(n => n.id === c.target || n.id === c.source);
          if (node) groupsWithErrors[node.group] = true;
        }
      });
      setExpandedGroups(prev => ({ ...prev, ...groupsWithErrors }));
    } catch (err) {
      setError(err.message || 'Error al cargar el mapa del sistema');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  // Group nodes by their group field
  const groupedNodes = useMemo(() => {
    if (!data) return {};
    const groups = {};
    data.nodes.forEach(node => {
      if (!groups[node.group]) groups[node.group] = [];
      groups[node.group].push(node);
    });
    return groups;
  }, [data]);

  // Filter connections
  const filteredConnections = useMemo(() => {
    if (!data) return [];
    if (filter === 'all') return data.connections;
    if (filter === 'errors') return data.connections.filter(c => c.status === 'error');
    return data.connections.filter(c => c.status === 'warning');
  }, [data, filter]);

  // Group connections by source→target relationship for display
  const crossModuleConnections = useMemo(() => {
    if (!data) return [];
    return data.connections.filter(c =>
      c.source !== 'mongodb' && c.source !== 'app' && c.target !== 'mongodb'
    );
  }, [data]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <Activity className="w-6 h-6 text-primary animate-pulse" />
          <h1 className="text-2xl font-bold">Mapa del Sistema</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="h-32 bg-accent/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-6 h-6 text-red-500" />
          <h1 className="text-2xl font-bold">Error</h1>
        </div>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={loadData} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Mapa del Sistema</h1>
            <p className="text-sm text-muted-foreground">
              Estado de todas las conexiones — {data.timestamp && new Date(data.timestamp).toLocaleString('es-VE')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {overallBadge(data.overallStatus)}
          <Button onClick={loadData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-card border rounded-lg p-4 text-center">
          <div className="text-2xl font-bold">{data.summary.totalChecks}</div>
          <div className="text-xs text-muted-foreground">Verificaciones</div>
        </div>
        <button onClick={() => setFilter('all')} className={`bg-card border rounded-lg p-4 text-center transition-colors ${filter === 'all' ? 'ring-2 ring-primary' : ''}`}>
          <div className="text-2xl font-bold text-emerald-500">{data.summary.passed}</div>
          <div className="text-xs text-muted-foreground">OK</div>
        </button>
        <button onClick={() => setFilter('warnings')} className={`bg-card border rounded-lg p-4 text-center transition-colors ${filter === 'warnings' ? 'ring-2 ring-amber-500' : ''}`}>
          <div className="text-2xl font-bold text-amber-500">{data.summary.warnings}</div>
          <div className="text-xs text-muted-foreground">Advertencias</div>
        </button>
        <button onClick={() => setFilter('errors')} className={`bg-card border rounded-lg p-4 text-center transition-colors ${filter === 'errors' ? 'ring-2 ring-red-500' : ''}`}>
          <div className="text-2xl font-bold text-red-500">{data.summary.failed}</div>
          <div className="text-xs text-muted-foreground">Errores</div>
        </button>
      </div>

      {/* Node Groups */}
      <div className="space-y-3 mb-8">
        {Object.entries(groupConfig).map(([groupKey, config]) => {
          const nodes = groupedNodes[groupKey];
          if (!nodes || nodes.length === 0) return null;

          const Icon = config.icon;
          const isExpanded = expandedGroups[groupKey];
          const hasErrors = nodes.some(n => n.status === 'error');
          const hasWarnings = nodes.some(n => n.status === 'warning');
          const groupStatus = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

          return (
            <div key={groupKey} className={`border rounded-xl overflow-hidden ${statusBg(groupStatus)}`}>
              <button
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {statusIcon(groupStatus)}
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{config.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {nodes.length} {nodes.length === 1 ? 'nodo' : 'nodos'}
                  </Badge>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>

              {isExpanded && (
                <div className="px-4 pb-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {nodes.map(node => (
                    <div key={node.id} className={`flex items-center gap-2 px-3 py-2 rounded-md border ${statusBg(node.status)}`}>
                      {statusIcon(node.status)}
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{node.name}</div>
                        {node.details && (
                          <div className="text-xs text-muted-foreground truncate">{node.details}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Cross-Module Connections (Referential Integrity) */}
      {crossModuleConnections.length > 0 && (
        <div>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            Conexiones entre Módulos
          </h2>
          <div className="space-y-2">
            {crossModuleConnections.map(conn => (
              <div key={conn.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${statusBg(conn.status)}`}>
                <div className="flex items-center gap-3">
                  {statusIcon(conn.status)}
                  <div>
                    <div className="text-sm font-medium">{conn.name}</div>
                    {conn.details && (
                      <div className="text-xs text-muted-foreground">{conn.details}</div>
                    )}
                    {conn.error && (
                      <div className="text-xs text-red-500 font-medium">{conn.error}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {conn.latencyMs}ms
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Connection Details (filterable) */}
      {filter !== 'all' && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">
              {filter === 'errors' ? 'Errores' : 'Advertencias'} ({filteredConnections.length})
            </h2>
            <Button onClick={() => setFilter('all')} variant="ghost" size="sm">Ver todo</Button>
          </div>
          <div className="space-y-2">
            {filteredConnections.map(conn => (
              <div key={conn.id} className={`flex items-center justify-between px-4 py-3 rounded-lg border ${statusBg(conn.status)}`}>
                <div className="flex items-center gap-3">
                  {statusIcon(conn.status)}
                  <div>
                    <div className="text-sm font-medium">{conn.name}</div>
                    <div className="text-xs text-muted-foreground">{conn.source} → {conn.target}</div>
                    {conn.error && <div className="text-xs text-red-500">{conn.error}</div>}
                    {conn.details && <div className="text-xs text-muted-foreground">{conn.details}</div>}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">{conn.latencyMs}ms</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
