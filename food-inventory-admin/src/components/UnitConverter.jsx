import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useUnitConversions } from '../hooks/useUnitConversions';
import { ArrowRight, Calculator } from 'lucide-react';
import { Badge } from './ui/badge';

/**
 * Componente de conversión rápida de unidades
 * Permite convertir valores entre diferentes unidades de un producto
 */
export const UnitConverter = ({ product, className = '' }) => {
  const { getConfigByProductId, convertUnitDetailed } = useUnitConversions();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [value, setValue] = useState(1);
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [result, setResult] = useState(null);
  const [converting, setConverting] = useState(false);

  // Cargar configuración del producto
  useEffect(() => {
    loadConfig();
  }, [product?._id]);

  const loadConfig = async () => {
    if (!product?._id) return;

    setLoading(true);
    try {
      const data = await getConfigByProductId(product._id);
      setConfig(data);

      // Configurar unidades por defecto
      if (data) {
        const units = getAvailableUnits(data);
        if (units.length >= 2) {
          setFromUnit(units[0].value);
          setToUnit(units[1].value);
        }
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  };

  // Obtener unidades disponibles
  const getAvailableUnits = (cfg) => {
    if (!cfg) return [];

    const units = [
      { value: cfg.baseUnit, label: `${cfg.baseUnit} (${cfg.baseUnitAbbr})`, isBase: true },
    ];

    if (cfg.conversions) {
      cfg.conversions
        .filter(c => c.isActive)
        .forEach(c => {
          units.push({
            value: c.unit,
            label: `${c.unit} (${c.abbreviation})`,
            isBase: false,
          });
        });
    }

    return units;
  };

  // Realizar conversión
  useEffect(() => {
    if (!config || !fromUnit || !toUnit || !value || value <= 0) {
      setResult(null);
      return;
    }

    performConversion();
  }, [value, fromUnit, toUnit, config]);

  const performConversion = async () => {
    if (!product?._id) return;

    setConverting(true);
    try {
      const conversionResult = await convertUnitDetailed(
        parseFloat(value),
        fromUnit,
        toUnit,
        product._id
      );
      setResult(conversionResult);
    } catch (error) {
      console.error('Error al convertir:', error);
      setResult(null);
    } finally {
      setConverting(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            Convertidor de Unidades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Este producto no tiene configuración de unidades
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableUnits = getAvailableUnits(config);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-4 w-4" />
          Convertidor de Unidades
        </CardTitle>
        <CardDescription>
          {product?.name || product?.sku}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-[1fr,auto,1fr] gap-4 items-end">
          {/* Valor de entrada */}
          <div className="space-y-2">
            <Label htmlFor="value">Valor</Label>
            <Input
              id="value"
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(e) => setValue(parseFloat(e.target.value) || 0)}
              className="text-lg font-semibold"
            />
          </div>

          {/* Flecha */}
          <div className="pb-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </div>

          {/* Resultado */}
          <div className="space-y-2">
            <Label>Resultado</Label>
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-lg font-semibold">
                {converting ? '...' : result ? result.convertedValue.toFixed(3) : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Unidad origen */}
          <div className="space-y-2">
            <Label htmlFor="fromUnit">De</Label>
            <Select value={fromUnit} onValueChange={setFromUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                    {unit.isBase && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Base
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unidad destino */}
          <div className="space-y-2">
            <Label htmlFor="toUnit">A</Label>
            <Select value={toUnit} onValueChange={setToUnit}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map((unit) => (
                  <SelectItem key={unit.value} value={unit.value}>
                    {unit.label}
                    {unit.isBase && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Base
                      </Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ecuación de conversión */}
        {result && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-center font-medium">
              {result.originalValue} {result.originalUnit} = {result.convertedValue.toFixed(3)} {result.convertedUnit}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
