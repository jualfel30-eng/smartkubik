import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { CheckpointsBuilder } from './CheckpointsBuilder';
import { Badge } from '@/components/ui/badge';

export function QCPlanDialog({ plan, open, onClose, onSave, viewMode = false }) {
  const [planCode, setPlanCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [checkpoints, setCheckpoints] = useState([]);
  const [inspectionStages, setInspectionStages] = useState({ receiving: true, in_process: false, final_inspection: false });

  useEffect(() => {
    if (plan) {
      setPlanCode(plan.planCode || '');
      setName(plan.name || '');
      setDescription(plan.description || '');
      setIsActive(plan.isActive !== false);
      setCheckpoints(plan.checkpoints || []);

      // Convert inspectionStages array to object
      const stages = { receiving: false, in_process: false, final_inspection: false };
      (plan.inspectionStages || []).forEach(stage => {
        stages[stage] = true;
      });
      setInspectionStages(stages);
    } else {
      // Reset form
      setPlanCode('');
      setName('');
      setDescription('');
      setIsActive(true);
      setCheckpoints([]);
      setInspectionStages({ receiving: true, in_process: false, final_inspection: false });
    }
  }, [plan, open]);

  const handleSave = () => {
    if (!planCode || !name) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    if (checkpoints.length === 0) {
      alert('Debes agregar al menos un checkpoint');
      return;
    }

    // Convert inspectionStages object to array
    const selectedStages = Object.keys(inspectionStages).filter(stage => inspectionStages[stage]);
    if (selectedStages.length === 0) {
      alert('Debes seleccionar al menos una etapa de inspección');
      return;
    }

    const payload = {
      planCode,
      name,
      description: description || undefined,
      isActive,
      checkpoints,
      inspectionStages: selectedStages,
      applicableProducts: plan?.applicableProducts || [],
    };

    onSave(payload);
  };

  const handleStageToggle = (stage) => {
    setInspectionStages(prev => ({ ...prev, [stage]: !prev[stage] }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'Detalle del Plan QC' : plan ? 'Editar Plan QC' : 'Crear Nuevo Plan QC'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Visualiza los detalles del plan de control de calidad.' : plan ? 'Modifica los detalles del plan QC.' : 'Crea un nuevo plan de control de calidad.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
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

          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Etapas de Inspección *</Label>
            <div className="col-span-3 space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stage-receiving"
                  checked={inspectionStages.receiving}
                  onCheckedChange={() => handleStageToggle('receiving')}
                  disabled={viewMode}
                />
                <label htmlFor="stage-receiving" className="text-sm font-medium">
                  Recepción de Materias Primas
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stage-in-process"
                  checked={inspectionStages.in_process}
                  onCheckedChange={() => handleStageToggle('in_process')}
                  disabled={viewMode}
                />
                <label htmlFor="stage-in-process" className="text-sm font-medium">
                  En Proceso de Producción
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="stage-final"
                  checked={inspectionStages.final_inspection}
                  onCheckedChange={() => handleStageToggle('final_inspection')}
                  disabled={viewMode}
                />
                <label htmlFor="stage-final" className="text-sm font-medium">
                  Inspección Final de Producto Terminado
                </label>
              </div>
            </div>
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

          <div className="col-span-4">
            {viewMode ? (
              checkpoints.length > 0 && (
                <div className="space-y-2">
                  <Label>Checkpoints ({checkpoints.length})</Label>
                  {checkpoints.map((checkpoint, index) => (
                    <div key={index} className="p-3 border rounded">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">#{checkpoint.sequence}</Badge>
                        <span className="font-medium">{checkpoint.name}</span>
                        {checkpoint.mandatory && <Badge variant="outline">Obligatorio</Badge>}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Tipo: {checkpoint.testType} | Severidad: {checkpoint.severity}
                        {checkpoint.testMethod && ` | Método: ${checkpoint.testMethod}`}
                      </div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <CheckpointsBuilder
                checkpoints={checkpoints}
                onChange={setCheckpoints}
                disabled={viewMode}
              />
            )}
          </div>
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
