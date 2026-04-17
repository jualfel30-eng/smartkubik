import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, RefreshCw, Package, Plus, Minus, History, Filter, X, AlertTriangle, ArrowLeftRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, DUR, EASE, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileActionSheet from '../MobileActionSheet.jsx';

// ─── Tab pills ──��────────────────────────────────────────────────────────────
const TABS = [
  { id: 'stock', label: 'Stock', icon: Package },
  { id: 'movements', label: 'Movimientos', icon: ArrowLeftRight },
  { id: 'alerts', label: 'Alertas', icon: AlertTriangle },
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
              <span className="ml-1 bg-destructive text-destructive-foreground text-[10px] rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5">
                {alertCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Inventory Card ──────────────────────────────────────────────────────────
function InventoryCard({ product, onAdjust }) {
  const [expanded, setExpanded] = useState(false);
  const stock = Number(product.currentStock ?? product.quantity ?? 0);
  const minStock = Number(product.minStock ?? product.reorderPoint ?? 5);
  const maxStock = Math.max(minStock * 3, stock * 1.5, 30);
  const isLow = stock <= minStock;
  const pct = Math.min(100, (stock / maxStock) * 100);

  return (
    <motion.div
      layout
      variants={listItem}
      className="bg-card border border-border rounded-[var(--mobile-radius-lg)] overflow-hidden"
    >
      {/* Compact view */}
      <button
        type="button"
        onClick={() => { haptics.tap(); setExpanded((e) => !e); }}
        className="w-full text-left p-4 no-tap-highlight"
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">
              {product.productName || product.name || 'Sin nombre'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{product.productSku || product.sku || '—'}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              'text-sm font-bold tabular-nums',
              isLow ? 'text-destructive' : 'text-foreground',
            )}>
              {stock}
            </span>
            {isLow && (
              <span className="text-[10px] bg-destructive/10 text-destructive px-1.5 py-0.5 rounded-full font-medium">
                BAJO
              </span>
            )}
          </div>
        </div>
        {/* Stock bar */}
        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={cn('h-full rounded-full', isLow ? 'bg-destructive' : 'bg-emerald-500')}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: DUR.slow, ease: EASE.out }}
          />
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ubicacion</span>
                <span>{product.warehouseName || 'Principal'}</span>
              </div>
              {product.unitOfMeasure && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Unidad</span>
                  <span>{product.unitOfMeasure}</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Stock minimo</span>
                <span>{minStock}</span>
              </div>
              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjust?.(product, 'add'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                             rounded-[var(--mobile-radius-md)] bg-emerald-500/10 text-emerald-600
                             border border-emerald-500/20 no-tap-highlight"
                >
                  <Plus size={14} /> Agregar
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onAdjust?.(product, 'remove'); }}
                  className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium
                             rounded-[var(--mobile-radius-md)] bg-destructive/10 text-destructive
                             border border-destructive/20 no-tap-highlight"
                >
                  <Minus size={14} /> Retirar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Movement Card ───────────────────────────────────────────────────────────
function MovementCard({ mov }) {
  const isPositive = mov.type === 'purchase' || mov.type === 'adjustment_in' || mov.type === 'transfer_in';
  const qty = Number(mov.quantity || 0);

  return (
    <motion.div
      variants={listItem}
      className="bg-card border border-border rounded-[var(--mobile-radius-md)] px-4 py-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{mov.productName || mov.productSku || 'Producto'}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {mov.type?.replace(/_/g, ' ') || 'Movimiento'} · {mov.reason || '—'}
          </p>
        </div>
        <span className={cn(
          'text-sm font-bold tabular-nums',
          isPositive ? 'text-emerald-500' : 'text-destructive',
        )}>
          {isPositive ? '+' : '-'}{qty}
        </span>
      </div>
      {mov.createdAt && (
        <p className="text-[11px] text-muted-foreground mt-1">
          {new Date(mov.createdAt).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </motion.div>
  );
}

// ─── Adjust Stock Sheet ──────────────────────────────────────────────────────
function AdjustStockSheet({ product, mode, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentStock = Number(product?.currentStock ?? product?.quantity ?? 0);
  const newStock = mode === 'add' ? currentStock + quantity : Math.max(0, currentStock - quantity);

  const reasons = mode === 'add'
    ? ['Compra', 'Devolucion', 'Correccion', 'Otro']
    : ['Venta', 'Merma', 'Correccion', 'Otro'];

  const submit = async () => {
    if (quantity <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    try {
      setSubmitting(true);
      await fetchApi('/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.productId || product._id,
          quantity: mode === 'add' ? quantity : -quantity,
          reason: reason || (mode === 'add' ? 'Ajuste positivo' : 'Ajuste negativo'),
          notes: note || undefined,
        }),
      });
      haptics.success();
      toast.success(`Stock ajustado: ${product.productName || product.name} → ${newStock}`);
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'No se pudo ajustar el stock');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border safe-bottom"
      style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
      <p className="text-xs text-muted-foreground text-center mb-2">
        Stock actual: {currentStock} → Nuevo: <strong>{newStock}</strong>
      </p>
      <button
        type="button"
        disabled={submitting || quantity <= 0}
        onClick={submit}
        className={cn(
          'w-full py-3.5 rounded-[var(--mobile-radius-md)] text-base font-semibold no-tap-highlight disabled:opacity-40',
          mode === 'add'
            ? 'bg-emerald-600 text-white'
            : 'bg-destructive text-destructive-foreground',
        )}
      >
        {submitting ? 'Ajustando...' : mode === 'add' ? `Agregar ${quantity}` : `Retirar ${quantity}`}
      </button>
    </div>
  );

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title={mode === 'add' ? 'Agregar stock' : 'Retirar stock'}
      footer={footer}
    >
      <div className="space-y-4">
        <p className="text-sm font-medium">{product?.productName || product?.name}</p>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95"
          >
            −
          </button>
          <span className="text-3xl font-bold tabular-nums w-16 text-center">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95"
          >
            +
          </button>
        </div>

        {/* Reason chips */}
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">Razon</p>
          <div className="flex flex-wrap gap-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { haptics.select(); setReason(r); }}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  reason === r ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </section>

        {/* Note */}
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-1">Nota (opcional)</p>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detalle del ajuste..."
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
          />
        </section>
      </div>
    </MobileActionSheet>
  );
}

// ─── Filter Sheet ────────────────────────────────────────────────────────────
function FilterSheet({ open, onClose, filters, onApply }) {
  const [stockFilter, setStockFilter] = useState(filters.stock || 'all');

  return (
    <MobileActionSheet
      open={open}
      onClose={onClose}
      title="Filtros"
      footer={
        <div className="px-4 pt-3 pb-4 bg-card border-t border-border safe-bottom flex gap-3"
          style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
          <button
            type="button"
            onClick={() => { setStockFilter('all'); onApply({ stock: 'all' }); }}
            className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={() => onApply({ stock: stockFilter })}
            className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
          >
            Aplicar filtros
          </button>
        </div>
      }
    >
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
    </MobileActionSheet>
  );
}

// ─── Main component ���─────────────────────────────────────────────────────────
export default function MobileInventoryPage() {
  const [activeTab, setActiveTab] = useState('stock');
  const [inventory, setInventory] = useState([]);
  const [movements, setMovements] = useState([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ stock: 'all' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState(null); // { product, mode }

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [invRes, movRes] = await Promise.allSettled([
        fetchApi('/inventory?limit=200'),
        fetchApi('/inventory-movements?limit=50&sort=-createdAt'),
      ]);
      if (invRes.status === 'fulfilled') {
        const list = Array.isArray(invRes.value?.data) ? invRes.value.data : Array.isArray(invRes.value) ? invRes.value : [];
        setInventory(list);
      }
      if (movRes.status === 'fulfilled') {
        const list = Array.isArray(movRes.value?.data) ? movRes.value.data : Array.isArray(movRes.value) ? movRes.value : [];
        setMovements(list);
      }
    } catch {
      toast.error('Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered inventory
  const filtered = useMemo(() => {
    let result = [...inventory];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        (p.productName || p.name || '').toLowerCase().includes(q) ||
        (p.productSku || p.sku || '').toLowerCase().includes(q),
      );
    }
    if (filters.stock === 'low') {
      result = result.filter((p) => {
        const stock = Number(p.currentStock ?? p.quantity ?? 0);
        const min = Number(p.minStock ?? p.reorderPoint ?? 5);
        return stock > 0 && stock <= min;
      });
    } else if (filters.stock === 'out') {
      result = result.filter((p) => Number(p.currentStock ?? p.quantity ?? 0) <= 0);
    }
    return result;
  }, [inventory, search, filters]);

  const lowStockCount = useMemo(() =>
    inventory.filter((p) => {
      const stock = Number(p.currentStock ?? p.quantity ?? 0);
      const min = Number(p.minStock ?? p.reorderPoint ?? 5);
      return stock <= min;
    }).length,
  [inventory]);

  const handleAdjust = (product, mode) => {
    setAdjusting({ product, mode });
  };

  const handleAdjustClose = (saved) => {
    setAdjusting(null);
    if (saved) load();
  };

  const activeFilterCount = filters.stock !== 'all' ? 1 : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h1 className="text-xl font-bold">Inventario</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => load()}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <TabPills activeTab={activeTab} onTabChange={setActiveTab} alertCount={lowStockCount} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mobile-scroll">
        {activeTab === 'stock' && (
          <>
            {/* Search + filter */}
            <div className="sticky top-0 z-[5] bg-background px-4 py-2 flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o SKU..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-muted rounded-xl pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className={cn(
                  'p-2.5 rounded-xl border transition-colors no-tap-highlight relative',
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

            {/* Product list */}
            <div className="px-4 pb-24">
              {loading && inventory.length === 0 ? (
                <div className="space-y-3 animate-pulse pt-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-20 bg-muted rounded-[var(--mobile-radius-lg)]" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package size={40} className="text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium">
                    {search || activeFilterCount > 0 ? 'Sin resultados' : 'Sin productos en inventario'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? 'Intenta con otro termino' : 'Agrega productos desde el modulo de Productos'}
                  </p>
                </div>
              ) : (
                <motion.div
                  className="space-y-2 pt-2"
                  variants={STAGGER(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {filtered.map((product) => (
                    <InventoryCard
                      key={product._id || product.productId}
                      product={product}
                      onAdjust={handleAdjust}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </>
        )}

        {activeTab === 'movements' && (
          <div className="px-4 pb-24">
            {loading ? (
              <div className="space-y-3 animate-pulse pt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-[var(--mobile-radius-md)]" />
                ))}
              </div>
            ) : movements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <ArrowLeftRight size={40} className="text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium">Sin movimientos recientes</p>
              </div>
            ) : (
              <motion.div
                className="space-y-2 pt-4"
                variants={STAGGER(0.03)}
                initial="initial"
                animate="animate"
              >
                {movements.map((mov) => (
                  <MovementCard key={mov._id} mov={mov} />
                ))}
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="px-4 pb-24">
            {(() => {
              const lowStock = inventory.filter((p) => {
                const stock = Number(p.currentStock ?? p.quantity ?? 0);
                const min = Number(p.minStock ?? p.reorderPoint ?? 5);
                return stock <= min;
              });
              if (lowStock.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <AlertTriangle size={40} className="text-emerald-500/30 mb-3" />
                    <p className="text-sm font-medium">Sin alertas de stock</p>
                    <p className="text-xs text-muted-foreground mt-1">Todos los productos estan al dia</p>
                  </div>
                );
              }
              return (
                <motion.div
                  className="space-y-2 pt-4"
                  variants={STAGGER(0.03)}
                  initial="initial"
                  animate="animate"
                >
                  {lowStock.map((product) => (
                    <InventoryCard
                      key={product._id || product.productId}
                      product={product}
                      onAdjust={handleAdjust}
                    />
                  ))}
                </motion.div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Filter sheet */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={(f) => { setFilters(f); setFilterOpen(false); }}
      />

      {/* Adjust stock sheet */}
      {adjusting && (
        <AdjustStockSheet
          product={adjusting.product}
          mode={adjusting.mode}
          onClose={handleAdjustClose}
        />
      )}
    </div>
  );
}
