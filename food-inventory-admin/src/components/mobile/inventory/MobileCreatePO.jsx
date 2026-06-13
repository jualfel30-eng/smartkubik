import { useState, useCallback, useEffect, useMemo } from 'react';
import { Search, X, Plus, Minus, ChevronLeft, Check, Receipt, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import { calculatePurchaseTaxes, formatDateForApi } from '@/components/compras/compras-utils';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileReceiveRate from './MobileReceiveRate.jsx';

const TAX_TYPES = ['J', 'V', 'E', 'G', 'P', 'C'];
const CURRENCY_OPTIONS = [
  { value: 'USD_BCV', label: '$ BCV' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'VES', label: 'Bs (VES)' },
  { value: 'EUR', label: '€ EUR' },
  { value: 'EUR_BCV', label: '€ BCV' },
];
const RIF_REGEX = /^[JVEGPNC]-?[0-9]{8,9}$/;
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={cn('h-2 rounded-full transition-all', i === current ? 'w-6 bg-primary' : i < current ? 'w-2 bg-primary' : 'w-2 bg-muted')} />
      ))}
    </div>
  );
}

// ─── Step 1: Supplier ─────────────────────────────────────────────────────────
function SupplierStep({ selected, onSelect, draft, setDraft }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const search = useCallback(async (q) => {
    try {
      setLoading(true);
      const res = await fetchApi(`/customers?customerType=supplier&search=${encodeURIComponent(q)}`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setResults(list);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query.trim() || '  '), 300); return () => clearTimeout(t); }, [query, search]);

  if (selected) {
    return (
      <div className="bg-card border border-primary/30 rounded-[var(--mobile-radius-lg)] p-4 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{selected.companyName || selected.name}</p>
          <p className="text-xs text-muted-foreground truncate">{selected.taxInfo?.taxId || selected.rif || 'Proveedor seleccionado'}</p>
        </div>
        <button type="button" onClick={() => onSelect(null)} className="text-xs text-primary font-medium no-tap-highlight shrink-0">Cambiar</button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[var(--mobile-radius-lg)] bg-muted px-3 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar proveedor..." className="flex-1 bg-transparent py-3 text-sm outline-none" />
        {loading ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : query && (
          <button type="button" onClick={() => setQuery('')} className="no-tap-highlight text-muted-foreground"><X size={14} /></button>
        )}
      </div>

      <div className="space-y-2 max-h-48 overflow-y-auto mobile-scroll">
        {results.map((s) => (
          <button key={s._id} type="button" onClick={() => { haptics.select(); onSelect(s); }}
            className="w-full text-left bg-card border border-border rounded-[var(--mobile-radius-md)] p-3 no-tap-highlight active:bg-muted/30 transition-colors">
            <p className="text-sm font-medium truncate">{s.companyName || s.name}</p>
            {(s.taxInfo?.taxId || s.rif) && <p className="text-xs text-muted-foreground">{s.taxInfo?.taxId || s.rif}</p>}
          </button>
        ))}
      </div>

      {!showCreate ? (
        <button type="button" onClick={() => setShowCreate(true)} className="w-full text-center py-2.5 text-sm text-primary font-medium no-tap-highlight">
          + Registrar nuevo proveedor
        </button>
      ) : (
        <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-3 space-y-2.5">
          <input type="text" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="Razón social / Nombre *"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
          <div className="flex gap-2">
            <select value={draft.taxType} onChange={(e) => setDraft((d) => ({ ...d, taxType: e.target.value }))}
              className="w-16 rounded-[var(--mobile-radius-md)] border border-border bg-background px-2 py-2.5 text-sm">
              {TAX_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input type="text" inputMode="numeric" value={draft.rif} onChange={(e) => setDraft((d) => ({ ...d, rif: e.target.value.replace(/[^0-9]/g, '') }))}
              placeholder="RIF (8-9 dígitos) *" className="flex-1 rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
          </div>
          <input type="tel" value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} placeholder="Teléfono (opcional)"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
          <p className="text-[11px] text-muted-foreground">El proveedor se creará al guardar la compra.</p>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Products ─────────────────────────────────────────────────────────
function ProductsStep({ items, onUpdate }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q) => {
    if (q.trim().length < 2) { setResults([]); return; }
    try {
      setLoading(true);
      const res = await fetchApi(`/products?search=${encodeURIComponent(q)}&limit=20`);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setResults(list);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => search(query), 300); return () => clearTimeout(t); }, [query, search]);

  const addProduct = (p) => {
    const variants = Array.isArray(p.variants) ? p.variants.filter((v) => v && v.isActive !== false) : [];
    if (variants.length === 0) { toast.error(`${p.name} no tiene variantes activas`); return; }
    const variant = variants[0];
    const pid = p._id;
    if (items.some((i) => i.productId === pid && i.variantId === (variant?._id || undefined))) {
      toast.info('Producto ya agregado'); return;
    }
    haptics.select();
    onUpdate([...items, {
      productId: pid,
      productName: p.name,
      productSku: variant?.sku || p.sku,
      variantId: variant?._id || undefined,
      variantName: variant?.name,
      variantSku: variant?.sku,
      quantity: 1,
      costPrice: variant?.costPrice ?? 0,
      discount: 0,
      ivaApplicable: p.ivaApplicable !== false,
      ivaRate: p.ivaRate ?? 16,
      igtfExempt: p.igtfExempt === true,
    }]);
    setQuery('');
    setResults([]);
  };

  const updateQty = (idx, delta) => {
    haptics.tap();
    const next = [...items];
    next[idx] = { ...next[idx], quantity: Math.max(1, (Number(next[idx].quantity) || 1) + delta) };
    onUpdate(next);
  };
  const setQty = (idx, raw) => {
    const next = [...items];
    next[idx] = { ...next[idx], quantity: raw === '' ? '' : Math.max(0, parseInt(raw, 10) || 0) };
    onUpdate(next);
  };
  const setCost = (idx, raw) => {
    const next = [...items];
    next[idx] = { ...next[idx], costPrice: Number(raw) || 0 };
    onUpdate(next);
  };
  const removeItem = (idx) => { haptics.tap(); onUpdate(items.filter((_, i) => i !== idx)); };

  const subtotal = items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.costPrice || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-[var(--mobile-radius-lg)] bg-muted px-3 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar producto..." className="flex-1 bg-transparent py-3 text-sm outline-none" />
        {loading ? <Loader2 size={14} className="animate-spin text-muted-foreground" /> : query && (
          <button type="button" onClick={() => setQuery('')} className="no-tap-highlight text-muted-foreground"><X size={14} /></button>
        )}
      </div>

      {results.length > 0 && (
        <div className="space-y-1 max-h-36 overflow-y-auto mobile-scroll border border-border rounded-[var(--mobile-radius-md)]">
          {results.map((p) => (
            <button key={p._id} type="button" onClick={() => addProduct(p)}
              className="w-full text-left px-3 py-2.5 no-tap-highlight active:bg-muted/30 transition-colors text-sm flex justify-between items-center gap-2">
              <span className="truncate flex-1">{p.name}</span>
              {p.sku && <span className="text-xs text-muted-foreground ml-2 shrink-0">{p.sku}</span>}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Productos ({items.length})</p>
          {items.map((item, idx) => (
            <div key={`${item.productId}-${item.variantId || ''}`} className="bg-card border border-border rounded-[var(--mobile-radius-md)] p-3">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.productName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.productSku}{item.variantName ? ` · ${item.variantName}` : ''}</p>
                </div>
                <button type="button" onClick={() => removeItem(idx)} className="text-muted-foreground no-tap-highlight p-1 shrink-0"><X size={14} /></button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => updateQty(idx, -1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95"><Minus size={12} /></button>
                  <input type="number" inputMode="numeric" value={item.quantity}
                    onChange={(e) => setQty(idx, e.target.value)}
                    onBlur={(e) => { if (e.target.value === '' || parseInt(e.target.value, 10) < 1) setQty(idx, '1'); }}
                    className="w-12 h-8 text-center text-sm font-bold tabular-nums rounded-md border border-border bg-background no-spinners" />
                  <button type="button" onClick={() => updateQty(idx, 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95"><Plus size={12} /></button>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <input type="number" inputMode="decimal" value={item.costPrice || ''} onChange={(e) => setCost(idx, e.target.value)} placeholder="Costo"
                    className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm no-spinners" />
                </div>
                <span className="text-sm font-medium tabular-nums shrink-0">{fmt(Number(item.quantity || 0) * Number(item.costPrice || 0))}</span>
              </div>
            </div>
          ))}
          <div className="flex justify-between items-center pt-1 px-1">
            <span className="text-sm text-muted-foreground">Subtotal</span>
            <span className="text-sm font-bold tabular-nums">{fmt(subtotal)}</span>
          </div>
        </div>
      ) : (
        !query && <p className="text-xs text-muted-foreground text-center py-4">Busca y agrega productos a la compra</p>
      )}
    </div>
  );
}

// ─── Step 3: Document & payment ───────────────────────────────────────────────
function DocPaymentStep({ form, setForm }) {
  const upd = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updPay = (patch) => setForm((f) => ({ ...f, paymentTerms: { ...f.paymentTerms, ...patch } }));
  const pt = form.paymentTerms;

  return (
    <div className="space-y-5">
      {/* Document type */}
      <section className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Tipo de documento</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { v: 'factura_fiscal', label: 'Factura fiscal' },
            { v: 'nota_entrega', label: 'Nota de entrega' },
          ].map(({ v, label }) => (
            <button key={v} type="button" onClick={() => upd({ documentType: v })}
              className={cn('flex items-center justify-center gap-1.5 py-2.5 rounded-[var(--mobile-radius-md)] text-sm font-medium border no-tap-highlight transition-colors',
                form.documentType === v ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
              {v === 'factura_fiscal' ? <Receipt size={14} /> : <FileText size={14} />} {label}
            </button>
          ))}
        </div>
        {form.documentType === 'factura_fiscal' && (
          <p className="text-[11px] text-muted-foreground">La factura fiscal aplica IVA (16%) e IGTF según el método de pago.</p>
        )}
      </section>

      {/* Invoice number */}
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{form.documentType === 'nota_entrega' ? 'Nº Nota de entrega' : 'Nº Factura'} (opcional)</p>
        <input type="text" value={form.invoiceNumber} onChange={(e) => upd({ invoiceNumber: e.target.value })} placeholder="Ej: 00012345"
          className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
      </section>

      {/* Currency (payment method is chosen later, in Cuentas por Pagar) */}
      <section className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">Moneda de pago esperada</p>
        <select value={pt.expectedCurrency} onChange={(e) => updPay({ expectedCurrency: e.target.value })}
          className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm">
          {CURRENCY_OPTIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <p className="text-[11px] text-muted-foreground">El método de pago se define al pagar, en Cuentas por Pagar.</p>
      </section>

      {/* Credit */}
      <section className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Compra a crédito</span>
          <input type="checkbox" checked={pt.isCredit} onChange={(e) => updPay({ isCredit: e.target.checked, paymentDueDate: e.target.checked ? pt.paymentDueDate : '' })}
            className="w-5 h-5 accent-[var(--primary)]" />
        </label>
        {pt.isCredit && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Fecha de vencimiento</p>
            <input type="date" value={pt.paymentDueDate} min={new Date().toISOString().slice(0, 10)} onChange={(e) => updPay({ paymentDueDate: e.target.value })}
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm" />
          </div>
        )}
      </section>

      {/* Advance */}
      <section className="space-y-2">
        <label className="flex items-center justify-between cursor-pointer">
          <span className="text-sm font-medium">Requiere adelanto</span>
          <input type="checkbox" checked={pt.requiresAdvancePayment} onChange={(e) => updPay({ requiresAdvancePayment: e.target.checked })}
            className="w-5 h-5 accent-[var(--primary)]" />
        </label>
        {pt.requiresAdvancePayment && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Porcentaje de adelanto (%)</p>
            <input type="number" inputMode="numeric" min="0" max="100" value={pt.advancePaymentPercentage || ''} onChange={(e) => updPay({ advancePaymentPercentage: Number(e.target.value) || 0 })}
              placeholder="0" className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm no-spinners" />
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Step 4: Review ───────────────────────────────────────────────────────────
function ReviewStep({ supplierLabel, items, totals, form, setNotes }) {
  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
        <p className="text-xs text-muted-foreground mb-1">Proveedor</p>
        <p className="text-sm font-semibold">{supplierLabel}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {form.documentType === 'nota_entrega' ? 'Nota de entrega' : 'Factura fiscal'}
          {form.invoiceNumber && ` · ${form.invoiceNumber}`}
        </p>
      </div>

      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Productos ({items.length})</p>
        {items.map((item) => (
          <div key={`${item.productId}-${item.variantId || ''}`} className="flex justify-between text-sm gap-2">
            <span className="truncate flex-1">{item.productName} × {item.quantity}</span>
            <span className="font-medium tabular-nums ml-2 shrink-0">{fmt(Number(item.quantity) * Number(item.costPrice))}</span>
          </div>
        ))}
        <div className="border-t border-border pt-2 mt-1 space-y-1">
          <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span className="tabular-nums">{fmt(totals.subtotal)}</span></div>
          {totals.iva > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>IVA</span><span className="tabular-nums">{fmt(totals.iva)}</span></div>}
          {totals.igtf > 0 && <div className="flex justify-between text-sm text-muted-foreground"><span>IGTF</span><span className="tabular-nums">{fmt(totals.igtf)}</span></div>}
          <div className="flex justify-between font-bold pt-1 border-t border-border"><span>Total</span><span className="tabular-nums">{fmt(totals.total)}</span></div>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Notas (opcional)</p>
        <textarea value={form.notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observaciones..." rows={2}
          className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm resize-none" />
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function MobileCreatePO({ open, onClose, preselectedProduct }) {
  const [step, setStep] = useState(0);
  const [supplier, setSupplier] = useState(null);
  const [supplierDraft, setSupplierDraft] = useState({ name: '', taxType: 'J', rif: '', phone: '' });
  const [items, setItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [createdPO, setCreatedPO] = useState(null);
  const [form, setForm] = useState({
    documentType: 'factura_fiscal',
    invoiceNumber: '',
    actualPaymentMethod: 'bolivares_bcv',
    notes: '',
    paymentTerms: {
      isCredit: false,
      paymentDueDate: '',
      expectedCurrency: 'USD_BCV',
      requiresAdvancePayment: false,
      advancePaymentPercentage: 0,
    },
  });

  // Preselect a product (from low-stock alert)
  useEffect(() => {
    if (preselectedProduct && items.length === 0) {
      const p = preselectedProduct;
      setItems([{
        productId: p.productId?._id || p.productId || p._id,
        productName: p.productName || p.name,
        productSku: p.productSku || p.sku,
        variantId: undefined,
        quantity: 1,
        costPrice: p.averageCostPrice || p.lastCostPrice || 0,
        discount: 0,
        ivaApplicable: p.ivaApplicable !== false,
        ivaRate: p.ivaRate ?? 16,
        igtfExempt: p.igtfExempt === true,
      }]);
    }
  }, [preselectedProduct]);

  const subtotal = useMemo(() => items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.costPrice || 0) * (1 - (Number(i.discount) || 0) / 100), 0), [items]);
  const totals = useMemo(
    () => ({ subtotal, ...calculatePurchaseTaxes(subtotal, form.documentType, form.actualPaymentMethod, items) }),
    [subtotal, form.documentType, form.actualPaymentMethod, items],
  );

  const supplierLabel = supplier ? (supplier.companyName || supplier.name) : (supplierDraft.name || 'Nuevo proveedor');

  const supplierReady = (() => {
    if (supplier) return true;
    const digits = supplierDraft.rif.replace(/[^0-9]/g, '');
    return supplierDraft.name.trim() && RIF_REGEX.test(`${supplierDraft.taxType}-${digits}`);
  })();
  const itemsReady = items.length > 0 && items.every((i) => Number(i.quantity) > 0 && Number(i.costPrice) >= 0);

  const canNext = () => (step === 0 ? supplierReady : step === 1 ? itemsReady : true);
  const handleNext = () => { if (step < 3 && canNext()) { haptics.tap(); setStep(step + 1); } };
  const handleBack = () => { if (step > 0) { haptics.tap(); setStep(step - 1); } };

  const submit = async () => {
    try {
      setSubmitting(true);
      const pt = form.paymentTerms;
      const dueDate = pt.isCredit && pt.paymentDueDate ? new Date(`${pt.paymentDueDate}T12:00:00`) : null;
      const purchaseDate = new Date();
      const creditDays = dueDate ? Math.max(0, Math.ceil((dueDate - purchaseDate) / 86400000)) : 0;
      const advancePaymentAmount = pt.requiresAdvancePayment ? totals.total * (pt.advancePaymentPercentage / 100) : 0;
      const remainingBalance = totals.total - advancePaymentAmount;

      const dto = {
        purchaseDate: formatDateForApi(purchaseDate),
        documentType: form.documentType,
        invoiceNumber: form.invoiceNumber?.trim() || undefined,
        actualPaymentMethod: form.actualPaymentMethod,
        subtotal: totals.subtotal,
        ivaTotal: totals.iva,
        igtfTotal: totals.igtf,
        totalAmount: totals.total,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          quantity: Number(i.quantity) || 0,
          costPrice: Number(i.costPrice) || 0,
          discount: Number(i.discount) || 0,
          ...(i.variantId ? { variantId: i.variantId, variantName: i.variantName, variantSku: i.variantSku || i.productSku } : {}),
        })),
        notes: form.notes || undefined,
        paymentTerms: {
          isCredit: pt.isCredit,
          creditDays,
          paymentMethods: [form.actualPaymentMethod],
          expectedCurrency: pt.expectedCurrency || 'USD',
          paymentDueDate: formatDateForApi(dueDate),
          requiresAdvancePayment: pt.requiresAdvancePayment,
          advancePaymentPercentage: pt.advancePaymentPercentage,
          advancePaymentAmount,
          remainingBalance,
        },
      };

      if (supplier) {
        dto.supplierId = supplier._id;
      } else {
        const digits = supplierDraft.rif.replace(/[^0-9]/g, '');
        dto.newSupplierName = supplierDraft.name.trim();
        dto.newSupplierRif = `${supplierDraft.taxType}-${digits}`;
        dto.newSupplierContactPhone = supplierDraft.phone?.trim() || undefined;
        dto.newSupplierPaymentSettings = {
          acceptedPaymentMethods: [form.actualPaymentMethod],
          acceptsCredit: pt.isCredit,
          defaultCreditDays: creditDays,
          requiresAdvancePayment: pt.requiresAdvancePayment,
          advancePaymentPercentage: pt.advancePaymentPercentage,
        };
      }

      const response = await fetchApi('/purchases', { method: 'POST', body: JSON.stringify(dto) });
      const created = response?.data || response;
      haptics.success();
      toast.success('Compra registrada');

      // Simple mode (default): immediately offer to receive + rate the supplier,
      // mirroring desktop. Advanced mode users skip and use the Compras list.
      let advancedMode = false;
      try { advancedMode = localStorage.getItem('smartkubik_advanced_receive_mode') === 'true'; } catch { /* */ }

      if (!advancedMode && created?._id) {
        setCreatedPO({
          _id: created._id,
          poNumber: created.poNumber,
          supplierId: created.supplierId,
          supplierName: created.supplierName || supplierLabel,
          documentType: created.documentType || form.documentType,
          totalAmount: created.totalAmount ?? totals.total,
        });
      } else {
        onClose?.(true);
      }
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error al registrar la compra');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Proveedor', 'Productos', 'Documento y pago', 'Revisar compra'];

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
      {step > 0 && (
        <button type="button" onClick={handleBack} className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1">
          <ChevronLeft size={14} /> Atrás
        </button>
      )}
      {step < 3 ? (
        <button type="button" disabled={!canNext()} onClick={handleNext} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40">
          Siguiente
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={submit} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-emerald-600 active:bg-emerald-700 text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Registrar compra</>}
        </button>
      )}
    </div>
  );

  // After a successful creation, swap the wizard for the receive + rate flow.
  if (createdPO) {
    return <MobileReceiveRate po={createdPO} onClose={() => onClose?.(true)} />;
  }

  return (
    <MobileActionSheet open={open} onClose={() => onClose?.(false)} title={stepTitles[step]} footer={footer}>
      <StepIndicator current={step} total={4} />
      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: DUR.fast, ease: EASE.out }}>
          {step === 0 && <SupplierStep selected={supplier} onSelect={setSupplier} draft={supplierDraft} setDraft={setSupplierDraft} />}
          {step === 1 && <ProductsStep items={items} onUpdate={setItems} />}
          {step === 2 && <DocPaymentStep form={form} setForm={setForm} />}
          {step === 3 && <ReviewStep supplierLabel={supplierLabel} items={items} totals={totals} form={form} setNotes={(v) => setForm((f) => ({ ...f, notes: v }))} />}
        </motion.div>
      </AnimatePresence>
    </MobileActionSheet>
  );
}
