import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import { STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import MobileSearchBar from '../primitives/MobileSearchBar.jsx';
import MobileEmptyState from '../primitives/MobileEmptyState.jsx';
import MobileListSkeleton from '../primitives/MobileListSkeleton.jsx';
import MobileCatalogCard from './MobileCatalogCard.jsx';
import MobileEditProduct from './MobileEditProduct.jsx';
import MobileAdjustStock from './MobileAdjustStock.jsx';

const TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'simple', label: 'Mercancia' },
  { id: 'raw_material', label: 'Materias Primas' },
  { id: 'consumable', label: 'Consumibles' },
  { id: 'supply', label: 'Suministros' },
];

export default function MobileProductCatalog({ onCreateProduct }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const loadedRef = useRef(false);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      // Una sola llamada con stock inline (includeInventory) — antes se traían
      // además TODOS los docs completos de inventario (/inventory?limit=500 =
      // ~3s + 334KB en móvil). El stock por producto sale del producto mismo.
      const productsRes = await fetchApi(
        '/products?limit=200&includeInventory=true&sort=-createdAt',
      );
      const productsList = productsRes?.data || productsRes || [];
      setProducts(Array.isArray(productsList) ? productsList : []);
    } catch (err) {
      toast.error('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadProducts();
    }
  }, [loadProducts]);

  // Stock inline (availableQuantity viene del producto vía includeInventory).
  const enrichedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      _inventoryStock:
        p.availableQuantity ?? p.inventory?.availableQuantity ?? null,
    }));
  }, [products]);

  // Filter & search
  const filtered = useMemo(() => {
    let result = [...enrichedProducts];

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter((p) => p.productType === typeFilter);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter((p) => {
        const name = (p.name || '').toLowerCase();
        const sku = (p.sku || p.variants?.[0]?.sku || '').toLowerCase();
        const brand = (p.brand || '').toLowerCase();
        return name.includes(q) || sku.includes(q) || brand.includes(q);
      });
    }

    return result;
  }, [enrichedProducts, typeFilter, search]);

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleEditClose = useCallback((saved) => {
    setEditingProduct(null);
    if (saved) loadProducts();
  }, [loadProducts]);

  const handleAdjustClose = useCallback(() => {
    setAdjustingProduct(null);
    loadProducts();
  }, [loadProducts]);

  // Trae el inventario del producto on-demand al tocar "ajustar" (en vez de
  // precargar los 500 docs completos). Usa el SKU -> /inventory/product/:sku.
  const handleAdjustStock = useCallback(async (product) => {
    const sku = product.sku || product.variants?.[0]?.sku;
    if (!sku) {
      toast.info('Este producto no tiene inventario registrado');
      return;
    }
    try {
      const res = await fetchApi(`/inventory/product/${encodeURIComponent(sku)}`);
      const inv = res?.data || res;
      if (inv && inv._id) setAdjustingProduct(inv);
      else toast.info('Este producto no tiene inventario registrado');
    } catch {
      toast.info('Este producto no tiene inventario registrado');
    }
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-3 pb-24">
        <MobileListSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Filter chips */}
      <div
        className="flex gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.id;
          const count = f.id === 'all'
            ? enrichedProducts.length
            : enrichedProducts.filter((p) => p.productType === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => { haptics.select(); setTypeFilter(f.id); }}
              className={cn(
                'rounded-full px-3 py-1.5 text-xs font-medium border whitespace-nowrap no-tap-highlight transition-colors',
                'scroll-snap-align-start',
                active
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border text-muted-foreground',
              )}
            >
              {f.label} {count > 0 && <span className="ml-0.5 opacity-70">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="px-4 py-2">
        <MobileSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Buscar producto, SKU o marca..."
        />
      </div>

      {/* Products list */}
      {filtered.length === 0 ? (
        <MobileEmptyState
          icon={Package}
          title={search ? 'Sin resultados' : 'Sin productos'}
          description={
            search
              ? `No se encontraron productos para "${search}"`
              : 'Crea tu primer producto para empezar a vender'
          }
          action={
            !search
              ? (
                <button
                  type="button"
                  onClick={onCreateProduct}
                  className="px-4 py-2.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight"
                >
                  Crear producto
                </button>
              )
              : undefined
          }
        />
      ) : (
        <motion.div
          className="px-4 space-y-2"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.03 } } }}
        >
          {filtered.map((product) => (
            <MobileCatalogCard
              key={product._id}
              product={product}
              expanded={expandedId === product._id}
              onToggle={handleToggle}
              onEdit={setEditingProduct}
              onAdjustStock={handleAdjustStock}
            />
          ))}
        </motion.div>
      )}

      {/* Edit bottom sheet */}
      {editingProduct && (
        <MobileEditProduct
          open={!!editingProduct}
          onClose={handleEditClose}
          product={editingProduct}
        />
      )}

      {/* Adjust stock bottom sheet */}
      {adjustingProduct && (
        <MobileAdjustStock
          open={!!adjustingProduct}
          onClose={handleAdjustClose}
          item={adjustingProduct}
        />
      )}
    </div>
  );
}
