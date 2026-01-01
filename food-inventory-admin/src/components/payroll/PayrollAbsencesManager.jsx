import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';
import { fetchApi } from '@/lib/api.js';
import { HRNavigation } from '@/components/payroll/HRNavigation.jsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { CalendarDays, ShieldAlert, UserCheck, UserCircle } from 'lucide-react';

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'approved', label: 'Aprobadas' },
  { value: 'rejected', label: 'Rechazadas' },
];

const leaveTypeOptions = [
  { value: 'vacation', label: 'Vacaciones' },
  { value: 'sick', label: 'Permiso médico' },
  { value: 'unpaid', label: 'No remunerado' },
  { value: 'other', label: 'Otro' },
];

const statusBadge = {
  pending: { label: 'Pendiente', variant: 'outline' },
  approved: { label: 'Aprobada', variant: 'default' },
  rejected: { label: 'Rechazada', variant: 'destructive' },
};

const defaultForm = {
  employeeId: '',
  leaveType: 'vacation',
  startDate: '',
  endDate: '',
  reason: '',
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

export default function PayrollAbsencesManager() {
  const { tenant, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const payrollEnabled = Boolean(tenant?.enabledModules?.payroll);
  const canRead = hasPermission ? hasPermission('payroll_employees_read') : false;
  const canWrite = hasPermission ? hasPermission('payroll_employees_write') : false;

  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [calendarId, setCalendarId] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  const loadRequests = useCallback(async () => {
    if (!payrollEnabled || !canRead) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      if (calendarId) {
        params.append('calendarId', calendarId);
      }
      const query = params.toString() ? `?${params.toString()}` : '';
      const data = await fetchApi(`/payroll/absences/requests${query}`);
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar las solicitudes');
    } finally {
      setLoading(false);
    }
  }, [payrollEnabled, canRead, statusFilter, calendarId]);

  const loadEmployees = useCallback(async () => {
    if (!payrollEnabled || !canRead) return;
    setLoadingEmployees(true);
    try {
      // Backend caps limit at 100; request the max allowed to avoid 400
      const data = await fetchApi('/payroll/employees?limit=100&status=active');
      let records = Array.isArray(data?.data) ? data.data : data?.success ? data.data : [];
      // If there are no active employees, fallback to all statuses to aid testing
      if (!records.length) {
        const allData = await fetchApi('/payroll/employees?limit=100');
        records = Array.isArray(allData?.data) ? allData.data : allData?.success ? allData.data : [];
      }
      setEmployees(records);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('No se pudieron cargar los empleados activos');
    } finally {
      setLoadingEmployees(false);
    }
  }, [payrollEnabled, canRead]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const queryCalendarId = params.get('calendarId') || '';
    if (queryCalendarId) {
      setCalendarId(queryCalendarId);
    }
    loadEmployees();
  }, [loadEmployees, location.search]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((req) => req.status === 'pending').length;
    const approved = requests.filter((req) => req.status === 'approved').length;
    const rejected = requests.filter((req) => req.status === 'rejected').length;
    return { total, pending, approved, rejected };
  }, [requests]);

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp._id === form.employeeId),
    [employees, form.employeeId],
  );

  const handleCreate = async () => {
    if (!form.employeeId || !form.startDate || !form.endDate) {
      toast.error('Selecciona el empleado y las fechas');
      return;
    }
    setCreating(true);
    try {
      await fetchApi('/payroll/absences/requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: form.employeeId,
          employeeName:
            selectedEmployee?.fullName ||
            selectedEmployee?.name ||
            `${selectedEmployee?.firstName ?? ''} ${selectedEmployee?.lastName ?? ''}`.trim() ||
            selectedEmployee?.email ||
            'Empleado sin nombre',
          leaveType: form.leaveType,
          startDate: form.startDate,
          endDate: form.endDate,
          reason: form.reason || undefined,
        }),
      });
      toast.success('Solicitud creada');
      setDialogOpen(false);
      setForm(defaultForm);
      loadRequests();
    } catch (error) {
      toast.error(error.message || 'No se pudo registrar la ausencia');
    } finally {
      setCreating(false);
    }
  };

  const handleStatusUpdate = async (requestId, status) => {
    if (!canWrite) {
      toast.error('No tienes permisos para modificar la ausencia');
      return;
    }
    try {
      await fetchApi(`/payroll/absences/requests/${requestId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      toast.success(status === 'approved' ? 'Ausencia aprobada' : 'Ausencia rechazada');
      loadRequests();
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar la ausencia');
    }
  };

  const getEmployeeName = (employee) => {
    if (!employee) return 'Empleado sin nombre';
    const composedName = `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim();
    return (
      employee.fullName ||
      employee.name ||
      (composedName || employee.email || `ID: ${employee._id || employee.id || 'desconocido'}`)
    );
  };

  if (!payrollEnabled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Módulo de nómina</CardTitle>
          <CardDescription>Activa el módulo de Nómina para gestionar ausencias.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!canRead) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Permisos insuficientes</CardTitle>
          <CardDescription>Necesitas el permiso `payroll_employees_read`.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <HRNavigation />
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ausencias y permisos</h1>
          <p className="text-muted-foreground">
            Centraliza las solicitudes de ausencias y mantiene los balances actualizados antes de cada cierre.
          </p>
        </div>
        {calendarId ? (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">Calendario: {calendarId.slice(-6)}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setCalendarId('')}>
              Limpiar filtro
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/payroll/calendar?calendarId=${calendarId}`)}>
              Ir al calendario
            </Button>
          </div>
        ) : null}
        {canWrite && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>Registrar ausencia</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva solicitud</DialogTitle>
                <DialogDescription>Registra permisos, vacaciones o ausencias médicas.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select
                    value={form.employeeId}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, employeeId: value }))}
                    disabled={loadingEmployees}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingEmployees ? 'Cargando...' : 'Selecciona empleado'} />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {employees.map((employee) => (
                        <SelectItem key={employee._id || employee.id} value={employee._id || employee.id}>
                          {getEmployeeName(employee)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={form.leaveType}
                    onValueChange={(value) => setForm((prev) => ({ ...prev, leaveType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo de ausencia" />
                    </SelectTrigger>
                    <SelectContent>
                      {leaveTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Inicio</Label>
                    <Input
                      type="date"
                      value={form.startDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fin</Label>
                    <Input
                      type="date"
                      value={form.endDate}
                      onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Motivo (opcional)</Label>
                  <Textarea
                    rows={3}
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
                    placeholder="Describe el motivo o adjunta observaciones."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? 'Guardando...' : 'Guardar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitudes totales</CardTitle>
            <UserCircle className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Registradas en el período</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <ShieldAlert className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Requieren aprobación</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadas</CardTitle>
            <UserCheck className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">Aplicadas al balance</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos cortes</CardTitle>
            <CalendarDays className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Alertas en calendario</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Solicitudes</CardTitle>
            <CardDescription>Aprueba, rechaza o registra nuevas ausencias antes de cerrar la nómina.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="space-y-1">
              <Label className="text-xs uppercase text-muted-foreground">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="min-w-[120px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : requests.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              No hay solicitudes con el filtro seleccionado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fechas</TableHead>
                  <TableHead>Días</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((request) => {
                  const meta = statusBadge[request.status] || statusBadge.pending;
                  return (
                    <TableRow key={request._id}>
                      <TableCell className="whitespace-normal">
                        <div className="font-medium">{request.employeeName || request.employeeId}</div>
                        {request.reason ? (
                          <div className="text-xs text-muted-foreground max-w-sm">{request.reason}</div>
                        ) : null}
                      </TableCell>
                      <TableCell className="capitalize">{request.leaveType || '—'}</TableCell>
                      <TableCell>
                        {formatDate(request.startDate)} – {formatDate(request.endDate)}
                      </TableCell>
                      <TableCell>{request.totalDays ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleStatusUpdate(request._id, 'approved')}
                            >
                              Aprobar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(request._id, 'rejected')}
                            >
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Actualizado {formatDate(request.updatedAt || request.createdAt)}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
