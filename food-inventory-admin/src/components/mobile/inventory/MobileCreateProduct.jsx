import { useState, useRef, useCallback } from 'react';
import { Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

const CATEGORIES = ['Producto', 'Insumo', 'Herramienta'];
const UNITS = ['unidad', 'ml', 'gr', 'litro', 'kg', 'caja'];

function generateSku(name) {
  if (!name || name.length < 2) return '';
  const prefix = name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${prefix}-${suffix}`;
}

function resizeImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        if (img.width <= maxWidth) { resolve(e.target.result); return; }
        const canvas = document.createElement('canvas');
        const scale = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function MobileCreateProduct({ open, onClose }) {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [skuEdited, setSkuEdited] = useState(false);
  const [category, setCategory] = useState('Producto');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [unit, setUnit] = useState('unidad');
  const [minStock, setMinStock] = useState('5');
  const [initialStock, setInitialStock] = useState('0');
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef(null);

  const handleNameBlur = useCallback(() => {
    if (!skuEdited && name.length >= 2) {
      setSku(generateSku(name));
    }
  }, [name, skuEdited]);

  const handleSkuChange = (v) => {
    setSku(v);
    setSkuEdited(true);
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImage(file);
    setPhoto(base64);
    haptics.tap();
  };

  const removePhoto = () => {
    setPhoto(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    const finalSku = sku || generateSku(name);
    const costNum = Number(cost) || 0;
    const priceNum = Number(price) || 0;
    const minStockNum = Number(minStock) || 5;
    const initStockNum = Number(initialStock) || 0;

    try {
      setSubmitting(true);

      // Step 1: Create product
      const productRes = await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          productType: 'simple',
          name: name.trim(),
          sku: finalSku,
          category: [category],
          subcategory: [],
          brand: 'Sin marca',
          unitOfMeasure: unit,
          isPerishable: false,
          taxCategory: 'general',
          pricingRules: {
            cashDiscount: 0,
            cardSurcharge: 0,
            minimumMargin: 0,
            maximumDiscount: 0,
            bulkDiscountEnabled: false,
            bulkDiscountRules: [],
          },
          inventoryConfig: {
            minimumStock: minStockNum,
            maximumStock: 0,
            reorderPoint: minStockNum,
            reorderQuantity: 0,
          },
          variants: [{
            sku: finalSku,
            name: 'Principal',
            unit: unit,
            unitSize: 1,
            costPrice: costNum,
            basePrice: priceNum,
            images: photo ? [photo] : [],
            isActive: true,
          }],
        }),
      });

      const productId = productRes?._id || productRes?.data?._id;

      // Step 2: Always create inventory record so product is visible in mobile Stock tab
      if (productId) {
        try {
          await fetchApi('/inventory', {
            method: 'POST',
            body: JSON.stringify({
              productId,
              productName: name.trim(),
              productSku: finalSku,
              totalQuantity: initStockNum,
              averageCostPrice: costNum,
              minimumStock: minStockNum,
              reference: `INIT-${Date.now()}`,
            }),
          });
        } catch (invErr) {
          toast.warning('Producto creado, pero no se pudo registrar en inventario');
        }
      }

      haptics.success();
      toast.success(`"${name.trim()}" creado correctamente`);
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al crear producto');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border">
      <button
        type="button"
        disabled={submitting || !name.trim()}
        onClick={submit}
        className="w-full py-3.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-base font-semibold no-tap-highlight disabled:opacity-40"
      >
        {submitting ? 'Creando...' : 'Crear producto'}
      </button>
    </div>
  );

  return (
    <MobileActionSheet
      open={open}
      onClose={() => onClose?.(false)}
      title="Nuevo producto"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Name */}
        <Field label="Nombre *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleNameBlur}
            placeholder="Ej: Cera para cabello"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
          />
        </Field>

        {/* SKU */}
        <Field label="SKU">
          <input
            type="text"
            value={sku}
            onChange={(e) => handleSkuChange(e.target.value)}
            placeholder="Auto-generado"
            className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
          />
        </Field>

        {/* Category chips */}
        <Field label="Categoría">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { haptics.select(); setCategory(c); }}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>

        {/* Price + Cost row */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Precio ($)">
            <input
              type="number"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
          <Field label="Costo ($)">
            <input
              type="number"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
        </div>

        {/* Unit of measure chips */}
        <Field label="Unidad de medida">
          <div className="flex flex-wrap gap-2">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => { haptics.select(); setUnit(u); }}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                  unit === u ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                {u}
              </button>
            ))}
          </div>
        </Field>

        {/* Min stock + Initial stock row */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Stock mínimo">
            <input
              type="number"
              inputMode="numeric"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="5"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
          <Field label="Stock inicial">
            <input
              type="number"
              inputMode="numeric"
              value={initialStock}
              onChange={(e) => setInitialStock(e.target.value)}
              placeholder="0"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
        </div>

        {/* Photo */}
        <Field label="Foto">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          {photo ? (
            <div className="relative w-20 h-20">
              <motion.img
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: DUR.base, ease: EASE.out }}
                src={photo}
                alt="Producto"
                className="w-20 h-20 rounded-[var(--mobile-radius-md)] object-cover border border-border"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-20 h-20 rounded-[var(--mobile-radius-md)] border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground no-tap-highlight active:bg-muted/30"
            >
              <Camera size={20} />
              <span className="text-[10px]">Foto</span>
            </button>
          )}
        </Field>
      </div>
    </MobileActionSheet>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      {children}
    </div>
  );
}
