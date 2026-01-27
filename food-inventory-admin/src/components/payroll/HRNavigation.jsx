import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function HRNavigation() {
    const location = useLocation();
    const navigate = useNavigate();

    // Mapping routes to tab values
    const getTabValue = () => {
        const path = location.pathname;
        if (path.includes('/payroll/employees')) return 'employees';
        if (path.includes('/hr/shifts')) return 'shifts';
        if (path.includes('/fichar') || path.includes('/hr/time-clock')) return 'clock';
        if (path.includes('/payroll/runs')) return 'runs';
        if (path.includes('/payroll/structures')) return 'structures';
        if (path.includes('/payroll/calendar')) return 'calendar';
        if (path.includes('/payroll/absences')) return 'absences';
        return 'employees';
    };

    const handleTabChange = (value) => {
        switch (value) {
            case 'employees': navigate('/payroll/employees'); break;
            case 'shifts': navigate('/hr/shifts'); break;
            case 'clock': navigate('/fichar'); break;
            case 'runs': navigate('/payroll/runs'); break;
            case 'structures': navigate('/payroll/structures'); break;
            case 'calendar': navigate('/payroll/calendar'); break;
            case 'absences': navigate('/payroll/absences'); break;
            default: navigate('/payroll/employees');
        }
    };

    return (
        <div className="mb-6">
            <Tabs value={getTabValue()} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 max-w-[1000px]">
                    <TabsTrigger value="employees">Empleados</TabsTrigger>
                    <TabsTrigger value="shifts">Turnos</TabsTrigger>
                    <TabsTrigger value="clock">Fichar</TabsTrigger>
                    <TabsTrigger value="absences">Ausencias</TabsTrigger>
                    <TabsTrigger value="runs">Nóminas</TabsTrigger>
                    <TabsTrigger value="calendar">Calendario</TabsTrigger>
                    <TabsTrigger value="structures">Estructuras</TabsTrigger>
                </TabsList>
            </Tabs>
        </div>
    );
}
