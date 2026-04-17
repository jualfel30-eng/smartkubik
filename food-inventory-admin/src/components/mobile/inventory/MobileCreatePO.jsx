import { useState, useCallback, useEffect } from 'react';
import { Search, X, Plus, Minus, ChevronLeft, ShoppingCart, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'w-2 h-2 rounded-full transition-colors',
            i <= current ? 'bg-primary' : 'bg-muted',
          )}
        />
      ))}
    </div>
  );
}

// ─── Step 1: Supplier ───────────────────────────────────────────────────────
function SupplierStep({ selected, onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const res = await fetchApi(`/customers?customerType=supplier&search=${encodeURIComponent(q)}&limit=20`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  // Load initial suppliers on mount
  useEffect(() => { search('  '); }, []);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Ingresa el nombre'); return; }
    try {
      setCreating(true);
      const res = await fetchApi('/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: newName.trim(),
          companyName: newName.trim(),
          phone: newPhone || undefined,
          supplierType: 'distributor',
        }),
      });
      const id = res?._id || res?.data?._id;
      haptics.success();
      onSelect({ _id: id, name: newName.trim(), companyName: newName.trim() });
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al crear proveedor');
    } finally {
      setCreating(false);
    }
  };

  if (selected) {
    return (
      <div className="bg-card border border-primary/30 rounded-[var(--mobile-radius-lg)] p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">{selected.companyName || selected.name}</p>
          <p className="text-xs text-muted-foreground">{selected.taxInfo?.taxId || 'Proveedor seleccionado'}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="text-xs text-primary no-tap-highlight"
        >
          Cambiar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-[var(--mobile-radius-lg)] bg-muted px-3 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar proveedor (mín. 2 caracteres)..."
          className="flex-1 bg-transparent py-3 text-sm outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="no-tap-highlight text-muted-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading && <p className="text-xs text-muted-foreground text-center py-2">Buscando...</p>}
      <div className="space-y-2 max-h-48 overflow-y-auto mobile-scroll">
        {results.map((s) => (
          <button
            key={s._id}
            type="button"
            onClick={() => { haptics.select(); onSelect(s); }}
            className="w-full text-left bg-card border border-border rounded-[var(--mobile-radius-md)] p-3 no-tap-highlight active:bg-muted/30 transition-colors"
          >
            <p className="text-sm font-medium">{s.companyName || s.name}</p>
            {s.taxInfo?.taxId && (
              <p className="text-xs text-muted-foreground">{s.taxInfo.taxId}</p>
            )}
          </button>
        ))}
      </div>

      {/* Create new inline */}
      {!showCreate ? (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="w-full text-center py-2.5 text-sm text-primary font-medium no-tap-highlight"
        >
          + Crear nuevo proveedor
        </button>
      ) : (
        <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-3 space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nombre del proveedor"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
          />
          <input
            type="tel"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            placeholder="Teléfono (opcional)"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="flex-1 py-2.5 rounded-[var(--mobile-radius-md)] border border-border text-sm no-tap-highlight"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={handleCreate}
              className="flex-1 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-medium no-tap-highlight disabled:opacity-40"
            >
              {creating ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Products ───────────────────────────────────────────────────────
function ProductsStep({ items, onUpdate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const res = await fetchApi(`/products?search=${encodeURIComponent(q)}&limit=20`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setResults(list);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const addItem = (product) => {
    const existing = items.find((i) => i.productId === product._id);
    if (existing) {
      toast.info('Producto ya agregado');
      return;
    }
    const variant = product.variants?.[0];
    haptics.select();
    onUpdate([...items, {
      productId: product._id,
      productName: product.name,
      productSku: product.sku,
      quantity: 1,
      costPrice: variant?.costPrice || 0,
    }]);
    setQuery('');
    setResults([]);
  };

  const updateQty = (idx, delta) => {
    haptics.tap();
    const next = [...items];
    next[idx] = { ...next[idx], quantity: Math.max(1, next[idx].quantity + delta) };
    onUpdate(next);
  };

  const updateCost = (idx, cost) => {
    const next = [...items];
    next[idx] = { ...next[idx], costPrice: Number(cost) || 0 };
    onUpdate(next);
  };

  const removeItem = (idx) => {
    haptics.tap();
    onUpdate(items.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  return (
    <div className="space-y-3">
      {/* Search products */}
      <div className="flex items-center gap-2 rounded-[var(--mobile-radius-lg)] bg-muted px-3 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="flex-1 bg-transparent py-3 text-sm outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery('')} className="no-tap-highlight text-muted-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Search results */}
      {loading && <p className="text-xs text-muted-foreground text-center">Buscando...</p>}
      {results.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto mobile-scroll border border-border rounded-[var(--mobile-radius-md)]">
          {results.map((p) => (
            <button
              key={p._id}
              type="button"
              onClick={() => addItem(p)}
              className="w-full text-left px-3 py-2.5 no-tap-highlight active:bg-muted/30 transition-colors text-sm flex justify-between items-center"
            >
              <span className="truncate flex-1">{p.name}</span>
              <span className="text-xs text-muted-foreground ml-2">{p.sku}</span>
            </button>
          ))}
        </div>
      )}

      {/* Cart items */}
      {items.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Productos agregados ({items.length})</p>
          {items.map((item, idx) => (
            <div key={item.productId} className="bg-card border border-border rounded-[var(--mobile-radius-md)] p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">{item.productSku}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-muted-foreground no-tap-highlight p-1"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {/* Quantity stepper */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQty(idx, -1)}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95"
                  >
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold tabular-nums w-8 text-center">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQty(idx, 1)}
                    className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                {/* Cost input */}
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={item.costPrice || ''}
                    onChange={(e) => updateCost(idx, e.target.value)}
                    placeholder="Costo"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
                  />
                </div>
                {/* Line total */}
                <span className="text-sm font-medium tabular-nums shrink-0">
                  ${(item.quantity * item.costPrice).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          {/* Subtotal */}
          <div className="flex justify-between items-center pt-1 px-1">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-bold tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {items.length === 0 && !query && (
        <p className="text-xs text-muted-foreground text-center py-4">Busca y agrega productos a la orden</p>
      )}
    </div>
  );
}

// ─── Step 3: Review ─────────────────────────────────────────────────────────
function ReviewStep({ supplier, items }) {
  const subtotal = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);

  return (
    <div className="space-y-4">
      {/* Supplier */}
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
        <p className="text-xs text-muted-foreground mb-1">Proveedor</p>
        <p className="text-sm font-semibold">{supplier?.companyName || supplier?.name}</p>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Productos ({items.length})</p>
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm">
            <span className="truncate flex-1">{item.productName} × {item.quantity}</span>
            <span className="font-medium tabular-nums ml-2">${(item.quantity * item.costPrice).toFixed(2)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-2 flex justify-between">
          <span className="text-sm font-semibold">Total</span>
          <span className="text-sm font-bold tabular-nums">${subtotal.toFixed(2)}</span>
        </div>
      </div>

      {/* Date */}
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
        <p className="text-xs text-muted-foreground mb-1">Fecha</p>
        <p className="text-sm">{new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>
  );
}

// ─── Main PO wizard ─────────────────────────────────────────────────────────
export default function MobileCreatePO({ open, onClose, preselectedProduct }) {
  const [step, setStep] = useState(0);
  const [supplier, setSupplier] = useState(null);
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Pre-fill product if provided
  useEffect(() => {
    if (preselectedProduct && items.length === 0) {
      const p = preselectedProduct;
      setItems([{
        productId: p.productId?._id || p.productId || p._id,
        productName: p.productName || p.name,
        productSku: p.productSku || p.sku,
        quantity: 1,
        costPrice: p.averageCostPrice || p.lastCostPrice || 0,
      }]);
      setStep(0); // start at supplier step
    }
  }, [preselectedProduct]);

  const stepTitles = ['Seleccionar proveedor', 'Agregar productos', 'Revisar orden'];

  const canNext = () => {
    if (step === 0) return !!supplier;
    if (step === 1) return items.length > 0;
    return true;
  };

  const handleNext = () => {
    if (step < 2) { haptics.tap(); setStep(step + 1); }
  };

  const handleBack = () => {
    if (step > 0) { haptics.tap(); setStep(step - 1); }
  };

  const submit = async () => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.costPrice, 0);
    try {
      setSubmitting(true);
      await fetchApi('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: supplier._id,
          purchaseDate: new Date().toISOString().slice(0, 10),
          documentType: 'purchase_order',
          subtotal,
          ivaTotal: 0,
          igtfTotal: 0,
          totalAmount: subtotal,
          actualPaymentMethod: 'efectivo',
          items: items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            productSku: i.productSku,
            quantity: i.quantity,
            costPrice: i.costPrice,
          })),
          paymentTerms: {
            isCredit: false,
            paymentMethods: ['efectivo'],
            expectedCurrency: 'USD',
          },
        }),
      });
      haptics.success();
      toast.success('Orden de compra creada');
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al crear orden');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3">
      {step > 0 && (
        <button
          type="button"
          onClick={handleBack}
          className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1"
        >
          <ChevronLeft size={14} /> Atrás
        </button>
      )}
      {step < 2 ? (
        <button
          type="button"
          disabled={!canNext()}
          onClick={handleNext}
          className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40"
        >
          Siguiente
        </button>
      ) : (
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2"
        >
          {submitting ? 'Creando...' : (
            <>
              <Check size={16} /> Crear orden
            </>
          )}
        </button>
      )}
    </div>
  );

  return (
    <MobileActionSheet
      open={open}
      onClose={() => onClose?.(false)}
      title={stepTitles[step]}
      footer={footer}
    >
      <StepIndicator current={step} total={3} />
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
        >
          {step === 0 && <SupplierStep selected={supplier} onSelect={setSupplier} />}
          {step === 1 && <ProductsStep items={items} onUpdate={setItems} />}
          {step === 2 && <ReviewStep supplier={supplier} items={items} />}
        </motion.div>
      </AnimatePresence>
    </MobileActionSheet>
  );
}
