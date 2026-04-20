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
  { id: 'raw_material', label: 'Insumos' },
  { id: 'consumable', label: 'Consumibles' },
  { id: 'supply', label: 'Herramientas' },
];

export default function MobileProductCatalog({ onCreateProduct }) {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState([]);
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
      const [productsRes, inventoryRes] = await Promise.all([
        fetchApi('/products?limit=200&sort=-createdAt'),
        fetchApi('/inventory?limit=500'),
      ]);

      const productsList = productsRes?.data || productsRes || [];
      const inventoryList = inventoryRes?.data || inventoryRes || [];

      setProducts(Array.isArray(productsList) ? productsList : []);
      setInventory(Array.isArray(inventoryList) ? inventoryList : []);
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

  // Build inventory lookup by productId
  const inventoryMap = useMemo(() => {
    const map = {};
    inventory.forEach((inv) => {
      const pid = inv.productId && typeof inv.productId === 'object' ? inv.productId._id : inv.productId;
      if (pid) {
        const qty = Number(inv.availableQuantity ?? inv.totalQuantity ?? inv.currentStock ?? 0);
        map[pid] = (map[pid] || 0) + qty;
      }
    });
    return map;
  }, [inventory]);

  // Enrich products with stock data
  const enrichedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      _inventoryStock: inventoryMap[p._id] ?? null,
    }));
  }, [products, inventoryMap]);

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

  // Find inventory item for stock adjustment
  const findInventoryForProduct = useCallback((product) => {
    return inventory.find((inv) => {
      const pid = inv.productId && typeof inv.productId === 'object' ? inv.productId._id : inv.productId;
      return pid === product._id;
    });
  }, [inventory]);

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
              onAdjustStock={(p) => {
                const inv = findInventoryForProduct(p);
                if (inv) setAdjustingProduct(inv);
                else toast.info('Este producto no tiene inventario registrado');
              }}
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
