import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { getBusinessLocations, createTransferOrder } from '@/lib/api';
import { Plus, Trash2, Loader2, Search } from 'lucide-react';

export default function CreateTransferOrderDialog({ open, onOpenChange, onCreated }) {
  const [locations, setLocations] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    sourceLocationId: '',
    sourceWarehouseId: '',
    destinationLocationId: '',
    destinationWarehouseId: '',
    notes: '',
    items: [],
  });

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const [locs, whs, prods] = await Promise.all([
          getBusinessLocations({ isActive: true }),
          fetchApi('/warehouses'),
          fetchApi('/products?limit=500'),
        ]);
        setLocations(Array.isArray(locs) ? locs : locs?.data || []);
        setWarehouses(Array.isArray(whs) ? whs : whs?.data || []);
        const productList = Array.isArray(prods) ? prods : prods?.data || [];
        setProducts(productList);
        setFilteredProducts(productList.slice(0, 20));
      } catch (err) {
        console.error('Error loading data for transfer', err);
      }
    };
    load();
    // Reset form
    setForm({
      sourceLocationId: '',
      sourceWarehouseId: '',
      destinationLocationId: '',
      destinationWarehouseId: '',
      notes: '',
      items: [],
    });
    setProductSearch('');
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
    if (!form.sourceLocationId || !form.destinationLocationId) {
      toast.error('Selecciona origen y destino');
      return;
    }
    if (form.sourceLocationId === form.destinationLocationId) {
      toast.error('Origen y destino deben ser diferentes');
      return;
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
      await createTransferOrder({
        sourceLocationId: form.sourceLocationId,
        sourceWarehouseId: form.sourceWarehouseId,
        destinationLocationId: form.destinationLocationId,
        destinationWarehouseId: form.destinationWarehouseId,
        notes: form.notes || undefined,
        items: form.items.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });
      toast.success('Transferencia creada exitosamente');
      onCreated?.();
    } catch (err) {
      console.error('Error creating transfer', err);
      toast.error(err?.message || 'Error creando transferencia');
    } finally {
      setSaving(false);
    }
  };

  const sourceWarehouses = getWarehousesForLocation(form.sourceLocationId);
  const destWarehouses = getWarehousesForLocation(form.destinationLocationId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva Transferencia de Inventario</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Source / Destination */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-green-600">Origen</h4>
              <div>
                <Label>Sede origen</Label>
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
              <div>
                <Label>Almacen origen</Label>
                <Select
                  value={form.sourceWarehouseId}
                  onValueChange={(v) => setForm((f) => ({ ...f, sourceWarehouseId: v }))}
                  disabled={!form.sourceLocationId}
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

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-blue-600">Destino</h4>
              <div>
                <Label>Sede destino</Label>
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
              <div>
                <Label>Almacen destino</Label>
                <Select
                  value={form.destinationWarehouseId}
                  onValueChange={(v) => setForm((f) => ({ ...f, destinationWarehouseId: v }))}
                  disabled={!form.destinationLocationId}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
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
