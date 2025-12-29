import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Settings } from 'lucide-react';
import { CalendarView } from './CalendarView';
import { CalendarManagement } from './CalendarManagement';

export function CalendarModule() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const tabFromUrl = searchParams.get('tab') || 'calendar';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Calendario y Eventos</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona eventos, tareas y calendarios con permisos personalizados por departamento
          </p>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            navigate(`/calendar?tab=${value}`);
          }}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="calendar" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Calendario</span>
            </TabsTrigger>
            <TabsTrigger value="management" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span>Configuración</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="mt-6">
            <CalendarView />
          </TabsContent>

          <TabsContent value="management" className="mt-6">
            <CalendarManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
