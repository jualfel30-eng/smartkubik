import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Plus, Trash2, Package, TrendingDown, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente para gestionar descuentos por volumen/cantidad
 *
 * @param {Object} props
 * @param {number} props.basePrice - Precio base del producto
 * @param {Array} props.volumeDiscounts - Array de descuentos por volumen actuales
 * @param {Function} props.onChange - Callback cuando cambian los descuentos
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export function VolumeDiscountsManager({
  basePrice = 0,
  volumeDiscounts = [],
  onChange,
  disabled = false,
  className,
}) {
  const [localVolumeDiscounts, setLocalVolumeDiscounts] = useState(volumeDiscounts || []);
  const [minQuantity, setMinQuantity] = useState('');
  const [discountType, setDiscountType] = useState('percentage'); // 'percentage' o 'fixed'
  const [discountValue, setDiscountValue] = useState('');

  useEffect(() => {
    setLocalVolumeDiscounts(volumeDiscounts || []);
  }, [volumeDiscounts]);

  const handleAdd = () => {
    if (!minQuantity || parseFloat(minQuantity) < 1) {
      alert('La cantidad mínima debe ser al menos 1');
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      alert('El descuento debe ser mayor a 0');
      return;
    }

    // Verificar si ya existe un descuento para esta cantidad
    const exists = localVolumeDiscounts.find(
      (vd) => vd.minQuantity === parseInt(minQuantity)
    );
    if (exists) {
      alert('Ya existe un descuento para esta cantidad');
      return;
    }

    // Validar porcentaje
    if (discountType === 'percentage' && parseFloat(discountValue) > 100) {
      alert('El porcentaje de descuento no puede ser mayor a 100%');
      return;
    }

    const newDiscount = {
      minQuantity: parseInt(minQuantity),
      ...(discountType === 'percentage'
        ? { discountPercentage: parseFloat(discountValue) }
        : { fixedPrice: parseFloat(discountValue) }),
    };

    const updated = [...localVolumeDiscounts, newDiscount].sort(
      (a, b) => a.minQuantity - b.minQuantity
    );
    setLocalVolumeDiscounts(updated);
    if (onChange) onChange(updated);

    // Reset
    setMinQuantity('');
    setDiscountValue('');
  };

  const handleRemove = (minQty) => {
    const updated = localVolumeDiscounts.filter((vd) => vd.minQuantity !== minQty);
    setLocalVolumeDiscounts(updated);
    if (onChange) onChange(updated);
  };

  const handleUpdate = (minQty, field, value) => {
    const updated = localVolumeDiscounts.map((vd) =>
      vd.minQuantity === minQty ? { ...vd, [field]: parseFloat(value) } : vd
    );
    setLocalVolumeDiscounts(updated);
    if (onChange) onChange(updated);
  };

  const calculateFinalPrice = (discount) => {
    if (discount.fixedPrice !== undefined) {
      return discount.fixedPrice;
    }
    if (discount.discountPercentage !== undefined) {
      return basePrice * (1 - discount.discountPercentage / 100);
    }
    return basePrice;
  };

  const getSavingsAmount = (discount) => {
    return basePrice - calculateFinalPrice(discount);
  };

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package className="h-4 w-4" />
          Descuentos por Volumen/Cantidad
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Precio Base Reference */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Precio Base (1 unidad)</span>
          </div>
          <span className="text-lg font-bold">${basePrice.toFixed(2)}</span>
        </div>

        {/* Lista de descuentos por volumen */}
        {localVolumeDiscounts.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Escalas de Descuento</Label>
            {localVolumeDiscounts.map((discount) => {
              const finalPrice = calculateFinalPrice(discount);
              const savings = getSavingsAmount(discount);
              const savingsPercent = basePrice > 0 ? (savings / basePrice) * 100 : 0;

              return (
                <div
                  key={discount.minQuantity}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {discount.minQuantity}+ unidades
                      </Badge>
                      {discount.fixedPrice !== undefined ? (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          Precio Fijo
                        </Badge>
                      ) : (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          {discount.discountPercentage}% OFF
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <Label className="text-xs text-muted-foreground">Precio Final</Label>
                        <div className="font-semibold">${finalPrice.toFixed(2)}</div>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Ahorro</Label>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          ${savings.toFixed(2)} ({savingsPercent.toFixed(0)}%)
                        </div>
                      </div>
                    </div>

                    {/* Edición inline */}
                    <div className="flex gap-2 pt-2 border-t">
                      <div className="flex-1">
                        <Label className="text-xs">Cantidad Mínima</Label>
                        <NumberInput
                          value={discount.minQuantity}
                          onChange={(value) => handleUpdate(discount.minQuantity, 'minQuantity', value)}
                          disabled={disabled}
                          className="w-full"
                          min={1}
                          step={1}
                        />
                      </div>
                      <div className="flex-1">
                        <Label className="text-xs">
                          {discount.fixedPrice !== undefined ? 'Precio Fijo' : '% Descuento'}
                        </Label>
                        <NumberInput
                          value={discount.fixedPrice ?? discount.discountPercentage ?? 0}
                          onChange={(value) =>
                            handleUpdate(
                              discount.minQuantity,
                              discount.fixedPrice !== undefined ? 'fixedPrice' : 'discountPercentage',
                              value
                            )
                          }
                          disabled={disabled}
                          className="w-full"
                          min={0}
                          step={discount.fixedPrice !== undefined ? 0.01 : 1}
                          prefix={discount.fixedPrice !== undefined ? '$' : ''}
                          suffix={discount.discountPercentage !== undefined ? '%' : ''}
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(discount.minQuantity)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Agregar nuevo descuento */}
        <div className="space-y-3 pt-3 border-t">
          <Label className="text-sm">Agregar Escala de Descuento</Label>

          <RadioGroup value={discountType} onValueChange={setDiscountType} className="flex gap-4">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="percentage" id="percentage" disabled={disabled} />
              <Label htmlFor="percentage" className="cursor-pointer">
                Porcentaje de descuento
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="fixed" id="fixed" disabled={disabled} />
              <Label htmlFor="fixed" className="cursor-pointer">
                Precio fijo
              </Label>
            </div>
          </RadioGroup>

          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Cantidad Mínima</Label>
              <NumberInput
                value={minQuantity}
                onChange={setMinQuantity}
                disabled={disabled}
                placeholder="Ej: 10"
                min={1}
                step={1}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">
                {discountType === 'percentage' ? 'Porcentaje' : 'Precio Fijo'}
              </Label>
              <NumberInput
                value={discountValue}
                onChange={setDiscountValue}
                disabled={disabled}
                placeholder={discountType === 'percentage' ? 'Ej: 10' : 'Ej: 45.00'}
                min={0}
                step={discountType === 'percentage' ? 1 : 0.01}
                prefix={discountType === 'fixed' ? '$' : ''}
                suffix={discountType === 'percentage' ? '%' : ''}
                max={discountType === 'percentage' ? 100 : undefined}
              />
            </div>
            <Button
              onClick={handleAdd}
              disabled={disabled || !minQuantity || !discountValue}
              size="icon"
              className="mt-5"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Vista previa */}
          {minQuantity && discountValue && basePrice > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg space-y-1 text-sm">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <TrendingDown className="h-4 w-4" />
                <span className="font-semibold">Vista Previa</span>
              </div>
              <div className="text-muted-foreground">
                Comprando {minQuantity}+ unidades:
              </div>
              <div className="font-semibold">
                {discountType === 'percentage' ? (
                  <>
                    ${(basePrice * (1 - parseFloat(discountValue) / 100)).toFixed(2)}/ud
                    <span className="text-green-600 dark:text-green-400 ml-2">
                      (ahorra ${(basePrice * parseFloat(discountValue) / 100).toFixed(2)}/ud)
                    </span>
                  </>
                ) : (
                  <>
                    ${parseFloat(discountValue).toFixed(2)}/ud
                    <span className="text-green-600 dark:text-green-400 ml-2">
                      (ahorra ${(basePrice - parseFloat(discountValue)).toFixed(2)}/ud)
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {localVolumeDiscounts.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No hay descuentos por volumen configurados
          </div>
        )}
      </CardContent>
    </Card>
  );
}
