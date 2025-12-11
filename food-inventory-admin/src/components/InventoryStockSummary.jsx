import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card.jsx';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { Loader2, RefreshCw } from 'lucide-react';

export default function InventoryStockSummary() {
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const term = search.trim().toLowerCase();
    return data.filter(
      (item) =>
        item.productSku?.toLowerCase().includes(term) ||
        item.productName?.toLowerCase().includes(term),
    );
  }, [data, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((filtered.length || 0) / pageSize)),
    [filtered.length, pageSize],
  );

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchApi('/inventory/stock-summary');
      setData(res?.data || res || []);
    } catch (err) {
      console.error('Error loading stock summary', err);
      toast.error('No se pudo cargar el resumen de stock');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset paginación cuando cambia el filtro
  useEffect(() => {
    setPage(1);
  }, [search, pageSize, filtered.length]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Stock por almacén</CardTitle>
          <p className="text-sm text-muted-foreground">
            Disponible total y detalle por almacén para cada producto.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Mostrar</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
          <Input
            placeholder="Buscar SKU o nombre"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48"
          />
          <Button variant="outline" onClick={loadData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refrescar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Disponible total</TableHead>
              {multiWarehouseEnabled && <TableHead>Por almacén</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={multiWarehouseEnabled ? 3 : 2} className="text-center text-muted-foreground">
                  Sin datos de stock.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((item, idx) => (
                <TableRow key={(item._id || item.productId || 'row') + '-' + idx}>
                  <TableCell>
                    <div className="font-medium">{item.productSku}</div>
                    <div className="text-xs text-muted-foreground">{item.productName}</div>
                  </TableCell>
                  <TableCell>{item.totalAvailable}</TableCell>
                  {multiWarehouseEnabled && (
                    <TableCell>
                      <div className="space-y-1 text-xs">
                        {(item.warehouses || []).map((w, wIdx) => (
                          <div
                            key={`${item._id || item.productId || 'w'}-${w.warehouseId || wIdx}`}
                            className="flex items-center justify-between gap-2"
                          >
                            <span className="text-muted-foreground">
                              {w.warehouseCode || w.warehouseName || '—'}
                            </span>
                            <span className="font-medium">{w.available}</span>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <span>
              Mostrando {Math.min((page - 1) * pageSize + 1, filtered.length)}-
              {Math.min(page * pageSize, filtered.length)} de {filtered.length} productos
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Anterior
              </Button>
              <span>
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
