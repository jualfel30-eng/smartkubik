import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  createReservation,
  updateReservation,
  checkReservationAvailability,
} from '@/lib/api';
import { toast } from 'sonner';
import { Calendar, Clock, Users, Phone, Mail, AlertCircle, Check } from 'lucide-react';

const ReservationForm = ({ reservation, initialDate, onClose }) => {
  const isEditing = !!reservation;

  const [formData, setFormData] = useState({
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    date: initialDate || '',
    time: '',
    partySize: 2,
    specialRequests: '',
  });

  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    if (reservation) {
      const resDate = new Date(reservation.date);
      setFormData({
        guestName: reservation.guestName || '',
        guestEmail: reservation.guestEmail || '',
        guestPhone: reservation.guestPhone || '',
        date: resDate.toISOString().split('T')[0],
        time: resDate.toTimeString().slice(0, 5),
        partySize: reservation.partySize || 2,
        specialRequests: reservation.specialRequests || '',
      });
    } else if (initialDate) {
      setFormData(prev => ({ ...prev, date: initialDate }));
    }
  }, [reservation, initialDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckAvailability = async () => {
    if (!formData.date || !formData.time || !formData.partySize) {
      toast.error('Completa fecha, hora y número de personas');
      return;
    }

    setCheckingAvailability(true);
    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      const result = await checkReservationAvailability({
        date: dateTime.toISOString(),
        partySize: parseInt(formData.partySize),
      });

      setAvailability(result);

      if (result.available) {
        toast.success('Disponibilidad confirmada');
      } else {
        toast.warning('No disponible en este horario');
      }
    } catch (error) {
      toast.error('Error al verificar disponibilidad', { description: error.message });
      setAvailability(null);
    } finally {
      setCheckingAvailability(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.guestName || !formData.date || !formData.time) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);

    try {
      const dateTime = new Date(`${formData.date}T${formData.time}`);

      const payload = {
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        date: dateTime.toISOString(),
        partySize: parseInt(formData.partySize),
        specialRequests: formData.specialRequests,
      };

      if (isEditing) {
        await updateReservation(reservation._id, payload);
        toast.success('Reserva actualizada');
      } else {
        await createReservation(payload);
        toast.success('Reserva creada exitosamente');
      }

      onClose(true); // Pass true to indicate refresh is needed
    } catch (error) {
      toast.error(isEditing ? 'Error al actualizar' : 'Error al crear reserva', {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Reserva' : 'Nueva Reserva'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los detalles de la reserva'
              : 'Completa el formulario para crear una nueva reserva'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Guest Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Información del Cliente</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestName">
                  Nombre Completo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="guestName"
                  name="guestName"
                  value={formData.guestName}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                />
              </div>

              <div>
                <Label htmlFor="guestPhone">
                  Teléfono <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="guestPhone"
                    name="guestPhone"
                    value={formData.guestPhone}
                    onChange={handleChange}
                    placeholder="+58 412 1234567"
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="guestEmail">Email (opcional)</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="guestEmail"
                  name="guestEmail"
                  type="email"
                  value={formData.guestEmail}
                  onChange={handleChange}
                  placeholder="juan@example.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          {/* Reservation Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Detalles de la Reserva</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="date">
                  Fecha <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="time">
                  Hora <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="time"
                    name="time"
                    type="time"
                    value={formData.time}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="partySize">
                  Personas <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="partySize"
                    name="partySize"
                    type="number"
                    min="1"
                    max="20"
                    value={formData.partySize}
                    onChange={handleChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="specialRequests">Solicitudes Especiales</Label>
              <Textarea
                id="specialRequests"
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                placeholder="Ej: Cumpleaños, alergias, preferencias de ubicación..."
                rows={3}
              />
            </div>
          </div>

          {/* Availability Check */}
          {!isEditing && (
            <div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCheckAvailability}
                disabled={checkingAvailability}
                className="w-full"
              >
                {checkingAvailability ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Verificando...
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Verificar Disponibilidad
                  </>
                )}
              </Button>

              {availability && (
                <Alert className={`mt-4 ${availability.available ? 'border-green-300 bg-green-50' : 'border-yellow-300 bg-yellow-50'}`}>
                  {availability.available ? (
                    <>
                      <Check className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Disponible</strong> - Hay {availability.availableTables} mesa(s) disponible(s) para este horario.
                      </AlertDescription>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-800">
                        <div>
                          <strong>No disponible</strong> en este horario.
                          {availability.alternativeTimes && availability.alternativeTimes.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm">Horarios alternativos:</p>
                              <div className="flex gap-2 mt-1 flex-wrap">
                                {availability.alternativeTimes.slice(0, 3).map((altTime, idx) => (
                                  <Button
                                    key={idx}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const alt = new Date(altTime);
                                      setFormData(prev => ({
                                        ...prev,
                                        time: alt.toTimeString().slice(0, 5),
                                      }));
                                    }}
                                  >
                                    {new Date(altTime).toLocaleTimeString('es-VE', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </>
                  )}
                </Alert>
              )}
            </div>
          )}
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEditing ? 'Actualizando...' : 'Creando...'}
              </>
            ) : (
              <>{isEditing ? 'Actualizar' : 'Crear Reserva'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReservationForm;
