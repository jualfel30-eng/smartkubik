import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Switch } from '@/components/ui/switch.jsx';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { Loader2, RefreshCw } from 'lucide-react';

export default function InventoryAlertsPanel() {
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const [rules, setRules] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });
  const [inventories, setInventories] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    warehouseId: 'all',
    minQuantity: 0,
  });

  const productOptions = useMemo(() => {
    const map = new Map();
    inventories.forEach((inv) => {
      const pid = inv.productId || inv.product?._id;
      if (!pid) return;
      const pidStr = typeof pid === 'string' ? pid : (pid._id || pid).toString();
      if (!map.has(pidStr)) {
        map.set(pidStr, {
          id: pidStr,
          name: inv.productName || inv.product?.name || inv.productSku,
        });
      }
    });
    return Array.from(map.values());
  }, [inventories]);

  const loadData = async (page = pagination.page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', Math.min(pagination.limit || 50, 100));
      const [rulesRes, invRes, whRes] = await Promise.all([
        fetchApi(`/inventory-alerts?${params.toString()}`),
        fetchApi('/inventory?limit=100'),
        multiWarehouseEnabled ? fetchApi('/warehouses') : Promise.resolve({ data: [] }),
      ]);
      if (rulesRes?.data && rulesRes.pagination) {
        setRules(rulesRes.data);
        setPagination(rulesRes.pagination);
      } else {
        setRules(rulesRes?.data || rulesRes || []);
      }
      setInventories(invRes?.data || invRes || []);
      setWarehouses(whRes?.data || []);
    } catch (err) {
      console.error('Error loading alerts', err);
      toast.error('No se pudieron cargar las alertas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (pagination.page !== 1) {
      loadData(pagination.page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const handleCreate = async () => {
    if (!form.productId || Number(form.minQuantity) <= 0) {
      toast.error('Selecciona producto y mínimo > 0');
      return;
    }
    setSaving(true);
    try {
      await fetchApi('/inventory-alerts', {
        method: 'POST',
        body: JSON.stringify({
          productId: form.productId,
          warehouseId:
            multiWarehouseEnabled && form.warehouseId !== 'all'
              ? form.warehouseId
              : undefined,
          minQuantity: Number(form.minQuantity),
        }),
      });
      toast.success('Regla creada');
      setForm({ productId: '', warehouseId: 'all', minQuantity: 0 });
      await loadData(1);
    } catch (err) {
      console.error('Error creating alert rule', err);
      toast.error(err?.message || 'No se pudo crear la alerta');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (rule) => {
    try {
      await fetchApi(`/inventory-alerts/${rule._id || rule.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !rule.isActive }),
      });
      await loadData(pagination.page);
    } catch (err) {
      toast.error('No se pudo actualizar la regla');
    }
  };

  const handleDelete = async (rule) => {
    if (!confirm('¿Eliminar esta regla de alerta?')) return;
    try {
      await fetchApi(`/inventory-alerts/${rule._id || rule.id}`, { method: 'DELETE' });
      await loadData(pagination.page);
    } catch (err) {
      toast.error('No se pudo eliminar la regla');
    }
  };

  const handlePageChange = (delta) => {
    setPagination((prev) => {
      const next = Math.min(Math.max(1, prev.page + delta), prev.totalPages || 1);
      return { ...prev, page: next };
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Alertas de Stock</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configura mínimos por producto y (opcional) por almacén.
          </p>
        </div>
        <Button variant="outline" onClick={loadData} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refrescar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div className="space-y-1 md:col-span-2">
            <Label>Producto</Label>
            <Select
              value={form.productId}
              onValueChange={(v) => setForm((prev) => ({ ...prev, productId: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona producto" />
              </SelectTrigger>
              <SelectContent>
                {productOptions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {multiWarehouseEnabled && (
            <div className="space-y-1">
              <Label>Almacén (opcional)</Label>
              <Select
                value={form.warehouseId}
                onValueChange={(v) => setForm((prev) => ({ ...prev, warehouseId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Cualquiera" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Cualquiera</SelectItem>
                  {warehouses.map((wh) => {
                    const wId = (wh._id || wh.id || '').toString();
                    return (
                      <SelectItem key={wId} value={wId}>
                        {wh.code} · {wh.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Mínimo</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.minQuantity}
              onChange={(e) => setForm((prev) => ({ ...prev, minQuantity: e.target.value }))}
            />
          </div>
          <div>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear/Actualizar
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                {multiWarehouseEnabled && <TableHead>Almacén</TableHead>}
                <TableHead>Mínimo</TableHead>
                <TableHead>Activo</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={multiWarehouseEnabled ? 5 : 4} className="text-center text-muted-foreground">
                    Sin reglas de alerta.
                  </TableCell>
                </TableRow>
              ) : (
                rules.map((rule, idx) => (
                  <TableRow key={`${rule._id || rule.id || 'rule'}-${idx}`}>
                    <TableCell>
                      <div className="font-medium">
                  {productOptions.find((p) => p.id === ((rule.productId?._id || rule.productId || '') + ''))?.name ||
                          rule.productId?.name ||
                          rule.productId}
                      </div>
                    </TableCell>
                    {multiWarehouseEnabled && (
                      <TableCell>
                        {rule.warehouseId
                          ? warehouses.find((w) => (w._id || w.id) === (rule.warehouseId?._id || rule.warehouseId))?.name ||
                            '—'
                          : 'Cualquiera'}
                      </TableCell>
                    )}
                    <TableCell>{rule.minQuantity}</TableCell>
                    <TableCell>
                      <Switch checked={rule.isActive} onCheckedChange={() => handleToggle(rule)} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(rule)}>
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination?.total ? (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {pagination.page} de {pagination.totalPages} · {pagination.total} reglas
            </span>
            <div className="space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(-1)}
                disabled={loading || pagination.page <= 1}
              >
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handlePageChange(1)}
                disabled={loading || pagination.page >= pagination.totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
