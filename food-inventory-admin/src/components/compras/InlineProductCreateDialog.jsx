/**
 * @file InlineProductCreateDialog.jsx
 * Compact popup for creating a product on the fly inside CompraCreateDialog.
 *
 * Triggered by the "+ Crear producto nuevo" row of the product SearchableSelect.
 * On submit, calls `createInlineProduct(draft)` from useComprasData which POSTs
 * to /products (catalog entry only — no inventory, no supplier link) and inserts
 * the new product into po.items as a regular line item. The PO header continues
 * to own the supplier and payment terms.
 *
 * Eight fields per the master spec at
 * food-inventory-admin/docs/PROMPT-UNIFIED-PURCHASE-PRODUCT-CREATION.md.
 */
import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { SPRING, EASE } from '@/lib/motion.js';
import { cn } from '@/lib/utils';

const FIELD_KEYS = ['name', 'brand', 'sellingPrice', 'baseUnit', 'sku', 'barcode', 'category', 'subcategory'];

function emptyDraft(unit) {
  return {
    name: '',
    brand: '',
    sellingPrice: '',
    baseUnit: unit || 'unidad',
    sku: '',
    barcode: '',
    category: '',
    subcategory: '',
  };
}

export default function InlineProductCreateDialog({
  isOpen,
  onOpenChange,
  initialQuery,
  unitOptions = ['unidad'],
  pendingDraft,
  persistDraft,
  isLoading,
  onSubmit,
}) {
  const defaultUnit = unitOptions[0] || 'unidad';
  const [draft, setDraft] = useState(() => emptyDraft(defaultUnit));
  const [touched, setTouched] = useState({});

  // On open: prefer persisted draft (recovery), fall back to a fresh draft
  // pre-filled with the query that triggered the popup.
  useEffect(() => {
    if (!isOpen) return;
    if (pendingDraft) {
      setDraft({ ...emptyDraft(defaultUnit), ...pendingDraft });
    } else {
      setDraft({ ...emptyDraft(defaultUnit), name: (initialQuery || '').trim() });
    }
    setTouched({});
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist while typing so accidental close + reopen restores the in-flight
  // entry. Cleared by useComprasData on successful create.
  useEffect(() => {
    if (!isOpen) return;
    const hasAnyValue = FIELD_KEYS.some((k) => (draft[k] || '').toString().trim());
    if (hasAnyValue) {
      persistDraft?.(draft);
    }
  }, [draft, isOpen, persistDraft]);

  const update = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
  const markTouched = (field) => setTouched((prev) => ({ ...prev, [field]: true }));

  const errors = useMemo(() => {
    const out = {};
    if (!draft.name?.trim()) out.name = 'Requerido';
    if (!draft.brand?.trim()) out.brand = 'Requerido';
    const price = Number(draft.sellingPrice);
    if (!Number.isFinite(price) || price <= 0) out.sellingPrice = 'Debe ser mayor a 0';
    if (!draft.baseUnit?.trim()) out.baseUnit = 'Requerido';
    return out;
  }, [draft]);

  const isValid = Object.keys(errors).length === 0;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    setTouched({ name: true, brand: true, sellingPrice: true, baseUnit: true });
    if (!isValid || isLoading) return;
    await onSubmit?.(draft);
  };

  const fieldError = (key) => (touched[key] && errors[key]) ? errors[key] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[520px] p-0 overflow-hidden"
        onInteractOutside={(e) => {
          // Prevent accidental loss when clicking the parent Sheet's backdrop.
          // The user can still close via [X], Cancel, or Escape.
          e.preventDefault();
        }}
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={SPRING.soft}
              className="px-6 pt-6 pb-4"
            >
              <DialogHeader className="space-y-1">
                <DialogTitle className="text-lg font-semibold">Nuevo producto</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Solo lo esencial. El resto lo configuras luego desde Productos.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                {/* Row 1: Nombre (full width) */}
                <FieldShell label="Nombre" required error={fieldError('name')}>
                  <Input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => update('name', e.target.value)}
                    onBlur={() => markTouched('name')}
                    placeholder="Ej: Aceite Oliva 2L"
                    className={cn(fieldError('name') && 'border-destructive')}
                  />
                </FieldShell>

                {/* Row 2: Marca | Precio de venta */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FieldShell label="Marca" required error={fieldError('brand')}>
                    <Input
                      value={draft.brand}
                      onChange={(e) => update('brand', e.target.value)}
                      onBlur={() => markTouched('brand')}
                      placeholder="Ej: Diana"
                      className={cn(fieldError('brand') && 'border-destructive')}
                    />
                  </FieldShell>
                  <FieldShell label="Precio de venta" required error={fieldError('sellingPrice')}>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={draft.sellingPrice}
                      onChange={(e) => update('sellingPrice', e.target.value)}
                      onBlur={() => markTouched('sellingPrice')}
                      placeholder="0.00"
                      className={cn('no-spinners', fieldError('sellingPrice') && 'border-destructive')}
                    />
                  </FieldShell>
                </div>

                {/* Row 3: Unidad base | SKU */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FieldShell label="Unidad base" required error={fieldError('baseUnit')}>
                    <Select
                      value={draft.baseUnit}
                      onValueChange={(v) => { update('baseUnit', v); markTouched('baseUnit'); }}
                    >
                      <SelectTrigger className={cn(fieldError('baseUnit') && 'border-destructive')}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {unitOptions.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldShell>
                  <FieldShell label="SKU" optional>
                    <Input
                      value={draft.sku}
                      onChange={(e) => update('sku', e.target.value)}
                      placeholder="Auto-generado si lo dejas vacío"
                    />
                  </FieldShell>
                </div>

                {/* Row 4: Código de barras | Categoría */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FieldShell label="Código de barras" optional>
                    <Input
                      value={draft.barcode}
                      onChange={(e) => update('barcode', e.target.value)}
                      placeholder="Opcional"
                    />
                  </FieldShell>
                  <FieldShell label="Categoría" optional>
                    <Input
                      value={draft.category}
                      onChange={(e) => update('category', e.target.value)}
                      placeholder="Sin clasificar"
                    />
                  </FieldShell>
                </div>

                {/* Row 5: Subcategoría (alone, full width on mobile, half on desktop) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FieldShell label="Subcategoría" optional>
                    <Input
                      value={draft.subcategory}
                      onChange={(e) => update('subcategory', e.target.value)}
                      placeholder="General"
                    />
                  </FieldShell>
                  <div className="hidden md:block" />
                </div>

                <DialogFooter className="mt-2 gap-2 sm:gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpenChange?.(false)}
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={!isValid || isLoading}
                    className="relative overflow-hidden"
                  >
                    {/* Anticipation progress bar (Stage 1 of the 3-stage reward) */}
                    {isLoading && (
                      <motion.div
                        className="absolute inset-0 bg-primary/30"
                        initial={{ x: '-100%' }}
                        animate={{ x: '100%' }}
                        transition={{ duration: 1.1, repeat: Infinity, ease: EASE.inOut }}
                      />
                    )}
                    <span className="relative z-10">
                      {isLoading ? 'Creando…' : 'Crear y agregar a la compra'}
                    </span>
                  </Button>
                </DialogFooter>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}

function FieldShell({ label, required, optional, error, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-muted-foreground/60 font-normal">(opcional)</span>}
      </Label>
      {children}
      {error && (
        <motion.div
          initial={{ x: 0 }}
          animate={{ x: [0, 4, -2, 0] }}
          transition={{ duration: 0.18 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
