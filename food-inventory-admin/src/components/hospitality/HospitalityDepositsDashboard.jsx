import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { fetchApi } from '@/lib/api';
import { Loader2, Clipboard, Calendar, ExternalLink } from 'lucide-react';

const STATUS_VARIANT = {
  requested: 'secondary',
  submitted: 'default',
  confirmed: 'success',
  rejected: 'destructive',
};

const STATUS_LABEL = {
  requested: 'Solicitado',
  submitted: 'Reportado',
  confirmed: 'Confirmado',
  rejected: 'Rechazado',
};

const formatCurrency = (value, currency) => {
  if (value === undefined || value === null) return '-';
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency || 'VES',
      minimumFractionDigits: 2,
    }).format(Number(value));
  } catch {
    return `${currency || 'VES'} ${Number(value).toFixed(2)}`;
  }
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

const buildWhatsAppMessage = (deposit) => {
  const name = deposit.customerName || 'estimado(a)';
  const service = deposit.serviceName || 'la reserva';
  const appointmentDate = deposit.startTime
    ? new Date(deposit.startTime).toLocaleString('es-VE', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    : 'la fecha acordada';
  const amount = formatCurrency(deposit.amount, deposit.currency);
  const method = deposit.method || 'transferencia';

  return (
    `Hola ${name} 👋\n\n` +
    `Te escribimos del equipo de reservas para ${service} reservado para ${appointmentDate}.\n\n` +
    `🔔 Tenemos pendiente el comprobante del depósito de ${amount} (${method}). ` +
    `Por favor envíanos una foto o PDF del comprobante por este mismo canal ` +
    `para que podamos confirmar tu servicio ✅.\n\n` +
    `Si ya lo enviaste, ignora este mensaje.\nGracias.`
  );
};

export default function HospitalityDepositsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, byCurrency: {}, earliest: null });
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchApi('/appointments/deposits/pending');
      setItems(response?.items || []);
      setSummary(response?.summary || { total: 0, byCurrency: {}, earliest: null });
    } catch (err) {
      console.error('Error fetching pending deposits', err);
      setError(err?.message || 'No fue posible cargar los depósitos pendientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return items;
    }
    return items.filter((item) => {
      const haystack = [
        item.customerName,
        item.customerPhone,
        item.customerEmail,
        item.serviceName,
        item.reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search]);

  const byCurrencyEntries = useMemo(() => Object.entries(summary.byCurrency || {}), [summary.byCurrency]);

  const handleCopyMessage = async (deposit) => {
    try {
      await navigator.clipboard.writeText(buildWhatsAppMessage(deposit));
      toast.success('Mensaje copiado al portapapeles');
    } catch (err) {
      console.error('Clipboard copy failed', err);
      toast.error('No se pudo copiar el mensaje');
    }
  };

  const handleOpenAppointment = (appointmentId) => {
    if (!appointmentId) return;
    navigate('/appointments', { state: { focusAppointmentId: appointmentId } });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Depósitos pendientes</h1>
          <p className="text-muted-foreground">
            Monitorea y gestiona los cobros manuales que aún no han sido validados.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de solicitudes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{summary.total || 0}</div>
            {summary.earliest && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" /> Desde {formatDateTime(summary.earliest)}
              </p>
            )}
          </CardContent>
        </Card>
        {byCurrencyEntries.map(([currency, amount]) => (
          <Card key={currency}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Monto pendiente {currency}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{formatCurrency(amount, currency)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <CardTitle>Detalle de depósitos</CardTitle>
          <Input
            className="md:w-64"
            placeholder="Buscar por cliente, servicio o referencia…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="rounded border border-destructive/30 bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Registrado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">
                      No hay depósitos pendientes que coincidan con la búsqueda.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((deposit) => (
                    <TableRow key={`${deposit.appointmentId}-${deposit.depositId}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{formatDateTime(deposit.createdAt)}</span>
                          {deposit.startTime ? (
                            <span className="text-xs text-muted-foreground">
                              Cita: {formatDateTime(deposit.startTime)}
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{deposit.customerName || '—'}</span>
                          <span className="text-xs text-muted-foreground">{deposit.customerPhone || deposit.customerEmail || '—'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{deposit.serviceName || '—'}</TableCell>
                      <TableCell>{formatCurrency(deposit.amount, deposit.currency)}</TableCell>
                      <TableCell>{deposit.method || '—'}</TableCell>
                      <TableCell>{deposit.reference || '—'}</TableCell>
                      <TableCell className="max-w-[220px]">
                        <div className="text-xs text-muted-foreground space-y-1">
                          {deposit.notes ? <p>{deposit.notes}</p> : null}
                          {deposit.decisionNotes ? <p>Resolución: {deposit.decisionNotes}</p> : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[deposit.status] || 'secondary'}>
                          {STATUS_LABEL[deposit.status] || deposit.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyMessage(deposit)}
                          >
                            <Clipboard className="h-3.5 w-3.5 mr-1" />
                            Copiar mensaje
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenAppointment(deposit.appointmentId)}
                          >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" />
                            Ver en citas
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
