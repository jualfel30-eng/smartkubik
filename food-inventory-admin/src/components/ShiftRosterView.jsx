
import React, { useState, useEffect } from "react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Plus, Check, Clock, AlertCircle } from "lucide-react";
import { fetchApi } from "@/lib/api";
import { toast } from "sonner"; // Assuming sonner or use your toast provider
import { ShiftDialogContent } from "./ShiftDialogContent";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export default function ShiftRosterView() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [shifts, setShifts] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showShiftDialog, setShowShiftDialog] = useState(false);
    const [selectedShift, setSelectedShift] = useState(null);
    const [newShiftDefaults, setNewShiftDefaults] = useState(null);

    // Helper to get week dates
    const getWeekDates = (date) => {
        const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
        return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
    };
    const weekDates = getWeekDates(currentDate);

    // Fetch Data
    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Employees (Resources)
            const employeesRes = await fetchApi("/payroll/employees?limit=100");

            // Handle different response structures for employees
            const employeesList = Array.isArray(employeesRes.data)
                ? employeesRes.data
                : Array.isArray(employeesRes?.data?.data)
                    ? employeesRes.data.data
                    : employeesRes?.employees || [];

            if (employeesList) setUsers(employeesList);

            // Fetch Shifts for the week
            const start = weekDates[0].toISOString();
            const end = weekDates[6].toISOString();
            const shiftsRes = await fetchApi(`/shifts/roster?start=${start}&end=${end}`);
            if (shiftsRes.success) setShifts(shiftsRes.data);

        } catch (error) {
            console.error("Error fetching roster data:", error);
            toast.error("Error al cargar el planificador");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate]);

    // Actions
    const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
    const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
    const handleToday = () => setCurrentDate(new Date());

    const handleCreateShift = (user, day) => {
        // Pre-fill dialog with User and Date
        setSelectedShift(null);
        setNewShiftDefaults({
            userId: user._id,
            date: day
        });
        setShowShiftDialog(true);
    };

    const handleEditShift = (shift) => {
        setSelectedShift(shift);
        setNewShiftDefaults(null);
        setShowShiftDialog(true);
    };

    const handlePublishWeek = async () => {
        // Find all draft shifts in current view
        const draftShiftIds = shifts
            .filter(s => s.status === 'draft')
            .map(s => s._id);

        if (draftShiftIds.length === 0) {
            toast.info("No hay turnos en borrador para publicar esta semana");
            return;
        }

        try {
            const res = await fetchApi("/shifts/publish", {
                method: "POST",
                body: JSON.stringify({ shiftIds: draftShiftIds }),
            });
            if (res.success) {
                toast.success(`${draftShiftIds.length} turnos publicados exitosamente`);
                fetchData();
            }
        } catch (error) {
            console.error("Error publishing shifts:", error);
            toast.error("Error al publicar turnos");
        }
    };

    // Status Badge Helper
    const getStatusBadge = (status) => {
        switch (status) {
            case 'published': return <Badge variant="default" className="bg-green-600 h-1.5 w-1.5 p-0 rounded-full" title="Publicado" />;
            case 'draft': return <Badge variant="outline" className="bg-gray-400 h-1.5 w-1.5 p-0 rounded-full border-none" title="Borrador" />;
            case 'in-progress': return <Badge variant="default" className="bg-blue-500 h-1.5 w-1.5 p-0 rounded-full animate-pulse" title="En curso" />;
            default: return null;
        }
    };

    return (
        <div className="h-full flex flex-col gap-4 p-4 dark:text-gray-100">
            {/* Header Controls */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrevWeek}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="font-semibold text-lg min-w-[200px] text-center capitalize">
                        {format(weekDates[0], 'MMMM yyyy', { locale: es })}
                    </span>
                    <Button variant="outline" size="sm" onClick={handleNextWeek}><ChevronRight className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={handleToday}>Hoy</Button>
                </div>

                <div className="flex gap-2">
                    <Button onClick={handlePublishWeek} className="bg-green-600 hover:bg-green-700 text-white">
                        <Check className="h-4 w-4 mr-2" />
                        Publicar Semana
                    </Button>
                </div>
            </div>

            {/* Roster Grid */}
            <div className="border rounded-lg overflow-hidden flex-1 bg-white dark:bg-gray-900 shadow-sm overflow-x-auto">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                        <tr>
                            <th className="p-3 border-b border-r bg-gray-50 dark:bg-gray-800 w-[200px] sticky left-0 z-10 text-left font-medium text-gray-500">
                                Empleado
                            </th>
                            {weekDates.map((day, i) => (
                                <th key={i} className={`p-3 border-b border-r bg-gray-50 dark:bg-gray-800 min-w-[120px] text-center ${isSameDay(day, new Date()) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <div className="text-xs text-gray-500 uppercase">{format(day, 'EEE', { locale: es })}</div>
                                    <div className={`text-lg font-bold ${isSameDay(day, new Date()) ? 'text-blue-600' : ''}`}>
                                        {format(day, 'd')}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={8} className="p-8 text-center text-gray-500">Cargando turnos...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={8} className="p-8 text-center text-gray-500">No hay empleados registrados</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user._id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    {/* User Column */}
                                    <td className="p-3 border-b border-r bg-white dark:bg-gray-900 sticky left-0 z-10 group-hover:bg-gray-50 dark:group-hover:bg-gray-800/50">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={user.customerId?.avatar} />
                                                <AvatarFallback>{user.customerId?.name?.substring(0, 2).toUpperCase() || user.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="font-medium text-sm leading-none">{user.customerId?.name || user.name}</div>
                                                <div className="text-xs text-muted-foreground">{user.position}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Days Columns */}
                                    {weekDates.map((day, i) => {
                                        // Find shifts for this user on this day
                                        const dayShifts = shifts.filter(s => {
                                            const shiftEmpId = s.employeeId?._id || s.employeeId;
                                            const shiftUserId = s.userId?._id || s.userId;
                                            const targetId = user._id; // Employee Profile ID

                                            // Match against employeeId (preferred) or userId (legacy/fallback)
                                            const matchesEmployee = shiftEmpId === targetId;
                                            const matchesUser = shiftUserId === targetId;

                                            return (matchesEmployee || matchesUser) && isSameDay(new Date(s.scheduledStart), day);
                                        });

                                        return (
                                            <td key={i} className="p-1 border-b border-r relative h-[80px] align-top">
                                                {/* Hover Add Button */}
                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-opacity flex items-center justify-center z-0 pointer-events-none">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 rounded-full pointer-events-auto"
                                                        onClick={() => handleCreateShift(user, day)}
                                                    >
                                                        <Plus className="h-4 w-4 text-gray-400" />
                                                    </Button>
                                                </div>

                                                {/* Shifts List */}
                                                <div className="relative z-1 space-y-1">
                                                    {dayShifts.map(shift => (
                                                        <div
                                                            key={shift._id}
                                                            onClick={() => handleEditShift(shift)}
                                                            className={`
                                cursor-pointer rounded p-1.5 text-xs border shadow-sm hover:shadow-md transition-all
                                ${shift.status === 'draft' ? 'bg-gray-100 dark:bg-gray-800 border-dashed border-gray-300 dark:border-gray-600 opacity-80' : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'}
                              `}
                                                        >
                                                            <div className="flex justify-between items-start mb-0.5">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-200">
                                                                    {format(new Date(shift.scheduledStart), 'HH:mm')} - {format(new Date(shift.scheduledEnd), 'HH:mm')}
                                                                </span>
                                                                {getStatusBadge(shift.status)}
                                                            </div>
                                                            {shift.role && <div className="text-[10px] text-gray-500 truncate">{shift.role}</div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Sheet open={showShiftDialog} onOpenChange={setShowShiftDialog}>
                <SheetContent className="w-full sm:max-w-md overflow-y-auto dark:bg-gray-900 dark:border-gray-800 p-6">
                    <SheetHeader>
                        <SheetTitle>
                            {selectedShift ? "Editar Turno" : "Programar Turno"}
                        </SheetTitle>
                        <SheetDescription>
                            {selectedShift ? "Modifica los detalles del turno existente." : "Asigna un nuevo turno a un empleado."}
                        </SheetDescription>
                    </SheetHeader>
                    <div className="mt-4">
                        <ShiftDialogContent
                            event={selectedShift}
                            defaultValues={newShiftDefaults}
                            onClose={() => setShowShiftDialog(false)}
                            onSave={() => {
                                fetchData();
                                setShowShiftDialog(false);
                            }}
                            preloadedEmployees={users}
                        />
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
