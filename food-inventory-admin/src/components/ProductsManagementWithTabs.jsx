import { useSearchParams } from 'react-router-dom';
import { useVerticalKey } from '@/hooks/useVerticalConfig.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import ProductsManagement from '@/components/ProductsManagement.jsx';
import ConsumablesTab from '@/components/ConsumablesTab.jsx';
import SuppliesTab from '@/components/SuppliesTab.jsx';
import PricingEngineTab from '@/components/PricingEngineTab.jsx';
import DedupTab from '@/components/product-dedup/DedupTab.jsx';
import { Package, Layers, Wrench, Calculator, Factory, GitMerge } from 'lucide-react';

/**
 * ProductsManagementWithTabs
 *
 * Uses a dropdown Select instead of tab bar to reduce visual complexity.
 * Hick's Law: fewer visible options = faster decisions.
 */
function ProductsManagementWithTabs({ activeSubTab = 'products' }) {
  const [, setSearchParams] = useSearchParams();
  const verticalKey = useVerticalKey();
  const isBeautyProfile = ['barbershop-salon', 'clinic-spa'].includes(verticalKey);

  const handleChange = (newTab) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  const options = [
    { value: 'products', label: 'Mercancia', icon: Package },
    { value: 'raw-materials', label: 'Materias Primas', icon: Factory },
    { value: 'consumables', label: 'Consumibles', icon: Layers },
    { value: 'supplies', label: 'Suministros', icon: Wrench },
    ...(!isBeautyProfile ? [{ value: 'pricing-engine', label: 'Motor de Precios', icon: Calculator }] : []),
    { value: 'dedup', label: 'Depuracion', icon: GitMerge },
  ];

  const currentLabel = options.find(o => o.value === activeSubTab)?.label || 'Mercancia';

  return (
    <div className="space-y-4">
      {/* Product type selector — replaces 6 tabs with 1 dropdown */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-muted-foreground shrink-0">Tipo:</label>
        <Select value={activeSubTab} onValueChange={handleChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Seleccionar tipo">
              <span className="flex items-center gap-2">
                {(() => {
                  const opt = options.find(o => o.value === activeSubTab);
                  if (!opt) return currentLabel;
                  const Icon = opt.icon;
                  return <><Icon className="h-4 w-4" />{opt.label}</>;
                })()}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <SelectItem key={opt.value} value={opt.value}>
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Content — renders the selected product type */}
      {activeSubTab === 'products' && (
        <ProductsManagement defaultProductType="simple" showSalesFields={true} />
      )}
      {activeSubTab === 'raw-materials' && (
        <ProductsManagement defaultProductType="raw_material" showSalesFields={false} />
      )}
      {activeSubTab === 'consumables' && <ConsumablesTab />}
      {activeSubTab === 'supplies' && <SuppliesTab />}
      {activeSubTab === 'pricing-engine' && <PricingEngineTab />}
      {activeSubTab === 'dedup' && <DedupTab />}
    </div>
  );
}

export default ProductsManagementWithTabs;
