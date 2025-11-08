import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { Separator } from '@/components/ui/separator.jsx';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from '@/components/ui/drawer.jsx';
import { toast } from 'sonner';
import {
  Settings2,
  MapPinned,
  DoorOpen,
  BedDouble,
  Sparkles,
  UserPlus,
  ShieldOff,
} from 'lucide-react';

import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils.js';
import HotelFloorPlan from './HotelFloorPlan.jsx';
import QuickCheckInDialog from './QuickCheckInDialog.jsx';
import HotelFloorPlanBuilder from './HotelFloorPlanBuilder.jsx';
import { useHousekeepingTasks } from './useHousekeepingTasks.js';
import {
  compareRooms,
  normalizeHospitalityResource,
  UNASSIGNED_FLOOR_KEY,
  UNASSIGNED_ZONE_LABEL,
  getFloorKey,
  getFloorLabel,
  ROOM_STATUS_VARIANTS,
  getRoomStatusLabel,
  getCountdownInfo,
  getCountdownBadgeClass,
  logHospitalityEvent,
} from './utils.js';

const STATUS_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'available', label: 'Disponibles' },
  { value: 'occupied', label: 'Ocupadas' },
  { value: 'housekeeping', label: 'Housekeeping' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'upcoming', label: 'Próximas' },
];

function mergeRooms(baseRooms = [], updates = []) {
  const map = new Map();
  baseRooms.forEach((room) => {
    if (!room) return;
    const id = room.id || room._id || room.roomId;
    if (!id) return;
    map.set(String(id), { ...room, id: String(id) });
  });
  updates.forEach((room) => {
    if (!room) return;
    const id = room.id || room._id || room.roomId;
    if (!id) return;
    const existing = map.get(String(id)) || {};
    const locationTagsArray = Array.isArray(room.locationTags)
      ? room.locationTags
      : Array.isArray(existing.locationTags)
        ? existing.locationTags
        : [];
    map.set(String(id), {
      ...existing,
      ...room,
      id: String(id),
      status: room.status || existing?.status || 'available',
      floor: room.floor ?? existing?.floor ?? '',
      zone: room.zone ?? existing?.zone ?? '',
      sortIndex: Number.isFinite(Number(room.sortIndex))
        ? Number(room.sortIndex)
        : Number.isFinite(Number(existing?.sortIndex))
          ? Number(existing.sortIndex)
          : 0,
      locationTags: locationTagsArray,
      hasHousekeepingTask:
        room.hasHousekeepingTask ?? existing?.hasHousekeepingTask ?? false,
    });
  });
  return Array.from(map.values()).sort(compareRooms);
}

const formatFloorLabel = (floorKey) => getFloorLabel(floorKey);

