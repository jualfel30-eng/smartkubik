import { useCallback, useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Card } from '@/components/ui/card.jsx';
import { cn } from '@/lib/utils.js';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Save,
  Undo2,
} from 'lucide-react';
import {
  compareRooms,
  normalizeHospitalityResource,
  UNASSIGNED_FLOOR_KEY,
  getFloorKey,
  getFloorLabel,
} from './utils.js';

const ROOM_STATUS_VARIANTS = {
  available: 'text-emerald-600 bg-emerald-500/10',
  occupied: 'text-rose-600 bg-rose-500/10',
  housekeeping: 'text-sky-600 bg-sky-500/10',
  maintenance: 'text-slate-600 bg-slate-500/10',
  upcoming: 'text-amber-600 bg-amber-500/10',
};

const ROOM_STATUS_LABELS = {
  available: 'Disponible',
  occupied: 'Ocupada',
  housekeeping: 'Housekeeping',
  maintenance: 'Mantenimiento',
  upcoming: 'Próxima',
};

const ALL_FLOORS_KEY = '__ALL__';

const hydrateRooms = (rooms = []) => {
  const ordered = [...rooms].sort(compareRooms);
  const counters = new Map();

  return ordered.map((room) => {
    const key = getFloorKey(room.floor);
    const current = counters.get(key) ?? 0;
    counters.set(key, current + 1);
    return {
      ...room,
      floor: room.floor || '',
      zone: room.zone || '',
      sortIndex: Number.isFinite(Number(room.sortIndex))
        ? Number(room.sortIndex)
        : current,
      locationTagsInput: Array.isArray(room.locationTags)
        ? room.locationTags.join(', ')
        : '',
      isDirty: false,
    };
  });
};

const recomputeSortIndex = (rooms) => {
  const counters = new Map();
  return rooms.map((room) => {
    const key = getFloorKey(room.floor);
    const current = counters.get(key) ?? 0;
    counters.set(key, current + 1);
    if (room.sortIndex === current) {
      return room;
    }
    return { ...room, sortIndex: current, isDirty: true };
  });
};

