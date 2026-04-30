import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Clock,
  Database,
  Server,
  Layers,
  Zap,
  ChevronDown,
  ChevronRight,
  List,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import SystemTopologyMap from './SystemTopologyMap';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  ok: {
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
    label: 'OK',
  },
  warning: {
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
    label: 'Advertencia',
  },
  error: {
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: XCircle,
    label: 'Error',
  },
};

const OVERALL_CONFIG = {
  healthy: { label: 'Sistema Saludable', ...STATUS_CONFIG.ok },
  degraded: { label: 'Sistema Degradado', ...STATUS_CONFIG.warning },
  critical: { label: 'Sistema Crítico', ...STATUS_CONFIG.error },
};

const GROUP_LABELS = {
  frontends: 'Frontends',
  modules: 'Módulos Backend',
  infrastructure: 'Infraestructura',
  core: 'Core',
  products: 'Productos',
  inventory: 'Inventario',
  sales: 'Ventas',
  purchasing: 'Compras',
  crm: 'CRM',
  finance: 'Finanzas',
  transfers: 'Transferencias',
  hr: 'Recursos Humanos',
  services: 'Servicios',
  restaurant: 'Restaurante',
  marketing: 'Marketing',
  storefront: 'Storefront',
  external: 'Servicios Externos',
};

const GROUP_ICONS = {
  frontends: Server,
  modules: Layers,
  infrastructure: Server,
  core: Layers,
  finance: Database,
  external: Zap,
};

