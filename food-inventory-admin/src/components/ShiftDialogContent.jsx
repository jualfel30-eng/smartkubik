import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export function ShiftDialogContent({ event, defaultValues, onClose, onSave }) {
    const [formData, setFormData] = useState({
        userId: '',
        scheduledStart: '',
        scheduledEnd: '',
        notes: ''
    });
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (event) {
            setFormData({
                userId: event.userId?._id || event.userId || '',
                scheduledStart: event.scheduledStart ? new Date(event.scheduledStart).toISOString().slice(0, 16) : '',
                scheduledEnd: event.scheduledEnd ? new Date(event.scheduledEnd).toISOString().slice(0, 16) : '',
                notes: event.notes || ''
            });
        } else if (defaultValues) {
            const start = new Date(defaultValues.date);
            start.setHours(9, 0, 0, 0); // Default 9 AM
            const end = new Date(defaultValues.date);
            end.setHours(17, 0, 0, 0); // Default 5 PM

            setFormData({
                userId: defaultValues.userId || '',
                scheduledStart: start.toISOString().slice(0, 16),
                scheduledEnd: end.toISOString().slice(0, 16),
                notes: ''
            });
        }
    }, [event, defaultValues]);

    useEffect(() => {
        const loadEmployees = async () => {
            try {
                const response = await fetchApi('/payroll/employees?limit=100');
                const employeesList = Array.isArray(response.data)
                    ? response.data
                    : Array.isArray(response?.data?.data)
                        ? response.data.data
                        : response?.employees || [];
                setEmployees(employeesList);
            } catch (error) {
                console.error('Error loading employees:', error);
            }
        };
        loadEmployees();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                userId: formData.userId,
                scheduledStart: formData.scheduledStart,
                scheduledEnd: formData.scheduledEnd,
                notes: formData.notes
            };

            if (event?._id) {
                // Assuming we will implement PATCH
                toast.error("Edición de turnos no implementada aún en backend");
            } else {
                await fetchApi('/shifts/schedule', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                toast.success('Turno programado');
            }

            onSave();
            onClose();
        } catch (error) {
            toast.error('Error al guardar turno', { description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <Label>Empleado *</Label>
                    <Select
                        value={formData.userId}
                        onValueChange={(value) => setFormData({ ...formData, userId: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Seleccionar empleado" />
                        </SelectTrigger>
                        <SelectContent>
                            {employees.map((emp) => (
                                <SelectItem key={emp._id} value={emp._id}>
                                    {emp.customer?.name || emp.name || 'Sin nombre'}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label>Inicio *</Label>
                        <Input
                            type="datetime-local"
                            value={formData.scheduledStart}
                            onChange={(e) => setFormData({ ...formData, scheduledStart: e.target.value })}
                            required
                        />
                    </div>
                    <div>
                        <Label>Fin *</Label>
                        <Input
                            type="datetime-local"
                            value={formData.scheduledEnd}
                            onChange={(e) => setFormData({ ...formData, scheduledEnd: e.target.value })}
                            required
                        />
                    </div>
                </div>

                <div>
                    <Label>Notas</Label>
                    <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Instrucciones o detalles del turno..."
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                    {loading ? 'Guardando...' : (event ? 'Actualizar' : 'Crear Turno')}
                </Button>
            </div>
        </form>
    );
}
