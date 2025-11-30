import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';

export function BillOfMaterialsDialog({ bom, open, onClose, onSave }) {
  const { products, loadProducts } = useProducts();

  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isActive, setIsActive] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [bomType, setBomType] = useState('production');
  const [notes, setNotes] = useState('');
  const [components, setComponents] = useState([]);
  const [byproducts, setByproducts] = useState([]);

  // Component form state
  const [newComponentProductId, setNewComponentProductId] = useState('');
  const [newComponentQuantity, setNewComponentQuantity] = useState('');
  const [newComponentUnit, setNewComponentUnit] = useState('');
  const [newComponentScrap, setNewComponentScrap] = useState('0');

  useEffect(() => {
    if (open) {
      loadProducts();
    }
  }, [open, loadProducts]);

  useEffect(() => {
    if (bom) {
      setProductId(bom.productId?._id || bom.productId || '');
      setVersion(bom.version || '1.0');
      setIsActive(bom.isActive !== false);
      setEffectiveDate(bom.effectiveDate ? formatDateLocal(bom.effectiveDate) : '');
      setExpiryDate(bom.expiryDate ? formatDateLocal(bom.expiryDate) : '');
      setBomType(bom.bomType || 'production');
      setNotes(bom.notes || '');
      setComponents(bom.components || []);
      setByproducts(bom.byproducts || []);
    } else {
      // Reset form
      setProductId('');
      setVersion('1.0');
      setIsActive(true);
      setEffectiveDate('');
      setExpiryDate('');
      setBomType('production');
      setNotes('');
      setComponents([]);
      setByproducts([]);
    }
    // Reset component form
    setNewComponentProductId('');
    setNewComponentQuantity('');
    setNewComponentUnit('');
    setNewComponentScrap('0');
  }, [bom, open]);

  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  };

  const handleAddComponent = () => {
    if (!newComponentProductId || !newComponentQuantity || !newComponentUnit) {
      alert('Por favor completa todos los campos del ingrediente');
      return;
    }

    const product = products.find((p) => p._id === newComponentProductId);

    setComponents([
      ...components,
      {
        componentProductId: newComponentProductId,
        componentProduct: product,
        quantity: parseFloat(newComponentQuantity),
        unit: newComponentUnit,
        scrapPercentage: parseFloat(newComponentScrap) || 0,
      },
    ]);

    // Reset component form
    setNewComponentProductId('');
    setNewComponentQuantity('');
    setNewComponentUnit('');
    setNewComponentScrap('0');
  };

  const handleRemoveComponent = (index) => {
    setComponents(components.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!productId || !version || components.length === 0) {
      alert('Por favor completa los campos requeridos y agrega al menos un ingrediente');
      return;
    }

    const payload = {
      productId,
      version,
      isActive,
      effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      bomType,
      notes: notes || undefined,
      components: components.map((c) => ({
        componentProductId: c.componentProductId,
        quantity: c.quantity,
        unit: c.unit,
        scrapPercentage: c.scrapPercentage || 0,
      })),
      byproducts: byproducts.length > 0 ? byproducts : undefined,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{bom ? 'Editar Receta' : 'Crear Nueva Receta'}</DialogTitle>
          <DialogDescription>
            {bom ? 'Modifica la receta y sus ingredientes.' : 'Crea una nueva receta con sus ingredientes y proporciones.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* BOM Header */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productId" className="text-right">
              Producto *
            </Label>
            <div className="col-span-3">
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un producto" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product._id} value={product._id}>
                      {product.name} ({product.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="version" className="text-right">
              Versión *
            </Label>
            <Input
              id="version"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              className="col-span-3"
              placeholder="1.0"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bomType" className="text-right">
              Tipo
            </Label>
            <div className="col-span-3">
              <Select value={bomType} onValueChange={setBomType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">Producción</SelectItem>
                  <SelectItem value="engineering">Ingeniería</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="text-right">
              Activa
            </Label>
            <div className="col-span-3">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="effectiveDate" className="text-right">
              Fecha Efectiva
            </Label>
            <Input
              id="effectiveDate"
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="expiryDate" className="text-right">
              Fecha Expiración
            </Label>
            <Input
              id="expiryDate"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Notas
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Notas adicionales"
              rows={2}
            />
          </div>

          {/* Components Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">Ingredientes *</h4>

            {/* Add Component Form */}
            <div className="grid grid-cols-6 gap-2 mb-4 items-end">
              <div className="col-span-2">
                <Label htmlFor="newComponentProductId" className="text-xs">
                  Ingrediente
                </Label>
                <Select value={newComponentProductId} onValueChange={setNewComponentProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {products
                      .filter((p) => p._id !== productId)
                      .map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newComponentQuantity" className="text-xs">
                  Cantidad
                </Label>
                <Input
                  id="newComponentQuantity"
                  type="number"
                  min="0"
                  step="0.001"
                  value={newComponentQuantity}
                  onChange={(e) => setNewComponentQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="newComponentUnit" className="text-xs">
                  Unidad
                </Label>
                <Input
                  id="newComponentUnit"
                  value={newComponentUnit}
                  onChange={(e) => setNewComponentUnit(e.target.value)}
                  placeholder="kg, L, unidades"
                />
              </div>

              <div>
                <Label htmlFor="newComponentScrap" className="text-xs">
                  Desperdicio %
                </Label>
                <Input
                  id="newComponentScrap"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newComponentScrap}
                  onChange={(e) => setNewComponentScrap(e.target.value)}
                  placeholder="0"
                />
              </div>

              <Button onClick={handleAddComponent} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {/* Components List */}
            {components.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingrediente</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Unidad</TableHead>
                    <TableHead>Desperdicio %</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {component.componentProduct?.name || component.componentProductId}
                      </TableCell>
                      <TableCell>{component.quantity}</TableCell>
                      <TableCell>{component.unit}</TableCell>
                      <TableCell>{component.scrapPercentage}%</TableCell>
                      <TableCell>
                        <Button size="sm" variant="destructive" onClick={() => handleRemoveComponent(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay ingredientes. Agrega al menos uno para continuar.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
