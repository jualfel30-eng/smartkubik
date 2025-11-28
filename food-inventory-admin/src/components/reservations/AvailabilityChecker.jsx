import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useReservations } from '@/hooks/useReservations';

export function AvailabilityChecker({ onCreateReservation }) {
  const { checkAvailability, loading } = useReservations();

  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [partySize, setPartySize] = useState('2');
  const [availabilityResult, setAvailabilityResult] = useState(null);
  const [checking, setChecking] = useState(false);

  const handleCheck = async () => {
    if (!date || !time || !partySize) {
      alert('Por favor completa todos los campos');
      return;
    }

    setChecking(true);
    try {
      const result = await checkAvailability({
        date: new Date(date).toISOString(),
        time,
        partySize: parseInt(partySize),
      });
      setAvailabilityResult(result);
    } catch (err) {
      console.error('Error checking availability:', err);
      alert('Error al verificar disponibilidad');
    } finally {
      setChecking(false);
    }
  };

  const handleCreateReservation = () => {
    if (onCreateReservation && availabilityResult?.available) {
      onCreateReservation({
        date,
        time,
        partySize: parseInt(partySize),
      });
    }
  };

  const getAvailabilityBadge = () => {
    if (!availabilityResult) return null;

    if (availabilityResult.available) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          Disponible
        </Badge>
      );
    } else if (availabilityResult.waitlist) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          Lista de Espera
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-4 w-4" />
          No Disponible
        </Badge>
      );
    }
  };

  const getSuggestedTimes = () => {
    if (!availabilityResult?.suggestedTimes) return null;

    return (
      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h5 className="font-medium mb-2">Horarios Alternativos Disponibles:</h5>
        <div className="flex flex-wrap gap-2">
          {availabilityResult.suggestedTimes.map((suggestedTime, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => setTime(suggestedTime)}
              className="flex items-center gap-1"
            >
              <Clock className="h-3 w-3" />
              {suggestedTime}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-6 w-6" />
          Verificar Disponibilidad
        </CardTitle>
        <CardDescription>
          Verifica si hay mesas disponibles para la fecha y hora deseada
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="check-date">Fecha</Label>
            <Input
              id="check-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setAvailabilityResult(null);
              }}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-time">Hora</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="check-time"
                type="time"
                value={time}
                onChange={(e) => {
                  setTime(e.target.value);
                  setAvailabilityResult(null);
                }}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="check-partySize">Personas</Label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="check-partySize"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => {
                  setPartySize(e.target.value);
                  setAvailabilityResult(null);
                }}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleCheck}
          disabled={checking || loading}
          className="w-full"
        >
          {checking ? 'Verificando...' : 'Verificar Disponibilidad'}
        </Button>

        {availabilityResult && (
          <div className="mt-6 p-6 border rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-lg">Resultado</h4>
              {getAvailabilityBadge()}
            </div>

            {availabilityResult.available && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  ✓ Hay mesas disponibles para {partySize} personas
                </p>
                {availabilityResult.availableTables && availabilityResult.availableTables.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Mesas Disponibles:</p>
                    <div className="flex flex-wrap gap-2">
                      {availabilityResult.availableTables.map((table) => (
                        <Badge key={table._id} variant="outline">
                          Mesa {table.number} ({table.capacity} pers.)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleCreateReservation}
                  className="w-full mt-4"
                >
                  Crear Reserva con esta Disponibilidad
                </Button>
              </div>
            )}

            {!availabilityResult.available && availabilityResult.waitlist && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  No hay mesas disponibles en este horario, pero puedes agregar a lista de espera.
                </p>
                {availabilityResult.estimatedWaitTime && (
                  <p className="text-sm font-medium">
                    Tiempo estimado de espera: {availabilityResult.estimatedWaitTime} minutos
                  </p>
                )}
              </div>
            )}

            {!availabilityResult.available && !availabilityResult.waitlist && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Lo sentimos, no hay disponibilidad para {partySize} personas en este horario.
                </p>
                {availabilityResult.reason && (
                  <p className="text-sm text-destructive">
                    Razón: {availabilityResult.reason}
                  </p>
                )}
              </div>
            )}

            {getSuggestedTimes()}

            {availabilityResult.message && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded text-sm text-blue-900 dark:text-blue-100">
                {availabilityResult.message}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
