import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { fetchApi } from '@/lib/api';
import HotelFloorPlan from './HotelFloorPlan.jsx';
import QuickCheckInDialog from './QuickCheckInDialog.jsx';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import HotelFloorPlanBuilder from './HotelFloorPlanBuilder.jsx';
import { Settings2 } from 'lucide-react';
import { compareRooms, normalizeHospitalityResource } from './utils.js';

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

function MetricCard({ title, value, hint = null }) {
  return (
    <Card>
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
        const response = await fetchApi('/resources', { signal: controller.signal });
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

  const handleRoomAction = useCallback(
    (action) => {
      if (!action?.room) {
        return;
      }

      const { room } = action;

      if (action.type === 'check-in') {
        setCheckInRoom(room);
        setIsCheckInOpen(true);
        return;
      }

      if (action.type === 'check-out') {
        void updateRoomStatus(room, 'housekeeping', {
          toastMessage: 'Check-out registrado. Housekeeping pendiente.',
        });
        return;
      }

      if (action.type === 'housekeeping') {
        void updateRoomStatus(room, 'housekeeping', {
          toastMessage: 'Se notificó a housekeeping para la habitación.',
        });
        return;
      }

      if (action.type === 'housekeeping-done') {
        void updateRoomStatus(room, 'available', {
          toastMessage: 'Habitación lista nuevamente.',
        });
        return;
      }

      if (action.type === 'maintenance-on') {
        void updateRoomStatus(room, 'maintenance', {
          toastMessage: 'Habitación bloqueada por mantenimiento.',
        });
        return;
      }

      if (action.type === 'maintenance-off') {
        void updateRoomStatus(room, 'available', {
          toastMessage: 'Habitación liberada de mantenimiento.',
        });
        return;
      }

      if (action.type === 'status' && action.status) {
        const messages = {
          available: 'Habitación liberada.',
          occupied: 'Habitación marcada como ocupada.',
          housekeeping: 'Se notificó a housekeeping.',
          maintenance: 'Habitación bloqueada por mantenimiento.',
        };
        void updateRoomStatus(room, action.status, {
          toastMessage: messages[action.status] || 'Estado actualizado.',
        });
      }
    },
    [updateRoomStatus],
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
      }
    },
    [resourceLookup, updateRoomStatus],
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

  const floorPlanRooms = useMemo(() => {
    const analyticsRooms = Array.isArray(data?.floorPlan) ? data.floorPlan : [];
    const baseWithCatalogue = resourceRooms.length
      ? mergeRooms(resourceRooms, analyticsRooms)
      : mergeRooms(analyticsRooms, []);
    return liveRooms.length ? mergeRooms(baseWithCatalogue, liveRooms) : baseWithCatalogue;
  }, [data?.floorPlan, liveRooms, resourceRooms]);

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
            <MetricCard key={metric.title} title={metric.title} value={metric.value} hint={metric.hint} />
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
          actionLoadingId={actionLoadingId}
          headerActions={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLayoutBuilderOpen(true)}
            >
              <Settings2 className="mr-2 size-4" />
              Organizar habitaciones
            </Button>
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
      <HotelFloorPlanBuilder
        open={isLayoutBuilderOpen}
        onOpenChange={setIsLayoutBuilderOpen}
        onSaved={handleLayoutSaved}
        initialRooms={resourceRooms}
      />
    </>
  );
}
