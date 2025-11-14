import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useWorkCenters } from '@/hooks/useWorkCenters';

export function RoutingDialog({ routing, open, onClose, onSave }) {
  const { products, loadProducts } = useProducts();
  const { workCenters, loadWorkCenters } = useWorkCenters();

  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [version, setVersion] = useState('1.0');
  const [isActive, setIsActive] = useState(true);
  const [description, setDescription] = useState('');
  const [operations, setOperations] = useState([]);

  // Operation form state
  const [newOpWorkCenterId, setNewOpWorkCenterId] = useState('');
  const [newOpSetupTime, setNewOpSetupTime] = useState('');
  const [newOpCycleTime, setNewOpCycleTime] = useState('');
  const [newOpDescription, setNewOpDescription] = useState('');

  useEffect(() => {
    if (open) {
      loadProducts();
      loadWorkCenters();
    }
  }, [open]);

  useEffect(() => {
    if (routing) {
      setName(routing.name || '');
      setProductId(routing.productId?._id || routing.productId || '');
      setVersion(routing.version || '1.0');
      setIsActive(routing.isActive !== false);
      setDescription(routing.description || '');
      setOperations(routing.operations || []);
    } else {
      // Reset form
      setName('');
      setProductId('');
      setVersion('1.0');
      setIsActive(true);
      setDescription('');
      setOperations([]);
    }
    // Reset operation form
    setNewOpWorkCenterId('');
    setNewOpSetupTime('');
    setNewOpCycleTime('');
    setNewOpDescription('');
  }, [routing, open]);

  const handleAddOperation = () => {
    if (!newOpWorkCenterId || !newOpCycleTime) {
      alert('Por favor selecciona un centro de trabajo y tiempo de ciclo');
      return;
    }

    const workCenter = workCenters.find((wc) => wc._id === newOpWorkCenterId);
    const nextSequence = operations.length > 0 ? Math.max(...operations.map((op) => op.sequence)) + 10 : 10;

    setOperations([
      ...operations,
      {
        sequence: nextSequence,
        workCenterId: newOpWorkCenterId,
        workCenter: workCenter,
        setupTime: parseFloat(newOpSetupTime) || 0,
        cycleTime: parseFloat(newOpCycleTime),
        description: newOpDescription || undefined,
      },
    ]);

    // Reset operation form
    setNewOpWorkCenterId('');
    setNewOpSetupTime('');
    setNewOpCycleTime('');
    setNewOpDescription('');
  };

  const handleRemoveOperation = (index) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const handleMoveOperation = (index, direction) => {
    const newOperations = [...operations];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newOperations.length) return;

    [newOperations[index], newOperations[targetIndex]] = [newOperations[targetIndex], newOperations[index]];

    // Resequence
    newOperations.forEach((op, i) => {
      op.sequence = (i + 1) * 10;
    });

    setOperations(newOperations);
  };

  const handleSave = () => {
    if (!name || !productId || operations.length === 0) {
      alert('Por favor completa los campos requeridos y agrega al menos una operación');
      return;
    }

    const payload = {
      name,
      productId,
      version,
      isActive,
      description: description || undefined,
      operations: operations.map((op) => ({
        sequence: op.sequence,
        workCenterId: op.workCenterId,
        setupTime: op.setupTime || 0,
        cycleTime: op.cycleTime,
        description: op.description,
      })),
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{routing ? 'Editar Ruta de Producción' : 'Crear Nueva Ruta de Producción'}</DialogTitle>
          <DialogDescription>
            {routing ? 'Modifica la ruta de producción.' : 'Crea una nueva ruta de producción (Routing).'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Routing Header */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Ruta Producción Estándar"
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
            <Label htmlFor="isActive" className="text-right">
              Activa
            </Label>
            <div className="col-span-3">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
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
              placeholder="Descripción de la ruta"
              rows={2}
            />
          </div>

          {/* Operations Section */}
          <div className="border-t pt-4 mt-4">
            <h4 className="font-semibold mb-3">Operaciones *</h4>

            {/* Add Operation Form */}
            <div className="grid grid-cols-6 gap-2 mb-4 items-end">
              <div className="col-span-2">
                <Label htmlFor="newOpWorkCenterId" className="text-xs">
                  Centro de Trabajo
                </Label>
                <Select value={newOpWorkCenterId} onValueChange={setNewOpWorkCenterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {workCenters
                      .filter((wc) => wc.isActive)
                      .map((workCenter) => (
                        <SelectItem key={workCenter._id} value={workCenter._id}>
                          {workCenter.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="newOpSetupTime" className="text-xs">
                  Setup (min)
                </Label>
                <Input
                  id="newOpSetupTime"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newOpSetupTime}
                  onChange={(e) => setNewOpSetupTime(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="newOpCycleTime" className="text-xs">
                  Ciclo (min)
                </Label>
                <Input
                  id="newOpCycleTime"
                  type="number"
                  min="0"
                  step="0.1"
                  value={newOpCycleTime}
                  onChange={(e) => setNewOpCycleTime(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div>
                <Label htmlFor="newOpDescription" className="text-xs">
                  Descripción
                </Label>
                <Input
                  id="newOpDescription"
                  value={newOpDescription}
                  onChange={(e) => setNewOpDescription(e.target.value)}
                  placeholder="Opcional"
                />
              </div>

              <Button onClick={handleAddOperation} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>

            {/* Operations List */}
            {operations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Secuencia</TableHead>
                    <TableHead>Centro de Trabajo</TableHead>
                    <TableHead>Setup (min)</TableHead>
                    <TableHead>Ciclo (min)</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operations.map((operation, index) => (
                    <TableRow key={index}>
                      <TableCell>{operation.sequence}</TableCell>
                      <TableCell>{operation.workCenter?.name || operation.workCenterId}</TableCell>
                      <TableCell>{operation.setupTime}</TableCell>
                      <TableCell>{operation.cycleTime}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{operation.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveOperation(index, 'up')}
                            disabled={index === 0}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMoveOperation(index, 'down')}
                            disabled={index === operations.length - 1}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveOperation(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay operaciones. Agrega al menos una para continuar.
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
