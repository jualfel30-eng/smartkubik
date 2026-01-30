import { useEffect, useMemo, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Input } from '@/components/ui/input.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { format } from 'date-fns';
import { Loader2, RefreshCw, Plus, ArrowRightLeft } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';
import { SearchableSelect } from './orders/v2/custom/SearchableSelect';

const MOVEMENT_TYPES = [
  { value: 'all', label: 'Todos' },
  { value: 'IN', label: 'Entrada (IN)' },
  { value: 'OUT', label: 'Salida (OUT)' },
  { value: 'ADJUSTMENT', label: 'Ajuste (ADJUST)' },
  { value: 'TRANSFER', label: 'Transferencia' },
];

export default function InventoryMovementsPanel() {
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;
  const [movements, setMovements] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0, limit: 50 });
  const [warehouses, setWarehouses] = useState([]);
  const [binLocations, setBinLocations] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [filters, setFilters] = useState({
    movementType: '',
    warehouseId: '',
    dateFrom: '',
    dateTo: '',
  });
  const [loading, setLoading] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [adjustForm, setAdjustForm] = useState({
    inventoryId: '',
    movementType: 'ADJUSTMENT',
    quantity: 1,
    unitCost: 0,
    reason: '',
    binLocationId: '',
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    productId: '',
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    sourceBinLocationId: '',
    destinationBinLocationId: '',
    quantity: 1,
    reason: '',
  });
  const [productSearchInput, setProductSearchInput] = useState('');

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

  const fetchMovements = async ({ page: overridePage, limit: overrideLimit } = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const page = overridePage ?? pagination.page;
      const limit = (overrideLimit ?? pagination.limit) || 50;
      params.append('page', page);
      params.append('limit', limit);
      if (filters.movementType && filters.movementType !== 'all') params.append('movementType', filters.movementType);
      if (filters.warehouseId && filters.warehouseId !== 'all') params.append('warehouseId', filters.warehouseId);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);
      const response = await fetchApi(`/inventory-movements?${params.toString()}`);
      if (response?.data && response.pagination) {
        setMovements(response.data);
        setPagination({ ...response.pagination, limit });
      } else {
        setMovements(response || []);
      }
    } catch (err) {
      console.error('Error fetching movements', err);
      toast.error('No se pudieron cargar los movimientos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAuxData = async () => {
    try {
      const [invRes, whResPromise, binResPromise] = await Promise.all([
        fetchApi('/inventory?limit=100'),
        multiWarehouseEnabled ? fetchApi('/warehouses') : Promise.resolve([]),
        multiWarehouseEnabled ? fetchApi('/bin-locations') : Promise.resolve([]),
      ]);
      const whRes = await whResPromise; // Resolve the promise for whRes
      const binRes = await binResPromise; // Resolve the promise for binRes

      setInventories(invRes?.data || invRes || []);
      console.log('🏭 [InventoryMovementsPanel] Warehouses loaded:', whRes.data || whRes);
      // fetchApi returns the array directly, not wrapped in { data: [...] }
      setWarehouses(Array.isArray(whRes) ? whRes : whRes?.data || []);
      setBinLocations(Array.isArray(binRes) ? binRes : binRes?.data || []);
    } catch (err) {
      console.error('Error fetching inventories/warehouses/bins', err);
    }
  };

  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (hasMountedRef.current) return;
    hasMountedRef.current = true;
    console.log('🔄 InventoryMovementsPanel MOUNTED');
    fetchAuxData();
    fetchMovements();
  }, []);

  useEffect(() => {
    if (pagination.page !== 1) {
      fetchMovements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page]);

  const selectedInventory = useMemo(
    () => inventories.find((inv) => (inv._id || inv.id) === adjustForm.inventoryId),
    [inventories, adjustForm.inventoryId],
  );

  // For transfers: find source inventory to show available stock
  const sourceInventoryForTransfer = useMemo(() => {
    if (!transferForm.productId || !transferForm.sourceWarehouseId) return null;
    return inventories.find(
      (inv) =>
        (inv.productId === transferForm.productId || inv.product?._id === transferForm.productId) &&
        (inv.warehouseId === transferForm.sourceWarehouseId || inv.warehouse?._id === transferForm.sourceWarehouseId),
    );
  }, [inventories, transferForm.productId, transferForm.sourceWarehouseId]);

  // Bin locations filtered by source warehouse (for transfers)
  const sourceBinOptions = useMemo(() => {
    if (!transferForm.sourceWarehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === transferForm.sourceWarehouseId && bin.isActive !== false,
    );
  }, [binLocations, transferForm.sourceWarehouseId]);

  // Bin locations filtered by destination warehouse (for transfers)
  const destBinOptions = useMemo(() => {
    if (!transferForm.destinationWarehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === transferForm.destinationWarehouseId && bin.isActive !== false,
    );
  }, [binLocations, transferForm.destinationWarehouseId]);

  // Bin locations filtered by selected inventory's warehouse (for adjustments)
  const adjustBinOptions = useMemo(() => {
    if (!selectedInventory?.warehouseId) return [];
    return binLocations.filter(
      (bin) => bin.warehouseId === selectedInventory.warehouseId && bin.isActive !== false,
    );
  }, [binLocations, selectedInventory]);

  useEffect(() => {
    if (selectedInventory && !adjustForm.unitCost) {
      setAdjustForm((prev) => ({ ...prev, unitCost: selectedInventory.averageCostPrice || 0 }));
    }
  }, [selectedInventory]);

  const handleApplyFilters = () => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchMovements({ page: 1 });
  };

  const handlePageSizeChange = (size) => {
    setPagination((prev) => ({ ...prev, limit: size, page: 1 }));
    fetchMovements({ page: 1, limit: size });
  };

  const handlePageChange = (delta) => {
    setPagination((prev) => {
      const nextPage = Math.min(Math.max(1, prev.page + delta), prev.totalPages || 1);
      return { ...prev, page: nextPage };
    });
  };

  const handleOpenAdjust = () => {
    setAdjustForm({
      inventoryId: '',
      movementType: 'ADJUSTMENT',
      quantity: 1,
      unitCost: 0,
      reason: 'Ajuste manual',
      binLocationId: '',
    });
    setAdjustModalOpen(true);
  };

  const handleSaveAdjust = async () => {
    if (!adjustForm.inventoryId || !adjustForm.quantity || !adjustForm.movementType) {
      toast.error('Completa inventario, tipo y cantidad');
      return;
    }
    setSaving(true);
    try {
      await fetchApi('/inventory/movements', {
        method: 'POST',
        body: JSON.stringify({
          inventoryId: adjustForm.inventoryId,
          movementType: adjustForm.movementType,
          quantity: Number(adjustForm.quantity),
          unitCost: Number(adjustForm.unitCost) || 0,
          reason: adjustForm.reason,
          warehouseId: selectedInventory?.warehouseId,
          binLocationId: adjustForm.binLocationId || undefined,
        }),
      });
      toast.success('Movimiento registrado');
      setAdjustModalOpen(false);
      await fetchMovements();
      await fetchAuxData();
    } catch (err) {
      console.error('Error creating movement', err);
      toast.error(err?.message || 'No se pudo registrar el movimiento');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenTransfer = () => {
    setTransferForm({
      productId: '',
      sourceWarehouseId: '',
      destinationWarehouseId: '',
      sourceBinLocationId: '',
      destinationBinLocationId: '',
      quantity: 1,
      reason: '',
    });
    setTransferModalOpen(true);
  };

  const handleSaveTransfer = async () => {
    if (!transferForm.productId || !transferForm.sourceWarehouseId || !transferForm.destinationWarehouseId || !transferForm.quantity) {
      toast.error('Completa producto, almacén origen, destino y cantidad');
      return;
    }
    if (transferForm.sourceWarehouseId === transferForm.destinationWarehouseId) {
      toast.error('El almacén origen y destino no pueden ser el mismo');
      return;
    }
    setSaving(true);
    try {
      console.log('🚀 [Transfer] Sending payload:', {
        productId: transferForm.productId,
        sourceWarehouseId: transferForm.sourceWarehouseId,
        destinationWarehouseId: transferForm.destinationWarehouseId,
        quantity: Number(transferForm.quantity)
      });
      await fetchApi('/inventory-movements/transfers', {
        method: 'POST',
        body: JSON.stringify({
          productId: transferForm.productId,
          sourceWarehouseId: transferForm.sourceWarehouseId,
          destinationWarehouseId: transferForm.destinationWarehouseId,
          sourceBinLocationId: transferForm.sourceBinLocationId || undefined,
          destinationBinLocationId: transferForm.destinationBinLocationId || undefined,
          quantity: Number(transferForm.quantity),
          reason: transferForm.reason || undefined,
        }),
      });
      toast.success('Transferencia registrada');
      setTransferModalOpen(false);
      await fetchMovements();
      await fetchAuxData();
    } catch (err) {
      console.error('Error creating transfer', err);
      toast.error(err?.message || 'No se pudo registrar la transferencia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Movimientos de Inventario</CardTitle>
          <p className="text-sm text-muted-foreground">
            Auditoría rápida y ajustes manuales (IN / OUT / ADJUST).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMovements} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refrescar
          </Button>
          {multiWarehouseEnabled && warehouses.length >= 2 && (
            <Button variant="outline" onClick={handleOpenTransfer}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transferir
            </Button>
          )}
          <Button onClick={handleOpenAdjust}>
            <Plus className="h-4 w-4 mr-2" />
            Ajuste manual
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label>Tipo</Label>
            <Select
              value={filters.movementType}
              onValueChange={(v) => setFilters((prev) => ({ ...prev, movementType: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_TYPES.map((opt) => (
                  <SelectItem key={opt.value || 'all'} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {multiWarehouseEnabled && (
            <div className="space-y-1">
              <Label>Almacén</Label>
              <Select
                value={filters.warehouseId}
                onValueChange={(v) => setFilters((prev) => ({ ...prev, warehouseId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {warehouses.map((wh) => (
                    <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                      {wh.code} · {wh.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1">
            <Label>Desde</Label>
            <Input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateFrom: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label>Hasta</Label>
            <Input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dateTo: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={handleApplyFilters} disabled={loading}>
            Aplicar filtros
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Producto</TableHead>
                {multiWarehouseEnabled && <TableHead>Almacén</TableHead>}
                <TableHead>Cantidad</TableHead>
                <TableHead>Razón</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={multiWarehouseEnabled ? 6 : 5} className="text-center text-muted-foreground">
                    Sin movimientos en el rango seleccionado.
                  </TableCell>
                </TableRow>
              ) : (
                movements.map((mov, idx) => (
                  <TableRow key={`${mov._id || mov.id || 'mov'}-${idx}`}>
                    <TableCell>{mov.createdAt ? format(new Date(mov.createdAt), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                    <TableCell>{mov.movementType}</TableCell>
                    <TableCell>
                      <div className="font-medium">{mov.productSku}</div>
                      <div className="text-xs text-muted-foreground">{mov.productName || ''}</div>
                    </TableCell>
                    {multiWarehouseEnabled && (
                      <TableCell>{warehouses.find((w) => (w._id || w.id) === (mov.warehouseId || mov.warehouse))?.name || '—'}</TableCell>
                    )}
                    <TableCell>{mov.quantity}</TableCell>
                    <TableCell className="max-w-xs truncate">{mov.reason || '—'}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {pagination?.total ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Mostrar</span>
              <Select
                value={String(pagination.limit)}
                onValueChange={(v) => handlePageSizeChange(Number(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>por página</span>
            </div>
            <div className="flex items-center gap-3">
              <span>
                Página {pagination.page} de {pagination.totalPages} · {pagination.total} movimientos
              </span>
              <div className="space-x-2">
                <Button size="sm" variant="outline" onClick={() => handlePageChange(-1)} disabled={loading || pagination.page <= 1}>
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
          </div>
        ) : null}
      </CardContent>

      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuste manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Inventario</Label>
              <Select
                value={adjustForm.inventoryId}
                onValueChange={(v) => setAdjustForm((prev) => ({ ...prev, inventoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona inventario" />
                </SelectTrigger>
                <SelectContent>
                  {inventories.map((inv) => (
                    <SelectItem key={inv._id || inv.id} value={inv._id || inv.id}>
                      {inv.productSku} · {inv.productName}
                      {multiWarehouseEnabled && inv.warehouse?.name ? ` · ${inv.warehouse.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={adjustForm.movementType}
                  onValueChange={(v) => setAdjustForm((prev) => ({ ...prev, movementType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">IN (Entrada)</SelectItem>
                    <SelectItem value="OUT">OUT (Salida)</SelectItem>
                    <SelectItem value="ADJUSTMENT">ADJUST (Ajuste)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cantidad</Label>
                <NumberInput
                  min={0}
                  step={0.01}
                  value={adjustForm.quantity ?? ''}
                  onValueChange={(val) => setAdjustForm((prev) => ({ ...prev, quantity: val }))}
                  placeholder="Cantidad"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Costo unitario</Label>
                <NumberInput
                  min={0}
                  step={0.01}
                  value={adjustForm.unitCost ?? ''}
                  onValueChange={(val) => setAdjustForm((prev) => ({ ...prev, unitCost: val }))}
                  placeholder="Costo unitario"
                />
              </div>
              <div className="space-y-1">
                <Label>Razón</Label>
                <Input
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ajuste manual"
                />
              </div>
            </div>
            {/* Bin location selector - only show when bins exist for selected inventory's warehouse */}
            {adjustBinOptions.length > 0 && (
              <div className="space-y-1">
                <Label>Ubicación (opcional)</Label>
                <Select
                  value={adjustForm.binLocationId}
                  onValueChange={(v) => setAdjustForm((prev) => ({ ...prev, binLocationId: v === 'none' ? '' : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ubicación..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin especificar</SelectItem>
                    {adjustBinOptions.map((bin) => (
                      <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                        {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAdjust} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Modal */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transferencia entre almacenes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Producto</Label>
              <SearchableSelect
                options={productOptions.map(p => ({
                  value: p.id,
                  label: `${p.name} (${p.sku || 'N/A'})`,
                  product: p,
                }))}
                onSelection={(option) => {
                  setTransferForm((prev) => ({ ...prev, productId: option.value }));
                  setProductSearchInput('');
                }}
                inputValue={productSearchInput}
                onInputChange={setProductSearchInput}
                value={transferForm.productId ? {
                  value: transferForm.productId,
                  label: productOptions.find(p => p.id === transferForm.productId)?.name || '',
                } : null}
                placeholder="Buscar producto..."
                isDisabled={false}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Almacén origen</Label>
                <Select
                  value={transferForm.sourceWarehouseId}
                  onValueChange={(v) => setTransferForm((prev) => ({ ...prev, sourceWarehouseId: v, sourceBinLocationId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Origen" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                        {wh.code} · {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Almacén destino</Label>
                <Select
                  value={transferForm.destinationWarehouseId}
                  onValueChange={(v) => setTransferForm((prev) => ({ ...prev, destinationWarehouseId: v, destinationBinLocationId: '' }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destino" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      .filter((wh) => (wh._id || wh.id) !== transferForm.sourceWarehouseId)
                      .map((wh) => (
                        <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                          {wh.code} · {wh.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* Bin location selectors - only show when bins exist for selected warehouses */}
            {(sourceBinOptions.length > 0 || destBinOptions.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Ubicación origen (opcional)</Label>
                  <Select
                    value={transferForm.sourceBinLocationId}
                    onValueChange={(v) => setTransferForm((prev) => ({ ...prev, sourceBinLocationId: v === 'none' ? '' : v }))}
                    disabled={sourceBinOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={sourceBinOptions.length === 0 ? 'Sin ubicaciones' : 'Seleccionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {sourceBinOptions.map((bin) => (
                        <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                          {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ubicación destino (opcional)</Label>
                  <Select
                    value={transferForm.destinationBinLocationId}
                    onValueChange={(v) => setTransferForm((prev) => ({ ...prev, destinationBinLocationId: v === 'none' ? '' : v }))}
                    disabled={destBinOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={destBinOptions.length === 0 ? 'Sin ubicaciones' : 'Seleccionar...'} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {destBinOptions.map((bin) => (
                        <SelectItem key={bin._id || bin.id} value={bin._id || bin.id}>
                          {bin.code} {bin.zone ? `· ${bin.zone}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cantidad</Label>
                <NumberInput
                  min={0.0001}
                  step={0.01}
                  value={transferForm.quantity ?? ''}
                  onValueChange={(val) => setTransferForm((prev) => ({ ...prev, quantity: val }))}
                  placeholder="Cantidad"
                />
                {sourceInventoryForTransfer && (
                  <p className="text-xs text-muted-foreground">
                    Disponible: {sourceInventoryForTransfer.availableQuantity ?? 0}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Razón (opcional)</Label>
                <Input
                  value={transferForm.reason}
                  onChange={(e) => setTransferForm((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Motivo de la transferencia"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveTransfer} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Transferir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
