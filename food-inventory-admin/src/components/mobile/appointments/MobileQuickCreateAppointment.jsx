import { useEffect, useMemo, useState } from 'react';
import { format, addMinutes, startOfDay, setHours, setMinutes, roundToNearestMinutes } from 'date-fns';
import { Search, ChevronRight, Clock, User, Scissors, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { cn } from '@/lib/utils';

// Crear cita rápida en 1 pantalla mobile.
// - Cliente: búsqueda (client local / create inline)
// - Servicio: chips con top frecuentes
// - Hora: sugerencias rápidas + picker manual
// - Recurso: preseleccionado

const toTimeInputValue = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

function nextQuarterHour(base) {
  return roundToNearestMinutes(addMinutes(base, 1), { nearestTo: 15, roundingMethod: 'ceil' });
}

export default function MobileQuickCreateAppointment({
  date,
  endpoint,
  isBeauty,
  initialStart,
  onClose,
}) {
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startAt, setStartAt] = useState(
    initialStart ? new Date(initialStart) : nextQuarterHour(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const servicesEndpoint = isBeauty ? '/beauty-services' : '/services/active';
  const resourcesEndpoint = isBeauty ? '/professionals' : '/resources';

  useEffect(() => {
    (async () => {
      try {
        const [svc, res] = await Promise.all([
          fetchApi(servicesEndpoint),
          fetchApi(resourcesEndpoint),
        ]);
        const svcList = Array.isArray(svc?.data) ? svc.data : Array.isArray(svc) ? svc : [];
        const resList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        setServices(svcList);
        setResources(resList);
      } catch (err) {
        console.error(err);
      }
    })();
  }, [servicesEndpoint, resourcesEndpoint]);

  // Customer search
  useEffect(() => {
    if (query.length < 2) {
      setCustomers([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const data = await fetchApi(`/customers?search=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
        setCustomers(list);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const selectedService = useMemo(
    () => services.find((s) => String(s._id || s.id) === serviceId),
    [services, serviceId],
  );

  const duration = selectedService?.duration || selectedService?.durationMinutes || 60;
  const endAt = useMemo(() => addMinutes(startAt, duration), [startAt, duration]);

  const quickTimes = useMemo(() => {
    const base = startOfDay(date);
    const now = new Date();
    const isToday = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const pivot = isToday ? nextQuarterHour(now) : setMinutes(setHours(base, 10), 0);
    return [
      { label: isToday ? 'Ahora' : '10:00', at: pivot },
      { label: format(addMinutes(pivot, 60), 'HH:mm'), at: addMinutes(pivot, 60) },
      { label: format(addMinutes(pivot, 120), 'HH:mm'), at: addMinutes(pivot, 120) },
      { label: format(addMinutes(pivot, 180), 'HH:mm'), at: addMinutes(pivot, 180) },
    ];
  }, [date]);

  const handlePickCustomer = (c) => {
    setCustomerId(String(c._id || c.id));
    setCustomerName(c.name || c.companyName || c.fullName || '');
    setQuery('');
    setCustomers([]);
  };

  const submit = async () => {
    if (!customerName && !customerId) {
      toast.error('Selecciona un cliente');
      return;
    }
    if (!serviceId) {
      toast.error('Selecciona un servicio');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        customerId: customerId || undefined,
        customerName: customerName || undefined,
        serviceId,
        resourceId: resourceId || undefined,
        startTime: startAt.toISOString(),
        endTime: endAt.toISOString(),
        notes: notes || undefined,
        status: 'pending',
      };
      await fetchApi(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success('Cita creada');
      onClose?.(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo crear la cita');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title="Nueva cita"
      className="max-h-[92vh] overflow-y-auto mobile-scroll"
    >
      <div className="space-y-4 pb-20">
        {/* Cliente */}
        <section>
          <label className="text-xs font-medium text-muted-foreground">Cliente</label>
          {customerName ? (
            <div className="mt-1 flex items-center justify-between rounded-xl bg-muted px-3 py-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <span className="font-medium">{customerName}</span>
              </div>
              <button
                type="button"
                aria-label="Quitar"
                onClick={() => {
                  setCustomerId('');
                  setCustomerName('');
                }}
                className="tap-target no-tap-highlight text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              <div className="mt-1 flex items-center gap-2 rounded-xl bg-muted px-3">
                <Search size={16} className="text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar o escribir nombre…"
                  className="flex-1 bg-transparent py-3 text-base outline-none"
                />
              </div>
              {customers.length > 0 && (
                <ul className="mt-1 rounded-xl border border-border overflow-hidden">
                  {customers.map((c) => (
                    <li key={c._id || c.id}>
                      <button
                        type="button"
                        onClick={() => handlePickCustomer(c)}
                        className="w-full text-left px-3 py-3 flex items-center justify-between hover:bg-muted no-tap-highlight"
                      >
                        <span className="font-medium">
                          {c.name || c.companyName || c.fullName}
                        </span>
                        <ChevronRight size={14} className="text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.length >= 2 && customers.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomerName(query);
                    setQuery('');
                  }}
                  className="mt-2 text-sm font-medium text-primary no-tap-highlight"
                >
                  + Crear "{query}" como nuevo cliente
                </button>
              )}
            </>
          )}
        </section>

        {/* Servicio */}
        <section>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Scissors size={12} /> Servicio
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {services.slice(0, 12).map((s) => {
              const id = String(s._id || s.id);
              const active = id === serviceId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setServiceId(id)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border text-foreground',
                  )}
                >
                  {s.name}
                </button>
              );
            })}
            {services.length === 0 && (
              <span className="text-sm text-muted-foreground">Sin servicios configurados</span>
            )}
          </div>
        </section>

        {/* Hora */}
        <section>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Clock size={12} /> Hora
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {quickTimes.map((q) => {
              const active = format(q.at, 'HH:mm') === format(startAt, 'HH:mm');
              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setStartAt(q.at)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-card border-border',
                  )}
                >
                  {q.label}
                </button>
              );
            })}
          </div>
          <input
            type="datetime-local"
            value={toTimeInputValue(startAt)}
            onChange={(e) => setStartAt(new Date(e.target.value))}
            className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-3 text-base"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Duración: {duration} min · Termina a las {format(endAt, 'HH:mm')}
          </p>
        </section>

        {/* Recurso */}
        {resources.length > 0 && (
          <section>
            <label className="text-xs font-medium text-muted-foreground">Profesional</label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setResourceId('')}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                  !resourceId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                Sin asignar
              </button>
              {resources.map((r) => {
                const id = String(r._id || r.id);
                const active = id === resourceId;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setResourceId(id)}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                      active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                    )}
                  >
                    {r.name || r.fullName}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Notas */}
        <section>
          <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            placeholder="Preferencias, observaciones…"
          />
        </section>
      </div>

      {/* Sticky save */}
      <div
        className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 bg-card border-t border-border safe-bottom"
        style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
      >
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full rounded-xl bg-primary text-primary-foreground py-4 text-base font-semibold no-tap-highlight disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Guardar cita'}
        </button>
      </div>
    </MobileActionSheet>
  );
}
