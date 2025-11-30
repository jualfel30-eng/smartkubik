import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useProducts } from '@/hooks/useProducts';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';
import { useRoutings } from '@/hooks/useRoutings';

export function ProductionVersionDialog({ version, open, onClose, onSave }) {
  const { products, loadProducts } = useProducts();
  const { boms, loadBoms } = useBillOfMaterials();
  const { routings, loadRoutings } = useRoutings();

  const [versionName, setVersionName] = useState('');
  const [productId, setProductId] = useState('');
  const [bomId, setBomId] = useState('');
  const [routingId, setRoutingId] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (open) {
      loadProducts();
      loadBoms();
      loadRoutings();
    }
  }, [open, loadProducts, loadBoms, loadRoutings]);

  useEffect(() => {
    if (version) {
      setVersionName(version.versionName || '');
      setProductId(version.productId?._id || version.productId || '');
      setBomId(version.bomId?._id || version.bomId || '');
      setRoutingId(version.routingId?._id || version.routingId || '');
      setIsDefault(version.isDefault || false);
      setIsActive(version.isActive !== false);
      setEffectiveDate(version.effectiveDate ? formatDateLocal(version.effectiveDate) : '');
      setExpiryDate(version.expiryDate ? formatDateLocal(version.expiryDate) : '');
      setDescription(version.description || '');
    } else {
      // Reset form
      setVersionName('');
      setProductId('');
      setBomId('');
      setRoutingId('');
      setIsDefault(false);
      setIsActive(true);
      setEffectiveDate('');
      setExpiryDate('');
      setDescription('');
    }
  }, [version, open]);

  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  };

  const handleSave = () => {
    if (!versionName || !productId || !bomId) {
      alert('Por favor completa los campos requeridos (nombre, producto y BOM)');
      return;
    }

    const payload = {
      versionName,
      productId,
      bomId,
      routingId: routingId || null,
      isDefault,
      isActive,
      effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : null,
      expiryDate: expiryDate ? new Date(expiryDate).toISOString() : null,
      description: description || undefined,
    };

    onSave(payload);
  };

  // Filter BOMs and Routings for selected product
  const filteredBoms = boms.filter((bom) => bom.productId?._id === productId || bom.productId === productId);
  const filteredRoutings = routings.filter(
    (routing) => routing.productId?._id === productId || routing.productId === productId
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{version ? 'Editar Versión de Producción' : 'Crear Nueva Versión de Producción'}</DialogTitle>
          <DialogDescription>
            {version
              ? 'Modifica la versión de producción.'
              : 'Crea una nueva versión de producción vinculando BOM y Routing.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="versionName" className="text-right">
              Nombre *
            </Label>
            <Input
              id="versionName"
              value={versionName}
              onChange={(e) => setVersionName(e.target.value)}
              className="col-span-3"
              placeholder="Versión Estándar 1.0"
            />
          </div>

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
            <Label htmlFor="bomId" className="text-right">
              Lista de Materiales *
            </Label>
            <div className="col-span-3">
              <Select value={bomId} onValueChange={setBomId} disabled={!productId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un BOM" />
                </SelectTrigger>
                <SelectContent>
                  {filteredBoms.length === 0 ? (
                    <SelectItem value="_no_boms_available_" disabled>
                      No hay BOMs para este producto
                    </SelectItem>
                  ) : (
                    filteredBoms.map((bom) => (
                      <SelectItem key={bom._id} value={bom._id}>
                        Versión {bom.version}
                        {bom.isActive ? ' (Activa)' : ' (Inactiva)'}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="routingId" className="text-right">
              Ruta de Producción
            </Label>
            <div className="col-span-3">
              <Select value={routingId || "_none_"} onValueChange={(val) => setRoutingId(val === "_none_" ? "" : val)} disabled={!productId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un routing (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Ninguno</SelectItem>
                  {filteredRoutings.map((routing) => (
                    <SelectItem key={routing._id} value={routing._id}>
                      {routing.name}
                      {routing.isActive ? ' (Activa)' : ' (Inactiva)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isDefault" className="text-right">
              Predeterminada
            </Label>
            <div className="col-span-3">
              <Checkbox id="isDefault" checked={isDefault} onCheckedChange={setIsDefault} />
              <p className="text-xs text-muted-foreground mt-1">
                Usar esta versión por defecto para órdenes de manufactura
              </p>
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
            <Label htmlFor="description" className="text-right">
              Descripción
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Descripción de la versión"
              rows={3}
            />
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
