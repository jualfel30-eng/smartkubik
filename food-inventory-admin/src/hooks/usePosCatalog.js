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
async function fetchAllActiveProducts() {
  const first = await getProducts({
    isActive: true,
    includeInventory: true,
    page: 1,
    limit: PRELOAD_PAGE_SIZE,
  });
  let all = first.data || [];
  const totalPages = first.pagination?.totalPages || 1;
  if (totalPages > 1) {
    const promises = [];
    for (let i = 2; i <= totalPages; i++) {
      promises.push(
        getProducts({
          isActive: true,
          includeInventory: true,
          page: i,
          limit: PRELOAD_PAGE_SIZE,
        }),
      );
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
 * - Devuelve `rawProducts` (sin filtrar por vertical/stock; eso lo hace el contenedor).
 * - mode 'preload': catálogo completo cacheado.
 * - mode 'server': vacío hasta que el usuario busca o elige categoría.
 */
export function usePosCatalog({ tenantId, enabled = true }) {
  const on = enabled && !!tenantId;

  // Conteo barato para decidir el modo.
  const countQuery = useQuery({
    queryKey: ['pos-catalog-count', tenantId],
    queryFn: async () => {
      const res = await getProducts({ isActive: true, limit: 1 });
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
    queryKey: ['pos-catalog-full', tenantId],
    queryFn: fetchAllActiveProducts,
    enabled: on && mode === 'preload',
  });

  // Modo server: búsqueda / categoría activa.
  const [serverParams, setServerParams] = useState({ search: '', category: '' });
  const serverActive = Boolean(serverParams.search || serverParams.category);
  const serverQuery = useQuery({
    queryKey: ['pos-catalog-search', tenantId, serverParams],
    queryFn: async () => {
      const res = await getProducts({
        isActive: true,
        includeInventory: true,
        limit: SERVER_PAGE_SIZE,
        ...(serverParams.search ? { search: serverParams.search } : {}),
        ...(serverParams.category ? { category: serverParams.category } : {}),
      });
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
