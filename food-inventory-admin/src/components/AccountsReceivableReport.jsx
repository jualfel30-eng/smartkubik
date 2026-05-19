import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // eslint-disable-line -- kept for future deep-link navigation
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../lib/api';
import { Table, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Search, X } from 'lucide-react';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body';
import { SolicitarComprobanteButton } from '@/components/payment-requests/SolicitarComprobanteButton';
import { EmptyState } from '@/components/ui/empty-state';
import { DataHighlight } from '@/components/ui/data-highlight';
import { ContentTransition } from '@/components/ui/content-transition';
import { TableSkeleton } from '@/components/ui/page-loading';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { URGENCY_STYLES, getUrgency, getDaysLabel, getARStatusInfo } from '@/lib/invoice-constants';
import { fadeUp } from '@/lib/motion';
import { useAuth } from '@/hooks/use-auth';

// Sub-components
import ARSummaryCards from './accounts-receivable/ARSummaryCards';
import RecordReceivablePaymentDialog from './accounts-receivable/RecordReceivablePaymentDialog';
import FilterPill from './accounts-receivable/FilterPill';
import ARHeroBanner from './accounts-receivable/ARHeroBanner';
import ARActionSheet from './accounts-receivable/ARActionSheet';
import ARGroupedList from './accounts-receivable/ARGroupedList';
import ARCustomerPanel from './accounts-receivable/ARCustomerPanel';
import ARPaymentReceiptModal from './accounts-receivable/ARPaymentReceiptModal';
import ARStickyActionBar from './accounts-receivable/ARStickyActionBar';
import ARBulkReminderModal from './accounts-receivable/ARBulkReminderModal';
import { RequestPaymentModal } from '@/components/payment-requests/RequestPaymentModal';

// ─── Filter definitions ────────────────────────────────────────────────────────
const PILLS = [
  { key: 'all',      label: 'Todas',        color: 'muted' },
  { key: 'overdue',  label: 'Urgente',      color: 'red' },
  { key: 'dueSoon',  label: 'Esta semana',  color: 'amber' },
  { key: 'current',  label: 'Al día',       color: 'emerald' },
  { key: 'paid',     label: 'Pagadas',      color: 'muted' },
];

