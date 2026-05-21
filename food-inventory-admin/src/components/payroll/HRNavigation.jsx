import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

const CONFIG_LINKS = [
  { label: 'Estructuras de nómina', route: '/payroll/structures' },
  { label: 'Calendario de pagos', route: '/payroll/calendar' },
];

export function HRNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  const getTabValue = () => {
    const path = location.pathname;
    if (path.includes('/payroll/today')) return 'today';
    if (path.includes('/payroll/employees')) return 'employees';
    if (path.includes('/hr/asistencia') || path.includes('/hr/shifts') || path.includes('/payroll/absences')) return 'asistencia';
    if (path.includes('/payroll/runs')) return 'runs';
    return 'today';
  };

  const handleTabChange = (value) => {
    switch (value) {
      case 'today': navigate('/payroll/today'); break;
      case 'employees': navigate('/payroll/employees'); break;
      case 'asistencia': navigate('/hr/asistencia'); break;
      case 'runs': navigate('/payroll/runs'); break;
    }
  };

  return (
    <div className="mb-6 flex items-center gap-2">
      <Tabs value={getTabValue()} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 max-w-[700px]">
          <TabsTrigger value="today">Hoy</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="runs">Nóminas</TabsTrigger>
        </TabsList>
      </Tabs>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0" title="Configuración">
            <Settings size={16} />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-52 p-1">
          {CONFIG_LINKS.map(({ label, route }) => (
            <button
              key={route}
              className="w-full text-left text-sm px-3 py-2 rounded hover:bg-muted transition-colors"
              onClick={() => navigate(route)}
            >
              {label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
