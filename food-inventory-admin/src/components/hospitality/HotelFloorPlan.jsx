import PropTypes from 'prop-types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge.jsx';

const STATUS_VARIANTS = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  occupied: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  upcoming: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
};

export function HotelFloorPlan({ rooms, lastUpdated }) {
  if (!Array.isArray(rooms) || rooms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Habitaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Aún no hay habitaciones registradas en el sistema.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <CardTitle>Mapa de Habitaciones</CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              Sincronizado {new Date(lastUpdated).toLocaleString()}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rooms.map((room) => {
          const variant = STATUS_VARIANTS[room.status] || STATUS_VARIANTS.available;
          return (
            <div
              key={room.id}
              className="rounded-lg border border-border bg-card p-4 shadow-sm transition hover:border-primary/50"
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">
                  {room.name}
                </h3>
                <Badge className={cn('capitalize', variant)}>
                  {room.status === 'occupied'
                    ? 'Ocupada'
                    : room.status === 'upcoming'
                      ? 'Próxima'
                      : 'Disponible'}
                </Badge>
              </div>
              {room.currentGuest && (
                <p className="text-sm text-muted-foreground">
                  Huésped actual: <span className="font-medium text-foreground">{room.currentGuest}</span>
                </p>
              )}
              {!room.currentGuest && room.nextCheckIn && (
                <p className="text-sm text-muted-foreground">
                  Próximo check-in: {new Date(room.nextCheckIn).toLocaleString()}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>ID: {room.id}</span>
                {room.hasHousekeepingTask && (
                  <span className="font-medium text-amber-500">Housekeeping pendiente</span>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

HotelFloorPlan.propTypes = {
  rooms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['available', 'occupied', 'upcoming']).isRequired,
      currentGuest: PropTypes.string,
      nextCheckIn: PropTypes.string,
      hasHousekeepingTask: PropTypes.bool,
    }),
  ),
  lastUpdated: PropTypes.string,
};

HotelFloorPlan.defaultProps = {
  rooms: [],
  lastUpdated: undefined,
};

export default HotelFloorPlan;
