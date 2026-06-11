import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addMinutes, startOfDay, setHours, setMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ChevronRight, ChevronDown, Clock, User, Scissors, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi, addToWaitlist, getClientNoShowStatus } from '@/lib/api';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { cn } from '@/lib/utils';
import { SPRING, DUR, EASE, STAGGER, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { emitBadgeUpdate } from '@/lib/badge-events';
import { useAuth } from '@/hooks/use-auth';
import WheelTimePicker from '@/components/shared/WheelTimePicker.jsx';

const toTimeInputValue = (d) => format(d, "yyyy-MM-dd'T'HH:mm");

function nextQuarterHour(base) {
  return roundToNearestMinutes(addMinutes(base, 1), { nearestTo: 15, roundingMethod: 'ceil' });
}

// ─── collapsible section (notas, recurrencia) ───────────────────────────────
function CollapsibleSection({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-border pt-3 mt-2">
      <button
        type="button"
        onClick={() => { haptics.tap(); setOpen((o) => !o); }}
        className="w-full flex items-center justify-between py-1 tap-target no-tap-highlight"
      >
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={SPRING.snappy}
        >
          <ChevronDown size={14} className="text-muted-foreground" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
            className="overflow-hidden"
          >
            <div className="pt-2 pb-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
  const [proPicked, setProPicked] = useState(false); // distinguishes "no choice yet" from "chose Sin preferencia"
  const [startAt, setStartAt] = useState(
    initialStart ? new Date(initialStart) : nextQuarterHour(new Date()),
  );
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [conflictWarning, setConflictWarning] = useState(null);
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const TOTAL_STEPS = 4;
  const { tenant } = useAuth();
  const [selectedTime, setSelectedTime] = useState(() => format(initialStart ? new Date(initialStart) : nextQuarterHour(new Date()), 'HH:mm'));
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  // Generate time slots from business hours
  const timeSlots = useMemo(() => {
    const startH = parseInt(tenant?.settings?.businessHours?.start?.split(':')[0] || '8', 10);
    const endH = parseInt(tenant?.settings?.businessHours?.end?.split(':')[0] || '20', 10);
    const slots = [];
    for (let h = startH; h < endH; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }, [tenant]);

  // Load occupied slots for selected date + resource
  useEffect(() => {
    const dateStr = format(date || new Date(), 'yyyy-MM-dd');
    const params = new URLSearchParams({ startDate: dateStr, endDate: dateStr, limit: '100' });
    if (resourceId) params.append(isBeauty ? 'professionalId' : 'resourceId', resourceId);
    fetchApi(`${endpoint}?${params}`).then(res => {
      const items = Array.isArray(res) ? res : res?.data || res?.items || [];
      const coveredSlots = (apt) => {
        if (apt.status === 'cancelled') return [];
        const start = apt.startTime || '';
        const timeStr = start.includes('T') ? new Date(start).toTimeString().slice(0, 5) : start.slice(0, 5);
        const dur = apt.totalDuration || 30;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h)) return [];
        const out = [];
        for (let offset = 0; offset < dur; offset += 30) {
          const totalMin = h * 60 + m + offset;
          out.push(`${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`);
        }
        return out;
      };

      // "Sin preferencia" (beauty): a slot is unavailable only if EVERY professional is busy (union availability).
      if (!resourceId && isBeauty && resources.length > 0) {
        const busyBySlot = new Map(); // slot -> Set(professionalId)
        items.forEach(apt => {
          const proId = apt.professionalId ? String(apt.professionalId) : `u:${apt._id}`;
          coveredSlots(apt).forEach(slot => {
            if (!busyBySlot.has(slot)) busyBySlot.set(slot, new Set());
            busyBySlot.get(slot).add(proId);
          });
        });
        const occupied = [];
        busyBySlot.forEach((set, slot) => { if (set.size >= resources.length) occupied.push(slot); });
        setOccupiedSlots(occupied);
        return;
      }

      const occupied = new Set();
      items.forEach(apt => coveredSlots(apt).forEach(s => occupied.add(s)));
      setOccupiedSlots([...occupied]);
    }).catch(() => setOccupiedSlots([]));
  }, [date, resourceId, isBeauty, endpoint, resources.length]);

  const handleTimeChange = useCallback((slot) => {
    setSelectedTime(slot);
    const [h, m] = slot.split(':').map(Number);
    const d = new Date(date || new Date());
    d.setHours(h, m, 0, 0);
    setStartAt(d);
    haptics.select();
  }, [date]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  // Waitlist state
  const [showWaitlistOption, setShowWaitlistOption] = useState(false);
  const [waitlistFrom, setWaitlistFrom] = useState('09:00');
  const [waitlistTo, setWaitlistTo] = useState('18:00');

  // No-show warning state
  const [noShowWarning, setNoShowWarning] = useState(null);

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

  const handleAddToWaitlist = async () => {
    try {
      await addToWaitlist({
        client: {
          name: customerName,
          phone: customerPhone || '+10000000000',
        },
        services: selectedServiceIds.map((id) => ({ service: id })),
        preferredDate: format(startAt, 'yyyy-MM-dd'),
        preferredTimeRange: { from: waitlistFrom, to: waitlistTo },
        preferredProfessionalId: resourceId || undefined,
      });
      setShowWaitlistOption(false);
      toast.success('Agregado a la lista de espera', {
        description: `${customerName} será notificado cuando haya disponibilidad`,
      });
      onClose?.(true);
    } catch (err) {
      console.error('Waitlist error:', err);
      toast.error(err.message || 'No se pudo agregar a la lista de espera');
    }
  };

  const submit = async () => {
    const finalName = customerName || query.trim();
    if (!finalName) { toast.error('Escribe el nombre del cliente'); return; }
    if (!customerName) setCustomerName(finalName);
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
              name: finalName,
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
            customerName: finalName,
            serviceId: selectedServiceIds[0] || '',
            resourceId: resourceId || undefined,
            startTime: startAt.toISOString(),
            endTime: endAt.toISOString(),
            notes: notes || undefined,
            status: 'pending',
          };

      const response = await fetchApi(endpoint, { method: 'POST', body: JSON.stringify(payload) });
      haptics.success();
      emitBadgeUpdate({ type: 'create' });
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
          `Hola ${finalName}, te confirmamos tu cita para ${svcName} el ${dateStr} a las ${timeStr}. ¡Te esperamos!`,
        );
        toast.success(toastTitle, {
          description: `${finalName} · ${timeStr}`,
          action: {
            label: 'Enviar WhatsApp',
            onClick: () => window.open(`https://wa.me/${phone}?text=${waText}`, '_blank'),
          },
          duration: 8000,
        });
      } else {
        toast.success(toastTitle, {
          description: `${finalName} · ${timeStr}`,
        });
      }

      onClose?.(true);
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error(err.message || 'No se pudo crear la cita');
      // Show waitlist option for beauty bookings when there's a conflict
      if (isBeauty) {
        setShowWaitlistOption(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Wizard navigation
  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };
  const canGoNext =
    (step === 1 && (customerName || query.trim().length >= 2)) ||
    (step === 2 && selectedServiceIds.length > 0) ||
    (step === 3 && (resources.length === 0 || proPicked)) ||
    (step === 4);

  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  const stickyFooter = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border">
      {/* Step 4 warnings */}
      {step === TOTAL_STEPS && conflictWarning && (
        <div className="mb-2 rounded-[var(--mobile-radius-md)] bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          ⚠ {conflictWarning.name} ya tiene una cita de {conflictWarning.startStr} a {conflictWarning.endStr}. Toca "Guardar" para continuar.
        </div>
      )}
      {step === TOTAL_STEPS && showWaitlistOption && (
        <div className="mb-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
          <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
            No hay disponibilidad. ¿Agregar a lista de espera?
          </p>
          <div className="space-y-2 mb-2">
            <p className="text-xs text-muted-foreground">Rango horario flexible:</p>
            <div className="flex gap-2">
              <input type="time" value={waitlistFrom} onChange={e => setWaitlistFrom(e.target.value)} className="flex-1 border border-border rounded-[var(--mobile-radius-md)] px-2 py-1.5 text-sm bg-background" />
              <span className="self-center text-sm text-muted-foreground">a</span>
              <input type="time" value={waitlistTo} onChange={e => setWaitlistTo(e.target.value)} className="flex-1 border border-border rounded-[var(--mobile-radius-md)] px-2 py-1.5 text-sm bg-background" />
            </div>
          </div>
          <button onClick={handleAddToWaitlist} className="w-full bg-amber-600 text-white py-2 rounded-[var(--mobile-radius-md)] text-sm font-medium no-tap-highlight">
            Agregar a lista de espera
          </button>
        </div>
      )}
      {/* Summary line */}
      {step >= 2 && selectedServiceIds.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2 text-center">
          {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''} · {totalDuration} min
          {totalPrice > 0 ? ` · $${totalPrice.toFixed(2)}` : ''}
        </p>
      )}
      <div className="flex gap-3">
        {step > 1 && (
          <button type="button" onClick={goBack}
            className="px-4 py-3.5 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight">
            Atrás
          </button>
        )}
        {step < TOTAL_STEPS ? (
          <button type="button" disabled={!canGoNext} onClick={goNext}
            className="flex-1 py-3.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40">
            Siguiente
          </button>
        ) : (
          <button type="button" disabled={submitting || noShowWarning?.level === 'blacklisted'} onClick={submit}
            className="flex-1 py-3.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40">
            {submitting ? 'Guardando…' : conflictWarning ? 'Guardar de todas formas' : isRecurring ? `Crear ${recurrenceCount} citas` : 'Confirmar cita'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title="Agendar cita"
      footer={stickyFooter}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-2 px-4 py-2 shrink-0">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <motion.div
            key={i}
            className={cn('h-1.5 rounded-full flex-1', i < step ? 'bg-primary' : 'bg-muted')}
            animate={{ scaleX: i < step ? 1 : 0.9 }}
            transition={SPRING.snappy}
          />
        ))}
        <span className="text-xs text-muted-foreground shrink-0 ml-1">{step}/{TOTAL_STEPS}</span>
      </div>

      {/* Summary breadcrumb */}
      {step > 1 && (customerName || selectedServiceIds.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 px-4 pb-2 text-xs text-muted-foreground">
          {customerName && <span className="bg-muted px-2 py-0.5 rounded-full">{customerName}</span>}
          {step > 2 && selectedServiceIds.length > 0 && (
            <span>· {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''}</span>
          )}
          {step > 3 && selectedTime && <span>· {selectedTime}</span>}
        </div>
      )}

      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={SPRING.soft}
        >
          {/* ── STEP 1: Cliente ── */}
          {step === 1 && (
            <div className="space-y-4 px-4 pb-4">
              <p className="text-sm font-medium">¿Para quién es la cita?</p>
              {customerName ? (
                <div className="flex items-center justify-between rounded-[var(--mobile-radius-md)] bg-muted px-3 py-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">{customerName}</p>
                      {customerPhone && <p className="text-xs text-muted-foreground">{customerPhone}</p>}
                    </div>
                  </div>
                  <button type="button" aria-label="Quitar" onClick={clearCustomer}
                    className="tap-target no-tap-highlight text-muted-foreground">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <>
                  {recentClients.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {recentClients.map((c) => (
                        <button key={c.name} type="button" onClick={() => handlePickCustomer(c)}
                          className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium no-tap-highlight border border-border">
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 rounded-[var(--mobile-radius-md)] bg-muted px-3">
                    <Search size={16} className="text-muted-foreground shrink-0" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar o escribir nombre…"
                      className="flex-1 bg-transparent py-3 text-base outline-none" />
                  </div>
                  {customers.length > 0 && (
                    <ul className="rounded-[var(--mobile-radius-md)] border border-border overflow-hidden">
                      {customers.map((c) => (
                        <li key={c._id || c.id}>
                          <button type="button" onClick={() => handlePickCustomer(c)}
                            className="w-full text-left px-3 py-3 flex items-center justify-between hover:bg-muted no-tap-highlight">
                            <div>
                              <p className="font-medium">{c.name || c.companyName || c.fullName}</p>
                              {(c.phone || c.mobile) && <p className="text-xs text-muted-foreground">{c.phone || c.mobile}</p>}
                            </div>
                            <ChevronRight size={14} className="text-muted-foreground shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {query.length >= 2 && customers.length === 0 && (
                    <p className="text-xs text-muted-foreground">Se registrará como nuevo cliente al confirmar</p>
                  )}
                </>
              )}
              {noShowWarning && (
                <div className={`p-3 rounded-lg border text-sm ${
                  noShowWarning.level === 'blacklisted' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950 dark:border-red-800 dark:text-red-300' :
                  noShowWarning.level === 'deposit' ? 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300' :
                  'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300'
                }`}>
                  {noShowWarning.level === 'blacklisted' && 'Este cliente está bloqueado.'}
                  {noShowWarning.level === 'deposit' && 'Este cliente requiere depósito.'}
                  {noShowWarning.level === 'warning' && `Este cliente tiene ${noShowWarning.count} inasistencia(s).`}
                </div>
              )}
            </div>
          )}

          {/* ── STEP 2: Servicios + Paquetes ── */}
          {step === 2 && (
            <div className="space-y-4 px-4 pb-4">
              <p className="text-sm font-medium">¿Qué servicio{services.length > 1 ? 's' : ''}?</p>
              {isBeauty && packages.length > 0 && (
                <section>
                  <label className="text-xs font-medium text-muted-foreground mb-1">Paquetes</label>
                  <div className="space-y-2">
                    {packages.map((pkg) => {
                      const pkgId = String(pkg._id || pkg.id);
                      const active = selectedPackageId === pkgId;
                      const savings = Number(pkg.savings || 0);
                      return (
                        <button key={pkgId} type="button" onClick={() => selectPackage(pkg)}
                          className={cn('w-full text-left rounded-[var(--mobile-radius-md)] border px-3 py-3 no-tap-highlight transition-colors',
                            active ? 'bg-primary/10 border-primary' : 'bg-card border-border')}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-sm">{pkg.name}</span>
                            <div className="flex items-center gap-2">
                              {savings > 0 && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5 font-medium">-${savings.toFixed(2)}</span>}
                              <span className={cn('font-bold text-sm', active ? 'text-primary' : '')}>${Number(pkg.price?.amount ?? 0).toFixed(2)}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}
              <div className="flex flex-wrap gap-2">
                {services.slice(0, 12).map((s) => {
                  const id = String(s._id || s.id);
                  const active = selectedServiceIds.includes(id);
                  return (
                    <button key={id} type="button" onClick={() => toggleService(id)}
                      className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight transition-colors',
                        active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-foreground')}>
                      {s.name}
                    </button>
                  );
                })}
                {loadingData && services.length === 0 && (
                  <div className="flex gap-2 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-9 w-24 bg-muted rounded-full" />)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── STEP 3: Con quién + Cuándo ── */}
          {step === 3 && (
            <div className="space-y-4 px-4 pb-4">
              <p className="text-sm font-medium">¿Cuándo?</p>
              <input type="date" value={format(startAt, 'yyyy-MM-dd')} min={format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [y, mo, d] = e.target.value.split('-').map(Number);
                  const next = new Date(startAt);
                  next.setFullYear(y, mo - 1, d);
                  setStartAt(next);
                }}
                className="w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-3 text-base" />

              {/* Professional FIRST — the wheel below shows THIS professional's real availability for the day */}
              {resources.length > 0 && (
                <section>
                  <p className="text-sm font-medium mb-1.5">¿Con quién?</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => { haptics.select(); setResourceId(''); setProPicked(true); }}
                      className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                        proPicked && !resourceId ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                      Sin preferencia
                    </button>
                    {resources.map((r) => {
                      const id = String(r._id || r.id);
                      return (
                        <button key={id} type="button" onClick={() => { haptics.select(); setResourceId(id); setProPicked(true); }}
                          className={cn('rounded-full px-3 py-2 text-sm font-medium border no-tap-highlight',
                            resourceId === id ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border')}>
                          {r.name || r.fullName}
                        </button>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Time wheel — gated on a professional choice so availability is never a merged/incongruent view */}
              {(resources.length === 0 || proPicked) ? (
                <div>
                  <WheelTimePicker slots={timeSlots} value={selectedTime} onChange={handleTimeChange} occupiedSlots={occupiedSlots} />
                  <p className="text-xs text-muted-foreground text-center mt-1.5">
                    {selectedTime} — {format(endAt, 'HH:mm')} ({totalDuration}min)
                  </p>
                </div>
              ) : (
                <div className="rounded-[var(--mobile-radius-md)] border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Elige con quién será la cita para ver los horarios disponibles.
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: Extras ── */}
          {step === 4 && (
            <div className="space-y-4 px-4 pb-4">
              <p className="text-sm font-medium">Detalles adicionales</p>

              <section>
                <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                  className="mt-1 w-full rounded-[var(--mobile-radius-md)] border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Preferencias, observaciones…" />
              </section>

              {isBeauty && (
                <section className="border rounded-[var(--mobile-radius-md)] border-border p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Cita recurrente</p>
                      <p className="text-xs text-muted-foreground">Misma hora y profesional</p>
                    </div>
                    <button type="button" onClick={() => setIsRecurring(r => !r)}
                      className={cn('relative w-11 h-6 rounded-full transition-colors', isRecurring ? 'bg-primary' : 'bg-muted-foreground/30')}>
                      <motion.span className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow"
                        animate={{ x: isRecurring ? 20 : 0 }} transition={SPRING.snappy} />
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {isRecurring && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: DUR.base, ease: EASE.out }} className="overflow-hidden">
                        <div className="space-y-3 pt-1">
                          <div className="flex gap-2">
                            {[{ value: 'weekly', label: 'Semanal' }, { value: 'biweekly', label: 'Cada 2 sem.' }, { value: 'monthly', label: 'Mensual' }].map(opt => (
                              <button key={opt.value} type="button" onClick={() => setRecurrenceFrequency(opt.value)}
                                className={cn('flex-1 py-1.5 text-xs rounded-lg border transition-colors',
                                  recurrenceFrequency === opt.value ? 'bg-primary text-primary-foreground border-primary' : 'border-input hover:bg-accent')}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-3">
                            <p className="text-xs text-muted-foreground">Citas:</p>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => setRecurrenceCount(c => Math.max(2, c - 1))} className="w-7 h-7 rounded border flex items-center justify-center text-sm">−</button>
                              <span className="w-6 text-center text-sm font-medium">{recurrenceCount}</span>
                              <button type="button" onClick={() => setRecurrenceCount(c => Math.min(12, c + 1))} className="w-7 h-7 rounded border flex items-center justify-center text-sm">+</button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              )}

              {/* Summary */}
              <div className="rounded-[var(--mobile-radius-md)] bg-muted p-3 space-y-1 text-xs">
                <p className="font-medium text-foreground">Resumen</p>
                <p className="text-muted-foreground">{customerName || query} · {selectedServices.map(s => s.name).join(', ') || 'Servicio'}</p>
                <p className="text-muted-foreground">{format(startAt, "EEEE d 'de' MMMM", { locale: es })} a las {selectedTime}</p>
                {totalPrice > 0 && <p className="text-emerald-400 font-medium">${totalPrice.toFixed(2)} · {totalDuration}min</p>}
                {isRecurring && <p className="text-primary">Recurrente × {recurrenceCount}</p>}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </MobileActionSheet>
  );
}
