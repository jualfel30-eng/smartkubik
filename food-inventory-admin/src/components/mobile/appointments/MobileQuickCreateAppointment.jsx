import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addMinutes, startOfDay, setHours, setMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ChevronRight, Clock, User, Scissors, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { cn } from '@/lib/utils';
import haptics from '@/lib/haptics';

const toTimeInputValue = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

function nextQuarterHour(base) {
  return roundToNearestMinutes(addMinutes(base, 1), { nearestTo: 15, roundingMethod: 'ceil' });
}

export default function MobileQuickCreateAppointment({
  date,
  endpoint,
  isBeauty,
  isOnline = true,
  initialStart,
  onClose,
}) {
  const [services, setServices] = useState([]);
  const [packages, setPackages] = useState([]);
  const [resources, setResources] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [query, setQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  // Multi-select: array of selected service IDs
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  // Package selection
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [resourceId, setResourceId] = useState('');
  const [startAt, setStartAt] = useState(
    initialStart ? new Date(initialStart) : nextQuarterHour(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  const servicesEndpoint = isBeauty ? '/beauty-services' : '/services/active';
  const resourcesEndpoint = isBeauty ? '/professionals' : '/resources';

  // Load services, resources, and recent clients
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addMinutes(startOfDay(new Date()), 24 * 60), 'yyyy-MM-dd');

    const pkgPromise = isBeauty ? fetchApi('/service-packages?isActive=true') : Promise.resolve(null);

    Promise.allSettled([
      fetchApi(servicesEndpoint),
      fetchApi(resourcesEndpoint),
      fetchApi(`${endpoint}?startDate=${today}&endDate=${tomorrow}&limit=50`),
      pkgPromise,
    ]).then(([svcRes, resRes, apptRes, pkgRes]) => {
      if (svcRes.status === 'fulfilled') {
        const list = Array.isArray(svcRes.value?.data) ? svcRes.value.data : Array.isArray(svcRes.value) ? svcRes.value : [];
        setServices(list);
      }
      if (resRes.status === 'fulfilled') {
        const list = Array.isArray(resRes.value?.data) ? resRes.value.data : Array.isArray(resRes.value) ? resRes.value : [];
        setResources(list);
      }
      if (pkgRes?.status === 'fulfilled' && pkgRes.value) {
        const list = Array.isArray(pkgRes.value?.data) ? pkgRes.value.data : Array.isArray(pkgRes.value) ? pkgRes.value : [];
        setPackages(list);
      }
      if (apptRes.status === 'fulfilled') {
        const raw = Array.isArray(apptRes.value?.data) ? apptRes.value.data : Array.isArray(apptRes.value) ? apptRes.value : [];
        // Extract unique clients from today's bookings
        const seen = new Set();
        const recent = [];
        for (const apt of raw) {
          const name = apt.client?.name || apt.customerName || '';
          const phone = apt.client?.phone || apt.customerPhone || '';
          const key = name.toLowerCase();
          if (name && !seen.has(key)) {
            seen.add(key);
            recent.push({ name, phone });
          }
        }
        setRecentClients(recent.slice(0, 5));
      }
    }).finally(() => setLoadingData(false));
  }, [servicesEndpoint, resourcesEndpoint, endpoint]);

  // Customer async search
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
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  // Derived: selected service objects
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(String(s._id || s.id))),
    [services, selectedServiceIds],
  );

  // Accumulated totals across all selected services
  const totalDuration = selectedServices.length > 0
    ? selectedServices.reduce((sum, s) => sum + (s.duration || s.durationMinutes || 60), 0)
    : 60;
  const totalPrice = selectedServices.reduce(
    (sum, s) => sum + (Number(s.price?.amount ?? s.price) || 0),
    0,
  );

  const endAt = useMemo(() => addMinutes(startAt, totalDuration), [startAt, totalDuration]);

  const quickTimes = useMemo(() => {
    const base = startOfDay(date);
    const now = new Date();
    const isTodayFlag = format(date, 'yyyy-MM-dd') === format(now, 'yyyy-MM-dd');
    const pivot = isTodayFlag ? nextQuarterHour(now) : setMinutes(setHours(base, 10), 0);
    return [
      { label: isTodayFlag ? 'Ahora' : '10:00', at: pivot },
      { label: format(addMinutes(pivot, 60), 'HH:mm'), at: addMinutes(pivot, 60) },
      { label: format(addMinutes(pivot, 120), 'HH:mm'), at: addMinutes(pivot, 120) },
      { label: format(addMinutes(pivot, 180), 'HH:mm'), at: addMinutes(pivot, 180) },
    ];
  }, [date]);

  const handlePickCustomer = (c) => {
    setCustomerName(c.name || c.companyName || c.fullName || '');
    setCustomerPhone(c.phone || c.mobile || '');
    setQuery('');
    setCustomers([]);
  };

  const clearCustomer = () => {
    setCustomerName('');
    setCustomerPhone('');
  };

  const toggleService = (id) => {
    haptics.select();
    // Deselect package if user manually picks services
    if (selectedPackageId) setSelectedPackageId('');
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  const selectPackage = (pkg) => {
    haptics.select();
    if (selectedPackageId === String(pkg._id || pkg.id)) {
      // Deselect
      setSelectedPackageId('');
      setSelectedServiceIds([]);
    } else {
      setSelectedPackageId(String(pkg._id || pkg.id));
      const svcIds = (pkg.services || []).map((s) => String(s._id || s.id || s));
      setSelectedServiceIds(svcIds);
    }
  };

  const checkConflicts = useCallback(async () => {
    if (!resourceId) return null;
    try {
      const dateStr = format(startAt, 'yyyy-MM-dd');
      const url = isBeauty
        ? `/beauty-bookings?date=${dateStr}&professionalId=${resourceId}&limit=50`
        : `${endpoint}?startDate=${dateStr}&endDate=${dateStr}&resourceId=${resourceId}&limit=50`;
      const res = await fetchApi(url);
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      for (const existing of list) {
        if (existing.status === 'cancelled') continue;
        let exStart, exEnd;
        if (isBeauty) {
          const d = new Date(existing.date).toISOString().slice(0, 10);
          exStart = new Date(`${d}T${existing.startTime}:00`);
          exEnd = addMinutes(exStart, existing.totalDuration || 60);
        } else {
          exStart = new Date(existing.startTime);
          exEnd = new Date(existing.endTime);
        }
        if (startAt < exEnd && endAt > exStart) {
          const name = existing.professionalName || existing.resourceName || 'El profesional';
          return { name, startStr: format(exStart, 'HH:mm'), endStr: format(exEnd, 'HH:mm') };
        }
      }
      return null;
    } catch {
      return null;
    }
  }, [resourceId, startAt, endAt, isBeauty, endpoint]);

  const submit = async () => {
    if (!customerName) { toast.error('Selecciona un cliente'); return; }
    if (selectedServiceIds.length === 0) { toast.error('Selecciona al menos un servicio'); return; }
    if (!isOnline) { toast.error('Sin conexión — no se puede crear una cita ahora'); return; }

    // Conflict detection — first attempt shows warning, second proceeds
    if (!conflictWarning) {
      const conflict = await checkConflicts();
      if (conflict) { setConflictWarning(conflict); return; }
    }
    setConflictWarning(null);

    try {
      setSubmitting(true);

      const payload = isBeauty
        ? {
            client: {
              name: customerName,
              phone: customerPhone || undefined,
            },
            services: selectedServiceIds.map((id) => ({ service: id })),
            professionalId: resourceId || undefined,
            date: format(startAt, 'yyyy-MM-dd'),
            startTime: format(startAt, 'HH:mm'),
            notes: notes || undefined,
            ...(selectedPackageId ? { packageId: selectedPackageId } : {}),
            ...(isRecurring && {
              recurrenceRule: {
                frequency: recurrenceFrequency,
                endAfterOccurrences: recurrenceCount,
              },
            }),
          }
        : {
            customerName,
            serviceId: selectedServiceIds[0] || '',
            resourceId: resourceId || undefined,
            startTime: startAt.toISOString(),
            endTime: endAt.toISOString(),
            notes: notes || undefined,
            status: 'pending',
          };

      const response = await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      haptics.success();
      trackEvent('appointment_created', { serviceIds: selectedServiceIds, resourceId: resourceId || null, isBeauty });

      // Toast with WhatsApp action if client has phone
      const phone = customerPhone?.replace(/\D/g, '');
      const svcName = selectedServices.length === 1
        ? selectedServices[0].name
        : selectedServices.length > 1
          ? `${selectedServices.length} servicios`
          : 'el servicio';
      const timeStr = format(startAt, 'HH:mm');
      const dateStr = format(startAt, "d 'de' MMM", { locale: es });
      const occurrencesCreated = response?.data?.occurrencesCreated ?? response?.occurrencesCreated ?? 0;
      const toastTitle = occurrencesCreated > 0
        ? `Cita creada + ${occurrencesCreated} citas recurrentes agendadas`
        : 'Cita creada exitosamente';

      if (phone) {
        const waText = encodeURIComponent(
          `Hola ${customerName}, te confirmamos tu cita para ${svcName} el ${dateStr} a las ${timeStr}. ¡Te esperamos!`,
        );
        toast.success(toastTitle, {
          description: `${customerName} · ${timeStr}`,
          action: {
            label: 'Enviar WhatsApp',
            onClick: () => window.open(`https://wa.me/${phone}?text=${waText}`, '_blank'),
          },
          duration: 8000,
        });
      } else {
        toast.success(toastTitle, {
          description: `${customerName} · ${timeStr}`,
        });
      }

      onClose?.(true);
    } catch (err) {
      console.error(err);
      haptics.error();
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
            <div className="mt-1 flex items-center justify-between rounded-[var(--mobile-radius-md)] bg-muted px-3 py-3">
              <div className="flex items-center gap-2">
                <User size={16} className="text-muted-foreground" />
                <div>
                  <p className="font-medium">{customerName}</p>
                  {customerPhone && <p className="text-xs text-muted-foreground">{customerPhone}</p>}
                </div>
              </div>
              <button
                type="button"
                aria-label="Quitar"
                onClick={clearCustomer}
                className="tap-target no-tap-highlight text-muted-foreground"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <>
              {/* Recent clients chips */}
              {recentClients.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {recentClients.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => handlePickCustomer(c)}
                      className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium no-tap-highlight border border-border"
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
              {/* Search */}
              <div className="mt-1.5 flex items-center gap-2 rounded-[var(--mobile-radius-md)] bg-muted px-3">
                <Search size={16} className="text-muted-foreground shrink-0" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar o escribir nombre…"
                  className="flex-1 bg-transparent py-3 text-base outline-none"
                />
              </div>
              {customers.length > 0 && (
                <ul className="mt-1 rounded-[var(--mobile-radius-md)] border border-border overflow-hidden">
                  {customers.map((c) => (
                    <li key={c._id || c.id}>
                      <button
                        type="button"
                        onClick={() => handlePickCustomer(c)}
                        className="w-full text-left px-3 py-3 flex items-center justify-between hover:bg-muted no-tap-highlight"
                      >
                        <div>
                          <p className="font-medium">{c.name || c.companyName || c.fullName}</p>
                          {(c.phone || c.mobile) && (
                            <p className="text-xs text-muted-foreground">{c.phone || c.mobile}</p>
                          )}
                        </div>
                        <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {query.length >= 2 && customers.length === 0 && (
                <button
                  type="button"
                  onClick={() => { setCustomerName(query); setQuery(''); }}
                  className="mt-2 text-sm font-medium text-primary no-tap-highlight"
                >
                  + Crear "{query}" como nuevo cliente
                </button>
              )}
            </>
          )}
        </section>

        {/* Paquetes (solo beauty, si hay paquetes) */}
        {isBeauty && packages.length > 0 && (
          <section>
            <label className="text-xs font-medium text-muted-foreground">Paquetes</label>
            <div className="mt-1 space-y-2">
              {packages.map((pkg) => {
                const pkgId = String(pkg._id || pkg.id);
                const active = selectedPackageId === pkgId;
                const savings = Number(pkg.savings || 0);
                return (
                  <button
                    key={pkgId}
                    type="button"
                    onClick={() => selectPackage(pkg)}
                    className={cn(
                      'w-full text-left rounded-[var(--mobile-radius-md)] border px-3 py-3 no-tap-highlight transition-colors',
                      active ? 'bg-primary/10 border-primary' : 'bg-card border-border',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{pkg.name}</span>
                      <div className="flex items-center gap-2">
                        {savings > 0 && (
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5 font-medium">
                            Ahorras ${savings.toFixed(2)}
                          </span>
                        )}
                        <span className={cn('font-bold text-sm', active ? 'text-primary' : '')}>
                          ${Number(pkg.price?.amount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {pkg.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{pkg.description}</p>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Servicio — multi-select chips */}
        <section>
          <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Scissors size={12} /> {isBeauty && packages.length > 0 ? 'Servicios individuales' : 'Servicios'}
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {services.slice(0, 12).map((s) => {
              const id = String(s._id || s.id);
              const active = selectedServiceIds.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleService(id)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground',
                  )}
                >
                  {s.name}
                </button>
              );
            })}
            {loadingData && services.length === 0 && (
              <div className="flex gap-2 animate-pulse">
                {[1, 2, 3].map(i => <div key={i} className="h-9 w-24 bg-muted rounded-full" />)}
              </div>
            )}
            {!loadingData && services.length === 0 && (
              <span className="text-sm text-muted-foreground">Sin servicios configurados</span>
            )}
          </div>
          {/* Summary row */}
          {selectedServiceIds.length > 0 && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''} · {totalDuration} min
              {totalPrice > 0 ? ` · $${totalPrice.toFixed(2)}` : ''}
            </p>
          )}
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
                  onClick={() => { haptics.select(); setStartAt(q.at); }}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                    active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
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
            className="mt-2 w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-base"
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Duración: {totalDuration} min · Termina a las {format(endAt, 'HH:mm')}
          </p>
        </section>

        {/* Recurso/Profesional */}
        {resources.length > 0 && (
          <section>
            <label className="text-xs font-medium text-muted-foreground">Profesional</label>
            <div className="mt-1 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => { haptics.select(); setResourceId(''); }}
                className={cn(
                  'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                  !resourceId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
                )}
              >
                Sin asignar
              </button>
              {resources.map((r) => {
                const id = String(r._id || r.id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { haptics.select(); setResourceId(id); }}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                      resourceId === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border',
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
            className="mt-1 w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm"
            placeholder="Preferencias, observaciones…"
          />
        </section>

        {/* Recurring toggle — solo beauty */}
        {isBeauty && (
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Repetir esta cita</p>
                <p className="text-xs text-muted-foreground">Misma hora y profesional</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRecurring(r => !r)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isRecurring ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {isRecurring && (
              <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                {/* Frequency */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">Frecuencia</p>
                  <div className="flex gap-2">
                    {[
                      { value: 'weekly', label: 'Semanal' },
                      { value: 'biweekly', label: 'Cada 2 sem.' },
                      { value: 'monthly', label: 'Mensual' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRecurrenceFrequency(opt.value)}
                        className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${
                          recurrenceFrequency === opt.value
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-input hover:bg-accent'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* End after N occurrences */}
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">Número de citas:</p>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setRecurrenceCount(c => Math.max(2, c - 1))}
                      className="w-7 h-7 rounded border flex items-center justify-center text-sm">−</button>
                    <span className="w-6 text-center text-sm font-medium">{recurrenceCount}</span>
                    <button type="button" onClick={() => setRecurrenceCount(c => Math.min(12, c + 1))}
                      className="w-7 h-7 rounded border flex items-center justify-center text-sm">+</button>
                  </div>
                </div>

                {/* Summary */}
                <p className="text-xs text-muted-foreground bg-muted rounded-lg p-2">
                  Se crearán <strong>{recurrenceCount} citas</strong> {
                    recurrenceFrequency === 'weekly' ? 'cada semana' :
                    recurrenceFrequency === 'biweekly' ? 'cada 2 semanas' : 'cada mes'
                  }. Mismo profesional y horario.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky save */}
      <div
        className="absolute inset-x-0 bottom-0 px-4 pt-3 pb-4 bg-card border-t border-border safe-bottom"
        style={{ paddingBottom: 'calc(1rem + var(--safe-bottom))' }}
      >
        {conflictWarning && (
          <div className="mb-2 rounded-[var(--mobile-radius-md)] bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            ⚠ {conflictWarning.name} ya tiene una cita de {conflictWarning.startStr} a {conflictWarning.endStr}. Toca "Guardar" para continuar.
          </div>
        )}
        <button
          type="button"
          disabled={submitting}
          onClick={submit}
          className="w-full rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground py-4 text-base font-semibold no-tap-highlight disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : conflictWarning ? 'Guardar de todas formas' : selectedServiceIds.length > 1 ? `Guardar ${selectedServiceIds.length} servicios` : 'Guardar cita'}
        </button>
      </div>
    </MobileActionSheet>
  );
}
