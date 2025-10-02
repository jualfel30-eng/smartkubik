import React from 'react';
import { Link } from 'react-router-dom';
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

const AccountingManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Módulo de Contabilidad</CardTitle>
        <CardDescription>
          Aquí puedes ver los registros contables, gestionar el plan de cuentas y generar informes.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="journal">
          <TabsList className="grid h-auto w-full grid-cols-3 md:h-10 md:grid-cols-5">
            <TabsTrigger value="journal">Libro Diario</TabsTrigger>
            <TabsTrigger value="chart-of-accounts">Plan de Cuentas</TabsTrigger>
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