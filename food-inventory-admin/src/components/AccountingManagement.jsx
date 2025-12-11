import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card.jsx';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from './ui/button';
import JournalEntriesView from './JournalEntriesView';
import ChartOfAccountsView from './ChartOfAccountsView';
import ProfitLossView from './ProfitLossView';
import BalanceSheetView from './BalanceSheetView';
import BillingComplianceDashboard from './accounting/BillingComplianceDashboard';

const AccountingManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'journal');

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contabilidad General (GL)</CardTitle>
        <CardDescription>
          Gestiona el libro diario, plan de cuentas y genera estados financieros de tu empresa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid h-auto w-full grid-cols-3 md:h-10 md:grid-cols-6">
            <TabsTrigger value="journal">Libro Diario</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Plan de Cuentas</TabsTrigger>
            <TabsTrigger value="billing-compliance">Billing Integration</TabsTrigger>
            <TabsTrigger value="profit-loss">Estado de Resultados</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance General</TabsTrigger>
            <TabsTrigger value="reports">Informes</TabsTrigger>
          </TabsList>
          <TabsContent value="journal">
            <Card>
              <CardHeader>
                <CardTitle>Libro Diario</CardTitle>
                <CardDescription>Lista de todos los asientos contables registrados en el sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <JournalEntriesView />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="chart-of-accounts">
            <Card>
              <CardHeader>
                <CardTitle>Plan de Cuentas</CardTitle>
                <CardDescription>Lista de todas las cuentas disponibles en el sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartOfAccountsView />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="billing-compliance">
            <BillingComplianceDashboard />
          </TabsContent>
          <TabsContent value="profit-loss">
            <Card>
              <CardHeader>
                <CardTitle>Estado de Resultados (P&G)</CardTitle>
                <CardDescription>Genere un reporte de pérdidas y ganancias para un período específico.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfitLossView />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="balance-sheet">
            <Card>
              <CardHeader>
                <CardTitle>Balance General</CardTitle>
                <CardDescription>Muestra la posición financiera de la empresa en una fecha específica.</CardDescription>
              </CardHeader>
              <CardContent>
                <BalanceSheetView />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Informes Financieros</CardTitle>
                <CardDescription>Selecciona un informe para visualizar.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Antigüedad de Cuentas por Cobrar</CardTitle>
                    <CardDescription>
                      Analiza los saldos pendientes de tus clientes y su antigüedad.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Link to="/accounting/reports/accounts-receivable">
                      <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white">Ver Informe</Button>
                    </Link>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccountingManagement;
