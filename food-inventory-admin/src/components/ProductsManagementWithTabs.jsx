import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import ProductsManagement from '@/components/ProductsManagement.jsx';
import ConsumablesTab from '@/components/ConsumablesTab.jsx';
import SuppliesTab from '@/components/SuppliesTab.jsx';
import PricingEngineTab from '@/components/PricingEngineTab.jsx';
import { Package, Layers, Wrench, Calculator } from 'lucide-react';

/**
 * ProductsManagementWithTabs
 *
 * Wrapper component that provides a tabbed interface for:
 * - Products Management (existing functionality)
 * - Consumables Configuration
 * - Supplies Management
 * - Products Pricing Engine (New)
 */
function ProductsManagementWithTabs({ activeSubTab = 'products' }) {
  const [, setSearchParams] = useSearchParams();

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab }, { replace: true });
  };

  return (
    <Tabs value={activeSubTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="products" className="gap-2">
          <Package className="h-4 w-4" />
          Productos
        </TabsTrigger>
        <TabsTrigger value="consumables" className="gap-2">
          <Layers className="h-4 w-4" />
          Consumibles
        </TabsTrigger>
        <TabsTrigger value="supplies" className="gap-2">
          <Wrench className="h-4 w-4" />
          Suministros
        </TabsTrigger>
        <TabsTrigger value="pricing-engine" className="gap-2">
          <Calculator className="h-4 w-4" />
          Motor de Precios
        </TabsTrigger>
      </TabsList>

      <TabsContent value="products">
        <ProductsManagement />
      </TabsContent>

      <TabsContent value="consumables">
        <ConsumablesTab />
      </TabsContent>

      <TabsContent value="supplies">
        <SuppliesTab />
      </TabsContent>

      <TabsContent value="pricing-engine">
        <PricingEngineTab />
      </TabsContent>
    </Tabs>
  );
}

export default ProductsManagementWithTabs;
