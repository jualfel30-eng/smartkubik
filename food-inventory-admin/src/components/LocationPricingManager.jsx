import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Plus, Trash2, MapPin, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Componente para gestionar precios personalizados por ubicación/sucursal
 *
 * @param {Object} props
 * @param {number} props.basePrice - Precio base del producto
 * @param {Array} props.locationPricing - Array de precios por ubicación actuales
 * @param {Array} props.locations - Array de ubicaciones/sucursales disponibles
 * @param {Function} props.onChange - Callback cuando cambian los precios
 * @param {boolean} props.disabled - Si está deshabilitado
 */
export function LocationPricingManager({
  basePrice = 0,
  locationPricing = [],
  locations = [],
  onChange,
  disabled = false,
  className,
}) {
  const [localLocationPricing, setLocalLocationPricing] = useState(locationPricing || []);
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    setLocalLocationPricing(locationPricing || []);
  }, [locationPricing]);

  const handleAdd = () => {
    if (!selectedLocationId || !customPrice || parseFloat(customPrice) <= 0) {
      return;
    }

    // Verificar si ya existe
    const exists = localLocationPricing.find((lp) => lp.locationId === selectedLocationId);
    if (exists) {
      alert('Este producto ya tiene un precio personalizado en esta ubicación');
      return;
    }

    const location = locations.find((l) => l._id === selectedLocationId);
    if (!location) return;

    const newPrice = {
      locationId: selectedLocationId,
      locationName: location.name,
      customPrice: parseFloat(customPrice),
      isActive: true,
    };

    const updated = [...localLocationPricing, newPrice];
    setLocalLocationPricing(updated);
    if (onChange) onChange(updated);

    // Reset
    setSelectedLocationId('');
    setCustomPrice('');
  };

  const handleRemove = (locationId) => {
    const updated = localLocationPricing.filter((lp) => lp.locationId !== locationId);
    setLocalLocationPricing(updated);
    if (onChange) onChange(updated);
  };

  const handleUpdatePrice = (locationId, newPrice) => {
    const updated = localLocationPricing.map((lp) =>
      lp.locationId === locationId ? { ...lp, customPrice: parseFloat(newPrice) } : lp
    );
    setLocalLocationPricing(updated);
    if (onChange) onChange(updated);
  };

  const handleToggleActive = (locationId) => {
    const updated = localLocationPricing.map((lp) =>
      lp.locationId === locationId ? { ...lp, isActive: !lp.isActive } : lp
    );
    setLocalLocationPricing(updated);
    if (onChange) onChange(updated);
  };

  // Ubicaciones disponibles (excluir las ya asignadas)
  const availableLocations = locations.filter(
    (loc) => !localLocationPricing.find((lp) => lp.locationId === loc._id)
  );

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Precios por Ubicación/Sucursal
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

        {/* Lista de precios por ubicación */}
        {localLocationPricing.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Precios por Ubicación</Label>
            {localLocationPricing.map((locPrice) => (
              <div
                key={locPrice.locationId}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors',
                  locPrice.isActive ? 'hover:bg-muted/50' : 'opacity-50 bg-muted/20'
                )}
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{locPrice.locationName}</span>
                    {!locPrice.isActive && (
                      <Badge variant="outline" className="text-xs">
                        Inactivo
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <NumberInput
                      value={locPrice.customPrice}
                      onChange={(value) => handleUpdatePrice(locPrice.locationId, value)}
                      disabled={disabled}
                      className="w-32"
                      min={0}
                      step={0.01}
                      prefix="$"
                    />
                    {basePrice > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {locPrice.customPrice > basePrice ? '+' : ''}
                        {(((locPrice.customPrice - basePrice) / basePrice) * 100).toFixed(1)}% vs base
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleActive(locPrice.locationId)}
                    disabled={disabled}
                  >
                    {locPrice.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(locPrice.locationId)}
                    disabled={disabled}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agregar nuevo precio por ubicación */}
        {availableLocations.length > 0 && (
          <div className="space-y-3 pt-3 border-t">
            <Label className="text-sm">Agregar Precio a Ubicación</Label>
            <div className="flex gap-2">
              <Select
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
                disabled={disabled}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Seleccionar ubicación..." />
                </SelectTrigger>
                <SelectContent>
                  {availableLocations.map((loc) => (
                    <SelectItem key={loc._id} value={loc._id}>
                      {loc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <NumberInput
                value={customPrice}
                onChange={setCustomPrice}
                disabled={disabled || !selectedLocationId}
                placeholder="Precio"
                className="w-32"
                min={0}
                step={0.01}
                prefix="$"
              />
              <Button
                onClick={handleAdd}
                disabled={disabled || !selectedLocationId || !customPrice}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {availableLocations.length === 0 && localLocationPricing.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No hay ubicaciones disponibles. Crea una ubicación primero.
          </div>
        )}

        {availableLocations.length === 0 && localLocationPricing.length > 0 && (
          <div className="text-xs text-muted-foreground text-center">
            Todas las ubicaciones disponibles ya tienen precio personalizado
          </div>
        )}
      </CardContent>
    </Card>
  );
}
