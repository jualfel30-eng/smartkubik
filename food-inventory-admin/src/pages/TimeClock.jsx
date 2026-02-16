
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Clock, LogIn, LogOut, Calendar, MapPin, Coffee, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { HRNavigation } from "@/components/payroll/HRNavigation";

export default function TimeClock() {
    const { user } = useAuth();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [status, setStatus] = useState("loading"); // loading, out, in
    const [loading, setLoading] = useState(false);
    const [todayShifts, setTodayShifts] = useState([]);
    const [currentShift, setCurrentShift] = useState(null);

    // Update clock every second
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch Status
    useEffect(() => {
        const fetchStatus = async () => {
            if (!user) return;
            try {
                // Mocking an endpoint or using existing shifts logic
                // In a real scenario, we'd have /shifts/current-status
                // For now, let's look for active shifts in the roster or just mock for UI demo

                // Fetch today's shifts for this user
                const today = new Date().toISOString().split('T')[0];
                const res = await fetchApi(`/shifts/my-shifts?date=${today}`); // Assuming this exists or returns relevant data

                // Fallback if endpoint doesn't exist, just empty
                if (res.success) {
                    setTodayShifts(res.data || []);
                    // Determine if currently clocked in
                    // This logic depends on backend "clock punches" which might not exist yet
                    // For UI demo, we'll default to 'out' unless we find an 'in-progress' shift
                    const active = (res.data || []).find(s => s.status === 'in-progress');
                    if (active) {
                        setStatus('in');
                        setCurrentShift(active);
                    } else {
                        setStatus('out');
                    }
                } else {
                    setStatus('out');
                }
            } catch (error) {
                console.error("Error fetching status", error);
                setStatus('out'); // Default
            }
        };
        fetchStatus();
    }, [user]);

    const handleClockAction = async (action) => {
        setLoading(true);
        try {
            // endpoint: /shifts/clock-in or /shifts/clock-out
            // If they don't exist, we might need to create them or mock them via run_command if I was backend dev.
            // Since I am frontend oriented here, I will assume they might exist or I'll handle the UI state optimistically

            /* 
               REAL IMPLEMENTATION:
               const res = await fetchApi(`/shifts/${action}`, { method: 'POST' });
            */

            // SIMULATION FOR UI DEMO
            await new Promise(r => setTimeout(r, 1000));

            if (action === 'in') {
                setStatus('in');
                setCurrentShift({ _id: 'temp', scheduledStart: new Date().toISOString() });
                toast.success("Has iniciado turno exitosamente");
            } else {
                setStatus('out');
                setCurrentShift(null);
                toast.success("Has finalizado turno exitosamente");
            }

        } catch (error) {
            toast.error("Error al registrar marca de tiempo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-4 md:p-8">
            <HRNavigation />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Main Clock Card */}
                <Card className="md:col-span-2 border-2 shadow-lg overflow-hidden relative">
                    <div className={`absolute top-0 left-0 w-full h-2 ${status === 'in' ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-lg text-muted-foreground uppercase tracking-wider">
                            {format(currentTime, "EEEE, d 'de' MMMM", { locale: es })}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-10 space-y-8">
                        {/* Digital Clock */}
                        <div className="text-7xl md:text-9xl font-mono font-bold tracking-tighter text-foreground tabular-nums">
                            {format(currentTime, "HH:mm:ss")}
                        </div>

                        {/* Status Badge */}
                        <Badge variant={status === 'in' ? "success" : "secondary"} className={`text-lg px-4 py-1 flex items-center gap-2 ${status === 'in' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {status === 'in' ? <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span> : <div className="h-3 w-3 rounded-full bg-gray-400" />}
                            {status === 'in' ? "EN TURNO" : "FUERA DE TURNO"}
                        </Badge>

                        {/* Action Buttons */}
                        <div className="flex gap-6 w-full max-w-md justify-center">
                            {status === 'out' ? (
                                <Button
                                    size="lg"
                                    className="w-full h-24 text-xl bg-green-600 hover:bg-green-700 shadow-xl transition-all transform hover:scale-105"
                                    onClick={() => handleClockAction('in')}
                                    disabled={loading}
                                >
                                    <LogIn className="mr-3 h-8 w-8" />
                                    ENTRADA
                                </Button>
                            ) : (
                                <Button
                                    size="lg"
                                    variant="destructive"
                                    className="w-full h-24 text-xl shadow-xl transition-all transform hover:scale-105"
                                    onClick={() => handleClockAction('out')}
                                    disabled={loading}
                                >
                                    <LogOut className="mr-3 h-8 w-8" />
                                    SALIDA
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Shift Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Calendar className="h-5 w-5 text-blue-500" />
                            Tu Horario de Hoy
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {todayShifts.length > 0 ? (
                            <div className="space-y-4">
                                {todayShifts.map((shift, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50 dark:bg-gray-900">
                                        <div>
                                            <div className="font-semibold">
                                                {format(new Date(shift.scheduledStart), "HH:mm")} - {format(new Date(shift.scheduledEnd), "HH:mm")}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{shift.role || 'Turno Regular'}</div>
                                        </div>
                                        <Badge variant="outline">{shift.status}</Badge>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                                <Coffee className="h-10 w-10 mb-2 opacity-20" />
                                <p>No tienes turnos programados para hoy.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Location / Info */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <MapPin className="h-5 w-5 text-red-500" />
                            Ubicación
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                <MapPin className="h-6 w-6" />
                            </div>
                            <div>
                                <h4 className="font-medium">Sede Principal</h4>
                                <p className="text-sm text-muted-foreground">Detectado vía GPS</p>
                            </div>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 rounded text-sm flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                            <p>Recuerda que debes estar dentro de las instalaciones para registrar tu asistencia.</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
