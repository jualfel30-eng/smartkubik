import { useState, useCallback, useEffect } from 'react';
import { Package, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import haptics from '@/lib/haptics';
import { DUR, EASE } from '@/lib/motion';
import MobileActionSheet from '../MobileActionSheet.jsx';
import MobileAdjustStock from './MobileAdjustStock.jsx';

export default function MobileAddInventory({ open, onClose }) {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [productsRes, inventoryRes] = await Promise.all([
        fetchApi('/products?limit=200&sort=name'),
        fetchApi('/inventory?limit=500'),
      ]);
      const prodList = productsRes?.data || productsRes || [];
      const invList = inventoryRes?.data || inventoryRes || [];
      setProducts(Array.isArray(prodList) ? prodList : []);
      setInventory(Array.isArray(invList) ? invList : []);
    } catch {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) loadData();
  }, [open, loadData]);

  // Build inventory lookup
  const inventoryMap = {};
  inventory.forEach((inv) => {
    const pid = inv.productId && typeof inv.productId === 'object' ? inv.productId._id : inv.productId;
    if (pid) inventoryMap[pid] = inv;
  });

  // Filter products by search
  const filtered = search.trim()
    ? products.filter((p) => {
        const q = search.toLowerCase();
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || p.variants?.[0]?.sku || '').toLowerCase();
        return name.includes(q) || sku.includes(q);
      })
    : products;

  const handleSelect = (product) => {
    haptics.tap();
    const inv = inventoryMap[product._id];
    if (inv) {
      setSelectedItem(inv);
    } else {
      // Product has no inventory record — create one with initial stock
      setSelectedItem({
        _id: null,
        productId: product._id,
        productName: product.name,
        productSku: product.variants?.[0]?.sku || product.sku,
        availableQuantity: 0,
        totalQuantity: 0,
        _noInventory: true,
      });
    }
  };

  const handleAdjustClose = (saved) => {
    setSelectedItem(null);
    if (saved) {
      onClose?.(true);
    }
  };

  if (selectedItem) {
    if (selectedItem._noInventory) {
      return (
        <MobileNewInventoryRecord
          open
          product={selectedItem}
          onClose={handleAdjustClose}
        />
      );
    }
    return (
      <MobileAdjustStock
        product={selectedItem}
        mode="add"
        onClose={handleAdjustClose}
      />
    );
  }

  return (
    <MobileActionSheet
      open={open}
      onClose={() => onClose?.(false)}
      title="Agregar inventario"
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Selecciona un producto para agregar stock
        </p>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar producto..."
            autoFocus
            className="w-full pl-9 pr-3 py-3 rounded-[var(--mobile-radius-md)] border border-border bg-background text-sm"
          />
        </div>

        {/* Product list */}
        <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-1 px-1">
          {loading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {search ? 'Sin resultados' : 'No hay productos creados'}
            </div>
          ) : (
            filtered.map((product) => {
              const inv = inventoryMap[product._id];
              const stock = inv ? Number(inv.availableQuantity ?? inv.totalQuantity ?? 0) : null;
              const mainVariant = product.variants?.[0] || {};
              return (
                <button
                  key={product._id}
                  type="button"
                  onClick={() => handleSelect(product)}
                  className="w-full text-left p-3 rounded-[var(--mobile-radius-md)] border border-border bg-card no-tap-highlight active:bg-muted/30 transition-colors flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-lg border border-border bg-muted flex items-center justify-center shrink-0">
                    {mainVariant.images?.[0] ? (
                      <img src={mainVariant.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <Package size={16} className="text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{mainVariant.sku || product.sku || '—'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    {stock !== null ? (
                      <span className={cn(
                        'text-sm font-bold tabular-nums',
                        stock <= 0 ? 'text-destructive' : 'text-foreground',
                      )}>
                        {stock}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Sin inv.</span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </MobileActionSheet>
  );
}

/**
 * Creates a new inventory record for a product that doesn't have one yet,
 * then adjusts stock.
 */
function MobileNewInventoryRecord({ open, product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const handleStep = (delta) => {
    haptics.tap();
    setQuantity((q) => Math.max(1, q + delta));
  };

  const submit = async () => {
    if (quantity <= 0) { toast.error('Cantidad debe ser mayor a 0'); return; }
    try {
      setSubmitting(true);
      await fetchApi('/inventory', {
        method: 'POST',
        body: JSON.stringify({
          productId: product.productId,
          productName: product.productName,
          productSku: product.productSku,
          totalQuantity: quantity,
          minimumStock: 5,
          reference: `MOBILE-INIT-${Date.now()}`,
        }),
      });
      haptics.success();
      toast.success(`Inventario creado: ${product.productName} (${quantity} uds)`);
      onClose?.(true);
    } catch (err) {
      haptics.error();
      toast.error(err.message || 'Error al crear inventario');
    } finally {
      setSubmitting(false);
    }
  };

  const footer = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border">
      <button
        type="button"
        disabled={submitting || quantity <= 0}
        onClick={submit}
        className="w-full py-3.5 rounded-[var(--mobile-radius-md)] bg-emerald-600 text-white text-base font-semibold no-tap-highlight disabled:opacity-40"
      >
        {submitting ? 'Creando...' : `Crear inventario (${quantity} uds)`}
      </button>
    </div>
  );

  return (
    <MobileActionSheet
      open={open}
      onClose={() => onClose?.(false)}
      title="Nuevo registro de inventario"
      footer={footer}
    >
      <div className="space-y-4">
        <div className="p-3 rounded-[var(--mobile-radius-md)] bg-muted/50 border border-border">
          <p className="text-sm font-medium">{product.productName}</p>
          <p className="text-xs text-muted-foreground">{product.productSku || '—'}</p>
          <p className="text-xs text-amber-500 mt-1">Este producto no tiene inventario registrado</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Cantidad inicial</p>
          <div className="flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => handleStep(-1)}
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
            >
              −
            </button>
            <motion.span
              key={quantity}
              initial={{ scale: 1.15, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.1 }}
              className="text-3xl font-bold tabular-nums w-16 text-center"
            >
              {quantity}
            </motion.span>
            <button
              type="button"
              onClick={() => handleStep(1)}
              className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-bold no-tap-highlight active:scale-95 active:bg-muted transition-all"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </MobileActionSheet>
  );
}
