import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import ProductsManagementWithTabs from '@/components/ProductsManagementWithTabs.jsx';
import InventoryManagement from '@/components/InventoryManagement.jsx';
import ComprasManagement from '@/components/ComprasManagement.jsx';
import WarehouseManagement from '@/components/WarehouseManagement.jsx';
import InventoryMovementsPanel from '@/components/InventoryMovementsPanel.jsx';
import InventoryAlertsPanel from '@/components/InventoryAlertsPanel.jsx';
import InventoryStockSummary from '@/components/InventoryStockSummary.jsx';
import { useFeatureFlags } from '@/hooks/use-feature-flags.jsx';

export default function InventoryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');
  const { flags } = useFeatureFlags();
  const multiWarehouseEnabled = flags.MULTI_WAREHOUSE;

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  // Determinar qué tab superior mostrar basado en el tab actual
  const getMainTab = () => {
    if (['products', 'consumables', 'supplies', 'pricing-engine'].includes(activeTab)) {
      return 'products';
    }
    if (
      [
        'inventory',
        'inventory-movements',
        'inventory-alerts',
        'inventory-warehouses',
        'warehouses',
      ].includes(activeTab)
    ) {
      return 'inventory';
    }
    return activeTab || 'products';
  };

  const inventorySubTabs = [
    'inventory',
    'inventory-movements',
    'inventory-alerts',
    ...(multiWarehouseEnabled ? ['inventory-warehouses'] : []),
  ];

  const getInventoryTab = () => {
    if (activeTab === 'warehouses') {
      return multiWarehouseEnabled ? 'inventory-warehouses' : 'inventory';
    }
    if (inventorySubTabs.includes(activeTab)) {
      return activeTab;
    }
    return 'inventory';
  };

  const activeInventoryTab = getInventoryTab();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión de Inventario</h2>
        <p className="text-muted-foreground">Administra tus productos, niveles de stock y órdenes de compra.</p>
      </div>
      <Tabs value={getMainTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-3xl">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsManagementWithTabs activeSubTab={activeTab} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-6">
          <Tabs value={activeInventoryTab} onValueChange={handleTabChange} className="w-full">
            <TabsList
              className={`grid w-full ${multiWarehouseEnabled ? 'grid-cols-4' : 'grid-cols-3'} max-w-4xl`}
            >
              <TabsTrigger value="inventory">Inventario</TabsTrigger>
              {multiWarehouseEnabled && <TabsTrigger value="inventory-warehouses">Almacenes</TabsTrigger>}
              <TabsTrigger value="inventory-movements">Movimientos de Inventario</TabsTrigger>
              <TabsTrigger value="inventory-alerts">Alertas de Stock</TabsTrigger>
            </TabsList>

            <TabsContent value="inventory" className="mt-6">
              <InventoryManagement />
            </TabsContent>
            <TabsContent value="inventory-movements" className="mt-6">
              <InventoryMovementsPanel />
            </TabsContent>
            <TabsContent value="inventory-alerts" className="mt-6">
              <InventoryAlertsPanel />
            </TabsContent>
            {multiWarehouseEnabled && (
              <TabsContent value="inventory-warehouses" className="mt-6">
                <div className="space-y-6">
                  <WarehouseManagement />
                  <InventoryStockSummary />
                </div>
              </TabsContent>
            )}
          </Tabs>
        </TabsContent>
        <TabsContent value="purchases" className="mt-6">
          <ComprasManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
