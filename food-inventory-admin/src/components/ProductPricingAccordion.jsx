import { useMemo } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Label } from '@/components/ui/label.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { PricingStrategySelector } from '@/components/PricingStrategySelector.jsx';
import { DollarSign, Layers, Store, Tag } from 'lucide-react';

/**
 * Unified pricing accordion that groups all pricing-related sections:
 * 1. Pricing Strategy (PricingStrategySelector)
 * 2. Volume Discounts
 * 3. Wholesale Pricing
 * 4. Promotions/Special Offers
 *
 * @param {Object} props
 * @param {Object} props.product - Product state object
 * @param {Function} props.onProductChange - Product state setter
 * @param {Object} [props.strategyProps] - Props for PricingStrategySelector (if null, strategy section is hidden)
 * @param {boolean} [props.useInputForNumbers] - Use plain Input type="number" instead of NumberInput (for edit dialog compatibility)
 */
export function ProductPricingAccordion({
  product,
  onProductChange,
  strategyProps,
  useInputForNumbers = false,
}) {
  // Determine which accordion items are open by default
  const defaultOpen = useMemo(() => {
    const items = [];
    if (strategyProps) items.push('strategy');
    if (product.pricingRules?.bulkDiscountEnabled) items.push('volume');
    if (product.pricingRules?.wholesaleEnabled) items.push('wholesale');
    if (product.hasActivePromotion) items.push('promo');
    return items.length > 0 ? items : (strategyProps ? ['strategy'] : []);
  }, []); // Only compute on mount

  // Summary line
  const summaryParts = useMemo(() => {
    const parts = [];

    // Strategy
    const mode = strategyProps?.strategy?.mode || product.variant?.pricingStrategy?.mode;
    if (mode === 'markup') parts.push('Markup');
    else if (mode === 'margin') parts.push('Margen');
    else parts.push('Manual');

    // Volume discounts
    if (product.pricingRules?.bulkDiscountEnabled) {
      const count = product.pricingRules?.bulkDiscountRules?.length || 0;
      parts.push(`${count} desc. volumen`);
    }

    // Wholesale
    if (product.pricingRules?.wholesaleEnabled) {
      const min = product.pricingRules?.wholesaleMinQuantity || 1;
      parts.push(`Mayorista (min ${min}u)`);
    }

    // Promotion
    if (product.hasActivePromotion && product.promotion?.discountPercentage > 0) {
      parts.push(`Promo ${product.promotion.discountPercentage}%`);
    }

    return parts;
  }, [
    strategyProps?.strategy?.mode,
    product.variant?.pricingStrategy?.mode,
    product.pricingRules?.bulkDiscountEnabled,
    product.pricingRules?.bulkDiscountRules?.length,
    product.pricingRules?.wholesaleEnabled,
    product.pricingRules?.wholesaleMinQuantity,
    product.hasActivePromotion,
    product.promotion?.discountPercentage,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <DollarSign className="h-5 w-5 text-primary" />
        <h4 className="text-base font-semibold">Precios y Descuentos</h4>
      </div>

      <p className="text-sm text-muted-foreground">
        Configura como se calcula el precio base y activa descuentos opcionales.
      </p>

      <Accordion type="multiple" defaultValue={defaultOpen} className="border rounded-lg">
        {/* 1. Pricing Strategy */}
        {strategyProps && (
          <AccordionItem value="strategy">
            <AccordionTrigger className="px-4 hover:no-underline">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <span className="font-medium">Estrategia de Precio Base</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4">
              <PricingStrategySelector {...strategyProps} />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* 2. Volume Discounts */}
        <AccordionItem value="volume">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Layers className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Descuentos por Volumen</span>
              {product.pricingRules?.bulkDiscountEnabled && (
                <Badge variant="secondary" className="text-xs ml-1">Activo</Badge>
              )}
            </div>
            <Switch
              checked={product.pricingRules?.bulkDiscountEnabled || false}
              onCheckedChange={(checked) => {
                onProductChange({
                  ...product,
                  pricingRules: {
                    ...(product.pricingRules || {}),
                    bulkDiscountEnabled: checked,
                    bulkDiscountRules: checked ? (product.pricingRules?.bulkDiscountRules || []) : [],
                  },
                });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mr-2"
            />
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {product.pricingRules?.bulkDiscountEnabled && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Configura descuentos automaticos basados en la cantidad comprada
                </p>
                {(product.pricingRules?.bulkDiscountRules || []).map((rule, index) => (
                  <div key={index} className="flex gap-3 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Cantidad Minima</Label>
                      <NumberInput
                        value={rule.minQuantity ?? ''}
                        onValueChange={(val) => {
                          const rules = [...(product.pricingRules?.bulkDiscountRules || [])];
                          rules[index] = { ...rules[index], minQuantity: val };
                          onProductChange({
                            ...product,
                            pricingRules: { ...product.pricingRules, bulkDiscountRules: rules },
                          });
                        }}
                        step={1}
                        min={1}
                        placeholder="Ej: 10"
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Descuento (%)</Label>
                      <NumberInput
                        value={rule.discountPercentage ?? ''}
                        onValueChange={(val) => {
                          const rules = [...(product.pricingRules?.bulkDiscountRules || [])];
                          rules[index] = { ...rules[index], discountPercentage: val };
                          onProductChange({
                            ...product,
                            pricingRules: { ...product.pricingRules, bulkDiscountRules: rules },
                          });
                        }}
                        step={0.1}
                        min={0}
                        max={100}
                        placeholder="Ej: 10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        const rules = [...(product.pricingRules?.bulkDiscountRules || [])];
                        rules.splice(index, 1);
                        onProductChange({
                          ...product,
                          pricingRules: { ...product.pricingRules, bulkDiscountRules: rules },
                        });
                      }}
                    >
                      Eliminar
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const rules = [...(product.pricingRules?.bulkDiscountRules || [])];
                    rules.push({ minQuantity: 1, discountPercentage: 0 });
                    onProductChange({
                      ...product,
                      pricingRules: { ...product.pricingRules, bulkDiscountRules: rules },
                    });
                  }}
                >
                  + Agregar Regla de Descuento
                </Button>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 3. Wholesale Pricing */}
        <AccordionItem value="wholesale">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Store className="h-4 w-4 text-green-500" />
              <span className="font-medium">Precio Mayorista</span>
              {product.pricingRules?.wholesaleEnabled && (
                <Badge variant="secondary" className="text-xs ml-1">Activo</Badge>
              )}
            </div>
            <Switch
              checked={product.pricingRules?.wholesaleEnabled || false}
              onCheckedChange={(checked) => {
                onProductChange({
                  ...product,
                  pricingRules: {
                    ...(product.pricingRules || {}),
                    wholesaleEnabled: checked,
                  },
                });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mr-2"
            />
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {product.pricingRules?.wholesaleEnabled && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Define un precio fijo para ventas al mayor. El precio mayorista de cada variante se configura junto a su precio de venta.
                </p>
                <div className="max-w-xs space-y-2">
                  <Label>Cantidad Minima para Precio Mayorista</Label>
                  {useInputForNumbers ? (
                    <Input
                      type="number"
                      value={product.pricingRules?.wholesaleMinQuantity ?? 1}
                      onChange={(e) =>
                        onProductChange({
                          ...product,
                          pricingRules: {
                            ...product.pricingRules,
                            wholesaleMinQuantity: parseInt(e.target.value) || 1,
                          },
                        })
                      }
                      min={1}
                      step={1}
                      placeholder="Ej: 10"
                    />
                  ) : (
                    <NumberInput
                      value={product.pricingRules?.wholesaleMinQuantity ?? 1}
                      onValueChange={(val) =>
                        onProductChange({
                          ...product,
                          pricingRules: {
                            ...product.pricingRules,
                            wholesaleMinQuantity: val,
                          },
                        })
                      }
                      step={1}
                      min={1}
                      placeholder="Ej: 10"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    A partir de esta cantidad se aplica automaticamente el precio mayorista. El vendedor tambien puede aplicarlo manualmente.
                  </p>
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 4. Promotions */}
        <AccordionItem value="promo">
          <AccordionTrigger className="px-4 hover:no-underline">
            <div className="flex items-center gap-2 flex-1">
              <Tag className="h-4 w-4 text-orange-500" />
              <span className="font-medium">Promocion / Oferta Especial</span>
              {product.hasActivePromotion && (
                <Badge variant="secondary" className="text-xs ml-1">Activo</Badge>
              )}
            </div>
            <Switch
              checked={product.hasActivePromotion || false}
              onCheckedChange={(checked) => {
                onProductChange({
                  ...product,
                  hasActivePromotion: checked,
                });
              }}
              onClick={(e) => e.stopPropagation()}
              className="mr-2"
            />
          </AccordionTrigger>
          <AccordionContent className="px-4">
            {product.hasActivePromotion && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Configura una oferta temporal para este producto
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Porcentaje de Descuento (%)</Label>
                    {useInputForNumbers ? (
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={product.promotion?.discountPercentage || 0}
                        onChange={(e) =>
                          onProductChange({
                            ...product,
                            promotion: {
                              ...(product.promotion || {}),
                              discountPercentage: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="Ej: 20"
                      />
                    ) : (
                      <NumberInput
                        value={product.promotion?.discountPercentage ?? ''}
                        onValueChange={(val) =>
                          onProductChange({
                            ...product,
                            promotion: {
                              ...product.promotion,
                              discountPercentage: val,
                            },
                          })
                        }
                        step={0.1}
                        min={0}
                        max={100}
                        placeholder="Ej: 20"
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Promocion</Label>
                    <Select
                      value={product.promotion?.reason || ''}
                      onValueChange={(value) =>
                        onProductChange({
                          ...product,
                          promotion: {
                            ...(product.promotion || {}),
                            reason: value,
                          },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promocion_temporal">Promocion Temporal</SelectItem>
                        <SelectItem value="liquidacion">Liquidacion</SelectItem>
                        <SelectItem value="temporada">Oferta de Temporada</SelectItem>
                        <SelectItem value="lanzamiento">Lanzamiento</SelectItem>
                        <SelectItem value="black_friday">Black Friday</SelectItem>
                        <SelectItem value="otro">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Inicio</Label>
                    <Input
                      type="date"
                      value={product.promotion?.startDate ? new Date(product.promotion.startDate).toISOString().split('T')[0] : ''}
                      onChange={(e) =>
                        onProductChange({
                          ...product,
                          promotion: {
                            ...(product.promotion || {}),
                            startDate: new Date(e.target.value),
                          },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Duracion (dias) o Fecha de Fin</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Dias"
                        value={product.promotion?.durationDays || ''}
                        onChange={(e) => {
                          const days = parseInt(e.target.value) || 0;
                          const startDate = product.promotion?.startDate || new Date();
                          const endDate = new Date(startDate);
                          endDate.setDate(endDate.getDate() + days);
                          onProductChange({
                            ...product,
                            promotion: {
                              ...(product.promotion || {}),
                              durationDays: days,
                              endDate: endDate,
                            },
                          });
                        }}
                        className="w-24"
                      />
                      <Input
                        type="date"
                        value={product.promotion?.endDate ? new Date(product.promotion.endDate).toISOString().split('T')[0] : ''}
                        onChange={(e) =>
                          onProductChange({
                            ...product,
                            promotion: {
                              ...(product.promotion || {}),
                              endDate: new Date(e.target.value),
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pricing-accordion-autoDeactivate"
                    checked={product.promotion?.autoDeactivate !== false}
                    onCheckedChange={(checked) =>
                      onProductChange({
                        ...product,
                        promotion: {
                          ...(product.promotion || {}),
                          autoDeactivate: checked,
                        },
                      })
                    }
                  />
                  <Label htmlFor="pricing-accordion-autoDeactivate">
                    Desactivar automaticamente cuando termine la fecha
                  </Label>
                </div>

                {product.promotion?.discountPercentage > 0 && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                    <div className="text-sm font-semibold text-warning dark:text-orange-400">
                      Vista Previa de la Promocion
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {product.promotion?.discountPercentage}% de descuento
                      {product.promotion?.startDate && product.promotion?.endDate && (
                        <> desde {new Date(product.promotion.startDate).toLocaleDateString()} hasta {new Date(product.promotion.endDate).toLocaleDateString()}</>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Summary bar */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
        <DollarSign className="h-3.5 w-3.5" />
        <span>{summaryParts.join(' | ')}</span>
      </div>
    </div>
  );
}
