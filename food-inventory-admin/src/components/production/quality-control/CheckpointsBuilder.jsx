import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, ArrowUp, ArrowDown, FlaskConical } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

const checkpointTemplate = {
  name: '',
  description: '',
  testType: 'measurement',
  testMethod: '',
  expectedValue: '',
  minimumValue: '',
  maximumValue: '',
  unit: '',
  severity: 'major',
  mandatory: false,
  sequence: 1,
};

export function CheckpointsBuilder({ checkpoints = [], onChange, disabled = false }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(checkpointTemplate);

  const handleAdd = () => {
    setFormData({ ...checkpointTemplate, sequence: checkpoints.length + 1 });
    setEditingIndex(null);
    setDialogOpen(true);
  };

  const handleEdit = (index) => {
    setFormData({ ...checkpoints[index] });
    setEditingIndex(index);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('El nombre es requerido');
      return;
    }

    const newCheckpoints = [...checkpoints];
    if (editingIndex !== null) {
      newCheckpoints[editingIndex] = formData;
    } else {
      newCheckpoints.push(formData);
    }

    onChange(newCheckpoints);
    setDialogOpen(false);
    setFormData(checkpointTemplate);
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    if (window.confirm('¿Eliminar este checkpoint?')) {
      const newCheckpoints = checkpoints.filter((_, i) => i !== index);
      // Reorder sequences
      const reordered = newCheckpoints.map((cp, i) => ({ ...cp, sequence: i + 1 }));
      onChange(reordered);
    }
  };

  const handleMoveUp = (index) => {
    if (index === 0) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index - 1], newCheckpoints[index]] = [newCheckpoints[index], newCheckpoints[index - 1]];
    // Update sequences
    const reordered = newCheckpoints.map((cp, i) => ({ ...cp, sequence: i + 1 }));
    onChange(reordered);
  };

  const handleMoveDown = (index) => {
    if (index === checkpoints.length - 1) return;
    const newCheckpoints = [...checkpoints];
    [newCheckpoints[index], newCheckpoints[index + 1]] = [newCheckpoints[index + 1], newCheckpoints[index]];
    // Update sequences
    const reordered = newCheckpoints.map((cp, i) => ({ ...cp, sequence: i + 1 }));
    onChange(reordered);
  };

  const getTestTypeLabel = (type) => {
    const labels = {
      measurement: 'Medición',
      visual: 'Visual',
      binary: 'Binario (Sí/No)',
      text: 'Texto'
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity) => {
    const config = {
      minor: { label: 'Menor', className: 'bg-yellow-500' },
      major: { label: 'Mayor', className: 'bg-orange-500' },
      critical: { label: 'Crítico', className: 'bg-red-500' }
    };
    const { label, className } = config[severity] || config.major;
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            <CardTitle className="text-base">Checkpoints de Inspección</CardTitle>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={disabled}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {checkpoints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground text-sm">
              No hay checkpoints definidos. Agrega uno para comenzar.
            </div>
          ) : (
            <div className="space-y-2">
              {checkpoints.map((checkpoint, index) => (
                <div key={index} className="flex items-center gap-2 p-3 border rounded-lg hover:bg-accent/50">
                  <div className="flex flex-col gap-1 items-center mr-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0 || disabled}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <span className="text-xs text-muted-foreground font-medium">{checkpoint.sequence}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === checkpoints.length - 1 || disabled}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{checkpoint.name}</span>
                      {checkpoint.mandatory && <Badge variant="outline" className="text-xs">Obligatorio</Badge>}
                      {getSeverityBadge(checkpoint.severity)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-medium">{getTestTypeLabel(checkpoint.testType)}</span>
                      {checkpoint.testMethod && <span> • Método: {checkpoint.testMethod}</span>}
                      {checkpoint.expectedValue && <span> • Esperado: {checkpoint.expectedValue}</span>}
                      {checkpoint.minimumValue && <span> • Min: {checkpoint.minimumValue}</span>}
                      {checkpoint.maximumValue && <span> • Max: {checkpoint.maximumValue}</span>}
                      {checkpoint.unit && <span> {checkpoint.unit}</span>}
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(index)} disabled={disabled}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(index)} disabled={disabled}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? 'Editar Checkpoint' : 'Nuevo Checkpoint'}</DialogTitle>
            <DialogDescription>
              Define los parámetros de inspección para este checkpoint
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-name" className="text-right">
                Nombre *
              </Label>
              <Input
                id="cp-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                placeholder="ej: Nivel de pH"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-description" className="text-right">
                Descripción
              </Label>
              <Textarea
                id="cp-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="col-span-3"
                placeholder="Descripción del checkpoint..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-testType" className="text-right">
                Tipo de Prueba *
              </Label>
              <Select
                value={formData.testType}
                onValueChange={(value) => setFormData({ ...formData, testType: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="measurement">Medición Numérica</SelectItem>
                  <SelectItem value="visual">Inspección Visual</SelectItem>
                  <SelectItem value="binary">Binario (Sí/No)</SelectItem>
                  <SelectItem value="text">Texto Libre</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-testMethod" className="text-right">
                Método de Prueba
              </Label>
              <Input
                id="cp-testMethod"
                value={formData.testMethod}
                onChange={(e) => setFormData({ ...formData, testMethod: e.target.value })}
                className="col-span-3"
                placeholder="ej: ASTM D4052"
              />
            </div>

            {(formData.testType === 'measurement' || formData.testType === 'text') && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="cp-expectedValue" className="text-right">
                    Valor Esperado
                  </Label>
                  <Input
                    id="cp-expectedValue"
                    value={formData.expectedValue}
                    onChange={(e) => setFormData({ ...formData, expectedValue: e.target.value })}
                    className="col-span-3"
                    placeholder="7.5"
                  />
                </div>

                {formData.testType === 'measurement' && (
                  <>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cp-minimumValue" className="text-right">
                        Valor Mínimo
                      </Label>
                      <Input
                        id="cp-minimumValue"
                        type="number"
                        step="0.001"
                        value={formData.minimumValue}
                        onChange={(e) => setFormData({ ...formData, minimumValue: e.target.value })}
                        className="col-span-3"
                        placeholder="7.0"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cp-maximumValue" className="text-right">
                        Valor Máximo
                      </Label>
                      <Input
                        id="cp-maximumValue"
                        type="number"
                        step="0.001"
                        value={formData.maximumValue}
                        onChange={(e) => setFormData({ ...formData, maximumValue: e.target.value })}
                        className="col-span-3"
                        placeholder="8.0"
                      />
                    </div>

                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="cp-unit" className="text-right">
                        Unidad
                      </Label>
                      <Input
                        id="cp-unit"
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="col-span-3"
                        placeholder="pH, °C, mg/L, etc."
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cp-severity" className="text-right">
                Severidad
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Menor</SelectItem>
                  <SelectItem value="major">Mayor</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Obligatorio</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Checkbox
                  id="cp-mandatory"
                  checked={formData.mandatory}
                  onCheckedChange={(checked) => setFormData({ ...formData, mandatory: checked })}
                />
                <label
                  htmlFor="cp-mandatory"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Este checkpoint debe pasar obligatoriamente
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              {editingIndex !== null ? 'Actualizar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
