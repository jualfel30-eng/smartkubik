import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  fetchApi,
  getPayables,
  fetchChartOfAccounts,
} from '../lib/api';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import PayablesSummaryCards from './PayablesSummaryCards';
import MonthlyPayables from './accounts-payable/MonthlyPayables';
import RecurringPayables from './accounts-payable/RecurringPayables';
import CompletedPayables from './accounts-payable/CompletedPayables';
import FilterPill from './accounts-receivable/FilterPill';
import { PaymentDialog } from './PaymentDialog';
import { formatCurrency } from '@/lib/currency-utils';
import { getPayableStatusInfo, getTotalAmount, getUrgency } from '@/lib/invoice-constants';
import { CURRENCY_LABELS } from '@/lib/currency-utils';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { fadeUp } from '@/lib/motion';

const PILLS = [
  { key: 'all',      label: 'Todas',        color: 'muted' },
  { key: 'overdue',  label: 'Urgentes',     color: 'red' },
  { key: 'due-soon', label: 'Esta semana',  color: 'amber' },
  { key: 'current',  label: 'Al día',       color: 'emerald' },
  { key: 'paid',     label: 'Pagadas',      color: 'muted' },
];

const PayablesManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'monthly');
  const [activePill, setActivePill] = useState(() =>
    searchParams.get('tab') === 'completed' ? 'paid' : 'all'
  );
  const [payables, setPayables] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useLocalStorageState('ap-active-filter', null);
  const [summaryRefreshKey, setSummaryRefreshKey] = useState(0);
  const highlightId = searchParams.get('id');
  const [spotlightPayable, setSpotlightPayable] = useState(null);
  const [isSpotlightPaymentOpen, setIsSpotlightPaymentOpen] = useState(false);
  const [isSpotlightViewOpen, setIsSpotlightViewOpen] = useState(false);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
      if (tabFromUrl === 'completed') setActivePill('paid');
      else if (tabFromUrl === 'monthly') setActivePill(prev => prev === 'paid' ? 'all' : prev);
    }
  }, [searchParams, activeTab]);

  // When arriving via deep-link with ?id=, route to the right tab based on payable status
  useEffect(() => {
    if (!highlightId || payables.length === 0) return;
    if (searchParams.get('tab')) return; // explicit tab wins
    const target = payables.find((p) => p._id === highlightId);
    if (!target) return;
    const targetTab = ['paid', 'void'].includes(target.status) ? 'completed' : 'monthly';
    if (targetTab !== activeTab) {
      setActiveTab(targetTab);
      if (targetTab === 'completed') setActivePill('paid');
    }
  }, [highlightId, payables, searchParams, activeTab]);

  const clearHighlight = () => {
    if (!searchParams.has('id')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('id');
    setSearchParams(next, { replace: true });
  };

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
    if (newTab === 'monthly') setActivePill('all');
  };

  const handlePillChange = (pillKey) => {
    setActivePill(pillKey);
    const newTab = pillKey === 'paid' ? 'completed' : 'monthly';
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    if (filter !== null) {
      setActiveTab('monthly');
      setActivePill('all');
      setSearchParams({ tab: 'monthly' }, { replace: true });
    }
  };

  const pillCounts = useMemo(() => {
    const pending = payables.filter(p => !['paid', 'void'].includes(p.status));
    return {
      all:        pending.length,
      overdue:    pending.filter(p => getUrgency(p.dueDate) === 'overdue').length,
      'due-soon': pending.filter(p => getUrgency(p.dueDate) === 'due-soon').length,
      current:    pending.filter(p => getUrgency(p.dueDate) === 'current').length,
      paid:       payables.filter(p => ['paid', 'void'].includes(p.status)).length,
    };
  }, [payables]);

  const clearFilter = () => {
    setActiveFilter(null);
  };

  const fetchPayables = useCallback(async (filters = null) => {
    try {
      const data = await getPayables(filters || {});
      setPayables(data.data || []);
      setSummaryRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error al cargar las cuentas por pagar:', error);
      toast.error('Error al cargar las cuentas por pagar.');
    }
  }, []);

  useEffect(() => {
    if (activeFilter) {
      fetchPayables(activeFilter);
    } else {
      fetchPayables();
    }
  }, [activeFilter, fetchPayables]);

  const fetchSuppliers = useCallback(async () => {
    try {
      const response = await fetchApi('/customers?customerType=supplier');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error al cargar los proveedores:', error);
      toast.error('Error al cargar los proveedores.');
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const accountsData = await fetchChartOfAccounts();
      setAccounts(accountsData.data.filter(acc => ['Gasto', 'Costo', 'Activo', 'Pasivo'].includes(acc.type)) || []);
      await fetchSuppliers();
      await fetchPayables();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      toast.error('Error al cargar datos iniciales.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const getFilterLabel = () => {
    if (!activeFilter) return null;
    if (activeFilter.expectedCurrency) {
      return CURRENCY_LABELS[activeFilter.expectedCurrency] || activeFilter.expectedCurrency;
    }
    if (activeFilter.aging) {
      const agingLabels = { current: 'Al día', days30: '1-30 días vencidas', days60: '31-60 días vencidas', days90plus: '+90 días vencidas' };
      return agingLabels[activeFilter.aging] || activeFilter.aging;
    }
    if (activeFilter.overdue) return 'Todas las vencidas';
    return 'Filtro activo';
  };

  const handleSpotlightPayNow = (payable) => {
    setSpotlightPayable(payable);
    setIsSpotlightPaymentOpen(true);
  };

  const handleSpotlightView = (payable) => {
    setSpotlightPayable(payable);
    setIsSpotlightViewOpen(true);
  };

  const handleSpotlightPaymentSuccess = () => {
    setIsSpotlightPaymentOpen(false);
    fetchPayables(activeFilter);
  };

  if (loading) return <p>Cargando datos del módulo de pagos...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Cuentas por Pagar</h1>
      </div>

      <PayablesSummaryCards
        key={summaryRefreshKey}
        onFilterChange={handleFilterChange}
        activeFilter={activeFilter}
        payables={payables}
        onPayNow={handleSpotlightPayNow}
        onViewPayable={handleSpotlightView}
      />

      <AnimatePresence>
        {activeFilter && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg dark:bg-blue-950/30 dark:border-blue-900/50"
          >
            <span className="text-sm text-blue-700 dark:text-blue-400">
              Filtro activo: <strong>{getFilterLabel()}</strong>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilter}
              className="h-6 px-2 text-blue-700 hover:text-blue-900 hover:bg-info/10 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/40"
            >
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <Card>
        <CardHeader>
          <CardTitle>Cuentas por Pagar (AP)</CardTitle>
          <CardDescription>
            Gestiona facturas de proveedores, pagos recurrentes y consulta el historial de cuentas por pagar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab === 'completed' ? 'monthly' : activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Por Pagar</TabsTrigger>
              <TabsTrigger value="recurring">Recurrentes</TabsTrigger>
            </TabsList>

            {(activeTab === 'monthly' || activeTab === 'completed') && (
              <div className="flex gap-2 overflow-x-auto scrollbar-none pt-4 pb-0.5">
                {PILLS.map(pill => (
                  <FilterPill
                    key={pill.key}
                    label={pill.label}
                    count={pillCounts[pill.key]}
                    color={pill.color}
                    active={activePill === pill.key}
                    onClick={() => handlePillChange(pill.key)}
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={activePill === 'paid' ? 'completed' : activeTab} variants={fadeUp} initial="initial" animate="animate" exit="exit">
                <TabsContent value="monthly" forceMount={(activeTab === 'monthly' || activeTab === 'completed') ? true : undefined}>
                  {(activeTab === 'monthly' || activeTab === 'completed') && (
                    activePill === 'paid'
                      ? <CompletedPayables payables={payables} fetchPayables={() => fetchPayables(activeFilter)} highlightId={highlightId} onHighlightConsumed={clearHighlight} />
                      : <MonthlyPayables payables={payables} fetchPayables={() => fetchPayables(activeFilter)} suppliers={suppliers} accounts={accounts} fetchSuppliers={fetchSuppliers} highlightId={highlightId} onHighlightConsumed={clearHighlight} urgencyFilter={activePill} />
                  )}
                </TabsContent>
                <TabsContent value="recurring" forceMount={activeTab === 'recurring' ? true : undefined}>
                  {activeTab === 'recurring' && (
                    <RecurringPayables suppliers={suppliers} accounts={accounts} />
                  )}
                </TabsContent>
              </motion.div>
            </AnimatePresence>
          </Tabs>
        </CardContent>
      </Card>
      {/* Spotlight payment dialogs */}
      <PaymentDialog
        isOpen={isSpotlightPaymentOpen}
        onClose={() => setIsSpotlightPaymentOpen(false)}
        payable={spotlightPayable}
        onPaymentSuccess={handleSpotlightPaymentSuccess}
      />

      {spotlightPayable && (
        <Dialog open={isSpotlightViewOpen} onOpenChange={setIsSpotlightViewOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{spotlightPayable.payeeName}</DialogTitle>
              <DialogDescription>{spotlightPayable.payableNumber || 'Detalle de factura'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Estado:</span>
                <Badge variant={getPayableStatusInfo(spotlightPayable.status).variant} className={getPayableStatusInfo(spotlightPayable.status).color}>
                  {getPayableStatusInfo(spotlightPayable.status).label}
                </Badge>
              </div>
              {spotlightPayable.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vencimiento:</span>
                  <span className="font-medium text-red-600">{new Date(spotlightPayable.dueDate).toLocaleDateString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold">{formatCurrency(getTotalAmount(spotlightPayable.lines))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pagado:</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(spotlightPayable.paidAmount || 0)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t font-bold">
                <span>Saldo pendiente:</span>
                <span className="text-amber-600">{formatCurrency(getTotalAmount(spotlightPayable.lines) - (spotlightPayable.paidAmount || 0))}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" onClick={() => setIsSpotlightViewOpen(false)}>Cerrar</Button>
              <Button onClick={() => { setIsSpotlightViewOpen(false); handleSpotlightPayNow(spotlightPayable); }}>
                Pagar ahora
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default PayablesManagement;
