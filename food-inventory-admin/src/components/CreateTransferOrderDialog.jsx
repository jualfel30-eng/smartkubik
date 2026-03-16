import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { getBusinessLocations, getSubsidiaries, createTransferOrder } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Plus, Trash2, Loader2, Search, MapPin, Building2 } from 'lucide-react';

export default function CreateTransferOrderDialog({ open, onOpenChange, onCreated }) {
  const { tenant } = useAuth();

  // Transfer mode: 'sedes' (multi-tenant) or 'locations' (BusinessLocations)
  const [transferMode, setTransferMode] = useState(null);
  const [loading, setLoading] = useState(true);

  // Data sources
  const [subsidiaries, setSubsidiaries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    // Common fields
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: '',
    items: [],
    // Multi-sede fields
    destinationTenantId: '',
    // BusinessLocations fields
    sourceLocationId: '',
    destinationLocationId: '',
  });

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        // Fetch products (always needed)
        const prods = await fetchApi('/products?limit=500');
        const productList = Array.isArray(prods) ? prods : prods?.data || [];
        setProducts(productList);
        setFilteredProducts(productList.slice(0, 20));

        // Fetch source warehouses (current tenant)
        const whs = await fetchApi('/warehouses');
        setWarehouses(Array.isArray(whs) ? whs : whs?.data || []);

        // Detect transfer mode: try subsidiaries first, then locations
        let mode = null;

        // Try multi-sede mode
        try {
          const subsResponse = await getSubsidiaries();
          const sedes = subsResponse?.data || [];

          if (sedes.length > 0 || subsResponse?.isParent || subsResponse?.isSubsidiary) {
            // Has sedes: use multi-sede mode
            setSubsidiaries(sedes);
            mode = 'sedes';
          }
        } catch (err) {
          console.log('No subsidiaries found:', err);
        }

        // If no sedes, try BusinessLocations mode
        if (!mode) {
          try {
            const locs = await getBusinessLocations({ isActive: true });
            const locationsList = Array.isArray(locs) ? locs : locs?.data || [];

            if (locationsList.length > 0) {
              setLocations(locationsList);
              mode = 'locations';
            }
          } catch (err) {
            console.log('No business locations found:', err);
          }
        }

        // Default to sedes mode if nothing found (allow creating first transfer)
        setTransferMode(mode || 'sedes');

      } catch (err) {
        console.error('Error loading data for transfer', err);
        toast.error('Error cargando datos para transferencia');
      } finally {
        setLoading(false);
      }
    };

    load();

    // Reset form
    setForm({
      sourceWarehouseId: '',
      destinationWarehouseId: '',
      notes: '',
      items: [],
      destinationTenantId: '',
      sourceLocationId: '',
      destinationLocationId: '',
    });
    setProductSearch('');
    setDestinationWarehouses([]);
  }, [open]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts(products.slice(0, 20));
      return;
    }
    const search = productSearch.toLowerCase();
    setFilteredProducts(
      products
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(search) ||
            p.sku?.toLowerCase().includes(search),
        )
        .slice(0, 20),
    );
  }, [productSearch, products]);

  // Fetch destination warehouses when destination tenant changes (multi-sede mode)
  useEffect(() => {
    if (transferMode !== 'sedes' || !form.destinationTenantId) {
      setDestinationWarehouses([]);
      return;
    }

    const fetchDestWarehouses = async () => {
      try {
        // TODO: Backend needs to support ?tenantId=xxx parameter
        // For now, we'll use the same warehouses endpoint which returns current tenant's warehouses
        // The backend transfer-orders.service already validates warehouse belongs to destination tenant
        const response = await fetchApi(`/warehouses?tenantId=${form.destinationTenantId}`);
        const destWhs = Array.isArray(response) ? response : response?.data || [];
        setDestinationWarehouses(destWhs);
      } catch (err) {
        console.error('Error fetching destination warehouses:', err);
        setDestinationWarehouses([]);
      }
    };

    fetchDestWarehouses();
  }, [transferMode, form.destinationTenantId]);

  const getWarehousesForLocation = (locationId) => {
    const location = locations.find((l) => (l._id || l.id) === locationId);
    if (!location) return [];
    const warehouseIds = (location.warehouseIds || []).map((w) =>
      typeof w === 'string' ? w : w._id || w.id || w,
    );
    return warehouses.filter((w) => warehouseIds.includes(w._id || w.id));
  };

  const addItem = (product) => {
    const productId = product._id || product.id;
    if (form.items.some((i) => i.productId === productId)) {
      toast.error('Producto ya agregado');
      return;
    }
    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          productId,
          productName: product.name,
          productSku: product.sku,
          quantity: 1,
        },
      ],
    }));
  };

  const removeItem = (productId) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((i) => i.productId !== productId),
    }));
  };

  const updateItemQty = (productId, qty) => {
    const quantity = Math.max(1, parseInt(qty) || 1);
    setForm((f) => ({
      ...f,
      items: f.items.map((i) =>
        i.productId === productId ? { ...i, quantity } : i,
      ),
    }));
  };

  const handleSave = async () => {
    // Validation based on mode
    if (transferMode === 'sedes') {
      if (!form.destinationTenantId) {
        toast.error('Selecciona sede destino');
        return;
      }
      if (form.destinationTenantId === tenant?.id || form.destinationTenantId === tenant?._id) {
        toast.error('Selecciona una sede diferente a la actual');
        return;
      }
    } else if (transferMode === 'locations') {
      if (!form.sourceLocationId || !form.destinationLocationId) {
        toast.error('Selecciona origen y destino');
        return;
      }
      if (form.sourceLocationId === form.destinationLocationId) {
        toast.error('Origen y destino deben ser diferentes');
        return;
      }
    }

    if (!form.sourceWarehouseId || !form.destinationWarehouseId) {
      toast.error('Selecciona almacenes de origen y destino');
      return;
    }
    if (form.items.length === 0) {
      toast.error('Agrega al menos un producto');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        sourceWarehouseId: form.sourceWarehouseId,
        destinationWarehouseId: form.destinationWarehouseId,
        notes: form.notes || undefined,
        items: form.items.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          requestedQuantity: i.quantity,
        })),
      };

      // Add fields based on mode
      if (transferMode === 'sedes') {
        payload.destinationTenantId = form.destinationTenantId;
      } else if (transferMode === 'locations') {
        payload.sourceLocationId = form.sourceLocationId;
        payload.destinationLocationId = form.destinationLocationId;
      }

      await createTransferOrder(payload);
      toast.success('Transferencia creada exitosamente');
      onCreated?.();
    } catch (err) {
      console.error('Error creating transfer', err);
      toast.error(err?.message || 'Error creando transferencia');
    } finally {
      setSaving(false);
    }
  };

  const sourceWarehouses = transferMode === 'locations'
    ? getWarehousesForLocation(form.sourceLocationId)
    : warehouses;

  const destWarehouses = transferMode === 'locations'
    ? getWarehousesForLocation(form.destinationLocationId)
    : destinationWarehouses;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nueva Transferencia de Inventario
            {transferMode && (
              <Badge variant="outline" className="text-[10px]">
                {transferMode === 'sedes' ? (
                  <><Building2 className="h-3 w-3 mr-1" /> Entre Sedes</>
                ) : (
                  <><MapPin className="h-3 w-3 mr-1" /> Entre Ubicaciones</>
                )}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Source / Destination */}
          <div className="grid grid-cols-2 gap-4">
            {/* SOURCE */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-green-600">Origen</h4>

              {/* Source location (only for BusinessLocations mode) */}
              {transferMode === 'locations' && (
                <div>
                  <Label>Ubicación origen</Label>
                  <Select
                    value={form.sourceLocationId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, sourceLocationId: v, sourceWarehouseId: '' }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => {
                        const id = l._id || l.id;
                        return (
                          <SelectItem key={id} value={id} disabled={id === form.destinationLocationId}>
                            {l.name} ({l.code})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Source sede (multi-sede mode - always current tenant) */}
              {transferMode === 'sedes' && (
                <div>
                  <Label>Sede origen</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted text-sm text-muted-foreground">
                    {tenant?.name} (actual)
                  </div>
                </div>
              )}

              {/* Source warehouse */}
              <div>
                <Label>Almacén origen</Label>
                <Select
                  value={form.sourceWarehouseId}
                  onValueChange={(v) => setForm((f) => ({ ...f, sourceWarehouseId: v }))}
                  disabled={transferMode === 'locations' && !form.sourceLocationId}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {sourceWarehouses.map((w) => {
                      const id = w._id || w.id;
                      return (
                        <SelectItem key={id} value={id}>{w.name} ({w.code})</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* DESTINATION */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-600">Destino</h4>

              {/* Destination location (only for BusinessLocations mode) */}
              {transferMode === 'locations' && (
                <div>
                  <Label>Ubicación destino</Label>
                  <Select
                    value={form.destinationLocationId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, destinationLocationId: v, destinationWarehouseId: '' }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => {
                        const id = l._id || l.id;
                        return (
                          <SelectItem key={id} value={id} disabled={id === form.sourceLocationId}>
                            {l.name} ({l.code})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destination sede (multi-sede mode) */}
              {transferMode === 'sedes' && (
                <div>
                  <Label>Sede destino</Label>
                  <Select
                    value={form.destinationTenantId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, destinationTenantId: v, destinationWarehouseId: '' }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="Seleccionar sede" /></SelectTrigger>
                    <SelectContent>
                      {subsidiaries.map((sede) => {
                        const id = sede._id || sede.id;
                        const currentTenantId = tenant?._id || tenant?.id;
                        const isCurrent = id === currentTenantId;

                        return (
                          <SelectItem key={id} value={id} disabled={isCurrent}>
                            <div className="flex items-center gap-2">
                              <span>{sede.name}</span>
                              {isCurrent && (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">Actual</Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destination warehouse */}
              <div>
                <Label>Almacén destino</Label>
                <Select
                  value={form.destinationWarehouseId}
                  onValueChange={(v) => setForm((f) => ({ ...f, destinationWarehouseId: v }))}
                  disabled={
                    (transferMode === 'locations' && !form.destinationLocationId) ||
                    (transferMode === 'sedes' && !form.destinationTenantId)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {destWarehouses.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {transferMode === 'sedes' && !form.destinationTenantId
                          ? 'Selecciona una sede primero'
                          : 'No hay almacenes disponibles'}
                      </div>
                    )}
                    {destWarehouses.map((w) => {
                      const id = w._id || w.id;
                      return (
                        <SelectItem key={id} value={id}>{w.name} ({w.code})</SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Product search */}
          <div>
            <Label>Agregar productos</Label>
            <div className="relative mt-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre o SKU..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
            {productSearch.trim() && filteredProducts.length > 0 && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto">
                {filteredProducts.map((p) => {
                  const pid = p._id || p.id;
                  const alreadyAdded = form.items.some((i) => i.productId === pid);
                  return (
                    <button
                      key={pid}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center disabled:opacity-50"
                      onClick={() => addItem(p)}
                      disabled={alreadyAdded}
                    >
                      <span>
                        {p.name}
                        {p.sku && <span className="text-muted-foreground ml-2">({p.sku})</span>}
                      </span>
                      {alreadyAdded ? (
                        <span className="text-xs text-muted-foreground">Agregado</span>
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Items table */}
          {form.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[100px]">Cantidad</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <span className="text-sm">{item.productName}</span>
                      {item.productSku && (
                        <span className="text-xs text-muted-foreground ml-2">({item.productSku})</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItemQty(item.productId, e.target.value)}
                        className="w-20 h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => removeItem(item.productId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Notes */}
          <div>
            <Label>Notas (opcional)</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Observaciones de la transferencia..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Crear transferencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
