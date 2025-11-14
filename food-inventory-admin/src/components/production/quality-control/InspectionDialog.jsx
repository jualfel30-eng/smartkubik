import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

export function InspectionDialog({ inspection, open, onClose, onSave, viewMode = false }) {
  const [qcPlanId, setQcPlanId] = useState('');
  const [inspectionType, setInspectionType] = useState('receiving');
  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');

  useEffect(() => {
    if (inspection) {
      setQcPlanId(inspection.qcPlanId || '');
      setInspectionType(inspection.inspectionType || 'receiving');
      setProductId(inspection.productId || '');
      setProductName(inspection.productName || '');
      setLotNumber(inspection.lotNumber || '');
      setQuantity(inspection.quantity?.toString() || '');
      setUnit(inspection.unit || '');
      setGeneralNotes(inspection.generalNotes || '');
    } else {
      // Reset form
      setQcPlanId('');
      setInspectionType('receiving');
      setProductId('');
      setProductName('');
      setLotNumber('');
      setQuantity('');
      setUnit('');
      setGeneralNotes('');
    }
  }, [inspection, open]);

  const handleSave = () => {
    if (!productName || !quantity || !unit) {
      alert('Por favor completa los campos requeridos');
      return;
    }

    // Si es una inspección existente con resultados, significa que estamos registrando resultados
    if (inspection && inspection._id) {
      // TODO: Implementar formulario de registro de resultados por checkpoint
      alert('Funcionalidad de registro de resultados en desarrollo. Requiere formulario específico por checkpoint.');
      return;
    }

    const payload = {
      qcPlanId: qcPlanId || undefined,
      inspectionType,
      productId: productId || undefined,
      productName,
      lotNumber: lotNumber || undefined,
      quantity: parseFloat(quantity),
      unit,
      inspector: 'CURRENT_USER_ID', // TODO: Obtener del contexto de usuario
      inspectorName: 'Usuario Actual', // TODO: Obtener del contexto de usuario
      inspectionDate: new Date(),
      generalNotes: generalNotes || undefined,
    };

    onSave(payload);
  };

  const getResultBadge = (overallResult) => {
    if (overallResult === undefined || overallResult === null) {
      return <Badge variant="outline">Sin Resultado</Badge>;
    }
    return overallResult ? (
      <Badge className="bg-green-500">Aprobado</Badge>
    ) : (
      <Badge className="bg-red-500">Rechazado</Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>
            {viewMode ? 'Detalle de Inspección' : inspection ? 'Registrar Resultados' : 'Nueva Inspección'}
          </DialogTitle>
          <DialogDescription>
            {viewMode ? 'Visualiza los detalles de la inspección.' : inspection ? 'Registra los resultados de la inspección.' : 'Crea una nueva inspección de calidad.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
          {inspection && viewMode && (
            <>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Número</Label>
                <div className="col-span-3 font-medium">{inspection.inspectionNumber}</div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Resultado</Label>
                <div className="col-span-3">{getResultBadge(inspection.overallResult)}</div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Checkpoints</Label>
                <div className="col-span-3">
                  {inspection.passedCheckpoints !== undefined && (
                    <span className="text-sm">
                      {inspection.passedCheckpoints}/{inspection.totalCheckpoints} aprobados
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="inspectionType" className="text-right">
              Tipo *
            </Label>
            <div className="col-span-3">
              <Select value={inspectionType} onValueChange={setInspectionType} disabled={viewMode || !!inspection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receiving">Recepción</SelectItem>
                  <SelectItem value="in_process">En Proceso</SelectItem>
                  <SelectItem value="final_inspection">Inspección Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="productName" className="text-right">
              Producto *
            </Label>
            <Input
              id="productName"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="col-span-3"
              placeholder="Nombre del producto"
              disabled={viewMode || !!inspection}
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
              disabled={viewMode || !!inspection}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="quantity" className="text-right">
              Cantidad *
            </Label>
            <div className="col-span-3 flex gap-2">
              <Input
                id="quantity"
                type="number"
                min="0"
                step="0.001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="flex-1"
                placeholder="100"
                disabled={viewMode || !!inspection}
              />
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-32"
                placeholder="kg"
                disabled={viewMode || !!inspection}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="generalNotes" className="text-right">
              Notas
            </Label>
            <Textarea
              id="generalNotes"
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
              className="col-span-3"
              placeholder="Observaciones generales..."
              rows={3}
              disabled={viewMode}
            />
          </div>

          {inspection && inspection.results && inspection.results.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Resultados</Label>
              <div className="col-span-3 space-y-2">
                {inspection.results.map((result, index) => (
                  <div key={index} className="p-3 border rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{result.checkpointName}</span>
                      {result.passed ? (
                        <Badge className="bg-green-500">Aprobado</Badge>
                      ) : (
                        <Badge className="bg-red-500">Rechazado</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {result.measuredValue && <div>Valor medido: {result.measuredValue}</div>}
                      {result.notes && <div>Notas: {result.notes}</div>}
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
              {inspection ? 'Registrar Resultados' : 'Crear'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
