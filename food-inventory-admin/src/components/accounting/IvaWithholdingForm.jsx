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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Combobox } from '@/components/ui/combobox';
import { Info } from 'lucide-react';
import { toast } from 'sonner';
import { createIvaWithholding, updateIvaWithholding } from '../../lib/api';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';

const IvaWithholdingForm = ({ open, onClose, onSuccess, editingWithholding, suppliers }) => {
  const plugin = useCountryPlugin();
  const taxRate = (plugin.taxEngine.getDefaultTaxes()[0]?.rate ?? 16) / 100;

  const [formData, setFormData] = useState({
    withholdingDate: new Date().toISOString().split('T')[0],
    supplierId: '',
    supplierRif: '',
    supplierName: '',
    supplierAddress: '',
    invoiceNumber: '',
    invoiceControlNumber: '',
    invoiceDate: '',
    baseAmount: 0,
    ivaAmount: 0,
    withholdingPercentage: 75,
    operationType: 'compra_bienes',
    observations: '',
  });

  const [calculatedWithholding, setCalculatedWithholding] = useState(0);

  useEffect(() => {
    if (editingWithholding) {
      setFormData({
        withholdingDate: editingWithholding.withholdingDate.split('T')[0],
        supplierId: editingWithholding.supplierId?._id || '',
        supplierRif: editingWithholding.supplierRif,
        supplierName: editingWithholding.supplierName,
        supplierAddress: editingWithholding.supplierAddress || '',
        invoiceNumber: editingWithholding.invoiceNumber,
        invoiceControlNumber: editingWithholding.invoiceControlNumber,
        invoiceDate: editingWithholding.invoiceDate?.split('T')[0] || '',
        baseAmount: editingWithholding.baseAmount,
        ivaAmount: editingWithholding.ivaAmount,
        withholdingPercentage: editingWithholding.withholdingPercentage,
        operationType: editingWithholding.operationType,
        observations: editingWithholding.observations || '',
      });
    }
  }, [editingWithholding]);

  useEffect(() => {
    // Calcular retención automáticamente
    const withholding = (formData.ivaAmount * formData.withholdingPercentage) / 100;
    setCalculatedWithholding(withholding);
  }, [formData.ivaAmount, formData.withholdingPercentage]);

  useEffect(() => {
    // Auto-calcular IVA desde base imponible
    if (formData.baseAmount > 0) {
      const iva = formData.baseAmount * taxRate;
      setFormData((prev) => ({ ...prev, ivaAmount: iva }));
    }
  }, [formData.baseAmount, taxRate]);

  const handleChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers?.find((s) => s._id === supplierId);
    if (supplier) {
      setFormData({
        ...formData,
        supplierId: supplier._id,
        supplierRif: supplier.taxId || '',
        supplierName: supplier.name,
        supplierAddress: supplier.address || '',
      });
    } else {
      setFormData({
        ...formData,
        supplierId: '',
        supplierRif: '',
        supplierName: '',
        supplierAddress: '',
      });
    }
  };

  const handleSubmit = async () => {
    try {
      // Validaciones
      if (!formData.supplierRif || !formData.supplierName) {
        toast.error('Debe seleccionar un proveedor');
        return;
      }

      if (!formData.invoiceNumber || !formData.invoiceControlNumber) {
        toast.error('Complete los datos de la factura');
        return;
      }

      if (formData.baseAmount <= 0 || formData.ivaAmount <= 0) {
        toast.error('Los montos deben ser mayores a 0');
        return;
      }

      if (editingWithholding) {
        await updateIvaWithholding(editingWithholding._id, formData);
        toast.success('Retención actualizada exitosamente');
      } else {
        await createIvaWithholding(formData);
        toast.success('Retención creada exitosamente');
      }

      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar retención');
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
            {editingWithholding ? 'Editar Retención IVA' : 'Nueva Retención IVA'}
          </DialogTitle>
          <DialogDescription>
            Complete los datos de la retención de Impuesto al Valor Agregado
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Fecha y Porcentaje */}
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
              <Label htmlFor="withholdingPercentage">% Retención</Label>
              <Select
                value={formData.withholdingPercentage.toString()}
                onValueChange={(value) => handleChange('withholdingPercentage', parseInt(value))}
              >
                <SelectTrigger id="withholdingPercentage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="75">75% (Personas Naturales)</SelectItem>
                  <SelectItem value="100">100% (Contribuyentes Especiales)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Proveedor */}
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

          {/* Datos del Proveedor */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="supplierRif">RIF Proveedor</Label>
              <Input
                id="supplierRif"
                value={formData.supplierRif}
                onChange={(e) => handleChange('supplierRif', e.target.value)}
                placeholder="J-12345678-9"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="supplierName">Nombre Proveedor</Label>
              <Input
                id="supplierName"
                value={formData.supplierName}
                onChange={(e) => handleChange('supplierName', e.target.value)}
              />
            </div>
          </div>

          {/* Datos de Factura */}
          <div className="grid grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="invoiceNumber">Número de Factura *</Label>
              <Input
                id="invoiceNumber"
                value={formData.invoiceNumber}
                onChange={(e) => handleChange('invoiceNumber', e.target.value)}
                placeholder="FAC-0001"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceControlNumber">Nro. Control Factura *</Label>
              <Input
                id="invoiceControlNumber"
                value={formData.invoiceControlNumber}
                onChange={(e) => handleChange('invoiceControlNumber', e.target.value)}
                placeholder="001-002-00001234"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="invoiceDate">Fecha Factura</Label>
              <Input
                id="invoiceDate"
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleChange('invoiceDate', e.target.value)}
              />
            </div>
          </div>

          {/* Montos */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="baseAmount">Base Imponible (Bs.)</Label>
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
              <Label htmlFor="ivaAmount">IVA (Bs.)</Label>
              <Input
                id="ivaAmount"
                type="number"
                min={0}
                step={0.01}
                value={formData.ivaAmount}
                onChange={(e) => handleChange('ivaAmount', parseFloat(e.target.value) || 0)}
              />
              <p className="text-sm text-muted-foreground">
                Calculado automáticamente (16% de la base)
              </p>
            </div>
          </div>

          {/* Tipo de Operación */}
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
                <SelectItem value="compra_bienes">Compra de Bienes</SelectItem>
                <SelectItem value="compra_servicios">Compra de Servicios</SelectItem>
                <SelectItem value="importacion">Importación</SelectItem>
                <SelectItem value="arrendamiento">Arrendamiento</SelectItem>
                <SelectItem value="honorarios_profesionales">
                  Honorarios Profesionales
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Observaciones */}
          <div className="grid gap-2">
            <Label htmlFor="observations">Observaciones</Label>
            <Textarea
              id="observations"
              value={formData.observations}
              onChange={(e) => handleChange('observations', e.target.value)}
              rows={2}
            />
          </div>

          {/* Resumen de Cálculo */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold">
                Monto a Retener: Bs. {calculatedWithholding.toFixed(2)}
              </div>
              <div className="text-sm mt-1">
                {formData.withholdingPercentage}% de Bs. {formData.ivaAmount.toFixed(2)}
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

export default IvaWithholdingForm;
