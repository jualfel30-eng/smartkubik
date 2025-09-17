import React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import JournalEntriesView from './JournalEntriesView';
import ChartOfAccountsView from './ChartOfAccountsView';
import ProfitLossView from './ProfitLossView';
import BalanceSheetView from './BalanceSheetView';

const AccountingManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulo de Contabilidad</CardTitle>
        <CardDescription>
          Aquí puedes ver los registros contables y gestionar el plan de cuentas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="journal">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="journal">Libro Diario</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Plan de Cuentas</TabsTrigger>
            <TabsTrigger value="profit-loss">Estado de Resultados</TabsTrigger>
            <TabsTrigger value="balance-sheet">Balance General</TabsTrigger>
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
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AccountingManagement;
