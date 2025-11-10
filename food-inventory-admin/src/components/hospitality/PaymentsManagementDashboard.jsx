import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { fetchApi } from '@/lib/api';
import { Loader2, Clipboard, Calendar, ExternalLink, CreditCard, Users, TrendingUp, Download, Check, X } from 'lucide-react';
import { AppointmentsPaymentDialog } from './AppointmentsPaymentDialog.jsx';

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

export default function PaymentsManagementDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'pending');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingItems, setPendingItems] = useState([]);
  const [pendingSummary, setPendingSummary] = useState({ total: 0, byCurrency: {}, earliest: null });
  const [confirmedPayments, setConfirmedPayments] = useState([]);
  const [search, setSearch] = useState('');
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAppointment, setPaymentAppointment] = useState(null);
  const [paymentLoadingId, setPaymentLoadingId] = useState(null);

  // Customers tab
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [customerSearchInput, setCustomerSearchInput] = useState('');

  // Reports tab
  const [receivables, setReceivables] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [reportPeriod, setReportPeriod] = useState('month');

  const navigate = useNavigate();

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const loadPendingDeposits = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchApi('/appointments/deposits/pending');
      setPendingItems(response?.items || []);
      setPendingSummary(response?.summary || { total: 0, byCurrency: {}, earliest: null });
    } catch (err) {
      console.error('Error fetching pending deposits', err);
      setError(err?.message || 'No fue posible cargar los depósitos pendientes');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConfirmedPayments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchApi('/appointments/payments/confirmed');
      setConfirmedPayments(response?.data || []);
    } catch (err) {
      console.error('Error fetching confirmed payments', err);
      setError(err?.message || 'No fue posible cargar los pagos confirmados');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetchApi('/customers');
      setCustomers(response?.data || []);
    } catch (err) {
      console.error('Error fetching customers', err);
      setCustomers([]);
    }
  };

  const loadCustomerData = async (customerId) => {
    if (!customerId) {
      setCustomerData(null);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchApi(`/appointments/payments/by-customer/${customerId}`);
      setCustomerData(response);
    } catch (err) {
      console.error('Error fetching customer payments', err);
      setError(err?.message || 'No fue posible cargar los datos del cliente');
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceivables = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetchApi('/appointments/payments/receivables');
      setReceivables(response);
    } catch (err) {
      console.error('Error fetching receivables', err);
      setError(err?.message || 'No fue posible cargar las cuentas por cobrar');
    } finally {
      setIsLoading(false);
    }
  };

  const loadRevenueReport = async (period = 'month') => {
    setIsLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ groupBy: period });
      const response = await fetchApi(`/appointments/payments/reports/revenue?${params}`);
      setRevenueReport(response);
    } catch (err) {
      console.error('Error fetching revenue report', err);
      setError(err?.message || 'No fue posible cargar el reporte de ingresos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingDeposits();
    } else if (activeTab === 'confirmed') {
      loadConfirmedPayments();
    } else if (activeTab === 'customers') {
      loadCustomers();
    } else if (activeTab === 'reports') {
      loadReceivables();
      loadRevenueReport(reportPeriod);
    }
  }, [activeTab]);

  useEffect(() => {
    if (selectedCustomerId) {
      loadCustomerData(selectedCustomerId);
    }
  }, [selectedCustomerId]);

  const filteredPendingItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return pendingItems;
    }
    return pendingItems.filter((item) => {
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
  }, [pendingItems, search]);

  const filteredConfirmedPayments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return confirmedPayments;
    }
    return confirmedPayments.filter((payment) => {
      const haystack = [
        payment.customerName,
        payment.customerPhone,
        payment.customerEmail,
        payment.serviceName,
        payment.reference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [confirmedPayments, search]);

  const customerOptions = useMemo(() => {
    return customers.map((customer) => {
      const parts = [customer.name];
      if (customer.phone) parts.push(`Tel: ${customer.phone}`);
      if (customer.email) parts.push(customer.email);
      if (customer.taxInfo?.taxId) parts.push(`RIF/CI: ${customer.taxInfo.taxId}`);

      return {
        value: customer._id,
        label: parts.join(' | '),
      };
    });
  }, [customers]);

  const handleCustomerSelection = (selectedOption) => {
    if (selectedOption) {
      setSelectedCustomer(selectedOption);
      setSelectedCustomerId(selectedOption.value);
    } else {
      setSelectedCustomer(null);
      setSelectedCustomerId('');
    }
  };

  const handleCustomerInputChange = (inputValue) => {
    setCustomerSearchInput(inputValue);
  };

  const byCurrencyEntries = useMemo(() => Object.entries(pendingSummary.byCurrency || {}), [pendingSummary.byCurrency]);

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

  const handleConfirmDeposit = async (deposit) => {
    const appointmentId = deposit?.appointmentId;
    const depositId = deposit?.depositId || deposit?._id;

    if (!appointmentId || !depositId) {
      toast.error('No pudimos identificar el depósito.');
      return;
    }

    const loadingKey = `${appointmentId}-${depositId}`;

    try {
      setPaymentLoadingId(loadingKey);

      await fetchApi(`/appointments/${appointmentId}/manual-deposits/${depositId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'confirmed',
          notes: 'Depósito verificado y aprobado',
        }),
      });

      toast.success('Depósito confirmado exitosamente.');
      await loadPendingDeposits();

    } catch (err) {
      console.error('Error confirming deposit:', err);
      toast.error(err?.message || 'No pudimos confirmar el depósito.');
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const handleRejectDeposit = async (deposit) => {
    const appointmentId = deposit?.appointmentId;
    const depositId = deposit?.depositId || deposit?._id;

    if (!appointmentId || !depositId) {
      toast.error('No pudimos identificar el depósito.');
      return;
    }

    const loadingKey = `${appointmentId}-${depositId}`;

    try {
      setPaymentLoadingId(loadingKey);

      await fetchApi(`/appointments/${appointmentId}/manual-deposits/${depositId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          notes: 'Depósito rechazado - verificación fallida',
        }),
      });

      toast.success('Depósito rechazado.');
      await loadPendingDeposits();

    } catch (err) {
      console.error('Error rejecting deposit:', err);
      toast.error(err?.message || 'No pudimos rechazar el depósito.');
    } finally {
      setPaymentLoadingId(null);
    }
  };

  const handleClosePaymentDialog = () => {
    setIsPaymentDialogOpen(false);
    setPaymentAppointment(null);
    setPaymentLoadingId(null);
  };

  const handlePaymentSuccess = async () => {
    toast.success('Pago registrado y conciliado correctamente.');
    if (activeTab === 'pending') {
      await loadPendingDeposits();
    } else if (activeTab === 'confirmed') {
      await loadConfirmedPayments();
    }
    handleClosePaymentDialog();
  };

  const handleRefresh = () => {
    if (activeTab === 'pending') {
      loadPendingDeposits();
    } else if (activeTab === 'confirmed') {
      loadConfirmedPayments();
    }
  };

  // Export functions
  const exportToExcel = (data, filename) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Datos');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      toast.success('Archivo Excel descargado exitosamente');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Error al exportar a Excel');
    }
  };

  const handleExportConfirmedPayments = () => {
    const data = filteredConfirmedPayments.map((payment) => ({
      'Fecha de pago': formatDateTime(payment.paymentDate),
      'Cliente': payment.customerName,
      'Teléfono': payment.customerPhone || '',
      'Email': payment.customerEmail || '',
      'Servicio': payment.serviceName,
      'Monto': payment.amount,
      'Moneda': payment.currency,
      'Método': payment.method,
      'Referencia': payment.reference || '',
      'N° Recibo': payment.receiptNumber || '',
    }));
    exportToExcel(data, `pagos-confirmados-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportCustomerPayments = () => {
    if (!customerData) {
      toast.error('Selecciona un cliente primero');
      return;
    }
    const data = customerData.appointments.map((apt) => ({
      'Fecha': formatDateTime(apt.startTime),
      'Servicio': apt.serviceName,
      'Estado': apt.status,
      'Total': apt.totalAmount,
      'Pagado': apt.paidAmount,
      'Pendiente': apt.pendingAmount,
    }));
    exportToExcel(data, `pagos-cliente-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportReceivables = () => {
    if (!receivables) {
      toast.error('No hay datos para exportar');
      return;
    }
    const data = receivables.receivables.map((item) => ({
      'Cliente': item.customerName,
      'Teléfono': item.customerPhone || '',
      'Email': item.customerEmail || '',
      'Servicio': item.serviceName,
      'Fecha cita': formatDateTime(item.appointmentDate),
      'Total': item.totalAmount,
      'Pagado': item.paidAmount,
      'Pendiente': item.pendingAmount,
      'Días vencido': item.daysPastDue,
      'Categoría': item.agingBucket,
    }));
    exportToExcel(data, `cuentas-por-cobrar-${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportRevenueReport = () => {
    if (!revenueReport) {
      toast.error('No hay datos para exportar');
      return;
    }

    // Create workbook with multiple sheets
    const wb = XLSX.utils.book_new();

    // Sheet 1: Summary
    const summaryData = [
      { Concepto: 'Ingresos totales', Valor: revenueReport.summary.totalRevenue },
      { Concepto: 'Total transacciones', Valor: revenueReport.summary.totalTransactions },
      { Concepto: 'Promedio por transacción', Valor: revenueReport.summary.averageTransaction },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen');

    // Sheet 2: By Method
    const methodData = revenueReport.byMethod.map((item) => ({
      'Método': item.method,
      'Monto': item.amount,
      'Porcentaje': `${item.percentage.toFixed(1)}%`,
    }));
    const ws2 = XLSX.utils.json_to_sheet(methodData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Por Método');

    // Sheet 3: By Service
    const serviceData = revenueReport.byService.map((item) => ({
      'Servicio': item.service,
      'Monto': item.amount,
      'Porcentaje': `${item.percentage.toFixed(1)}%`,
    }));
    const ws3 = XLSX.utils.json_to_sheet(serviceData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Servicio');

    // Sheet 4: By Period
    const periodData = revenueReport.byPeriod.map((item) => ({
      'Período': item.period,
      'Monto': item.amount,
    }));
    const ws4 = XLSX.utils.json_to_sheet(periodData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Por Período');

    try {
      XLSX.writeFile(wb, `reporte-ingresos-${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Reporte de ingresos descargado exitosamente');
    } catch (error) {
      console.error('Error exporting revenue report:', error);
      toast.error('Error al exportar el reporte');
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión de cobros</h1>
            <p className="text-muted-foreground">
              Administra depósitos pendientes, pagos confirmados y reportes financieros.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Actualizar
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              <Calendar className="h-4 w-4 mr-2" />
              Pendientes
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              <CreditCard className="h-4 w-4 mr-2" />
              Confirmados
            </TabsTrigger>
            <TabsTrigger value="customers">
              <Users className="h-4 w-4 mr-2" />
              Por cliente
            </TabsTrigger>
            <TabsTrigger value="reports">
              <TrendingUp className="h-4 w-4 mr-2" />
              Reportes
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Pendientes de validar */}
          <TabsContent value="pending" className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total de solicitudes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-semibold">{pendingSummary.total || 0}</div>
                  {pendingSummary.earliest && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" /> Desde {formatDateTime(pendingSummary.earliest)}
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
                <CardTitle>Depósitos pendientes de validación</CardTitle>
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
                      ) : filteredPendingItems.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-10 text-sm text-muted-foreground">
                            No hay depósitos pendientes que coincidan con la búsqueda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredPendingItems.map((deposit) => {
                          const rowKey =
                            deposit.depositId ||
                            deposit._id ||
                            `${deposit.appointmentId || 'unknown'}-${deposit.reference || 'pending'}`;
                          const depositLoadingKey = `${deposit.appointmentId}-${deposit.depositId || deposit._id}`;
                          const isPaymentLoading = paymentLoadingId === depositLoadingKey;
                          return (
                            <TableRow key={rowKey}>
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
                                  <span className="text-xs text-muted-foreground">
                                    {deposit.customerPhone || deposit.customerEmail || '—'}
                                  </span>
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
                                <div className="flex flex-wrap justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleCopyMessage(deposit)}
                                  >
                                    <Clipboard className="h-3.5 w-3.5 mr-1" />
                                    Copiar mensaje
                                  </Button>
                                  <Button
                                    variant="default"
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleConfirmDeposit(deposit)}
                                    disabled={isPaymentLoading}
                                  >
                                    {isPaymentLoading ? (
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Confirmar
                                  </Button>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => handleRejectDeposit(deposit)}
                                    disabled={isPaymentLoading}
                                  >
                                    {isPaymentLoading ? (
                                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                    ) : (
                                      <X className="h-3.5 w-3.5 mr-1" />
                                    )}
                                    Rechazar
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
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Pagos confirmados */}
          <TabsContent value="confirmed" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle>Pagos confirmados</CardTitle>
                <div className="flex gap-2">
                  <Input
                    className="md:w-64"
                    placeholder="Buscar por cliente o servicio…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <Button
                    variant="outline"
                    onClick={handleExportConfirmedPayments}
                    disabled={filteredConfirmedPayments.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
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
                        <TableHead>Fecha de pago</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Servicio</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Método</TableHead>
                        <TableHead>Referencia</TableHead>
                        <TableHead>N° Recibo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8">
                            <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : filteredConfirmedPayments.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                            No hay pagos confirmados que coincidan con la búsqueda.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredConfirmedPayments.map((payment, index) => (
                          <TableRow key={`${payment.appointmentId}-${index}`}>
                            <TableCell>{formatDateTime(payment.paymentDate)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{payment.customerName || '—'}</span>
                                <span className="text-xs text-muted-foreground">
                                  {payment.customerPhone || payment.customerEmail || '—'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{payment.serviceName || '—'}</TableCell>
                            <TableCell>{formatCurrency(payment.amount, payment.currency)}</TableCell>
                            <TableCell>{payment.method || '—'}</TableCell>
                            <TableCell>{payment.reference || '—'}</TableCell>
                            <TableCell>{payment.receiptNumber || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleOpenAppointment(payment.appointmentId)}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Ver cita
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 3: Por cliente */}
          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle>Pagos por cliente</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-full sm:flex-1">
                    <SearchableSelect
                      options={customerOptions}
                      onSelection={handleCustomerSelection}
                      onInputChange={handleCustomerInputChange}
                      inputValue={customerSearchInput}
                      value={selectedCustomer}
                      placeholder="Buscar cliente por nombre, teléfono, email o RIF/CI..."
                      isCreatable={false}
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleExportCustomerPayments}
                    disabled={!customerData}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!selectedCustomerId ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Users className="mx-auto h-12 w-12 mb-4" />
                    <p>Selecciona un cliente para ver su historial de pagos</p>
                  </div>
                ) : isLoading ? (
                  <div className="text-center py-10">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : customerData ? (
                  <div className="space-y-6">
                    {/* Summary cards */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total de reservas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">{customerData.totalAppointments}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-green-600">Total pagado</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold text-green-600">
                            {formatCurrency(customerData.totalPaid, 'USD')}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium text-orange-600">Saldo pendiente</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold text-orange-600">
                            {formatCurrency(customerData.totalPending, 'USD')}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Appointments table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Fecha</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Pagado</TableHead>
                            <TableHead>Pendiente</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {customerData.appointments.map((apt) => (
                            <TableRow key={apt.appointmentId}>
                              <TableCell>{formatDateTime(apt.startTime)}</TableCell>
                              <TableCell>{apt.serviceName}</TableCell>
                              <TableCell>
                                <Badge variant={apt.status === 'confirmed' ? 'success' : 'secondary'}>
                                  {apt.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{formatCurrency(apt.totalAmount, 'USD')}</TableCell>
                              <TableCell className="text-green-600">
                                {formatCurrency(apt.paidAmount, 'USD')}
                              </TableCell>
                              <TableCell className="text-orange-600">
                                {formatCurrency(apt.pendingAmount, 'USD')}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenAppointment(apt.appointmentId)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 4: Reportes */}
          <TabsContent value="reports" className="space-y-4">
            {/* Revenue Report */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Reporte de ingresos</CardTitle>
                <div className="flex gap-2">
                  <Select value={reportPeriod} onValueChange={(value) => {
                    setReportPeriod(value);
                    loadRevenueReport(value);
                  }}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="day">Por día</SelectItem>
                      <SelectItem value="week">Por semana</SelectItem>
                      <SelectItem value="month">Por mes</SelectItem>
                      <SelectItem value="year">Por año</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    onClick={handleExportRevenueReport}
                    disabled={!revenueReport}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-10">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : revenueReport ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Ingresos totales</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">
                            {formatCurrency(revenueReport.summary.totalRevenue, 'USD')}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total transacciones</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">{revenueReport.summary.totalTransactions}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Promedio por transacción</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">
                            {formatCurrency(revenueReport.summary.averageTransaction, 'USD')}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* By Method */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Por método de pago</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Porcentaje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueReport.byMethod.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.method}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount, 'USD')}</TableCell>
                              <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* By Service */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Por servicio</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Servicio</TableHead>
                            <TableHead className="text-right">Monto</TableHead>
                            <TableHead className="text-right">Porcentaje</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueReport.byService.slice(0, 10).map((item, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-medium">{item.service}</TableCell>
                              <TableCell className="text-right">{formatCurrency(item.amount, 'USD')}</TableCell>
                              <TableCell className="text-right">{item.percentage.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Receivables (Cuentas por cobrar) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Cuentas por cobrar (Aging Report)</CardTitle>
                <Button
                  variant="outline"
                  onClick={handleExportReceivables}
                  disabled={!receivables}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </CardHeader>
              <CardContent>
                {receivables ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Total por cobrar</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold text-orange-600">
                            {formatCurrency(receivables.totalReceivable, 'USD')}
                          </div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">Cuentas pendientes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">{receivables.totalAccounts}</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Aging breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Antigüedad de saldos</h3>
                      <div className="grid gap-4 sm:grid-cols-5">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Actual</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-semibold">
                              {formatCurrency(receivables.agingReport.current, 'USD')}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">1-30 días</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-semibold text-yellow-600">
                              {formatCurrency(receivables.agingReport['1-30'], 'USD')}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">30-60 días</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-semibold text-orange-600">
                              {formatCurrency(receivables.agingReport['30-60'], 'USD')}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">60-90 días</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-semibold text-red-600">
                              {formatCurrency(receivables.agingReport['60-90'], 'USD')}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">+90 días</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-xl font-semibold text-red-800">
                              {formatCurrency(receivables.agingReport['90+'], 'USD')}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Receivables table */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Servicio</TableHead>
                            <TableHead>Fecha cita</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Pagado</TableHead>
                            <TableHead>Pendiente</TableHead>
                            <TableHead>Días vencido</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {receivables.receivables.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="font-medium">{item.customerName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {item.customerPhone || item.customerEmail}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>{item.serviceName}</TableCell>
                              <TableCell>{formatDateTime(item.appointmentDate)}</TableCell>
                              <TableCell>{formatCurrency(item.totalAmount, 'USD')}</TableCell>
                              <TableCell className="text-green-600">
                                {formatCurrency(item.paidAmount, 'USD')}
                              </TableCell>
                              <TableCell className="text-orange-600 font-semibold">
                                {formatCurrency(item.pendingAmount, 'USD')}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    item.daysPastDue > 90
                                      ? 'destructive'
                                      : item.daysPastDue > 30
                                      ? 'default'
                                      : 'secondary'
                                  }
                                >
                                  {item.daysPastDue} días
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleOpenAppointment(item.appointmentId)}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  Ver
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <AppointmentsPaymentDialog
        isOpen={isPaymentDialogOpen && Boolean(paymentAppointment)}
        appointment={paymentAppointment}
        onClose={handleClosePaymentDialog}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </>
  );
}
