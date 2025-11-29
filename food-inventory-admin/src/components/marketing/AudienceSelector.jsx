import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Diamond, Award, Medal, Gem } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import ProductSelector from './ProductSelector';

const TIERS = [
  { value: 'diamante', label: 'Diamante', icon: Diamond, color: 'bg-blue-500 text-white', description: 'Top 5% - Clientes premium' },
  { value: 'oro', label: 'Oro', icon: Award, color: 'bg-yellow-500 text-white', description: 'Top 20% - Clientes frecuentes' },
  { value: 'plata', label: 'Plata', icon: Medal, color: 'bg-gray-400 text-white', description: 'Top 50% - Clientes regulares' },
  { value: 'bronce', label: 'Bronce', icon: Gem, color: 'bg-amber-600 text-white', description: 'Resto - Clientes ocasionales' },
];

const CUSTOMER_TYPES = [
  { value: 'business', label: 'Empresas' },
  { value: 'individual', label: 'Individuales' },
  { value: 'walk-in', label: 'Walk-in' },
];

export default function AudienceSelector({ value = {}, onChange }) {
  const [filters, setFilters] = useState({
    tiers: value.tiers || [],
    customerTypes: value.customerTypes || [],
    tags: value.tags || [],
    locations: value.locations || [],
    minSpent: value.minSpent || '',
    maxSpent: value.maxSpent || '',
    maxDaysSinceLastVisit: value.maxDaysSinceLastVisit || '',
    minVisitCount: value.minVisitCount || '',
    maxVisitCount: value.maxVisitCount || '',
    // Product Affinity Filters (Phase 2)
    productIds: value.productIds || [],
    excludeProductIds: value.excludeProductIds || [],
    minPurchaseCount: value.minPurchaseCount || '',
    maxDaysSinceLastProductPurchase: value.maxDaysSinceLastProductPurchase || '',
  });

  const [estimatedReach, setEstimatedReach] = useState(0);
  const [loading, setLoading] = useState(false);

  // Debounced estimation
  const calculateEstimatedReach = useCallback(async () => {
    setLoading(true);
    try {
      // Filter out empty strings for numeric fields to avoid validation errors
      const cleanFilters = {
        ...filters,
        minSpent: filters.minSpent || undefined,
        maxSpent: filters.maxSpent || undefined,
        maxDaysSinceLastVisit: filters.maxDaysSinceLastVisit || undefined,
        minVisitCount: filters.minVisitCount || undefined,
        maxVisitCount: filters.maxVisitCount || undefined,
        // Product filters
        minPurchaseCount: filters.minPurchaseCount || undefined,
        maxDaysSinceLastProductPurchase: filters.maxDaysSinceLastProductPurchase || undefined,
        productIds: filters.productIds?.length > 0 ? filters.productIds : undefined,
        excludeProductIds: filters.excludeProductIds?.length > 0 ? filters.excludeProductIds : undefined,
      };

      const response = await fetchApi('/marketing/campaigns/audience/filter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanFilters),
      });

      setEstimatedReach(response.count || 0);
    } catch (error) {
      console.error('Error calculating reach:', error);
      setEstimatedReach(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => {
      calculateEstimatedReach();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters, calculateEstimatedReach]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onChange?.(newFilters);
  };

  const toggleTier = (tier) => {
    const newTiers = filters.tiers.includes(tier)
      ? filters.tiers.filter(t => t !== tier)
      : [...filters.tiers, tier];
    handleFilterChange('tiers', newTiers);
  };

  const toggleCustomerType = (type) => {
    const newTypes = filters.customerTypes.includes(type)
      ? filters.customerTypes.filter(t => t !== type)
      : [...filters.customerTypes, type];
    handleFilterChange('customerTypes', newTypes);
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
          <Users className="w-5 h-5" />
          Seleccionar Audiencia
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Define quiénes recibirán esta campaña basándote en segmentación RFM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estimated Reach */}
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Alcance Estimado</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Clientes que coinciden con los filtros</p>
            </div>
            <div className="text-right">
              {loading ? (
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">...</p>
              ) : (
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{estimatedReach}</p>
              )}
              <p className="text-xs text-blue-700 dark:text-blue-300">clientes</p>
            </div>
          </div>
        </div>

        {/* Tiers (RFM Segmentation) */}
        <div className="space-y-3">
          <Label className="dark:text-gray-200">Segmentos RFM (Principio 80/20)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TIERS.map((tier) => {
              const Icon = tier.icon;
              const isSelected = filters.tiers.includes(tier.value);

              return (
                <div
                  key={tier.value}
                  onClick={() => toggleTier(tier.value)}
                  className={`cursor-pointer p-3 border-2 rounded-lg transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded ${tier.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium dark:text-gray-100">{tier.label}</span>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">Seleccionado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{tier.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Types */}
        <div className="space-y-3">
          <Label className="dark:text-gray-200">Tipo de Cliente</Label>
          <div className="flex flex-wrap gap-2">
            {CUSTOMER_TYPES.map((type) => (
              <label
                key={type.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={filters.customerTypes.includes(type.value)}
                  onCheckedChange={() => toggleCustomerType(type.value)}
                />
                <span className="text-sm dark:text-gray-200">{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Spending Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="dark:text-gray-200">Gasto Mínimo</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minSpent}
              onChange={(e) => handleFilterChange('minSpent', e.target.value ? Number(e.target.value) : '')}
              className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <Label className="dark:text-gray-200">Gasto Máximo</Label>
            <Input
              type="number"
              placeholder="Sin límite"
              value={filters.maxSpent}
              onChange={(e) => handleFilterChange('maxSpent', e.target.value ? Number(e.target.value) : '')}
              className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Visit Frequency */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="dark:text-gray-200">Visitas Mínimas</Label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minVisitCount}
              onChange={(e) => handleFilterChange('minVisitCount', e.target.value ? Number(e.target.value) : '')}
              className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <Label className="dark:text-gray-200">Días desde última visita</Label>
            <Input
              type="number"
              placeholder="30"
              value={filters.maxDaysSinceLastVisit}
              onChange={(e) => handleFilterChange('maxDaysSinceLastVisit', e.target.value ? Number(e.target.value) : '')}
              className="dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
        </div>

        {/* Summary */}
        {filters.tiers.length > 0 && (
          <div className="pt-4 border-t dark:border-gray-700">
            <p className="text-sm font-medium dark:text-gray-200 mb-2">Segmentos Seleccionados:</p>
            <div className="flex flex-wrap gap-2">
              {filters.tiers.map((tier) => {
                const tierConfig = TIERS.find(t => t.value === tier);
                return (
                  <Badge key={tier} className={tierConfig?.color}>
                    {tierConfig?.label}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Product Affinity Selector (Phase 2) - Separate card for visual separation */}
      <div className="mt-6">
        <ProductSelector
          value={{
            productIds: filters.productIds,
            excludeProductIds: filters.excludeProductIds,
            minPurchaseCount: filters.minPurchaseCount,
            maxDaysSinceLastProductPurchase: filters.maxDaysSinceLastProductPurchase,
          }}
          onChange={(productFilters) => {
            const newFilters = { ...filters, ...productFilters };
            setFilters(newFilters);
            onChange?.(newFilters);
          }}
        />
      </div>
    </Card>
  );
}
