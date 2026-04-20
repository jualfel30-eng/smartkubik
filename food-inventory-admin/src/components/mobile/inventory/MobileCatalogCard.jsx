import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Edit3, Plus, Package, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';
import { DUR, EASE, listItem } from '@/lib/motion';

const TYPE_LABELS = {
  simple: 'Mercancia',
  raw_material: 'Materia Prima',
  consumable: 'Consumible',
  supply: 'Suministro',
};

const TYPE_COLORS = {
  simple: 'bg-blue-500/10 text-blue-500',
  raw_material: 'bg-purple-500/10 text-purple-500',
  consumable: 'bg-amber-500/10 text-amber-500',
  supply: 'bg-teal-500/10 text-teal-500',
};

export default function MobileCatalogCard({ product, expanded, onToggle, onEdit, onAdjustStock }) {
  const mainVariant = product.variants?.[0] || {};
  const name = product.name || 'Sin nombre';
  const sku = mainVariant.sku || product.sku || '—';
  const costPrice = Number(mainVariant.costPrice || 0);
  const basePrice = Number(mainVariant.basePrice || 0);
  const productType = product.productType || 'simple';
  const isActive = product.isActive !== false;
  const categories = Array.isArray(product.category) ? product.category : [];
  const image = mainVariant.images?.[0] || product.images?.[0];

  // Stock info (if inventory data is populated)
  const stock = product._inventoryStock;
  const hasStock = stock !== undefined && stock !== null;

  // Margin calculation
  const margin = costPrice > 0 && basePrice > 0
    ? ((basePrice - costPrice) / basePrice * 100).toFixed(1)
    : null;

  // Promotion
  const hasPromo = product.hasActivePromotion && product.promotion?.discountPercentage > 0;
  const promoDiscount = product.promotion?.discountPercentage || 0;
  const promoPrice = hasPromo ? basePrice * (1 - promoDiscount / 100) : null;

  return (
    <motion.div
      layout
      variants={listItem}
      className={cn(
        'bg-card border border-border rounded-[var(--mobile-radius-lg)] overflow-hidden',
        !isActive && 'opacity-60',
      )}
    >
      {/* Compact row */}
      <button
        type="button"
        onClick={() => { haptics.tap(); onToggle?.(product._id); }}
        className="w-full text-left p-4 no-tap-highlight active:bg-muted/30 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* Thumbnail */}
          {image ? (
            <img
              src={image}
              alt={name}
              className="w-12 h-12 rounded-[var(--mobile-radius-md)] object-cover border border-border shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-[var(--mobile-radius-md)] border border-border bg-muted flex items-center justify-center shrink-0">
              <Package size={18} className="text-muted-foreground/40" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{sku}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {hasPromo ? (
                  <div className="text-right">
                    <span className="text-xs line-through text-muted-foreground">${basePrice.toFixed(2)}</span>
                    <span className="block text-sm font-bold text-orange-500">${promoPrice.toFixed(2)}</span>
                  </div>
                ) : basePrice > 0 ? (
                  <span className="text-sm font-bold tabular-nums">${basePrice.toFixed(2)}</span>
                ) : null}
                <ChevronDown
                  size={14}
                  className={cn('text-muted-foreground transition-transform duration-200', expanded && 'rotate-180')}
                />
              </div>
            </div>

            {/* Tags row */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[productType] || TYPE_COLORS.simple)}>
                {TYPE_LABELS[productType] || productType}
              </span>
              {!isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive">
                  Inactivo
                </span>
              )}
              {hasPromo && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-orange-500/10 text-orange-500">
                  -{promoDiscount}%
                </span>
              )}
              {hasStock && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  stock <= 0 ? 'bg-destructive/10 text-destructive' :
                  stock <= (product.inventoryConfig?.minimumStock || 5) ? 'bg-amber-500/10 text-amber-500' :
                  'bg-emerald-500/10 text-emerald-500',
                )}>
                  Stock: {stock}
                </span>
              )}
            </div>
          </div>
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
            <div className="px-4 pb-4 pt-1 border-t border-border space-y-2">
              {categories.length > 0 && (
                <Row label="Categoria" value={categories.join(', ')} />
              )}
              {product.brand && product.brand !== 'Sin marca' && (
                <Row label="Marca" value={product.brand} />
              )}
              {costPrice > 0 && <Row label="Costo" value={`$${costPrice.toFixed(2)}`} />}
              {basePrice > 0 && <Row label="Precio venta" value={`$${basePrice.toFixed(2)}`} />}
              {margin && <Row label="Margen" value={`${margin}%`} />}
              {product.unitOfMeasure && <Row label="Unidad" value={product.unitOfMeasure} />}

              {/* Variants summary */}
              {product.variants?.length > 1 && (
                <div className="pt-1">
                  <p className="text-xs text-muted-foreground font-medium mb-1">{product.variants.length} variantes</p>
                  {product.variants.slice(1).map((v, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5">
                      <span className="text-muted-foreground">{v.name || v.sku}</span>
                      <span>${Number(v.basePrice || 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <ActionBtn
                  icon={Edit3}
                  label="Editar"
                  onClick={() => onEdit?.(product)}
                  className="bg-blue-500/10 text-blue-500 border-blue-500/20"
                />
                {hasStock !== undefined && (
                  <ActionBtn
                    icon={Plus}
                    label="Ajustar Stock"
                    onClick={() => onAdjustStock?.(product)}
                    className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                  />
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, onClick, className }) {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); haptics.tap(); onClick?.(); }}
      className={cn(
        'flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium',
        'rounded-[var(--mobile-radius-md)] border no-tap-highlight active:scale-[0.97] transition-transform',
        className,
      )}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}
