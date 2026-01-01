import ShiftRosterView from './ShiftRosterView';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { HRNavigation } from '@/components/payroll/HRNavigation.jsx';

export function ShiftManagement() {
    return (
        <div className="space-y-6">
            <HRNavigation />
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestión de Turnos y Asistencias</h2>
                    <p className="text-muted-foreground">
                        Planifica los turnos de los empleados y monitorea su asistencia.
                    </p>
                </div>
            </div>

            <div className="h-[calc(100vh-12rem)]">
                <ShiftRosterView />
            </div>
        </div>
    );
}

export default ShiftManagement;
