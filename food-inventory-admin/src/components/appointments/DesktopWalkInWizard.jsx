import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addMinutes, roundToNearestMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Check, Clock, User, ChevronRight, ChevronLeft, UserPlus, Scissors, X } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { SPRING, STAGGER, listItem, fadeUp } from '@/lib/motion';

/**
 * DesktopWalkInWizard — Fast 3-step walk-in flow for desktop.
 *
 * Step 1: Select professional → Step 2: Select services → Step 3: Client + time → Submit
 *
 * Adapted from MobileWalkInWizard for desktop. Uses Dialog instead of MobileActionSheet.
 * Only for beauty vertical (walk-ins are a beauty-specific concept).
 */
export default function DesktopWalkInWizard({ open, onClose, preselectedDate, initialProfessionalId }) {
  const { tenant } = useAuth();

  // ─── State ──────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Professional
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);

  // Step 2: Services
  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // Step 3: Client & Time
  const [clientQuery, setClientQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [recentClients, setRecentClients] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [startAt, setStartAt] = useState(() => roundToNearestMinutes(new Date(), { nearestTo: 15, roundingMethod: 'ceil' }));

  const [submitting, setSubmitting] = useState(false);

  // ─── Load Data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // Reset state on open
    setStep(1);
    setDirection(1);
    setSelectedProfessional(null);
    setSelectedServiceIds([]);
    setClientQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setStartAt(roundToNearestMinutes(new Date(), { nearestTo: 15, roundingMethod: 'ceil' }));

    // Load professionals
    fetchApi('/professionals').then(data => {
      const profs = Array.isArray(data) ? data : data?.items || [];
      setProfessionals(profs);
      // Auto-select professional from floor panel and skip to step 2
      if (initialProfessionalId) {
        const pre = profs.find(p => p._id === initialProfessionalId);
        if (pre) {
          setSelectedProfessional(pre);
          setStep(2);
        }
      }
    }).catch(() => setProfessionals([]));

    // Load services
    fetchApi('/beauty-services').then(data => {
      setServices(Array.isArray(data) ? data : data?.items || []);
    }).catch(() => setServices([]));

    // Load recent clients
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addMinutes(new Date(), 24 * 60), 'yyyy-MM-dd');
    fetchApi(`/beauty-bookings?startDate=${today}&endDate=${tomorrow}&limit=50`).then(data => {
      const bookings = Array.isArray(data) ? data : data?.items || [];
      const seen = new Set();
      const clients = [];
      bookings.forEach(b => {
        const name = b.client?.name || b.customerName;
        if (name && !seen.has(name)) {
          seen.add(name);
          clients.push({ name, phone: b.client?.phone || b.customerPhone });
        }
      });
      setRecentClients(clients.slice(0, 6));
    }).catch(() => {});
  }, [open]);

  // Client search
  useEffect(() => {
    if (clientQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetchApi(`/customers?search=${encodeURIComponent(clientQuery)}&limit=8`).then(res => {
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        setSearchResults(items.map(c => ({ name: c.name || c.companyName, phone: c.phone })));
      }).catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [clientQuery]);

  // ─── Derived ────────────────────────────────────────────────────
  const selectedServices = useMemo(() =>
    services.filter(s => selectedServiceIds.includes(s._id)),
    [services, selectedServiceIds]
  );

  const totalDuration = useMemo(() =>
    selectedServices.reduce((sum, s) => sum + (Number(s.duration) || 30), 0),
    [selectedServices]
  );

  const totalPrice = useMemo(() =>
    selectedServices.reduce((sum, s) => sum + (Number(s.price?.amount ?? s.price) || 0), 0),
    [selectedServices]
  );

  const endAt = useMemo(() => addMinutes(startAt, totalDuration), [startAt, totalDuration]);

  const filteredServices = useMemo(() => {
    if (!selectedProfessional?.allowedServiceIds?.length) return services;
    return services.filter(s => selectedProfessional.allowedServiceIds.includes(s._id));
  }, [services, selectedProfessional]);

  const quickTimes = useMemo(() => {
    const now = new Date();
    const next = roundToNearestMinutes(now, { nearestTo: 15, roundingMethod: 'ceil' });
    return [
      { label: 'Ahora', time: next },
      { label: '+30m', time: addMinutes(next, 30) },
      { label: '+1h', time: addMinutes(next, 60) },
      { label: '+2h', time: addMinutes(next, 120) },
    ];
  }, []);

  // ─── Navigation ─────────────────────────────────────────────────
  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, 3)); };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  const toggleService = (id) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectClient = (client) => {
    setCustomerName(client.name);
    setCustomerPhone(client.phone || '');
    setClientQuery(client.name);
    setSearchResults([]);
  };

  // ─── Submit ─────────────────────────────────────────────────────
  const submit = async () => {
    const finalName = customerName || clientQuery.trim();
    if (!finalName || selectedServiceIds.length === 0) return;

    try {
      setSubmitting(true);
      const payload = {
        client: {
          name: finalName,
          phone: customerPhone && /^\+[1-9]\d{1,14}$/.test(customerPhone) ? customerPhone : undefined,
        },
        services: selectedServiceIds.map(id => ({ service: id })),
        professionalId: selectedProfessional?._id || undefined,
        date: format(startAt, 'yyyy-MM-dd'),
        startTime: format(startAt, 'HH:mm'),
        source: 'walk-in',
      };

      await fetchApi('/beauty-bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const svcName = selectedServices.length === 1
        ? selectedServices[0].name
        : `${selectedServices.length} servicios`;

      const phone = customerPhone?.replace(/\D/g, '');
      if (phone) {
        const waText = encodeURIComponent(
          `Hola ${finalName}, ya estás registrado para ${svcName}. ¡Te esperamos!`
        );
        toast.success('Walk-in creado', {
          description: `${finalName} · ${format(startAt, 'HH:mm')}`,
          action: {
            label: 'Enviar WhatsApp',
            onClick: () => window.open(`https://wa.me/${phone}?text=${waText}`, '_blank'),
          },
          duration: 8000,
        });
      } else {
        toast.success('Walk-in creado', {
          description: `${finalName} · ${format(startAt, 'HH:mm')}`,
        });
      }

      onClose?.(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo crear el walk-in');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Validation ─────────────────────────────────────────────────
  const canGoNext =
    (step === 1 && selectedProfessional) ||
    (step === 2 && selectedServiceIds.length > 0) ||
    (step === 3 && (customerName || clientQuery.trim().length >= 2));

  // ─── Slide animation ───────────────────────────────────────────
  const slideVariants = {
    enter: (dir) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(false); }}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5 text-primary" />
            Walk-in
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pb-3">
          {[1, 2, 3].map(i => (
            <motion.div
              key={i}
              className={`h-1 rounded-full flex-1 ${i <= step ? 'bg-primary' : 'bg-muted'}`}
              animate={{ scaleX: i <= step ? 1 : 0.85 }}
              transition={SPRING.snappy}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{step}/3</span>
        </div>

        {/* Summary breadcrumb */}
        {step > 1 && (
          <div className="px-5 pb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            {selectedProfessional && (
              <>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{selectedProfessional.name}</Badge>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            {selectedServiceIds.length > 0 && (
              <span>
                {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''}
                {' · '}{totalDuration}min
                {totalPrice > 0 ? ` · $${totalPrice.toFixed(2)}` : ''}
              </span>
            )}
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[320px] overflow-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SPRING.soft}
              className="px-5 py-3"
            >
              {/* ── STEP 1: Professional ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">¿Con quién?</p>
                  <motion.div variants={STAGGER(0.03)} initial="initial" animate="animate" className="grid grid-cols-2 gap-2">
                    {professionals.map(pro => {
                      const selected = selectedProfessional?._id === pro._id;
                      return (
                        <motion.button
                          key={pro._id}
                          variants={listItem}
                          type="button"
                          onClick={() => setSelectedProfessional(pro)}
                          className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-sm transition-all ${
                            selected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                              : 'border-border/40 hover:border-border hover:bg-accent/5'
                          }`}
                        >
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: pro.color || '#6366f1' }}
                          >
                            {pro.name?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{pro.name}</p>
                            {pro.specialties?.length > 0 && (
                              <p className="text-[11px] text-muted-foreground truncate">{pro.specialties[0]}</p>
                            )}
                          </div>
                          {selected && <Check className="h-4 w-4 text-primary shrink-0 ml-auto" />}
                        </motion.button>
                      );
                    })}
                  </motion.div>
                  {professionals.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-6">Cargando profesionales...</p>
                  )}
                </div>
              )}

              {/* ── STEP 2: Services ── */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">¿Qué servicio{filteredServices.length > 1 ? 's' : ''}?</p>
                  <motion.div variants={STAGGER(0.02)} initial="initial" animate="animate" className="grid grid-cols-2 gap-2">
                    {filteredServices.map(svc => {
                      const selected = selectedServiceIds.includes(svc._id);
                      const price = Number(svc.price?.amount ?? svc.price) || 0;
                      return (
                        <motion.button
                          key={svc._id}
                          variants={listItem}
                          type="button"
                          onClick={() => toggleService(svc._id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                            selected
                              ? 'border-primary bg-primary/10 ring-1 ring-primary/30'
                              : 'border-border/40 hover:border-border hover:bg-accent/5'
                          }`}
                        >
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-xs">{svc.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {svc.duration || 30}min
                              {price > 0 ? ` · $${price.toFixed(2)}` : ''}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}

              {/* ── STEP 3: Client + Time ── */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Client search */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">¿Para quién?</p>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        value={clientQuery}
                        onChange={e => { setClientQuery(e.target.value); setCustomerName(''); }}
                        placeholder="Nombre del cliente..."
                        className="pl-8 h-9 text-sm"
                        autoFocus
                      />
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                      <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                        {searchResults.map((c, i) => (
                          <button
                            key={i} type="button"
                            onClick={() => selectClient(c)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/5 text-left"
                          >
                            <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{c.name}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Recent clients */}
                    {!clientQuery && recentClients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {recentClients.map((c, i) => (
                          <button
                            key={i} type="button"
                            onClick={() => selectClient(c)}
                            className="text-[11px] px-2 py-1 rounded-full border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors"
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {customerName && (
                      <p className="text-xs text-emerald-400 flex items-center gap-1">
                        <Check className="h-3 w-3" /> {customerName}
                      </p>
                    )}
                  </div>

                  {/* Phone (optional) */}
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Teléfono (opcional, para WhatsApp)</p>
                    <Input
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+58 412 1234567"
                      className="h-8 text-sm"
                      type="tel"
                    />
                  </div>

                  {/* Quick time selection */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium">¿Cuándo?</p>
                    <div className="flex gap-2">
                      {quickTimes.map(qt => (
                        <button
                          key={qt.label}
                          type="button"
                          onClick={() => setStartAt(qt.time)}
                          className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                            format(startAt, 'HH:mm') === format(qt.time, 'HH:mm')
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/40 hover:border-border text-muted-foreground'
                          }`}
                        >
                          {qt.label}
                          <br />
                          <span className="text-[10px] opacity-60">{format(qt.time, 'HH:mm')}</span>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      {format(startAt, 'HH:mm')} — {format(endAt, 'HH:mm')} ({totalDuration}min)
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border/30 dark:border-gray-800 flex items-center gap-3">
          {step > 1 && (
            <Button variant="outline" size="sm" onClick={goBack} className="h-9">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Atrás
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button size="sm" onClick={goNext} disabled={!canGoNext} className="h-9 px-6">
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={!canGoNext || submitting} className="h-9 px-6">
              {submitting ? 'Guardando...' : 'Confirmar walk-in'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
