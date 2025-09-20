import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import PayablesManagement from '@/components/PayablesManagement.jsx';
import AccountingManagement from '@/components/AccountingManagement.jsx';

export default function AccountingDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Gestión Contable</h2>
        <p className="text-muted-foreground">Administra tus cuentas por pagar y accede a los reportes contables.</p>
      </div>
      <Tabs defaultValue="payables" className="w-full">
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
