import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function NonConformanceDialog({ nonConformance, open, onClose, onSave, viewMode = false }) {
  const [type, setType] = useState('quality_defect');
  const [severity, setSeverity] = useState('major');
  const [description, setDescription] = useState('');
  const [productName, setProductName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [affectedQuantity, setAffectedQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [correctiveAction, setCorrectiveAction] = useState('');
  const [preventiveAction, setPreventiveAction] = useState('');
  const [status, setStatus] = useState('open');

  useEffect(() => {
    if (nonConformance) {
      setType(nonConformance.type || 'quality_defect');
      setSeverity(nonConformance.severity || 'major');
      setDescription(nonConformance.description || '');
      setProductName(nonConformance.productName || '');
      setLotNumber(nonConformance.lotNumber || '');
      setAffectedQuantity(nonConformance.affectedQuantity?.toString() || '');
      setUnit(nonConformance.unit || '');
      setRootCause(nonConformance.rootCause || '');
      setCorrectiveAction(nonConformance.correctiveAction || '');
      setPreventiveAction(nonConformance.preventiveAction || '');
      setStatus(nonConformance.status || 'open');
    } else {
      // Reset form
      setType('quality_defect');
      setSeverity('major');
      setDescription('');
      setProductName('');
      setLotNumber('');
      setAffectedQuantity('');
      setUnit('');
      setRootCause('');
      setCorrectiveAction('');
      setPreventiveAction('');
      setStatus('open');
    }
  }, [nonConformance, open]);

  const handleSave = () => {
    if (!type || !severity || !description) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    const payload = {
      type,
      severity,
      description,
      productName: productName || undefined,
      lotNumber: lotNumber || undefined,
      affectedQuantity: affectedQuantity ? parseFloat(affectedQuantity) : undefined,
      unit: unit || undefined,
      rootCause: rootCause || undefined,
      correctiveAction: correctiveAction || undefined,
      preventiveAction: preventiveAction || undefined,
      status: nonConformance ? status : 'open',
    };

    onSave(payload);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { label: 'Abierta', className: 'bg-red-500' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-500' },
      verification: { label: 'Verificación', className: 'bg-yellow-500' },
      closed: { label: 'Cerrada', className: 'bg-green-500' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-500' }
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'Detalle de No Conformidad' : nonConformance ? 'Actualizar No Conformidad' : 'Nueva No Conformidad'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Visualiza los detalles de la no conformidad.' : nonConformance ? 'Actualiza el estado y acciones de la NC.' : 'Registra una nueva no conformidad.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {nonConformance && viewMode && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Número NC</Label>
                <div className="col-span-3 font-medium">{nonConformance.ncNumber}</div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Estado</Label>
                <div className="col-span-3">{getStatusBadge(nonConformance.status)}</div>
              </div>
            </>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right">
              Tipo *
            </Label>
            <div className="col-span-3">
              <Select value={type} onValueChange={setType} disabled={viewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quality_defect">Defecto de Calidad</SelectItem>
                  <SelectItem value="process_deviation">Desviación de Proceso</SelectItem>
                  <SelectItem value="documentation">Documentación</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="severity" className="text-right">
              Severidad *
            </Label>
            <div className="col-span-3">
              <Select value={severity} onValueChange={setSeverity} disabled={viewMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Menor</SelectItem>
                  <SelectItem value="major">Mayor</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Descripción *
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="col-span-3"
              placeholder="Describe el problema de calidad detectado..."
              rows={3}
              disabled={viewMode}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productName" className="text-right">
              Producto
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="col-span-3"
              placeholder="Nombre del producto afectado"
              disabled={viewMode}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lotNumber" className="text-right">
              Lote
            </Label>
            <Input
              id="lotNumber"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="col-span-3"
              placeholder="LOT-2024-001"
              disabled={viewMode}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="affectedQuantity" className="text-right">
              Cantidad Afectada
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="affectedQuantity"
                type="number"
                min="0"
                step="0.001"
                value={affectedQuantity}
                onChange={(e) => setAffectedQuantity(e.target.value)}
                className="flex-1"
                placeholder="100"
                disabled={viewMode}
              />
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-32"
                placeholder="kg"
                disabled={viewMode}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="rootCause" className="text-right">
              Causa Raíz
            </Label>
            <Textarea
              id="rootCause"
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              className="col-span-3"
              placeholder="Análisis de la causa raíz del problema..."
              rows={2}
              disabled={viewMode}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="correctiveAction" className="text-right">
              Acción Correctiva
            </Label>
            <Textarea
              id="correctiveAction"
              value={correctiveAction}
              onChange={(e) => setCorrectiveAction(e.target.value)}
              className="col-span-3"
              placeholder="Acciones para corregir el problema..."
              rows={2}
              disabled={viewMode}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="preventiveAction" className="text-right">
              Acción Preventiva
            </Label>
            <Textarea
              id="preventiveAction"
              value={preventiveAction}
              onChange={(e) => setPreventiveAction(e.target.value)}
              className="col-span-3"
              placeholder="Acciones para prevenir recurrencia..."
              rows={2}
              disabled={viewMode}
            />
          </div>

          {nonConformance && !viewMode && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Estado
              </Label>
              <div className="col-span-3">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Abierta</SelectItem>
                    <SelectItem value="in_progress">En Progreso</SelectItem>
                    <SelectItem value="verification">Verificación</SelectItem>
                    <SelectItem value="closed">Cerrada</SelectItem>
                    <SelectItem value="cancelled">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
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
              {nonConformance ? 'Actualizar' : 'Crear'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
