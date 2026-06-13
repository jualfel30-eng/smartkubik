import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Package } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth.jsx';
import { useInventoryCache } from '@/hooks/useInventoryCache';
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adjustingProduct, setAdjustingProduct] = useState(null);
  const { tenant } = useAuth();
  const { invalidateInventoryData } = useInventoryCache();
  const sentinelRef = useRef(null);

  // Búsqueda server-side (debounced). Antes se cargaban 200 y se filtraba en
  // cliente → ocultaba 1287 productos (de 1487) y el conteo "(200)" mentía. Ahora
  // se busca/pagina contra el backend y el conteo es el total real, igual que desktop.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const listQuery = useInfiniteQuery({
    queryKey: ['products', tenant?.id, 'mobile-catalog', { search: debouncedSearch, type: typeFilter }],
    queryFn: ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: String(pageParam),
        limit: '30',
        includeInventory: 'true',
        includeInactive: 'true',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      });
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (typeFilter !== 'all') params.set('productType', typeFilter);
      return fetchApi(`/products?${params.toString()}`);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const p = lastPage?.pagination;
      return p && p.page < p.totalPages ? p.page + 1 : undefined;
    },
    enabled: !!tenant?.id,
    staleTime: 120_000,
    placeholderData: keepPreviousData,
  });

  const products = useMemo(
    () => (listQuery.data?.pages || []).flatMap((pg) => pg?.data || []),
    [listQuery.data],
  );
  const totalProducts = listQuery.data?.pages?.[0]?.pagination?.total ?? 0;
  const loading = listQuery.isLoading;

  // Conteos reales por tipo para los chips (counts baratos, cacheados).
  const countsQuery = useQuery({
    queryKey: ['products', tenant?.id, 'mobile-type-counts'],
    queryFn: async () => {
      const ids = ['all', 'simple', 'raw_material', 'consumable', 'supply'];
      const entries = await Promise.all(
        ids.map(async (id) => {
          const params = new URLSearchParams({ page: '1', limit: '1', includeInactive: 'true' });
          if (id !== 'all') params.set('productType', id);
          const res = await fetchApi(`/products?${params.toString()}`);
          return [id, res?.pagination?.total ?? 0];
        }),
      );
      return Object.fromEntries(entries);
    },
    enabled: !!tenant?.id,
    staleTime: 120_000,
  });
  const typeCounts = countsQuery.data || {};

  // Stock inline (availableQuantity viene del producto vía includeInventory).
  // El backend ya filtró por búsqueda/tipo, así que esta es la lista final.
  const enrichedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      _inventoryStock:
        p.availableQuantity ?? p.inventory?.availableQuantity ?? null,
    }));
  }, [products]);

  // Scroll infinito: cargar la siguiente página al acercarse al final.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && listQuery.hasNextPage && !listQuery.isFetchingNextPage) {
        listQuery.fetchNextPage();
      }
    }, { rootMargin: '400px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [listQuery.hasNextPage, listQuery.isFetchingNextPage, listQuery]);

  const handleToggle = useCallback((id) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const handleEditClose = useCallback((saved) => {
    setEditingProduct(null);
    if (saved) invalidateInventoryData(); // useQuery refetcha solo
  }, [invalidateInventoryData]);

  const handleAdjustClose = useCallback(() => {
    setAdjustingProduct(null);
    invalidateInventoryData();
  }, [invalidateInventoryData]);

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
          const count = typeCounts[f.id] ?? 0;
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
      {enrichedProducts.length === 0 ? (
        <MobileEmptyState
          icon={Package}
          title={debouncedSearch ? 'Sin resultados' : 'Sin productos'}
          description={
            debouncedSearch
              ? `No se encontraron productos para "${debouncedSearch}"`
              : 'Crea tu primer producto para empezar a vender'
          }
          action={
            !debouncedSearch
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
        <>
          <div className="px-4 space-y-2">
            {enrichedProducts.map((product) => (
              <MobileCatalogCard
                key={product._id}
                product={product}
                expanded={expandedId === product._id}
                onToggle={handleToggle}
                onEdit={setEditingProduct}
                onAdjustStock={handleAdjustStock}
              />
            ))}
          </div>
          {/* Sentinela de scroll infinito + total real (igual que desktop) */}
          <div ref={sentinelRef} className="h-1" />
          <p className="text-center text-xs text-muted-foreground py-3">
            {listQuery.isFetchingNextPage
              ? 'Cargando más…'
              : `Mostrando ${enrichedProducts.length} de ${totalProducts}`}
          </p>
        </>
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
