import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Factory, FileText, Settings, GitBranch, Layers, BarChart3, ShieldCheck } from 'lucide-react';
import { ProductionDashboard } from './ProductionDashboard';
import { ManufacturingOrdersList } from './ManufacturingOrdersList';
import { BillOfMaterialsList } from './BillOfMaterialsList';
import { WorkCentersList } from './WorkCentersList';
import { RoutingsList } from './RoutingsList';
import { ProductionVersionsList } from './ProductionVersionsList';
import QualityControlManagement from './quality-control/QualityControlManagement';

const TABS = ['dashboard', 'orders', 'boms', 'workcenters', 'routings', 'versions', 'quality-control'];

export default function ProductionManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab');
  const normalizedTab = TABS.includes(currentTab) ? currentTab : 'dashboard';

  useEffect(() => {
    if (!currentTab || !TABS.includes(currentTab)) {
      setSearchParams({ tab: 'dashboard' }, { replace: true });
    }
  }, [currentTab, setSearchParams]);

  const handleTabChange = (value) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Factory className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Gestión de Producción</CardTitle>
              <CardDescription>
                Administra órdenes de manufactura, listas de materiales, centros de trabajo y rutas de producción
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={normalizedTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2">
                <Factory className="h-4 w-4" />
                <span className="hidden sm:inline">Órdenes</span>
              </TabsTrigger>
              <TabsTrigger value="boms" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">BOMs</span>
              </TabsTrigger>
              <TabsTrigger value="workcenters" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Centros</span>
              </TabsTrigger>
              <TabsTrigger value="routings" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                <span className="hidden sm:inline">Rutas</span>
              </TabsTrigger>
              <TabsTrigger value="versions" className="flex items-center gap-2">
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Versiones</span>
              </TabsTrigger>
              <TabsTrigger value="quality-control" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                <span className="hidden sm:inline">Calidad</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <ProductionDashboard />
            </TabsContent>

            <TabsContent value="orders" className="mt-6">
              <ManufacturingOrdersList />
            </TabsContent>

            <TabsContent value="boms" className="mt-6">
              <BillOfMaterialsList />
            </TabsContent>

            <TabsContent value="workcenters" className="mt-6">
              <WorkCentersList />
            </TabsContent>

            <TabsContent value="routings" className="mt-6">
              <RoutingsList />
            </TabsContent>

            <TabsContent value="versions" className="mt-6">
              <ProductionVersionsList />
            </TabsContent>

            <TabsContent value="quality-control" className="mt-6">
              <QualityControlManagement />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
