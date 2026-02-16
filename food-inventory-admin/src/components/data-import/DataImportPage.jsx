import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, History } from 'lucide-react';
import DataImportWizard from './DataImportWizard';
import ImportHistory from './ImportHistory';

export default function DataImportPage() {
  const [activeTab, setActiveTab] = useState('wizard');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Importar Datos</h1>
        <p className="text-muted-foreground">
          Importe productos, clientes, proveedores, inventario y categorías desde archivos CSV o Excel
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="wizard" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Nueva Importación
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="wizard">
          <DataImportWizard onGoToHistory={() => setActiveTab('history')} />
        </TabsContent>

        <TabsContent value="history">
          <ImportHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
