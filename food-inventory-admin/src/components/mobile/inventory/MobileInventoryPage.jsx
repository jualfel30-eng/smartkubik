import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, RefreshCw, Filter, ShoppingCart, AlertTriangle, ArrowLeftRight, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, DUR, EASE, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useFabContext } from '@/contexts/FabContext';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileSearchBar from '../primitives/MobileSearchBar.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import PullProgress from '../primitives/PullProgress.jsx';
import MobileProductCard from './MobileProductCard.jsx';
import MobileMovementCard, { groupMovementsByDate } from './MobileMovementCard.jsx';
import MobileAdjustStock from './MobileAdjustStock.jsx';
import MobileCreateProduct from './MobileCreateProduct.jsx';
import MobileCreatePO from './MobileCreatePO.jsx';

// ─── Pull-to-refresh hook (duplicated from MobileAppointmentsPage) ──────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0) {
      setPulling(true);
      setDistance(Math.min(dy, THRESHOLD * 1.5));
    }
  }, []);

  const onTouchEnd = useCallback(async () => {
    if (distance >= THRESHOLD) {
      setDistance(0); setPulling(false); startY.current = null;
      await onRefresh();
    } else {
      setDistance(0); setPulling(false); startY.current = null;
    }
  }, [distance, onRefresh]);

  return { pulling, distance, THRESHOLD, onTouchStart, onTouchMove, onTouchEnd };
}

// ─── Tab config ─────────────────────────────────────────────────────────────
const TABS = [
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
  { id: 'orders', label: 'Pedidos', icon: ShoppingCart },
];

