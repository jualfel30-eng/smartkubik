import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';
import { fetchApi } from '@/lib/api.js';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip.jsx';
import { Bell, CalendarDays, CheckCircle2, Clock3, Info, RefreshCw, TriangleAlert } from 'lucide-react';

const statusLabels = {
  draft: { label: 'Borrador', variant: 'outline' },
  open: { label: 'Abierto', variant: 'default' },
  closed: { label: 'Cerrado', variant: 'secondary' },
  posted: { label: 'Publicado', variant: 'secondary' },
};

const frequencyLabels = {
  monthly: 'Mensual',
  biweekly: 'Quincenal',
  weekly: 'Semanal',
  custom: 'Personalizado',
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-VE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const ComplianceBadge = ({ ok, label, count }) => {
  if (ok) {
    return (
      <Badge variant="outline" className="gap-1 text-green-600 border-green-600/40">
        <CheckCircle2 className="size-3.5" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <TriangleAlert className="size-3.5" />
      {label}
      {typeof count === 'number' ? ` (${count})` : null}
    </Badge>
  );
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const PayrollCalendarTimeline = () => {
  const { tenant, hasPermission } = useAuth();
  const navigate = useNavigate();
  const payrollEnabled = Boolean(tenant?.enabledModules?.payroll);
  const canRead = hasPermission ? hasPermission('payroll_employees_read') : false;
  const canWrite = hasPermission ? hasPermission('payroll_employees_write') : false;

  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ frequency: 'all', status: 'all' });
  const [generateForm, setGenerateForm] = useState({
    frequency: 'monthly',
    count: 2,
    anchorDate: '',
    cutoffOffsetDays: 5,
    payDateOffsetDays: 0,
  });
  const [generating, setGenerating] = useState(false);
  const [mutatingId, setMutatingId] = useState('');

  const loadCalendars = useCallback(async () => {
    if (!payrollEnabled || !canRead) return;
    setLoading(true);
    try {
      const data = await fetchApi('/payroll-calendar');
      setCalendars(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el calendario de nómina');
    } finally {
      setLoading(false);
    }
  }, [payrollEnabled, canRead]);

  useEffect(() => {
    loadCalendars();
  }, [payrollEnabled, canRead, loadCalendars]);

  const handleGenerate = async () => {
    if (!canWrite) {
      toast.error('No tienes permisos para generar períodos');
      return;
    }
    setGenerating(true);
    try {
      const cutoffOffsetDays = Number(generateForm.cutoffOffsetDays);
      const payDateOffsetDays = Number(generateForm.payDateOffsetDays);

      const payload = {
        ...generateForm,
        count: Number(generateForm.count) || 1,
        cutoffOffsetDays: Number.isFinite(cutoffOffsetDays) ? cutoffOffsetDays : 0,
        payDateOffsetDays: Number.isFinite(payDateOffsetDays) ? payDateOffsetDays : 0,
      };
      if (!payload.anchorDate) {
        delete payload.anchorDate;
      }
      await fetchApi('/payroll-calendar/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Períodos generados');
      setGenerateForm((prev) => ({ ...prev, anchorDate: '' }));
      loadCalendars();
    } catch (error) {
      toast.error(error.message || 'No se pudieron generar los períodos');
    } finally {
      setGenerating(false);
    }
  };

  const triggerTransition = async (calendarId, action) => {
    if (!canWrite) {
      toast.error('No tienes permisos para actualizar el calendario');
      return;
    }
    setMutatingId(`${calendarId}:${action}`);
    try {
      await fetchApi(`/payroll-calendar/${calendarId}/${action}`, { method: 'PATCH' });
      toast.success(action === 'close' ? 'Período cerrado' : 'Período reabierto');
      loadCalendars();
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el período');
    } finally {
      setMutatingId('');
    }
  };

  const filteredCalendars = useMemo(() => {
    return calendars.filter((calendar) => {
      if (filters.frequency !== 'all' && calendar.frequency !== filters.frequency) {
        return false;
      }
      if (filters.status !== 'all' && calendar.status !== filters.status) {
        return false;
      }
      return true;
    });
  }, [calendars, filters]);

  const latestCalendar = calendars[0];

  if (!payrollEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de nómina deshabilitado</CardTitle>
          <CardDescription>Activa el módulo para visualizar los calendarios.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permisos insuficientes</CardTitle>
          <CardDescription>Solicita acceso con permiso `payroll_employees_read`.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendario de Nómina</h1>
          <p className="text-muted-foreground">
            Controla períodos, alertas operativas y cierra únicamente cuando la ejecución está lista.
          </p>
        </div>
        {latestCalendar ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            Último período generado: {formatDate(latestCalendar.periodStart)} – {formatDate(latestCalendar.periodEnd)}
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Generar períodos</CardTitle>
          <CardDescription>
            Automatiza la creación de calendarios por frecuencia. Evita traslapes y fija recordatorios.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>Frecuencia</Label>
            <Select
              value={generateForm.frequency}
              onValueChange={(value) => setGenerateForm((prev) => ({ ...prev, frequency: value }))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona frecuencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensual</SelectItem>
                <SelectItem value="biweekly">Quincenal</SelectItem>
                <SelectItem value="weekly">Semanal</SelectItem>
                <SelectItem value="custom">Personalizada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label># de períodos</Label>
            <Input
              type="number"
              min={1}
              max={12}
              value={generateForm.count}
              onChange={(event) =>
                setGenerateForm((prev) => ({ ...prev, count: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de inicio (opcional)</Label>
            <Input
              type="date"
              value={generateForm.anchorDate}
              onChange={(event) =>
                setGenerateForm((prev) => ({ ...prev, anchorDate: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Días antes de pago para corte</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={generateForm.cutoffOffsetDays}
              onChange={(event) =>
                setGenerateForm((prev) => ({ ...prev, cutoffOffsetDays: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Días después del período para pago</Label>
            <Input
              type="number"
              min={0}
              max={30}
              value={generateForm.payDateOffsetDays}
              onChange={(event) =>
                setGenerateForm((prev) => ({ ...prev, payDateOffsetDays: event.target.value }))
              }
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleGenerate} disabled={generating || !canWrite}>
            {generating ? 'Generando...' : 'Generar períodos'}
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Timeline de períodos</CardTitle>
            <CardDescription>
              Verifica alertas operativas y ejecuta cierres únicamente cuando todo está verde.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Frecuencia</Label>
              <Select
                value={filters.frequency}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, frequency: value }))}
              >
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Frecuencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                  <SelectItem value="biweekly">Quincenal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="custom">Personalizada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
              >
                <SelectTrigger className="min-w-[140px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="open">Abierto</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                  <SelectItem value="posted">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-32 w-full rounded-xl" />
            ))
          ) : filteredCalendars.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
              <CalendarDays className="size-10" />
              <p>No hay períodos para mostrar. Genera uno nuevo para comenzar.</p>
            </div>
          ) : (
            filteredCalendars.map((calendar) => {
              const statusMeta = statusLabels[calendar.status] || statusLabels.draft;
              const compliance = calendar.metadata?.complianceFlags || {};
              const structureSummary = calendar.metadata?.structureSummary;
              const reminders = calendar.metadata?.reminders || {};
              const lastDispatch = reminders.lastDispatch;
              const lastRecipients = Array.isArray(lastDispatch?.recipients)
                ? lastDispatch.recipients
                : [];
              const buttonsDisabled = mutatingId.startsWith(calendar._id);
              return (
                <Card key={calendar._id} className="border-muted-foreground/20">
                  <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
                        <Badge variant="outline">{frequencyLabels[calendar.frequency] || calendar.frequency}</Badge>
                        <Badge variant="outline">
                          {calendar.name || `Período ${formatDate(calendar.periodStart)}`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {calendar.description ||
                          `Del ${formatDate(calendar.periodStart)} al ${formatDate(calendar.periodEnd)}`}
                      </p>
                    </div>
                      <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock3 className="size-4" />
                          Corte: {formatDate(calendar.cutoffDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="size-4" />
                        Pago: {formatDate(calendar.payDate)}
                      </div>
                      {calendar.metadata?.lastRunLabel ? (
                        <div className="flex items-center gap-1">
                          <RefreshCw className="size-4" />
                          Última nómina: {calendar.metadata.lastRunLabel}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Bell className="size-4" />
                          {reminders?.cutoffReminderSentAt
                            ? `Recordatorio enviado ${formatDateTime(reminders.cutoffReminderSentAt)}`
                            : 'Recordatorio pendiente'}
                        </div>
                        {lastRecipients.length ? (
                          <Badge variant="outline" className="max-w-[260px] truncate">
                            Destinatarios: {lastRecipients.join(', ')}
                          </Badge>
                        ) : null}
                        {typeof lastDispatch?.successCount === 'number' ? (
                          <Badge variant="outline">
                            Entregados {lastDispatch?.successCount ?? 0} / {lastRecipients.length}
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Cobertura de estructuras</p>
                        <p className="text-2xl font-semibold">
                          {structureSummary?.coveragePercent ?? 0}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {structureSummary?.structuredEmployees ?? 0} empleados cubiertos ·{' '}
                          {structureSummary?.legacyEmployees ?? 0} legacy
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3">
                        <p className="text-xs uppercase text-muted-foreground">Nóminas ligadas</p>
                        <p className="text-2xl font-semibold">
                          {calendar.metadata?.runStats?.totalRuns ?? 0}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {calendar.metadata?.runStats?.pendingRuns ?? 0} pendientes
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/60 p-3 space-y-2">
                        <p className="text-xs uppercase text-muted-foreground">Alertas</p>
                        <div className="flex flex-wrap gap-2">
                          <ComplianceBadge
                            ok={!compliance.pendingRuns}
                            label="Runs completadas"
                            count={compliance.pendingRunCount}
                          />
                          <ComplianceBadge
                            ok={!compliance.pendingShifts}
                            label="Turnos cerrados"
                            count={compliance.pendingShiftCount}
                          />
                          {typeof compliance.approvedShiftCount === 'number' ? (
                            <Badge variant="outline">
                              Turnos aprobados: {compliance.approvedShiftCount}
                            </Badge>
                          ) : null}
                          <ComplianceBadge
                            ok={!compliance.expiredContracts}
                            label="Contratos vigentes"
                            count={compliance.expiredContractCount}
                          />
                          <ComplianceBadge
                            ok={!compliance.pendingAbsences}
                            label="Ausencias aprobadas"
                            count={compliance.pendingAbsenceCount}
                          />
                          {typeof compliance.pendingAbsenceDays === 'number' && compliance.pendingAbsenceDays > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              Días pendientes: {compliance.pendingAbsenceDays}
                            </Badge>
                          ) : null}
                          {typeof compliance.approvedAbsenceDays === 'number' && compliance.approvedAbsenceDays > 0 ? (
                            <Badge variant="outline" className="text-xs">
                              Días aprobados: {compliance.approvedAbsenceDays}
                            </Badge>
                          ) : null}
                          <ComplianceBadge
                            ok={compliance.structureCoverageOk !== false}
                            label="Cobertura 100%"
                            count={`${compliance.structureCoveragePercent ?? 0}%`}
                          />
                          <ComplianceBadge
                            ok={!!calendar.metadata?.reminders?.cutoffReminderSentAt}
                            label="Recordatorio enviado"
                          />
                        </div>
                        {(compliance.pendingRuns || compliance.pendingAbsences) ? (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {compliance.pendingRuns ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => navigate(`/payroll/runs/wizard?calendarId=${calendar._id}`)}
                              >
                                Abrir wizard
                              </Button>
                            ) : null}
                            {compliance.pendingAbsences ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  navigate(`/payroll/absences?status=pending&calendarId=${calendar._id}`)
                                }
                              >
                                Revisar ausencias
                              </Button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                      </div>
                    {calendar.metadata?.validationLog?.length ? (
                      <div className="rounded-lg border border-dashed border-border/60 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
                          <Info className="size-4" />
                          Bitácora de validaciones recientes
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {calendar.metadata.validationLog
                            .slice(-3)
                            .reverse()
                            .map((item, index) => (
                              <Tooltip key={index}>
                                <TooltipTrigger asChild>
                                  <Badge
                                    variant={item.success ? 'outline' : 'destructive'}
                                    className="cursor-default"
                                  >
                                    {formatDateTime(item.at)} · {item.success ? 'OK' : 'Bloqueado'}
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs space-y-1 text-xs">
                                  <div>{item.message || 'Validación ejecutada'}</div>
                                  <div>
                                    Runs pendientes: {item.pendingRuns} · Turnos pendientes: {item.pendingShifts} ·
                                    Ausencias: {item.pendingAbsences} (días pend: {item.pendingAbsenceDays ?? 0} / aprob: {item.approvedAbsenceDays ?? 0}) · Cobertura: {item.structureCoveragePercent ?? 0}%
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                  <CardFooter className="flex flex-col gap-3 border-t border-dashed border-border/60 p-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm text-muted-foreground">
                      Última actualización: {formatDate(calendar.updatedAt || calendar.metadata?.lastRunAt)}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {calendar.status === 'open' ? (
                        <Button
                          variant="secondary"
                          disabled={buttonsDisabled}
                          onClick={() => triggerTransition(calendar._id, 'close')}
                        >
                          {mutatingId === `${calendar._id}:close` ? 'Cerrando...' : 'Cerrar período'}
                        </Button>
                      ) : null}
                      {calendar.status === 'closed' ? (
                        <>
                          <Button
                            variant="outline"
                            disabled={buttonsDisabled}
                            onClick={() => triggerTransition(calendar._id, 'reopen')}
                          >
                            {mutatingId === `${calendar._id}:reopen` ? 'Reabriendo...' : 'Reabrir'}
                          </Button>
                          <Button
                            disabled={buttonsDisabled}
                            onClick={() => triggerTransition(calendar._id, 'close')}
                          >
                            {mutatingId === `${calendar._id}:close` ? 'Validando...' : 'Publicar'}
                          </Button>
                        </>
                      ) : null}
                      {calendar.status === 'draft' ? (
                        <Button
                          variant="secondary"
                          disabled={buttonsDisabled}
                          onClick={() => triggerTransition(calendar._id, 'close')}
                        >
                          {mutatingId === `${calendar._id}:close` ? 'Abriendo...' : 'Abrir período'}
                        </Button>
                      ) : null}
                    </div>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export default PayrollCalendarTimeline;
