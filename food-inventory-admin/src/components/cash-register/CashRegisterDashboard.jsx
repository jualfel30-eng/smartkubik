import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  DollarSign,
  Banknote,
  Calculator,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  Calendar,
  Eye,
  Printer,
  RefreshCw,
  MessageCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchApi } from '../../lib/api';
import CashRegisterReports from './CashRegisterReports';

// Helpers para formatear moneda
const formatCurrency = (amount, currency = 'USD') => {
  if (amount === undefined || amount === null) return '-';
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-VE', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

import { useCashRegister } from '../../contexts/CashRegisterContext';

export default function CashRegisterDashboard() {
  const { currentSession, refreshSession } = useCashRegister();

  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || 'current');

  // Estado de sesión actual (managed by Context now)
  const [allOpenSessions, setAllOpenSessions] = useState([]);

  // Historial de cierres
  const [closings, setClosings] = useState([]);
  const [closingsPagination, setClosingsPagination] = useState({ page: 1, total: 0 });

  // Modales
  const [openSessionModal, setOpenSessionModal] = useState(false);
  const [closeSessionModal, setCloseSessionModal] = useState(false);
  const [viewClosingModal, setViewClosingModal] = useState(false);
  const [globalClosingModal, setGlobalClosingModal] = useState(false);
  const [cashMovementModal, setCashMovementModal] = useState(false);

  // Cierre seleccionado para ver detalle
  const [selectedClosing, setSelectedClosing] = useState(null);
  const [closingNote, setClosingNote] = useState("");
  const [lastClosingId, setLastClosingId] = useState(null);

  // Sync tab status from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [searchParams, activeTab]);

  // Effect to handle deep linking to closing detail
  useEffect(() => {
    const closingId = searchParams.get('closingId');
    if (closingId && activeTab === 'history') {
      const fetchDeepLinkedClosing = async () => {
        try {
          const response = await fetchApi(`/cash-register/closings/${closingId}`);
          if (response) {
            setSelectedClosing(response);
            setViewClosingModal(true);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchDeepLinkedClosing();
    }
  }, [searchParams, activeTab]);

  // Formulario apertura de caja
  const [openForm, setOpenForm] = useState({
    registerName: 'Caja Principal',
    openingAmountUsd: '',
    openingAmountVes: '',
    openingNotes: '',
    workShift: 'morning',
  });

  // Formulario cierre de caja
  const [closeForm, setCloseForm] = useState({
    closingAmountUsd: 0,
    closingAmountVes: 0,
    closingNotes: '',
    exchangeRate: 0,
  });

  // Formulario movimiento de efectivo
  const [movementForm, setMovementForm] = useState({
    type: 'in',
    amount: 0,
    currency: 'USD',
    reason: 'change_request',
    description: '',
  });

  // Formulario cierre global
  const [globalForm, setGlobalForm] = useState({
    periodStart: '',
    periodEnd: '',
    notes: '',
  });

  // Filtros para historial
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    status: 'all',
    closingType: 'all',
  });

  // ============================================
  // API CALLS
  // ============================================

  // fetchCurrentSession handled by Context

  const checkLiveTotals = useCallback(() => {
    refreshSession();
  }, [refreshSession]);

  const fetchAllOpenSessions = useCallback(async () => {
    try {
      const response = await fetchApi('/cash-register/sessions/open');
      setAllOpenSessions(response || []);
    } catch (error) {
      console.error('Error fetching open sessions:', error);
    }
  }, []);

  const fetchClosings = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.status && filters.status !== 'all') params.append('status', filters.status);
      if (filters.closingType && filters.closingType !== 'all') params.append('closingType', filters.closingType);
      params.append('page', closingsPagination.page);
      params.append('limit', '20');

      const response = await fetchApi(`/cash-register/closings?${params.toString()}`);
      setClosings(response?.data || []);
      setClosingsPagination(response?.pagination || { page: 1, total: 0 });
    } catch (error) {
      toast.error('Error al cargar historial de cierres');
    } finally {
      setLoading(false);
    }
  }, [filters, closingsPagination.page]);

  const fetchExchangeRate = useCallback(async () => {
    try {
      const response = await fetchApi('/exchange-rate/bcv');
      setCloseForm(prev => ({ ...prev, exchangeRate: response?.rate || 0 }));
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
    }
  }, []);

  useEffect(() => {
    // fetchCurrentSession(); // Context handles this
    fetchAllOpenSessions();
    fetchClosings();
    fetchExchangeRate();
    // Refresh totals on mount to be sure
    checkLiveTotals();
  }, []);

  useEffect(() => {
    fetchClosings();
  }, [filters, closingsPagination.page]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleOpenSession = async () => {
    try {
      setLoading(true);

      // Parse string values to numbers for API
      const payload = {
        registerName: openForm.registerName,
        openingAmountUsd: parseFloat(openForm.openingAmountUsd) || 0,
        openingAmountVes: parseFloat(openForm.openingAmountVes) || 0,
        openingNotes: openForm.openingNotes,
        workShift: openForm.workShift,
      };

      await fetchApi('/cash-register/sessions/open', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Caja abierta correctamente');
      setOpenSessionModal(false);
      setOpenForm({
        registerName: 'Caja Principal',
        openingAmountUsd: '',
        openingAmountVes: '',
        openingNotes: '',
        workShift: 'morning',
      });
      refreshSession(); // Use context refresh
      fetchAllOpenSessions();
    } catch (error) {
      toast.error('Error al abrir caja', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      const response = await fetchApi(`/cash-register/sessions/${currentSession._id}/close`, {
        method: 'POST',
        body: JSON.stringify({
          sessionId: currentSession._id,
          ...closeForm,
        }),
      });
      toast.success('Cierre de caja generado correctamente', {
        description: `Número de cierre: ${response?.closingNumber}`,
      });

      setLastClosingId(response?.closingId || response?._id); // Capture ID

      // setCloseSessionModal(false); // REMOVED: Do not auto-close
      setCloseForm({
        closingAmountUsd: 0,
        closingAmountVes: 0,
        closingNotes: '',
        exchangeRate: closeForm.exchangeRate,
      });
      refreshSession();
      fetchAllOpenSessions();
      fetchClosings();
    } catch (error) {
      toast.error('Error al cerrar caja', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCashMovement = async () => {
    if (!currentSession) return;

    try {
      setLoading(true);
      await fetchApi(`/cash-register/sessions/${currentSession._id}/movements`, {
        method: 'POST',
        body: JSON.stringify(movementForm),
      });
      toast.success('Movimiento de efectivo registrado');
      setCashMovementModal(false);
      setMovementForm({
        type: 'in',
        amount: 0,
        currency: 'USD',
        reason: 'change_request',
        description: '',
      });
      refreshSession();
    } catch (error) {
      toast.error('Error al registrar movimiento');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGlobalClosing = async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/cash-register/closings/global', {
        method: 'POST',
        body: JSON.stringify(globalForm),
      });
      toast.success('Cierre global generado', {
        description: `Número de cierre: ${response?.closingNumber}`,
      });
      setGlobalClosingModal(false);
      setGlobalForm({ periodStart: '', periodEnd: '', notes: '' });
      fetchClosings();
    } catch (error) {
      toast.error('Error al generar cierre global', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveClosing = async (closingId) => {
    try {
      await fetchApi('/cash-register/closings/approve', {
        method: 'POST',
        body: JSON.stringify({ closingId }),
      });
      toast.success('Cierre aprobado');
      fetchClosings();
      if (selectedClosing?._id === closingId) {
        const response = await fetchApi(`/cash-register/closings/${closingId}`);
        setSelectedClosing(response);
      }
    } catch (error) {
      toast.error('Error al aprobar cierre');
    }
  };

  const handleRejectClosing = async (closingId, reason) => {
    try {
      await fetchApi('/cash-register/closings/reject', {
        method: 'POST',
        body: JSON.stringify({ closingId, rejectionReason: reason }),
      });
      toast.success('Cierre rechazado');
      fetchClosings();
    } catch (error) {
      toast.error('Error al rechazar cierre');
    }
  };

  useEffect(() => {
    if (selectedClosing) setClosingNote(selectedClosing.notes || "");
  }, [selectedClosing]);

  /* ========== PRINT FIX ========== */
  const handlePrintClosing = async (closing = null) => {
    // If closing is an event object (has type/preventDefault), treat as null to fallback to selectedClosing
    // Otherwise use closing if it has an _id, or fallback to selectedClosing
    const targetClosing = (closing && closing._id) ? closing : selectedClosing;

    if (!targetClosing || !targetClosing._id) {
      console.warn("No valid closing object found for printing");
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

      // We use raw fetch here to handle the blob response
      const response = await fetch(`${baseUrl}/cash-register/closings/${targetClosing._id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ format: 'pdf' })
      });

      if (!response.ok) throw new Error('Error al generar PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');

      // Cleanup
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);

    } catch (error) {
      toast.error('Error al imprimir ticket');
      console.error(error);
    }
  };

  // Helper para descargar blob
  const downloadBlob = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleExportClosing = async (closingId, format) => {
    try {
      const token = localStorage.getItem('accessToken');
      const baseUrl = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

      const response = await fetch(`${baseUrl}/cash-register/closings/${closingId}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ format })
      });

      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const extension = format === 'excel' ? 'xlsx' : 'pdf';
      const filename = `cierre-${closingId}.${extension}`;

      if (format === 'pdf') {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      } else {
        downloadBlob(blob, filename);
      }

      toast.success(`Exportación generada en formato ${format.toUpperCase()}`);
    } catch (error) {
      console.error(error);
      toast.error('Error al exportar cierre');
    }
  };

  const viewClosingDetail = async (closing) => {
    try {
      const response = await fetchApi(`/cash-register/closings/${closing._id}`);
      setSelectedClosing(response);
      setViewClosingModal(true);
    } catch (error) {
      toast.error('Error al cargar detalle del cierre');
    }
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getStatusBadge = (status) => {
    const styles = {
      draft: { variant: 'outline', label: 'Borrador', icon: Clock },
      pending_approval: { variant: 'warning', label: 'Pendiente', icon: Clock },
      approved: { variant: 'success', label: 'Aprobado', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rechazado', icon: XCircle },
      open: { variant: 'success', label: 'Abierta', icon: Unlock },
      closed: { variant: 'secondary', label: 'Cerrada', icon: Lock },
    };
    const config = styles[status] || styles.draft;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDifferenceBadge = (diff) => {
    if (!diff || diff.difference === 0) {
      return <Badge variant="success">Cuadrado</Badge>;
    }
    if (diff.difference > 0) {
      return <Badge variant="warning">Sobrante: {formatCurrency(diff.difference, diff.currency)}</Badge>;
    }
    return <Badge variant="destructive">Faltante: {formatCurrency(Math.abs(diff.difference), diff.currency)}</Badge>;
  };

  // Helper para calcular esperados en cierre
  const getExpectedTotals = () => {
    if (!currentSession) return { expectedUsd: 0, expectedVes: 0 };

    // Totals from backend (injected by Context)
    const salesCashUsd = currentSession.calculatedTotals?.cashUsd || 0;
    const salesCashVes = currentSession.calculatedTotals?.cashVes || 0;

    // Opening amounts
    const openingUsd = currentSession.openingAmountUsd || 0;
    const openingVes = currentSession.openingAmountVes || 0;

    // Movements
    const cashInUsd = (currentSession.cashMovements || [])
      .filter(m => m.type === 'in' && m.currency === 'USD')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashOutUsd = (currentSession.cashMovements || [])
      .filter(m => m.type === 'out' && m.currency === 'USD')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashInVes = (currentSession.cashMovements || [])
      .filter(m => m.type === 'in' && m.currency === 'VES')
      .reduce((sum, m) => sum + m.amount, 0);

    const cashOutVes = (currentSession.cashMovements || [])
      .filter(m => m.type === 'out' && m.currency === 'VES')
      .reduce((sum, m) => sum + m.amount, 0);

    return {
      expectedUsd: openingUsd + salesCashUsd + cashInUsd - cashOutUsd,
      expectedVes: openingVes + salesCashVes + cashInVes - cashOutVes
    };
  };

  const { expectedUsd, expectedVes } = getExpectedTotals();
  const diffUsd = (closeForm.closingAmountUsd || 0) - expectedUsd;
  const diffVes = (closeForm.closingAmountVes || 0) - expectedVes;

  const getDiffBadgeColor = (diff) => {
    if (Math.abs(diff) < 0.01) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (diff > 0) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'; // Sobrante
    return 'text-red-600 bg-red-100 dark:bg-red-900/30'; // Faltante
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cierre de Caja</h1>
          <p className="text-muted-foreground">
            Gestiona las sesiones de caja, cierres diarios y reportes financieros
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              checkLiveTotals();
              fetchAllOpenSessions();
              fetchClosings();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          {!currentSession && (
            <Button onClick={() => setOpenSessionModal(true)}>
              <Unlock className="h-4 w-4 mr-2" />
              Abrir Caja
            </Button>
          )}
        </div>
      </div>

      {/* Estado actual de la caja */}
      {currentSession && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-green-700 dark:text-green-400">
                    Caja Abierta: {currentSession.registerName}
                  </CardTitle>
                  <CardDescription>
                    Sesión: {currentSession.sessionNumber} | Desde: {formatDate(currentSession.openedAt)}
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setCashMovementModal(true)}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Movimiento
                </Button>
                <Button variant="destructive" onClick={() => setCloseSessionModal(true)}>
                  <Lock className="h-4 w-4 mr-2" />
                  Cerrar Caja
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Fondo Inicial USD</p>
                <p className="text-2xl font-bold">{formatCurrency(currentSession.openingAmountUsd, 'USD')}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Fondo Inicial VES</p>
                <p className="text-2xl font-bold">{formatCurrency(currentSession.openingAmountVes, 'VES')}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Transacciones</p>
                <p className="text-2xl font-bold">{currentSession.totalTransactions || currentSession.calculatedTotals?.totalOrders || 0}</p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Ventas (USD)</p>
                <p className="text-2xl font-bold">{formatCurrency(currentSession.calculatedTotals?.salesUsd || currentSession.totalSalesUsd || 0, 'USD')}</p>
              </div>

              {/* Cash Tender Metrics */}
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Efectivo Recibido (USD)</p>
                <p className="text-xl font-semibold text-blue-600">
                  {formatCurrency(currentSession.calculatedTotals?.cashReceivedUsd || 0, 'USD')}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Vuelto Dado (USD)</p>
                <p className="text-xl font-semibold text-orange-600">
                  {formatCurrency(currentSession.calculatedTotals?.changeGivenUsd || 0, 'USD')}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Vuelto Dado (VES)</p>
                <p className="text-xl font-semibold text-orange-600">
                  {formatCurrency(currentSession.calculatedTotals?.changeGivenVes || 0, 'VES')}
                </p>
              </div>
              <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-lg">
                <p className="text-sm text-muted-foreground">Pago Móvil (Vuelto)</p>
                <p className="text-xl font-semibold text-purple-600">
                  {formatCurrency(Math.abs(currentSession.calculatedTotals?.mobilePaymentVes || 0), 'VES')}
                </p>
              </div>
            </div>

            {/* Movimientos de efectivo */}
            {currentSession.cashMovements?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Movimientos de Efectivo</h4>
                <div className="space-y-2">
                  {currentSession.cashMovements.map((mov, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded">
                      <div className="flex items-center gap-2">
                        {mov.type === 'in' ? (
                          <Badge variant="success">Entrada</Badge>
                        ) : (
                          <Badge variant="destructive">Salida</Badge>
                        )}
                        <span>{mov.reason}</span>
                      </div>
                      <span className={mov.type === 'in' ? 'text-green-600' : 'text-red-600'}>
                        {mov.type === 'in' ? '+' : '-'}{formatCurrency(mov.amount, mov.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabs principales */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Sesiones Activas
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Historial de Cierres
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Reportes
          </TabsTrigger>
        </TabsList>

        {/* Tab: Sesiones Activas */}
        <TabsContent value="current" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Cajas Abiertas</CardTitle>
                <CardDescription>
                  Todas las sesiones de caja actualmente abiertas en el sistema
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setGlobalClosingModal(true)}>
                <Building2 className="h-4 w-4 mr-2" />
                Cierre Global
              </Button>
            </CardHeader>
            <CardContent>
              {allOpenSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay cajas abiertas actualmente</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sesión</TableHead>
                      <TableHead>Caja</TableHead>
                      <TableHead>Cajero</TableHead>
                      <TableHead>Apertura</TableHead>
                      <TableHead>Fondo USD</TableHead>
                      <TableHead>Fondo VES</TableHead>
                      <TableHead>Transacciones</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allOpenSessions.map((session) => (
                      <TableRow key={session._id}>
                        <TableCell className="font-medium">{session.sessionNumber}</TableCell>
                        <TableCell>{session.registerName}</TableCell>
                        <TableCell>{session.cashierName}</TableCell>
                        <TableCell>{formatDate(session.openedAt)}</TableCell>
                        <TableCell>{formatCurrency(session.openingAmountUsd, 'USD')}</TableCell>
                        <TableCell>{formatCurrency(session.openingAmountVes, 'VES')}</TableCell>
                        <TableCell>{session.totalTransactions || 0}</TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Historial de Cierres */}
        <TabsContent value="history" className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Fecha Inicio</Label>
                  <Input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Fecha Fin</Label>
                  <Input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="draft">Borrador</SelectItem>
                      <SelectItem value="pending_approval">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select
                    value={filters.closingType}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, closingType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="individual">Individual</SelectItem>
                      <SelectItem value="consolidated">Consolidado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabla de cierres */}
          <Card>
            <CardContent className="pt-6">
              {loading ? (
                <div className="text-center py-8">Cargando...</div>
              ) : closings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No se encontraron cierres de caja</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cierre</TableHead>
                      <TableHead>Caja</TableHead>
                      <TableHead>Cajero</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Ventas USD</TableHead>
                      <TableHead>Ventas VES</TableHead>
                      <TableHead>Diferencia</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {closings.map((closing) => (
                      <TableRow key={closing._id}>
                        <TableCell className="font-medium">{closing.closingNumber}</TableCell>
                        <TableCell>
                          {closing.closingType === 'consolidated' ? (
                            <Badge variant="outline">
                              <Building2 className="h-3 w-3 mr-1" />
                              Global
                            </Badge>
                          ) : (
                            closing.registerName
                          )}
                        </TableCell>
                        <TableCell>{closing.cashierName}</TableCell>
                        <TableCell>
                          <span className="text-xs">
                            {formatDate(closing.periodStart)}<br />
                            {formatDate(closing.periodEnd)}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(closing.totalGrossSalesUsd, 'USD')}</TableCell>
                        <TableCell>{formatCurrency(closing.totalGrossSalesVes, 'VES')}</TableCell>
                        <TableCell>
                          {closing.hasDifferences ? (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Con diferencia
                            </Badge>
                          ) : (
                            <Badge variant="success">Cuadrado</Badge>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(closing.status)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => viewClosingDetail(closing)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {closing.status === 'draft' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApproveClosing(closing._id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleExportClosing(closing._id, 'pdf')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <CashRegisterReports />
        </TabsContent>
      </Tabs>

      {/* Modal: Abrir Caja */}
      <Dialog open={openSessionModal} onOpenChange={setOpenSessionModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caja</DialogTitle>
            <DialogDescription>
              Ingresa los datos para iniciar una nueva sesión de caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre de la Caja</Label>
              <Input
                value={openForm.registerName}
                onChange={(e) => setOpenForm(prev => ({ ...prev, registerName: e.target.value }))}
                placeholder="Ej: Caja Principal, Caja 1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fondo Inicial USD</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openForm.openingAmountUsd}
                  onChange={(e) => setOpenForm(prev => ({ ...prev, openingAmountUsd: e.target.value }))}
                />
              </div>
              <div>
                <Label>Fondo Inicial VES</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openForm.openingAmountVes}
                  onChange={(e) => setOpenForm(prev => ({ ...prev, openingAmountVes: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Turno</Label>
              <Select
                value={openForm.workShift}
                onValueChange={(value) => setOpenForm(prev => ({ ...prev, workShift: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Mañana</SelectItem>
                  <SelectItem value="afternoon">Tarde</SelectItem>
                  <SelectItem value="night">Noche</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Textarea
                value={openForm.openingNotes}
                onChange={(e) => setOpenForm(prev => ({ ...prev, openingNotes: e.target.value }))}
                placeholder="Observaciones al abrir la caja..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSessionModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleOpenSession} disabled={loading}>
              {loading ? 'Abriendo...' : 'Abrir Caja'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cerrar Caja */}
      <Dialog open={closeSessionModal} onOpenChange={(val) => {
        setCloseSessionModal(val);
        if (!val) setLastClosingId(null);
      }}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cerrar Caja</DialogTitle>
            <DialogDescription>
              {lastClosingId
                ? "El cierre se ha procesado correctamente"
                : "Declara el efectivo en caja para generar el cierre"
              }
            </DialogDescription>
          </DialogHeader>

          {lastClosingId ? (
            // ===== VISTA DE ÉXITO =====
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-lg font-bold text-green-700">¡Caja Cerrada Exitosamente!</h3>
                <p className="text-sm text-muted-foreground">
                  El cierre se ha registrado correctamente.
                  <br />ID: #{lastClosingId?.slice(-6)}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-2xl mx-auto">
                <Button variant="outline" className="w-full" onClick={() => window.open(`${import.meta.env.VITE_API_URL}/cash-register/closings/${lastClosingId}/export?format=pdf`, '_blank')}>
                  📄 Descargar PDF
                </Button>
                <Button variant="outline" className="w-full" onClick={() => {/* TODO: Excel */ toast.info('Descarga Excel pendiente') }}>
                  📊 Descargar Excel
                </Button>
                <Button variant="secondary" className="w-full" onClick={() => {
                  setCloseSessionModal(false);
                  setSelectedClosing({ _id: lastClosingId });
                  navigate(`/cash-register?tab=history&closingId=${lastClosingId}`);
                }}>
                  👁️ Ver Detalle
                </Button>
              </div>

              <DialogFooter className="sm:justify-center">
                <Button className="w-full md:w-auto" onClick={() => {
                  setCloseSessionModal(false);
                  setLastClosingId(null);
                }}>
                  Finalizar
                </Button>
              </DialogFooter>
            </div>
          ) : (
            // ===== FORMULARIO NORMAL =====
            <>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Sesión: {currentSession?.sessionNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Abierta desde: {formatDate(currentSession?.openedAt)}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Conteo de Efectivo (USD)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sistema (Esperado)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground font-mono text-right flex items-center justify-end">
                          {formatCurrency(expectedUsd, 'USD')}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Real (Contado)</Label>
                        <Input
                          type="number"
                          className="text-right font-mono"
                          value={closeForm.closingAmountUsd}
                          onChange={(e) => setCloseForm(prev => ({ ...prev, closingAmountUsd: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className={`text-xs text-right font-medium px-2 py-1 rounded ${getDiffBadgeColor(diffUsd)}`}>
                      Diferencia: {diffUsd > 0 ? '+' : ''}{formatCurrency(diffUsd, 'USD')}
                    </div>
                  </div>

                  <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Conteo de Efectivo (VES)</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Sistema (Esperado)</Label>
                        <div className="h-10 px-3 py-2 rounded-md border bg-muted text-muted-foreground font-mono text-right flex items-center justify-end">
                          {formatCurrency(expectedVes, 'VES')}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Real (Contado)</Label>
                        <Input
                          type="number"
                          className="text-right font-mono"
                          value={closeForm.closingAmountVes}
                          onChange={(e) => setCloseForm(prev => ({ ...prev, closingAmountVes: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                    </div>
                    <div className={`text-xs text-right font-medium px-2 py-1 rounded ${getDiffBadgeColor(diffVes)}`}>
                      Diferencia: {diffVes > 0 ? '+' : ''}{formatCurrency(diffVes, 'VES')}
                    </div>
                  </div>
                </div>
                <div>
                  <Label>Tasa de Cambio (BCV)</Label>
                  <Input
                    type="number"
                    value={closeForm.exchangeRate}
                    onChange={(e) => setCloseForm(prev => ({ ...prev, exchangeRate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <div>
                  <Label>Notas del Cierre</Label>
                  <Textarea
                    value={closeForm.closingNotes}
                    onChange={(e) => setCloseForm(prev => ({ ...prev, closingNotes: e.target.value }))}
                    placeholder="Observaciones al cerrar la caja..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCloseSessionModal(false)}>
                  Cancelar
                </Button>
                <Button variant="destructive" onClick={handleCloseSession} disabled={loading}>
                  {loading ? 'Cerrando...' : 'Cerrar Caja'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Movimiento de Efectivo */}
      <Dialog open={cashMovementModal} onOpenChange={setCashMovementModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Movimiento de Efectivo</DialogTitle>
            <DialogDescription>
              Registra una entrada o salida de efectivo de la caja
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <Select
                value={movementForm.type}
                onValueChange={(value) => setMovementForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Entrada</SelectItem>
                  <SelectItem value="out">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto</Label>
                <Input
                  type="number"
                  value={movementForm.amount}
                  onChange={(e) => setMovementForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select
                  value={movementForm.currency}
                  onValueChange={(value) => setMovementForm(prev => ({ ...prev, currency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VES">VES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Razón</Label>
              <Select
                value={movementForm.reason}
                onValueChange={(value) => setMovementForm(prev => ({ ...prev, reason: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="change_request">Solicitud de cambio</SelectItem>
                  <SelectItem value="petty_cash">Caja chica</SelectItem>
                  <SelectItem value="bank_deposit">Depósito bancario</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="correction">Corrección</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={movementForm.description}
                onChange={(e) => setMovementForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Descripción del movimiento..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCashMovementModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddCashMovement} disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Cierre Global */}
      <Dialog open={globalClosingModal} onOpenChange={setGlobalClosingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cierre Global</DialogTitle>
            <DialogDescription>
              Genera un cierre consolidado de todas las cajas en un período
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Fecha Inicio</Label>
              <Input
                type="datetime-local"
                value={globalForm.periodStart}
                onChange={(e) => setGlobalForm(prev => ({ ...prev, periodStart: e.target.value }))}
              />
            </div>
            <div>
              <Label>Fecha Fin</Label>
              <Input
                type="datetime-local"
                value={globalForm.periodEnd}
                onChange={(e) => setGlobalForm(prev => ({ ...prev, periodEnd: e.target.value }))}
              />
            </div>
            <div>
              <Label>Notas</Label>
              <Textarea
                value={globalForm.notes}
                onChange={(e) => setGlobalForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones del cierre global..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlobalClosingModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateGlobalClosing} disabled={loading}>
              {loading ? 'Generando...' : 'Generar Cierre Global'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle de Cierre */}
      <Dialog open={viewClosingModal} onOpenChange={setViewClosingModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalle de Cierre: {selectedClosing?.closingNumber}</DialogTitle>
            <DialogDescription>
              Reporte completo del cierre de caja
            </DialogDescription>
          </DialogHeader>

          {selectedClosing && (
            <div className="space-y-6">
              {/* Info general */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Caja</p>
                  <p className="font-bold">{selectedClosing.registerName}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Cajero</p>
                  <p className="font-bold">{selectedClosing.cashierName}</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <div className="mt-1">{getStatusBadge(selectedClosing.status)}</div>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tasa de Cambio</p>
                  <p className="font-bold">{selectedClosing.exchangeRate?.toFixed(2)} Bs/$</p>
                </div>
              </div>

              {/* Resumen de Ventas */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumen de Ventas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Ventas Brutas USD</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedClosing.totalGrossSalesUsd, 'USD')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ventas Brutas VES</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedClosing.totalGrossSalesVes, 'VES')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transacciones</p>
                      <p className="text-2xl font-bold">{selectedClosing.totalTransactions}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Descuentos</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(selectedClosing.totalDiscountsUsd, 'USD')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Resumen por Método de Pago */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Desglose por Método de Pago</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Método</TableHead>
                        <TableHead>Transacciones</TableHead>
                        <TableHead>Total USD</TableHead>
                        <TableHead>Total VES</TableHead>
                        <TableHead>IGTF</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedClosing.paymentMethodSummary?.map((pm, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{pm.methodName}</TableCell>
                          <TableCell>{pm.transactionCount}</TableCell>
                          <TableCell>{formatCurrency(pm.totalAmountUsd, 'USD')}</TableCell>
                          <TableCell>{formatCurrency(pm.totalAmountVes, 'VES')}</TableCell>
                          <TableCell>{formatCurrency(pm.igtfAmount, 'USD')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Resumen de Efectivo y Movimientos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Movimientos de Caja */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Movimientos de Caja</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>USD</TableHead>
                          <TableHead>VES</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium text-green-600">Entradas (+)</TableCell>
                          <TableCell>
                            {formatCurrency(
                              (selectedClosing.cashInMovementsUsd || 0) + (selectedClosing.cashReceivedUsd || 0),
                              'USD'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              (selectedClosing.cashInMovementsVes || 0) + (selectedClosing.cashReceivedVes || 0),
                              'VES'
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium text-red-600">Salidas (-)</TableCell>
                          <TableCell>
                            {formatCurrency(
                              (selectedClosing.cashOutMovementsUsd || 0) +
                              (selectedClosing.changeGiven?.find(c => c.currency === 'USD')?.totalChangeGiven || 0),
                              'USD'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              (selectedClosing.cashOutMovementsVes || 0) +
                              (selectedClosing.changeGiven?.find(c => c.currency === 'VES')?.totalChangeGiven || 0),
                              'VES'
                            )}
                          </TableCell>
                        </TableRow>
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>Neto Efectivo</TableCell>
                          <TableCell>
                            {formatCurrency(
                              ((selectedClosing.cashInMovementsUsd || 0) + (selectedClosing.cashReceivedUsd || 0)) -
                              ((selectedClosing.cashOutMovementsUsd || 0) + (selectedClosing.changeGiven?.find(c => c.currency === 'USD')?.totalChangeGiven || 0)),
                              'USD'
                            )}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(
                              ((selectedClosing.cashInMovementsVes || 0) + (selectedClosing.cashReceivedVes || 0)) -
                              ((selectedClosing.cashOutMovementsVes || 0) + (selectedClosing.changeGiven?.find(c => c.currency === 'VES')?.totalChangeGiven || 0)),
                              'VES'
                            )}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Vueltos/Cambios Dados */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Vueltos (Cambios)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Moneda</TableHead>
                          <TableHead>Total Dado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClosing.changeGiven?.map((change, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{change.currency}</TableCell>
                            <TableCell className="text-red-500 font-bold">-{formatCurrency(change.totalChangeGiven, change.currency)}</TableCell>
                          </TableRow>
                        ))}
                        {(!selectedClosing.changeGiven || selectedClosing.changeGiven.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">Sin registros de vueltos</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              {/* Impuestos */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Impuestos Recaudados</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">IVA Recaudado</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(
                          selectedClosing.totalIvaCollected ||
                          selectedClosing.taxSummary?.find(t => t.taxType === 'IVA')?.taxAmount ||
                          0,
                          'USD'
                        )}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">IGTF Recaudado</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(
                          selectedClosing.totalIgtfCollected ||
                          selectedClosing.taxSummary?.find(t => t.taxType === 'IGTF')?.taxAmount ||
                          0,
                          'USD'
                        )}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Diferencias de Caja */}
              {selectedClosing.cashDifferences?.length > 0 && (
                <Card className={selectedClosing.hasDifferences ? 'border-red-200' : 'border-green-200'}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {selectedClosing.hasDifferences ? (
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      Cuadre de Caja
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Moneda</TableHead>
                          <TableHead>Esperado</TableHead>
                          <TableHead>Declarado</TableHead>
                          <TableHead>Diferencia</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClosing.cashDifferences.map((diff, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{diff.currency}</TableCell>
                            <TableCell>{formatCurrency(diff.expectedAmount, diff.currency)}</TableCell>
                            <TableCell>{formatCurrency(diff.declaredAmount, diff.currency)}</TableCell>
                            <TableCell className={diff.difference < 0 ? 'text-red-600' : diff.difference > 0 ? 'text-orange-600' : 'text-green-600'}>
                              {diff.difference > 0 ? '+' : ''}{formatCurrency(diff.difference, diff.currency)}
                            </TableCell>
                            <TableCell>{getDifferenceBadge(diff)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}

              {/* Acciones */}
              <div className="flex justify-end gap-2">
                {selectedClosing.status === 'draft' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectClosing(selectedClosing._id, 'Rechazado por supervisor')}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                    <Button onClick={() => handleApproveClosing(selectedClosing._id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                  </>
                )}
                <Button variant="outline" onClick={() => handleExportClosing(selectedClosing._id, 'pdf')}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
                <Button variant="default" onClick={() => handlePrintClosing()}>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir Ticket
                </Button>
                <Button variant="outline" onClick={() => handleExportClosing(selectedClosing._id, 'excel')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar Excel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div >
  );
}
