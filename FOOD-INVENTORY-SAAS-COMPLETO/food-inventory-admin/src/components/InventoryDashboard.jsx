import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import ProductsManagement from '@/components/ProductsManagement.jsx';
import InventoryManagement from '@/components/InventoryManagement.jsx';
import ComprasManagement from '@/components/ComprasManagement.jsx';

export default function InventoryDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión de Inventario</h2>
        <p className="text-muted-foreground">Administra tus productos, niveles de stock y órdenes de compra.</p>
      </div>
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-2xl">
          <TabsTrigger value="products">Productos</TabsTrigger>
          <TabsTrigger value="inventory">Inventario</TabsTrigger>
          <TabsTrigger value="purchases">Compras</TabsTrigger>
        </TabsList>
        <TabsContent value="products" className="mt-6">
          <ProductsManagement />
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
