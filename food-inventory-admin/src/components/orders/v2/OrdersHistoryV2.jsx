import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { fetchApi, getTenantSettings } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useDebounce } from '@/hooks/use-debounce.js';
import { useMediaQuery } from '@/hooks/use-media-query.js';
import { useExchangeRate } from '@/hooks/useExchangeRate';
import { useCrmContext } from '@/context/CrmContext.jsx';

import { useDailyRitualSnapshot } from '@/hooks/useDailyRitualSnapshot';
import { useStreakCounter } from '@/hooks/useStreakCounter';
import { useOrdersInsights } from '@/hooks/useOrdersInsights';
import { classifyOrder } from '@/hooks/useOrderTriage';
import { getCelebrationTier } from '@/lib/orders/getCelebrationTier';

import { PaymentDialogV2 } from '@/components/orders/v2/PaymentDialogV2';
import { OrderDetailsDialog } from '@/components/orders/v2/OrderDetailsDialog';
import { OrderProcessingDrawer } from '@/components/orders/OrderProcessingDrawer';
import BillingDrawer from '@/components/billing/BillingDrawer';

import { OrdersSmartHeader } from './OrdersSmartHeader';
import { OrdersIntelligenceCard } from './OrdersIntelligenceCard';
import { OrdersFilterChips } from './OrdersFilterChips';
import { OrderCardMobile } from './OrderCardMobile';
import { OrdersSmartTable } from './OrdersSmartTable';
import { OrderActionSheet } from './OrderActionSheet';
import { cn } from '@/lib/utils';
import { SPRING, listItem, STAGGER, tapScale } from '@/lib/motion';
import haptics from '@/lib/haptics';

const TELEMETRY_EVENT = 'orders_history_opened';

function logTelemetry(eventName, payload) {
  if (typeof window === 'undefined') return;
  try {
    const entry = { eventName, payload, ts: Date.now() };
    if (window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(`smk:${eventName}`, { detail: entry }));
    }
    if (window.__smkAnalytics?.track) {
      window.__smkAnalytics.track(eventName, payload);
    }
  } catch {
    // analytics is best-effort
  }
}

function buildQueryParams({ filter, page, limit, search }) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);

  switch (filter) {
    case 'overdue':
    case 'pending':
      params.set('status', 'pending');
      break;
    case 'paid':
      params.set('status', 'delivered');
      break;
    case 'today':
    case 'week':
    case 'all':
    default:
      // server-side fetch all; client-side filter applies
      break;
  }
  params.set('sortBy', 'createdAt');
  params.set('sortOrder', 'desc');
  return params;
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dayIdx = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dayIdx);
  return x;
}

function applyClientFilter(orders, filter) {
  if (!filter || filter === 'all') return orders;
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = startOfWeek(now);
  return orders.filter((o) => {
    const triage = classifyOrder(o, now);
    if (filter === 'today') {
      const created = o.createdAt ? new Date(o.createdAt) : null;
      return created ? created >= today : false;
    }
    if (filter === 'week') {
      const created = o.createdAt ? new Date(o.createdAt) : null;
      return created ? created >= week : false;
    }
    if (filter === 'overdue') return triage === 'overdue';
    if (filter === 'pending') return triage === 'pending' || triage === 'today' || triage === 'overdue';
    if (filter === 'paid') return triage === 'paid';
    return true;
  });
}

function computeFilterCounts(orders) {
  const counts = { today: 0, week: 0, pending: 0, overdue: 0, paid: 0, all: orders.length };
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const week = startOfWeek(now);
  orders.forEach((o) => {
    const triage = classifyOrder(o, now);
    const created = o.createdAt ? new Date(o.createdAt) : null;
    if (created && created >= today) counts.today += 1;
    if (created && created >= week) counts.week += 1;
    if (triage === 'overdue') counts.overdue += 1;
    if (triage === 'pending' || triage === 'today' || triage === 'overdue') counts.pending += 1;
    if (triage === 'paid') counts.paid += 1;
  });
  return counts;
}

function computeWeeklyMaxAmount(orders) {
  const week = startOfWeek(new Date());
  let max = 0;
  orders.forEach((o) => {
    const created = o.createdAt ? new Date(o.createdAt) : null;
    if (created && created >= week) {
      const amount = Number(o.paidAmount) || 0;
      if (amount > max) max = amount;
    }
  });
  return max;
}