const parseTags = (value) =>
  String(value || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

function HotelFloorPlanBuilder({
  open,
  onOpenChange,
  onSaved,
  initialRooms = [],
}) {
  const [rooms, setRooms] = useState([]);
  const [initialSnapshot, setInitialSnapshot] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(ALL_FLOORS_KEY);
  const [searchTerm, setSearchTerm] = useState('');

  const primingRooms = useCallback((list) => {
    if (!Array.isArray(list) || list.length === 0) {
      setRooms([]);
      setInitialSnapshot([]);
      return;
    }
    const hydrated = hydrateRooms(list);
    setRooms(hydrated);
    setInitialSnapshot(hydrated);
  }, []);

  useEffect(() => {
    if (!open) {
      setRooms([]);
      setInitialSnapshot([]);
      setLoading(false);
      setSaving(false);
      setError(null);
      setSelectedFloor(ALL_FLOORS_KEY);
      setSearchTerm('');
      return;
    }

    if (initialRooms?.length) {
      primingRooms(initialRooms);
    }

    let isMounted = true;

    const loadRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi('/resources?type=room');
        if (!isMounted) {
          return;
        }
        const payload = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : response?.items || [];
        const normalized = payload
          .map((resource) => normalizeHospitalityResource(resource))
          .filter(Boolean);
        primingRooms(normalized);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        console.error('Error loading hotel resources:', err);
        setError(err.message || 'No pudimos cargar las habitaciones.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();

    return () => {
      isMounted = false;
    };
  }, [open, initialRooms, primingRooms]);

  const floorGroups = useMemo(() => {
    const groups = new Map();
    rooms.forEach((room) => {
      const key = getFloorKey(room.floor);
    const label = getFloorLabel(key);
      if (!groups.has(key)) {
        groups.set(key, { key, label, count: 0 });
      }
      groups.get(key).count += 1;
    });
    // Ensure unassigned key exists so filter button renders
    if (!groups.has(UNASSIGNED_FLOOR_KEY)) {
      groups.set(UNASSIGNED_FLOOR_KEY, {
        key: UNASSIGNED_FLOOR_KEY,
        label: getFloorLabel(UNASSIGNED_FLOOR_KEY),
        count: 0,
      });
    }
    const entries = Array.from(groups.values());
    entries.sort((a, b) => {
      if (a.key === UNASSIGNED_FLOOR_KEY) return 1;
      if (b.key === UNASSIGNED_FLOOR_KEY) return -1;
      return a.label.localeCompare(b.label, undefined, {
        numeric: true,
        sensitivity: 'base',
      });
    });
    return entries;
  }, [rooms]);

  const floorOrderMap = useMemo(() => {
    const map = new Map();
    rooms.forEach((room, index) => {
      const key = getFloorKey(room.floor);
      const list = map.get(key) || [];
      list.push({ id: room.id, index });
      map.set(key, list);
    });
    return map;
  }, [rooms]);

  const roomsToDisplay = useMemo(() => {
    let filtered = rooms;
    if (selectedFloor !== ALL_FLOORS_KEY) {
      const floorValue =
        selectedFloor === UNASSIGNED_FLOOR_KEY ? '' : selectedFloor;
      filtered = rooms.filter(
        (room) => getFloorKey(room.floor) === getFloorKey(floorValue),
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((room) => {
        const bucket = [
          room.name,
          room.floor,
          room.zone,
          room.locationTagsInput,
        ]
          .join(' ')
          .toLowerCase();
        return bucket.includes(term);
      });
    }

    const sorted = [...filtered].sort(compareRooms);
    return sorted;
  }, [rooms, selectedFloor, searchTerm]);

  const hasChanges = useMemo(
    () => rooms.some((room) => room.isDirty),
    [rooms],
  );

  const dirtyCount = rooms.reduce(
    (total, room) => total + (room.isDirty ? 1 : 0),
    0,
  );

  const handleFloorChange = (roomId, value) => {
    setRooms((prev) => {
      const next = prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              floor: value,
              isDirty: true,
            }
          : room,
      );
      return recomputeSortIndex(next);
    });
  };

  const handleZoneChange = (roomId, value) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              zone: value,
              isDirty: true,
            }
          : room,
      ),
    );
  };

  const handleTagsChange = (roomId, value) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId
          ? {
              ...room,
              locationTagsInput: value,
              isDirty: true,
            }
          : room,
      ),
    );
  };

  const handleAssignToCurrentFloor = (roomId) => {
    if (
      selectedFloor === ALL_FLOORS_KEY ||
      selectedFloor === UNASSIGNED_FLOOR_KEY
    ) {
      return;
    }
    handleFloorChange(roomId, selectedFloor);
  };

  const handleResetFloor = (roomId) => {
    handleFloorChange(roomId, '');
  };

  const handleMove = (roomId, direction) => {
    setRooms((prev) => {
      const currentIndex = prev.findIndex((room) => room.id === roomId);
      if (currentIndex === -1) {
        return prev;
      }

      const floorKey = getFloorKey(prev[currentIndex].floor);
      const indices = prev.reduce((acc, room, idx) => {
        if (getFloorKey(room.floor) === floorKey) {
          acc.push(idx);
        }
        return acc;
      }, []);

      const orderPosition = indices.indexOf(currentIndex);
      if (orderPosition === -1) {
        return prev;
      }

      const delta = direction === 'up' ? -1 : 1;
      const targetOrderPosition = orderPosition + delta;
      if (
        targetOrderPosition < 0 ||
        targetOrderPosition >= indices.length
      ) {
        return prev;
      }

      const swapIndex = indices[targetOrderPosition];
      const updated = [...prev];
      const temp = updated[currentIndex];
      updated[currentIndex] = {
        ...updated[swapIndex],
        isDirty: true,
      };
      updated[swapIndex] = {
        ...temp,
        isDirty: true,
      };

      const normalized = recomputeSortIndex(updated);
      return normalized;
    });
  };

  const handleResetChanges = () => {
    primingRooms(initialSnapshot);
    toast.info('Se revirtieron los cambios pendientes.');
  };

  const handleSave = async () => {
    if (!rooms.length) {
      onOpenChange(false);
      return;
    }
    setSaving(true);
    try {
      const payloadItems = rooms.map((room) => ({
        id: room.id,
        floor: room.floor?.trim() || null,
        zone: room.zone?.trim() || null,
        sortIndex: Number.isFinite(Number(room.sortIndex))
          ? Number(room.sortIndex)
          : 0,
        locationTags: parseTags(room.locationTagsInput),
      }));

      const response = await fetchApi('/resources/layout/bulk', {
        method: 'PUT',
        body: JSON.stringify({ items: payloadItems }),
      });

      const responseItems = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : response?.items || [];

      const normalized =
        responseItems.length > 0
          ? responseItems
              .map((resource) => normalizeHospitalityResource(resource))
              .filter(Boolean)
          : rooms.map((room) => ({
              id: room.id,
              name: room.name,
              status: room.status,
              floor: room.floor,
              zone: room.zone,
              sortIndex: room.sortIndex,
              locationTags: parseTags(room.locationTagsInput),
              currentGuest: room.currentGuest,
              nextCheckIn: room.nextCheckIn,
              hasHousekeepingTask: room.hasHousekeepingTask,
            }));

      primingRooms(normalized);
      onSaved(responseItems, normalized);
      toast.success('Layout guardado correctamente.');
    } catch (err) {
      console.error('Error saving layout:', err);
      toast.error(err.message || 'No pudimos guardar el layout.');
    } finally {
      setSaving(false);
    }
  };

  const renderRoomStatus = (room) => {
    const label = ROOM_STATUS_LABELS[room.status] || 'Desconocido';
    const variant =
      ROOM_STATUS_VARIANTS[room.status] ||
      'text-muted-foreground bg-muted';
    return (
      <Badge className={cn('capitalize', variant)}>{label}</Badge>
    );
  };

  const selectedFloorValue =
    selectedFloor === ALL_FLOORS_KEY
      ? null
      : selectedFloor === UNASSIGNED_FLOOR_KEY
        ? ''
        : selectedFloor;

  const isProcessing = saving || loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Organizar habitaciones</DialogTitle>
          <DialogDescription>
            Reordena pisos y zonas para construir el mapa visual. Los
            cambios se sincronizan con el equipo en tiempo real.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  Habitaciones total
                </p>
                <p className="text-2xl font-semibold">{rooms.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Cambios pendientes
                </p>
                <p className="text-lg font-semibold">
                  {dirtyCount}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetChanges}
                disabled={!hasChanges || saving}
                className="w-full"
              >
                <Undo2 className="mr-2 size-4" />
                Revertir cambios
              </Button>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="searchRooms">Buscar</Label>
              <Input
                id="searchRooms"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Número, huésped, etiqueta..."
              />
            </div>

            <div className="space-y-2">
              <Label>Pisos / zonas</Label>
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant={
                    selectedFloor === ALL_FLOORS_KEY ? 'default' : 'outline'
                  }
                  onClick={() => setSelectedFloor(ALL_FLOORS_KEY)}
                  className="justify-between"
                >
                  <span>Todos</span>
                  <Badge variant="secondary">{rooms.length}</Badge>
                </Button>
                {floorGroups.map((floor) => (
                  <Button
                    key={floor.key}
                    type="button"
                    variant={
                      selectedFloor === floor.key ? 'default' : 'outline'
                    }
                    onClick={() => setSelectedFloor(floor.key)}
                    className="justify-between"
                  >
                    <span>{floor.label}</span>
                    <Badge variant="secondary">{floor.count}</Badge>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {error && (
              <Card className="border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                {error}
              </Card>
            )}

            <ScrollArea className="h-[60vh] rounded-md border">
              <div className="space-y-3 p-4">
                {isProcessing && roomsToDisplay.length === 0 ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Cargando habitaciones...
                  </div>
                ) : roomsToDisplay.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No hay habitaciones para el filtro seleccionado.
                  </div>
                ) : (
                  roomsToDisplay.map((room) => {
                    const floorKey = getFloorKey(room.floor);
                    const orderList = floorOrderMap.get(floorKey) || [];
                    const position = orderList.findIndex(
                      (item) => item.id === room.id,
                    );
                    const isFirst = position <= 0;
                    const isLast =
                      position === orderList.length - 1 || orderList.length === 0;

                    return (
                      <Card
                        key={room.id}
                        className={cn(
                          'border border-border/70 p-4 shadow-sm transition',
                          room.isDirty && 'border-primary',
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="text-base font-semibold text-foreground">
                              {room.name}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              Orden #{room.sortIndex + 1} · Piso:{' '}
                              {room.floor || 'Sin asignar'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {renderRoomStatus(room)}
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMove(room.id, 'up')}
                                disabled={isFirst || saving}
                                className="size-8"
                              >
                                <ArrowUp className="size-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMove(room.id, 'down')}
                                disabled={isLast || saving}
                                className="size-8"
                              >
                                <ArrowDown className="size-4" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="space-y-1.5">
                            <Label>Piso o nivel</Label>
                            <Input
                              value={room.floor}
                              onChange={(event) =>
                                handleFloorChange(room.id, event.target.value)
                              }
                              placeholder="Ej. Piso 3"
                              disabled={saving}
                            />
                            <div className="flex gap-2">
                              {selectedFloorValue !== null && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleAssignToCurrentFloor(room.id)}
                                  disabled={saving}
                                >
                                  Usar piso actual
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleResetFloor(room.id)}
                                disabled={saving}
                              >
                                Limpiar
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <Label>Zona / Ala</Label>
                            <Input
                              value={room.zone}
                              onChange={(event) =>
                                handleZoneChange(room.id, event.target.value)
                              }
                              placeholder="Ej. Ala Norte"
                              disabled={saving}
                            />
                          </div>

                          <div className="space-y-1.5 md:col-span-2">
                            <Label>Etiquetas</Label>
                            <Input
                              value={room.locationTagsInput}
                              onChange={(event) =>
                                handleTagsChange(room.id, event.target.value)
                              }
                              placeholder="vip, vista-mar, doble"
                              disabled={saving}
                            />
                            <p className="text-xs text-muted-foreground">
                              Separa con comas para agrupar o filtrar desde el mapa.
                            </p>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Guardando
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

HotelFloorPlanBuilder.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  onSaved: PropTypes.func.isRequired,
  initialRooms: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      floor: PropTypes.string,
      zone: PropTypes.string,
      sortIndex: PropTypes.number,
      locationTags: PropTypes.arrayOf(PropTypes.string),
    }),
  ),
};

export default HotelFloorPlanBuilder;
