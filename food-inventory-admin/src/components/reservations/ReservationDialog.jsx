import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Calendar, Users, Clock, Phone, Mail } from 'lucide-react';

export function ReservationDialog({ reservation, open, onClose, onSave }) {
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [duration, setDuration] = useState('120');
  const [section, setSection] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [occasion, setOccasion] = useState('');
  const [confirmationMethod, setConfirmationMethod] = useState('email');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (reservation) {
      setGuestName(reservation.guestName || '');
      setGuestPhone(reservation.guestPhone || '');
      setGuestEmail(reservation.guestEmail || '');
      setDate(reservation.date ? formatDateLocal(reservation.date) : '');
      setTime(reservation.time || '');
      setPartySize(reservation.partySize?.toString() || '2');
      setDuration(reservation.duration?.toString() || '120');
      setSection(reservation.section || '');
      setSpecialRequests(reservation.specialRequests || '');
      setOccasion(reservation.occasion || '');
      setConfirmationMethod(reservation.confirmationMethod || 'email');
    } else {
      // Reset form
      setGuestName('');
      setGuestPhone('');
      setGuestEmail('');
      setDate('');
      setTime('');
      setPartySize('2');
      setDuration('120');
      setSection('');
      setSpecialRequests('');
      setOccasion('');
      setConfirmationMethod('email');
    }
    setErrors({});
  }, [reservation, open]);

  const formatDateLocal = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!guestName.trim()) {
      newErrors.guestName = 'El nombre es requerido';
    }
    if (!guestPhone.trim()) {
      newErrors.guestPhone = 'El teléfono es requerido';
    }
    if (!date) {
      newErrors.date = 'La fecha es requerida';
    }
    if (!time) {
      newErrors.time = 'La hora es requerida';
    }
    if (!partySize || parseInt(partySize) < 1) {
      newErrors.partySize = 'El número de personas debe ser al menos 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    const payload = {
      guestName,
      guestPhone,
      guestEmail: guestEmail || undefined,
      date: new Date(date).toISOString(),
      time,
      partySize: parseInt(partySize),
      duration: parseInt(duration),
      section: section || undefined,
      specialRequests: specialRequests || undefined,
      occasion: occasion || undefined,
      confirmationMethod,
    };

    onSave(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reservation ? 'Editar Reserva' : 'Nueva Reserva'}
          </DialogTitle>
          <DialogDescription>
            {reservation
              ? 'Modifica los detalles de la reserva.'
              : 'Completa la información para crear una nueva reserva.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Guest Information */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Información del Cliente
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Nombre Completo *</Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Juan Pérez"
                  className={errors.guestName ? 'border-red-500' : ''}
                />
                {errors.guestName && (
                  <p className="text-sm text-red-500">{errors.guestName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestPhone">Teléfono *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guestPhone"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    placeholder="+58 412 1234567"
                    className={`pl-10 ${errors.guestPhone ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.guestPhone && (
                  <p className="text-sm text-red-500">{errors.guestPhone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="guestEmail">Email (Opcional)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="guestEmail"
                    type="email"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    placeholder="juan@ejemplo.com"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="partySize">Número de Personas *</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="partySize"
                    type="number"
                    min="1"
                    value={partySize}
                    onChange={(e) => setPartySize(e.target.value)}
                    className={`pl-10 ${errors.partySize ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.partySize && (
                  <p className="text-sm text-red-500">{errors.partySize}</p>
                )}
              </div>
            </div>
          </div>

          {/* Date & Time */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Fecha y Hora
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha *</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.date ? 'border-red-500' : ''}
                />
                {errors.date && (
                  <p className="text-sm text-red-500">{errors.date}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Hora *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={`pl-10 ${errors.time ? 'border-red-500' : ''}`}
                  />
                </div>
                {errors.time && (
                  <p className="text-sm text-red-500">{errors.time}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duración (minutos)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="30"
                  step="15"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="space-y-4">
            <h4 className="font-semibold">Preferencias</h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section">Sección</Label>
                <Select value={section} onValueChange={setSection}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sin preferencia</SelectItem>
                    <SelectItem value="interior">Interior</SelectItem>
                    <SelectItem value="terraza">Terraza</SelectItem>
                    <SelectItem value="bar">Barra</SelectItem>
                    <SelectItem value="privado">Salón Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="occasion">Ocasión</Label>
                <Select value={occasion} onValueChange={setOccasion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar ocasión" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguna</SelectItem>
                    <SelectItem value="birthday">Cumpleaños</SelectItem>
                    <SelectItem value="anniversary">Aniversario</SelectItem>
                    <SelectItem value="business">Negocios</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="other">Otra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="specialRequests">Solicitudes Especiales</Label>
                <Textarea
                  id="specialRequests"
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  placeholder="Ej: Ventana, silla de bebé, alergias alimentarias..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmationMethod">Método de Confirmación</Label>
                <Select value={confirmationMethod} onValueChange={setConfirmationMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="phone">Teléfono</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancelar</Button>
          </DialogClose>
          <Button onClick={handleSave}>
            {reservation ? 'Guardar Cambios' : 'Crear Reserva'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
