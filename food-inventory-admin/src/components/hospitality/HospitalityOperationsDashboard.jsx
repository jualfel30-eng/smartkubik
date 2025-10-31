import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import { fetchApi } from '@/lib/api';
import HotelFloorPlan from './HotelFloorPlan.jsx';

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
    const existing = map.get(String(id));
    map.set(String(id), {
      ...existing,
      ...room,
      id: String(id),
      status: room.status || existing?.status || 'available',
      hasHousekeepingTask:
        room.hasHousekeepingTask ?? existing?.hasHousekeepingTask ?? false,
    });
  });
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function MetricCard({ title, value, hint }) {
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
    const base = Array.isArray(data?.floorPlan) ? data.floorPlan : [];
    return liveRooms.length ? mergeRooms(base, liveRooms) : mergeRooms(base, []);
  }, [data?.floorPlan, liveRooms]);

  return (
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

      <HotelFloorPlan rooms={floorPlanRooms} lastUpdated={lastSync} />
    </div>
  );
}

MetricCard.defaultProps = {
  hint: null,
};
