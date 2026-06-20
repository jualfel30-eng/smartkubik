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
import { useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { getBusinessLocations, getSubsidiaries, createTransferOrder, requestTransferOrder, approveTransferOrder, prepareTransferOrder, shipTransferOrder } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Plus, Trash2, Loader2, Search, MapPin, Building2, PackageOpen, Zap, Send } from 'lucide-react';

const STORAGE_KEY = 'smartkubik_transfer_defaults';

function loadDefaults() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch { return {}; }
}

function saveDefaults(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* */ }
}

export default function CreateTransferOrderDialog({ open, onOpenChange, onCreated }) {
  const queryClient = useQueryClient();
  const { tenant } = useAuth();

  const [transferMode, setTransferMode] = useState(null);
  const [loading, setLoading] = useState(true);

  const [subsidiaries, setSubsidiaries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [destinationWarehouses, setDestinationWarehouses] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expressMode, setExpressMode] = useState(false);

  const [form, setForm] = useState({
    sourceWarehouseId: '',
    destinationWarehouseId: '',
    notes: '',
    items: [],
    destinationTenantId: '',
    sourceLocationId: '',
    destinationLocationId: '',
  });

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoading(true);
      try {
        const whs = await fetchApi('/warehouses');
        const whsList = Array.isArray(whs) ? whs : whs?.data || [];
        setWarehouses(whsList);

        let mode = null;

        // Try multi-sede mode. Include the parent (CD/HQ) as a valid
        // destination when the current tenant is a subsidiary so that
        // returns and excess inventory can flow back to the central warehouse.
        try {
          const subsResponse = await getSubsidiaries();
          const sedes = subsResponse?.data || [];
          const parentTenant = subsResponse?.parentTenant;
          const isSubsidiary = subsResponse?.isSubsidiary;

          // If we're a subsidiary, prepend the parent to the destination list
          // (marked so the UI can label it as "Centro de distribucion")
          const destinations = isSubsidiary && parentTenant
            ? [{ ...parentTenant, isParentTenant: true }, ...sedes]
            : sedes;

          if (destinations.length > 0 || subsResponse?.isParent || isSubsidiary) {
            setSubsidiaries(destinations);
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

        setTransferMode(mode || 'sedes');

        // Smart defaults: remember last used source/destination
        const defaults = loadDefaults();
        const initialForm = {
          sourceWarehouseId: '',
          destinationWarehouseId: '',
          notes: '',
          items: [],
          destinationTenantId: '',
          sourceLocationId: '',
          destinationLocationId: '',
        };

        // Auto-select source warehouse if only 1 exists
        if (whsList.length === 1) {
          initialForm.sourceWarehouseId = whsList[0]._id || whsList[0].id;
        } else if (defaults.sourceWarehouseId && whsList.some(w => (w._id || w.id) === defaults.sourceWarehouseId)) {
          initialForm.sourceWarehouseId = defaults.sourceWarehouseId;
        }

        // Restore last destination
        if (mode === 'sedes' && defaults.destinationTenantId) {
          initialForm.destinationTenantId = defaults.destinationTenantId;
        }
        if (mode === 'locations') {
          if (defaults.sourceLocationId) initialForm.sourceLocationId = defaults.sourceLocationId;
          if (defaults.destinationLocationId) initialForm.destinationLocationId = defaults.destinationLocationId;
        }

        setForm(initialForm);
      } catch (err) {
        console.error('Error loading data for transfer', err);
        toast.error('Error cargando datos para transferencia');
      } finally {
        setLoading(false);
      }
    };

    load();
    setProductSearch('');
    setInventoryItems([]);
    setFilteredProducts([]);
    setDestinationWarehouses([]);
    setExpressMode(false);
  }, [open]);

  // Fetch inventory when source warehouse changes
  useEffect(() => {
    if (!form.sourceWarehouseId) {
      setInventoryItems([]);
      setFilteredProducts([]);
      return;
    }

    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        // Cacheado bajo ['inventory'] (lo invalida cualquier escritura de stock):
        // reabrir el diálogo / reelegir la misma bodega = instantáneo.
        // minAvailable=0.001 (no 1): el stock se guarda en la unidad BASE, que para
        // productos a granel puede ser fraccional (p.ej. 0.87 sacos = 8.7 kg). Con
        // umbral 1 esos saldos parciales desaparecían del buscador. 0.001 = "tiene
        // stock real" sin excluir granel parcial.
        const invUrl = `/inventory?warehouseId=${form.sourceWarehouseId}&minAvailable=0.001&limit=5000`;
        const res = await queryClient.fetchQuery({
          queryKey: ['inventory', tenant?.id, invUrl],
          queryFn: () => fetchApi(invUrl),
          staleTime: 120_000,
        });
        const items = res?.data || [];
        setInventoryItems(items);
        setFilteredProducts(items.slice(0, 20));
      } catch (err) {
        console.error('Error fetching inventory:', err);
        setInventoryItems([]);
        setFilteredProducts([]);
      } finally {
        setLoadingInventory(false);
      }
    };

    fetchInventory();
    setProductSearch('');
    setForm((f) => ({ ...f, items: [] }));
  }, [form.sourceWarehouseId]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts(inventoryItems.slice(0, 20));
      return;
    }
    // Tokenizado (cada palabra debe aparecer en algún campo) e incluye el nombre
    // REAL del producto (productId.name), no solo la copia desnormalizada
    // (productName), que en este tenant suele estar vieja. Antes solo se buscaba
    // en productName/SKU/brand, así que productos renombrados no aparecían.
    const words = productSearch.toLowerCase().split(/\s+/).filter(Boolean);
    setFilteredProducts(
      inventoryItems
        .filter((inv) => {
          const populatedProduct = inv.productId && typeof inv.productId === 'object' ? inv.productId : null;
          const haystack = [
            inv.productName,
            inv.productSku,
            populatedProduct?.name,
            populatedProduct?.sku,
            populatedProduct?.brand,
            ...(Array.isArray(populatedProduct?.category)
              ? populatedProduct.category
              : [populatedProduct?.category]),
          ]
            .filter(Boolean)
            .map((v) => String(v).toLowerCase())
            .join(' ');
          return words.every((w) => haystack.includes(w));
        })
        .slice(0, 20),
    );
  }, [productSearch, inventoryItems]);

  // Fetch destination warehouses when destination tenant changes (multi-sede mode)
  useEffect(() => {
    if (transferMode !== 'sedes' || !form.destinationTenantId) {
      setDestinationWarehouses([]);
      return;
    }

    const fetchDestWarehouses = async () => {
      try {
        const response = await fetchApi(`/warehouses?tenantId=${form.destinationTenantId}`);
        const destWhs = Array.isArray(response) ? response : response?.data || [];
        setDestinationWarehouses(destWhs);
        // Auto-select if only 1 destination warehouse
        if (destWhs.length === 1) {
          setForm((f) => ({ ...f, destinationWarehouseId: destWhs[0]._id || destWhs[0].id }));
        }
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

  const addItem = (invRecord) => {
    const productId = invRecord.productId && typeof invRecord.productId === 'object'
      ? (invRecord.productId._id || invRecord.productId.id || String(invRecord.productId))
      : invRecord.productId;
    if (form.items.some((i) => i.productId === productId)) {
      toast.error('Producto ya agregado');
      return;
    }
    const populatedProduct = invRecord.productId && typeof invRecord.productId === 'object' ? invRecord.productId : null;

    const hasMultiUnit = populatedProduct?.hasMultipleSellingUnits && populatedProduct?.sellingUnits?.length > 0;
    const activeSellingUnits = hasMultiUnit
      ? populatedProduct.sellingUnits.filter((u) => u.isActive !== false)
      : [];
    const baseUnit = populatedProduct?.unitOfMeasure || 'unidad';
    const useUnits = activeSellingUnits.length > 0;

    // Igual que el POS: si el producto tiene unidades de venta múltiples, el
    // selector muestra SOLO esas unidades (ya incluyen la presentación base);
    // NO se agrega la unidad base por separado, para no producir duplicados
    // confusos tipo "Caja, Unidad, Caja".
    const unitOptions = useUnits
      ? activeSellingUnits.map((u) => ({
          name: u.name,
          abbreviation: u.abbreviation,
          conversionFactor: u.conversionFactor,
          isBase: false,
        }))
      : [{ name: baseUnit, abbreviation: baseUnit, conversionFactor: 1, isBase: true }];

    // availableQuantity está en la unidad BASE del producto (p.ej. "saco").
    // Lo disponible expresado en una unidad = base / conversionFactor de esa unidad.
    const available = invRecord.availableQuantity || 0;
    const availInUnit = (cf) => (cf && cf !== 1 ? available / cf : available);

    // Unidad inicial: la marcada como default (o la primera). PERO si no alcanza
    // ni para 1 de esa unidad (p.ej. 0.87 sacos), bajamos automáticamente a la
    // unidad más fina disponible (kg) para no bloquear el traslado de saldos
    // parciales. El usuario igual puede cambiarla con el selector del ítem.
    let initialUnit = useUnits
      ? (activeSellingUnits.find((u) => u.isDefault) || activeSellingUnits[0])
      : { abbreviation: baseUnit, conversionFactor: 1 };

    if (availInUnit(initialUnit.conversionFactor) < 1) {
      // conversionFactor menor = unidad más fina = más cantidad disponible en ella.
      initialUnit = unitOptions.reduce(
        (finest, u) => (u.conversionFactor < finest.conversionFactor ? u : finest),
        initialUnit,
      );
    }

    // Cantidad inicial: 1 en la unidad elegida, o todo lo disponible si es menos
    // de 1 (caso degenerado sin unidad más fina). Nunca preseleccionar más de lo
    // que hay, para que "Enviar ahora" no reviente con stock insuficiente.
    const initialAvail = availInUnit(initialUnit.conversionFactor);
    const initialQty = initialAvail > 0 ? Math.min(1, initialAvail) : 1;

    setForm((f) => ({
      ...f,
      items: [
        ...f.items,
        {
          productId,
          productName: invRecord.productName,
          productSku: invRecord.productSku,
          brand: populatedProduct?.brand || '',
          availableQuantity: invRecord.availableQuantity,
          quantity: initialQty,
          unitOptions,
          hasMultiUnit: unitOptions.length > 1,
          selectedUnit: initialUnit.abbreviation,
          conversionFactor: initialUnit.conversionFactor,
          unitOfMeasure: baseUnit,
        },
      ],
    }));
    setProductSearch('');
  };

  const removeItem = (productId) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((i) => i.productId !== productId),
    }));
  };

  const updateItemQty = (productId, qty) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => {
        if (i.productId !== productId) return i;
        if (qty === '') return { ...i, quantity: '' };
        const rawValue = parseFloat(qty);
        if (isNaN(rawValue)) return { ...i, quantity: '' };
        const maxInUnit = i.conversionFactor !== 1
          ? i.availableQuantity / i.conversionFactor
          : i.availableQuantity;
        const quantity = Math.max(0, Math.min(rawValue, maxInUnit));
        return { ...i, quantity };
      }),
    }));
  };

  const updateItemUnit = (productId, unitAbbreviation) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((i) => {
        if (i.productId !== productId) return i;
        const unit = i.unitOptions.find((u) => u.abbreviation === unitAbbreviation);
        if (!unit) return i;
        return {
          ...i,
          selectedUnit: unit.abbreviation,
          conversionFactor: unit.conversionFactor,
          quantity: 1,
        };
      }),
    }));
  };

  const handleSave = async (mode = 'request') => {
    // mode: 'draft' | 'request' | 'express'
    // Validation
    if (transferMode === 'sedes' && !isSingleTenant) {
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
    if (mode === 'express') setExpressMode(true);

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
          selectedUnit: i.selectedUnit,
          unitOfMeasure: i.unitOfMeasure,
          ...(i.conversionFactor !== 1 && { conversionFactor: i.conversionFactor }),
        })),
      };

      if (transferMode === 'sedes') {
        payload.destinationTenantId = form.destinationTenantId;
      } else if (transferMode === 'locations') {
        payload.sourceLocationId = form.sourceLocationId;
        payload.destinationLocationId = form.destinationLocationId;
      }

      // Save defaults for next time
      saveDefaults({
        sourceWarehouseId: form.sourceWarehouseId,
        destinationTenantId: form.destinationTenantId,
        sourceLocationId: form.sourceLocationId,
        destinationLocationId: form.destinationLocationId,
      });

      const createdOrder = await createTransferOrder(payload);
      const orderId = createdOrder?._id || createdOrder?.id;

      if (mode === 'draft') {
        toast.success('Transferencia guardada como borrador');
      } else if (mode === 'request') {
        if (orderId) {
          await requestTransferOrder(orderId);
          toast.success('Transferencia creada y solicitada');
        }
      } else if (mode === 'express' && orderId) {
        // Express: request → approve → prepare → dispatch (all in sequence)
        toast.loading('Procesando transferencia express...', { id: 'express' });
        try {
          await requestTransferOrder(orderId);
          await approveTransferOrder(orderId);
          await prepareTransferOrder(orderId);
          await shipTransferOrder(orderId);
          toast.success('Transferencia enviada — esperando recepcion en destino', { id: 'express' });
        } catch (expressErr) {
          // If any step fails, the order is still created at whatever step it reached.
          // Surface the backend's real message (e.g. "Stock insuficiente para X...")
          // instead of a generic toast — fetchApi ya pone el mensaje en err.message.
          console.warn('Express flow partially completed:', expressErr);
          const reason = expressErr?.message || 'Revisa el estado en el detalle.';
          toast.warning(`Transferencia creada, pero el envío no se completó: ${reason}`, { id: 'express' });
        }
      }

      onCreated?.();
    } catch (err) {
      console.error('Error creating transfer', err);
      toast.error(err?.message || 'Error creando transferencia');
    } finally {
      setSaving(false);
      setExpressMode(false);
    }
  };

  // Single-tenant mode: standalone tenant with no subsidiaries — skip sede selector,
  // allow direct warehouse-to-warehouse transfer within the same tenant.
  const isSingleTenant = transferMode === 'sedes' && subsidiaries.length === 0;

  const sourceWarehouses = transferMode === 'locations'
    ? getWarehousesForLocation(form.sourceLocationId)
    : warehouses;

  const destWarehouses = transferMode === 'locations'
    ? getWarehousesForLocation(form.destinationLocationId)
    : isSingleTenant
      ? warehouses.filter(w => (w._id || w.id) !== form.sourceWarehouseId)
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Nueva Transferencia
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
              <h4 className="text-sm font-medium text-success">Origen</h4>

              {transferMode === 'locations' && (
                <div>
                  <Label>Ubicacion origen</Label>
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

              {transferMode === 'sedes' && (
                <div>
                  <Label>Sede origen</Label>
                  <div className="px-3 py-2 border rounded-md bg-muted text-sm text-muted-foreground">
                    {tenant?.name} (actual)
                  </div>
                </div>
              )}

              <div>
                <Label>Almacen origen</Label>
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
              <h4 className="text-sm font-medium text-info">Destino</h4>

              {transferMode === 'locations' && (
                <div>
                  <Label>Ubicacion destino</Label>
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

              {transferMode === 'sedes' && !isSingleTenant && (
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
                              {sede.isParentTenant && (
                                <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-500/40 text-blue-500">Centro de distribucion</Badge>
                              )}
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

              <div>
                <Label>Almacen destino</Label>
                <Select
                  value={form.destinationWarehouseId}
                  onValueChange={(v) => setForm((f) => ({ ...f, destinationWarehouseId: v }))}
                  disabled={
                    (transferMode === 'locations' && !form.destinationLocationId) ||
                    (transferMode === 'sedes' && !isSingleTenant && !form.destinationTenantId)
                  }
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    {destWarehouses.length === 0 && (
                      <div className="px-2 py-1.5 text-xs text-muted-foreground">
                        {transferMode === 'sedes' && !isSingleTenant && !form.destinationTenantId
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
            {!form.sourceWarehouseId ? (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <PackageOpen className="h-3.5 w-3.5" />
                Selecciona un almacen de origen para ver productos disponibles
              </p>
            ) : (
              <>
                <div className="relative mt-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por nombre o SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    disabled={loadingInventory}
                  />
                  {loadingInventory && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>
                {inventoryItems.length > 0 && !loadingInventory && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {inventoryItems.length} producto{inventoryItems.length !== 1 ? 's' : ''} con inventario disponible
                  </p>
                )}
                {inventoryItems.length === 0 && !loadingInventory && form.sourceWarehouseId && (
                  <p className="text-xs text-orange-500 mt-1">
                    No hay productos con inventario en este almacen
                  </p>
                )}
                {productSearch.trim() && filteredProducts.length > 0 && (
                  <div className="border rounded-md mt-1 max-h-48 overflow-y-auto">
                    {filteredProducts.map((inv) => {
                      const pid = inv.productId && typeof inv.productId === 'object'
                        ? (inv.productId._id || inv.productId.id || String(inv.productId))
                        : inv.productId;
                      const alreadyAdded = form.items.some((i) => i.productId === pid);
                      const populatedProduct = inv.productId && typeof inv.productId === 'object' ? inv.productId : null;
                      return (
                        <button
                          key={inv._id || pid}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex justify-between items-center gap-2 disabled:opacity-50"
                          onClick={() => addItem(inv)}
                          disabled={alreadyAdded}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">
                              {inv.productName}
                              {inv.productSku && (
                                <span className="text-muted-foreground ml-1.5">({inv.productSku})</span>
                              )}
                            </span>
                            {populatedProduct?.brand && (
                              <span className="text-xs text-muted-foreground">{populatedProduct.brand}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-mono">
                              {inv.availableQuantity} disp.
                            </Badge>
                            {alreadyAdded ? (
                              <span className="text-xs text-muted-foreground">Agregado</span>
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Items table */}
          {form.items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-[110px]">Unidad</TableHead>
                  <TableHead className="w-[90px] text-center">Disp.</TableHead>
                  <TableHead className="w-[100px]">Cantidad</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.items.map((item) => {
                  const availInUnit = item.conversionFactor !== 1
                    ? (item.availableQuantity / item.conversionFactor)
                    : item.availableQuantity;
                  const availDisplay = item.conversionFactor !== 1
                    ? availInUnit % 1 === 0 ? availInUnit.toString() : availInUnit.toFixed(2)
                    : item.availableQuantity.toString();

                  return (
                    <TableRow key={item.productId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{item.productName}</span>
                          <span className="text-xs text-muted-foreground">
                            {item.productSku && `${item.productSku}`}
                            {item.brand && ` · ${item.brand}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.hasMultiUnit ? (
                          <Select
                            value={item.selectedUnit}
                            onValueChange={(v) => updateItemUnit(item.productId, v)}
                          >
                            <SelectTrigger className="h-8 w-[100px] text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {item.unitOptions.map((u) => (
                                <SelectItem key={u.abbreviation} value={u.abbreviation}>
                                  {u.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground">{item.unitOfMeasure}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {availDisplay}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step={item.conversionFactor !== 1 ? '0.01' : '1'}
                          max={availInUnit}
                          value={item.quantity}
                          onChange={(e) => updateItemQty(item.productId, e.target.value)}
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val) || val < 0.01) {
                              updateItemQty(item.productId, item.conversionFactor !== 1 ? '0.01' : '1');
                            }
                          }}
                          className="w-20 h-8 text-sm no-spinners"
                        />
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeItem(item.productId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
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

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>

          {/* Secondary: save as draft for workflows that need approval steps */}
          <Button variant="outline" onClick={() => handleSave('draft')} disabled={saving} className="gap-1.5">
            {saving && !expressMode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Guardar borrador
          </Button>

          {/* Primary: express dispatch — create + request + approve + prepare + dispatch */}
          <Button
            onClick={() => handleSave('express')}
            disabled={saving}
            className="bg-[#FB923C] hover:bg-[#F97316] text-white gap-1.5"
          >
            {saving && expressMode ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Enviar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
