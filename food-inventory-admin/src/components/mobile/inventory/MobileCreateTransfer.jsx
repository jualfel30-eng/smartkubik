import { useState, useEffect, useCallback, useMemo } from 'react';
import { Search, X, Plus, Minus, ChevronLeft, ChevronRight, Check, Zap, Building2, MapPin, Warehouse, PackageOpen, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  fetchApi,
  getSubsidiaries,
  getBusinessLocations,
  createTransferOrder,
  requestTransferOrder,
  approveTransferOrder,
  prepareTransferOrder,
  shipTransferOrder,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import { useAuth } from '@/hooks/use-auth';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

const STORAGE_KEY = 'smartkubik_transfer_defaults';

function loadDefaults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveDefaults(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* */ }
}

// ─── Step indicator ─────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn(
            'h-2 rounded-full transition-all',
            i === current ? 'w-6 bg-primary' : i < current ? 'w-2 bg-primary' : 'w-2 bg-muted',
          )}
        />
      ))}
    </div>
  );
}

// ─── Inline picker (tappable rows that collapse once chosen) ─────────────────
function PickerField({ label, value, options, getId, getLabel, getSub, onSelect, placeholder, disabled, disabledHint, emptyHint, renderTag }) {
  const selected = options.find((o) => getId(o) === value);

  if (selected) {
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="bg-card border border-primary/30 rounded-[var(--mobile-radius-md)] p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium truncate flex items-center gap-1.5">
              {getLabel(selected)}
              {renderTag?.(selected)}
            </p>
            {getSub?.(selected) && (
              <p className="text-xs text-muted-foreground truncate">{getSub(selected)}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => { haptics.tap(); onSelect(''); }}
            className="text-xs text-primary font-medium no-tap-highlight shrink-0"
          >
            Cambiar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {disabled ? (
        <p className="text-xs text-muted-foreground/70 py-2">{disabledHint}</p>
      ) : options.length === 0 ? (
        <p className="text-xs text-amber-500 py-2">{emptyHint || 'No hay opciones disponibles'}</p>
      ) : (
        <div className="space-y-1 max-h-44 overflow-y-auto mobile-scroll">
          {options.map((o) => (
            <button
              key={getId(o)}
              type="button"
              onClick={() => { haptics.select(); onSelect(getId(o)); }}
              className="w-full text-left bg-card border border-border rounded-[var(--mobile-radius-md)] p-3 no-tap-highlight active:bg-muted/30 transition-colors"
            >
              <p className="text-sm font-medium flex items-center gap-1.5">
                {getLabel(o)}
                {renderTag?.(o)}
              </p>
              {getSub?.(o) && <p className="text-xs text-muted-foreground">{getSub(o)}</p>}
            </button>
          ))}
        </div>
      )}
      {!disabled && !placeholder ? null : !disabled && options.length === 0 && placeholder && (
        <p className="text-xs text-muted-foreground/70">{placeholder}</p>
      )}
    </div>
  );
}

// ─── Step 1: Route (origen / destino) ────────────────────────────────────────
function RouteStep({ ctx, form, setForm }) {
  const { transferMode, isSingleTenant, tenant, subsidiaries, locations, sourceWarehouses, destWarehouses } = ctx;

  return (
    <div className="space-y-5">
      {/* ORIGEN */}
      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5">
          <MapPin size={14} /> Origen
        </h4>

        {transferMode === 'locations' && (
          <PickerField
            label="Ubicación origen"
            value={form.sourceLocationId}
            options={locations.filter((l) => (l._id || l.id) !== form.destinationLocationId)}
            getId={(l) => l._id || l.id}
            getLabel={(l) => l.name}
            getSub={(l) => l.code}
            onSelect={(v) => setForm((f) => ({ ...f, sourceLocationId: v, sourceWarehouseId: '' }))}
          />
        )}

        {transferMode === 'sedes' && !isSingleTenant && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">Sede origen</p>
            <div className="bg-muted/60 border border-border rounded-[var(--mobile-radius-md)] p-3">
              <p className="text-sm font-medium">{tenant?.name} <span className="text-xs text-muted-foreground">(actual)</span></p>
            </div>
          </div>
        )}

        <PickerField
          label="Almacén origen"
          value={form.sourceWarehouseId}
          options={sourceWarehouses}
          getId={(w) => w._id || w.id}
          getLabel={(w) => w.name}
          getSub={(w) => w.code}
          onSelect={(v) => setForm((f) => ({ ...f, sourceWarehouseId: v }))}
          disabled={transferMode === 'locations' && !form.sourceLocationId}
          disabledHint="Selecciona una ubicación primero"
          emptyHint="No hay almacenes en el origen"
        />
      </section>

      {/* DESTINO */}
      <section className="space-y-3">
        <h4 className="text-sm font-semibold text-blue-500 flex items-center gap-1.5">
          <MapPin size={14} /> Destino
        </h4>

        {transferMode === 'locations' && (
          <PickerField
            label="Ubicación destino"
            value={form.destinationLocationId}
            options={locations.filter((l) => (l._id || l.id) !== form.sourceLocationId)}
            getId={(l) => l._id || l.id}
            getLabel={(l) => l.name}
            getSub={(l) => l.code}
            onSelect={(v) => setForm((f) => ({ ...f, destinationLocationId: v, destinationWarehouseId: '' }))}
          />
        )}

        {transferMode === 'sedes' && !isSingleTenant && (
          <PickerField
            label="Sede destino"
            value={form.destinationTenantId}
            options={subsidiaries.filter((s) => {
              const id = s._id || s.id;
              return id !== (tenant?._id || tenant?.id);
            })}
            getId={(s) => s._id || s.id}
            getLabel={(s) => s.name}
            onSelect={(v) => setForm((f) => ({ ...f, destinationTenantId: v, destinationWarehouseId: '' }))}
            renderTag={(s) => s.isParentTenant && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-500 font-medium">CD</span>
            )}
            emptyHint="No hay otras sedes disponibles"
          />
        )}

        <PickerField
          label="Almacén destino"
          value={form.destinationWarehouseId}
          options={destWarehouses}
          getId={(w) => w._id || w.id}
          getLabel={(w) => w.name}
          getSub={(w) => w.code}
          onSelect={(v) => setForm((f) => ({ ...f, destinationWarehouseId: v }))}
          disabled={
            (transferMode === 'locations' && !form.destinationLocationId) ||
            (transferMode === 'sedes' && !isSingleTenant && !form.destinationTenantId)
          }
          disabledHint={transferMode === 'sedes' ? 'Selecciona una sede primero' : 'Selecciona una ubicación primero'}
          emptyHint="No hay almacenes en el destino"
        />
      </section>
    </div>
  );
}

