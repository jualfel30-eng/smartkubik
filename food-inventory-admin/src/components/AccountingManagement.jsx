import React from 'react';
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
import {
  FileText,
  BookOpen,
  Landmark,
  BarChart3,
  Settings2,
} from 'lucide-react';
import JournalEntriesView from './JournalEntriesView';
import ChartOfAccountsView from './ChartOfAccountsView';
import ProfitLossView from './ProfitLossView';
import BalanceSheetView from './BalanceSheetView';
import ElectronicInvoicesManager from './accounting/ElectronicInvoicesManager';
import BillingComplianceDashboard from './accounting/BillingComplianceDashboard';
import IvaDeclarationWizard from './accounting/IvaDeclarationWizard';
import IvaSalesBook from './accounting/IvaSalesBook';
import TrialBalance from './accounting/TrialBalance';
import GeneralLedger from './accounting/GeneralLedger';
import IslrWithholdingList from './accounting/IslrWithholdingList';
import AccountingPeriods from './accounting/AccountingPeriods';
import RecurringEntries from './accounting/RecurringEntries';

// Definición de grupos y sus sub-pestañas
const TAB_GROUPS = [
  {
    id: 'facturacion',
    label: 'Facturación',
    icon: FileText,
    tabs: [
      { id: 'electronic-invoices', label: 'Facturación Electrónica' },
    ],
  },
  {
    id: 'libros',
    label: 'Libros Contables',
    icon: BookOpen,
    tabs: [
      { id: 'journal', label: 'Libro Diario' },
      { id: 'general-ledger', label: 'Libro Mayor' },
      { id: 'sales-book', label: 'Libro de Ventas' },
    ],
  },
  {
    id: 'fiscal',
    label: 'Fiscal',
    icon: Landmark,
    tabs: [
      { id: 'iva-declaration', label: 'Declaración IVA' },
      { id: 'islr-withholding', label: 'Retenciones ISLR' },
      { id: 'billing-dashboard', label: 'Integración Contable' },
    ],
  },
  {
    id: 'estados',
    label: 'Estados Financieros',
    icon: BarChart3,
    tabs: [
      { id: 'trial-balance', label: 'Bal. Comprobación' },
      { id: 'profit-loss', label: 'Estado de Resultados' },
      { id: 'balance-sheet', label: 'Balance General' },
      { id: 'reports', label: 'Informes' },
    ],
  },
  {
    id: 'config',
    label: 'Configuración',
    icon: Settings2,
    tabs: [
      { id: 'chart-of-accounts', label: 'Plan de Cuentas' },
      { id: 'periods', label: 'Períodos' },
      { id: 'recurring-entries', label: 'Asientos Recurrentes' },
    ],
  },
];

// Mapa plano: tabId → groupId (para resolver grupo desde URL ?tab=xxx)
const TAB_TO_GROUP = {};
for (const group of TAB_GROUPS) {
  for (const tab of group.tabs) {
    TAB_TO_GROUP[tab.id] = group.id;
  }
}

// Tailwind requires static class names — map column counts explicitly
const GRID_COLS = {
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

const DEFAULT_TAB = 'journal';

const AccountingManagement = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Derivar tab activo desde la URL (backward-compatible)
  const activeTab = searchParams.get('tab') || DEFAULT_TAB;
  const activeGroup = TAB_TO_GROUP[activeTab] || 'libros';

  const handleGroupChange = (groupId) => {
    const group = TAB_GROUPS.find((g) => g.id === groupId);
    if (group) {
      // Navegar a la primera sub-pestaña del grupo
      setSearchParams({ tab: group.tabs[0].id }, { replace: true });
    }
  };

  const handleSubTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contabilidad General (GL)</h1>
        <p className="text-muted-foreground">
          Gestiona el libro diario, plan de cuentas y genera estados financieros de tu empresa.
        </p>
      </div>

      {/* Nivel 1: Grupos principales */}
      <Tabs value={activeGroup} onValueChange={handleGroupChange}>
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 max-w-4xl">
          {TAB_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <TabsTrigger key={group.id} value={group.id} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{group.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Nivel 2: Sub-pestañas del grupo activo */}
        {TAB_GROUPS.map((group) => (
          <TabsContent key={group.id} value={group.id} className="mt-4">
            <Tabs value={activeTab} onValueChange={handleSubTabChange}>
              {group.tabs.length > 1 && (
                <TabsList className={`grid w-full ${GRID_COLS[group.tabs.length] || 'grid-cols-3'} max-w-4xl mb-4`}>
                  {group.tabs.map((tab) => (
                    <TabsTrigger key={tab.id} value={tab.id}>
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              )}

              {/* Facturación */}
              <TabsContent value="electronic-invoices" className="space-y-4">
                <ElectronicInvoicesManager />
              </TabsContent>

              {/* Libros Contables */}
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
              <TabsContent value="general-ledger">
                <GeneralLedger />
              </TabsContent>
              <TabsContent value="sales-book">
                <IvaSalesBook />
              </TabsContent>

              {/* Fiscal */}
              <TabsContent value="iva-declaration">
                <IvaDeclarationWizard />
              </TabsContent>
              <TabsContent value="islr-withholding">
                <IslrWithholdingList />
              </TabsContent>
              <TabsContent value="billing-dashboard">
                <BillingComplianceDashboard />
              </TabsContent>

              {/* Estados Financieros */}
              <TabsContent value="trial-balance">
                <TrialBalance />
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

              {/* Configuración */}
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
              <TabsContent value="periods">
                <AccountingPeriods />
              </TabsContent>
              <TabsContent value="recurring-entries">
                <RecurringEntries />
              </TabsContent>
            </Tabs>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default AccountingManagement;
