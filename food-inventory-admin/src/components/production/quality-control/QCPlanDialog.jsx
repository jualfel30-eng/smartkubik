import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export function QCPlanDialog({ plan, open, onClose, onSave, viewMode = false }) {
  const [planCode, setPlanCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (plan) {
      setPlanCode(plan.planCode || '');
      setName(plan.name || '');
      setDescription(plan.description || '');
      setIsActive(plan.isActive !== false);
    } else {
      // Reset form
      setPlanCode('');
      setName('');
      setDescription('');
      setIsActive(true);
    }
  }, [plan, open]);

  const handleSave = () => {
    if (!planCode || !name) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const payload = {
      planCode,
      name,
      description: description || undefined,
      isActive,
      checkpoints: plan?.checkpoints || [],
      inspectionStages: plan?.inspectionStages || ['receiving'],
      applicableProducts: plan?.applicableProducts || [],
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'Detalle del Plan QC' : plan ? 'Editar Plan QC' : 'Crear Nuevo Plan QC'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Visualiza los detalles del plan de control de calidad.' : plan ? 'Modifica los detalles del plan QC.' : 'Crea un nuevo plan de control de calidad.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="planCode" className="text-right">
              Código *
            </Label>
            <Input
              id="planCode"
              value={planCode}
              onChange={(e) => setPlanCode(e.target.value)}
              className="col-span-3"
              placeholder="QCP-001"
              disabled={viewMode}
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
              placeholder="Plan de QC para Cosméticos"
              disabled={viewMode}
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
              placeholder="Descripción del plan..."
              rows={3}
              disabled={viewMode}
            />
          </div>

          {!viewMode && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Estado</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox id="isActive" checked={isActive} onCheckedChange={setIsActive} />
                <label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Activo
                </label>
              </div>
            </div>
          )}

          {plan && plan.checkpoints && plan.checkpoints.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Checkpoints</Label>
              <div className="col-span-3 space-y-2">
                {plan.checkpoints.map((checkpoint, index) => (
                  <div key={index} className="p-2 border rounded text-sm">
                    <div className="font-medium">{checkpoint.name}</div>
                    <div className="text-muted-foreground text-xs">
                      Tipo: {checkpoint.testType} | Severidad: {checkpoint.severity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {viewMode ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!viewMode && (
            <Button onClick={handleSave}>
              {plan ? 'Actualizar' : 'Crear'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