export default function HotelFloorPlanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFloorParam = searchParams.get('floor');
  const initialStatusParam = searchParams.get('status');
  const initialRoomParam = searchParams.get('room');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [baseRooms, setBaseRooms] = useState([]);
  const [liveRooms, setLiveRooms] = useState([]);
  const [resourceLookup, setResourceLookup] = useState({});
  const [lastSync, setLastSync] = useState(null);
  const [statusFilter, setStatusFilter] = useState(
    initialStatusParam && STATUS_FILTERS.some((item) => item.value === initialStatusParam)
      ? initialStatusParam
      : 'all',
  );
  const [floorFilter, setFloorFilter] = useState(initialFloorParam || 'all');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isLayoutBuilderOpen, setIsLayoutBuilderOpen] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInRoom, setCheckInRoom] = useState(null);
  const [detailRoomId, setDetailRoomId] = useState(initialRoomParam || null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialRoomParam));
  const previousFloorRef = useRef(floorFilter);
  const previousStatusRef = useRef(statusFilter);
  const previousRoomRef = useRef(detailRoomId);
  const {
    tasksByResource,
    refresh: refreshHousekeepingTasks,
    markPendingForResource,
    markCompletedForResource,
  } = useHousekeepingTasks();

  useEffect(() => {
    let isMounted = true;

    const loadRooms = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchApi('/resources?type=room&status=active');
        if (!isMounted) {
          return;
        }
        const payload = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : response?.items || [];

        const lookup = {};
        const normalized = payload
          .map((resource) => {
            const normalizedResource = normalizeHospitalityResource(resource);
            if (normalizedResource) {
              lookup[normalizedResource.id] = resource;
            }
            return normalizedResource;
          })
          .filter(Boolean)
          .sort(compareRooms);

        setResourceLookup(lookup);
        setBaseRooms(normalized);
        setLiveRooms([]);
        setLastSync(new Date().toISOString());
      } catch (err) {
        console.error('Error cargando habitaciones hotel:', err);
        if (!isMounted) {
          return;
        }
        setError(err.message || 'No pudimos cargar las habitaciones del hotel.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadRooms();

    const handler = (event) => {
      const detail = event.detail || {};
      if (!Array.isArray(detail.rooms)) {
        return;
      }
      setLiveRooms((prev) => mergeRooms(prev, detail.rooms));
      setLastSync(detail.updatedAt || new Date().toISOString());
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('hospitality-floorplan-sync', handler);
    }

    return () => {
      isMounted = false;
      if (typeof window !== 'undefined') {
        window.removeEventListener('hospitality-floorplan-sync', handler);
      }
    };
  }, []);

  const updateRoomStatus = useCallback(
    async (room, status, options = {}) => {
      const {
        skipLoading = false,
        suppressToast = false,
        toastMessage,
        currentGuestName,
        nextCheckIn,
      } = options;

      const roomId = typeof room === 'string' ? room : room?.id;
      if (!roomId) {
        if (!suppressToast) {
          toast.error('No se pudo identificar la habitación seleccionada.');
        }
        return;
      }

      const resource = resourceLookup[roomId];
      if (!resource) {
        if (!suppressToast) {
          toast.error('No encontramos la habitación en el catálogo de recursos.');
        }
        return;
      }

      if (!skipLoading) {
        setActionLoadingId(roomId);
      }

      try {
        const metadata = {
          ...(resource.metadata || {}),
          roomStatus: status,
        };

        if (status === 'housekeeping') {
          metadata.housekeepingStatus = 'pending';
          metadata.requiresHousekeeping = true;
        } else if (status === 'available') {
          metadata.housekeepingStatus = 'completed';
          metadata.requiresHousekeeping = false;
          delete metadata.currentGuest;
          delete metadata.currentGuestName;
          delete metadata.currentGuestId;
        } else if (status === 'occupied') {
          metadata.housekeepingStatus = 'in_progress';
          metadata.requiresHousekeeping = false;
          if (currentGuestName) {
            metadata.currentGuest = currentGuestName;
            metadata.currentGuestName = currentGuestName;
          }
        } else if (status === 'maintenance') {
          metadata.housekeepingStatus = metadata.housekeepingStatus || 'on_hold';
        }

        if (nextCheckIn) {
          metadata.nextCheckIn = nextCheckIn;
        } else if (status === 'available') {
          delete metadata.nextCheckIn;
        }

        const resourceApiId =
          (typeof resource._id === 'object' && resource._id?.toString?.()) ||
          resource._id ||
          resource.id ||
          resource.resourceId ||
          roomId;

        await fetchApi(`/resources/${resourceApiId}`, {
          method: 'PUT',
          body: JSON.stringify({ metadata }),
        });

        setResourceLookup((prev) => ({
          ...prev,
          [roomId]: {
            ...resource,
            metadata,
          },
        }));

        const baseName =
          (typeof room === 'object' && room?.name) ||
          resource.name ||
          resource.displayName ||
          `Habitación ${roomId}`;

        const guestName =
          status === 'occupied'
            ? currentGuestName ||
              (typeof room === 'object' && room?.currentGuest) ||
              metadata.currentGuestName ||
              metadata.currentGuest ||
              null
            : null;

        const housekeepingFlag = status === 'housekeeping';
        const upcomingCheckIn =
          status === 'available'
            ? null
            : nextCheckIn ||
              (typeof room === 'object' && room?.nextCheckIn) ||
              metadata.nextCheckIn ||
              null;

        const mergedRoom = {
          id: roomId,
          name: baseName,
          status,
          floor: room.floor ?? resource.metadata?.floor ?? resource.floor ?? '',
          zone: room.zone ?? resource.metadata?.zone ?? resource.zone ?? '',
          sortIndex:
            Number.isFinite(Number(room.sortIndex))
              ? Number(room.sortIndex)
              : Number.isFinite(Number(resource.sortIndex))
                ? Number(resource.sortIndex)
                : 0,
          locationTags:
            room.locationTags ??
            resource.metadata?.locationTags ??
            resource.locationTags ??
            [],
          currentGuest: guestName,
          nextCheckIn: upcomingCheckIn,
          hasHousekeepingTask: housekeepingFlag,
        };

        setBaseRooms((prev) => mergeRooms(prev, [mergedRoom]));
        setLiveRooms((prev) => mergeRooms(prev, [mergedRoom]));
        setLastSync(new Date().toISOString());

        if (!suppressToast) {
          toast.success(toastMessage || 'Estado de la habitación actualizado.');
        }
      } catch (err) {
        console.error('Error updating room status:', err);
        if (!suppressToast) {
          toast.error(err.message || 'No pudimos actualizar la habitación.');
        }
      } finally {
        if (!skipLoading) {
          setActionLoadingId(null);
        }
      }
    },
    [resourceLookup],
  );

  const ensureHousekeepingTask = useCallback(
    async (room) => {
      if (!room?.id) {
        return;
      }
      const dueDate =
        room.housekeepingDueDate ||
        room.nextCheckIn ||
        new Date(Date.now() + 15 * 60 * 1000).toISOString();
      try {
        await markPendingForResource(room.id, {
          roomName: room.name,
          dueDate,
          appointmentId: room.housekeepingTask?.appointmentId,
          priority: room.housekeepingTask?.priority,
        });
      } catch (error) {
        console.error(`No se pudo registrar la tarea de housekeeping para ${room.name}`, error);
      } finally {
        await refreshHousekeepingTasks();
      }
    },
    [markPendingForResource, refreshHousekeepingTasks],
  );

  const finalizeHousekeepingTask = useCallback(
    async (room) => {
      if (!room?.id) {
        return;
      }
      try {
        await markCompletedForResource(room.id);
      } catch (error) {
        console.error(`No se pudo cerrar la tarea de housekeeping para ${room.name}`, error);
      } finally {
        await refreshHousekeepingTasks();
      }
    },
    [markCompletedForResource, refreshHousekeepingTasks],
  );

  const handleRoomAction = useCallback(
    (action) => {
      if (!action?.room) {
        return;
      }

      const { room } = action;
      const floorKey = getFloorKey(room.floor);
      logHospitalityEvent('room_action_triggered', {
        source: 'floor-plan-page',
        action: action.type,
        status: action.status,
        roomId: room.id,
        roomName: room.name,
        floor: floorKey,
      });

      if (action.type === 'check-in') {
        setCheckInRoom(room);
        setIsCheckInOpen(true);
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'check-out') {
        void (async () => {
          await updateRoomStatus(room, 'housekeeping', {
            toastMessage: 'Check-out registrado. Housekeeping pendiente.',
          });
          await ensureHousekeepingTask(room);
        })();
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'housekeeping') {
        void (async () => {
          await updateRoomStatus(room, 'housekeeping', {
            toastMessage: 'Se notificó a housekeeping.',
          });
          await ensureHousekeepingTask(room);
        })();
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'housekeeping-done') {
        void (async () => {
          await updateRoomStatus(room, 'available', {
            toastMessage: 'Habitación lista para el próximo huésped.',
          });
          await finalizeHousekeepingTask(room);
        })();
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'maintenance-on') {
        void updateRoomStatus(room, 'maintenance', {
          toastMessage: 'Habitación bloqueada por mantenimiento.',
        });
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'maintenance-off') {
        void (async () => {
          await updateRoomStatus(room, 'available', {
            toastMessage: 'Habitación liberada de mantenimiento.',
          });
          await finalizeHousekeepingTask(room);
        })();
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
        return;
      }

      if (action.type === 'status' && action.status) {
        const messages = {
          available: 'Habitación liberada.',
          occupied: 'Habitación marcada como ocupada.',
          housekeeping: 'Se notificó a housekeeping.',
          maintenance: 'Habitación bloqueada por mantenimiento.',
          upcoming: 'Habitación marcada como próxima.',
        };
        void (async () => {
          await updateRoomStatus(room, action.status, {
            toastMessage: messages[action.status] || 'Estado actualizado.',
          });
          if (action.status === 'housekeeping') {
            await ensureHousekeepingTask(room);
          } else if (action.status === 'available') {
            await finalizeHousekeepingTask(room);
          }
        })();
      }
    },
    [ensureHousekeepingTask, finalizeHousekeepingTask, updateRoomStatus],
  );

  const handleQuickCheckInSuccess = useCallback(
    async ({ room, guestName, checkOut }) => {
      if (!room?.id) {
        return;
      }

      const resource = resourceLookup[room.id];
      const stayEndsAt = checkOut || resource?.metadata?.nextCheckIn || null;

      logHospitalityEvent('quick_checkin_completed', {
        source: 'floor-plan-page',
        roomId: room.id,
        roomName: room.name,
        guestName,
        scheduledCheckout: stayEndsAt,
      });

      setLiveRooms((prev) =>
        mergeRooms(prev, [
          {
            id: room.id,
            name: room.name,
            status: 'occupied',
            currentGuest: guestName,
            nextCheckIn: stayEndsAt,
            hasHousekeepingTask: false,
            floor: room.floor,
            zone: room.zone,
            sortIndex: room.sortIndex,
            locationTags: room.locationTags,
          },
        ]),
      );

      setLastSync(new Date().toISOString());

      try {
        await updateRoomStatus(
          { ...room, currentGuest: guestName, nextCheckIn: stayEndsAt },
          'occupied',
          {
            skipLoading: true,
            suppressToast: true,
            currentGuestName: guestName,
            nextCheckIn: stayEndsAt,
          },
        );
        await finalizeHousekeepingTask(room);
      } finally {
        setCheckInRoom(null);
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
      }
    },
    [finalizeHousekeepingTask, resourceLookup, updateRoomStatus],
  );

  const handleRoomSelect = useCallback((room) => {
    if (!room?.id) {
      return;
    }
    const floorKey = getFloorKey(room.floor);
    if (floorKey && floorKey !== floorFilter) {
      setFloorFilter(floorKey);
    }
    logHospitalityEvent('room_selected', {
      source: 'floor-plan-page',
      roomId: room.id,
      roomName: room.name,
      floor: floorKey,
    });
    setDetailRoomId(room.id);
    setIsDetailOpen(true);
  }, [floorFilter]);

  const handleLayoutSaved = useCallback((updatedResources = [], normalizedRooms) => {
    const normalizedList =
      normalizedRooms && normalizedRooms.length
        ? normalizedRooms
        : updatedResources
            .map((resource) => normalizeHospitalityResource(resource))
            .filter(Boolean);

    if (!normalizedList.length) {
      setIsLayoutBuilderOpen(false);
      return;
    }

    const lookupUpdates = {};
    updatedResources.forEach((resource) => {
      if (!resource) return;
      const resourceId =
        resource._id || resource.id || resource.resourceId;
      if (!resourceId) return;
      lookupUpdates[String(resourceId)] = resource;
    });

    setResourceLookup((prev) => ({
      ...prev,
      ...lookupUpdates,
    }));

    setBaseRooms((prev) => mergeRooms(prev, normalizedList));
    setLiveRooms((prev) => mergeRooms(prev, normalizedList));
    setLastSync(new Date().toISOString());
    setIsLayoutBuilderOpen(false);
    logHospitalityEvent('layout_saved', {
      source: 'floor-plan-page',
      roomsUpdated: normalizedList.length,
    });
  }, []);

  const combinedRooms = useMemo(() => {
    const merged = baseRooms.length
      ? mergeRooms(baseRooms, [])
      : [];
    return liveRooms.length ? mergeRooms(merged, liveRooms) : merged;
  }, [baseRooms, liveRooms]);

  const roomsWithTasks = useMemo(() => {
    return combinedRooms.map((room) => {
      const resourceTasks = tasksByResource.get(room.id) || [];
      const pendingTasks = resourceTasks.filter((task) => task && task.isCompleted === false);
      pendingTasks.sort((a, b) => {
        const aTime = a?.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
        const bTime = b?.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
        return aTime - bTime;
      });
      const pendingTask = pendingTasks[0] || null;
      return {
        ...room,
        housekeepingTask: pendingTask,
        hasHousekeepingTask: Boolean(pendingTask),
        housekeepingDueDate: pendingTask?.dueDate || null,
      };
    });
  }, [combinedRooms, tasksByResource]);

  const detailRoom = useMemo(() => {
    if (!detailRoomId) {
      return null;
    }
    return roomsWithTasks.find((room) => room.id === detailRoomId) || null;
  }, [detailRoomId, roomsWithTasks]);

  useEffect(() => {
    if (detailRoomId && detailRoom) {
      const floorKey = getFloorKey(detailRoom.floor);
      if (floorKey && floorKey !== floorFilter) {
        setFloorFilter(floorKey);
      }
      if (!isDetailOpen) {
        setIsDetailOpen(true);
      }
    }
  }, [detailRoomId, detailRoom, floorFilter, isDetailOpen, setFloorFilter, setIsDetailOpen]);

  useEffect(() => {
    if (detailRoomId && !detailRoom) {
      setDetailRoomId(null);
      setIsDetailOpen(false);
    }
  }, [detailRoomId, detailRoom, setDetailRoomId, setIsDetailOpen]);

  const detailCountdown = detailRoom ? getCountdownInfo(detailRoom.nextCheckIn) : null;
  const detailHousekeepingDue = detailRoom?.housekeepingDueDate
    ? new Date(detailRoom.housekeepingDueDate)
    : null;
  const detailHousekeepingDueLabel =
    detailHousekeepingDue && !Number.isNaN(detailHousekeepingDue.getTime())
      ? detailHousekeepingDue.toLocaleString()
      : null;

  const uniqueFloors = useMemo(() => {
    const set = new Set();
    roomsWithTasks.forEach((room) => {
      set.add(getFloorKey(room.floor));
    });
    const floors = Array.from(set);
    floors.sort((a, b) => {
      if (a === UNASSIGNED_FLOOR_KEY) return 1;
      if (b === UNASSIGNED_FLOOR_KEY) return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return floors;
  }, [roomsWithTasks]);

  useEffect(() => {
    if (floorFilter !== 'all' && !uniqueFloors.includes(floorFilter)) {
      setFloorFilter('all');
    }
  }, [uniqueFloors, floorFilter, setFloorFilter]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (floorFilter && floorFilter !== 'all') {
      params.set('floor', floorFilter);
    }
    if (statusFilter && statusFilter !== 'all') {
      params.set('status', statusFilter);
    }
    if (detailRoomId) {
      params.set('room', detailRoomId);
    }
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [floorFilter, statusFilter, detailRoomId, searchParams, setSearchParams]);

  useEffect(() => {
    if (previousFloorRef.current !== floorFilter) {
      logHospitalityEvent('floor_filter_changed', {
        source: 'floor-plan-page',
        floor: floorFilter,
      });
      previousFloorRef.current = floorFilter;
    }
  }, [floorFilter]);

  useEffect(() => {
    if (previousStatusRef.current !== statusFilter) {
      logHospitalityEvent('status_filter_changed', {
        source: 'floor-plan-page',
        status: statusFilter,
      });
      previousStatusRef.current = statusFilter;
    }
  }, [statusFilter]);

  useEffect(() => {
    if (previousRoomRef.current === detailRoomId) {
      return;
    }
    if (detailRoomId && detailRoom) {
      logHospitalityEvent('room_detail_opened', {
        source: 'floor-plan-page',
        roomId: detailRoom.id,
        roomName: detailRoom.name,
        floor: getFloorKey(detailRoom.floor),
      });
    } else if (previousRoomRef.current) {
      logHospitalityEvent('room_detail_closed', {
        source: 'floor-plan-page',
        roomId: previousRoomRef.current,
      });
    }
    previousRoomRef.current = detailRoomId;
  }, [detailRoomId, detailRoom]);

  const filteredRooms = useMemo(() => {
    return roomsWithTasks.filter((room) => {
      if (floorFilter !== 'all') {
        const key = getFloorKey(room.floor);
        if (key !== floorFilter) {
          return false;
        }
      }

      if (statusFilter !== 'all' && room.status !== statusFilter) {
        return false;
      }

      if (searchTerm.trim()) {
        const bucket = [
          room.name,
          room.floor,
          room.zone,
          Array.isArray(room.locationTags) ? room.locationTags.join(' ') : '',
          room.currentGuest,
        ]
          .join(' ')
          .toLowerCase();
        if (!bucket.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [roomsWithTasks, floorFilter, statusFilter, searchTerm]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPinned className="size-5" />
              Plano de habitaciones
            </CardTitle>
            <CardDescription>Organiza habitaciones por pisos y zonas.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <Card key={index}>
                <CardHeader>
                  <Skeleton className="h-4 w-1/3" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-6 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-1/4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle>Algo salió mal</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <MapPinned className="size-5 text-primary" />
                Plano de habitaciones
              </CardTitle>
              <CardDescription>
                Gestiona disponibilidad por piso, actualiza estados y organiza el layout.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-muted-foreground/10 bg-muted/10 p-4">
              <div className="text-sm text-muted-foreground">Habitaciones totales</div>
              <div className="mt-2 text-2xl font-semibold">{roomsWithTasks.length}</div>
            </Card>
            <Card className="border-muted-foreground/10 bg-emerald-50/60 p-4">
              <div className="text-sm text-emerald-600">Disponibles</div>
              <div className="mt-2 text-2xl font-semibold text-emerald-600">
                {roomsWithTasks.filter((room) => room.status === 'available').length}
              </div>
            </Card>
            <Card className="border-muted-foreground/10 bg-rose-50/60 p-4">
              <div className="text-sm text-rose-600">Ocupadas</div>
              <div className="mt-2 text-2xl font-semibold text-rose-600">
                {roomsWithTasks.filter((room) => room.status === 'occupied').length}
              </div>
            </Card>
            <Card className="border-muted-foreground/10 bg-sky-50/60 p-4">
              <div className="text-sm text-sky-600">Housekeeping pendientes</div>
              <div className="mt-2 text-2xl font-semibold text-sky-600">
                {roomsWithTasks.filter((room) => room.hasHousekeepingTask).length}
              </div>
            </Card>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros rápidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={floorFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setFloorFilter('all')}
                >
                  Todos los pisos
                </Button>
                {uniqueFloors.map((floorKey) => (
                  <Button
                    key={floorKey}
                    type="button"
                    size="sm"
                    variant={floorFilter === floorKey ? 'default' : 'outline'}
                    onClick={() => setFloorFilter(floorKey)}
                  >
                    {formatFloorLabel(floorKey)}
                  </Button>
                ))}
              </div>
              <Input
                className="max-w-sm"
                placeholder="Buscar por nombre, huésped, etiqueta..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map((filter) => (
                <Badge
                  key={filter.value}
                  variant={statusFilter === filter.value ? 'default' : 'outline'}
                  className="cursor-pointer px-3 py-1 text-xs"
                  onClick={() => setStatusFilter(filter.value)}
                >
                  {filter.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <HotelFloorPlan
          rooms={filteredRooms}
          lastUpdated={lastSync}
          onRoomAction={handleRoomAction}
          actionLoadingId={actionLoadingId}
          headerActions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                logHospitalityEvent('layout_builder_opened', {
                  source: 'floor-plan-page',
                });
                setIsLayoutBuilderOpen(true);
              }}
            >
              <Settings2 className="mr-2 size-4" />
              Organizar habitaciones
            </Button>
          }
          onRoomSelect={handleRoomSelect}
          selectedRoomId={detailRoom?.id || null}
        />
      </div>

      <QuickCheckInDialog
        open={isCheckInOpen}
        onOpenChange={(open) => {
          setIsCheckInOpen(open);
          if (!open) {
            setCheckInRoom(null);
          }
        }}
        room={checkInRoom}
        onSuccess={handleQuickCheckInSuccess}
      />

      <Drawer
        open={isDetailOpen && Boolean(detailRoom)}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) {
            setDetailRoomId(null);
          }
        }}
        direction="right"
      >
        <DrawerContent className="w-[97vw] sm:w-[1024px] sm:max-w-none">
          {detailRoom && (
            <>
              <DrawerHeader className="space-y-2">
                <Badge
                  className={cn(
                    'w-fit capitalize',
                    ROOM_STATUS_VARIANTS[detailRoom.status] || ROOM_STATUS_VARIANTS.available,
                  )}
                >
                  {getRoomStatusLabel(detailRoom.status)}
                </Badge>
                <DrawerTitle className="text-xl font-semibold">
                  {detailRoom.name}
                </DrawerTitle>
                <DrawerDescription className="text-sm text-muted-foreground">
                  Piso {getFloorLabel(getFloorKey(detailRoom.floor))}{' '}
                  {detailRoom.zone && detailRoom.zone !== UNASSIGNED_ZONE_LABEL
                    ? `· Zona ${detailRoom.zone}`
                    : ''}
                </DrawerDescription>
                {detailCountdown && (
                  <Badge
                    className={cn(
                      'w-fit text-xs font-medium',
                      getCountdownBadgeClass(detailCountdown),
                    )}
                  >
                    Check-in {detailCountdown.label}
                  </Badge>
                )}
              </DrawerHeader>

              <Card className="mx-4 mb-4 border-border/70">
                <CardContent className="space-y-4 p-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Huésped</p>
                    <p className="text-sm text-foreground">
                      {detailRoom.currentGuest || 'Sin huésped asignado'}
                    </p>
                  </div>
                  {(detailCountdown || detailRoom.hasHousekeepingTask) && (
                    <div className="flex flex-wrap items-center gap-2">
                      {detailCountdown && (
                        <Badge
                          className={cn(
                            'text-xs font-medium',
                            getCountdownBadgeClass(detailCountdown),
                          )}
                        >
                          Check-in {detailCountdown.label}
                        </Badge>
                      )}
                      {detailRoom.hasHousekeepingTask && (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-300 text-xs font-medium">
                          Housekeeping pendiente
                          {detailHousekeepingDueLabel && (
                            <span className="ml-1 font-normal opacity-80">
                              · {detailHousekeepingDueLabel}
                            </span>
                          )}
                        </Badge>
                      )}
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Próximo check-in</p>
                    <p className="text-sm text-foreground">
                      {detailRoom.nextCheckIn
                        ? new Date(detailRoom.nextCheckIn).toLocaleString()
                        : 'Sin reservas programadas'}
                    </p>
                  </div>
                  <Separator />
                  <div className="grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Piso</p>
                      <p>{getFloorLabel(getFloorKey(detailRoom.floor))}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Zona</p>
                      <p>{detailRoom.zone || UNASSIGNED_ZONE_LABEL}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Etiquetas</p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {Array.isArray(detailRoom.locationTags) && detailRoom.locationTags.length ? (
                          detailRoom.locationTags.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin etiquetas</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Housekeeping</p>
                      <p>
                        {detailRoom.hasHousekeepingTask
                          ? 'Tarea pendiente'
                          : detailRoom.status === 'housekeeping'
                            ? 'En curso'
                            : 'Sin pendientes'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Vence</p>
                      <p>
                        {detailHousekeepingDueLabel || 'Sin fecha programada'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <DrawerFooter className="gap-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    type="button"
                    variant="default"
                    onClick={() => handleRoomAction({ type: 'check-in', room: detailRoom })}
                  >
                    <UserPlus className="mr-2 size-4" />
                    Check-in walk-in
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleRoomAction({ type: 'check-out', room: detailRoom })}
                    disabled={detailRoom.status === 'housekeeping'}
                  >
                    <DoorOpen className="mr-2 size-4" />
                    Registrar check-out
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRoomAction({ type: 'housekeeping', room: detailRoom })}
                  >
                    <Sparkles className="mr-2 size-4" />
                    Solicitar housekeeping
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRoomAction({ type: 'housekeeping-done', room: detailRoom })}
                    disabled={detailRoom.status !== 'housekeeping'}
                  >
                    <Sparkles className="mr-2 size-4 rotate-180" />
                    Housekeeping listo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRoomAction({ type: 'maintenance-on', room: detailRoom })}
                    disabled={detailRoom.status === 'maintenance'}
                  >
                    <BedDouble className="mr-2 size-4" />
                    Bloquear mantenimiento
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRoomAction({ type: 'maintenance-off', room: detailRoom })}
                    disabled={detailRoom.status !== 'maintenance'}
                  >
                    <ShieldOff className="mr-2 size-4" />
                    Liberar mantenimiento
                  </Button>
                </div>
                <DrawerClose asChild>
                  <Button type="button" variant="ghost">
                    Cerrar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <HotelFloorPlanBuilder
        open={isLayoutBuilderOpen}
        onOpenChange={setIsLayoutBuilderOpen}
        onSaved={handleLayoutSaved}
        initialRooms={combinedRooms}
      />
    </>
  );
}
