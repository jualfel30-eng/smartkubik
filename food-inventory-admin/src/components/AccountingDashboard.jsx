import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import PayablesManagement from '@/components/PayablesManagement.jsx';
import AccountingManagement from '@/components/AccountingManagement.jsx';

export default function AccountingDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('section') || 'payables');

  // Sincronizar activeTab con searchParams cuando cambia la URL
  useEffect(() => {
    const sectionFromUrl = searchParams.get('section');
    if (sectionFromUrl && sectionFromUrl !== activeTab) {
      setActiveTab(sectionFromUrl);
    }
  }, [searchParams, activeTab]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    const newParams = { section: newTab };
    // Preservar el parámetro 'tab' si existe (para sub-pestañas)
    const currentSubTab = searchParams.get('tab');
    if (currentSubTab) {
      newParams.tab = currentSubTab;
    }
    setSearchParams(newParams, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión Contable</h2>
        <p className="text-muted-foreground">Administra tus cuentas por pagar y accede a los reportes contables.</p>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-2xl">
          <TabsTrigger value="payables">Pagos</TabsTrigger>
          <TabsTrigger value="accounting">Contabilidad General</TabsTrigger>
        </TabsList>
        <TabsContent value="payables" className="mt-6">
          <PayablesManagement />
        </TabsContent>
        <TabsContent value="accounting" className="mt-6">
          <AccountingManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