const formatLatency = (ms) => {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

const formatRelativeTime = (timestamp) => {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 5000) return 'hace un momento';
  if (diff < 60000) return `hace ${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `hace ${Math.floor(diff / 60000)} min`;
  return `hace ${Math.floor(diff / 3600000)} h`;
};

// ─── Subcomponents ────────────────────────────────────────────────────────────

const StatusIndicator = ({ status, size = 'sm' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.warning;
  const Icon = config.icon;
  const sizeClass = size === 'lg' ? 'h-6 w-6' : size === 'md' ? 'h-5 w-5' : 'h-4 w-4';
  return <Icon className={`${sizeClass} ${config.color}`} />;
};

const OverallStatusCard = ({ overall, summary, timestamp, loading, onRefresh }) => {
  const config = OVERALL_CONFIG[overall] || OVERALL_CONFIG.degraded;
  const Icon = config.icon;
  const successRate = summary?.totalChecks
    ? Math.round((summary.passed / summary.totalChecks) * 100)
    : 0;

  return (
    <Card className={`border-2 ${config.border} ${config.bg}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${config.bg} ${config.border} border`}>
              <Icon className={`h-8 w-8 ${config.color}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${config.color}`}>{config.label}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {timestamp && `Última verificación: ${formatRelativeTime(timestamp)}`}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refrescar
          </Button>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total checks</p>
              <p className="text-2xl font-bold mt-1">{summary.totalChecks}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Éxito</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">{summary.passed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Advertencias</p>
              <p className="text-2xl font-bold mt-1 text-amber-500">{summary.warnings}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Errores</p>
              <p className="text-2xl font-bold mt-1 text-rose-500">{summary.failed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Tasa de éxito</p>
              <p className="text-2xl font-bold mt-1">{successRate}%</p>
            </div>
          </div>
        )}

        {summary && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Latencia total acumulada: {formatLatency(summary.totalLatencyMs)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const NodeRow = ({ node }) => {
  const config = STATUS_CONFIG[node.status] || STATUS_CONFIG.warning;
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center justify-between py-2.5 px-3 rounded-md hover:bg-muted/40 transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <StatusIndicator status={node.status} />
        <span className="font-medium truncate">{node.name}</span>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground flex-shrink-0">
        <span className="truncate max-w-[200px] text-xs">{node.details}</span>
      </div>
    </motion.div>
  );
};

const GroupCard = ({ groupKey, nodes, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const Icon = GROUP_ICONS[groupKey] || Layers;
  const label = GROUP_LABELS[groupKey] || groupKey;

  const stats = useMemo(() => {
    const ok = nodes.filter((n) => n.status === 'ok').length;
    const warn = nodes.filter((n) => n.status === 'warning').length;
    const err = nodes.filter((n) => n.status === 'error').length;
    return { ok, warn, err, total: nodes.length };
  }, [nodes]);

  const groupStatus = stats.err > 0 ? 'error' : stats.warn > 0 ? 'warning' : 'ok';
  const config = STATUS_CONFIG[groupStatus];

  return (
    <Card className={`border ${config.border}`}>
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full text-left"
      >
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <Icon className={`h-5 w-5 ${config.color}`} />
              <CardTitle className="text-base font-semibold">{label}</CardTitle>
              <Badge variant="outline" className="ml-1 text-xs">
                {stats.total}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {stats.ok > 0 && (
                <span className="text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {stats.ok}
                </span>
              )}
              {stats.warn > 0 && (
                <span className="text-amber-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {stats.warn}
                </span>
              )}
              {stats.err > 0 && (
                <span className="text-rose-500 flex items-center gap-1">
                  <XCircle className="h-3.5 w-3.5" />
                  {stats.err}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <CardContent className="pt-0 pb-2 px-2">
              <div className="space-y-0.5">
                {nodes.map((node) => (
                  <NodeRow key={node.id} node={node} />
                ))}
              </div>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
};

const ConnectionsList = ({ connections }) => {
  const failedConnections = connections.filter((c) => c.status === 'error');
  const slowConnections = connections
    .filter((c) => c.status === 'ok' && c.latencyMs > 200)
    .sort((a, b) => b.latencyMs - a.latencyMs)
    .slice(0, 5);

  if (failedConnections.length === 0 && slowConnections.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
          <p>Todas las conexiones operan dentro de parámetros normales</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {failedConnections.length > 0 && (
        <Card className="border-rose-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-rose-500">
              <XCircle className="h-5 w-5" />
              Conexiones fallidas ({failedConnections.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {failedConnections.map((conn) => (
              <div
                key={conn.id}
                className="p-3 rounded-md bg-rose-500/5 border border-rose-500/20"
              >
                <p className="font-medium text-sm">{conn.name}</p>
                {conn.error && (
                  <p className="text-xs text-rose-400 mt-1 font-mono">{conn.error}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {slowConnections.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Conexiones más lentas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-1">
            {slowConnections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/40"
              >
                <span className="text-sm">{conn.name}</span>
                <Badge variant="outline" className="text-xs">
                  {formatLatency(conn.latencyMs)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AUTO_REFRESH_INTERVAL = 30_000;

export default function SuperAdminMaintenance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchApi('/health/system-map');
      const payload = response?.data || response;
      setData(payload);
    } catch (err) {
      const message = err?.message || 'Error al obtener el estado del sistema';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchHealth, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchHealth]);

  // Group nodes by their `group` field
  const groupedNodes = useMemo(() => {
    if (!data?.nodes) return {};
    return data.nodes.reduce((acc, node) => {
      const group = node.group || 'other';
      if (!acc[group]) acc[group] = [];
      acc[group].push(node);
      return acc;
    }, {});
  }, [data]);

  // Order groups: frontends → modules → infrastructure → others (by errors, then alphabetic)
  const orderedGroups = useMemo(() => {
    const PRIORITY = { frontends: 0, modules: 1, infrastructure: 2 };
    const entries = Object.entries(groupedNodes);
    return entries.sort(([a, aNodes], [b, bNodes]) => {
      const pa = PRIORITY[a] ?? 99;
      const pb = PRIORITY[b] ?? 99;
      if (pa !== pb) return pa - pb;
      const aErrors = aNodes.filter((n) => n.status === 'error').length;
      const bErrors = bNodes.filter((n) => n.status === 'error').length;
      if (aErrors !== bErrors) return bErrors - aErrors;
      return (GROUP_LABELS[a] || a).localeCompare(GROUP_LABELS[b] || b);
    });
  }, [groupedNodes]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Verificando salud del sistema...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Card className="border-rose-500/30">
        <CardContent className="p-6 text-center">
          <XCircle className="h-12 w-12 text-rose-500 mx-auto mb-3" />
          <p className="text-rose-500 font-semibold mb-2">Error al cargar el estado</p>
          <p className="text-muted-foreground text-sm mb-4">{error}</p>
          <Button onClick={fetchHealth} variant="outline">
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Mantenimiento del Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoreo en tiempo real de la salud de SmartKubik
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('map')}
              className="gap-1.5 h-7"
            >
              <Network className="h-3.5 w-3.5" />
              Mapa
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="gap-1.5 h-7"
            >
              <List className="h-3.5 w-3.5" />
              Lista
            </Button>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="cursor-pointer"
            />
            Auto-refresh (30s)
          </label>
        </div>
      </div>

      <OverallStatusCard
        overall={data?.overallStatus}
        summary={data?.summary}
        timestamp={data?.timestamp}
        loading={loading}
        onRefresh={fetchHealth}
      />

      {viewMode === 'map' ? (
        <div className="space-y-4">
          <SystemTopologyMap systemMap={data} />
          <ConnectionsList connections={data?.connections || []} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="text-xl font-semibold">Nodos por dominio</h2>
            {orderedGroups.map(([groupKey, nodes]) => (
              <GroupCard
                key={groupKey}
                groupKey={groupKey}
                nodes={nodes}
                defaultOpen={
                  groupKey === 'infrastructure' ||
                  nodes.some((n) => n.status === 'error')
                }
              />
            ))}
          </div>

          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Conexiones</h2>
            <ConnectionsList connections={data?.connections || []} />
          </div>
        </div>
      )}
    </div>
  );
}