// ─── Step 2: Products ─────────────────────────────────────────────────────────
function ProductsStep({ sourceWarehouseId, items, onUpdate }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  // Load inventory for the source warehouse once
  useEffect(() => {
    if (!sourceWarehouseId) { setInventory([]); return; }
    let active = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetchApi(`/inventory?warehouseId=${sourceWarehouseId}&minAvailable=1&limit=5000`);
        const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (active) setInventory(list);
      } catch {
        if (active) setInventory([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [sourceWarehouseId]);

  const results = useMemo(() => {
    if (!query.trim()) return inventory.slice(0, 20);
    const q = query.toLowerCase();
    return inventory
      .filter((inv) => {
        const pop = inv.productId && typeof inv.productId === 'object' ? inv.productId : null;
        return (
          inv.productName?.toLowerCase().includes(q) ||
          inv.productSku?.toLowerCase().includes(q) ||
          pop?.brand?.toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [query, inventory]);

  const addItem = (inv) => {
    const pop = inv.productId && typeof inv.productId === 'object' ? inv.productId : null;
    const productId = pop ? (pop._id || pop.id || String(inv.productId)) : inv.productId;
    if (items.some((i) => i.productId === productId)) {
      toast.info('Producto ya agregado');
      return;
    }

    const hasMultiUnit = pop?.hasMultipleSellingUnits && pop?.sellingUnits?.length > 0;
    const activeUnits = hasMultiUnit ? pop.sellingUnits.filter((u) => u.isActive !== false) : [];
    const baseUnit = pop?.unitOfMeasure || 'unidad';
    const unitOptions = [
      { name: baseUnit, abbreviation: baseUnit, conversionFactor: 1, isBase: true },
      ...activeUnits.map((u) => ({ name: u.name, abbreviation: u.abbreviation, conversionFactor: u.conversionFactor, isBase: false })),
    ];

    haptics.select();
    onUpdate([...items, {
      productId,
      productName: inv.productName,
      productSku: inv.productSku,
      brand: pop?.brand || '',
      availableQuantity: inv.availableQuantity,
      quantity: 1,
      unitOptions,
      hasMultiUnit: unitOptions.length > 1,
      selectedUnit: unitOptions[0].abbreviation,
      conversionFactor: 1,
      unitOfMeasure: baseUnit,
    }]);
    setQuery('');
  };

  const maxInUnit = (item) => item.conversionFactor !== 1
    ? item.availableQuantity / item.conversionFactor
    : item.availableQuantity;

  const updateQty = (productId, delta) => {
    haptics.tap();
    onUpdate(items.map((i) => {
      if (i.productId !== productId) return i;
      const step = i.conversionFactor !== 1 ? 0.25 : 1;
      const next = Math.max(step, Math.min((i.quantity || 0) + delta * step, maxInUnit(i)));
      return { ...i, quantity: Number(next.toFixed(2)) };
    }));
  };

  const setQty = (productId, raw) => {
    onUpdate(items.map((i) => {
      if (i.productId !== productId) return i;
      if (raw === '') return { ...i, quantity: '' };
      const val = parseFloat(raw);
      if (isNaN(val)) return { ...i, quantity: '' };
      return { ...i, quantity: Math.max(0, Math.min(val, maxInUnit(i))) };
    }));
  };

  const changeUnit = (productId, abbr) => {
    haptics.tap();
    onUpdate(items.map((i) => {
      if (i.productId !== productId) return i;
      const unit = i.unitOptions.find((u) => u.abbreviation === abbr);
      if (!unit) return i;
      return { ...i, selectedUnit: unit.abbreviation, conversionFactor: unit.conversionFactor, unitOfMeasure: unit.isBase ? unit.name : i.unitOfMeasure, quantity: 1 };
    }));
  };

  const removeItem = (productId) => {
    haptics.tap();
    onUpdate(items.filter((i) => i.productId !== productId));
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="flex items-center gap-2 rounded-[var(--mobile-radius-lg)] bg-muted px-3 border border-border">
        <Search size={16} className="text-muted-foreground shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre o SKU..."
          className="flex-1 bg-transparent py-3 text-sm outline-none"
        />
        {loading && <Loader2 size={14} className="animate-spin text-muted-foreground shrink-0" />}
        {query && !loading && (
          <button type="button" onClick={() => setQuery('')} className="no-tap-highlight text-muted-foreground">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {!loading && inventory.length === 0 && (
        <p className="text-xs text-amber-500 py-2 flex items-center gap-1.5">
          <PackageOpen size={14} /> No hay productos con inventario en este almacén
        </p>
      )}
      {results.length > 0 && (
        <div className="space-y-1 max-h-40 overflow-y-auto mobile-scroll border border-border rounded-[var(--mobile-radius-md)]">
          {results.map((inv) => {
            const pop = inv.productId && typeof inv.productId === 'object' ? inv.productId : null;
            const pid = pop ? (pop._id || pop.id || String(inv.productId)) : inv.productId;
            const added = items.some((i) => i.productId === pid);
            return (
              <button
                key={inv._id || pid}
                type="button"
                disabled={added}
                onClick={() => addItem(inv)}
                className="w-full text-left px-3 py-2.5 no-tap-highlight active:bg-muted/30 transition-colors text-sm flex justify-between items-center gap-2 disabled:opacity-40"
              >
                <span className="truncate flex-1">
                  {inv.productName}
                  {inv.productSku && <span className="text-muted-foreground ml-1.5 text-xs">{inv.productSku}</span>}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted font-mono">{inv.availableQuantity} disp.</span>
                  {added ? <Check size={14} className="text-emerald-600" /> : <Plus size={14} className="text-primary" />}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected items */}
      {items.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Productos a trasladar ({items.length})</p>
          {items.map((item) => {
            const availInUnit = maxInUnit(item);
            const availDisplay = item.conversionFactor !== 1
              ? (availInUnit % 1 === 0 ? availInUnit.toString() : availInUnit.toFixed(2))
              : item.availableQuantity.toString();
            return (
              <div key={item.productId} className="bg-card border border-border rounded-[var(--mobile-radius-md)] p-3">
                <div className="flex items-start justify-between mb-2 gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.productName}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.productSku}{item.brand && ` · ${item.brand}`} · {availDisplay} disp.
                    </p>
                  </div>
                  <button type="button" onClick={() => removeItem(item.productId)} className="text-muted-foreground no-tap-highlight p-1 shrink-0">
                    <X size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  {/* Quantity stepper */}
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => updateQty(item.productId, -1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95">
                      <Minus size={12} />
                    </button>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.quantity}
                      onChange={(e) => setQty(item.productId, e.target.value)}
                      onBlur={(e) => { if (e.target.value === '' || parseFloat(e.target.value) < (item.conversionFactor !== 1 ? 0.01 : 1)) setQty(item.productId, item.conversionFactor !== 1 ? '0.25' : '1'); }}
                      className="w-14 h-8 text-center text-sm font-bold tabular-nums rounded-md border border-border bg-background no-spinners"
                    />
                    <button type="button" onClick={() => updateQty(item.productId, 1)} className="w-8 h-8 rounded-full border border-border flex items-center justify-center no-tap-highlight active:scale-95">
                      <Plus size={12} />
                    </button>
                  </div>
                  {/* Unit selector */}
                  {item.hasMultiUnit ? (
                    <select
                      value={item.selectedUnit}
                      onChange={(e) => changeUnit(item.productId, e.target.value)}
                      className="flex-1 h-8 text-xs rounded-md border border-border bg-background px-2"
                    >
                      {item.unitOptions.map((u) => (
                        <option key={u.abbreviation} value={u.abbreviation}>{u.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="flex-1 text-xs text-muted-foreground">{item.unitOfMeasure}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        !query && inventory.length > 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Busca y agrega productos al traslado</p>
        )
      )}
    </div>
  );
}

// ─── Step 3: Review ───────────────────────────────────────────────────────────
function ReviewStep({ ctx, form, items }) {
  const { transferMode, isSingleTenant, tenant, subsidiaries, locations, sourceWarehouses, destWarehouses } = ctx;

  const nameById = (list, id) => list.find((x) => (x._id || x.id) === id)?.name || '—';
  const sourceLabel = transferMode === 'locations'
    ? nameById(locations, form.sourceLocationId)
    : `${tenant?.name || ''}${isSingleTenant ? '' : ' (actual)'}`;
  const destLabel = transferMode === 'locations'
    ? nameById(locations, form.destinationLocationId)
    : isSingleTenant ? tenant?.name : nameById(subsidiaries, form.destinationTenantId);

  return (
    <div className="space-y-4">
      {/* Route */}
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wide">Origen</p>
            <p className="text-sm font-semibold truncate">{sourceLabel}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate"><Warehouse size={11} />{nameById(sourceWarehouses, form.sourceWarehouseId)}</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0 text-right">
            <p className="text-[10px] text-blue-500 font-medium uppercase tracking-wide">Destino</p>
            <p className="text-sm font-semibold truncate">{destLabel}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end truncate"><Warehouse size={11} />{nameById(destWarehouses, form.destinationWarehouseId)}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-card border border-border rounded-[var(--mobile-radius-lg)] p-4 space-y-2">
        <p className="text-xs text-muted-foreground mb-1">Productos ({items.length})</p>
        {items.map((item) => (
          <div key={item.productId} className="flex justify-between text-sm gap-2">
            <span className="truncate flex-1">{item.productName}</span>
            <span className="font-medium tabular-nums ml-2 shrink-0">{item.quantity} {item.hasMultiUnit ? item.selectedUnit : item.unitOfMeasure}</span>
          </div>
        ))}
      </div>

      {/* Notes */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Notas (opcional)</p>
        <textarea
          value={form.notes}
          onChange={(e) => form.setNotes(e.target.value)}
          placeholder="Observaciones del traslado..."
          rows={2}
          className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2.5 text-sm resize-none"
        />
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1.5">
        <Zap size={13} className="text-orange-400" />
        Al enviar, el inventario sale del origen y queda en tránsito hacia el destino.
      </p>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────
export default function MobileCreateTransfer({ open, onClose }) {
  const { tenant } = useAuth();

  const [loading, setLoading] = useState(true);
  const [transferMode, setTransferMode] = useState(null);
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState([]);

  const [step, setStep] = useState(0);
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    destinationTenantId: '',
    sourceLocationId: '',
    destinationLocationId: '',
  });

  // ── Load modes + warehouses on open ──
  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const whs = await fetchApi('/warehouses');
        const whsList = Array.isArray(whs) ? whs : whs?.data || [];
        if (!active) return;
        setWarehouses(whsList);

        let mode = null;
        try {
          const subsResponse = await getSubsidiaries();
          const sedes = subsResponse?.data || [];
          const parentTenant = subsResponse?.parentTenant;
          const isSubsidiary = subsResponse?.isSubsidiary;
          const destinations = isSubsidiary && parentTenant
            ? [{ ...parentTenant, isParentTenant: true }, ...sedes]
            : sedes;
          if (destinations.length > 0 || subsResponse?.isParent || isSubsidiary) {
            if (active) setSubsidiaries(destinations);
            mode = 'sedes';
          }
        } catch { /* no subsidiaries */ }

        if (!mode) {
          try {
            const locs = await getBusinessLocations({ isActive: true });
            const locationsList = Array.isArray(locs) ? locs : locs?.data || [];
            if (locationsList.length > 0) {
              if (active) setLocations(locationsList);
              mode = 'locations';
            }
          } catch { /* no locations */ }
        }

        if (!active) return;
        setTransferMode(mode || 'sedes');

        // Smart defaults
        const defaults = loadDefaults();
        const initial = { sourceWarehouseId: '', destinationWarehouseId: '', destinationTenantId: '', sourceLocationId: '', destinationLocationId: '' };
        if (whsList.length === 1) {
          initial.sourceWarehouseId = whsList[0]._id || whsList[0].id;
        } else if (defaults.sourceWarehouseId && whsList.some((w) => (w._id || w.id) === defaults.sourceWarehouseId)) {
          initial.sourceWarehouseId = defaults.sourceWarehouseId;
        }
        if (mode === 'sedes' && defaults.destinationTenantId) initial.destinationTenantId = defaults.destinationTenantId;
        if (mode === 'locations') {
          if (defaults.sourceLocationId) initial.sourceLocationId = defaults.sourceLocationId;
          if (defaults.destinationLocationId) initial.destinationLocationId = defaults.destinationLocationId;
        }
        setForm(initial);
      } catch {
        if (active) toast.error('Error cargando datos del traslado');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open]);

  const isSingleTenant = transferMode === 'sedes' && subsidiaries.length === 0;

  // ── Fetch destination warehouses for a chosen sede ──
  useEffect(() => {
    if (transferMode !== 'sedes' || !form.destinationTenantId) {
      setDestinationWarehouses([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        const res = await fetchApi(`/warehouses?tenantId=${form.destinationTenantId}`);
        const list = Array.isArray(res) ? res : res?.data || [];
        if (!active) return;
        setDestinationWarehouses(list);
        if (list.length === 1) setForm((f) => ({ ...f, destinationWarehouseId: list[0]._id || list[0].id }));
      } catch {
        if (active) setDestinationWarehouses([]);
      }
    })();
    return () => { active = false; };
  }, [transferMode, form.destinationTenantId]);

  // ── Reset products when source warehouse changes ──
  useEffect(() => { setItems([]); }, [form.sourceWarehouseId]);

  const getWarehousesForLocation = useCallback((locationId) => {
    const location = locations.find((l) => (l._id || l.id) === locationId);
    if (!location) return [];
    const ids = (location.warehouseIds || []).map((w) => (typeof w === 'string' ? w : w._id || w.id || w));
    return warehouses.filter((w) => ids.includes(w._id || w.id));
  }, [locations, warehouses]);

  const sourceWarehouses = transferMode === 'locations' ? getWarehousesForLocation(form.sourceLocationId) : warehouses;
  const destWarehouses = transferMode === 'locations'
    ? getWarehousesForLocation(form.destinationLocationId)
    : isSingleTenant
      ? warehouses.filter((w) => (w._id || w.id) !== form.sourceWarehouseId)
      : destinationWarehouses;

  const ctx = { transferMode, isSingleTenant, tenant, subsidiaries, locations, sourceWarehouses, destWarehouses };

  // ── Step gating ──
  const routeReady = (() => {
    if (!form.sourceWarehouseId || !form.destinationWarehouseId) return false;
    if (transferMode === 'locations') return form.sourceLocationId && form.destinationLocationId && form.sourceLocationId !== form.destinationLocationId;
    if (transferMode === 'sedes' && !isSingleTenant) return !!form.destinationTenantId;
    return form.sourceWarehouseId !== form.destinationWarehouseId; // single tenant
  })();
  const itemsReady = items.length > 0 && items.every((i) => Number(i.quantity) > 0);

  const canNext = () => (step === 0 ? routeReady : step === 1 ? itemsReady : true);

  const handleNext = () => { if (step < 2 && canNext()) { haptics.tap(); setStep(step + 1); } };
  const handleBack = () => { if (step > 0) { haptics.tap(); setStep(step - 1); } };

  const submit = async () => {
    try {
      setSubmitting(true);
      const payload = {
        sourceWarehouseId: form.sourceWarehouseId,
        destinationWarehouseId: form.destinationWarehouseId,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          requestedQuantity: Number(i.quantity),
          selectedUnit: i.selectedUnit,
          unitOfMeasure: i.unitOfMeasure,
          ...(i.conversionFactor !== 1 && { conversionFactor: i.conversionFactor }),
        })),
      };
      if (transferMode === 'sedes' && !isSingleTenant) payload.destinationTenantId = form.destinationTenantId;
      else if (transferMode === 'locations') {
        payload.sourceLocationId = form.sourceLocationId;
        payload.destinationLocationId = form.destinationLocationId;
      }

      saveDefaults({
        sourceWarehouseId: form.sourceWarehouseId,
        destinationTenantId: form.destinationTenantId,
        sourceLocationId: form.sourceLocationId,
        destinationLocationId: form.destinationLocationId,
      });

      const created = await createTransferOrder(payload);
      const orderId = created?._id || created?.id;

      // Express dispatch: request → approve → prepare → ship
      if (orderId) {
        try {
          await requestTransferOrder(orderId);
          await approveTransferOrder(orderId);
          await prepareTransferOrder(orderId);
          await shipTransferOrder(orderId);
          haptics.success();
          toast.success('Traslado enviado — esperando recepción en destino');
        } catch {
          haptics.warning();
          toast.warning('Traslado creado, pero el envío no se completó. Revísalo en la lista.');
        }
      } else {
        haptics.success();
        toast.success('Traslado creado');
      }

      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err?.message || 'Error creando el traslado');
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['Origen y destino', 'Agregar productos', 'Revisar y enviar'];

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border flex gap-3" style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}>
      {step > 0 && (
        <button type="button" onClick={handleBack} className="px-4 py-3 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight flex items-center gap-1">
          <ChevronLeft size={14} /> Atrás
        </button>
      )}
      {step < 2 ? (
        <button type="button" disabled={!canNext()} onClick={handleNext} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40">
          Siguiente
        </button>
      ) : (
        <button type="button" disabled={submitting} onClick={submit} className="flex-1 py-3 rounded-[var(--mobile-radius-md)] bg-[#FB923C] active:bg-[#F97316] text-white text-sm font-semibold no-tap-highlight disabled:opacity-40 flex items-center justify-center gap-2">
          {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Zap size={16} /> Enviar ahora</>}
        </button>
      )}
    </div>
  );

  return (
    <MobileActionSheet open={open} onClose={() => onClose?.(false)} title={stepTitles[step]} footer={loading ? null : footer}>
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Preparando traslado...</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1">
              {transferMode === 'sedes' ? <><Building2 size={10} /> Entre sedes</> : <><MapPin size={10} /> Entre ubicaciones</>}
            </span>
          </div>
          <StepIndicator current={step} total={3} />
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: DUR.fast, ease: EASE.out }}
            >
              {step === 0 && <RouteStep ctx={ctx} form={form} setForm={setForm} />}
              {step === 1 && <ProductsStep sourceWarehouseId={form.sourceWarehouseId} items={items} onUpdate={setItems} />}
              {step === 2 && <ReviewStep ctx={ctx} form={{ ...form, notes, setNotes }} items={items} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </MobileActionSheet>
  );
}
