import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { Switch } from './ui/switch';

const UNIT_TYPES = [
  { value: 'purchase', label: 'Compra' },
  { value: 'stock', label: 'Almacenamiento' },
  { value: 'consumption', label: 'Consumo' },
];

export const UnitConversionDialog = ({
  isOpen,
  onClose,
  product,
  existingConfig = null,
  onSave
}) => {
  const [baseUnit, setBaseUnit] = useState('');
  const [baseUnitAbbr, setBaseUnitAbbr] = useState('');
  const [conversions, setConversions] = useState([]);
  const [defaultPurchaseUnit, setDefaultPurchaseUnit] = useState('');
  const [defaultStockUnit, setDefaultStockUnit] = useState('');
  const [defaultConsumptionUnit, setDefaultConsumptionUnit] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Cargar datos existentes si es edición
  useEffect(() => {
    if (existingConfig) {
      setBaseUnit(existingConfig.baseUnit || '');
      setBaseUnitAbbr(existingConfig.baseUnitAbbr || '');
      setConversions(existingConfig.conversions || []);
      setDefaultPurchaseUnit(existingConfig.defaultPurchaseUnit || '');
      setDefaultStockUnit(existingConfig.defaultStockUnit || '');
      setDefaultConsumptionUnit(existingConfig.defaultConsumptionUnit || '');
      setIsActive(existingConfig.isActive !== false);
    } else {
      // Resetear formulario
      setBaseUnit('');
      setBaseUnitAbbr('');
      setConversions([]);
      setDefaultPurchaseUnit('');
      setDefaultStockUnit('');
      setDefaultConsumptionUnit('');
      setIsActive(true);
    }
  }, [existingConfig, isOpen]);

  // Agregar nueva regla de conversión
  const addConversion = () => {
    setConversions([
      ...conversions,
      {
        unit: '',
        abbreviation: '',
        factor: 1,
        unitType: 'stock',
        isActive: true,
        isDefault: false,
      },
    ]);
  };

  // Eliminar regla de conversión
  const removeConversion = (index) => {
    setConversions(conversions.filter((_, i) => i !== index));
  };

  // Actualizar regla de conversión
  const updateConversion = (index, field, value) => {
    const updated = [...conversions];
    updated[index] = { ...updated[index], [field]: value };
    setConversions(updated);
  };

  // Validar formulario
  const validateForm = () => {
    if (!baseUnit.trim()) {
      toast.error('La unidad base es requerida');
      return false;
    }

    if (!baseUnitAbbr.trim()) {
      toast.error('La abreviación de la unidad base es requerida');
      return false;
    }

    // Validar conversiones
    for (let i = 0; i < conversions.length; i++) {
      const conv = conversions[i];
      if (!conv.unit.trim()) {
        toast.error(`Conversión ${i + 1}: La unidad es requerida`);
        return false;
      }
      if (!conv.abbreviation.trim()) {
        toast.error(`Conversión ${i + 1}: La abreviación es requerida`);
        return false;
      }
      if (conv.factor <= 0) {
        toast.error(`Conversión ${i + 1}: El factor debe ser mayor a 0`);
        return false;
      }
    }

    return true;
  };

  const resolveProductId = () => {
    if (!product) return null;
    const rawId = product._id || product.productId || product.productId?._id;
    return rawId || null;
  };

  const isValidObjectId = (value) => typeof value === 'string' && /^[a-fA-F0-9]{24}$/.test(value);

  // Guardar configuración
  const handleSave = async () => {
    if (!validateForm()) return;

    const productId = resolveProductId();
    if (!productId || !isValidObjectId(productId)) {
      toast.error('Guarda el producto primero para poder configurar unidades (ID inválido)');
      return;
    }

    setSaving(true);
    try {
      const configData = {
        productSku: product?.sku || product?.productSku || '',
        productId,
        baseUnit,
        baseUnitAbbr,
        conversions,
        defaultPurchaseUnit: defaultPurchaseUnit || undefined,
        defaultStockUnit: defaultStockUnit || undefined,
        defaultConsumptionUnit: defaultConsumptionUnit || undefined,
        isActive,
      };

      await onSave(configData);
      toast.success(existingConfig ? 'Configuración actualizada' : 'Configuración creada');
      onClose();
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      toast.error(error.message || 'Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  // Obtener unidades disponibles (base + conversiones)
  const availableUnits = [
    baseUnit,
    ...conversions.map(c => c.unit),
  ].filter(Boolean);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingConfig ? 'Editar' : 'Configurar'} Unidades de Medida
          </DialogTitle>
          <DialogDescription>
            Producto: <strong>{product?.name || product?.sku}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Unidad Base */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold">Unidad Base (más pequeña)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="baseUnit">Unidad Base *</Label>
                <Input
                  id="baseUnit"
                  placeholder="ej: unidad, ml, gramo"
                  value={baseUnit}
                  onChange={(e) => setBaseUnit(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="baseUnitAbbr">Abreviación *</Label>
                <Input
                  id="baseUnitAbbr"
                  placeholder="ej: und, ml, g"
                  value={baseUnitAbbr}
                  onChange={(e) => setBaseUnitAbbr(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Reglas de Conversión */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Reglas de Conversión</h3>
              <Button type="button" variant="outline" size="sm" onClick={addConversion}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Regla
              </Button>
            </div>

            {conversions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">
                No hay reglas de conversión. Haz clic en "Agregar Regla" para comenzar.
              </p>
            ) : (
              <div className="space-y-3">
                {conversions.map((conversion, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Regla {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeConversion(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-4 gap-3">
                      <div className="space-y-2">
                        <Label>Unidad *</Label>
                        <Input
                          placeholder="ej: caja"
                          value={conversion.unit}
                          onChange={(e) => updateConversion(index, 'unit', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Abreviación *</Label>
                        <Input
                          placeholder="ej: cj"
                          value={conversion.abbreviation}
                          onChange={(e) => updateConversion(index, 'abbreviation', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Factor *</Label>
                        <Input
                          type="number"
                          min="0.001"
                          step="0.001"
                          placeholder="ej: 2000"
                          value={conversion.factor}
                          onChange={(e) => updateConversion(index, 'factor', parseFloat(e.target.value) || 0)}
                        />
                        <p className="text-xs text-muted-foreground">
                          1 {conversion.unit || 'unidad'} = {conversion.factor} {baseUnit || 'base'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo *</Label>
                        <Select
                          value={conversion.unitType}
                          onValueChange={(value) => updateConversion(index, 'unitType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={conversion.isActive}
                          onCheckedChange={(checked) => updateConversion(index, 'isActive', checked)}
                        />
                        <Label>Activo</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={conversion.isDefault}
                          onCheckedChange={(checked) => updateConversion(index, 'isDefault', checked)}
                        />
                        <Label>Por defecto</Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unidades por Defecto */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-semibold">Unidades por Defecto</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="defaultPurchaseUnit">Compra</Label>
                <Select value={defaultPurchaseUnit} onValueChange={setDefaultPurchaseUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultStockUnit">Almacenamiento</Label>
                <Select value={defaultStockUnit} onValueChange={setDefaultStockUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultConsumptionUnit">Consumo</Label>
                <Select value={defaultConsumptionUnit} onValueChange={setDefaultConsumptionUnit}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Estado */}
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Configuración activa</Label>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : existingConfig ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
