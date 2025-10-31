import PropTypes from 'prop-types';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { cn } from '@/lib/utils.js';
import { Badge } from '@/components/ui/badge.jsx';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu.jsx';
import { BedDouble, DoorOpen, Loader2, MoreVertical, Sparkles, UserPlus } from 'lucide-react';
import {
  compareRooms,
  getFloorKey,
  getFloorLabel,
  UNASSIGNED_FLOOR_KEY,
  UNASSIGNED_ZONE_LABEL,
} from './utils.js';

const STATUS_VARIANTS = {
  available: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
  occupied: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
  upcoming: 'bg-amber-500/10 text-amber-600 dark:text-amber-300',
  housekeeping: 'bg-sky-500/10 text-sky-600 dark:text-sky-300',
  maintenance: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
};

const STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Ocupada',
  upcoming: 'Próxima',
  housekeeping: 'Housekeeping',
  maintenance: 'Mantenimiento',
};

export function HotelFloorPlan({
  rooms = [],
  lastUpdated,
  onRoomAction,
  actionLoadingId,
  headerActions = null,
}) {
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

  const groupedFloors = useMemo(() => {
    const floorMap = new Map();

    rooms.forEach((room) => {
      const floorKey = getFloorKey(room.floor);
      const floorEntry =
        floorMap.get(floorKey) ||
        {
          key: floorKey,
          label: getFloorLabel(floorKey),
          rooms: [],
        };
      floorEntry.rooms.push(room);
      floorMap.set(floorKey, floorEntry);
    });

    const floorList = Array.from(floorMap.values());
    floorList.sort((a, b) => {
      if (a.key === UNASSIGNED_FLOOR_KEY) return 1;
      if (b.key === UNASSIGNED_FLOOR_KEY) return -1;
      return a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });

    return floorList.map((floor) => {
      const sortedRooms = [...floor.rooms].sort(compareRooms);
      const zoneMap = new Map();
      sortedRooms.forEach((room) => {
        const zoneKey = (room.zone || '').toString().trim() || UNASSIGNED_ZONE_LABEL;
        const zoneEntry =
          zoneMap.get(zoneKey) ||
          {
            key: zoneKey,
            label: zoneKey === UNASSIGNED_ZONE_LABEL ? UNASSIGNED_ZONE_LABEL : zoneKey,
            rooms: [],
          };
        zoneEntry.rooms.push(room);
        zoneMap.set(zoneKey, zoneEntry);
      });

      const zones = Array.from(zoneMap.values()).sort((a, b) => {
        if (a.key === UNASSIGNED_ZONE_LABEL) return 1;
        if (b.key === UNASSIGNED_ZONE_LABEL) return -1;
        return a.label.localeCompare(b.label, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
      });

      return { ...floor, zones };
    });
  }, [rooms]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-1">
            <CardTitle>Mapa de Habitaciones</CardTitle>
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Sincronizado {new Date(lastUpdated).toLocaleString()}
              </span>
            )}
          </div>
          {headerActions && (
            <div className="flex items-center gap-2">{headerActions}</div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full">
          <div className="flex w-full gap-4 overflow-x-auto px-6 pb-6">
            {groupedFloors.map((floor) => (
              <div
                key={floor.key}
                className="flex min-w-[280px] flex-1 flex-col gap-4 rounded-lg border border-border/60 bg-muted/10 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{floor.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      {floor.rooms.length} habitación{floor.rooms.length === 1 ? '' : 'es'}
                    </p>
                  </div>
                  <Badge variant="secondary">{floor.rooms.length}</Badge>
                </div>

                {floor.zones.map((zone) => (
                  <div key={`${floor.key}-${zone.key}`} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">
                        {zone.label}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {zone.rooms.length}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {zone.rooms.map((room) => {
                        const variant =
                          STATUS_VARIANTS[room.status] || STATUS_VARIANTS.available;
                        const statusLabel =
                          STATUS_LABELS[room.status] || STATUS_LABELS.available;
                        const isUpdating = actionLoadingId === room.id;
                        const locationTags = Array.isArray(room.locationTags)
                          ? room.locationTags
                          : [];

                        return (
                          <div
                            key={room.id}
                            className="rounded-lg border border-border/70 bg-background p-4 shadow-sm transition hover:border-primary/50"
                          >
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <h4 className="text-base font-semibold text-foreground">
                                  {room.name}
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                  Orden #{Number(room.sortIndex ?? 0) + 1}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={cn('capitalize', variant)}>{statusLabel}</Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="size-8 text-muted-foreground"
                                      disabled={isUpdating}
                                    >
                                      {isUpdating ? (
                                        <Loader2 className="size-4 animate-spin" />
                                      ) : (
                                        <MoreVertical className="size-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="min-w-44">
                          <DropdownMenuLabel>Acciones rápidas</DropdownMenuLabel>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'check-in', room });
                                      }}
                                    >
                                      <UserPlus className="size-4" />
                                      Check-in walk-in
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        onRoomAction?.({
                                          type: 'status',
                                          status: 'available',
                                          room,
                                        });
                                      }}
                                      disabled={room.status === 'available'}
                                    >
                                      <DoorOpen className="size-4" />
                                      Marcar disponible
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onSelect={(event) => {
                                        event.preventDefault();
                                        onRoomAction?.({
                                          type: 'status',
                                          status: 'occupied',
                                          room,
                                        });
                                      }}
                            disabled={room.status === 'occupied'}
                          >
                            <BedDouble className="size-4" />
                            Marcar ocupada
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'check-out', room });
                            }}
                            disabled={room.status === 'housekeeping'}
                          >
                            <Sparkles className="size-4" />
                            Registrar check-out
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'housekeeping', room });
                            }}
                                    >
                                      <Sparkles className="size-4" />
                            Solicitar housekeeping
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'housekeeping-done', room });
                            }}
                            disabled={room.status !== 'housekeeping'}
                          >
                            <Sparkles className="size-4 rotate-180" />
                            Housekeeping listo
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'maintenance-on', room });
                            }}
                            disabled={room.status === 'maintenance'}
                          >
                            <BedDouble className="size-4" />
                            Bloquear por mantenimiento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={(event) => {
                              event.preventDefault();
                              onRoomAction?.({ type: 'maintenance-off', room });
                            }}
                            disabled={room.status !== 'maintenance'}
                          >
                            <DoorOpen className="size-4" />
                            Liberar mantenimiento
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                            {room.currentGuest && (
                              <p className="text-sm text-muted-foreground">
                                Huésped actual:{' '}
                                <span className="font-medium text-foreground">
                                  {room.currentGuest}
                                </span>
                              </p>
                            )}
                            {!room.currentGuest && room.nextCheckIn && (
                              <p className="text-sm text-muted-foreground">
                                Próximo check-in: {new Date(room.nextCheckIn).toLocaleString()}
                              </p>
                            )}

                            {locationTags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {locationTags.map((tag) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                              <span>ID: {room.id}</span>
                              {room.hasHousekeepingTask && (
                                <span className="font-medium text-amber-500">
                                  Housekeeping pendiente
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

HotelFloorPlan.propTypes = {
  rooms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      status: PropTypes.oneOf(['available', 'occupied', 'upcoming', 'housekeeping', 'maintenance']).isRequired,
      currentGuest: PropTypes.string,
      nextCheckIn: PropTypes.string,
      hasHousekeepingTask: PropTypes.bool,
    }),
  ),
  lastUpdated: PropTypes.string,
  onRoomAction: PropTypes.func,
  actionLoadingId: PropTypes.string,
  headerActions: PropTypes.node,
};

export default HotelFloorPlan;