function applyPillFilter(data, pill) {
  if (pill === 'all') return data;
  if (pill === 'overdue')  return data.filter(r => getUrgency(r.dueDate) === 'overdue' && r.status !== 'paid');
  if (pill === 'dueSoon')  return data.filter(r => getUrgency(r.dueDate) === 'due-soon' && r.status !== 'paid');
  if (pill === 'current')  return data.filter(r => getUrgency(r.dueDate) === 'current' && r.status !== 'paid');
  if (pill === 'paid')     return data.filter(r => r.status === 'paid' || Number(r.balance) <= 0);
  return data;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AccountsReceivableReport = () => {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();

  // Data
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paidPayments, setPaidPayments] = useState([]);
  const [paidLoading, setPaidLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [activePill, setActivePill] = useState('all');

  // Dialogs / Panels
  const [actionSheetItem, setActionSheetItem] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [receiptData, setReceiptData] = useState(null);
  const [customerPanelName, setCustomerPanelName] = useState(null);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [paymentLinkItem, setPaymentLinkItem] = useState(null);

  // Pagination (desktop table)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/accounting/reports/accounts-receivable');
      setReportData(response || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPaidPayments = useCallback(async () => {
    setPaidLoading(true);
    try {
      const resp = await fetchApi('/payments?status=confirmed&limit=200');
      const list = (resp?.data || []).map((p) => {
        const orderInfo = p.orderId || {};
        const customerInfo = p.customerId || {};
        return {
          _id: p._id,
          customerName: orderInfo?.customerName || customerInfo?.name || 'Sin nombre',
          orderNumber: orderInfo?.orderNumber,
          orderId: orderInfo?._id || (typeof p.orderId === 'string' ? p.orderId : undefined),
          customerPhone: orderInfo?.customerPhone || customerInfo?.phone,
          balance: p.amount,   // show amount paid in the card
          amount: p.amount,
          method: p.method,
          reference: p.reference,
          currency: p.currency || 'USD',
          date: p.date,
          dueDate: p.date,     // card shows this as "payment date" in paid view
          status: 'paid',
          source: orderInfo?.source,
          totalAmount: p.amount,
        };
      });
      setPaidPayments(list);
    } catch {
      setPaidPayments([]);
    } finally {
      setPaidLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    fetchPaidPayments();
  }, [fetchReport, fetchPaidPayments]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    let result = reportData;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(r =>
        r.customerName?.toLowerCase().includes(q) ||
        r.orderNumber?.toString().toLowerCase().includes(q)
      );
    }

    result = applyPillFilter(result, activePill);
    return result;
  }, [reportData, searchTerm, activePill]);

  // Pill counts
  const pillCounts = useMemo(() => ({
    all:      reportData.length,
    overdue:  reportData.filter(r => getUrgency(r.dueDate) === 'overdue' && r.status !== 'paid').length,
    dueSoon:  reportData.filter(r => getUrgency(r.dueDate) === 'due-soon' && r.status !== 'paid').length,
    current:  reportData.filter(r => getUrgency(r.dueDate) === 'current' && r.status !== 'paid').length,
    paid:     paidPayments.length,
  }), [reportData, paidPayments]);

  // Hero banner metrics
  const overdueItems   = useMemo(() => reportData.filter(r => getUrgency(r.dueDate) === 'overdue' && r.status !== 'paid'), [reportData]);
  const dueSoonItems   = useMemo(() => reportData.filter(r => getUrgency(r.dueDate) === 'due-soon' && r.status !== 'paid'), [reportData]);
  const overdueTotal   = useMemo(() => overdueItems.reduce((s, r) => s + Number(r.balance || 0), 0), [overdueItems]);
  const dueSoonTotal   = useMemo(() => dueSoonItems.reduce((s, r) => s + Number(r.balance || 0), 0), [dueSoonItems]);

  // "Pagadas" tab uses paidPayments; all others use filteredData from the AR report
  const displayData = useMemo(() => {
    if (activePill !== 'paid') return filteredData;
    const q = searchTerm.trim().toLowerCase();
    if (!q) return paidPayments;
    return paidPayments.filter(r =>
      r.customerName?.toLowerCase().includes(q) ||
      r.orderNumber?.toString().toLowerCase().includes(q)
    );
  }, [activePill, filteredData, paidPayments, searchTerm]);

  // Pagination
  const totalPages   = Math.ceil(displayData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayData.slice(start, start + itemsPerPage);
  }, [displayData, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, activePill]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openActionSheet = (row) => setActionSheetItem(row);

  const openPaymentDialog = (row) => {
    setSelectedReceivable(row);
    setIsPaymentDialogOpen(true);
  };

  const openSendPaymentLink = (row) => {
    setPaymentLinkItem(row);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchReport();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setActivePill('all');
  };

  const hasActiveFilters = searchTerm || activePill !== 'all';
  const isPaidView = activePill === 'paid';
  const canSendPaymentLink = hasPermission?.('payment_requests_review');

  const openPaidReceipt = (row) => {
    setReceiptData({
      receivable: row,
      amount: row.amount,
      method: row.method,
      reference: row.reference,
      date: row.date,
      currency: row.currency,
    });
  };

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">Error: {error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchReport}>Reintentar</Button>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    // Extra bottom padding on mobile so content clears the sticky bar
    <div className="space-y-4 pb-20 md:pb-0">

      {/* ── Header ── */}
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl md:text-3xl font-bold">Cuentas por Cobrar</h1>
      </div>

      {/* ── Hero Banner ── */}
      {!loading && (
        <ARHeroBanner
          overdueCount={overdueItems.length}
          overdueTotal={overdueTotal}
          dueSoonTotal={dueSoonTotal}
          onFilterOverdue={() => setActivePill('overdue')}
          onFilterDueSoon={() => setActivePill('dueSoon')}
        />
      )}

      {/* ── Summary Cards ── */}
      <ContentTransition
        loading={loading}
        skeleton={
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-7 bg-muted rounded w-1/2 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <ARSummaryCards
          data={reportData}
          activeFilter={null}
          onFilterChange={(key) => {
            const map = { current: 'current', days30: 'overdue', days60: 'overdue', days60plus: 'overdue', overdue: 'overdue' };
            setActivePill(map[key] || 'all');
          }}
          onBulkReminder={overdueItems.length > 0 ? () => setBulkReminderOpen(true) : undefined}
        />
      </ContentTransition>

      {/* ── Filter Bar ── */}
      <Card>
        <CardHeader className="pb-3">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente o N° pedido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground shrink-0">
                <X className="h-4 w-4 mr-1" /> Limpiar
              </Button>
            )}
          </div>

          {/* Pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none pt-2 pb-0.5">
            {PILLS.map(pill => (
              <FilterPill
                key={pill.key}
                label={pill.label}
                count={pillCounts[pill.key]}
                color={pill.color}
                active={activePill === pill.key}
                onClick={() => setActivePill(pill.key)}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {hasActiveFilters
              ? `${displayData.length} de ${isPaidView ? paidPayments.length : reportData.length} ${isPaidView ? 'pagos' : 'cuentas'}`
              : `${isPaidView ? paidPayments.length : reportData.length} ${isPaidView ? 'pagos registrados' : 'cuentas en total'}`}
          </p>
        </CardHeader>

        <CardContent className="pt-0">
          <ContentTransition loading={isPaidView ? paidLoading : loading} skeleton={<TableSkeleton rows={6} />}>
            {displayData.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? 'Sin resultados' : isPaidView ? 'Sin pagos registrados' : 'Sin cuentas por cobrar'}
                description={hasActiveFilters ? 'No hay registros con esos filtros' : isPaidView ? 'Los pagos confirmados aparecerán aquí' : 'Todas las cuentas están al día'}
                actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
                onAction={hasActiveFilters ? clearFilters : undefined}
              />
            ) : (
              <>
                {/* ── Mobile: Grouped cards ── */}
                <div className="md:hidden">
                  <ARGroupedList
                    data={displayData}
                    onAction={openActionSheet}
                    onViewReceipt={openPaidReceipt}
                    onOpenCustomer={(row) => setCustomerPanelName(row.customerName)}
                    isPaidView={isPaidView}
                  />
                </div>

                {/* ── Desktop: Table ── */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>N° Pedido</TableHead>
                        <TableHead>{isPaidView ? 'Fecha de Cobro' : 'Vencimiento'}</TableHead>
                        <TableHead className="text-right">{isPaidView ? 'Monto Cobrado' : 'Saldo'}</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center w-32" />
                      </TableRow>
                    </TableHeader>
                    <AnimatedTableBody>
                      {paginatedData.map((row) => {
                        const urgency    = getUrgency(row.dueDate);
                        const daysLabel  = getDaysLabel(row.dueDate);
                        const statusInfo = getARStatusInfo(row.status, row.dueDate);
                        const balance    = Number(row.balance) || 0;
                        const isPaid     = balance <= 0 || row.status === 'paid';

                        return (
                          <AnimatedTableRow
                            key={row._id ?? row.orderNumber}
                            className={cn(URGENCY_STYLES[urgency])}
                          >
                            <TableCell className="font-medium">
                              <button
                                type="button"
                                onClick={() => setCustomerPanelName(row.customerName)}
                                className="hover:text-primary transition-colors text-left"
                              >
                                {row.customerName}
                              </button>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{row.orderNumber}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span>{row.dueDate ? new Date(row.dueDate).toLocaleDateString('es-VE') : <span className="text-muted-foreground">Sin definir</span>}</span>
                                {!isPaidView && daysLabel && <span className={cn(daysLabel.className, 'text-xs')}>{daysLabel.text}</span>}
                                {isPaidView && row.method && <span className="text-xs text-muted-foreground capitalize">{row.method}</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              <DataHighlight value={balance}>
                                {formatCurrency(balance)}
                              </DataHighlight>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusInfo.variant} className={statusInfo.color}>
                                {statusInfo.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {!isPaid ? (
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant={urgency === 'overdue' ? 'destructive' : 'default'}
                                    size="sm"
                                    className="h-8 px-3 text-xs"
                                    onClick={() => openActionSheet(row)}
                                  >
                                    Cobrar
                                  </Button>
                                  {/* Self-gated payment request button */}
                                  <SolicitarComprobanteButton
                                    order={{
                                      _id: row.orderId,
                                      orderNumber: row.orderNumber,
                                      customerPhone: row.customerPhone,
                                      source: row.source,
                                      paymentStatus: row.status,
                                    }}
                                    variant="outline"
                                    size="sm"
                                    className="h-8"
                                  />
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-muted-foreground"
                                  onClick={() => openPaidReceipt(row)}
                                >
                                  Ver
                                </Button>
                              )}
                            </TableCell>
                          </AnimatedTableRow>
                        );
                      })}
                    </AnimatedTableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages} ({filteredData.length} registros)
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                          Anterior
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                          Siguiente
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </ContentTransition>
        </CardContent>
      </Card>

      {/* ── Sticky mobile bar ── */}
      <ARStickyActionBar data={reportData} onAction={openActionSheet} />

      {/* ── Action Sheet (mobile & desktop single CTA) ── */}
      <ARActionSheet
        open={!!actionSheetItem}
        onClose={() => setActionSheetItem(null)}
        receivable={actionSheetItem}
        canSendPaymentLink={canSendPaymentLink}
        onRegisterPayment={openPaymentDialog}
        onSendPaymentLink={openSendPaymentLink}
      />

      {/* ── Payment Dialog ── */}
      <RecordReceivablePaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        receivable={selectedReceivable}
        onPaymentSuccess={handlePaymentSuccess}
        onShowReceipt={setReceiptData}
      />

      {/* ── Post-payment Receipt ── */}
      <ARPaymentReceiptModal
        open={!!receiptData}
        onClose={() => setReceiptData(null)}
        data={receiptData}
      />

      {/* ── Customer Panel ── */}
      <ARCustomerPanel
        open={!!customerPanelName}
        onClose={() => setCustomerPanelName(null)}
        customerName={customerPanelName}
        allData={reportData}
        onAction={openActionSheet}
      />

      {/* ── Bulk Reminder Modal ── */}
      <ARBulkReminderModal
        open={bulkReminderOpen}
        onClose={() => setBulkReminderOpen(false)}
        receivables={overdueItems}
      />

      {/* ── Payment Link Modal ── */}
      {paymentLinkItem && (
        <RequestPaymentModal
          open={!!paymentLinkItem}
          onOpenChange={(v) => { if (!v) setPaymentLinkItem(null); }}
          order={{
            _id: paymentLinkItem.orderId,
            orderNumber: paymentLinkItem.orderNumber,
            customerPhone: paymentLinkItem.customerPhone,
            source: paymentLinkItem.source,
            paymentStatus: paymentLinkItem.status,
          }}
          onCreated={() => { setPaymentLinkItem(null); fetchReport(); }}
        />
      )}
    </div>
  );
};

export default AccountsReceivableReport;
