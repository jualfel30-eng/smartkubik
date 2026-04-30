import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Copy,
  Check,
  Calendar,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Inbox,
  GitCommit,
  FileEdit,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import WikiViewer from './WikiViewer';

// ─── Status Configuration ─────────────────────────────────────────────────────

const HEALTH_CONFIG = {
  no_pending: {
    label: 'Wiki actualizada',
    description: 'No hay cambios pendientes de documentar',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  on_track: {
    label: 'Al día',
    description: 'Hay pendientes pero todavía estás dentro del plazo',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  due: {
    label: 'Sincronización próxima',
    description: 'Toca sincronizar pronto',
    color: 'text-sky-500',
    bg: 'bg-sky-500/10',
    border: 'border-sky-500/30',
    icon: Clock,
  },
  never_synced: {
    label: 'Nunca sincronizada',
    description: 'Hay pendientes y aún no se ha hecho la primera sincronización',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  overdue: {
    label: 'Sincronización vencida',
    description: 'Pasó el plazo configurado',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: AlertTriangle,
  },
  very_overdue: {
    label: 'Muy vencida',
    description: 'La wiki podría estar significativamente desactualizada',
    color: 'text-rose-500',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: XCircle,
  },
};

const TABS = [
  { id: 'status', label: 'Estado', icon: BookOpen },
  { id: 'wiki', label: 'Wiki', icon: FileEdit },
  { id: 'pending', label: 'Pendientes', icon: Inbox },
  { id: 'history', label: 'Historial', icon: HistoryIcon },
  { id: 'settings', label: 'Ajustes', icon: SettingsIcon },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatRelativeDays = (status) => {
  if (status.healthStatus === 'no_pending') return 'todo al día';
  if (!status.lastSyncAt) return 'aún no sincronizada';
  if (status.daysOverdue > 0) {
    return status.daysOverdue === 1
      ? 'vencida hace 1 día'
      : `vencida hace ${status.daysOverdue} días`;
  }
  if (status.daysUntilDue !== null) {
    if (status.daysUntilDue === 0) return 'vence hoy';
    if (status.daysUntilDue === 1) return 'vence mañana';
    return `vence en ${status.daysUntilDue} días`;
  }
  return '—';
};

const buildSyncPrompt = (entries) => {
  const entryList = entries.length
    ? entries
        .map(
          (e, i) =>
            `${i + 1}. ${e.timestamp} — ${e.commitHash} — ${e.message}\n   Módulos afectados: ${e.modules.map((m) => m.module).join(', ')}`,
        )
        .join('\n\n')
    : '(no hay entradas pendientes en este momento)';

  return `Lee el archivo WIKI-AGENT-PROMPT.md en la raíz del proyecto. Ese es tu prompt fundacional.

Tu tarea ahora es procesar el inbox de cambios pendientes en docs/wiki/.pending-reviews.md.

Para cada commit en el inbox:
1. Lee los archivos fuente afectados
2. Determina si el cambio implica actualizar documentación existente o crear nueva
3. Aplica los cambios necesarios siguiendo las plantillas y reglas del prompt fundacional
4. NO marques como sincronizado al terminar — eso lo hago yo desde el panel de super-admin

Pendientes actuales (${entries.length}):

${entryList}

Cuando termines, dame un resumen de qué docs creaste/modificaste.`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusCard({ status, onMarkSynced, onCopyPrompt, copied }) {
  const config =
    HEALTH_CONFIG[status?.healthStatus] || HEALTH_CONFIG.never_synced;
  const Icon = config.icon;

  return (
    <Card className={`border-2 ${config.border} ${config.bg}`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-full ${config.bg} ${config.border} border`}>
              <Icon className={`h-8 w-8 ${config.color}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${config.color}`}>
                {config.label}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Pendientes
            </p>
            <p className="text-3xl font-bold mt-1">{status?.pendingCount ?? 0}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Última sync
            </p>
            <p className="text-sm font-semibold mt-1">
              {status?.lastSyncAt ? formatDate(status.lastSyncAt) : 'Nunca'}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Próxima
            </p>
            <p className="text-sm font-semibold mt-1">
              {formatRelativeDays(status || {})}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Intervalo
            </p>
            <p className="text-sm font-semibold mt-1">
              cada {status?.intervalDays ?? 3} días
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button
            variant="default"
            onClick={onCopyPrompt}
            disabled={!status || status.pendingCount === 0}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Prompt copiado
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Copiar prompt para Claude Code
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onMarkSynced}
            disabled={!status || status.pendingCount === 0}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Marcar como sincronizado
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PendingReviewItem({ entry }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <GitCommit className="h-3.5 w-3.5" />
            <code className="font-mono">{entry.commitHash}</code>
            <span>·</span>
            <span>{entry.timestamp}</span>
            <span>·</span>
            <span>{entry.author}</span>
          </div>
        </div>
        <p className="text-sm font-medium mb-3">{entry.message}</p>

        {entry.modules.length > 0 && (
          <div className="space-y-2">
            {entry.modules.map((mod, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 text-xs bg-muted/40 rounded-md p-2"
              >
                <FileEdit className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {mod.module}
                    </Badge>
                    {mod.changeTypes.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">
                        {t}
                      </Badge>
                    ))}
                  </div>
                  {mod.files.length > 0 && (
                    <p className="text-muted-foreground truncate">
                      {mod.files.slice(0, 3).join(', ')}
                      {mod.files.length > 3 && ` +${mod.files.length - 3} más`}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HistoryEntry({ event }) {
  return (
    <Card className="border border-border">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Check className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold">
                {event.entriesProcessed} entrada
                {event.entriesProcessed === 1 ? '' : 's'} sincronizada
                {event.entriesProcessed === 1 ? '' : 's'}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatDate(event.timestamp)}
                {event.triggeredByName && ` · por ${event.triggeredByName}`}
              </p>
              {event.notes && (
                <p className="text-xs text-muted-foreground italic mt-1">
                  "{event.notes}"
                </p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminDocumentation() {
  const [activeTab, setActiveTab] = useState('status');
  const [status, setStatus] = useState(null);
  const [pending, setPending] = useState({ entries: [], fileExists: false });
  const [history, setHistory] = useState([]);
  const [config, setConfig] = useState({ intervalDays: 3 });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncNotes, setSyncNotes] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [intervalInput, setIntervalInput] = useState('3');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statusRes, pendingRes, historyRes, configRes] = await Promise.all([
        fetchApi('/admin/wiki/status'),
        fetchApi('/admin/wiki/pending-reviews'),
        fetchApi('/admin/wiki/history?limit=20'),
        fetchApi('/admin/wiki/config'),
      ]);
      setStatus(statusRes.data);
      setPending(pendingRes.data);
      setHistory(historyRes.data || []);
      setConfig(configRes.data);
      setIntervalInput(String(configRes.data?.intervalDays ?? 3));
    } catch (err) {
      toast.error(err?.message || 'Error al cargar el estado de la wiki');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const handleCopyPrompt = useCallback(async () => {
    const prompt = buildSyncPrompt(pending.entries);
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Prompt copiado al portapapeles');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      toast.error('No se pudo copiar al portapapeles');
    }
  }, [pending.entries]);

  const handleMarkSynced = useCallback(async () => {
    setSyncing(true);
    try {
      await fetchApi('/admin/wiki/sync', {
        method: 'POST',
        body: { notes: syncNotes || undefined },
      });
      toast.success('Wiki marcada como sincronizada');
      setSyncDialogOpen(false);
      setSyncNotes('');
      await loadAll();
    } catch (err) {
      toast.error(err?.message || 'Error al marcar como sincronizado');
    } finally {
      setSyncing(false);
    }
  }, [syncNotes, loadAll]);

  const handleSaveConfig = useCallback(async () => {
    const days = parseInt(intervalInput, 10);
    if (isNaN(days) || days < 1 || days > 30) {
      toast.error('El intervalo debe estar entre 1 y 30 días');
      return;
    }
    setSavingConfig(true);
    try {
      await fetchApi('/admin/wiki/config', {
        method: 'PUT',
        body: { intervalDays: days },
      });
      toast.success('Intervalo actualizado');
      await loadAll();
    } catch (err) {
      toast.error(err?.message || 'Error al guardar la configuración');
    } finally {
      setSavingConfig(false);
    }
  }, [intervalInput, loadAll]);

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-primary" />
            Documentación
          </h1>
          <p className="text-muted-foreground mt-1">
            Gestiona la sincronización de la wiki del proyecto
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadAll}
          disabled={loading}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showBadge =
            tab.id === 'pending' && status?.pendingCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 transition-colors text-sm font-medium ${
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              {showBadge && (
                <Badge variant="destructive" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                  {status.pendingCount}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {activeTab === 'status' && (
            <div className="space-y-4">
              <StatusCard
                status={status}
                onMarkSynced={() => setSyncDialogOpen(true)}
                onCopyPrompt={handleCopyPrompt}
                copied={copied}
              />

              {status?.pendingCount > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Cómo sincronizar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2 pt-0">
                    <p>
                      <strong className="text-foreground">1.</strong> Haz clic en
                      "Copiar prompt para Claude Code". El prompt incluye la
                      lista actual de pendientes.
                    </p>
                    <p>
                      <strong className="text-foreground">2.</strong> Abre Claude
                      Code en la raíz del proyecto y pega el prompt. El agente
                      bibliotecario procesará los pendientes y actualizará la
                      wiki.
                    </p>
                    <p>
                      <strong className="text-foreground">3.</strong> Cuando
                      termine, vuelve aquí y haz clic en "Marcar como
                      sincronizado". Eso archiva los pendientes y reinicia el
                      contador.
                    </p>
                    <p className="text-xs italic pt-2 border-t border-border/50 mt-3">
                      Nota: en una próxima fase, este botón disparará al agente
                      directamente vía Anthropic Managed Agents — sin pasar por
                      Claude Code local.
                    </p>
                  </CardContent>
                </Card>
              )}

              {!status?.pendingFileExists && status?.pendingCount === 0 && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p>No se encontró archivo de pendientes en el servidor.</p>
                    <p className="text-xs mt-1">
                      Path: <code>{status?.wikiPath}/.pending-reviews.md</code>
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'wiki' && <WikiViewer />}

          {activeTab === 'pending' && (
            <div className="space-y-3">
              {pending.entries.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay cambios pendientes</p>
                    <p className="text-sm mt-1">
                      La wiki está sincronizada con el código actual
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {pending.entries.length} commit
                    {pending.entries.length === 1 ? '' : 's'} esperando
                    documentación
                  </p>
                  {pending.entries.map((entry, idx) => (
                    <PendingReviewItem key={`${entry.commitHash}-${idx}`} entry={entry} />
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-3">
              {history.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <HistoryIcon className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">Sin historial todavía</p>
                    <p className="text-sm mt-1">
                      Aquí aparecerán las sincronizaciones que vayas marcando
                    </p>
                  </CardContent>
                </Card>
              ) : (
                history.map((event) => (
                  <HistoryEntry key={event._id} event={event} />
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Intervalo de sincronización
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="interval" className="text-sm">
                    ¿Cada cuántos días debería revisarse la wiki?
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1 mb-3">
                    Cuando se exceda este plazo y haya pendientes, el panel
                    marcará la wiki como vencida. Recomendado: 2-3 días.
                  </p>
                  <div className="flex items-center gap-3">
                    <Input
                      id="interval"
                      type="number"
                      min={1}
                      max={30}
                      value={intervalInput}
                      onChange={(e) => setIntervalInput(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">días</span>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={
                        savingConfig ||
                        intervalInput === String(config.intervalDays)
                      }
                      size="sm"
                    >
                      {savingConfig ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mark as Synced Dialog */}
      <Dialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como sincronizado</DialogTitle>
            <DialogDescription>
              Esto archiva los {status?.pendingCount ?? 0} pendientes actuales y
              reinicia el contador. Hazlo solo si ya procesaste los cambios en la
              wiki.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">
              Notas (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="¿Qué docs creaste/modificaste? ¿Algún detalle importante?"
              value={syncNotes}
              onChange={(e) => setSyncNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSyncDialogOpen(false)}
              disabled={syncing}
            >
              Cancelar
            </Button>
            <Button onClick={handleMarkSynced} disabled={syncing}>
              {syncing ? 'Marcando...' : 'Confirmar sincronización'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
