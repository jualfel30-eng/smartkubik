import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  deleteTaskQueueJob,
  getTaskQueueStats,
  listTaskQueueJobs,
  purgeTaskQueueJobs,
  retryTaskQueueJob,
} from '@/lib/api';
import { createScopedLogger } from '@/lib/logger';
import { Activity, RefreshCcw, RotateCcw, Trash2 } from 'lucide-react';

const logger = createScopedLogger('queue-monitor');

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'active', label: 'En progreso' },
  { value: 'failed', label: 'Fallidos' },
];

const formatDateTime = (isoString) => {
  if (!isoString) {
    return '—';
  }
  try {
    return new Date(isoString).toLocaleString();
  } catch {
    return '—';
  }
};

const summarizePayload = (payloadSummary) => {
  if (!payloadSummary || typeof payloadSummary !== 'object') {
    return '—';
  }

  return Object.entries(payloadSummary)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' • ');
};

export default function QueueMonitor() {
  const [stats, setStats] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('failed');
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const supportsPersistence = stats?.supportsPersistence ?? false;

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await getTaskQueueStats();
      setStats(response);
    } catch (error) {
      logger.error('No se pudo obtener el estado de la cola', { message: error.message });
      toast.error('No se pudo cargar el estado de la cola.', {
        description: error.message,
      });
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoadingJobs(true);
    try {
      const response = await listTaskQueueJobs({
        status: statusFilter,
        limit: 25,
      });
      setJobs(Array.isArray(response) ? response : []);
    } catch (error) {
      logger.error('No se pudo listar los trabajos de la cola', { message: error.message });
      toast.error('No se pudieron cargar los trabajos de la cola.', {
        description: error.message,
      });
    } finally {
      setLoadingJobs(false);
    }
  }, [statusFilter]);

  const handleRefresh = useCallback(async () => {
    await Promise.all([loadStats(), loadJobs()]);
  }, [loadJobs, loadStats]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  const statusIndicators = useMemo(() => {
    if (!stats) {
      return [];
    }

    return [
      { label: 'Pendientes', value: stats.pending },
      { label: 'En progreso', value: stats.active },
      { label: 'Fallidos', value: stats.failed },
      { label: 'Diferidos', value: stats.delayed },
    ];
  }, [stats]);

  const handleRetry = async (jobId) => {
    if (!supportsPersistence) {
      toast.warning('El driver en memoria no soporta reintentos manuales.');
      return;
    }

    try {
      await retryTaskQueueJob(jobId);
      toast.success('Trabajo reenviado correctamente.');
      await Promise.all([loadStats(), loadJobs()]);
    } catch (error) {
      logger.error('No se pudo reenviar el trabajo', { jobId, message: error.message });
      toast.error('No se pudo reenviar el trabajo.', {
        description: error.message,
      });
    }
  };

  const handleDelete = async (jobId) => {
    if (!supportsPersistence) {
      toast.warning('El driver en memoria no soporta eliminaciones manuales.');
      return;
    }

    try {
      await deleteTaskQueueJob(jobId);
      toast.success('Trabajo eliminado de la cola.');
      await Promise.all([loadStats(), loadJobs()]);
    } catch (error) {
      logger.error('No se pudo eliminar el trabajo', { jobId, message: error.message });
      toast.error('No se pudo eliminar el trabajo.', {
        description: error.message,
      });
    }
  };

  const handlePurgeFailed = async () => {
    if (!supportsPersistence) {
      toast.warning('El driver en memoria no soporta limpiezas masivas.');
      return;
    }

    try {
      const result = await purgeTaskQueueJobs({ status: 'failed', olderThanMinutes: 60 });
      const deleted = result?.deleted ?? 0;
      toast.success(`Se eliminaron ${deleted} trabajos fallidos antiguos.`);
      await Promise.all([loadStats(), loadJobs()]);
    } catch (error) {
      logger.error('No se pudo purgar la cola', { message: error.message });
      toast.error('No se pudo purgar la cola.', {
        description: error.message,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Monitor de Cola de Tareas</h1>
          <p className="text-sm text-muted-foreground">
            Observa el estado de los trabajos diferidos y actúa sobre fallos críticos.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loadingStats || loadingJobs}
          >
            <RefreshCcw className={`h-4 w-4 ${loadingStats || loadingJobs ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            variant="destructive"
            onClick={handlePurgeFailed}
            disabled={!supportsPersistence || loadingStats || loadingJobs}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Purgar fallidos (&gt;60m)
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Estado actual
            </CardTitle>
            <CardDescription>
              Driver: {stats?.driver ?? '—'} · Concurrencia {stats?.concurrency ?? '—'} · Intentos máx. {stats?.maxAttempts ?? '—'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={supportsPersistence ? 'default' : 'secondary'}>
              {supportsPersistence ? 'Persistente (Mongo)' : 'En memoria'}
            </Badge>
            {stats?.nextAvailableAt && (
              <Badge variant="outline">
                Próximo job: {formatDateTime(stats.nextAvailableAt)}
              </Badge>
            )}
            {stats?.lastFailureAt && (
              <Badge variant="outline">
                Último fallo: {formatDateTime(stats.lastFailureAt)}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loadingStats && !stats ? (
            <p className="text-sm text-muted-foreground">Cargando métricas de la cola...</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statusIndicators.map((indicator) => (
                <div key={indicator.label} className="rounded-lg border border-border bg-card px-4 py-3">
                  <p className="text-sm text-muted-foreground">{indicator.label}</p>
                  <p className="text-2xl font-semibold text-foreground">{indicator.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Trabajos ({statusFilter === 'all' ? 'todos los estados' : statusFilter})</CardTitle>
          <CardDescription>
            {supportsPersistence
              ? 'Puedes reintentar o eliminar trabajos fallidos directamente desde aquí.'
              : 'El driver en memoria no admite acciones administrativas. Solo se muestra el estado actual.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingJobs ? (
            <p className="text-sm text-muted-foreground">Cargando trabajos...</p>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay trabajos registrados para el filtro seleccionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Intentos</TableHead>
                    <TableHead>Disponible desde</TableHead>
                    <TableHead>Última actualización</TableHead>
                    <TableHead>Payload</TableHead>
                    {supportsPersistence && <TableHead className="text-right">Acciones</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {jobs.map((job, index) => (
                    <TableRow key={job.id ?? `${job.type}-${index}`}>
                      <TableCell className="font-mono text-xs">{job.id ?? '—'}</TableCell>
                      <TableCell>{job.type}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            job.status === 'failed'
                              ? 'destructive'
                              : job.status === 'active'
                                ? 'default'
                                : 'secondary'
                          }
                        >
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{job.attempts}</TableCell>
                      <TableCell>{formatDateTime(job.availableAt)}</TableCell>
                      <TableCell>{formatDateTime(job.updatedAt)}</TableCell>
                      <TableCell className="max-w-xs text-sm text-muted-foreground">
                        {summarizePayload(job.payloadSummary)}
                      </TableCell>
                      {supportsPersistence && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRetry(job.id)}
                              disabled={!job.supportsRetry || !job.id}
                              title="Reintentar"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(job.id)}
                              disabled={!job.id}
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
