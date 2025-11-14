import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';

export function WorkCenterDialog({ workCenter, open, onClose, onSave }) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('machine');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('unidades/hora');
  const [costPerHour, setCostPerHour] = useState('');
  const [efficiencyPercentage, setEfficiencyPercentage] = useState('100');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (workCenter) {
      setCode(workCenter.code || '');
      setName(workCenter.name || '');
      setType(workCenter.type || 'machine');
      setDescription(workCenter.description || '');
      setCapacity(workCenter.capacity?.toString() || '');
      setCapacityUnit(workCenter.capacityUnit || 'unidades/hora');
      setCostPerHour(workCenter.costPerHour?.toString() || '');
      setEfficiencyPercentage(workCenter.efficiencyPercentage?.toString() || '100');
      setIsActive(workCenter.isActive !== false);
    } else {
      // Reset form
      setCode('');
      setName('');
      setType('machine');
      setDescription('');
      setCapacity('');
      setCapacityUnit('unidades/hora');
      setCostPerHour('');
      setEfficiencyPercentage('100');
      setIsActive(true);
    }
  }, [workCenter, open]);

  const handleSave = () => {
    if (!code || !name || !capacity || !costPerHour) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const payload = {
      code,
      name,
      type,
      description: description || undefined,
      capacity: parseFloat(capacity),
      capacityUnit,
      costPerHour: parseFloat(costPerHour),
      efficiencyPercentage: parseFloat(efficiencyPercentage),
      isActive,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{workCenter ? 'Editar Centro de Trabajo' : 'Crear Nuevo Centro de Trabajo'}</DialogTitle>
          <DialogDescription>
            {workCenter ? 'Modifica los detalles del centro de trabajo.' : 'Crea un nuevo centro de trabajo.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="code" className="text-right">
              Código *
            </Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="col-span-3"
              placeholder="WC-001"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Nombre *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="Centro de Ensamblaje"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Tipo
            </Label>
            <div className="col-span-3">
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="machine">Máquina</SelectItem>
                  <SelectItem value="labor">Mano de Obra</SelectItem>
                  <SelectItem value="assembly">Ensamblaje</SelectItem>
                  <SelectItem value="quality">Control de Calidad</SelectItem>
                  <SelectItem value="packaging">Empaque</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="capacity" className="text-right">
              Capacidad *
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="capacity"
                type="number"
                min="0"
                step="0.001"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="flex-1"
                placeholder="100"
              />
              <Input
                value={capacityUnit}
                onChange={(e) => setCapacityUnit(e.target.value)}
                className="w-40"
                placeholder="unidades/hora"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="costPerHour" className="text-right">
              Costo por Hora *
            </Label>
            <Input
              id="costPerHour"
              type="number"
              min="0"
              step="0.01"
              value={costPerHour}
              onChange={(e) => setCostPerHour(e.target.value)}
              className="col-span-3"
              placeholder="50.00"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="efficiencyPercentage" className="text-right">
              Eficiencia %
            </Label>
            <Input
              id="efficiencyPercentage"
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={efficiencyPercentage}
              onChange={(e) => setEfficiencyPercentage(e.target.value)}
              className="col-span-3"
              placeholder="100"
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
              placeholder="Descripción del centro de trabajo"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isActive" className="text-right">
              Activo
            </Label>
            <div className="col-span-3">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={setIsActive} />
            </div>
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
