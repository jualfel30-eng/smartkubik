import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Plus, Trash2, DollarSign, Tag } from 'lucide-react';
import { usePriceLists } from '@/hooks/usePriceLists';
import { cn } from '@/lib/utils';

/**
 * Componente para gestionar precios personalizados de un producto en diferentes listas
 *
 * @param {Object} props
 * @param {string} props.productId - ID del producto
 * @param {string} props.variantSku - SKU de la variante
 * @param {number} props.basePrice - Precio base del producto
 * @param {Array} props.customPrices - Array de precios personalizados actuales
 * @param {Function} props.onChange - Callback cuando cambian los precios
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export function ProductPriceListManager({
  productId,
  variantSku,
  basePrice = 0,
  customPrices = [],
  onChange,
  disabled = false,
  className,
}) {
  const { priceLists, loadPriceLists } = usePriceLists();
  const [localCustomPrices, setLocalCustomPrices] = useState(customPrices || []);
  const [selectedPriceListId, setSelectedPriceListId] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    loadPriceLists(true); // Solo listas activas
  }, [loadPriceLists]);

  useEffect(() => {
    setLocalCustomPrices(customPrices || []);
  }, [customPrices]);

  const handleAdd = () => {
    if (!selectedPriceListId || !customPrice || parseFloat(customPrice) <= 0) {
      return;
    }

    // Verificar si ya existe
    const exists = localCustomPrices.find((p) => p.priceListId === selectedPriceListId);
    if (exists) {
      alert('Este producto ya tiene un precio personalizado en esta lista');
      return;
    }

    const priceList = priceLists.find((pl) => pl._id === selectedPriceListId);
    if (!priceList) return;

    const newPrice = {
      priceListId: selectedPriceListId,
      priceListName: priceList.name,
      priceListType: priceList.type,
      customPrice: parseFloat(customPrice),
    };

    const updated = [...localCustomPrices, newPrice];
    setLocalCustomPrices(updated);
    if (onChange) onChange(updated);

    // Reset
    setSelectedPriceListId('');
    setCustomPrice('');
  };

  const handleRemove = (priceListId) => {
    const updated = localCustomPrices.filter((p) => p.priceListId !== priceListId);
    setLocalCustomPrices(updated);
    if (onChange) onChange(updated);
  };

  const handleUpdatePrice = (priceListId, newPrice) => {
    const updated = localCustomPrices.map((p) =>
      p.priceListId === priceListId ? { ...p, customPrice: parseFloat(newPrice) } : p
    );
    setLocalCustomPrices(updated);
    if (onChange) onChange(updated);
  };

  const getPriceListTypeColor = (type) => {
    const colors = {
      standard: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      wholesale: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      retail: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      promotional: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      seasonal: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      custom: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };
    return colors[type] || colors.custom;
  };

  const getPriceListTypeLabel = (type) => {
    const labels = {
      standard: 'Estándar',
      wholesale: 'Mayorista',
      retail: 'Retail',
      promotional: 'Promocional',
      seasonal: 'Temporal',
      custom: 'Personalizado',
    };
    return labels[type] || type;
  };

  // Listas disponibles (excluir las ya asignadas)
  const availablePriceLists = priceLists.filter(
    (pl) => !localCustomPrices.find((cp) => cp.priceListId === pl._id)
  );

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4 w-4" />
          Precios por Lista de Precios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Precio Base Reference */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Precio Base</span>
          </div>
          <span className="text-lg font-bold">${basePrice.toFixed(2)}</span>
        </div>

        {/* Lista de precios personalizados */}
        {localCustomPrices.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Precios Personalizados</Label>
            {localCustomPrices.map((price) => (
              <div
                key={price.priceListId}
                className="flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{price.priceListName}</span>
                    <Badge className={getPriceListTypeColor(price.priceListType)}>
                      {getPriceListTypeLabel(price.priceListType)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={price.customPrice}
                      onValueChange={(value) => handleUpdatePrice(price.priceListId, value)}
                      disabled={disabled}
                      className="w-32"
                      min={0}
                      step={0.01}
                      prefix="$"
                    />
                    {basePrice > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {price.customPrice > basePrice ? '+' : ''}
                        {(((price.customPrice - basePrice) / basePrice) * 100).toFixed(1)}% vs base
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(price.priceListId)}
                  disabled={disabled}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Agregar nuevo precio personalizado */}
        {availablePriceLists.length > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm">Agregar Precio a Lista</Label>
            <div className="flex gap-2">
              <Select
                value={selectedPriceListId}
                onValueChange={setSelectedPriceListId}
                disabled={disabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar lista..." />
                </SelectTrigger>
                <SelectContent>
                  {availablePriceLists.map((pl) => (
                    <SelectItem key={pl._id} value={pl._id}>
                      {pl.name} ({getPriceListTypeLabel(pl.type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NumberInput
                value={customPrice}
                onValueChange={setCustomPrice}
                disabled={disabled || !selectedPriceListId}
                placeholder="Precio"
                className="w-32"
                min={0}
                step={0.01}
                prefix="$"
              />
              <Button
                onClick={handleAdd}
                disabled={disabled || !selectedPriceListId || !customPrice}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {availablePriceLists.length === 0 && localCustomPrices.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No hay listas de precios disponibles. Crea una lista de precios primero.
          </div>
        )}

        {availablePriceLists.length === 0 && localCustomPrices.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Todas las listas disponibles ya tienen precio personalizado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