function TabPills({ activeTab, onTabChange, alertCount }) {
  return (
    <div
      className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-border"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => { haptics.tap(); onTabChange(tab.id); }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap no-tap-highlight transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
            )}
            style={{ scrollSnapAlign: 'start' }}
          >
            <Icon size={14} />
            {tab.label}
            {tab.id === 'alerts' && alertCount > 0 && (
              <motion.span
                key={alertCount}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5"
              >
                {alertCount}
              </motion.span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Filter Sheet (inline, small) ───────────────────────────────────────────
function FilterSheet({ open, onClose, filters, onApply }) {
  const [stockFilter, setStockFilter] = useState(filters.stock || 'all');
  const [sortBy, setSortBy] = useState(filters.sortBy || 'name');

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3"
          style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button
            type="button"
            onClick={() => { setStockFilter('all'); setSortBy('name'); onApply({ stock: 'all', sortBy: 'name' }); }}
            className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => onApply({ stock: stockFilter, sortBy })}
            className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
          >
            Aplicar filtros
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Estado de stock</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'all', label: 'Todos' },
              { value: 'low', label: 'Stock bajo' },
              { value: 'out', label: 'Sin stock' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStockFilter(opt.value)}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  stockFilter === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Ordenar por</p>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'name', label: 'Nombre' },
              { value: 'stock_asc', label: 'Stock ↑' },
              { value: 'stock_desc', label: 'Stock ↓' },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSortBy(opt.value)}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  sortBy === opt.value
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    </MobileActionSheet>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────
export default function MobileInventoryPage() {
  const { setContextAction, clearContextAction } = useFabContext();
  const [activeTab, setActiveTab] = useState('stock');

  // Data state
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // Loading per tab
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Track which tabs have been loaded
  const loadedTabs = useRef({ stock: false, movements: false, alerts: false, orders: false });

  // UI state
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ stock: 'all', sortBy: 'name' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);

  // Sheet state
  const [adjusting, setAdjusting] = useState(null); // { product, mode }
  const [creating, setCreating] = useState(false);
  const [creatingPO, setCreatingPO] = useState(false);
  const [poPreselect, setPoPreselect] = useState(null);

  // ─── Data loaders ───────────────────────────────────────────────────────
  const loadStock = useCallback(async () => {
    try {
      setLoadingStock(true);
      const [invRes, countRes] = await Promise.allSettled([
        fetchApi('/inventory?limit=100'),
        fetchApi('/inventory/alerts/count'),
      ]);
      if (invRes.status === 'fulfilled') {
        const list = Array.isArray(invRes.value?.data) ? invRes.value.data : Array.isArray(invRes.value) ? invRes.value : [];
        setInventory(list);
      }
      if (countRes.status === 'fulfilled') {
        setAlertCount(Number(countRes.value?.count ?? countRes.value?.data ?? 0));
      }
      loadedTabs.current.stock = true;
    } catch {
      toast.error('Error al cargar inventario');
    } finally {
      setLoadingStock(false);
    }
  }, []);

  const loadMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const res = await fetchApi('/inventory-movements?limit=50&sort=-createdAt');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setMovements(list);
      loadedTabs.current.movements = true;
    } catch {
      toast.error('Error al cargar movimientos');
    } finally {
      setLoadingMovements(false);
    }
  }, []);

  const loadAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const res = await fetchApi('/inventory/alerts/low-stock');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setAlerts(list);
      setAlertCount(list.length);
      loadedTabs.current.alerts = true;
    } catch {
      toast.error('Error al cargar alertas');
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      setLoadingOrders(true);
      const res = await fetchApi('/purchases?limit=20&sort=-createdAt');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setOrders(list);
      loadedTabs.current.orders = true;
    } catch {
      toast.error('Error al cargar pedidos');
    } finally {
      setLoadingOrders(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadStock(); }, [loadStock]);

  // Lazy load on tab switch
  useEffect(() => {
    if (activeTab === 'movements' && !loadedTabs.current.movements) loadMovements();
    if (activeTab === 'alerts' && !loadedTabs.current.alerts) loadAlerts();
    if (activeTab === 'orders' && !loadedTabs.current.orders) loadOrders();
  }, [activeTab, loadMovements, loadAlerts, loadOrders]);

  // Refresh current tab
  const refreshTab = useCallback(async () => {
    if (activeTab === 'stock') await loadStock();
    else if (activeTab === 'movements') await loadMovements();
    else if (activeTab === 'alerts') await loadAlerts();
    else if (activeTab === 'orders') await loadOrders();
  }, [activeTab, loadStock, loadMovements, loadAlerts, loadOrders]);

  // Pull to refresh
  const pull = usePullToRefresh(refreshTab);

  // ─── FAB context ────────────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'stock') {
      setContextAction({
        icon: Plus,
        label: 'Nuevo producto',
        action: () => setCreating(true),
      });
    } else if (activeTab === 'orders') {
      setContextAction({
        icon: ShoppingCart,
        label: 'Nueva compra',
        action: () => setCreatingPO(true),
      });
    } else {
      clearContextAction();
    }
    return () => clearContextAction();
  }, [activeTab, setContextAction, clearContextAction]);

  // ─── Filtered & sorted inventory ────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = [...inventory];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) => {
        const name = (p.productName || p.productId?.name || p.name || '').toLowerCase();
        const sku = (p.productSku || p.productId?.sku || p.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      });
    }

    // Stock filter
    if (filters.stock === 'low') {
      result = result.filter((p) => {
        const stock = Number(p.availableQuantity ?? p.totalQuantity ?? p.currentStock ?? 0);
        const min = Number(p.minStock ?? p.minimumStock ?? 5);
        return stock > 0 && stock <= min;
      });
    } else if (filters.stock === 'out') {
      result = result.filter((p) => Number(p.availableQuantity ?? p.totalQuantity ?? p.currentStock ?? 0) <= 0);
    }

    // Sort
    if (filters.sortBy === 'name') {
      result.sort((a, b) => (a.productName || a.productId?.name || '').localeCompare(b.productName || b.productId?.name || ''));
    } else if (filters.sortBy === 'stock_asc') {
      result.sort((a, b) => Number(a.availableQuantity ?? a.totalQuantity ?? 0) - Number(b.availableQuantity ?? b.totalQuantity ?? 0));
    } else if (filters.sortBy === 'stock_desc') {
      result.sort((a, b) => Number(b.availableQuantity ?? b.totalQuantity ?? 0) - Number(a.availableQuantity ?? a.totalQuantity ?? 0));
    }

    return result;
  }, [inventory, search, filters]);

  // ─── Computed alert count (fallback from client data if API count failed) ─
  const displayAlertCount = alertCount || useMemo(() =>
    inventory.filter((p) => {
      const stock = Number(p.availableQuantity ?? p.totalQuantity ?? p.currentStock ?? 0);
      const min = Number(p.minStock ?? p.minimumStock ?? 5);
      return stock <= min;
    }).length,
  [inventory]);

  const activeFilterCount = (filters.stock !== 'all' ? 1 : 0) + (filters.sortBy !== 'name' ? 1 : 0);

  // ─── Action handlers ───────────────────────────────────────────────────
  const handleCardAction = (item, type) => {
    if (type === 'adjust') {
      setAdjusting({ product: item, mode: 'add' });
    } else if (type === 'movements') {
      setActiveTab('movements');
    } else if (type === 'edit') {
      // For now, open adjust sheet — edit product sheet is a future enhancement
      setAdjusting({ product: item, mode: 'add' });
    }
  };

  const handleAlertRestock = (item) => {
    setAdjusting({ product: item, mode: 'add' });
  };

  const handleAlertCreatePO = (item) => {
    setPoPreselect(item);
    setCreatingPO(true);
  };

  const handleAdjustClose = (saved) => {
    setAdjusting(null);
    if (saved) {
      loadStock();
      loadedTabs.current.movements = false;
      loadedTabs.current.alerts = false;
    }
  };

  const handleCreateClose = (saved) => {
    setCreating(false);
    if (saved) {
      loadStock();
    }
  };

  const handlePOClose = (saved) => {
    setCreatingPO(false);
    setPoPreselect(null);
    if (saved) {
      loadedTabs.current.orders = false;
      if (activeTab === 'orders') loadOrders();
    }
  };

  // ─── Grouped movements ─────────────────────────────────────────────────
  const groupedMovements = useMemo(() => groupMovementsByDate(movements), [movements]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full bg-background"
      onTouchStart={pull.onTouchStart}
      onTouchMove={pull.onTouchMove}
      onTouchEnd={pull.onTouchEnd}
    >
      {/* Pull-to-refresh indicator */}
      {pull.pulling && (
        <div className="flex justify-center py-2">
          <PullProgress progress={pull.distance / pull.THRESHOLD} spinning={false} />
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 bg-background">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">Inventario</h1>
          <button
            type="button"
            onClick={refreshTab}
            className="p-2 rounded-lg hover:bg-accent transition-colors no-tap-highlight"
          >
            <RefreshCw className={cn('h-4 w-4', loadingStock && 'animate-spin')} />
          </button>
        </div>
        <TabPills activeTab={activeTab} onTabChange={setActiveTab} alertCount={displayAlertCount} />
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        {/* ── Stock tab ─────────────────────────────────────────────────── */}
        {activeTab === 'stock' && (
          <>
            {/* Search + filter */}
            <div className="sticky top-0 z-[5] bg-background px-4 py-2 flex gap-2">
              <div className="flex-1">
                <MobileSearchBar
                  value={search}
                  onChange={setSearch}
                  placeholder="Buscar por nombre o SKU..."
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={cn(
                  'p-2.5 rounded-xl border transition-colors no-tap-highlight relative shrink-0',
                  activeFilterCount > 0 ? 'bg-primary/10 border-primary' : 'border-border',
                )}
              >
                <Filter size={16} className={activeFilterCount > 0 ? 'text-primary' : 'text-muted-foreground'} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className="flex gap-2 px-4 pb-2 flex-wrap">
                {filters.stock !== 'all' && (
                  <FilterChip
                    label={filters.stock === 'low' ? 'Stock bajo' : 'Sin stock'}
                    onRemove={() => setFilters((f) => ({ ...f, stock: 'all' }))}
                  />
                )}
                {filters.sortBy !== 'name' && (
                  <FilterChip
                    label={filters.sortBy === 'stock_asc' ? 'Stock ↑' : 'Stock ↓'}
                    onRemove={() => setFilters((f) => ({ ...f, sortBy: 'name' }))}
                  />
                )}
              </div>
            )}

            {/* Product list */}
            <div className="px-4 pb-24">
              {loadingStock && inventory.length === 0 ? (
                <MobileListSkeleton count={4} height="h-20" className="pt-2" />
              ) : filtered.length === 0 ? (
                <MobileEmptyState
                  icon={Package}
                  title={search || activeFilterCount > 0 ? 'Sin resultados' : 'Sin productos en inventario'}
                  description={search ? 'Intenta con otro término' : 'Crea tu primer producto para comenzar'}
                  action={!search && activeFilterCount === 0 && (
                    <button
                      type="button"
                      onClick={() => setCreating(true)}
                      className="px-4 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
                    >
                      + Nuevo producto
                    </button>
                  )}
                />
              ) : (
                <motion.div
                  className="space-y-2 pt-2"
                  variants={STAGGER(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {filtered.map((item) => (
                    <MobileProductCard
                      key={item._id || item.productId}
                      item={item}
                      expanded={expandedCard === (item._id || item.productId)}
                      onToggle={(id) => setExpandedCard((prev) => prev === id ? null : id)}
                      onAction={handleCardAction}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </>
        )}

        {/* ── Movements tab ─────────────────────────────────────────────── */}
        {activeTab === 'movements' && (
          <div className="pb-24">
            {loadingMovements ? (
              <div className="px-4">
                <MobileListSkeleton count={5} height="h-16" className="pt-4" />
              </div>
            ) : movements.length === 0 ? (
              <MobileEmptyState
                icon={ArrowLeftRight}
                title="Sin movimientos registrados"
                description="Los movimientos aparecerán aquí cuando ajustes stock o recibas compras"
              />
            ) : (
              <div className="pt-2">
                {groupedMovements.map((group) => (
                  <div key={group.label}>
                    {/* Sticky date header */}
                    <div className="sticky top-0 z-[2] bg-background/80 backdrop-blur-sm px-4 py-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{group.label}</span>
                    </div>
                    <motion.div
                      className="space-y-2 px-4 pb-2"
                      variants={STAGGER(0.03)}
                      initial="initial"
                      animate="animate"
                    >
                      {group.items.map((mov) => (
                        <MobileMovementCard key={mov._id} mov={mov} />
                      ))}
                    </motion.div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Alerts tab ────────────────────────────────────────────────── */}
        {activeTab === 'alerts' && (
          <div className="px-4 pb-24">
            {loadingAlerts ? (
              <MobileListSkeleton count={4} height="h-20" className="pt-4" />
            ) : alerts.length === 0 ? (
              <MobileEmptyState
                icon={AlertTriangle}
                title="Sin alertas"
                description="Todo el inventario está al día"
              />
            ) : (
              <motion.div
                className="space-y-2 pt-4"
                variants={STAGGER(0.03)}
                initial="initial"
                animate="animate"
              >
                {alerts.map((item) => (
                  <motion.div
                    key={item._id}
                    variants={listItem}
                    className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {item.productName || item.productId?.name || 'Producto'}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.productSku || item.productId?.sku || '—'}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-destructive tabular-nums">
                          {Number(item.availableQuantity ?? item.totalQuantity ?? item.currentStock ?? 0)}
                        </span>
                        <p className="text-[10px] text-muted-foreground">
                          mín: {Number(item.minimumStock ?? item.minStock ?? 5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAlertRestock(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                                   rounded-[var(--mobile-radius-md)] bg-emerald-500/10 text-emerald-600
                                   border border-emerald-500/20 no-tap-highlight"
                      >
                        <Plus size={14} /> Reabastecer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlertCreatePO(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                                   rounded-[var(--mobile-radius-md)] bg-blue-500/10 text-blue-500
                                   border border-blue-500/20 no-tap-highlight"
                      >
                        <ShoppingCart size={14} /> Crear pedido
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* ── Orders tab ────────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="px-4 pb-24">
            {loadingOrders ? (
              <MobileListSkeleton count={4} height="h-20" className="pt-4" />
            ) : orders.length === 0 ? (
              <MobileEmptyState
                icon={ShoppingCart}
                title="Sin órdenes de compra"
                description="Crea tu primera orden de compra desde aquí"
                action={
                  <button
                    type="button"
                    onClick={() => setCreatingPO(true)}
                    className="px-4 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
                  >
                    + Nueva compra
                  </button>
                }
              />
            ) : (
              <motion.div
                className="space-y-2 pt-4"
                variants={STAGGER(0.03)}
                initial="initial"
                animate="animate"
              >
                {orders.map((order) => (
                  <OrderCard key={order._id} order={order} />
                ))}
              </motion.div>
            )}
          </div>
        )}
      </div>

      {/* ── Sheets ──────────────────────────────────────────────────────── */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
      />

      {adjusting && (
        <MobileAdjustStock
          product={adjusting.product}
          mode={adjusting.mode}
          onClose={handleAdjustClose}
        />
      )}

      {creating && (
        <MobileCreateProduct
          open={creating}
          onClose={handleCreateClose}
        />
      )}

      {creatingPO && (
        <MobileCreatePO
          open={creatingPO}
          onClose={handlePOClose}
          preselectedProduct={poPreselect}
        />
      )}
    </div>
  );
}

// ─── Small helper components ────────────────────────────────────────────────
function FilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
      {label}
      <button type="button" onClick={onRemove} className="no-tap-highlight">
        <X size={12} />
      </button>
    </span>
  );
}

const STATUS_COLORS = {
  draft: 'bg-muted text-muted-foreground',
  sent: 'bg-blue-500/10 text-blue-500',
  partially_received: 'bg-amber-500/10 text-amber-500',
  received: 'bg-emerald-500/10 text-emerald-600',
  completed: 'bg-emerald-500/10 text-emerald-600',
  cancelled: 'bg-destructive/10 text-destructive',
};

const STATUS_LABELS = {
  draft: 'Borrador',
  sent: 'Enviada',
  partially_received: 'Parcial',
  received: 'Recibida',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

function OrderCard({ order }) {
  const [expanded, setExpanded] = useState(false);
  const status = order.status || 'draft';
  const supplierName = order.supplierName || order.supplier?.companyName || order.supplier?.name || 'Proveedor';
  const itemCount = order.items?.length || 0;
  const total = Number(order.totalAmount || 0);
  const date = order.purchaseDate || order.createdAt;

  return (
    <motion.div
      variants={listItem}
      className="bg-card border border-border rounded-[var(--mobile-radius-lg)] overflow-hidden"
    >
      <button
        type="button"
        onClick={() => { haptics.tap(); setExpanded((e) => !e); }}
        className="w-full text-left p-4 no-tap-highlight active:bg-muted/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{supplierName}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {itemCount} producto{itemCount !== 1 ? 's' : ''}
              {date && ` · ${new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-bold tabular-nums">${total.toFixed(2)}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STATUS_COLORS[status] || STATUS_COLORS.draft)}>
              {STATUS_LABELS[status] || status}
            </span>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && order.items?.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-1.5">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs">
                  <span className="truncate flex-1">{item.productName || item.productSku} × {item.quantity}</span>
                  <span className="tabular-nums ml-2">${(item.quantity * item.costPrice).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