export function OrdersHistoryV2() {
  const navigate = useNavigate();
  const { tenant, user, token } = useAuth();
  const { loadCustomers } = useCrmContext();
  const { rate: exchangeRate } = useExchangeRate();
  const isMobile = useMediaQuery('(max-width: 767px)');
  const tenantId = tenant?._id || tenant?.id || tenant?.code || 'anon';

  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tenantSettings, setTenantSettings] = useState(null);

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const debouncedSearchTerm = useDebounce(searchTerm, 250);
  const [filter, setFilter] = useState(searchParams.get('filter') || 'today');
  const [page, setPage] = useState(1);
  const limit = 25;

  const [paymentOrder, setPaymentOrder] = useState(null);
  const [detailsOrder, setDetailsOrder] = useState(null);
  const [processingOrder, setProcessingOrder] = useState(null);
  const [billingOrder, setBillingOrder] = useState(null);
  const [actionSheetOrder, setActionSheetOrder] = useState(null);

  const restaurantEnabled = Boolean(
    tenant?.enabledModules?.restaurant ||
      tenant?.enabledModules?.tables ||
      tenant?.enabledModules?.kitchenDisplay,
  );
  const userName = tenant?.ownerFirstName || user?.firstName || 'Usuario';

  const ritual = useDailyRitualSnapshot(tenantId);
  const overdueCountForStreak = useMemo(
    () => orders.filter((o) => classifyOrder(o) === 'overdue').length,
    [orders],
  );
  const streak = useStreakCounter(tenantId, overdueCountForStreak);
  const insight = useOrdersInsights(tenantId, orders);

  const filterCounts = useMemo(() => computeFilterCounts(orders), [orders]);
  const filteredOrders = useMemo(() => applyClientFilter(orders, filter), [orders, filter]);
  const weeklyMaxAmount = useMemo(() => computeWeeklyMaxAmount(orders), [orders]);

  const fetchedRef = useRef(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams({ filter, page, limit, search: debouncedSearchTerm });
      const result = await fetchApi(`/orders?${params.toString()}`);
      setOrders(result.data || []);
      setPagination(result.pagination || null);
      setError(null);
    } catch (err) {
      setError(err.message);
      toast.error('No pudimos cargar las órdenes', { description: err.message });
    } finally {
      setLoading(false);
    }
  }, [filter, page, debouncedSearchTerm]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    getTenantSettings()
      .then((res) => res?.data && setTenantSettings(res.data))
      .catch(() => {});
    loadCustomers?.();
    ritual.markVisit();
    logTelemetry(TELEMETRY_EVENT, {
      tenantId,
      dayOfWeek: new Date().getDay(),
      flagVersion: 'v3',
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep URL ?filter & ?q in sync (deep-linkable)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (filter && filter !== 'today') next.set('filter', filter);
    else next.delete('filter');
    if (debouncedSearchTerm) next.set('q', debouncedSearchTerm);
    else next.delete('q');
    setSearchParams(next, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, debouncedSearchTerm]);

  const handleFilterChange = useCallback((key) => {
    setPage(1);
    setFilter(key);
  }, []);

  const handleOpenPayment = useCallback((order) => {
    setPaymentOrder(order);
  }, []);
  const handleClosePayment = useCallback(() => setPaymentOrder(null), []);

  const handlePaymentSuccess = useCallback((paidAmountInput) => {
    const paidAmount = Number(paidAmountInput) || Number(paymentOrder?.totalAmount) || 0;
    const tier = getCelebrationTier({ amount: paidAmount, weeklyMaxAmount });
    if (tier === 'milestone') {
      haptics.success();
      toast.success(`🏆 Mejor cobro de la semana — $${paidAmount.toFixed(2)}`, {
        description: 'Récord registrado. Tu intelligence se actualiza.',
        duration: 4000,
      });
    } else if (tier === 'standard') {
      haptics.success();
      toast.success(`Cobro registrado — $${paidAmount.toFixed(2)}`);
    } else {
      haptics.tap();
      toast.success('Cobro registrado');
    }
    handleClosePayment();
    fetchOrders();
  }, [paymentOrder, weeklyMaxAmount, fetchOrders, handleClosePayment]);

  const handleSecondaryAction = useCallback((actionId, order) => {
    setActionSheetOrder(null);
    switch (actionId) {
      case 'view-detail':
        setDetailsOrder(order); break;
      case 'invoice':
        setBillingOrder(order); break;
      case 'view-invoice':
        setBillingOrder(order); break;
      case 'kitchen':
        toast.info('Enviando a cocina…');
        break;
      case 'notify':
        toast.info('Notificación enviada al cliente');
        break;
      case 'reopen':
        toast.info('Reabriendo orden…');
        break;
      case 'cancel':
        toast.warning('Cancelación pendiente de confirmación');
        break;
      default:
        break;
    }
  }, []);

  const handlePrimaryAction = useCallback((cta, order) => {
    setActionSheetOrder(null);
    switch (cta.action) {
      case 'pay':
        handleOpenPayment(order); break;
      case 'invoice':
      case 'view-invoice':
        setBillingOrder(order); break;
      case 'complete':
        setProcessingOrder(order); break;
      case 'reopen':
        toast.info('Reabriendo orden…'); break;
      default:
        setDetailsOrder(order); break;
    }
  }, [handleOpenPayment]);

  const handleCreateOrder = useCallback(() => {
    navigate('/orders/new');
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    haptics.tap();
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="px-4 sm:px-6 pt-4 pb-24 sm:pb-6 space-y-5 max-w-7xl mx-auto">
      <OrdersSmartHeader
        userName={userName}
        orders={orders}
        streakDays={streak.days}
        streakBroken={streak.broken}
        ritual={ritual}
        onFilterChange={handleFilterChange}
        onCreateOrder={handleCreateOrder}
      />

      <OrdersIntelligenceCard insight={insight} />

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <input
              type="search"
              inputMode="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por # orden, cliente o teléfono"
              className="w-full bg-muted rounded-xl pl-9 pr-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <motion.button
            type="button"
            onClick={handleRefresh}
            whileTap={tapScale}
            transition={SPRING.snappy}
            aria-label="Refrescar"
            className="shrink-0 inline-flex items-center justify-center rounded-xl border border-border bg-card w-10 h-10 hover:bg-muted/60"
          >
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} />
          </motion.button>
        </div>

        <OrdersFilterChips
          active={filter}
          onChange={handleFilterChange}
          counts={filterCounts}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">
          No pudimos cargar las órdenes. <button type="button" onClick={fetchOrders} className="underline ml-1">Reintentar</button>
        </div>
      )}

      {!loading && filteredOrders.length === 0 && (
        <EmptyState filter={filter} onCreateOrder={handleCreateOrder} onClearSearch={() => { setSearchTerm(''); setFilter('all'); }} />
      )}

      {isMobile ? (
        <motion.div initial="initial" animate="animate" variants={STAGGER(0.03)} className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredOrders.map((order) => (
              <motion.div key={order._id || order.orderNumber} variants={listItem} layout>
                <OrderCardMobile
                  order={order}
                  onTap={(o) => setActionSheetOrder(o)}
                  onPay={(o) => handleOpenPayment(o)}
                  onViewDetail={(o) => setDetailsOrder(o)}
                  onMore={(o) => setActionSheetOrder(o)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {loading && filteredOrders.length === 0 && (
            <SkeletonList count={4} />
          )}
        </motion.div>
      ) : (
        <OrdersSmartTable
          orders={filteredOrders}
          isLoading={loading && filteredOrders.length === 0}
          onRowClick={(o) => setDetailsOrder(o)}
          onPay={(o) => handleOpenPayment(o)}
          onMore={(o) => setActionSheetOrder(o)}
        />
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Página {pagination.page} de {pagination.totalPages} · {pagination.total} órdenes</span>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">Anterior</button>
            <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-border px-3 py-1.5 disabled:opacity-50">Siguiente</button>
          </div>
        </div>
      )}

      {/* Action sheet (mobile) — usa MobileActionSheet portaled */}
      <OrderActionSheet
        open={Boolean(actionSheetOrder)}
        onClose={() => setActionSheetOrder(null)}
        order={actionSheetOrder}
        restaurantEnabled={restaurantEnabled}
        onPrimary={handlePrimaryAction}
        onSecondary={handleSecondaryAction}
      />

      {/* Reused V2 dialogs — no UI rewrite, just orchestration */}
      <PaymentDialogV2
        isOpen={Boolean(paymentOrder)}
        onClose={handleClosePayment}
        order={paymentOrder}
        onPaymentSuccess={handlePaymentSuccess}
        exchangeRate={exchangeRate}
      />

      <OrderDetailsDialog
        isOpen={Boolean(detailsOrder)}
        onClose={() => setDetailsOrder(null)}
        order={detailsOrder}
        tenantSettings={tenantSettings}
        onUpdate={fetchOrders}
      />

      <OrderProcessingDrawer
        isOpen={Boolean(processingOrder)}
        onClose={() => setProcessingOrder(null)}
        order={processingOrder}
        onUpdate={fetchOrders}
      />

      {billingOrder && (
        <BillingDrawer
          isOpen={Boolean(billingOrder)}
          onClose={() => setBillingOrder(null)}
          order={billingOrder}
          onSuccess={() => { setBillingOrder(null); fetchOrders(); }}
        />
      )}
    </div>
  );
}

function EmptyState({ filter, onCreateOrder, onClearSearch }) {
  if (filter === 'overdue') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-base font-medium">🎯 Cero vencidas</p>
        <p className="mt-1 text-sm text-muted-foreground">Estás manteniendo todo al día — ese ritmo es lo que protege tu flujo de caja.</p>
      </div>
    );
  }
  if (filter === 'today') {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <p className="text-base font-medium">Hoy aún no has registrado órdenes.</p>
        <button type="button" onClick={onCreateOrder} className="mt-3 inline-flex items-center gap-1 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
          <Plus size={14} /> Crear primera orden hoy
        </button>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <p className="text-base font-medium">No encontramos órdenes con esos filtros.</p>
      <button type="button" onClick={onClearSearch} className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline">
        Limpiar filtros
      </button>
    </div>
  );
}

function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-32 rounded-[var(--mobile-radius-xl)] bg-muted/30 animate-pulse" />
      ))}
    </div>
  );
}

export default OrdersHistoryV2;
