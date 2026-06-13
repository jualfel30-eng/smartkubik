import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// Keys (por prefijo) de los datos del contenedor Inventario que comparten cache
// entre módulos (Productos, Inventario, Compras, Traslados). Producto = item;
// inventario = su stock — cualquier escritura de uno puede afectar al otro.
export const INVENTORY_CACHE_KEYS = [
  'products',
  'inventory',
  'compras-alerts',
  'suppliers',
  'transfers',
];

/**
 * Invalidación cruzada del cache del contenedor Inventario. Llamar tras CUALQUIER
 * escritura que afecte productos o stock (crear/editar/borrar producto, recibir
 * compra, ajustar stock, traslado) para que los demás módulos muestren datos
 * frescos al reentrar. Invalidación amplia por prefijo: prioriza correctitud
 * (no mostrar stock obsoleto) sobre evitar algún refetch de más.
 */
export function useInventoryCache() {
  const queryClient = useQueryClient();

  const invalidateInventoryData = useCallback(() => {
    INVENTORY_CACHE_KEYS.forEach((key) =>
      queryClient.invalidateQueries({ queryKey: [key] }),
    );
  }, [queryClient]);

  return { invalidateInventoryData };
}
