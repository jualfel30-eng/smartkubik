import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { Search, ChevronRight, Check, Clock, User, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi, addToWaitlist } from '@/lib/api';
import { toast } from '@/lib/toast';
import { trackEvent } from '@/lib/analytics';
import MobileActionSheet from '../MobileActionSheet.jsx';
import { useFloorViewData } from '@/hooks/useFloorViewData';
import { cn } from '@/lib/utils';
import { SPRING, STAGGER, DUR, EASE, listItem } from '@/lib/motion';
import haptics from '@/lib/haptics';
import { emitBadgeUpdate } from '@/lib/badge-events';

// ─── slide transition variants ───────────────────────────────────────────────
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

// ─── step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ current, total }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 shrink-0">
      {Array.from({ length: total }, (_, i) => (
        <motion.div
          key={i}
          className={cn(
            'h-1.5 rounded-full flex-1',
            i < current ? 'bg-primary' : 'bg-muted',
          )}
          animate={{ scaleX: i < current ? 1 : 0.9 }}
          transition={SPRING.snappy}
        />
      ))}
      <span className="text-xs text-muted-foreground shrink-0 ml-1">
        {current}/{total}
      </span>
    </div>
  );
}

// ─── progressive summary breadcrumb ──────────────────────────────────────────
function WalkInSummary({ professional, services }) {
  const parts = [];
  if (professional) parts.push(professional.name?.split(' ')[0] || professional.name);
  if (services.length > 0) {
    const names = services.map((s) => s.name).join(' + ');
    const dur = services.reduce((sum, s) => sum + (s.duration || s.durationMinutes || 60), 0);
    const price = services.reduce((sum, s) => sum + (Number(s.price?.amount ?? s.price) || 0), 0);
    parts.push(`${names} · ${dur}min${price > 0 ? ` · $${price.toFixed(2)}` : ''}`);
  }
  if (parts.length === 0) return null;

  return (
    <motion.div
      layout
      className="mx-4 mb-2 px-3 py-2 rounded-[var(--mobile-radius-md)] bg-primary/5 border border-primary/20"
    >
      <p className="text-xs text-primary font-medium truncate">
        {parts.join(' → ')}
      </p>
    </motion.div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────
function getInitials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function formatMinutes(mins) {
  if (mins == null) return '—';
  const abs = Math.abs(Math.round(mins));
  if (abs < 60) return `${abs}m`;
  return `${Math.floor(abs / 60)}h${abs % 60}m`;
}

function nextQuarterHour(base) {
  return roundToNearestMinutes(addMinutes(base, 1), { nearestTo: 15, roundingMethod: 'ceil' });
}

// ─── Step 1: Select Professional ─────────────────────────────────────────────
function StepProfessional({ profStatuses, onSelect }) {
  const free = profStatuses.filter((p) => p.status === 'free');
  const inService = profStatuses.filter((p) => p.status === 'in_service');
  const unavailable = profStatuses.filter((p) => p.status === 'blocked' || p.status === 'unavailable');

  return (
    <div className="space-y-4 pb-4">
      <p className="text-sm font-medium">Selecciona un profesional</p>

      {/* Available now — highlighted */}
      {free.length > 0 && (
        <section>
          <p className="text-xs font-medium text-emerald-500 mb-2">
            Disponibles ahora ({free.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {free.map((prof) => (
              <ProfChip key={prof._id} prof={prof} onSelect={() => onSelect(prof)} highlight />
            ))}
          </div>
        </section>
      )}

      {/* In service — with wait estimate */}
      {inService.length > 0 && (
        <section>
          <p className="text-xs font-medium text-amber-500 mb-2">
            En servicio ({inService.length})
          </p>
          <div className="grid grid-cols-3 gap-2">
            {inService.map((prof) => (
              <ProfChip
                key={prof._id}
                prof={prof}
                onSelect={() => onSelect(prof)}
                subtitle={formatMinutes(prof.remainingMinutes)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Unavailable — disabled */}
      {unavailable.length > 0 && (
        <section>
          <p className="text-xs font-medium text-muted-foreground mb-2">No disponibles</p>
          <div className="grid grid-cols-3 gap-2">
            {unavailable.map((prof) => (
              <ProfChip key={prof._id} prof={prof} disabled />
            ))}
          </div>
        </section>
      )}

      {/* No one free */}
      {free.length === 0 && inService.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--mobile-radius-md)] p-3">
          <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
            Todos ocupados
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Prox. disponible: ~{formatMinutes(Math.min(...inService.map((p) => p.remainingMinutes ?? 999)))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Selecciona uno para agregar a la cola de espera
          </p>
        </div>
      )}

      {/* Empty */}
      {profStatuses.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <User size={32} className="text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium">Sin profesionales configurados</p>
          <p className="text-xs text-muted-foreground mt-1">Configura profesionales en Recursos</p>
        </div>
      )}
    </div>
  );
}

// ─── Professional chip ───────────────────────────────────────────────────────
function ProfChip({ prof, onSelect, highlight, subtitle, disabled }) {
  const color = prof.color || '#6366f1';
  const photo = prof.images?.[0] || prof.profileImage;
  const statusDot = {
    free: 'bg-emerald-500',
    in_service: 'bg-amber-500 animate-pulse',
    blocked: 'bg-gray-400',
    unavailable: 'bg-red-400',
  };

  return (
    <motion.button
      type="button"
      onClick={disabled ? undefined : () => { haptics.select(); onSelect?.(); }}
      whileTap={disabled ? undefined : { scale: 0.95 }}
      disabled={disabled}
      className={cn(
        'flex flex-col items-center gap-1.5 p-3 rounded-[var(--mobile-radius-lg)] border no-tap-highlight',
        'min-h-[100px] transition-colors',
        highlight && 'border-emerald-500/40 bg-emerald-500/5',
        disabled && 'opacity-40 pointer-events-none',
        !highlight && !disabled && 'border-border bg-card',
      )}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden"
        style={{ background: photo ? 'transparent' : color }}
      >
        {photo
          ? <img src={photo} alt="" className="w-full h-full object-cover" />
          : getInitials(prof.name)
        }
      </div>
      <span className="text-xs font-medium text-center leading-tight truncate w-full">
        {prof.name?.split(' ')[0] || prof.name}
      </span>
      {subtitle && (
        <span className="text-[10px] text-amber-500 font-medium">~{subtitle}</span>
      )}
      <span className={cn('w-2 h-2 rounded-full', statusDot[prof.status] || 'bg-gray-400')} />
    </motion.button>
  );
}

// ─── Step 2: Select Services ─────────────────────────────────────────────────
function StepServices({ professional, allServices, selectedIds, onToggle }) {
  const profServices = professional.allowedServiceIds?.length > 0
    ? allServices.filter((s) => professional.allowedServiceIds.includes(String(s._id || s.id)))
    : allServices;

  return (
    <div className="space-y-2 pb-4">
      <p className="text-sm font-medium">
        Servicios de {professional.name?.split(' ')[0] || professional.name}
      </p>
      {profServices.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm text-muted-foreground">Este profesional no tiene servicios asignados</p>
        </div>
      ) : (
        <motion.div className="space-y-2" variants={STAGGER(0.04)} initial="initial" animate="animate">
          {profServices.map((svc) => {
            const id = String(svc._id || svc.id);
            const active = selectedIds.includes(id);
            const dur = svc.duration || svc.durationMinutes || 60;
            const price = Number(svc.price?.amount ?? svc.price) || 0;
            return (
              <motion.button
                key={id}
                type="button"
                variants={listItem}
                onClick={() => { haptics.select(); onToggle(id); }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  'w-full text-left flex items-center justify-between px-4 py-3 rounded-[var(--mobile-radius-lg)] border no-tap-highlight transition-colors',
                  active ? 'bg-primary/10 border-primary' : 'bg-card border-border',
                )}
              >
                <div>
                  <p className={cn('text-sm font-medium', active && 'text-primary')}>{svc.name}</p>
                  <p className="text-xs text-muted-foreground">{dur} min</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <span className={cn('text-sm font-bold tabular-nums', active && 'text-primary')}>
                    {price > 0 ? `$${price.toFixed(2)}` : '—'}
                  </span>
                  {active && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={SPRING.bouncy}
                    >
                      <Check size={16} className="text-primary" />
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

// ─── Step 3: Client + Confirm ────────────────────────────────────────────────
function StepClient({
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  recentClients,
  startAt, setStartAt,
  quickTimes,
}) {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);

  // Async customer search
  useEffect(() => {
    if (query.length < 2) { setCustomers([]); return; }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const data = await fetchApi(`/customers?search=${encodeURIComponent(query)}&limit=8`, {
          signal: controller.signal,
        });
        setCustomers(Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : []);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    }, 300);
    return () => { clearTimeout(t); controller.abort(); };
  }, [query]);

  const pickCustomer = (c) => {
    setCustomerName(c.name || c.companyName || c.fullName || '');
    setCustomerPhone(c.phone || c.mobile || '');
    setQuery('');
    setCustomers([]);
  };

  return (
    <div className="space-y-4 pb-4">
      {/* Client */}
      <section>
        <p className="text-sm font-medium mb-2">Cliente</p>
        {customerName ? (
          <div className="flex items-center justify-between rounded-[var(--mobile-radius-md)] bg-muted px-3 py-3">
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
              onClick={() => { setCustomerName(''); setCustomerPhone(''); }}
              className="tap-target no-tap-highlight text-muted-foreground"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Recent clients */}
            {recentClients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {recentClients.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => pickCustomer(c)}
                    className="rounded-full bg-muted px-3 py-1.5 text-xs font-medium no-tap-highlight border border-border"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            {/* Search */}
            <div className="flex items-center gap-2 rounded-[var(--mobile-radius-md)] bg-muted px-3">
              <Search size={16} className="text-muted-foreground shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar o escribir nombre..."
                className="flex-1 bg-transparent py-3 text-base outline-none"
              />
            </div>
            {customers.length > 0 && (
              <ul className="mt-1 rounded-[var(--mobile-radius-md)] border border-border overflow-hidden">
                {customers.map((c) => (
                  <li key={c._id || c.id}>
                    <button
                      type="button"
                      onClick={() => pickCustomer(c)}
                      className="w-full text-left px-3 py-3 flex items-center justify-between active:bg-muted no-tap-highlight"
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

      {/* Start time */}
      <section>
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2">
          <Clock size={12} /> Hora de inicio
        </p>
        <div className="flex flex-wrap gap-2">
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
      </section>
    </div>
  );
}

// ─── Main Wizard ─────────────────────────────────────────────────────────────
export default function MobileWalkInWizard({
  initialProfessionalId,
  onClose,
}) {
  const { profStatuses, loading: floorLoading, refresh: refreshFloor } = useFloorViewData();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [services, setServices] = useState([]);
  const [recentClients, setRecentClients] = useState([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [startAt, setStartAt] = useState(nextQuarterHour(new Date()));
  const [submitting, setSubmitting] = useState(false);
  const [loadingServices, setLoadingServices] = useState(true);

  // Load services and recent clients
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addMinutes(new Date(today), 24 * 60), 'yyyy-MM-dd');
    Promise.allSettled([
      fetchApi('/beauty-services'),
      fetchApi(`/beauty-bookings?startDate=${today}&endDate=${tomorrow}&limit=50`),
    ]).then(([svcRes, apptRes]) => {
      if (svcRes.status === 'fulfilled') {
        const list = Array.isArray(svcRes.value?.data) ? svcRes.value.data : Array.isArray(svcRes.value) ? svcRes.value : [];
        setServices(list);
      }
      if (apptRes.status === 'fulfilled') {
        const raw = Array.isArray(apptRes.value?.data) ? apptRes.value.data : Array.isArray(apptRes.value) ? apptRes.value : [];
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
    }).finally(() => setLoadingServices(false));
  }, []);

  // Auto-skip step 1 if professional pre-selected (from floor view)
  useEffect(() => {
    if (initialProfessionalId && profStatuses.length > 0 && step === 1) {
      const prof = profStatuses.find((p) => String(p._id) === String(initialProfessionalId));
      if (prof) {
        setSelectedProfessional(prof);
        setDirection(1);
        setStep(2);
      }
    }
  }, [initialProfessionalId, profStatuses, step]);

  // Derived
  const selectedServices = useMemo(
    () => services.filter((s) => selectedServiceIds.includes(String(s._id || s.id))),
    [services, selectedServiceIds],
  );
  const totalDuration = selectedServices.reduce((sum, s) => sum + (s.duration || s.durationMinutes || 60), 0) || 60;
  const totalPrice = selectedServices.reduce((sum, s) => sum + (Number(s.price?.amount ?? s.price) || 0), 0);
  const endAt = useMemo(() => addMinutes(startAt, totalDuration), [startAt, totalDuration]);
  const isWaitlist = selectedProfessional?.status === 'in_service';

  const quickTimes = useMemo(() => {
    const now = new Date();
    const pivot = nextQuarterHour(now);
    return [
      { label: 'Ahora', at: pivot },
      { label: format(addMinutes(pivot, 30), 'HH:mm'), at: addMinutes(pivot, 30) },
      { label: format(addMinutes(pivot, 60), 'HH:mm'), at: addMinutes(pivot, 60) },
    ];
  }, []);

  // Navigation
  const goNext = () => { setDirection(1); setStep((s) => Math.min(3, s + 1)); };
  const goBack = () => { setDirection(-1); setStep((s) => Math.max(1, s - 1)); };

  const handleSelectProfessional = (prof) => {
    setSelectedProfessional(prof);
    goNext();
  };

  const toggleService = (id) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  // Submit
  const submit = async () => {
    if (!customerName) { toast.error('Selecciona un cliente'); return; }
    if (selectedServiceIds.length === 0) { toast.error('Selecciona al menos un servicio'); return; }

    // If professional is busy, add to waitlist
    if (isWaitlist) {
      try {
        setSubmitting(true);
        await addToWaitlist({
          client: { name: customerName, phone: customerPhone || '+10000000000' },
          services: selectedServiceIds.map((id) => ({ service: id })),
          preferredDate: format(startAt, 'yyyy-MM-dd'),
          preferredTimeRange: { from: format(startAt, 'HH:mm'), to: format(endAt, 'HH:mm') },
          preferredProfessionalId: selectedProfessional._id || undefined,
        });
        haptics.success();
        toast.success('Agregado a la cola de espera', {
          description: `${customerName} sera notificado cuando haya disponibilidad`,
        });
        onClose?.(true);
      } catch (err) {
        haptics.error();
        toast.error(err.message || 'No se pudo agregar a la lista de espera');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Normal walk-in booking
    try {
      setSubmitting(true);
      const payload = {
        client: { name: customerName, phone: customerPhone || undefined },
        services: selectedServiceIds.map((id) => ({ service: id })),
        professionalId: selectedProfessional?._id || undefined,
        date: format(startAt, 'yyyy-MM-dd'),
        startTime: format(startAt, 'HH:mm'),
        source: 'walk-in',
      };
      await fetchApi('/beauty-bookings', { method: 'POST', body: JSON.stringify(payload) });
      haptics.success();
      emitBadgeUpdate({ type: 'create' });
      trackEvent('walkin_created', {
        serviceIds: selectedServiceIds,
        professionalId: selectedProfessional?._id || null,
      });

      const phone = customerPhone?.replace(/\D/g, '');
      if (phone) {
        const svcName = selectedServices.length === 1
          ? selectedServices[0].name
          : `${selectedServices.length} servicios`;
        const waText = encodeURIComponent(
          `Hola ${customerName}, ya estas registrado para ${svcName}. Te esperamos!`,
        );
        toast.success('Walk-in creado', {
          description: `${customerName} · ${format(startAt, 'HH:mm')}`,
          action: {
            label: 'Enviar WhatsApp',
            onClick: () => window.open(`https://wa.me/${phone}?text=${waText}`, '_blank'),
          },
          duration: 8000,
        });
      } else {
        toast.success('Walk-in creado', {
          description: `${customerName} · ${format(startAt, 'HH:mm')}`,
        });
      }

      onClose?.(true);
    } catch (err) {
      console.error(err);
      haptics.error();
      toast.error(err.message || 'No se pudo crear el walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  // Footer
  const canGoNext =
    (step === 1 && selectedProfessional) ||
    (step === 2 && selectedServiceIds.length > 0) ||
    (step === 3 && customerName);

  const stickyFooter = (
    <div className="px-4 pt-3 pb-4 bg-card border-t border-border">
      {/* Summary line */}
      {step >= 2 && selectedServiceIds.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2 text-center">
          {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''} · {totalDuration} min
          {totalPrice > 0 ? ` · $${totalPrice.toFixed(2)}` : ''}
        </p>
      )}
      <div className="flex gap-3">
        {step > 1 && (
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-3.5 rounded-[var(--mobile-radius-md)] border border-border text-sm font-medium no-tap-highlight"
          >
            Atrás
          </button>
        )}
        {step < 3 ? (
          <button
            type="button"
            disabled={!canGoNext}
            onClick={goNext}
            className="flex-1 py-3.5 rounded-[var(--mobile-radius-md)] bg-primary text-primary-foreground text-sm font-semibold no-tap-highlight disabled:opacity-40"
          >
            Siguiente
          </button>
        ) : (
          <button
            type="button"
            disabled={!canGoNext || submitting}
            onClick={submit}
            className={cn(
              'flex-1 py-3.5 rounded-[var(--mobile-radius-md)] text-sm font-semibold no-tap-highlight disabled:opacity-40',
              isWaitlist
                ? 'bg-amber-600 text-white'
                : 'bg-primary text-primary-foreground',
            )}
          >
            {submitting
              ? 'Guardando...'
              : isWaitlist
                ? 'Agregar a cola de espera'
                : 'Confirmar walk-in'}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <MobileActionSheet
      open
      onClose={() => onClose?.(false)}
      title="Walk-in"
      footer={stickyFooter}
    >
      <StepIndicator current={step} total={3} />

      {step > 1 && (
        <WalkInSummary
          professional={selectedProfessional}
          services={selectedServices}
        />
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
          {step === 1 && (
            <StepProfessional
              profStatuses={floorLoading ? [] : profStatuses}
              onSelect={handleSelectProfessional}
            />
          )}
          {step === 2 && (
            <StepServices
              professional={selectedProfessional}
              allServices={services}
              selectedIds={selectedServiceIds}
              onToggle={toggleService}
            />
          )}
          {step === 3 && (
            <StepClient
              customerName={customerName}
              setCustomerName={setCustomerName}
              customerPhone={customerPhone}
              setCustomerPhone={setCustomerPhone}
              recentClients={recentClients}
              startAt={startAt}
              setStartAt={setStartAt}
              quickTimes={quickTimes}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </MobileActionSheet>
  );
}
