import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package, RefreshCw, Filter, ShoppingCart, AlertTriangle, ArrowLeftRight, ArrowRightLeft, Plus, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useInventoryCache } from '@/hooks/useInventoryCache';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { STAGGER } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { useFabContext } from '@/contexts/FabContext';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
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
import MobileProductCatalog from './MobileProductCatalog.jsx';
import MobileAddInventory from './MobileAddInventory.jsx';
import MobileTransfersTab from './MobileTransfersTab.jsx';
import MobileCreateTransfer from './MobileCreateTransfer.jsx';
import MobilePurchasesTab from './MobilePurchasesTab.jsx';

// Encuentra el ancestro que realmente scrollea (overflow auto/scroll con
// contenido desbordado). En este layout el scroller real es el contenedor de
// App.jsx, no esta página: su altura no se propaga a través de PageTransition,
// así que window.scrollY siempre es 0. Resolverlo desde el elemento tocado
// evita que el pull se crea "arriba" a mitad de lista.
function getScrollParent(node) {
  let el = node?.parentElement;
  while (el) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return null;
}

// ─── Pull-to-refresh hook (duplicated from MobileAppointmentsPage) ──────────
function usePullToRefresh(onRefresh) {
  const startY = useRef(null);
  const scrollEl = useRef(null);
  const [pulling, setPulling] = useState(false);
  const [distance, setDistance] = useState(0);
  const THRESHOLD = 64;

  const onTouchStart = useCallback((e) => {
    scrollEl.current = getScrollParent(e.target);
    const el = scrollEl.current;
    const top = el ? el.scrollTop <= 0 : window.scrollY <= 0;
    startY.current = top ? e.touches[0].clientY : null;
  }, []);

  const onTouchMove = useCallback((e) => {
    if (startY.current === null) return;
    // En cuanto dejamos de estar arriba del todo, ceder al scroll nativo.
    const el = scrollEl.current;
    const top = el ? el.scrollTop <= 0 : window.scrollY <= 0;
    if (!top) {
      startY.current = null;
      setPulling(false);
      setDistance(0);
      return;
    }
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

// ─── Tab config (order is built in the component since it depends on flags) ──

function TabPills({ tabs, activeTab, onTabChange, alertCount }) {
  return (
    <div
      className="flex gap-1 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-border"
      style={{ scrollSnapType: 'x mandatory' }}
    >
      {tabs.map((tab) => {
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
  const { flags } = useFeatureFlags();
  const transfersEnabled = !!flags?.MULTI_LOCATION;
  // Orden de Operaciones: Stock → Compras → Alertas → (Traslados) → Movimientos.
  const tabs = useMemo(() => [
    { id: 'stock', label: 'Stock', icon: Package },
    { id: 'orders', label: 'Compras', icon: ShoppingCart },
    { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
    ...(transfersEnabled ? [{ id: 'transfers', label: 'Traslados', icon: ArrowRightLeft }] : []),
    { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  ], [transfersEnabled]);
  const [mode, setMode] = useState('products'); // 'products' | 'operations'
  const [activeTab, setActiveTab] = useState('stock');

  // Data state
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertCount, setAlertCount] = useState(0);

  // Loading per tab
  const [loadingStock, setLoadingStock] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  // Track which tabs have been loaded
  const loadedTabs = useRef({ stock: false, movements: false, alerts: false });

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
  const [addingInventory, setAddingInventory] = useState(false);
  const [creatingTransfer, setCreatingTransfer] = useState(false);
  const [transfersKey, setTransfersKey] = useState(0);
  const [purchasesKey, setPurchasesKey] = useState(0);

  // ─── Data loaders (cacheados con React Query: reentrar al módulo = instantáneo
  // dentro del staleTime; las mutaciones invalidan ['inventory']) ──────────────
  const { tenant } = useAuth();
  const queryClient = useQueryClient();
  const { invalidateInventoryData } = useInventoryCache();
  const cachedGet = useCallback(
    (url) =>
      queryClient.fetchQuery({
        queryKey: ['inventory', tenant?.id, url],
        queryFn: () => fetchApi(url),
        staleTime: 120_000,
      }),
    [queryClient, tenant?.id],
  );

  const loadStock = useCallback(async () => {
    try {
      setLoadingStock(true);
      const [invRes, countRes] = await Promise.allSettled([
        cachedGet('/inventory?limit=100'),
        cachedGet('/inventory/alerts/count'),
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
  }, [cachedGet]);

  const loadMovements = useCallback(async () => {
    try {
      setLoadingMovements(true);
      const res = await cachedGet('/inventory-movements?limit=50&sort=-createdAt');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setMovements(list);
      loadedTabs.current.movements = true;
    } catch {
      toast.error('Error al cargar movimientos');
    } finally {
      setLoadingMovements(false);
    }
  }, [cachedGet]);

  const loadAlerts = useCallback(async () => {
    try {
      setLoadingAlerts(true);
      const res = await cachedGet('/inventory/alerts/low-stock');
      const raw = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      // Only take first 50 to avoid performance issues with 360+ items
      const list = raw.slice(0, 50).map((item, i) => ({
        _id: String(item._id || i),
        productId: String(item.productId || ''),
        productName: String(item.productName || 'Producto'),
        productSku: String(item.productSku || '—'),
        availableQuantity: Number(item.availableQuantity ?? 0),
        minimumStock: Number(item.minimumStock ?? 5),
      }));
      setAlerts(list);
      setAlertCount(raw.length);
      loadedTabs.current.alerts = true;
    } catch {
      // Silently fail — don't toast to avoid potential render issues
    } finally {
      setLoadingAlerts(false);
    }
  }, [cachedGet]);

  // Initial load
  useEffect(() => { loadStock(); }, [loadStock]);

  // Lazy load on tab switch
  useEffect(() => {
    if (activeTab === 'movements' && !loadedTabs.current.movements) loadMovements();
    if (activeTab === 'alerts' && !loadedTabs.current.alerts) loadAlerts();
  }, [activeTab, loadMovements, loadAlerts]);

  // Refresh current tab
  const refreshTab = useCallback(async () => {
    if (activeTab === 'stock') await loadStock();
    else if (activeTab === 'movements') await loadMovements();
    else if (activeTab === 'alerts') await loadAlerts();
    else if (activeTab === 'orders') setPurchasesKey((k) => k + 1);
    else if (activeTab === 'transfers') setTransfersKey((k) => k + 1);
  }, [activeTab, loadStock, loadMovements, loadAlerts]);

  // Pull to refresh
  const pull = usePullToRefresh(refreshTab);

  // ─── FAB context ────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === 'products') {
      setContextAction({
        icon: Plus,
        label: 'Nuevo producto',
        action: () => setCreating(true),
      });
    } else if (activeTab === 'stock') {
      setContextAction({
        icon: Package,
        label: 'Agregar inventario',
        action: () => setAddingInventory(true),
      });
    } else if (activeTab === 'orders') {
      setContextAction({
        icon: ShoppingCart,
        label: 'Nueva compra',
        action: () => setCreatingPO(true),
      });
    } else if (activeTab === 'transfers') {
      setContextAction({
        icon: ArrowRightLeft,
        label: 'Nuevo traslado',
        action: () => setCreatingTransfer(true),
      });
    } else {
      clearContextAction();
    }
    return () => clearContextAction();
  }, [mode, activeTab, setContextAction, clearContextAction]);

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
  const computedAlertCount = useMemo(() =>
    inventory.filter((p) => {
      const stock = Number(p.availableQuantity ?? p.totalQuantity ?? p.currentStock ?? 0);
      const min = Number(p.minStock ?? p.minimumStock ?? 5);
      return stock <= min;
    }).length,
  [inventory]);
  const displayAlertCount = alertCount || computedAlertCount;

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
      invalidateInventoryData();
      loadStock();
      loadedTabs.current.movements = false;
      loadedTabs.current.alerts = false;
    }
  };

  const handleCreateClose = (saved) => {
    setCreating(false);
    if (saved) {
      invalidateInventoryData();
      loadStock();
    }
  };

  const handlePOClose = (saved) => {
    setCreatingPO(false);
    setPoPreselect(null);
    if (saved) {
      setPurchasesKey((k) => k + 1);
      invalidateInventoryData();
      loadStock();
      loadedTabs.current.alerts = false;
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
            onClick={mode === 'operations' ? refreshTab : undefined}
            className="p-2 rounded-lg hover:bg-accent transition-colors no-tap-highlight"
          >
            <RefreshCw className={cn('h-4 w-4', loadingStock && mode === 'operations' && 'animate-spin')} />
          </button>
        </div>

        {/* Segmented control */}
        <div className="px-4 pb-2">
          <div className="relative flex bg-muted rounded-lg p-1">
            {['products', 'operations'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { haptics.tap(); setMode(m); }}
                className={cn(
                  'relative z-10 flex-1 py-2 text-sm font-medium rounded-md transition-colors no-tap-highlight',
                  mode === m ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {m === 'products' ? 'Productos' : 'Operaciones'}
              </button>
            ))}
            {/* Active indicator */}
            <motion.div
              className="absolute top-1 bottom-1 rounded-md bg-background shadow-sm"
              initial={false}
              animate={{
                left: mode === 'products' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
              }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          </div>
        </div>

        {mode === 'operations' && (
          <TabPills tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} alertCount={displayAlertCount} />
        )}
      </div>

      {/* Content — fluye en el scroller real (App.jsx), sin scroller interno
          que con overscroll-behavior:contain bloqueaba la propagación en Android */}
      <div className="flex-1">
        {/* ── Products mode ─────────────────────────────────────────────── */}
        {/* Se mantiene MONTADO (oculto en otros modos) para que volver a
            "Productos" sea instantáneo — sin remontar ni recargar las 200
            tarjetas. El catálogo usa useQuery, así que sigue fresco. */}
        <div style={{ display: mode === 'products' ? 'block' : 'none' }}>
          <MobileProductCatalog onCreateProduct={() => setCreating(true)} />
        </div>

        {/* ── Operations mode ───────────────────────────────────────────── */}
        {mode === 'operations' && (<>
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
                  description={search ? 'Intenta con otro término' : 'Agrega inventario a tus productos desde aqui'}
                  action={!search && activeFilterCount === 0 && (
                    <button
                      type="button"
                      onClick={() => setAddingInventory(true)}
                      className="px-4 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
                    >
                      + Agregar inventario
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
                description="Todo el inventario esta al dia"
              />
            ) : (
              <div className="space-y-2 pt-4">
                {alerts.map((item) => (
                  <div
                    key={item._id}
                    className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{item.productName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.productSku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-destructive tabular-nums">{item.availableQuantity}</span>
                        <p className="text-[10px] text-muted-foreground">{'min: ' + item.minimumStock}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAlertRestock(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium rounded-[var(--mobile-radius-md)] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 no-tap-highlight"
                      >
                        <Plus size={14} /> Reabastecer
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAlertCreatePO(item)}
                        className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium rounded-[var(--mobile-radius-md)] bg-blue-500/10 text-blue-500 border border-blue-500/20 no-tap-highlight"
                      >
                        <ShoppingCart size={14} /> Crear pedido
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Compras tab ───────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <MobilePurchasesTab refreshKey={purchasesKey} />
        )}

        {/* ── Transfers tab ─────────────────────────────────────────────── */}
        {activeTab === 'transfers' && transfersEnabled && (
          <MobileTransfersTab refreshKey={transfersKey} />
        )}
        </>)}
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

      {addingInventory && (
        <MobileAddInventory
          open={addingInventory}
          onClose={(saved) => {
            setAddingInventory(false);
            if (saved) {
              invalidateInventoryData();
              loadStock();
              loadedTabs.current.movements = false;
              loadedTabs.current.alerts = false;
            }
          }}
        />
      )}

      {creatingTransfer && (
        <MobileCreateTransfer
          open={creatingTransfer}
          onClose={(saved) => {
            setCreatingTransfer(false);
            if (saved) {
              setTransfersKey((k) => k + 1);
              invalidateInventoryData();
              loadStock();
              loadedTabs.current.movements = false;
            }
          }}
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

