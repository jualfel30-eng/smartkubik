import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { fetchApi } from '@/lib/api';
import HotelFloorPlan from './HotelFloorPlan.jsx';
import QuickCheckInDialog from './QuickCheckInDialog.jsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import HotelFloorPlanBuilder from './HotelFloorPlanBuilder.jsx';
import { Badge } from '@/components/ui/badge.jsx';
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
import { cn } from '@/lib/utils.js';
import { Settings2, DoorOpen, BedDouble, Sparkles, UserPlus, ShieldOff, MapPinned } from 'lucide-react';
import {
  compareRooms,
  normalizeHospitalityResource,
  ROOM_STATUS_VARIANTS,
  getRoomStatusLabel,
  getFloorKey,
  getFloorLabel,
  UNASSIGNED_FLOOR_KEY,
  UNASSIGNED_ZONE_LABEL,
  getCountdownInfo,
  getCountdownBadgeClass,
  logHospitalityEvent,
} from './utils.js';
import { useHousekeepingTasks } from './useHousekeepingTasks.js';

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

function MetricCard({ title, value, hint = null, onClick, isActive = false }) {
  return (
    <Card
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(event) => {
        if (!onClick) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'transition ring-offset-background focus-visible:ring-ring/50',
        onClick
          ? 'cursor-pointer hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2'
          : '',
        isActive && 'border-primary/60 shadow-md',
      )}
    >
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {hint && <CardDescription>{hint}</CardDescription>}
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function HospitalityOperationsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFloorParam = searchParams.get('floor');
  const initialRoomParam = searchParams.get('room');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liveRooms, setLiveRooms] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [resourceRooms, setResourceRooms] = useState([]);
  const [resourceLookup, setResourceLookup] = useState({});
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [checkInRoom, setCheckInRoom] = useState(null);
  const [isLayoutBuilderOpen, setIsLayoutBuilderOpen] = useState(false);
  const [detailRoomId, setDetailRoomId] = useState(initialRoomParam || null);
  const [isDetailOpen, setIsDetailOpen] = useState(Boolean(initialRoomParam));
  const [floorFilter, setFloorFilter] = useState(
    initialFloorParam && initialFloorParam.trim().length ? initialFloorParam : 'all',
  );
  const {
    tasksByResource,
    refresh: refreshHousekeepingTasks,
    markPendingForResource,
    markCompletedForResource,
  } = useHousekeepingTasks();
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadOperations() {
      try {
        setLoading(true);
        setError(null);
        const today = new Date();
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        const query = new URLSearchParams({
          startDate: start.toISOString(),
          endDate: today.toISOString(),
        });
        const response = await fetchApi(`/analytics/hospitality/hotel-ops?${query.toString()}`, {
          signal: controller.signal,
        });
        if (!isMounted) {
          return;
        }
        setData(response.data || response);
        setLiveRooms([]);
        setLastSync(null);
      } catch (err) {
        if (!isMounted) {
          return;
        }
        setError(err.message || 'No pudimos cargar las métricas hoteleras.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadOperations();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const metrics = useMemo(() => {
    if (!data?.kpis) {
      return [];
    }
    const formatter = new Intl.NumberFormat('es-VE', { maximumFractionDigits: 2 });
    return [
      {
        title: 'Ocupación promedio',
        value: `${Math.round((data.kpis.occupancyRate || 0) * 100)}%`,
        hint: 'Habitaciones ocupadas vs capacidad total',
      },
      {
        title: 'Utilización SPA',
        value: `${Math.round((data.kpis.spaUtilization || 0) * 100)}%`,
        hint: 'Reservas en servicios de spa y wellness',
      },
      {
        title: 'Upsells (addons)',
        value: `$${formatter.format(data.kpis.addonsRevenue || 0)}`,
        hint: 'Ingresos generados por experiencias adicionales',
      },
      {
        title: 'Depósitos recuperados',
        value: `$${formatter.format(data.kpis.recoveredRevenue || 0)}`,
        hint: `${data.kpis.pendingDeposits || 0} pendientes de validar`,
      },
      {
        title: 'Paquetes vendidos',
        value: `${data.kpis.packagesSold || 0}`,
        hint: `Ingresos: $${formatter.format(data.kpis.packageRevenue || 0)}`,
      },
      {
        title: 'Clientes fidelizados',
        value: `${data.kpis.highlyEngagedCustomers || 0}`,
        hint: `${data.kpis.communicationTouchpoints || 0} interacciones registradas`,
      },
    ];
  }, [data]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadRoomsCatalogue() {
      try {
        const response = await fetchApi('/resources?type=room&status=active', {
          signal: controller.signal,
        });
        if (!isMounted) {
          return;
        }
        const rawResources = Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : response?.items || [];
        const lookup = {};
        const rooms = [];

        rawResources.forEach((resource) => {
          if (!resource) {
            return;
          }
          const type = String(
            resource.type || resource.category || resource.resourceType || '',
          ).toLowerCase();
          const isRoom =
            type === 'room' ||
            resource.tags?.includes('room') ||
            resource.allowedResourceTypes?.includes?.('room');
          if (!isRoom) {
            return;
          }

          const normalized = normalizeHospitalityResource(resource);
          if (!normalized) {
            return;
          }

          lookup[normalized.id] = resource;
          rooms.push(normalized);
        });

        rooms.sort(compareRooms);
        setResourceLookup(lookup);
        setResourceRooms(rooms);
      } catch (err) {
        if (!isMounted || err.name === 'AbortError') {
          return;
        }
        console.warn('No se pudieron cargar los recursos tipo habitación:', err);
        setResourceRooms([]);
        setResourceLookup({});
      }
    }

    loadRoomsCatalogue();
    return () => {
      isMounted = false;
      controller.abort();
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

        setResourceRooms((prev) =>
          mergeRooms(prev, [
            {
              id: roomId,
              name: baseName,
              status,
              currentGuest: guestName,
              nextCheckIn: upcomingCheckIn,
              hasHousekeepingTask: housekeepingFlag,
            },
          ]),
        );

        setLiveRooms((prev) =>
          mergeRooms(prev, [
            {
              id: roomId,
              name: baseName,
              status,
              currentGuest: guestName,
              nextCheckIn: upcomingCheckIn,
              hasHousekeepingTask: housekeepingFlag,
            },
          ]),
        );

        setLastSync(new Date().toISOString());

        if (!suppressToast) {
          toast.success(toastMessage || 'Estado de la habitación actualizado.');
        }
      } catch (err) {
        if (!suppressToast) {
          toast.error(err.message || 'No pudimos actualizar la habitación.');
        }
        throw err;
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
        console.error(`No se pudo marcar housekeeping como completado para ${room.name}`, error);
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
        source: 'operations-dashboard',
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
            toastMessage: 'Se notificó a housekeeping para la habitación.',
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
            toastMessage: 'Habitación lista nuevamente.',
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

      const baseName =
        room.name ||
        resourceLookup[room.id]?.name ||
        resourceLookup[room.id]?.displayName ||
        `Habitación ${room.id}`;

      const stayEndsAt = checkOut || resourceLookup[room.id]?.metadata?.nextCheckIn || null;

      logHospitalityEvent('quick_checkin_completed', {
        source: 'operations-dashboard',
        roomId: room.id,
        roomName: baseName,
        guestName,
        scheduledCheckout: stayEndsAt,
      });

      setLiveRooms((prev) =>
        mergeRooms(prev, [
          {
            id: room.id,
            name: baseName,
            status: 'occupied',
            currentGuest: guestName,
            nextCheckIn: stayEndsAt,
            hasHousekeepingTask: false,
          },
        ]),
      );
      setLastSync(new Date().toISOString());

      try {
        await updateRoomStatus(
          { ...room, name: baseName, currentGuest: guestName, nextCheckIn: stayEndsAt },
          'occupied',
          {
            skipLoading: true,
            suppressToast: true,
            currentGuestName: guestName,
            nextCheckIn: stayEndsAt,
          },
        );
      } finally {
        setCheckInRoom(null);
        setDetailRoomId(room.id);
        setIsDetailOpen(true);
      }
    },
    [resourceLookup, updateRoomStatus],
  );

  const handleRoomSelect = useCallback(
    (room) => {
      if (!room?.id) {
        return;
      }
      const floorKey = getFloorKey(room.floor);
      if (floorKey && floorKey !== floorFilter) {
        setFloorFilter(floorKey);
      }
      logHospitalityEvent('room_selected', {
        source: 'operations-dashboard',
        roomId: room.id,
        roomName: room.name,
        floor: floorKey,
      });
      setDetailRoomId(room.id);
      setIsDetailOpen(true);
    },
    [floorFilter],
  );

  const handleLayoutSaved = useCallback(
    (updatedResources = [], normalizedRooms) => {
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

      setResourceLookup((prev) => {
        const next = { ...prev };
        updatedResources.forEach((resource) => {
          if (!resource) {
            return;
          }
          const resourceId =
            resource._id || resource.id || resource.resourceId;
          if (!resourceId) {
            return;
          }
          next[String(resourceId)] = resource;
        });
        return next;
      });

      setResourceRooms((prev) => mergeRooms(prev, normalizedList));
      setLiveRooms((prev) => mergeRooms(prev, normalizedList));
      setLastSync(new Date().toISOString());
      setIsLayoutBuilderOpen(false);
      logHospitalityEvent('layout_saved', {
        source: 'operations-dashboard',
        roomsUpdated: normalizedList.length,
      });
      toast.success('Distribución de habitaciones actualizada.');
    },
    [],
  );

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const handler = (event) => {
      const detail = event.detail || {};
      if (!Array.isArray(detail.rooms)) {
        return;
      }
      setLiveRooms((prev) => mergeRooms(prev, detail.rooms));
      setLastSync(detail.updatedAt || new Date().toISOString());
    };

    window.addEventListener('hospitality-floorplan-sync', handler);
    return () => window.removeEventListener('hospitality-floorplan-sync', handler);
  }, []);

  const mergedRooms = useMemo(() => {
    const analyticsRooms = Array.isArray(data?.floorPlan) ? data.floorPlan : [];
    const baseWithCatalogue = resourceRooms.length
      ? mergeRooms(resourceRooms, analyticsRooms)
      : mergeRooms(analyticsRooms, []);
    return liveRooms.length ? mergeRooms(baseWithCatalogue, liveRooms) : baseWithCatalogue;
  }, [data?.floorPlan, liveRooms, resourceRooms]);

  const roomsWithTasks = useMemo(() => {
    return mergedRooms.map((room) => {
      const resourceTasks = tasksByResource.get(room.id) || [];
      const pendingTask = resourceTasks.find((task) => task && task.isCompleted === false) || null;
      return {
        ...room,
        housekeepingTask: pendingTask,
        hasHousekeepingTask: Boolean(pendingTask),
        housekeepingDueDate: pendingTask?.dueDate || null,
      };
    });
  }, [mergedRooms, tasksByResource]);

  const floorPlanRooms = useMemo(() => {
    if (floorFilter === 'all') {
      return roomsWithTasks;
    }
    return roomsWithTasks.filter((room) => getFloorKey(room.floor) === floorFilter);
  }, [roomsWithTasks, floorFilter]);

  const detailRoom = useMemo(() => {
    if (!detailRoomId) {
      return null;
    }
    return roomsWithTasks.find((room) => room.id === detailRoomId) || null;
  }, [detailRoomId, roomsWithTasks]);

  const uniqueFloors = useMemo(() => {
    const floorsSet = new Set();
    roomsWithTasks.forEach((room) => {
      floorsSet.add(getFloorKey(room.floor));
    });
    const floors = Array.from(floorsSet);
    floors.sort((a, b) => {
      if (a === UNASSIGNED_FLOOR_KEY) return 1;
      if (b === UNASSIGNED_FLOOR_KEY) return -1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    });
    return floors;
  }, [roomsWithTasks]);

  useEffect(() => {
    if (floorFilter !== 'all' && uniqueFloors.length && !uniqueFloors.includes(floorFilter)) {
      setFloorFilter('all');
    }
  }, [floorFilter, uniqueFloors, setFloorFilter]);

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
  }, [detailRoomId, detailRoom]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (floorFilter && floorFilter !== 'all') {
      params.set('floor', floorFilter);
    }
    if (detailRoomId) {
      params.set('room', detailRoomId);
    }
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [floorFilter, detailRoomId, searchParams, setSearchParams]);

  const previousFloorRef = useRef(floorFilter);
  useEffect(() => {
    if (previousFloorRef.current !== floorFilter) {
      logHospitalityEvent('floor_filter_changed', {
        source: 'operations-dashboard',
        floor: floorFilter,
      });
      previousFloorRef.current = floorFilter;
    }
  }, [floorFilter]);

  const previousRoomRef = useRef(detailRoomId);
  useEffect(() => {
    if (previousRoomRef.current === detailRoomId) {
      return;
    }
    if (detailRoomId && detailRoom) {
      logHospitalityEvent('room_detail_opened', {
        source: 'operations-dashboard',
        roomId: detailRoom.id,
        roomName: detailRoom.name,
        floor: getFloorKey(detailRoom.floor),
      });
    } else if (previousRoomRef.current) {
      logHospitalityEvent('room_detail_closed', {
        source: 'operations-dashboard',
        roomId: previousRoomRef.current,
      });
    }
    previousRoomRef.current = detailRoomId;
  }, [detailRoomId, detailRoom]);

  const detailCountdown = detailRoom ? getCountdownInfo(detailRoom.nextCheckIn) : null;
  const detailHousekeepingDue = detailRoom?.housekeepingDueDate
    ? new Date(detailRoom.housekeepingDueDate)
    : null;
  const detailHousekeepingDueLabel =
    detailHousekeepingDue && !Number.isNaN(detailHousekeepingDue.getTime())
      ? detailHousekeepingDue.toLocaleString()
      : null;

  const handleOpenFullMap = useCallback(() => {
    const params = new URLSearchParams();
    if (floorFilter && floorFilter !== 'all') {
      params.set('floor', floorFilter);
    }
    if (detailRoomId) {
      params.set('room', detailRoomId);
    }
    const query = params.toString();
    logHospitalityEvent('deep_link_opened', {
      source: 'operations-dashboard',
      target: 'floor-plan-page',
      floor: floorFilter,
      roomId: detailRoomId,
    });
    navigate(`/hospitality/floor-plan${query ? `?${query}` : ''}`);
  }, [detailRoomId, floorFilter, navigate]);

  const focusFloorForOccupancy = useCallback(() => {
    if (!roomsWithTasks.length) {
      return;
    }
    const floorScores = new Map();
    roomsWithTasks.forEach((room) => {
      const key = getFloorKey(room.floor);
      const current = floorScores.get(key) || 0;
      let weight = 0;
      if (room.status === 'occupied') {
        weight += 2;
      } else if (room.status === 'upcoming') {
        weight += 1;
      }
      if (room.hasHousekeepingTask) {
        weight += 1;
      }
      floorScores.set(key, current + weight);
    });
    const [bestFloor] =
      Array.from(floorScores.entries()).sort((a, b) => b[1] - a[1])[0] || [];
    if (!bestFloor) {
      return;
    }
    setFloorFilter(bestFloor);
    logHospitalityEvent('kpi_focus_floor', {
      source: 'operations-dashboard',
      floor: bestFloor,
    });
    const focusRoom =
      roomsWithTasks.find(
        (room) => getFloorKey(room.floor) === bestFloor && room.status === 'occupied',
      ) ||
      roomsWithTasks.find((room) => getFloorKey(room.floor) === bestFloor);
    if (focusRoom) {
      setDetailRoomId(focusRoom.id);
      setIsDetailOpen(true);
    }
  }, [roomsWithTasks]);

  if (loading) {
    return (
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-2/5" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-1/5" />
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
      <div className="grid gap-6">
        <div className="grid gap-4 md:grid-cols-3">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.title}
              title={metric.title}
              value={metric.value}
              hint={metric.hint}
              onClick={() => {
                logHospitalityEvent('kpi_clicked', {
                  source: 'operations-dashboard',
                  metric: metric.title,
                });
                if (metric.title === 'Ocupación promedio') {
                  focusFloorForOccupancy();
                }
              }}
            />
          ))}
        </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen temporal</CardTitle>
          <CardDescription>
            Evolución diaria de ocupación, uso de spa y no-shows para el rango seleccionado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {Array.isArray(data?.timeSeries) && data.timeSeries.length > 0 ? (
            <div className="space-y-2 text-sm">
              {data.timeSeries.map((item) => (
                <div
                  key={item.date}
                  className="flex flex-wrap items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2"
                >
                  <span className="font-medium text-foreground">{new Date(item.date).toLocaleDateString()}</span>
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <span>Ocupación: {Math.round(item.occupancyRate * 100)}%</span>
                    <span>SPA: {Math.round(item.spaUtilization * 100)}%</span>
                    <span>Ingresos: ${item.revenue.toFixed(2)}</span>
                    <span>No-shows: {item.noShows}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aún no hay datos históricos suficientes para generar la serie temporal.
            </p>
          )}
        </CardContent>
      </Card>

        <HotelFloorPlan
          rooms={floorPlanRooms}
          lastUpdated={lastSync}
          onRoomAction={handleRoomAction}
          onRoomSelect={handleRoomSelect}
          selectedRoomId={detailRoom?.id || null}
          actionLoadingId={actionLoadingId}
          headerActions={
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-end">
              <div className="flex flex-wrap items-center gap-2">
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
                    {getFloorLabel(floorKey)}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={handleOpenFullMap}>
                  <MapPinned className="mr-2 size-4" />
                  Abrir en mapa
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    logHospitalityEvent('layout_builder_opened', {
                      source: 'operations-dashboard',
                    });
                    setIsLayoutBuilderOpen(true);
                  }}
                >
                  <Settings2 className="mr-2 size-4" />
                  Organizar habitaciones
                </Button>
              </div>
            </div>
          }
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
                <DrawerDescription>
                  Piso {getFloorLabel(getFloorKey(detailRoom.floor))}
                  {detailRoom.zone && detailRoom.zone !== UNASSIGNED_ZONE_LABEL
                    ? ` · Zona ${detailRoom.zone}`
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
                      <p>{detailHousekeepingDueLabel || 'Sin fecha programada'}</p>
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
        initialRooms={resourceRooms}
      />
    </>
  );
}
