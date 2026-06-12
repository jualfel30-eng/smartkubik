import { useState, useCallback } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getProducts, fetchApi } from '@/lib/api';

// Catálogos con <= PRELOAD_THRESHOLD productos: se precarga todo (UX de "ver todos"
// a la vista, ideal para restaurantes / catálogos chicos). Por encima, se pasa a
// carga server-side (buscar / categoría) para no bajar miles de docs en cada apertura.
// Ajustable; candidato a setting de tenant en el futuro.
export const PRELOAD_THRESHOLD = 800;
const PRELOAD_PAGE_SIZE = 100;
const SERVER_PAGE_SIZE = 50;

// Pagina todo el catálogo activo CON stock inline (una sola fuente; reemplaza el
// viejo doble fetch de /products + /inventory completos del POS).
// `inStockOnly` (retail) hace que el backend filtre stock>0 ANTES de paginar.
async function fetchAllActiveProducts(inStockOnly) {
  const base = { isActive: true, includeInventory: true, limit: PRELOAD_PAGE_SIZE };
  if (inStockOnly) base.inStockOnly = true;
  const first = await getProducts({ ...base, page: 1 });
  let all = first.data || [];
  const totalPages = first.pagination?.totalPages || 1;
  if (totalPages > 1) {
    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      promises.push(getProducts({ ...base, page: i }));
    }
    const rest = await Promise.all(promises);
    rest.forEach((r) => {
      all = all.concat(r.data || []);
    });
  }
  return all;
}

/**
 * Carga adaptativa del catálogo para el POS.
 * - `inStockOnly` (retail): el backend filtra stock>0 server-side, así el conteo
 *   y la precarga se basan en productos vendibles y no se pierden por el límite.
 * - mode 'preload': catálogo completo cacheado.
 * - mode 'server': vacío hasta que el usuario busca o elige categoría.
 */
export function usePosCatalog({ tenantId, enabled = true, inStockOnly = false }) {
  const on = enabled && !!tenantId;

  // Conteo barato para decidir el modo (en retail, cuenta solo productos con stock).
  const countQuery = useQuery({
    queryKey: ['pos-catalog-count', tenantId, inStockOnly],
    queryFn: async () => {
      const params = { isActive: true, limit: 1 };
      if (inStockOnly) params.inStockOnly = true;
      const res = await getProducts(params);
      return res.pagination?.total ?? 0;
    },
    enabled: on,
  });

  const total = countQuery.data ?? 0;
  const mode = !countQuery.isSuccess
    ? 'loading'
    : total <= PRELOAD_THRESHOLD
      ? 'preload'
      : 'server';

  // Modo preload: catálogo completo.
  const preloadQuery = useQuery({
    queryKey: ['pos-catalog-full', tenantId, inStockOnly],
    queryFn: () => fetchAllActiveProducts(inStockOnly),
    enabled: on && mode === 'preload',
  });

  // Modo server: búsqueda / categoría activa.
  const [serverParams, setServerParams] = useState({ search: '', category: '' });
  const serverActive = Boolean(serverParams.search || serverParams.category);
  const serverQuery = useQuery({
    queryKey: ['pos-catalog-search', tenantId, inStockOnly, serverParams],
    queryFn: async () => {
      const params = {
        isActive: true,
        includeInventory: true,
        limit: SERVER_PAGE_SIZE,
        ...(inStockOnly ? { inStockOnly: true } : {}),
        ...(serverParams.search ? { search: serverParams.search } : {}),
        ...(serverParams.category ? { category: serverParams.category } : {}),
      };
      const res = await getProducts(params);
      return res.data || [];
    },
    enabled: on && mode === 'server' && serverActive,
    placeholderData: keepPreviousData,
  });

  // Lista de categorías para poblar la barra del grid en modo server (donde no hay
  // productos precargados de los que derivarlas). Barata y cacheada.
  const categoriesQuery = useQuery({
    queryKey: ['pos-catalog-categories', tenantId],
    queryFn: async () => {
      const res = await fetchApi('/products/categories/list');
      return res.data || [];
    },
    enabled: on && mode === 'server',
    staleTime: 5 * 60_000,
  });

  const rawProducts =
    mode === 'preload'
      ? preloadQuery.data || []
      : serverActive
        ? serverQuery.data || []
        : [];

  const isLoading =
    mode === 'loading' ||
    (mode === 'preload'
      ? preloadQuery.isLoading
      : serverActive && serverQuery.isFetching);

  const search = useCallback(
    (term) => setServerParams((p) => ({ ...p, search: term || '' })),
    [],
  );
  const selectCategory = useCallback(
    (cat) => setServerParams((p) => ({ ...p, category: cat || '' })),
    [],
  );

  return {
    mode,
    rawProducts,
    isLoading,
    serverActive,
    serverParams,
    search,
    selectCategory,
    categories: categoriesQuery.data || [],
    total,
  };
}
