import { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Edit, Trash2, DollarSign,
  ChevronLeft, ChevronRight, CheckCircle, PlayCircle, XCircle,
  Plus, UserPlus, CalendarPlus, List, LayoutGrid,
  MessageCircle, Send, Save, X, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import WhatsAppComposer from '@/components/shared/WhatsAppComposer.jsx';
import { listItem, fadeUp, SPRING, STAGGER, scaleIn } from '@/lib/motion';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', color: 'bg-warning-muted text-yellow-800 dark:text-yellow-200 border-warning/40', icon: Clock, actionLabel: 'Confirmar', nextStatus: 'confirmed' },
  confirmed: { label: 'Confirmada', color: 'bg-info-muted text-blue-800 dark:text-blue-200 border-info/40', icon: CheckCircle, actionLabel: 'Iniciar', nextStatus: 'in_progress' },
  in_progress: { label: 'En Progreso', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-300 dark:border-purple-700', icon: PlayCircle, actionLabel: 'Completar', nextStatus: 'completed' },
  completed: { label: 'Completada', color: 'bg-success-muted text-green-800 dark:text-green-200 border-success/40', icon: CheckCircle, actionLabel: null, nextStatus: null },
  cancelled: { label: 'Cancelada', color: 'bg-destructive/10 text-red-800 dark:text-red-200 border-destructive/40', icon: XCircle, actionLabel: null, nextStatus: null },
  no_show: { label: 'No asistió', color: 'bg-warning/10 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700', icon: XCircle, actionLabel: null, nextStatus: null },
};

// Helper: shift a YYYY-MM-DD string by N days
function shiftDate(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function isToday(dateStr) {
  return dateStr === new Date().toISOString().split('T')[0];
}

/**
 * Command Panel — the action hub of the Agenda module.
 *
 * The calendar is for SEEING (pattern, density, availability).
 * The panel is for ACTING (confirm, pay, create, navigate).
 */
export default function AppointmentDetailPanel({
  selectedDate,
  selectedAppointment,
  appointments = [],
  labels = {},
  isBeautyVertical = false,
  onStatusChange,
  onEdit,
  onDelete,
  onPayment,
  onSelectAppointment,
  onClearSelection,
  onDateChange,
  onCreateAppointment,
  onWalkIn,
  className = '',
}) {
  const [panelView, setPanelView] = useState('cards'); // 'cards' | 'table'
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Filter appointments for the selected date
  const dayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
        return aptDate === selectedDate && apt.status !== 'cancelled';
      })
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  }, [appointments, selectedDate]);

  const formattedDate = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [selectedDate]);

  const shortDate = useMemo(() => {
    if (!selectedDate) return '';
    const d = new Date(selectedDate + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [selectedDate]);

  const dayRevenue = useMemo(() => {
    return dayAppointments.reduce((sum, a) => sum + (Number(a.totalPrice) || 0), 0);
  }, [dayAppointments]);

  const pendingCount = useMemo(() => {
    return dayAppointments.filter(a => a.status === 'pending').length;
  }, [dayAppointments]);

  // Navigation handlers
  const goBack = useCallback(() => {
    if (selectedDate) onDateChange?.(shiftDate(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const goForward = useCallback(() => {
    if (selectedDate) onDateChange?.(shiftDate(selectedDate, 1));
  }, [selectedDate, onDateChange]);

  const goToday = useCallback(() => {
    onDateChange?.(new Date().toISOString().split('T')[0]);
  }, [onDateChange]);

  const handleDatePick = useCallback((e) => {
    const val = e.target.value;
    if (val) {
      onDateChange?.(val);
      setDatePickerOpen(false);
    }
  }, [onDateChange]);

  // ─── Detail view for a specific appointment ──────────────────────
  if (selectedAppointment) {
    const apt = selectedAppointment;
    const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
    return (
      <div className={`flex flex-col h-full rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm dark:bg-gray-900/50 dark:border-gray-800 overflow-hidden ${className}`}>
        {/* Header with back */}
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/30 dark:border-gray-800">
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 w-7 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-muted-foreground flex-1">Detalle</span>
          {/* Inline quick actions */}
          <div className="flex items-center gap-0.5">
            {sc.nextStatus && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                title={sc.actionLabel}
                onClick={() => { onStatusChange?.(apt._id, sc.nextStatus); onClearSelection?.(); }}>
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
            {isBeautyVertical && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300"
                title="Cobrar" onClick={() => onPayment?.(apt)}>
                <DollarSign className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Editar"
              onClick={() => onEdit?.(apt)}>
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              title="Eliminar" onClick={() => { onDelete?.(apt._id); onClearSelection?.(); }}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Appointment detail body */}
        <motion.div variants={fadeUp} initial="initial" animate="animate"
          className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Customer */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{apt.customerName || 'Sin cliente'}</p>
              {apt.customerPhone && <p className="text-xs text-muted-foreground">{apt.customerPhone}</p>}
            </div>
          </div>

          {/* Service + Time */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{new Date(apt.startTime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                {apt.endTime && ` — ${new Date(apt.endTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
            {apt.serviceName && <Badge variant="outline" className="mt-1">{apt.serviceName}</Badge>}
            {apt.resourceName && (
              <p className="text-xs text-muted-foreground">{labels.recurso?.singular || 'Recurso'}: {apt.resourceName}</p>
            )}
            {apt.totalPrice > 0 && (
              <p className="text-sm font-medium text-emerald-400">${Number(apt.totalPrice).toFixed(2)}</p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Estado</p>
            <Select value={apt.status} onValueChange={(val) => onStatusChange?.(apt._id, val)}>
              <SelectTrigger className="h-8 text-xs">
                <AnimatePresence mode="wait">
                  <motion.span key={apt.status} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={SPRING.snappy}
                    className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${sc.color.split(' ')[0]}`} />
                    {sc.label}
                  </motion.span>
                </AnimatePresence>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {sc.nextStatus && (
              <Button size="sm" variant="outline" className="w-full h-8 text-xs"
                onClick={() => { onStatusChange?.(apt._id, sc.nextStatus); }}>
                <CheckCircle className="h-3 w-3 mr-1.5" />
                {sc.actionLabel}
              </Button>
            )}
          </div>

          {/* WhatsApp */}
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">WhatsApp</p>
            <WhatsAppComposer contact={{ name: apt.customerName, phone: apt.customerPhone || apt.client?.phone, _id: apt.customerId }} context={{ serviceName: apt.serviceName, startTime: apt.startTime }} onClose={() => {}} />
          </div>

          {/* Notes */}
          {apt.notes && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Notas</p>
              <p className="text-sm text-foreground/80">{apt.notes}</p>
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  // ─── Command Panel: Day list with navigation ──────────────────────
  return (
    <div className={`flex flex-col h-full rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm dark:bg-gray-900/50 dark:border-gray-800 overflow-hidden ${className}`}>

      {/* ── Navigation Header ── */}
      <div className="px-3 py-2.5 border-b border-border/30 dark:border-gray-800 space-y-1.5">
        {/* Row 1: Date navigation */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={goBack} className="h-7 w-7 p-0" title="Día anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex-1 text-center text-sm font-medium capitalize hover:text-primary transition-colors cursor-pointer"
                title="Click para seleccionar fecha"
              >
                {isToday(selectedDate) ? (
                  <span className="text-primary font-semibold">Hoy</span>
                ) : (
                  shortDate
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="center">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">Ir a fecha</p>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={handleDatePick}
                  className="h-8 text-sm"
                />
                <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={() => { goToday(); setDatePickerOpen(false); }}>
                  Hoy
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="sm" onClick={goForward} className="h-7 w-7 p-0" title="Día siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Date picker icon shortcut */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" title="Ir a fecha">
                <Calendar className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2" align="end">
              <Input
                type="date"
                value={selectedDate}
                onChange={handleDatePick}
                className="h-8 text-sm"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Row 2: Stats summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {dayAppointments.length} {dayAppointments.length === 1 ? (labels.cita?.singularLower || 'cita') : (labels.cita?.pluralLower || 'citas')}
            {dayRevenue > 0 && <span className="text-emerald-400"> · ${dayRevenue.toFixed(2)}</span>}
          </span>
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* ── Create CTAs ── */}
      <div className="px-3 py-2 border-b border-border/30 dark:border-gray-800 flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onWalkIn?.(selectedDate)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Walk-in
        </Button>
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5"
          onClick={() => onCreateAppointment?.(selectedDate)}
        >
          <CalendarPlus className="h-3.5 w-3.5" />
          Agendar
        </Button>
      </div>

      {/* ── View toggle ── */}
      <div className="px-3 py-1.5 flex items-center justify-end gap-1 border-b border-border/20 dark:border-gray-800/50">
        <Button
          variant={panelView === 'cards' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setPanelView('cards')}
          title="Tarjetas"
        >
          <LayoutGrid className="h-3 w-3" />
        </Button>
        <Button
          variant={panelView === 'table' ? 'secondary' : 'ghost'}
          size="sm"
          className="h-6 w-6 p-0"
          onClick={() => setPanelView('table')}
          title="Tabla compacta"
        >
          <List className="h-3 w-3" />
        </Button>
      </div>

      {/* ── Appointment List ── */}
      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {dayAppointments.length === 0 ? (
            <motion.div
              key="empty"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center justify-center h-full p-6 text-center"
            >
              <Calendar className="h-8 w-8 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">{labels.calendar?.emptyTitle || 'Sin citas'}</p>
              <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                {isToday(selectedDate) ? 'Agenda libre hoy' : (labels.calendar?.emptyDescription || 'No hay citas este día')}
              </p>
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => onCreateAppointment?.(selectedDate)}>
                <Plus className="h-3.5 w-3.5" />
                {labels.calendar?.newButton || 'Nueva Cita'}
              </Button>
            </motion.div>
          ) : panelView === 'cards' ? (
            /* ── Cards View ── */
            <motion.div
              key={`cards-${selectedDate}`}
              variants={STAGGER(0.04)}
              initial="initial"
              animate="animate"
              className="p-2 space-y-2"
            >
              {dayAppointments.map((apt) => (
                <AppointmentCard
                  key={apt._id}
                  apt={apt}
                  labels={labels}
                  isBeautyVertical={isBeautyVertical}
                  onSelect={() => onSelectAppointment?.(apt)}
                  onStatusChange={onStatusChange}
                  onPayment={onPayment}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </motion.div>
          ) : (
            /* ── Table View ── */
            <motion.div
              key={`table-${selectedDate}`}
              variants={STAGGER(0.02)}
              initial="initial"
              animate="animate"
              className="divide-y divide-border/20"
            >
              {dayAppointments.map((apt) => (
                <AppointmentTableRow
                  key={apt._id}
                  apt={apt}
                  isBeautyVertical={isBeautyVertical}
                  onSelect={() => onSelectAppointment?.(apt)}
                  onStatusChange={onStatusChange}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}


// WhatsAppComposer imported from @/components/shared/WhatsAppComposer.jsx


// Old inline WhatsAppComposer removed — now imported from @/components/shared/WhatsAppComposer.jsx
function _DEAD_CODE_PLACEHOLDER() {
  const [mode, setMode] = useState('select');
  const [customText, setCustomText] = useState('');
  const [sending, setSending] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const defaultTemplates = useMemo(() => buildDefaultTemplates(apt), [apt]);

  useEffect(() => {
    setSavedTemplates(loadWaTemplates());
  }, []);

  const phone = apt.customerPhone || apt.client?.phone;
  const cleanPhone = phone?.replace(/\D/g, '');

  const handleSend = async (text) => {
    if (!text.trim() || sending) return;
    setSending(true);
    const result = await sendWhatsAppMessage(phone, text, apt.customerId, apt._id);
    setSending(false);

    if (result.success) {
      toast.success('Mensaje enviado por WhatsApp', {
        description: apt.customerName,
        action: cleanPhone ? {
          label: 'Ver conversación',
          onClick: () => window.open(`https://wa.me/${cleanPhone}`, '_blank'),
        } : undefined,
        duration: 6000,
      });
      setMode('sent');
    } else if (result.fallback) {
      toast.info('Mensaje abierto en WhatsApp Web', {
        description: 'La API no respondió. Se abrió WhatsApp Web como alternativa.',
      });
      onClose?.();
    } else {
      toast.error('No se pudo enviar el mensaje');
    }
  };

  const handleSaveTemplate = () => {
    if (!customText.trim()) return;
    saveWaTemplate(customText.trim());
    setSavedTemplates(loadWaTemplates());
    toast.success('Plantilla guardada');
  };

  // No phone registered
  if (!phone) {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground text-center">
          {apt.customerName || 'Este cliente'} no tiene teléfono registrado.
        </p>
        <Button variant="outline" size="sm" className="w-full h-7 text-xs" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    );
  }

  // Post-send: show conversation link
  if (mode === 'sent') {
    return (
      <div className="p-3 space-y-3 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SPRING.bouncy}>
          <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
        </motion.div>
        <p className="text-xs font-medium">Mensaje enviado a {apt.customerName}</p>
        <div className="space-y-1.5">
          <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5 text-emerald-500 border-emerald-500/30"
            onClick={() => window.open(`https://wa.me/${cleanPhone}`, '_blank')}>
            <MessageCircle className="h-3.5 w-3.5" /> Ver conversación
          </Button>
          <Button size="sm" variant="ghost" className="w-full h-7 text-xs" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  // Custom message mode
  if (mode === 'custom') {
    return (
      <div className="p-3 space-y-2">
        <p className="text-xs font-medium">Mensaje personalizado</p>
        <Textarea
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={`Escribe tu mensaje para ${apt.customerName}...`}
          className="text-xs min-h-[80px] resize-none"
          autoFocus
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => handleSend(customText)}
            disabled={!customText.trim() || sending}>
            <Send className="h-3 w-3" /> {sending ? 'Enviando...' : 'Enviar'}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleSaveTemplate}
            disabled={!customText.trim()} title="Guardar como plantilla">
            <Save className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setMode('select')}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // Template selection mode
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium">Enviar WhatsApp</p>
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary"
          onClick={() => { setMode('custom'); setCustomText(''); }}>
          <FileText className="h-2.5 w-2.5 mr-0.5" /> Personalizado
        </Button>
      </div>

      {/* Default templates */}
      <div className="space-y-1">
        {defaultTemplates.map((t, i) => (
          <button key={i} type="button" onClick={() => handleSend(t.text)} disabled={sending}
            className="w-full text-left px-2.5 py-2 rounded-md border border-border/30 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs disabled:opacity-50">
            <span className="font-medium text-foreground">{t.label}</span>
            <p className="text-muted-foreground line-clamp-1 mt-0.5">{t.text}</p>
          </button>
        ))}
      </div>

      {/* Saved custom templates */}
      {savedTemplates.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider pt-1">Guardadas</p>
          <div className="space-y-1">
            {savedTemplates.slice(0, 3).map((t, i) => (
              <button key={i} type="button" onClick={() => handleSend(t.text)} disabled={sending}
                className="w-full text-left px-2.5 py-1.5 rounded-md border border-border/20 hover:border-primary/40 hover:bg-primary/5 transition-colors text-xs text-muted-foreground line-clamp-2 disabled:opacity-50">
                {t.text}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


// ─── Card Component ─────────────────────────────────────────────────

function AppointmentCard({ apt, labels, isBeautyVertical, onSelect, onStatusChange, onPayment, onEdit, onDelete }) {
  const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
  const isPending = apt.status === 'pending';
  const [waOpen, setWaOpen] = useState(false);

  const hasPhone = !!(apt.customerPhone || apt.client?.phone);

  return (
    <motion.div
      variants={listItem}
      className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-px group ${sc.color}`}
      onClick={onSelect}
    >
      {/* Row 1: Time + Customer + Price */}
      <div className="flex items-start gap-2 mb-1.5">
        <span className="text-xs font-mono text-muted-foreground w-11 shrink-0 pt-0.5">
          {new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{apt.customerName || 'Sin cliente'}</p>
          <p className="text-xs opacity-70 truncate">
            {apt.serviceName || 'Servicio'}
            {apt.resourceName ? ` · ${apt.resourceName}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isPending && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
          {apt.totalPrice > 0 && (
            <span className="text-xs font-semibold text-emerald-400">${Number(apt.totalPrice).toFixed(2)}</span>
          )}
        </div>
      </div>

      {/* Row 2: Status + Actions — always visible */}
      <div className="flex items-center gap-1 pt-1.5 border-t border-current/10">
        {/* Status selector */}
        <Select value={apt.status} onValueChange={(val) => { onStatusChange?.(apt._id, val); }}>
          <SelectTrigger className="h-6 w-auto px-1.5 text-[10px] border-0 bg-transparent shadow-none gap-0.5"
            onClick={e => e.stopPropagation()}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sc.color.split(' ')[0]}`} />
            <span className="truncate max-w-[60px]">{sc.label}</span>
          </SelectTrigger>
          <SelectContent onClick={e => e.stopPropagation()}>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <SelectItem key={value} value={value} className="text-xs">
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${config.color.split(' ')[0]}`} />
                  {config.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        {/* WhatsApp */}
        <Popover open={waOpen} onOpenChange={setWaOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm"
              className={`h-6 w-6 p-0 ${hasPhone ? 'text-emerald-500 hover:text-emerald-400' : 'text-muted-foreground/40'}`}
              onClick={e => e.stopPropagation()}
              title={hasPhone ? 'Enviar WhatsApp' : 'Sin teléfono'}>
              <MessageCircle className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-0" align="end" onClick={e => e.stopPropagation()}>
            <WhatsAppComposer contact={{ name: apt.customerName, phone: apt.customerPhone || apt.client?.phone, _id: apt.customerId }} context={{ serviceName: apt.serviceName, startTime: apt.startTime }} onClose={() => setWaOpen(false)} />
          </PopoverContent>
        </Popover>

        {/* Payment (beauty) */}
        {isBeautyVertical && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
            onClick={(e) => { e.stopPropagation(); onPayment?.(apt); }} title="Cobrar">
            <DollarSign className="h-3 w-3" />
          </Button>
        )}

        {/* Edit */}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0"
          onClick={(e) => { e.stopPropagation(); onEdit?.(apt); }} title="Editar">
          <Edit className="h-3 w-3" />
        </Button>

        {/* Delete */}
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete?.(apt._id); }} title="Cancelar">
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}


// ─── Table Row Component ────────────────────────────────────────────

function AppointmentTableRow({ apt, isBeautyVertical, onSelect, onStatusChange }) {
  const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;

  return (
    <motion.div
      variants={listItem}
      onClick={onSelect}
      className="flex items-center gap-2 px-3 py-2 hover:bg-accent/5 cursor-pointer transition-colors text-xs"
    >
      <span className="font-mono text-muted-foreground w-10 shrink-0">
        {new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
      </span>
      <span className="flex-1 truncate font-medium">{apt.customerName || apt.serviceName || 'Cita'}</span>
      <div className={`h-2 w-2 rounded-full shrink-0 ${sc.color.split(' ')[0]}`} />
      {sc.nextStatus && (
        <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px]"
          onClick={(e) => { e.stopPropagation(); onStatusChange?.(apt._id, sc.nextStatus); }}>
          {sc.actionLabel}
        </Button>
      )}
      {apt.totalPrice > 0 && (
        <span className="text-emerald-400 shrink-0 font-medium">${Number(apt.totalPrice).toFixed(0)}</span>
      )}
    </motion.div>
  );
}
