import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { fetchApi, getApiBaseUrl } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import { useAuth } from '@/hooks/use-auth.jsx';
import { Loader2, CalendarClock, Users, CheckCircle2, Download, AlertTriangle, ArrowLeft } from 'lucide-react';

const WizardStep = ({ title, subtitle, active }) => (
  <div className="flex items-start gap-3">
    <div className={`mt-1 h-2.5 w-2.5 rounded-full ${active ? 'bg-primary' : 'bg-muted'}`} />
    <div>
      <p className="text-sm font-medium">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  </div>
);

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number') return '—';
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const PayrollRunWizard = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { tenant } = useAuth();

  const [step, setStep] = useState(1);
  const [loadingCalendars, setLoadingCalendars] = useState(false);
  const [calendars, setCalendars] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState(new Set());
  const [creating, setCreating] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [previousRun, setPreviousRun] = useState(null);

  const [form, setForm] = useState({
    calendarId: '',
    periodStart: '',
    periodEnd: '',
    label: '',
    searchEmployee: '',
  });

  const currency = tenant?.settings?.currency?.primary || 'USD';

  const toggleEmployee = (id) => {
    setSelectedEmployees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const loadCalendars = async () => {
    setLoadingCalendars(true);
    try {
      const data = await fetchApi('/payroll-calendar');
      const items = Array.isArray(data) ? data : data?.data || [];
      setCalendars(items);
      const preselectId = searchParams.get('calendarId');
      if (preselectId) {
        const found = items.find((c) => c._id === preselectId);
        if (found) {
          setForm((prev) => ({
            ...prev,
            calendarId: found._id,
            periodStart: formatDate(found.periodStart),
            periodEnd: formatDate(found.periodEnd),
            label: found.name || prev.label,
          }));
        }
      }
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el calendario');
    } finally {
      setLoadingCalendars(false);
    }
  };

  const loadPreviousRun = async () => {
    try {
      const params = new URLSearchParams({ page: '1', limit: '2' });
      const response = await fetchApi(`/payroll/runs?${params.toString()}`);
      const runs = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];
      if (runs.length) {
        setPreviousRun(runs[0]);
      }
    } catch (error) {
      setPreviousRun(null);
    }
  };

  const loadEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const params = new URLSearchParams({
        limit: '50',
        page: '1',
      });
      if (form.searchEmployee.trim()) {
        params.set('search', form.searchEmployee.trim());
      }
      const response = await fetchApi(`/payroll/employees?${params.toString()}`);
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.employees)
          ? response.employees
          : [];
      setEmployees(list);
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar empleados');
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    loadCalendars();
    loadEmployees();
    loadPreviousRun();
  }, []);

  const selectedCalendar = useMemo(
    () => calendars.find((c) => c._id === form.calendarId),
    [calendars, form.calendarId],
  );

  const handleCalendarChange = (value) => {
    const cal = calendars.find((c) => c._id === value);
    setForm((prev) => ({
      ...prev,
      calendarId: value,
      periodStart: formatDate(cal?.periodStart) || prev.periodStart,
      periodEnd: formatDate(cal?.periodEnd) || prev.periodEnd,
      label: cal?.name || prev.label,
    }));
  };

  const canContinueDates = form.periodStart && form.periodEnd;
  const canContinueEmployees = true; // si no seleccionas nadie, se procesan todos

  const goNext = () => {
    if (step === 1 && !canContinueDates) {
      toast.error('Selecciona las fechas del período.');
      return;
    }
    if (step === 2 && !canContinueEmployees) {
      toast.error('Selecciona al menos un empleado.');
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const handleCreate = async () => {
    if (!canContinueDates) {
      toast.error('Faltan fechas obligatorias');
      return;
    }
    setCreating(true);
    try {
      const payload = {
        calendarId: form.calendarId || undefined,
        periodType: selectedCalendar?.frequency || 'monthly',
        periodStart: new Date(form.periodStart).toISOString(),
        periodEnd: new Date(form.periodEnd).toISOString(),
        label: form.label || undefined,
        employeeIds: Array.from(selectedEmployees),
      };
      const response = await fetchApi('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setRunResult(response?.data || response);
      loadPreviousRun();
      toast.success('Nómina creada, revisa el resumen');
      setStep(3);
    } catch (error) {
      toast.error(error.message || 'No se pudo crear la nómina');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (runId, format) => {
    if (!runId) return;
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiBaseUrl()}/payroll/runs/${runId}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('No se pudo descargar');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${runId}.${format}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error.message || 'Error descargando');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wizard de nómina</h1>
          <p className="text-sm text-muted-foreground">
            Selecciona período, empleados a procesar, ejecuta cálculo y descarga recibos o resumen.
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/payroll/runs')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver al dashboard
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <WizardStep title="Período y calendario" subtitle="Fechas y frecuencia" active={step >= 1} />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <WizardStep title="Empleados" subtitle="Selecciona quienes entran en el ciclo" active={step >= 2} />
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <WizardStep title="Revisión y ejecución" subtitle="Confirmar y descargar" active={step >= 3} />
          </CardHeader>
        </Card>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Período y frecuencia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Calendario</Label>
                <Select value={form.calendarId} onValueChange={handleCalendarChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingCalendars ? 'Cargando…' : 'Elegir período generado (opcional)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((calendar) => (
                      <SelectItem key={calendar._id} value={calendar._id}>
                        {calendar.name || calendar.label || calendar.frequency} · {formatDate(calendar.periodStart)} - {formatDate(calendar.periodEnd)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Etiqueta</Label>
                <Input
                  placeholder="Ej: Nómina Quincena 1"
                  value={form.label}
                  onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Fecha inicio</Label>
                <Input
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodStart: e.target.value }))}
                />
              </div>
              <div>
                <Label>Fecha fin</Label>
                <Input
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm((prev) => ({ ...prev, periodEnd: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={loadCalendars} disabled={loadingCalendars}>
                {loadingCalendars && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Refrescar calendarios
              </Button>
              <Button onClick={goNext} disabled={!canContinueDates}>
                Siguiente
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Empleados a procesar
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="md:col-span-2">
                <Label>Búsqueda</Label>
                <Input
                  placeholder="Nombre, email o departamento"
                  value={form.searchEmployee}
                  onChange={(e) => setForm((prev) => ({ ...prev, searchEmployee: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      loadEmployees();
                    }
                  }}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={loadEmployees} disabled={loadingEmployees} className="w-full">
                  {loadingEmployees && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Aplicar filtros
                </Button>
              </div>
            </div>

            <Alert>
              <AlertTitle>Tip</AlertTitle>
              <AlertDescription>
                Si no seleccionas empleados, se procesarán todos los activos. Usa los filtros para delimitar.
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-72 rounded-md border">
              <div className="divide-y">
                {employees.map((employee) => {
                  const id = employee._id || employee.id;
                  const contract = employee.activeContract || employee.contract || {};
                  const isSelected = selectedEmployees.has(id);
                  return (
                    <label key={id} className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-muted">
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleEmployee(id)} />
                      <div className="flex-1">
                        <div className="font-medium">{employee.name || employee.fullName || 'Empleado'}</div>
                        <div className="text-xs text-muted-foreground">
                          {employee.department || contract.department || 'Sin depto'} · {contract.contractType || 'Contrato'}
                        </div>
                      </div>
                      {contract.payrollStructureId && (
                        <Badge variant="outline">Estructura asignada</Badge>
                      )}
                    </label>
                  );
                })}
                {!employees.length && (
                  <div className="p-4 text-sm text-muted-foreground">No hay empleados para los filtros actuales.</div>
                )}
              </div>
            </ScrollArea>

            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                Atrás
              </Button>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => { setSelectedEmployees(new Set()); toast.success('Se procesarán todos'); }}>
                  Seleccionar todos
                </Button>
                <Button onClick={goNext} disabled={!canContinueEmployees}>
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" /> Resumen y ejecución
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border p-4">
              <div className="grid gap-2 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {form.periodStart} → {form.periodEnd}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Empleados</p>
                  <p className="font-medium">
                    {selectedEmployees.size
                      ? `${selectedEmployees.size} seleccionados`
                      : 'Todos los activos'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Label</p>
                  <p className="font-medium">{form.label || 'Automática'}</p>
                </div>
              </div>
            </div>

            {runResult ? (
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">Nómina creada</p>
                    <p className="text-xs text-muted-foreground">
                      Neto: {formatCurrency(runResult.netPay || 0, currency)} · Empleados: {runResult.totalEmployees || 0}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => navigate('/payroll/runs')}>
                      Ir al dashboard
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDownload(runResult._id, 'pdf')}>
                      <Download className="mr-2 h-4 w-4" />
                      Resumen PDF
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => handleDownload(runResult._id, 'csv')}>
                      <Download className="mr-2 h-4 w-4" />
                      CSV
                    </Button>
                  </div>
                </div>
                {previousRun ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Variación neto vs anterior</p>
                      <p className="text-sm font-semibold">
                        {formatCurrency(runResult.netPay - (previousRun.netPay || 0), currency)}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Empleados vs anterior</p>
                      <p className="text-sm font-semibold">
                        {(runResult.totalEmployees || 0) - (previousRun.totalEmployees || 0)}
                      </p>
                    </div>
                    <div className="rounded-md border p-3">
                      <p className="text-xs text-muted-foreground">Estado anterior</p>
                      <p className="text-sm font-semibold capitalize">{previousRun.status || 'N/D'}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <Alert>
                <AlertTitle>Listo para calcular</AlertTitle>
                <AlertDescription>
                  Al confirmar se generará la nómina con los datos seleccionados y podrás descargar resumen o recibos.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={goBack}>
                Atrás
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {runResult ? 'Recalcular' : 'Calcular y crear nómina'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PayrollRunWizard;
