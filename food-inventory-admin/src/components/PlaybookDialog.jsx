import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import {
  Plus,
  Trash2,
  GripVertical,
  ChevronLeft,
  ChevronRight,
  Save,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

const TRIGGER_TYPES = [
  { value: 'stage_entry', label: 'Cambio de Etapa' },
  { value: 'source', label: 'Fuente de Lead' },
  { value: 'manual', label: 'Manual' },
];

const STEP_TYPES = [
  { value: 'task', label: 'Tarea', icon: '✓' },
  { value: 'email', label: 'Email', icon: '✉' },
  { value: 'whatsapp', label: 'WhatsApp', icon: '💬' },
  { value: 'notification', label: 'Notificación', icon: '🔔' },
  { value: 'wait', label: 'Esperar', icon: '⏱' },
];

const PIPELINE_STAGES = {
  ventas: ['Prospecto', 'Calificación', 'Propuesta', 'Negociación', 'Cierre ganado', 'Cierre perdido'],
  postventa: ['Onboarding', 'Uso activo', 'Renovación', 'Upsell', 'Churn'],
};

const LEAD_SOURCES = [
  'whatsapp',
  'email',
  'phone',
  'web',
  'referral',
  'event',
  'social',
  'other',
];

export function PlaybookDialog({ open, onOpenChange, playbook, onSave }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    triggerType: 'stage_entry',
    triggerStage: '',
    triggerSource: '',
    pipeline: 'ventas',
    steps: [],
    active: true,
  });

  useEffect(() => {
    if (playbook) {
      setFormData({
        name: playbook.name || '',
        description: playbook.description || '',
        triggerType: playbook.triggerType || 'stage_entry',
        triggerStage: playbook.triggerStage || '',
        triggerSource: playbook.triggerSource || '',
        pipeline: playbook.pipeline || 'ventas',
        steps: playbook.steps || [],
        active: playbook.active !== undefined ? playbook.active : true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        triggerType: 'stage_entry',
        triggerStage: '',
        triggerSource: '',
        pipeline: 'ventas',
        steps: [],
        active: true,
      });
    }
    setCurrentStep(1);
  }, [playbook, open]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddStep = () => {
    const newStep = {
      name: '',
      type: 'task',
      order: formData.steps.length + 1,
      delayMinutes: 0,
      active: true,
    };
    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep],
    }));
  };

  const handleUpdateStep = (index, field, value) => {
    const updatedSteps = [...formData.steps];
    updatedSteps[index] = { ...updatedSteps[index], [field]: value };
    setFormData((prev) => ({ ...prev, steps: updatedSteps }));
  };

  const handleDeleteStep = (index) => {
    const updatedSteps = formData.steps.filter((_, i) => i !== index);
    // Reorder
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setFormData((prev) => ({ ...prev, steps: updatedSteps }));
  };

  const handleMoveStep = (index, direction) => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === formData.steps.length - 1)
    ) {
      return;
    }

    const updatedSteps = [...formData.steps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [updatedSteps[index], updatedSteps[targetIndex]] = [
      updatedSteps[targetIndex],
      updatedSteps[index],
    ];

    // Reorder
    updatedSteps.forEach((step, i) => {
      step.order = i + 1;
    });

    setFormData((prev) => ({ ...prev, steps: updatedSteps }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    onSave(formData);
  };

  const isStepValid = () => {
    if (currentStep === 1) {
      return formData.name.trim() !== '' && formData.triggerType !== '';
    }
    if (currentStep === 2) {
      if (formData.triggerType === 'stage_entry') {
        return formData.triggerStage !== '' && formData.pipeline !== '';
      }
      if (formData.triggerType === 'source') {
        return formData.triggerSource !== '';
      }
      return true; // manual
    }
    if (currentStep === 3) {
      return formData.steps.length > 0;
    }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {playbook ? 'Editar Playbook' : 'Crear Playbook'}
          </DialogTitle>
          <DialogDescription>
            Paso {currentStep} de 3:{' '}
            {currentStep === 1 && 'Información básica'}
            {currentStep === 2 && 'Configurar trigger'}
            {currentStep === 3 && 'Agregar pasos'}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Playbook *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Ej: Bienvenida WhatsApp"
              />
            </div>
            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describe el propósito de este playbook"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="triggerType">Tipo de Trigger *</Label>
              <Select
                value={formData.triggerType}
                onValueChange={(value) => handleChange('triggerType', value)}
              >
                <SelectTrigger id="triggerType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGER_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Activar al crear</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => handleChange('active', checked)}
              />
            </div>
          </div>
        )}

        {/* Step 2: Configure Trigger */}
        {currentStep === 2 && (
          <div className="space-y-4">
            {formData.triggerType === 'stage_entry' && (
              <>
                <div>
                  <Label htmlFor="pipeline">Pipeline *</Label>
                  <Select
                    value={formData.pipeline}
                    onValueChange={(value) => handleChange('pipeline', value)}
                  >
                    <SelectTrigger id="pipeline">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ventas">Ventas</SelectItem>
                      <SelectItem value="postventa">Postventa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="triggerStage">Etapa que activa el playbook *</Label>
                  <Select
                    value={formData.triggerStage}
                    onValueChange={(value) => handleChange('triggerStage', value)}
                  >
                    <SelectTrigger id="triggerStage">
                      <SelectValue placeholder="Selecciona una etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES[formData.pipeline].map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {formData.triggerType === 'source' && (
              <div>
                <Label htmlFor="triggerSource">Fuente que activa el playbook *</Label>
                <Select
                  value={formData.triggerSource}
                  onValueChange={(value) => handleChange('triggerSource', value)}
                >
                  <SelectTrigger id="triggerSource">
                    <SelectValue placeholder="Selecciona una fuente" />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {source.charAt(0).toUpperCase() + source.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.triggerType === 'manual' && (
              <div className="text-center py-8 text-muted-foreground">
                <p>
                  Los playbooks manuales se ejecutan solo cuando los invocas explícitamente
                  desde una oportunidad.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Add Steps */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {formData.steps.length} paso(s) configurado(s)
              </p>
              <Button onClick={handleAddStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Agregar Paso
              </Button>
            </div>

            {formData.steps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No hay pasos configurados</p>
                <p className="text-sm mt-2">
                  Haz clic en "Agregar Paso" para crear tu primer paso
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {formData.steps.map((step, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <Badge variant="outline">Paso {index + 1}</Badge>
                          <Badge variant="secondary">
                            {STEP_TYPES.find((t) => t.value === step.type)?.label || step.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveStep(index, 'up')}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveStep(index, 'down')}
                            disabled={index === formData.steps.length - 1}
                          >
                            ↓
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteStep(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nombre del paso</Label>
                          <Input
                            value={step.name || ''}
                            onChange={(e) =>
                              handleUpdateStep(index, 'name', e.target.value)
                            }
                            placeholder="Ej: Enviar email de bienvenida"
                          />
                        </div>
                        <div>
                          <Label>Tipo de paso</Label>
                          <Select
                            value={step.type}
                            onValueChange={(value) =>
                              handleUpdateStep(index, 'type', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STEP_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.icon} {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label>
                          Delay (minutos después del paso anterior)
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          value={step.delayMinutes || 0}
                          onChange={(e) =>
                            handleUpdateStep(
                              index,
                              'delayMinutes',
                              parseInt(e.target.value) || 0,
                            )
                          }
                        />
                      </div>

                      {/* Task-specific fields */}
                      {step.type === 'task' && (
                        <>
                          <div>
                            <Label>Título de la tarea</Label>
                            <Input
                              value={step.taskTitle || ''}
                              onChange={(e) =>
                                handleUpdateStep(index, 'taskTitle', e.target.value)
                              }
                              placeholder="Ej: Llamar al prospecto"
                            />
                          </div>
                          <div>
                            <Label>Descripción</Label>
                            <Textarea
                              value={step.taskDescription || ''}
                              onChange={(e) =>
                                handleUpdateStep(
                                  index,
                                  'taskDescription',
                                  e.target.value,
                                )
                              }
                              rows={2}
                            />
                          </div>
                          <div>
                            <Label>Vencimiento (días desde creación)</Label>
                            <Input
                              type="number"
                              min="1"
                              value={step.taskDueDays || 1}
                              onChange={(e) =>
                                handleUpdateStep(
                                  index,
                                  'taskDueDays',
                                  parseInt(e.target.value) || 1,
                                )
                              }
                            />
                          </div>
                        </>
                      )}

                      {/* Email-specific fields */}
                      {step.type === 'email' && (
                        <>
                          <div>
                            <Label>Asunto del email</Label>
                            <Input
                              value={step.emailSubject || ''}
                              onChange={(e) =>
                                handleUpdateStep(index, 'emailSubject', e.target.value)
                              }
                              placeholder="Ej: Bienvenido a nuestro servicio"
                            />
                          </div>
                          <div>
                            <Label>Cuerpo del email</Label>
                            <Textarea
                              value={step.emailBody || ''}
                              onChange={(e) =>
                                handleUpdateStep(index, 'emailBody', e.target.value)
                              }
                              rows={3}
                            />
                          </div>
                        </>
                      )}

                      {/* WhatsApp-specific fields */}
                      {step.type === 'whatsapp' && (
                        <div>
                          <Label>Mensaje de WhatsApp</Label>
                          <Textarea
                            value={step.whatsappMessage || ''}
                            onChange={(e) =>
                              handleUpdateStep(
                                index,
                                'whatsappMessage',
                                e.target.value,
                              )
                            }
                            rows={3}
                          />
                        </div>
                      )}

                      {/* Notification-specific fields */}
                      {step.type === 'notification' && (
                        <>
                          <div>
                            <Label>Título de la notificación</Label>
                            <Input
                              value={step.notificationTitle || ''}
                              onChange={(e) =>
                                handleUpdateStep(
                                  index,
                                  'notificationTitle',
                                  e.target.value,
                                )
                              }
                              placeholder="Ej: Nuevo lead asignado"
                            />
                          </div>
                          <div>
                            <Label>Mensaje</Label>
                            <Textarea
                              value={step.notificationMessage || ''}
                              onChange={(e) =>
                                handleUpdateStep(
                                  index,
                                  'notificationMessage',
                                  e.target.value,
                                )
                              }
                              rows={2}
                            />
                          </div>
                        </>
                      )}

                      {/* Wait-specific fields */}
                      {step.type === 'wait' && (
                        <div className="text-sm text-muted-foreground">
                          Este paso simplemente introduce un delay antes del siguiente paso.
                          Configura el delay arriba.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="flex gap-2">
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Atrás
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {currentStep < 3 && (
              <Button onClick={handleNext} disabled={!isStepValid()}>
                Siguiente
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            {currentStep === 3 && (
              <Button onClick={handleSave} disabled={!isStepValid()}>
                <Save className="w-4 h-4 mr-2" />
                {playbook ? 'Guardar Cambios' : 'Crear Playbook'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
