import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldCheck, FileText, AlertTriangle, Award, BarChart3 } from 'lucide-react';
import { QCPlansList } from './QCPlansList';
import { InspectionsList } from './InspectionsList';
import { NonConformancesList } from './NonConformancesList';
import { QualityControlDashboard } from './QualityControlDashboard';

const TABS = ['dashboard', 'plans', 'inspections', 'non-conformances'];

export default function QualityControlManagement() {
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
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <CardTitle className="text-2xl">Control de Calidad</CardTitle>
              <CardDescription>
                Administra planes de QC, inspecciones, no conformidades y certificados de análisis
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={normalizedTab} onValueChange={handleTabChange}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Planes QC</span>
              </TabsTrigger>
              <TabsTrigger value="inspections" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                <span className="hidden sm:inline">Inspecciones</span>
              </TabsTrigger>
              <TabsTrigger value="non-conformances" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:inline">No Conformidades</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <QualityControlDashboard />
            </TabsContent>

            <TabsContent value="plans" className="mt-6">
              <QCPlansList />
            </TabsContent>

            <TabsContent value="inspections" className="mt-6">
              <InspectionsList />
            </TabsContent>

            <TabsContent value="non-conformances" className="mt-6">
              <NonConformancesList />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
