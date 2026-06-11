import { useEffect, useMemo, useState, useCallback } from 'react';
import { format, addMinutes, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Check, Clock, User, ChevronRight, ChevronLeft,
  CalendarPlus, Calendar, Repeat, FileText, X,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import WheelTimePicker from '@/components/shared/WheelTimePicker.jsx';
import { SPRING, STAGGER, listItem, fadeUp } from '@/lib/motion';

const TOTAL_STEPS = 4;

/**
 * DesktopBookingWizard — 4-step wizard for scheduling future appointments.
 *
 * Step 1: ¿Para quién? (client search/create)
 * Step 2: ¿Qué servicio? (multi-select)
 * Step 3: ¿Cuándo? + ¿Con quién? (date, time, professional)
 * Step 4: Extras (notes, recurrence) — optional, collapsible
 *
 * Beauty vertical: POST /beauty-bookings
 * Other verticals: POST /appointments
 */
export default function DesktopBookingWizard({ open, onClose, preselectedDate, isBeautyVertical = true, endpoints }) {
  const { tenant } = useAuth();

  // ─── State ──────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);

  // Step 1: Client
  const [clientQuery, setClientQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerId, setCustomerId] = useState(null);
  const [recentClients, setRecentClients] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // Step 2: Services
  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  // Step 3: Date, Time, Professional
  const [professionals, setProfessionals] = useState([]);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [proPicked, setProPicked] = useState(false); // distinguishes "no choice yet" from "chose Sin preferencia"
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');

  // Step 4: Extras
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState('weekly');
  const [recurrenceCount, setRecurrenceCount] = useState(4);

  const [submitting, setSubmitting] = useState(false);
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  // ─── Load occupied slots when date or professional changes ──────
  useEffect(() => {
    if (!selectedDate) { setOccupiedSlots([]); return; }
    const ep = isBeautyVertical ? '/beauty-bookings' : '/appointments/calendar';
    const params = new URLSearchParams({ startDate: selectedDate, endDate: selectedDate, limit: '100' });
    if (selectedProfessional?._id) params.append(isBeautyVertical ? 'professionalId' : 'resourceId', selectedProfessional._id);

    fetchApi(`${ep}?${params}`).then(res => {
      const items = Array.isArray(res) ? res : res?.data || res?.items || [];
      // Slots (HH:MM, 30-min grid) covered by an appointment's duration
      const coveredSlots = (apt) => {
        if (apt.status === 'cancelled') return [];
        const start = apt.startTime || '';
        // Extract HH:MM — handle both "14:30" and ISO "2026-04-27T14:30:00.000Z"
        const timeStr = start.includes('T')
          ? new Date(start).toTimeString().slice(0, 5)
          : start.slice(0, 5);
        const duration = apt.totalDuration || 30;
        const [h, m] = timeStr.split(':').map(Number);
        if (isNaN(h)) return [];
        const out = [];
        for (let offset = 0; offset < duration; offset += 30) {
          const totalMin = h * 60 + m + offset;
          out.push(`${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`);
        }
        return out;
      };

      // "Sin preferencia" (beauty): a slot is unavailable only if EVERY professional is busy.
      // Avoids the old bug of merging all professionals' schedules into one occupancy view.
      if (!selectedProfessional && isBeautyVertical && professionals.length > 0) {
        const busyBySlot = new Map(); // slot -> Set(professionalId)
        items.forEach(apt => {
          const proId = apt.professionalId ? String(apt.professionalId) : `u:${apt._id}`;
          coveredSlots(apt).forEach(slot => {
            if (!busyBySlot.has(slot)) busyBySlot.set(slot, new Set());
            busyBySlot.get(slot).add(proId);
          });
        });
        const occupied = [];
        busyBySlot.forEach((set, slot) => { if (set.size >= professionals.length) occupied.push(slot); });
        setOccupiedSlots(occupied);
        return;
      }

      // Specific professional (or non-beauty resource): occupancy is already pre-filtered by the API.
      const occupied = new Set();
      items.forEach(apt => coveredSlots(apt).forEach(s => occupied.add(s)));
      setOccupiedSlots([...occupied]);
    }).catch(() => setOccupiedSlots([]));
  }, [selectedDate, selectedProfessional, isBeautyVertical, professionals.length]);

  // ─── Load Data ──────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    // Reset
    setStep(1);
    setDirection(1);
    setClientQuery('');
    setCustomerName('');
    setCustomerPhone('');
    setCustomerId(null);
    setSelectedServiceIds([]);
    setSelectedProfessional(null);
    setProPicked(false);
    setSelectedDate(preselectedDate || addDays(new Date(), 1).toISOString().split('T')[0]);
    setSelectedTime('10:00');
    setNotes('');
    setIsRecurring(false);

    const svcEndpoint = isBeautyVertical ? '/beauty-services' : '/services/active';
    const resEndpoint = isBeautyVertical ? '/professionals' : '/resources';

    fetchApi(svcEndpoint).then(data => {
      setServices(Array.isArray(data) ? data : data?.items || []);
    }).catch(() => setServices([]));

    fetchApi(resEndpoint).then(data => {
      setProfessionals(Array.isArray(data) ? data : data?.items || []);
    }).catch(() => setProfessionals([]));

    // Recent clients
    fetchApi('/customers?limit=8&sort=-updatedAt').then(res => {
      const items = Array.isArray(res) ? res : res?.data || res?.items || [];
      setRecentClients(items.map(c => ({
        _id: c._id,
        name: c.name || c.companyName,
        phone: c.phone,
      })).slice(0, 6));
    }).catch(() => {});
  }, [open, preselectedDate, isBeautyVertical]);

  // Client search
  useEffect(() => {
    if (clientQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      fetchApi(`/customers?search=${encodeURIComponent(clientQuery)}&limit=8`).then(res => {
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        setSearchResults(items.map(c => ({
          _id: c._id,
          name: c.name || c.companyName,
          phone: c.phone,
        })));
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

  const endTime = useMemo(() => {
    const [h, m] = selectedTime.split(':').map(Number);
    const d = new Date(2000, 0, 1, h, m);
    return format(addMinutes(d, totalDuration), 'HH:mm');
  }, [selectedTime, totalDuration]);

  const timeSlots = useMemo(() => {
    const start = parseInt(tenant?.settings?.businessHours?.start?.split(':')[0] || '8', 10);
    const end = parseInt(tenant?.settings?.businessHours?.end?.split(':')[0] || '20', 10);
    const slots = [];
    for (let h = start; h < end; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
      slots.push(`${String(h).padStart(2, '0')}:30`);
    }
    return slots;
  }, [tenant]);

  const filteredServices = useMemo(() => {
    if (!selectedProfessional?.allowedServiceIds?.length) return services;
    return services.filter(s => selectedProfessional.allowedServiceIds.includes(s._id));
  }, [services, selectedProfessional]);

  // ─── Navigation ─────────────────────────────────────────────────
  const goNext = () => { setDirection(1); setStep(s => Math.min(s + 1, TOTAL_STEPS)); };
  const goBack = () => { setDirection(-1); setStep(s => Math.max(s - 1, 1)); };

  const toggleService = (id) => {
    setSelectedServiceIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectClient = (client) => {
    setCustomerName(client.name);
    setCustomerPhone(client.phone || '');
    setCustomerId(client._id || null);
    setClientQuery(client.name);
    setSearchResults([]);
  };

  // ─── Submit ─────────────────────────────────────────────────────
  const submit = async () => {
    const finalName = customerName || clientQuery.trim();
    if (!finalName || selectedServiceIds.length === 0 || !selectedDate) return;

    try {
      setSubmitting(true);
      let payload;
      const ep = isBeautyVertical ? (endpoints?.appointments || '/beauty-bookings') : (endpoints?.appointments || '/appointments');

      if (isBeautyVertical) {
        payload = {
          client: {
            name: finalName,
            phone: customerPhone && /^\+?[0-9\s-]{7,}$/.test(customerPhone) ? customerPhone : undefined,
          },
          services: selectedServiceIds.map(id => ({ service: id })),
          professionalId: selectedProfessional?._id || undefined,
          date: selectedDate,
          startTime: selectedTime,
          notes: notes || undefined,
          source: 'booking',
          ...(isRecurring && {
            recurrenceRule: {
              frequency: recurrenceFrequency,
              endAfterOccurrences: recurrenceCount,
            },
          }),
        };
      } else {
        const [h, m] = selectedTime.split(':').map(Number);
        const startDt = new Date(`${selectedDate}T${selectedTime}:00`);
        const endDt = addMinutes(startDt, totalDuration);
        payload = {
          customerId: customerId || undefined,
          customerName: finalName,
          serviceId: selectedServiceIds[0],
          resourceId: selectedProfessional?._id || undefined,
          startTime: startDt.toISOString(),
          endTime: endDt.toISOString(),
          notes: notes || undefined,
          status: 'pending',
        };
      }

      const result = await fetchApi(ep, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const dateLabel = new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'short', day: 'numeric', month: 'short',
      });

      if (isRecurring && result?.occurrencesCreated) {
        toast.success(`${result.occurrencesCreated} citas creadas`, {
          description: `${finalName} · ${recurrenceFrequency === 'weekly' ? 'Semanal' : recurrenceFrequency === 'biweekly' ? 'Quincenal' : 'Mensual'}`,
        });
      } else {
        const phone = customerPhone?.replace(/\D/g, '');
        const svcName = selectedServices.length === 1 ? selectedServices[0].name : `${selectedServices.length} servicios`;

        if (phone) {
          const waText = encodeURIComponent(
            `Hola ${finalName}, te confirmamos tu cita de ${svcName} para el ${dateLabel} a las ${selectedTime}. ¡Te esperamos!`
          );
          toast.success('Cita agendada', {
            description: `${finalName} · ${dateLabel} ${selectedTime}`,
            action: {
              label: 'Enviar WhatsApp',
              onClick: () => window.open(`https://wa.me/${phone}?text=${waText}`, '_blank'),
            },
            duration: 8000,
          });
        } else {
          toast.success('Cita agendada', {
            description: `${finalName} · ${dateLabel} ${selectedTime}`,
          });
        }
      }

      onClose?.(true);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'No se pudo crear la cita');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Validation ─────────────────────────────────────────────────
  const canGoNext =
    (step === 1 && (customerName || clientQuery.trim().length >= 2)) ||
    (step === 2 && selectedServiceIds.length > 0) ||
    (step === 3 && selectedDate && selectedTime && (professionals.length === 0 || proPicked)) ||
    (step === 4);

  // ─── Slide ──────────────────────────────────────────────────────
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
            <CalendarPlus className="h-5 w-5 text-primary" />
            Agendar cita
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 px-5 pb-3">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <motion.div
              key={i}
              className={`h-1 rounded-full flex-1 ${i < step ? 'bg-primary' : 'bg-muted'}`}
              animate={{ scaleX: i < step ? 1 : 0.85 }}
              transition={SPRING.snappy}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">{step}/{TOTAL_STEPS}</span>
        </div>

        {/* Summary breadcrumb */}
        {step > 1 && (
          <div className="px-5 pb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {customerName && (
              <>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5">{customerName}</Badge>
                <ChevronRight className="h-3 w-3" />
              </>
            )}
            {selectedServiceIds.length > 0 && (
              <>
                <span>
                  {selectedServiceIds.length} servicio{selectedServiceIds.length > 1 ? 's' : ''}
                  {' · '}{totalDuration}min
                  {totalPrice > 0 ? ` · $${totalPrice.toFixed(2)}` : ''}
                </span>
                {step > 2 && <ChevronRight className="h-3 w-3" />}
              </>
            )}
            {step > 2 && selectedDate && (
              <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} {selectedTime}</span>
            )}
          </div>
        )}

        {/* Step content */}
        <div className="min-h-[340px] overflow-hidden">
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
              {/* ── STEP 1: Client ── */}
              {step === 1 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">¿Para quién es la cita?</p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={clientQuery}
                      onChange={e => { setClientQuery(e.target.value); setCustomerName(''); setCustomerId(null); }}
                      placeholder="Buscar o escribir nombre del cliente..."
                      className="pl-8 h-9 text-sm"
                      autoFocus
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="border rounded-lg divide-y max-h-32 overflow-y-auto">
                      {searchResults.map((c, i) => (
                        <button key={i} type="button" onClick={() => selectClient(c)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent/5 text-left">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate flex-1">{c.name}</span>
                          {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
                        </button>
                      ))}
                    </div>
                  )}

                  {!clientQuery && recentClients.length > 0 && (
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Recientes</p>
                      <div className="flex flex-wrap gap-1.5">
                        {recentClients.map((c, i) => (
                          <button key={i} type="button" onClick={() => selectClient(c)}
                            className="text-[11px] px-2.5 py-1.5 rounded-full border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-colors">
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {customerName && (
                    <p className="text-xs text-emerald-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> {customerName}
                    </p>
                  )}

                  <div className="space-y-1 pt-1">
                    <p className="text-xs text-muted-foreground">Teléfono (opcional)</p>
                    <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                      placeholder="+58 412 1234567" className="h-8 text-sm" type="tel" />
                  </div>
                </div>
              )}

              {/* ── STEP 2: Services ── */}
              {step === 2 && (
                <div className="space-y-3">
                  <p className="text-sm font-medium">¿Qué servicio{services.length > 1 ? 's' : ''}?</p>
                  <motion.div variants={STAGGER(0.02)} initial="initial" animate="animate"
                    className="grid grid-cols-2 gap-2 max-h-[280px] overflow-y-auto">
                    {(filteredServices.length > 0 ? filteredServices : services).map(svc => {
                      const selected = selectedServiceIds.includes(svc._id);
                      const price = Number(svc.price?.amount ?? svc.price) || 0;
                      return (
                        <motion.button key={svc._id} variants={listItem} type="button"
                          onClick={() => toggleService(svc._id)}
                          className={`flex items-center gap-2 p-2.5 rounded-lg border text-left text-sm transition-all ${
                            selected ? 'border-primary bg-primary/10 ring-1 ring-primary/30' : 'border-border/40 hover:border-border hover:bg-accent/5'
                          }`}>
                          <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                          }`}>
                            {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-xs">{svc.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {svc.duration || 30}min{price > 0 ? ` · $${price.toFixed(2)}` : ''}
                            </p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </div>
              )}

              {/* ── STEP 3: Who + When ── */}
              {step === 3 && (
                <div className="space-y-4">
                  {/* Date */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium">¿Cuándo?</p>
                    <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                      className="h-9 text-sm" min={new Date().toISOString().split('T')[0]} />
                  </div>

                  {/* Professional FIRST — the wheel below shows THIS professional's real availability */}
                  {professionals.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-sm font-medium">¿Con quién?</p>
                      <div className="flex flex-wrap gap-1.5">
                        <button type="button"
                          onClick={() => { setSelectedProfessional(null); setProPicked(true); }}
                          className={`text-xs px-2.5 py-1.5 rounded-full border transition-all ${
                            proPicked && !selectedProfessional ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:border-border text-muted-foreground'
                          }`}>
                          Sin preferencia
                        </button>
                        {professionals.map(pro => {
                          const sel = selectedProfessional?._id === pro._id;
                          return (
                            <button key={pro._id} type="button" onClick={() => { setSelectedProfessional(pro); setProPicked(true); }}
                              className={`text-xs px-2.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                                sel ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:border-border text-muted-foreground'
                              }`}>
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: pro.color || '#6366f1' }} />
                              {pro.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Time wheel — gated on a professional choice so availability is never a merged/incongruent view */}
                  {(professionals.length === 0 || proPicked) ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        Hora{selectedProfessional ? ` · ${selectedProfessional.name}` : professionals.length > 0 ? ' · cualquier profesional libre' : ''}
                      </p>
                      <WheelTimePicker
                        slots={timeSlots}
                        value={selectedTime}
                        onChange={setSelectedTime}
                        occupiedSlots={occupiedSlots}
                      />
                      <p className="text-xs text-muted-foreground text-center">
                        {selectedTime} — {endTime} ({totalDuration}min)
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/40 p-4 text-center text-xs text-muted-foreground">
                      Elige con quién será la cita para ver los horarios disponibles.
                    </div>
                  )}
                </div>
              )}

              {/* ── STEP 4: Extras ── */}
              {step === 4 && (
                <div className="space-y-4">
                  <p className="text-sm font-medium">Detalles adicionales</p>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notas (opcional)</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)}
                      placeholder="Preferencias del cliente, indicaciones especiales..."
                      className="text-xs min-h-[60px] resize-none" />
                  </div>

                  {/* Recurrence (beauty only) */}
                  {isBeautyVertical && (
                    <div className="space-y-2 border rounded-lg p-3 border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Cita recurrente</span>
                        </div>
                        <button type="button" onClick={() => setIsRecurring(!isRecurring)}
                          className={`w-9 h-5 rounded-full p-0.5 transition-colors ${isRecurring ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
                          <motion.div className="w-4 h-4 rounded-full bg-white shadow-sm"
                            animate={{ x: isRecurring ? 16 : 0 }} transition={SPRING.snappy} />
                        </button>
                      </div>

                      {isRecurring && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={SPRING.soft}
                          className="grid grid-cols-2 gap-2 pt-1">
                          <div className="space-y-1">
                            <Label className="text-[10px]">Frecuencia</Label>
                            <Select value={recurrenceFrequency} onValueChange={setRecurrenceFrequency}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="weekly">Semanal</SelectItem>
                                <SelectItem value="biweekly">Quincenal</SelectItem>
                                <SelectItem value="monthly">Mensual</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px]">Repeticiones</Label>
                            <Select value={String(recurrenceCount)} onValueChange={v => setRecurrenceCount(Number(v))}>
                              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {[2, 3, 4, 6, 8, 12].map(n => (
                                  <SelectItem key={n} value={String(n)}>{n} veces</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Summary */}
                  <div className="rounded-lg bg-muted/20 p-3 space-y-1 text-xs">
                    <p className="font-medium text-foreground">Resumen</p>
                    <p className="text-muted-foreground">
                      {customerName || clientQuery} · {selectedServices.map(s => s.name).join(', ') || 'Servicio'}
                    </p>
                    <p className="text-muted-foreground">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedTime}
                      {selectedProfessional ? ` · ${selectedProfessional.name}` : ''}
                    </p>
                    {totalPrice > 0 && <p className="text-emerald-400 font-medium">${totalPrice.toFixed(2)} · {totalDuration}min</p>}
                    {isRecurring && (
                      <p className="text-primary">
                        Recurrente: {recurrenceFrequency === 'weekly' ? 'Semanal' : recurrenceFrequency === 'biweekly' ? 'Quincenal' : 'Mensual'} × {recurrenceCount}
                      </p>
                    )}
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
              <ChevronLeft className="h-4 w-4 mr-1" /> Atrás
            </Button>
          )}
          <div className="flex-1" />
          {step < TOTAL_STEPS ? (
            <Button size="sm" onClick={goNext} disabled={!canGoNext} className="h-9 px-6">
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button size="sm" onClick={submit} disabled={!canGoNext || submitting} className="h-9 px-6">
              {submitting ? 'Guardando...' : isRecurring ? `Crear ${recurrenceCount} citas` : 'Confirmar cita'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
