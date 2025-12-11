import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { createIslrWithholding, updateIslrWithholding } from '../../lib/api';

const IslrWithholdingForm = ({ open, onClose, onSuccess, editingWithholding, suppliers }) => {
  const [formData, setFormData] = useState({
    withholdingDate: new Date().toISOString().split('T')[0],
    beneficiaryType: 'supplier',
    supplierId: '',
    employeeId: '',
    beneficiaryRif: '',
    beneficiaryName: '',
    beneficiaryAddress: '',
    documentNumber: '',
    documentDate: new Date().toISOString().split('T')[0],
    baseAmount: 0,
    withholdingPercentage: 3,
    operationType: 'honorarios_profesionales',
    conceptCode: '001',
    conceptDescription: '',
    notes: '',
  });

  const [calculatedWithholding, setCalculatedWithholding] = useState(0);

  // Tabla de porcentajes sugeridos por tipo de operación
  const suggestedPercentages = {
    salarios: 3,
    honorarios_profesionales: 3,
    comisiones: 5,
    intereses: 4.95,
    dividendos: 34,
    arrendamiento: 3,
    regalias: 7,
    servicio_transporte: 2,
    otros_servicios: 3,
  };

  useEffect(() => {
    if (editingWithholding) {
      setFormData({
        withholdingDate: editingWithholding.withholdingDate.split('T')[0],
        beneficiaryType: editingWithholding.beneficiaryType,
        supplierId: editingWithholding.supplierId?._id || '',
        employeeId: editingWithholding.employeeId?._id || '',
        beneficiaryRif: editingWithholding.beneficiaryRif,
        beneficiaryName: editingWithholding.beneficiaryName,
        beneficiaryAddress: editingWithholding.beneficiaryAddress || '',
        documentNumber: editingWithholding.documentNumber,
        documentDate: editingWithholding.documentDate?.split('T')[0] || '',
        baseAmount: editingWithholding.baseAmount,
        withholdingPercentage: editingWithholding.withholdingPercentage,
        operationType: editingWithholding.operationType,
        conceptCode: editingWithholding.conceptCode,
        conceptDescription: editingWithholding.conceptDescription || '',
        notes: editingWithholding.notes || '',
      });
    }
  }, [editingWithholding]);

  useEffect(() => {
    // Calcular retención automáticamente
    const withholding = (formData.baseAmount * formData.withholdingPercentage) / 100;
    setCalculatedWithholding(withholding);
  }, [formData.baseAmount, formData.withholdingPercentage]);

  useEffect(() => {
    // Auto-seleccionar porcentaje sugerido al cambiar tipo de operación
    if (!editingWithholding) {
      const suggested = suggestedPercentages[formData.operationType];
      if (suggested) {
        setFormData((prev) => ({ ...prev, withholdingPercentage: suggested }));
      }
    }
  }, [formData.operationType, editingWithholding]);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers?.find((s) => s._id === supplierId);
    if (supplier) {
      setFormData({
        ...formData,
        supplierId: supplier._id,
        beneficiaryRif: supplier.taxId || '',
        beneficiaryName: supplier.name,
        beneficiaryAddress: supplier.address || '',
      });
    } else {
      setFormData({
        ...formData,
        supplierId: '',
        beneficiaryRif: '',
        beneficiaryName: '',
        beneficiaryAddress: '',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Validaciones
      if (!formData.beneficiaryRif || !formData.beneficiaryName) {
        toast.error('Debe completar los datos del beneficiario');
        return;
      }

      if (formData.beneficiaryType === 'supplier' && !formData.supplierId) {
        toast.error('Debe seleccionar un proveedor');
        return;
      }

      if (!formData.documentNumber) {
        toast.error('Debe especificar el número de documento');
        return;
      }

      if (formData.baseAmount <= 0) {
        toast.error('La base imponible debe ser mayor a 0');
        return;
      }

      if (formData.withholdingPercentage < 0 || formData.withholdingPercentage > 34) {
        toast.error('El porcentaje debe estar entre 0% y 34%');
        return;
      }

      if (editingWithholding) {
        await updateIslrWithholding(editingWithholding._id, formData);
        toast.success('Retención ISLR actualizada exitosamente');
      } else {
        await createIslrWithholding(formData);
        toast.success('Retención ISLR creada exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar retención ISLR');
    }
  };

  const supplierOptions = (suppliers || []).map((s) => ({
    value: s._id,
    label: `${s.name} (${s.taxId})`,
  }));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingWithholding ? 'Editar Retención ISLR' : 'Nueva Retención ISLR'}
          </DialogTitle>
          <DialogDescription>
            Complete los datos de la retención de Impuesto Sobre la Renta
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Fecha y Tipo de Operación */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="withholdingDate">Fecha de Retención</Label>
              <Input
                id="withholdingDate"
                type="date"
                value={formData.withholdingDate}
                onChange={(e) => handleChange('withholdingDate', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="operationType">Tipo de Operación</Label>
              <Select
                value={formData.operationType}
                onValueChange={(value) => handleChange('operationType', value)}
              >
                <SelectTrigger id="operationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="salarios">Salarios</SelectItem>
                  <SelectItem value="honorarios_profesionales">Honorarios Profesionales</SelectItem>
                  <SelectItem value="comisiones">Comisiones</SelectItem>
                  <SelectItem value="intereses">Intereses</SelectItem>
                  <SelectItem value="dividendos">Dividendos</SelectItem>
                  <SelectItem value="arrendamiento">Arrendamiento</SelectItem>
                  <SelectItem value="regalias">Regalías</SelectItem>
                  <SelectItem value="servicio_transporte">Servicio de Transporte</SelectItem>
                  <SelectItem value="otros_servicios">Otros Servicios</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tipo de Beneficiario */}
          <div className="grid gap-2">
            <Label>Tipo de Beneficiario *</Label>
            <RadioGroup
              value={formData.beneficiaryType}
              onValueChange={(value) => handleChange('beneficiaryType', value)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="supplier" id="supplier" />
                <Label htmlFor="supplier" className="font-normal cursor-pointer">
                  Proveedor
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="employee" id="employee" />
                <Label htmlFor="employee" className="font-normal cursor-pointer">
                  Empleado
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Selección de Proveedor */}
          {formData.beneficiaryType === 'supplier' && (
            <div className="grid gap-2">
              <Label>Proveedor *</Label>
              <Combobox
                options={supplierOptions}
                value={formData.supplierId}
                onChange={handleSupplierChange}
                placeholder="Seleccionar proveedor..."
                searchPlaceholder="Buscar proveedor..."
                emptyPlaceholder="No se encontraron proveedores"
              />
            </div>
          )}

          {/* Datos del Beneficiario */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="beneficiaryRif">RIF Beneficiario *</Label>
              <Input
                id="beneficiaryRif"
                value={formData.beneficiaryRif}
                onChange={(e) => handleChange('beneficiaryRif', e.target.value)}
                placeholder="J-12345678-9"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="beneficiaryName">Nombre Beneficiario *</Label>
              <Input
                id="beneficiaryName"
                value={formData.beneficiaryName}
                onChange={(e) => handleChange('beneficiaryName', e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="beneficiaryAddress">Dirección Fiscal (Opcional)</Label>
            <Input
              id="beneficiaryAddress"
              value={formData.beneficiaryAddress}
              onChange={(e) => handleChange('beneficiaryAddress', e.target.value)}
            />
          </div>

          {/* Documento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="documentNumber">Número de Documento *</Label>
              <Input
                id="documentNumber"
                value={formData.documentNumber}
                onChange={(e) => handleChange('documentNumber', e.target.value)}
                placeholder="FAC-0001 o REC-0001"
              />
              <p className="text-sm text-muted-foreground">Número de factura o recibo</p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentDate">Fecha del Documento</Label>
              <Input
                id="documentDate"
                type="date"
                value={formData.documentDate}
                onChange={(e) => handleChange('documentDate', e.target.value)}
              />
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="baseAmount">Base Imponible (Bs.) *</Label>
              <Input
                id="baseAmount"
                type="number"
                min={0}
                step={0.01}
                value={formData.baseAmount}
                onChange={(e) => handleChange('baseAmount', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="withholdingPercentage">% de Retención *</Label>
              <Input
                id="withholdingPercentage"
                type="number"
                min={0}
                max={34}
                step={0.01}
                value={formData.withholdingPercentage}
                onChange={(e) =>
                  handleChange('withholdingPercentage', parseFloat(e.target.value) || 0)
                }
              />
              <p className="text-sm text-muted-foreground">
                Sugerido: {suggestedPercentages[formData.operationType]}%
              </p>
            </div>
          </div>

          {/* Código de Concepto */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="conceptCode">Código de Concepto *</Label>
              <Input
                id="conceptCode"
                value={formData.conceptCode}
                onChange={(e) => handleChange('conceptCode', e.target.value)}
                placeholder="001"
              />
              <p className="text-sm text-muted-foreground">Según tabla SENIAT</p>
            </div>

            <div className="grid gap-2 col-span-2">
              <Label htmlFor="conceptDescription">Descripción del Concepto (Opcional)</Label>
              <Input
                id="conceptDescription"
                value={formData.conceptDescription}
                onChange={(e) => handleChange('conceptDescription', e.target.value)}
                placeholder="Ej: Honorarios profesionales por consultoría"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Notas / Observaciones</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={2}
            />
          </div>

          {/* Resumen */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">
                Monto a Retener: Bs. {calculatedWithholding.toFixed(2)}
              </div>
              <div className="text-sm mt-1">
                {formData.withholdingPercentage}% de Bs. {formData.baseAmount.toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                Este monto se descontará del pago al beneficiario y se enterará a SENIAT
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit}>
            {editingWithholding ? 'Actualizar' : 'Crear Retención'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IslrWithholdingForm;
