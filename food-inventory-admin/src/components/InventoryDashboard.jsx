import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import ProductsManagementWithTabs from '@/components/ProductsManagementWithTabs.jsx';
import InventoryManagement from '@/components/InventoryManagement.jsx';
import ComprasManagement from '@/components/ComprasManagement.jsx';

export default function InventoryDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'products');

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };

  // Determinar qué tab superior mostrar basado en el tab actual
  const getMainTab = () => {
    if (['products', 'consumables', 'supplies'].includes(activeTab)) {
      return 'products';
    }
    return activeTab;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión de Inventario</h2>
        <p className="text-muted-foreground">Administra tus productos, niveles de stock y órdenes de compra.</p>
      </div>
      <Tabs value={getMainTab()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsManagementWithTabs activeSubTab={activeTab} />
        </TabsContent>
        <TabsContent value="inventory" className="mt-6">
          <InventoryManagement />
        </TabsContent>
        <TabsContent value="purchases" className="mt-6">
          <ComprasManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
