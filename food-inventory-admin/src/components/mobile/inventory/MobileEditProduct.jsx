import { useState, useRef, useCallback } from 'react';
import { Camera, X, Monitor } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';

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

export default function MobileEditProduct({ open, onClose, product }) {
  const mainVariant = product?.variants?.[0] || {};

  const [name, setName] = useState(product?.name || '');
  const [sku, setSku] = useState(mainVariant.sku || product?.sku || '');
  const [brand, setBrand] = useState(product?.brand || '');
  const [costPrice, setCostPrice] = useState(String(mainVariant.costPrice || ''));
  const [basePrice, setBasePrice] = useState(String(mainVariant.basePrice || ''));
  const [wholesalePrice, setWholesalePrice] = useState(String(mainVariant.wholesalePrice || ''));
  const [isActive, setIsActive] = useState(product?.isActive !== false);
  const [photo, setPhoto] = useState(mainVariant.images?.[0] || product?.images?.[0] || null);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileRef = useRef(null);

  const hasWholesale = product?.pricingRules?.wholesaleEnabled;
  const hasPromo = product?.hasActivePromotion;
  const hasVolume = product?.pricingRules?.bulkDiscountEnabled;
  const strategyMode = mainVariant.pricingStrategy?.mode || 'manual';
  const hasAdvancedPricing = strategyMode !== 'manual' || hasPromo || hasVolume;

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await resizeImage(file);
    setPhoto(base64);
    setPhotoChanged(true);
    haptics.tap();
  };

  const removePhoto = () => {
    setPhoto(null);
    setPhotoChanged(true);
    if (fileRef.current) fileRef.current.value = '';
  };

  const submit = async () => {
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    try {
      setSubmitting(true);

      // Build update payload with only changed fields
      const updates = {};

      if (name.trim() !== product.name) updates.name = name.trim();
      if (brand !== (product.brand || '')) updates.brand = brand;
      if (isActive !== (product.isActive !== false)) updates.isActive = isActive;

      // Build variant update
      const variantUpdates = {};
      const costNum = Number(costPrice) || 0;
      const priceNum = Number(basePrice) || 0;
      const wholesaleNum = Number(wholesalePrice) || 0;

      if (sku !== (mainVariant.sku || '')) variantUpdates.sku = sku;
      if (costNum !== Number(mainVariant.costPrice || 0)) variantUpdates.costPrice = costNum;
      if (priceNum !== Number(mainVariant.basePrice || 0)) variantUpdates.basePrice = priceNum;
      if (hasWholesale && wholesaleNum !== Number(mainVariant.wholesalePrice || 0)) {
        variantUpdates.wholesalePrice = wholesaleNum;
      }
      if (photoChanged) {
        variantUpdates.images = photo ? [photo] : [];
      }

      // Merge variant updates into existing variants array
      if (Object.keys(variantUpdates).length > 0) {
        const updatedVariants = (product.variants || []).map((v, i) => {
          if (i === 0) return { ...v, ...variantUpdates };
          return v;
        });
        updates.variants = updatedVariants;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No hay cambios que guardar');
        onClose?.(false);
        return;
      }

      await fetchApi(`/products/${product._id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      haptics.success();
      toast.success(`"${name.trim()}" actualizado`);
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al actualizar producto');
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
        {submitting ? 'Guardando...' : 'Guardar cambios'}
      </button>
    </div>
  );

  return (
    <MobileActionSheet
      open={open}
      onClose={() => onClose?.(false)}
      title="Editar producto"
      footer={footer}
    >
      <div className="space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhoto}
            className="hidden"
          />
          {photo ? (
            <div className="relative">
              <img
                src={photo}
                alt={name}
                className="w-16 h-16 rounded-[var(--mobile-radius-md)] object-cover border border-border"
              />
              <button
                type="button"
                onClick={removePhoto}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <X size={10} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-16 h-16 rounded-[var(--mobile-radius-md)] border-2 border-dashed border-border flex flex-col items-center justify-center gap-0.5 text-muted-foreground no-tap-highlight active:bg-muted/30"
            >
              <Camera size={18} />
              <span className="text-[9px]">Foto</span>
            </button>
          )}
          <div className="flex-1">
            <Field label="Nombre *">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
              />
            </Field>
          </div>
        </div>

        {/* SKU + Brand */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU">
            <input
              type="text"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
          <Field label="Marca">
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Sin marca"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
        </div>

        {/* Prices */}
        <div className={cn('grid gap-3', hasWholesale ? 'grid-cols-3' : 'grid-cols-2')}>
          <Field label="Costo ($)">
            <input
              type="number"
              inputMode="decimal"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
          <Field label="Precio ($)">
            <input
              type="number"
              inputMode="decimal"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="0.00"
              className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
            />
          </Field>
          {hasWholesale && (
            <Field label="Mayor ($)">
              <input
                type="number"
                inputMode="decimal"
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-sm"
              />
            </Field>
          )}
        </div>

        {/* Active toggle */}
        <div className="flex items-center justify-between py-2">
          <span className="text-sm font-medium">Producto activo</span>
          <button
            type="button"
            onClick={() => { haptics.select(); setIsActive(!isActive); }}
            className={cn(
              'relative w-11 h-6 rounded-full transition-colors',
              isActive ? 'bg-primary' : 'bg-muted-foreground/30',
            )}
          >
            <motion.div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow"
              animate={{ left: isActive ? 22 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
            />
          </button>
        </div>

        {/* Advanced pricing notice */}
        {hasAdvancedPricing && (
          <div className="flex items-start gap-2.5 p-3 rounded-[var(--mobile-radius-md)] bg-muted/50 border border-border">
            <Monitor size={16} className="text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">Configuracion avanzada</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {strategyMode !== 'manual' && `Estrategia: ${strategyMode === 'markup' ? 'Markup' : 'Margen'}. `}
                {hasVolume && 'Descuentos por volumen activos. '}
                {hasPromo && `Promo ${product.promotion?.discountPercentage}% activa. `}
                Para editar estos ajustes, usa la version de escritorio.
              </p>
            </div>
          </div>
        )}
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
