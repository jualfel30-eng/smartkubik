import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card.jsx';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import {
  DollarSign, CalendarDays, CheckCircle2, Clock,
  AlertTriangle, Receipt, RefreshCw, PlusCircle,
  PlayCircle, Users,
} from 'lucide-react';
import { fetchApi } from '../lib/api';
import { toast } from '@/lib/toast';
import AnimatedNumber from '@/components/mobile/primitives/AnimatedNumber';
import { ScrollReveal, ScrollRevealGroup } from '@/components/ui/scroll-reveal';
import { useAuth } from '@/hooks/use-auth';
import OnboardingChecklist from './OnboardingChecklist';

const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  in_progress: 'En curso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No vino',
};

const STATUS_BADGE_CLASS = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-emerald-100 text-emerald-800',
  completed: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-800',
  no_show: 'bg-red-100 text-red-800',
};

function safeDateOnly(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function transformBeautyBooking(b) {
  const dateOnly = safeDateOnly(b.date);
  return {
    ...b,
    _id: b._id || b.id,
    customerName: b.client?.name || '',
    serviceName: b.services?.map(s => s.name).join(' + ') || '',
    resourceName: b.professionalName || '',
    startTime: dateOnly && b.startTime
      ? `${dateOnly}T${b.startTime}:00`
      : b.startTime || null,
    status: b.status || 'pending',
  };
}

export default function BeautyDashboardView() {
  const { tenant } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [cashSession, setCashSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    else setRefreshing(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(new Date(Date.now() + 86400000), 'yyyy-MM-dd');
    try {
      const [dashRes, apptRes, cashRes] = await Promise.allSettled([
        fetchApi('/dashboard/summary'),
        fetchApi(`/beauty-bookings?startDate=${today}&endDate=${tomorrow}`),
        fetchApi('/cash-register/sessions/open'),
      ]);
      if (dashRes.status === 'fulfilled') setSummary(dashRes.value?.data ?? dashRes.value);
      if (apptRes.status === 'fulfilled') {
        const raw = Array.isArray(apptRes.value?.data) ? apptRes.value.data
          : Array.isArray(apptRes.value) ? apptRes.value : [];
        setAppointments(raw.map(transformBeautyBooking));
      }
      if (cashRes.status === 'fulfilled') setCashSession(cashRes.value?.data ?? cashRes.value);
    } catch {
      toast.error('Error al cargar el dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, next) => {
    try {
      await fetchApi(`/beauty-bookings/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      toast.success(`Marcada como ${STATUS_LABELS[next] || next}`);
      load(true);
    } catch {
      toast.error('No se pudo actualizar');
    }
  };

  const pending = appointments.filter(a => a.status === 'pending' || a.status === 'confirmed');
  const completed = appointments.filter(a => a.status === 'completed');
  const unpaid = appointments.filter(a => a.status === 'completed' && a.paymentStatus !== 'paid');
  const paidToday = appointments
    .filter(a => a.paymentStatus === 'paid')
    .sort((a, b) => {
      const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
      const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
      return tb - ta;
    });
  const salesToday = paidToday.reduce((sum, a) => sum + Number(a.amountPaid || a.totalPrice || 0), 0);

  const todayAppointments = appointments
    .filter(a => a.status !== 'cancelled' && a.status !== 'no_show')
    .sort((a, b) => {
      const ta = a.startTime ? new Date(a.startTime).getTime() : 0;
      const tb = b.startTime ? new Date(b.startTime).getTime() : 0;
      return ta - tb;
    })
    .slice(0, 10);

  // Group by professional
  const profMap = {};
  for (const b of appointments) {
    const name = b.professionalName || b.resourceName;
    if (!name) continue;
    if (!profMap[name]) profMap[name] = { completed: 0, revenue: 0 };
    if (b.status === 'completed') {
      profMap[name].completed++;
      profMap[name].revenue += Number(b.totalPrice || 0);
    }
  }
  const professionals = Object.entries(profMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="glass-card-subtle">
              <CardHeader><Skeleton className="h-4 w-2/5" /></CardHeader>
              <CardContent><Skeleton className="h-8 w-3/5" /></CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <p className="text-sm text-muted-foreground capitalize">
            {format(new Date(), "EEEE d 'de' MMMM", { locale: es })}
          </p>
          <div className="text-lg font-semibold text-foreground">Panel de Control</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw size={14} className={`mr-1 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button size="sm" onClick={() => navigate('/appointments')}>
            <PlusCircle size={14} className="mr-1" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Onboarding */}
      {tenant && !tenant.onboardingCompleted && (
        <OnboardingChecklist summaryData={summary} />
      )}

      {/* KPI Cards */}
      <ScrollRevealGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-card-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Hoy</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber
              value={Number(salesToday)}
              format={(n) => `$${n.toFixed(2)}`}
              duration={0.6}
              className="text-2xl font-bold"
            />
          </CardContent>
        </Card>
        <Card className="glass-card-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Citas Hoy</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber
              value={appointments.filter(a => a.status !== 'cancelled' && a.status !== 'no_show').length}
              format={(n) => Math.round(n).toString()}
              duration={0.6}
              className="text-2xl font-bold"
            />
          </CardContent>
        </Card>
        <Card className="glass-card-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber
              value={completed.length}
              format={(n) => Math.round(n).toString()}
              duration={0.6}
              className="text-2xl font-bold text-emerald-600"
            />
          </CardContent>
        </Card>
        <Card className="glass-card-subtle">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <AnimatedNumber
              value={pending.length}
              format={(n) => Math.round(n).toString()}
              duration={0.6}
              className="text-2xl font-bold text-amber-600"
            />
          </CardContent>
        </Card>
      </ScrollRevealGroup>

      {/* Operational Alerts */}
      {(pending.length > 0 || unpaid.length > 0 || !cashSession) && (
        <ScrollReveal>
          <div className="space-y-2">
            {pending.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="flex items-center gap-3 w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-left hover:bg-amber-500/10 transition-colors"
              >
                <Clock size={16} className="text-amber-500 shrink-0" />
                <span className="flex-1 text-sm">{pending.length} cita{pending.length > 1 ? 's' : ''} sin confirmar hoy</span>
                <Badge className="bg-amber-100 text-amber-800">{pending.length}</Badge>
              </button>
            )}
            {unpaid.length > 0 && (
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="flex items-center gap-3 w-full rounded-lg border border-orange-500/30 bg-orange-500/5 px-4 py-3 text-left hover:bg-orange-500/10 transition-colors"
              >
                <Receipt size={16} className="text-orange-500 shrink-0" />
                <span className="flex-1 text-sm">{unpaid.length} cita{unpaid.length > 1 ? 's' : ''} completada{unpaid.length > 1 ? 's' : ''} sin cobrar</span>
                <Badge className="bg-orange-100 text-orange-800">{unpaid.length}</Badge>
              </button>
            )}
            {!cashSession && (
              <button
                type="button"
                onClick={() => navigate('/cash-register')}
                className="flex items-center gap-3 w-full rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-left hover:bg-destructive/10 transition-colors"
              >
                <AlertTriangle size={16} className="text-destructive shrink-0" />
                <span className="flex-1 text-sm font-medium">Caja no abierta — abre sesión para registrar pagos</span>
              </button>
            )}
          </div>
        </ScrollReveal>
      )}

      {/* Recent Payments */}
      {paidToday.length > 0 && (
        <ScrollReveal>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Receipt size={18} />
                  Cobros de Hoy
                </CardTitle>
                <CardDescription>{paidToday.length} cobro{paidToday.length > 1 ? 's' : ''} — Total: ${salesToday.toFixed(2)}</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidToday.map((apt) => {
                    const start = apt.startTime ? new Date(apt.startTime) : null;
                    return (
                      <TableRow key={apt._id}>
                        <TableCell className="font-medium tabular-nums">
                          {start ? format(start, 'HH:mm') : '--:--'}
                        </TableCell>
                        <TableCell>{apt.customerName || '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{apt.serviceName || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{apt.paymentMethod || '—'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold tabular-nums text-emerald-600">
                          ${Number(apt.amountPaid || apt.totalPrice || 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}

      {/* Today's Appointments Table */}
      <ScrollReveal>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Agenda de Hoy</CardTitle>
              <CardDescription>
                {todayAppointments.length > 0
                  ? `${todayAppointments.length} cita${todayAppointments.length > 1 ? 's' : ''} activa${todayAppointments.length > 1 ? 's' : ''} hoy`
                  : 'Sin citas para hoy'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/appointments')}>
              Ver agenda completa
            </Button>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No hay citas para hoy</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Profesional</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayAppointments.map((apt) => {
                    const start = apt.startTime ? new Date(apt.startTime) : null;
                    return (
                      <TableRow key={apt._id}>
                        <TableCell className="font-medium tabular-nums">
                          {start ? format(start, 'HH:mm') : '--:--'}
                        </TableCell>
                        <TableCell>{apt.customerName || '—'}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{apt.serviceName || '—'}</TableCell>
                        <TableCell>{apt.resourceName || apt.professionalName || '—'}</TableCell>
                        <TableCell>
                          <Badge className={STATUS_BADGE_CLASS[apt.status] || 'bg-gray-100 text-gray-700'}>
                            {STATUS_LABELS[apt.status] || apt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {(apt.status === 'pending' || apt.status === 'confirmed') && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => updateStatus(apt._id, 'in_progress')}
                              >
                                <PlayCircle size={12} className="mr-1" /> Iniciar
                              </Button>
                            )}
                            {apt.status === 'in_progress' && (
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => updateStatus(apt._id, 'completed')}
                              >
                                <CheckCircle2 size={12} className="mr-1" /> Completar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </ScrollReveal>

      {/* Professional Summary */}
      {professionals.length > 0 && (
        <ScrollReveal>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users size={18} />
                Resumen por Profesional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profesional</TableHead>
                    <TableHead className="text-right">Citas completadas</TableHead>
                    <TableHead className="text-right">Ingresos hoy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {professionals.map((p) => (
                    <TableRow key={p.name}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{p.completed}</TableCell>
                      <TableCell className="text-right tabular-nums font-semibold">
                        ${p.revenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </ScrollReveal>
      )}
    </div>
  );
}
