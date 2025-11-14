import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { useProducts } from '@/hooks/useProducts';
import { useProductionVersions } from '@/hooks/useProductionVersions';

export function ManufacturingOrderDialog({ order, open, onClose, onSave }) {
  const { products, loadProducts } = useProducts();
  const { productionVersions, loadProductionVersions } = useProductionVersions();

  const [productId, setProductId] = useState('');
  const [quantityToProduce, setQuantityToProduce] = useState('');
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedCompletionDate, setPlannedCompletionDate] = useState('');
  const [productionVersionId, setProductionVersionId] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState('normal');

  useEffect(() => {
    if (open) {
      loadProducts();
      loadProductionVersions();
    }
  }, [open]);

  useEffect(() => {
    if (order) {
      setProductId(order.productId?._id || order.productId || '');
      setQuantityToProduce(order.quantityToProduce?.toString() || '');
      setPlannedStartDate(order.plannedStartDate ? formatDateTimeLocal(order.plannedStartDate) : '');
      setPlannedCompletionDate(order.plannedCompletionDate ? formatDateTimeLocal(order.plannedCompletionDate) : '');
      setProductionVersionId(order.productionVersionId?._id || order.productionVersionId || '');
      setReference(order.reference || '');
      setNotes(order.notes || '');
      setPriority(order.priority || 'normal');
    } else {
      // Reset form
      setProductId('');
      setQuantityToProduce('');
      setPlannedStartDate('');
      setPlannedCompletionDate('');
      setProductionVersionId('');
      setReference('');
      setNotes('');
      setPriority('normal');
    }
  }, [order, open]);

  const formatDateTimeLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  };

  const handleSave = () => {
    if (!productId || !quantityToProduce) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const payload = {
      productId,
      quantityToProduce: parseFloat(quantityToProduce),
      plannedStartDate: plannedStartDate ? new Date(plannedStartDate).toISOString() : null,
      plannedCompletionDate: plannedCompletionDate ? new Date(plannedCompletionDate).toISOString() : null,
      productionVersionId: productionVersionId || null,
      reference: reference || undefined,
      notes: notes || undefined,
      priority,
    };

    onSave(payload);
  };

  // Filter production versions for selected product
  const filteredVersions = productionVersions.filter(
    (version) => version.productId?._id === productId || version.productId === productId
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Editar Orden de Manufactura' : 'Crear Nueva Orden de Manufactura'}</DialogTitle>
          <DialogDescription>
            {order ? 'Modifica los detalles de la orden de manufactura.' : 'Crea una nueva orden de manufactura.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Product Selection */}
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

          {/* Quantity */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantityToProduce" className="text-right">
              Cantidad *
            </Label>
            <Input
              id="quantityToProduce"
              type="number"
              min="0"
              step="0.001"
              value={quantityToProduce}
              onChange={(e) => setQuantityToProduce(e.target.value)}
              className="col-span-3"
              placeholder="Cantidad a producir"
            />
          </div>

          {/* Production Version */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productionVersionId" className="text-right">
              Versión de Producción
            </Label>
            <div className="col-span-3">
              <Select value={productionVersionId || "_none_"} onValueChange={(val) => setProductionVersionId(val === "_none_" ? "" : val)} disabled={!productId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una versión (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none_">Ninguna</SelectItem>
                  {filteredVersions.map((version) => (
                    <SelectItem key={version._id} value={version._id}>
                      {version.versionName}
                      {version.isDefault && ' (Predeterminada)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="priority" className="text-right">
              Prioridad
            </Label>
            <div className="col-span-3">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Planned Start Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plannedStartDate" className="text-right">
              Fecha Inicio Planificada
            </Label>
            <Input
              id="plannedStartDate"
              type="datetime-local"
              value={plannedStartDate}
              onChange={(e) => setPlannedStartDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Planned Completion Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="plannedCompletionDate" className="text-right">
              Fecha Fin Planificada
            </Label>
            <Input
              id="plannedCompletionDate"
              type="datetime-local"
              value={plannedCompletionDate}
              onChange={(e) => setPlannedCompletionDate(e.target.value)}
              className="col-span-3"
            />
          </div>

          {/* Reference */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reference" className="text-right">
              Referencia
            </Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="col-span-3"
              placeholder="Número de referencia externa"
            />
          </div>

          {/* Notes */}
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
