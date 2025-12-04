import { useEffect, useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { SearchableSelect } from '@/components/orders/v2/custom/SearchableSelect';
import { fetchApi, getTenantSettings } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { Loader2, Clipboard, Calendar, ExternalLink, CreditCard, Users, TrendingUp, Download, Check, X, Save, Eye, Info, Link2, Plus, Trash2, RefreshCw } from 'lucide-react';
import { AppointmentsPaymentDialog } from './AppointmentsPaymentDialog.jsx';
import { PaymentDialogV2 } from '@/components/orders/v2/PaymentDialogV2.jsx';
import { OrderDetailsDialog } from '@/components/orders/v2/OrderDetailsDialog.jsx';

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

const RETAIL_STATUSES = [
  { value: 'draft', label: 'Borrador' },
  { value: 'pending_validation', label: 'Pendiente' },
  { value: 'confirmed', label: 'Confirmado' },
  { value: 'failed', label: 'Fallido' },
  { value: 'reversed', label: 'Reversado' },
  { value: 'refunded', label: 'Reembolsado' },
];

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
  const { tenant, user } = useAuth();
  const tenantVertical =
    (tenant?.verticalProfile?.baseVertical || tenant?.vertical || '').toUpperCase();
  const isRetail = tenantVertical === 'RETAIL';
  const showServiceCobros = !isRetail;
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'pending';
  const [activeTab, setActiveTab] = useState(initialTab);
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

  // Retail payments/orders
  const [retailSummary, setRetailSummary] = useState([]);
  const [retailAging, setRetailAging] = useState([]);
  const [retailPayments, setRetailPayments] = useState([]);
  const [retailPaymentsLoading, setRetailPaymentsLoading] = useState(false);
  const [retailPaymentsSearch, setRetailPaymentsSearch] = useState('');
  const [retailStatusFilter, setRetailStatusFilter] = useState('all');
  const [retailPaymentsPage, setRetailPaymentsPage] = useState(1);
  const [retailPaymentsTotalPages, setRetailPaymentsTotalPages] = useState(1);
  const [retailConfirmedPage, setRetailConfirmedPage] = useState(1);
  const [retailConfirmedPageSize, setRetailConfirmedPageSize] = useState(25);
  const [retailOrderInput, setRetailOrderInput] = useState('');
  const [retailOrdersPage, setRetailOrdersPage] = useState(1);
  const [retailOrdersTotalPages, setRetailOrdersTotalPages] = useState(1);
  const [retailOrdersPageSize, setRetailOrdersPageSize] = useState(20);
  const [retailOrders, setRetailOrders] = useState([]);
  const [retailOrdersError, setRetailOrdersError] = useState('');
  const [retailOrdersLoading, setRetailOrdersLoading] = useState(false);
  const [retailOrder, setRetailOrder] = useState(null);
  const [retailLoading, setRetailLoading] = useState(false);
  const [retailPaymentOpen, setRetailPaymentOpen] = useState(false);
  const [tenantSettings, setTenantSettings] = useState(null);
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [retailStatusDrafts, setRetailStatusDrafts] = useState({});
  const [retailReasonDrafts, setRetailReasonDrafts] = useState({});
  const [retailPending, setRetailPending] = useState([]);
  const [retailPendingLoading, setRetailPendingLoading] = useState(false);
  const [retailConfirmed, setRetailConfirmed] = useState([]);
  const [retailConfirmedLoading, setRetailConfirmedLoading] = useState(false);
  const [reconciliationDrafts, setReconciliationDrafts] = useState({});
  const [reconciliationNotes, setReconciliationNotes] = useState({});
  const [reconciliationLoading, setReconciliationLoading] = useState({});
  const [retailCustomers, setRetailCustomers] = useState([]);
  const [retailCustomerSearch, setRetailCustomerSearch] = useState('');
  const [selectedRetailCustomer, setSelectedRetailCustomer] = useState(null);
  const [selectedRetailCustomerId, setSelectedRetailCustomerId] = useState('');
  const [allocationModalOpen, setAllocationModalOpen] = useState(false);
  const [allocationPayment, setAllocationPayment] = useState(null);
  const [allocationRows, setAllocationRows] = useState([]);
  const [allocationSaving, setAllocationSaving] = useState(false);
  const canReconcile = Array.isArray(user?.permissions)
    ? user.permissions.includes('payments_reconcile')
    : false;

  // Export helpers (retail)
  const exportToXlsx = (rows, filename) => {
    if (!rows || rows.length === 0) {
      toast.info('No hay datos para exportar');
      return;
    }
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'data');
    XLSX.writeFile(wb, filename);
  };

  const exportRetailPayments = () => {
    const rows = retailPayments.map((p) => {
      const orderInfo = p.orderId || {};
      const customerInfo = p.customerId || {};
      return {
        Fecha: formatDateTime(p.date),
        Cliente: orderInfo?.customerName || customerInfo?.name || '',
        TaxID: orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '',
        Metodo: p.method || '',
        Referencia: p.reference || '',
        Monto: p.amount || 0,
        Moneda: p.currency || 'USD',
        Estado: p.status || '',
        Cuenta: p.bankAccountId || '',
        Conciliacion:
          p.reconciliation?.statementRef ||
          p.reconciliation?._id ||
          p.bankTransactionId ||
          '',
      };
    });
    exportToXlsx(rows, 'pagos_retail.xlsx');
  };

  const exportRetailAging = () => {
    const rows = retailAging.map((b) => ({
      Bucket: b.bucket,
      Monto: b.amount || 0,
      Pagos: b.count || 0,
    }));
    exportToXlsx(rows, 'aging_retail.xlsx');
  };

  const exportRetailCustomerPayments = (payments) => {
    if (!payments || payments.length === 0) {
      toast.info('No hay pagos para exportar');
      return;
    }
    const rows = payments.map((p) => {
      const orderInfo = p.orderId || {};
      const customerInfo = p.customerId || {};
      return {
        Fecha: formatDateTime(p.date),
        Cliente: orderInfo?.customerName || customerInfo?.name || '',
        TaxID: orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '',
        Orden: orderInfo?.orderNumber || orderInfo?._id || '',
        Metodo: p.method || '',
        Referencia: p.reference || '',
        Monto: p.amount || 0,
        Moneda: p.currency || 'USD',
        Estado: p.status || '',
      };
    });
    exportToXlsx(rows, 'pagos_cliente_retail.xlsx');
  };

  const updateRetailPaymentStatus = async (id, status, reason) => {
    if (!id || !status) return;
    try {
      await fetchApi(`/payments/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      toast.success('Estado actualizado');
      loadRetailPayments();
    } catch (err) {
      toast.error(err?.message || 'No se pudo actualizar el estado');
    }
  };

  const buildCustomerAggregates = (list) => {
    const acc = {};
    list.forEach((p) => {
      const orderInfo = p.orderId || {};
      const customerInfo = p.customerId || {};
      const key =
        orderInfo?.customerName ||
        customerInfo?.name ||
        orderInfo?.customerEmail ||
        'Sin nombre';
      const taxId =
        orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '—';
      if (!acc[key]) {
        acc[key] = { name: key, taxId, total: 0, count: 0 };
      }
      acc[key].total += Number(p.amount || 0);
      acc[key].count += 1;
    });
    return Object.values(acc);
  };

  // --- Retail loaders específicos para pestañas tipo servicios ---
  const loadRetailPending = async () => {
    if (!isRetail) return;
    setRetailPendingLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (search.trim()) params.set('search', search.trim());
      // Traer órdenes con saldo pendiente (paymentStatus != paid o totalAmount > paidAmount)
      const resp = await fetchApi(`/orders?${params.toString()}`);
      const list = resp?.data || [];
      const pendingOrders = list.filter((o) => {
        const paid = Number(o.paidAmount || 0);
        const total = Number(o.totalAmount || 0);
        return total - paid > 0.009;
      });
      setRetailPending(pendingOrders);
    } catch (err) {
      toast.error(err?.message || 'No fue posible cargar pendientes');
      setRetailPending([]);
    } finally {
      setRetailPendingLoading(false);
    }
  };

  const loadRetailConfirmed = async () => {
    if (!isRetail) return;
    setRetailConfirmedLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '200');
      params.set('status', 'confirmed');
      if (search.trim()) params.set('search', search.trim());
      const resp = await fetchApi(`/payments?${params.toString()}`);
      setRetailConfirmed(resp?.data || []);
      setRetailCustomers(buildCustomerAggregates(resp?.data || []));
      setRetailConfirmedPage(1);
    } catch (err) {
      toast.error(err?.message || 'No fue posible cargar confirmados');
      setRetailConfirmed([]);
      setRetailCustomers([]);
    } finally {
      setRetailConfirmedLoading(false);
    }
  };

  const navigate = useNavigate();

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    const allowedTabs = ['pending', 'confirmed', 'customers', 'reports'];
    if (tabFromUrl && allowedTabs.includes(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    } else if (!tabFromUrl && !allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [searchParams, activeTab, showServiceCobros]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    const allowedTabs = ['pending', 'confirmed', 'customers', 'reports'];
    if (!allowedTabs.includes(newTab)) return;
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const loadPendingDeposits = async () => {
    if (!showServiceCobros) return;
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
    if (!showServiceCobros) return;
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
    if (!showServiceCobros) return;
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
    if (!showServiceCobros) return;
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
    if (!showServiceCobros) return;
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
    if (!showServiceCobros) return;
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

  // --- Retail loaders ---
  const loadRetailSummaryReport = async () => {
    try {
      const resp = await fetchApi('/payments/reports/summary?groupBy=method');
      setRetailSummary(resp?.data || []);
    } catch (err) {
      console.error('Error cargando resumen retail', err);
      setRetailSummary([]);
    }
  };

  const loadRetailAgingReport = async () => {
    try {
      const resp = await fetchApi('/payments/reports/aging?buckets=30,60,90');
      setRetailAging(resp?.data || []);
    } catch (err) {
      console.error('Error cargando aging retail', err);
      setRetailAging([]);
    }
  };

  const loadRetailPayments = async () => {
    setRetailPaymentsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '20', page: String(retailPaymentsPage) });
      if (retailPaymentsSearch.trim()) {
        params.set('search', retailPaymentsSearch.trim());
      }
      if (retailStatusFilter && retailStatusFilter !== 'all') {
        params.set('status', retailStatusFilter);
      }
      const resp = await fetchApi(`/payments?${params.toString()}`);
      setRetailPayments(resp?.data || []);
      const pagination = resp?.pagination || {};
      setRetailPaymentsTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error('Error cargando pagos retail', err);
      setRetailPayments([]);
      setRetailPaymentsTotalPages(1);
    } finally {
      setRetailPaymentsLoading(false);
    }
  };

  useEffect(() => {
    getTenantSettings()
      .then((response) => {
        if (response?.data) {
          setTenantSettings(response.data);
        }
      })
      .catch((err) => console.error('Error al cargar configuración del tenant:', err));
  }, []);

  const loadRetailOrders = async (term = '', page = 1, pageSize = retailOrdersPageSize) => {
    setRetailOrdersLoading(true);
    setRetailOrdersError('');
    try {
      const params = new URLSearchParams({ limit: String(pageSize), page: String(page) });
      if (term.trim()) {
        params.set('search', term.trim());
      }
      const resp = await fetchApi(`/orders?${params.toString()}`);
      const list = resp?.data || resp || [];
      setRetailOrders(Array.isArray(list) ? list : []);
      const pagination = resp?.pagination || {};
      setRetailOrdersTotalPages(pagination.totalPages || 1);
      setRetailOrdersPage(page);
      setRetailOrdersPageSize(pageSize);
    } catch (err) {
      console.error('Error al cargar órdenes retail:', err);
      setRetailOrders([]);
      setRetailOrdersError(err?.message || 'No fue posible cargar las órdenes');
      setRetailOrdersTotalPages(1);
    } finally {
      setRetailOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (!showServiceCobros) {
      loadRetailOrders('', 1, retailOrdersPageSize);
      loadRetailSummaryReport();
      loadRetailAgingReport();
      loadRetailPayments();
    }
  }, [showServiceCobros]);

  const handleRetailPaymentSuccess = () => {
    setRetailPaymentOpen(false);
    setRetailOrder(null);
    setRetailOrderInput('');
    setRetailOrdersPage(1);
    loadRetailOrders('', 1, retailOrdersPageSize);
    loadRetailPayments();
  };

  const reconcileRetailPayment = async (paymentId) => {
    const status = reconciliationDrafts[paymentId] || 'matched';
    const note = reconciliationNotes[paymentId] || '';
    if (!canReconcile) {
      toast.error('No tienes permisos para conciliar pagos');
      return;
    }
    setReconciliationLoading((prev) => ({ ...prev, [paymentId]: true }));
    try {
      await fetchApi(`/payments/${paymentId}/reconcile`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          note: note || undefined,
        }),
      });
      toast.success('Conciliación actualizada');
      loadRetailConfirmed();
      loadRetailPayments();
    } catch (err) {
      console.error('Error conciliando pago', err);
      toast.error('No se pudo conciliar el pago', { description: err.message });
    } finally {
      setReconciliationLoading((prev) => ({ ...prev, [paymentId]: false }));
    }
  };

  const reopenReconciliation = async (paymentId) => {
    if (!canReconcile) {
      toast.error('No tienes permisos para conciliar pagos');
      return;
    }
    setReconciliationDrafts((prev) => ({ ...prev, [paymentId]: 'pending' }));
    await reconcileRetailPayment(paymentId);
  };

  const handleOpenRetailDetails = (order) => {
    setSelectedOrderForDetails(order);
    setIsDetailsDialogOpen(true);
  };

  const handleCloseRetailDetails = () => {
    setSelectedOrderForDetails(null);
    setIsDetailsDialogOpen(false);
  };

  const handleRetailDetailsUpdated = () => {
    loadRetailPending();
    loadRetailConfirmed();
    loadRetailOrders('', retailOrdersPage, retailOrdersPageSize);
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      if (showServiceCobros) {
        loadPendingDeposits();
      } else {
        loadRetailPending();
      }
    } else if (activeTab === 'confirmed') {
      if (showServiceCobros) {
        loadConfirmedPayments();
      } else {
        loadRetailConfirmed();
      }
    } else if (activeTab === 'customers') {
      if (showServiceCobros) {
        loadCustomers();
      } else {
        loadRetailConfirmed(); // reutiliza lista confirmados y agrupa
      }
    } else if (activeTab === 'reports') {
      if (showServiceCobros) {
        loadReceivables();
        loadRevenueReport(reportPeriod);
      } else {
        loadRetailSummaryReport();
        loadRetailAgingReport();
        loadRetailPayments();
      }
    }
  }, [activeTab, reportPeriod, showServiceCobros, retailPaymentsPage, retailPaymentsSearch, retailStatusFilter, search]);

  useEffect(() => {
    if (selectedCustomerId && showServiceCobros) {
      loadCustomerData(selectedCustomerId);
    }
  }, [selectedCustomerId, showServiceCobros]);

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

  const retailCustomerGroups = useMemo(() => {
    const map = new Map();
    retailPayments.forEach((p) => {
      const orderInfo = p.orderId || {};
      const customerInfo = p.customerId || {};
      const customerId = customerInfo?._id || orderInfo?.customerId || 'unknown';
      const name = orderInfo?.customerName || customerInfo?.name || 'Sin nombre';
      const taxId = orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '—';
      const key = `${customerId}__${name}__${taxId}`;
      const current =
        map.get(key) || { customerId, name, taxId, count: 0, total: 0, lastDate: null };
      current.count += 1;
      current.total += Number(p.amount || 0);
      const d = p.date ? new Date(p.date) : null;
      if (d && (!current.lastDate || d > current.lastDate)) {
        current.lastDate = d;
      }
      map.set(key, current);
    });
    return Array.from(map.values());
  }, [retailPayments]);

  const retailCustomerOptions = useMemo(
    () =>
      retailCustomerGroups.map((g) => ({
        value: `${g.customerId}__${g.name}__${g.taxId}`,
        label: `${g.name} (${g.taxId || 'sin RIF/CI'})`,
      })),
    [retailCustomerGroups],
  );

  const filteredRetailCustomerGroups = useMemo(() => {
    const q = (retailCustomerSearch || '').toLowerCase();
    if (!q) return retailCustomerGroups;
    return retailCustomerGroups.filter(
      (g) => g.name.toLowerCase().includes(q) || (g.taxId || '').toLowerCase().includes(q),
    );
  }, [retailCustomerGroups, retailCustomerSearch]);

  const filteredRetailCustomerPayments = useMemo(() => {
    if (!selectedRetailCustomerId) return [];
    const [, name, taxId] = selectedRetailCustomerId.split('__');
    return retailPayments.filter((p) => {
      const orderInfo = p.orderId || {};
      const customerInfo = p.customerId || {};
      const n = orderInfo?.customerName || customerInfo?.name || '';
      const t = orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '—';
      return n === name && (t || '—') === (taxId || '—');
    });
  }, [retailPayments, selectedRetailCustomerId]);

  const openAllocationModal = (payment) => {
    setAllocationPayment(payment);
    const baseAlloc =
      payment?.allocations && payment.allocations.length > 0
        ? payment.allocations.map((a) => ({
            documentId: a.documentId || '',
            documentType: a.documentType || 'order',
            amount: a.amount || 0,
          }))
        : [
            {
              documentId: payment?.orderId?._id || payment?.orderId || '',
              documentType: 'order',
              amount: payment?.amount || 0,
            },
          ];
    setAllocationRows(baseAlloc);
    setAllocationModalOpen(true);
  };

  const updateAllocationRow = (idx, field, value) => {
    setAllocationRows((rows) =>
      rows.map((row, i) =>
        i === idx
          ? {
              ...row,
              [field]: field === 'amount' ? Number(value) : value,
            }
          : row,
      ),
    );
  };

  const addAllocationRow = () => {
    setAllocationRows((rows) => [
      ...rows,
      { documentId: '', documentType: 'order', amount: 0 },
    ]);
  };

  const removeAllocationRow = (idx) => {
    setAllocationRows((rows) => rows.filter((_, i) => i !== idx));
  };

  const handleSaveAllocations = async () => {
    if (!allocationPayment?._id) return;
    const allocations = allocationRows
      .filter((r) => r.documentId && Number(r.amount) > 0)
      .map((r) => ({
        documentId: r.documentId,
        documentType: r.documentType || 'order',
        amount: Number(r.amount) || 0,
      }));
    if (allocations.length === 0) {
      toast.error('Agrega al menos una aplicación con monto > 0');
      return;
    }
    setAllocationSaving(true);
    try {
      await fetchApi(`/payments/${allocationPayment._id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ allocations }),
      });
      toast.success('Aplicaciones guardadas');
      setAllocationModalOpen(false);
      setAllocationPayment(null);
      setAllocationRows([]);
      await loadRetailConfirmed();
    } catch (error) {
      toast.error('No se pudo aplicar el pago', { description: error.message });
    } finally {
      setAllocationSaving(false);
    }
  };

  const retailConfirmedTotalPages = useMemo(
    () => Math.max(1, Math.ceil(retailConfirmed.length / retailConfirmedPageSize || 1)),
    [retailConfirmed.length, retailConfirmedPageSize],
  );

  const pagedRetailConfirmed = useMemo(() => {
    const start = (retailConfirmedPage - 1) * retailConfirmedPageSize;
    return retailConfirmed.slice(start, start + retailConfirmedPageSize);
  }, [retailConfirmed, retailConfirmedPage, retailConfirmedPageSize]);

  const handleRetailCustomerSelection = (opt) => {
    if (opt) {
      setSelectedRetailCustomer(opt);
      setSelectedRetailCustomerId(opt.value);
    } else {
      setSelectedRetailCustomer(null);
      setSelectedRetailCustomerId('');
    }
  };

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
            {showServiceCobros ? (
              <>
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
              </>
            ) : (
              <Card>
                <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle>Pagos pendientes (Retail)</CardTitle>
                  <Input
                    className="md:w-64"
                    placeholder="Buscar por cliente o referencia…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Orden</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tax ID</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Pagado</TableHead>
                          <TableHead>Pendiente</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retailPendingLoading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ) : retailPending.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              No hay pagos pendientes.
                            </TableCell>
                          </TableRow>
                        ) : (
                          retailPending
                            .filter((p) => {
                              const term = search.trim().toLowerCase();
                              if (!term) return true;
                              const orderInfo = p;
                              const customerInfo = p.customer || {};
                              const haystack = [
                                orderInfo?.customerName,
                                customerInfo?.name,
                                orderInfo?.taxInfo?.customerTaxId,
                                customerInfo?.taxInfo?.taxId,
                                p.reference,
                              ]
                                .filter(Boolean)
                                .join(' ')
                                .toLowerCase();
                              return haystack.includes(term);
                            })
                            .map((o, idx) => {
                              const customerInfo = o.customer || {};
                              const taxId =
                                o?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '—';
                              const name =
                                o?.customerName ||
                                customerInfo?.name ||
                                '—';
                              const paid = Number(o.paidAmount || 0);
                              const total = Number(o.totalAmount || 0);
                              const pending = Math.max(total - paid, 0);
                              const rowKey = o._id || `pending-${idx}`;
                              return (
                                <TableRow key={rowKey}>
                                  <TableCell>{formatDateTime(o.createdAt)}</TableCell>
                                  <TableCell>{o.orderNumber || o._id}</TableCell>
                                  <TableCell>{name}</TableCell>
                                  <TableCell>{taxId}</TableCell>
                                  <TableCell>${total.toFixed(2)}</TableCell>
                                  <TableCell>${paid.toFixed(2)}</TableCell>
                                  <TableCell className="text-orange-600">${pending.toFixed(2)}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="outline"
                                              onClick={() => handleOpenRetailDetails(o)}
                                            >
                                              <Eye className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Ver orden</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
                                      <TooltipProvider>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              size="icon"
                                              variant="default"
                                              onClick={() => {
                                                setRetailOrder(o);
                                                setRetailPaymentOpen(true);
                                              }}
                                            >
                                              <CreditCard className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>Cobrar</TooltipContent>
                                        </Tooltip>
                                      </TooltipProvider>
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
            )}
          </TabsContent>

          {/* Tab 2: Pagos confirmados */}
          <TabsContent value="confirmed" className="space-y-4">
            {showServiceCobros ? (
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
            ) : (
              <Card>
                <CardHeader className="space-y-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <CardTitle>Pagos confirmados (Retail)</CardTitle>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Input
                        placeholder="Buscar cliente/Tax ID/ref..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="md:w-64"
                      />
                      <Select
                        value={String(retailConfirmedPageSize)}
                        onValueChange={(v) => {
                          const size = Number(v) || 25;
                          setRetailConfirmedPageSize(size);
                          setRetailConfirmedPage(1);
                        }}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Items" />
                        </SelectTrigger>
                          <SelectContent>
                            {[10, 25, 50, 100].map((s) => (
                              <SelectItem key={s} value={String(s)}>
                                Mostrar {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={loadRetailConfirmed}
                              disabled={retailConfirmedLoading}
                            >
                              {retailConfirmedLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Download className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">Recargar pagos confirmados</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Tax ID</TableHead>
                          <TableHead>Orden</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Referencia</TableHead>
                          <TableHead>Monto</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead>Conciliación</TableHead>
                          <TableHead className="text-right">Cambiar estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retailConfirmedLoading ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-6">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                            </TableCell>
                          </TableRow>
                        ) : retailConfirmed.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">
                              No hay pagos confirmados.
                            </TableCell>
                          </TableRow>
                        ) : (
                          pagedRetailConfirmed.map((p, idx) => {
                            const orderInfo = p.orderId || {};
                            const customerInfo = p.customerId || {};
                            const orderNumber = orderInfo?.orderNumber || orderInfo?._id || '—';
                            const taxId =
                              orderInfo?.taxInfo?.customerTaxId || customerInfo?.taxInfo?.taxId || '—';
                            const name =
                              orderInfo?.customerName ||
                              customerInfo?.name ||
                              '—';
                            const rowKey = p._id || `${orderNumber}-${taxId}-${p.reference || 'ref'}-${idx}`;
                            return (
                                <TableRow key={rowKey}>
                                  <TableCell>{formatDateTime(p.date)}</TableCell>
                                  <TableCell>{name}</TableCell>
                                  <TableCell>{taxId}</TableCell>
                                  <TableCell>{orderNumber}</TableCell>
                                  <TableCell>{p.method || '—'}</TableCell>
                                  <TableCell>{p.reference || '—'}</TableCell>
                                  <TableCell>${(p.amount || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge variant={p.status === 'confirmed' ? 'success' : 'secondary'}>
                                      {p.status || '—'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {!p.bankAccountId && (
                                      <Badge variant="destructive">Sin cuenta bancaria</Badge>
                                    )}
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Badge variant={p.reconciliationStatus === 'matched' ? 'success' : 'secondary'}>
                                          {p.reconciliationStatus || 'pending'}
                                        </Badge>
                                        {p.statusHistory?.length ? (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Info className="h-4 w-4 text-muted-foreground" />
                                              </TooltipTrigger>
                                              <TooltipContent>
                                                <div className="space-y-1 text-xs">
                                                  {p.statusHistory.slice(-4).reverse().map((h, i) => (
                                                    <div key={i}>
                                                      <div className="font-medium">{h.status}</div>
                                                      <div className="text-muted-foreground">{formatDateTime(h.changedAt)}</div>
                                                      {h.reason ? <div>Motivo: {h.reason}</div> : null}
                                                    </div>
                                                  ))}
                                                </div>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        ) : null}
                                      </div>
                                    <div className="flex items-center gap-2">
                                      <Select
                                        value={reconciliationDrafts[p._id] || p.reconciliationStatus || 'pending'}
                                        onValueChange={(v) =>
                                          setReconciliationDrafts((prev) => ({ ...prev, [p._id]: v }))
                                        }
                                        disabled={!canReconcile}
                                      >
                                        <SelectTrigger className="w-40">
                                          <SelectValue placeholder="Conciliación" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending">Pendiente</SelectItem>
                                            <SelectItem value="matched">Conciliado</SelectItem>
                                            <SelectItem value="manual">Manual</SelectItem>
                                            <SelectItem value="rejected">Rechazado</SelectItem>
                                          </SelectContent>
                                        </Select>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="secondary"
                                                disabled={reconciliationLoading[p._id] || !canReconcile}
                                                onClick={() => reconcileRetailPayment(p._id)}
                                              >
                                                <Save className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Guardar conciliación</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                        {(p.reconciliationStatus === 'matched' ||
                                          p.reconciliationStatus === 'manual') && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <Button
                                                  size="icon"
                                                  variant="ghost"
                                                  disabled={reconciliationLoading[p._id]}
                                                  onClick={() => reopenReconciliation(p._id)}
                                                >
                                                  <RefreshCw className="h-4 w-4" />
                                                </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>Reabrir a pendiente</TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
                                      </div>
                                      <Input
                                        placeholder={
                                          (reconciliationDrafts[p._id] === 'manual' ||
                                            reconciliationDrafts[p._id] === 'rejected') ?
                                            'Motivo (requerido para manual/rechazado)' :
                                            'Nota conciliación'
                                        }
                                        value={reconciliationNotes[p._id] || ''}
                                        onChange={(e) =>
                                          setReconciliationNotes((prev) => ({
                                            ...prev,
                                            [p._id]: e.target.value,
                                          }))
                                        }
                                        disabled={!canReconcile}
                                      />
                                    </div>
                                  </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-center gap-2">
                                        <Select
                                          value={retailStatusDrafts[p._id] || p.status || 'confirmed'}
                                          onValueChange={(v) =>
                                            setRetailStatusDrafts((prev) => ({ ...prev, [p._id]: v }))
                                          }
                                        >
                                          <SelectTrigger className="w-44">
                                            <SelectValue placeholder="Estado" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {RETAIL_STATUSES.map((s) => (
                                              <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <TooltipProvider>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <Button
                                                size="icon"
                                                variant="secondary"
                                                onClick={() =>
                                                  updateRetailPaymentStatus(
                                                    p._id,
                                                    retailStatusDrafts[p._id] || p.status,
                                                    retailReasonDrafts[p._id],
                                                  )
                                                }
                                              >
                                                <Save className="h-4 w-4" />
                                              </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>Guardar estado</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                      <Input
                                        placeholder="Motivo (opcional)"
                                        value={retailReasonDrafts[p._id] || ''}
                                        onChange={(e) =>
                                          setRetailReasonDrafts((prev) => ({
                                            ...prev,
                                            [p._id]: e.target.value,
                                          }))
                                        }
                                      />
                                    </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="flex justify-between items-center mt-3">
                    <p className="text-sm text-muted-foreground">
                      Página {retailConfirmedPage} de {retailConfirmedTotalPages}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retailConfirmedLoading || retailConfirmedPage <= 1}
                        onClick={() => {
                          const next = Math.max(1, retailConfirmedPage - 1);
                          setRetailConfirmedPage(next);
                        }}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={retailConfirmedLoading || retailConfirmedPage >= retailConfirmedTotalPages}
                        onClick={() => {
                          const next = Math.min(retailConfirmedTotalPages, retailConfirmedPage + 1);
                          setRetailConfirmedPage(next);
                        }}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 3: Por cliente */}
          <TabsContent value="customers" className="space-y-4">
            {showServiceCobros ? (
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
            ) : (
              <Card>
                <CardHeader className="space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div className="space-y-1">
                      <CardTitle>Pagos por cliente (Retail)</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Selecciona un cliente para ver su historial de pagos y exportarlo.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="min-w-[260px] sm:w-80">
                        <SearchableSelect
                          options={retailCustomerOptions}
                          onSelection={handleRetailCustomerSelection}
                          onInputChange={(val) => setRetailCustomerSearch(val)}
                          inputValue={retailCustomerSearch}
                          value={selectedRetailCustomer}
                          placeholder="Buscar cliente por nombre o RIF/CI..."
                          isCreatable={false}
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => exportRetailCustomerPayments(filteredRetailCustomerPayments)}
                        disabled={!filteredRetailCustomerPayments.length}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar pagos
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!selectedRetailCustomerId ? (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Tax ID</TableHead>
                              <TableHead>Pagos</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead>Último pago</TableHead>
                              <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRetailCustomerGroups.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                  No hay clientes con pagos registrados.
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredRetailCustomerGroups.map((g, idx) => {
                                const key = `${g.customerId || 'unknown'}-${g.taxId || 'na'}-${idx}`;
                                return (
                                  <TableRow key={key}>
                                    <TableCell>{g.name}</TableCell>
                                    <TableCell>{g.taxId || '—'}</TableCell>
                                    <TableCell>{g.count}</TableCell>
                                    <TableCell>${g.total.toFixed(2)}</TableCell>
                                    <TableCell>{g.lastDate ? formatDateTime(g.lastDate) : '—'}</TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          handleRetailCustomerSelection({
                                            value: `${g.customerId}__${g.name}__${g.taxId}`,
                                            label: `${g.name} (${g.taxId || 'sin RIF/CI'})`,
                                          })
                                        }
                                      >
                                        Ver pagos
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ) : filteredRetailCustomerPayments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay pagos para este cliente.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Resumen breve */}
                      <div className="grid gap-4 sm:grid-cols-3">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Pagos</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold">{filteredRetailCustomerPayments.length}</div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium text-green-600">Total pagado</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold text-green-600">
                              ${filteredRetailCustomerPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0).toFixed(2)}
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Último pago</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-2xl font-semibold">
                              {formatDateTime(
                                filteredRetailCustomerPayments
                                  .map((p) => new Date(p.date))
                                  .sort((a, b) => b - a)[0],
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Fecha</TableHead>
                              <TableHead>Orden</TableHead>
                              <TableHead>Método</TableHead>
                              <TableHead>Referencia</TableHead>
                              <TableHead>Monto</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead>Aplicaciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRetailCustomerPayments.map((p, idx) => {
                              const orderInfo = p.orderId || {};
                              const orderNumber = orderInfo?.orderNumber || orderInfo?._id || '—';
                              const rowKey = p._id || `${orderNumber}-${p.reference || 'ref'}-${idx}`;
                              const hasAllocations = Array.isArray(p.allocations) && p.allocations.length > 0;
                              return (
                                <TableRow key={rowKey}>
                                  <TableCell>{formatDateTime(p.date)}</TableCell>
                                  <TableCell>{orderNumber}</TableCell>
                                  <TableCell>{p.method || '—'}</TableCell>
                                  <TableCell>{p.reference || '—'}</TableCell>
                                  <TableCell>${(p.amount || 0).toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge variant={p.status === 'confirmed' ? 'success' : 'secondary'}>
                                      {p.status || '—'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={hasAllocations ? 'success' : 'secondary'}>
                                        {hasAllocations ? `${p.allocations.length} aplicada(s)` : 'Sin aplicar'}
                                      </Badge>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="px-2"
                                        onClick={() => openAllocationModal(p)}
                                      >
                                        <Link2 className="h-4 w-4 mr-1" />
                                        Aplicar
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab 4: Reportes */}
          <TabsContent value="reports" className="space-y-4">
            {activeTab === 'reports' && (
              <>
                {/* Retail: solo resumen y últimos pagos (lectura) */}
                {!showServiceCobros && (
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col gap-1">
                        <CardTitle>Pagos Retail</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Resumen por método y aging; exporta o revisa los últimos pagos registrados.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportRetailPayments} disabled={retailPayments.length === 0}>
                          Exportar pagos
                        </Button>
                        <Button variant="outline" size="sm" onClick={exportRetailAging} disabled={retailAging.length === 0}>
                          Exportar aging
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Por método</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {retailSummary.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin datos</p>
                            ) : (
                              retailSummary.map((item) => (
                                <Card key={item.key}>
                                  <CardContent className="p-3 space-y-1">
                                    <p className="text-xs text-muted-foreground">{item.key}</p>
                                    <p className="text-lg font-semibold">${item.totalAmount.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">Pagos: {item.count}</p>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold">Aging (días)</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {retailAging.length === 0 ? (
                              <p className="text-sm text-muted-foreground">Sin datos</p>
                            ) : (
                              retailAging.map((bucket) => (
                                <Card key={bucket.bucket}>
                                  <CardContent className="p-3 space-y-1">
                                    <p className="text-xs text-muted-foreground">{bucket.bucket} días</p>
                                    <p className="text-lg font-semibold">${(bucket.amount || 0).toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground">Pagos: {bucket.count}</p>
                                  </CardContent>
                                </Card>
                              ))
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Últimos pagos (solo lectura)</h4>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Fecha</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Referencia</TableHead>
                                <TableHead>Monto</TableHead>
                                <TableHead>Estado</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {retailPaymentsLoading ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-6">
                                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                                  </TableCell>
                                </TableRow>
                              ) : retailPayments.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                    No hay pagos para mostrar.
                                  </TableCell>
                                </TableRow>
                              ) : (
                                retailPayments.slice(0, 10).map((p, idx) => {
                                  const orderInfo = p.orderId || {};
                                  const customerInfo = p.customerId || {};
                                  const name = orderInfo?.customerName || customerInfo?.name || '—';
                                  const rowKey = p._id || `recent-${idx}`;
                                  return (
                                    <TableRow key={rowKey}>
                                      <TableCell>{formatDateTime(p.date)}</TableCell>
                                      <TableCell>{name}</TableCell>
                                      <TableCell>{p.method || '—'}</TableCell>
                                      <TableCell>{p.reference || '—'}</TableCell>
                                      <TableCell>${(p.amount || 0).toFixed(2)}</TableCell>
                                      <TableCell>
                                        <Badge variant={p.status === 'confirmed' ? 'success' : 'secondary'}>
                                          {p.status || '—'}
                                        </Badge>
                                      </TableCell>
                                    </TableRow>
                                  );
                                })
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Servicios/hospitality: reportes + aging + receivables */}
                {showServiceCobros && (
                  <>
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
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogo de aplicación de pagos (allocations) */}
      <Dialog open={allocationModalOpen} onOpenChange={setAllocationModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Aplicar pago a documentos</DialogTitle>
            <DialogDescription>
              Distribuye el pago entre una o varias órdenes/documentos. Montos mayores a 0 son requeridos.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {allocationRows.map((row, idx) => (
              <div
                key={`${idx}-${row.documentId || 'new'}`}
                className="grid grid-cols-1 md:grid-cols-5 gap-2 items-center"
              >
                <div className="md:col-span-2">
                  <Label>Documento (ID)</Label>
                  <Input
                    value={row.documentId}
                    onChange={(e) => updateAllocationRow(idx, 'documentId', e.target.value)}
                    placeholder="ID de orden o payable"
                  />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={row.documentType}
                    onValueChange={(val) => updateAllocationRow(idx, 'documentType', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="order">Orden</SelectItem>
                      <SelectItem value="payable">Payable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Monto</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.amount}
                    onChange={(e) => updateAllocationRow(idx, 'amount', e.target.value)}
                  />
                </div>
                <div className="flex items-end justify-end">
                  {allocationRows.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeAllocationRow(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addAllocationRow}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Añadir documento
            </Button>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAllocationModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAllocations} disabled={allocationSaving}>
              {allocationSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDialogV2
        isOpen={retailPaymentOpen && Boolean(retailOrder)}
        onClose={() => setRetailPaymentOpen(false)}
        order={retailOrder}
        onPaymentSuccess={handleRetailPaymentSuccess}
      />
      <AppointmentsPaymentDialog
        isOpen={isPaymentDialogOpen && Boolean(paymentAppointment)}
        appointment={paymentAppointment}
        onClose={handleClosePaymentDialog}
        onPaymentSuccess={handlePaymentSuccess}
      />
      <OrderDetailsDialog
        isOpen={isDetailsDialogOpen && Boolean(selectedOrderForDetails)}
        onClose={handleCloseRetailDetails}
        order={selectedOrderForDetails}
        tenantSettings={tenantSettings}
        onUpdate={handleRetailDetailsUpdated}
      />
    </>
  );
}
