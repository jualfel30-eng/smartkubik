import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle, UserPlus, Clock, GripVertical } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button.jsx';
import { useFloorViewData } from '@/hooks/useFloorViewData';
import { SPRING } from '@/lib/motion';

const STATUS_THEME = {
  in_service: { label: 'En servicio', dot: 'bg-emerald-500', border: 'border-emerald-500/40', bg: 'bg-emerald-950/30' },
  free: { label: 'Libre', dot: 'bg-blue-500', border: 'border-blue-500/30', bg: 'bg-blue-950/20' },
  blocked: { label: 'Bloqueado', dot: 'bg-gray-400', border: 'border-gray-500/20', bg: 'bg-gray-900/20' },
  unavailable: { label: 'No disponible', dot: 'bg-red-400', border: 'border-red-500/20', bg: 'bg-red-950/20' },
};

function formatMins(mins) {
  if (mins == null) return '';
  const abs = Math.abs(Math.round(mins));
  if (abs < 60) return `${abs}min`;
  return `${Math.floor(abs / 60)}h${abs % 60 > 0 ? ` ${abs % 60}m` : ''}`;
}

/**
 * FloorPanel — collapsable left panel ("Estaciones") showing real-time professional status.
 * Supports drag-and-drop reorder. Persists order via PUT /professionals/:id { sortOrder }.
 */
export default function FloorPanel({ onWalkIn, onComplete, className = '' }) {
  const { profStatuses, loading, summary, refresh } = useFloorViewData();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sk:floor-panel:collapsed') === 'true'; } catch { return false; }
  });
  const [completing, setCompleting] = useState(null);

  // ─── Drag-and-drop reorder state ────────────────────────────────
  const [localOrder, setLocalOrder] = useState(null); // null = use hook order
  const dragItemRef = useRef(null);
  const dragOverRef = useRef(null);

  // Ordered list: use local override if mid-drag, otherwise hook data
  const orderedProfs = localOrder || profStatuses;

  const handleDragStart = useCallback((e, idx) => {
    dragItemRef.current = idx;
    e.dataTransfer.effectAllowed = 'move';
    // Make drag image semi-transparent
    e.currentTarget.style.opacity = '0.4';
  }, []);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = '1';
    dragItemRef.current = null;
    dragOverRef.current = null;
  }, []);

  const handleDragOver = useCallback((e, idx) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverRef.current === idx) return;
    dragOverRef.current = idx;

    const fromIdx = dragItemRef.current;
    if (fromIdx == null || fromIdx === idx) return;

    // Reorder locally
    setLocalOrder(prev => {
      const list = [...(prev || profStatuses)];
      const [moved] = list.splice(fromIdx, 1);
      list.splice(idx, 0, moved);
      dragItemRef.current = idx; // Update ref to new position
      return list;
    });
  }, [profStatuses]);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    if (!localOrder) return;

    // Persist new order to backend
    try {
      await Promise.all(
        localOrder.map((prof, idx) =>
          fetchApi(`/professionals/${prof._id}`, {
            method: 'PUT',
            body: JSON.stringify({ sortOrder: idx }),
          })
        )
      );
      await refresh();
    } catch (err) {
      console.warn('Failed to persist station order:', err);
    }
    setLocalOrder(null);
  }, [localOrder, refresh]);

  const toggleCollapse = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sk:floor-panel:collapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  const handleComplete = useCallback(async (bookingId) => {
    try {
      setCompleting(bookingId);
      await fetchApi(`/beauty-bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'completed' }),
      });
      toast.success('Servicio completado');
      await refresh();
      onComplete?.();
    } catch (err) {
      toast.error('Error al completar');
    } finally {
      setCompleting(null);
    }
  }, [refresh, onComplete]);

  // ─── Collapsed mode ─────────────────────────────────────────────
  if (collapsed) {
    return (
      <div className={`w-14 shrink-0 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm dark:bg-gray-900/50 dark:border-gray-800 flex flex-col items-center py-2 gap-1 ${className}`}>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 mb-1" onClick={toggleCollapse} title="Expandir estaciones">
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>

        {orderedProfs.map(prof => {
          const theme = STATUS_THEME[prof.status] || STATUS_THEME.free;
          return (
            <button
              key={prof._id}
              onClick={toggleCollapse}
              title={`${prof.name} — ${theme.label}`}
              className="flex flex-col items-center gap-0.5 py-1.5 px-1 rounded-lg hover:bg-accent/10 transition-colors w-full"
            >
              <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                {prof.name?.charAt(0).toUpperCase()}
              </div>
              <span className={`w-2 h-2 rounded-full ${theme.dot} ${prof.status === 'in_service' ? 'animate-pulse' : ''}`} />
            </button>
          );
        })}
      </div>
    );
  }

  // ─── Expanded mode ──────────────────────────────────────────────
  return (
    <div className={`w-[220px] shrink-0 rounded-xl border border-border/40 bg-card/50 backdrop-blur-sm dark:bg-gray-900/50 dark:border-gray-800 flex flex-col overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-border/30 dark:border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Estaciones</p>
          {summary && (
            <p className="text-[10px] text-muted-foreground">
              {summary.inService > 0 && <span className="text-emerald-400">{summary.inService} activo{summary.inService > 1 ? 's' : ''}</span>}
              {summary.inService > 0 && summary.free > 0 && ' · '}
              {summary.free > 0 && <span className="text-blue-400">{summary.free} libre{summary.free > 1 ? 's' : ''}</span>}
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={toggleCollapse} title="Colapsar">
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Professional cards — drag-and-drop reorderable */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {loading && orderedProfs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          orderedProfs.map((prof, idx) => (
            <ProfessionalCard
              key={prof._id}
              prof={prof}
              index={idx}
              completing={completing}
              onComplete={handleComplete}
              onWalkIn={onWalkIn}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>
    </div>
  );
}


// ─── Professional Card (draggable) ──────────────────────────────────

function ProfessionalCard({ prof, index, completing, onComplete, onWalkIn, onDragStart, onDragEnd, onDragOver, onDrop }) {
  const theme = STATUS_THEME[prof.status] || STATUS_THEME.free;
  const isCompleting = completing === prof.booking?._id;

  return (
    <motion.div
      layout
      transition={SPRING.snappy}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={onDrop}
      className={`rounded-lg border p-2.5 ${theme.border} ${theme.bg} transition-colors cursor-grab active:cursor-grabbing`}
    >
      {/* Name + Status + Drag handle */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <GripVertical className="h-3 w-3 text-muted-foreground/30 shrink-0 cursor-grab" />
        <span className={`w-2 h-2 rounded-full shrink-0 ${theme.dot} ${prof.status === 'in_service' ? 'animate-pulse' : ''}`} />
        <span className="text-xs font-medium truncate flex-1">{prof.name}</span>
      </div>

      {/* Status detail */}
      <div className="text-[10px] text-muted-foreground space-y-0.5 pl-[18px]">
        {prof.status === 'in_service' && prof.booking && (
          <>
            <p className="truncate">{prof.booking.client?.name || 'Cliente'}</p>
            <p className="truncate">
              {prof.booking.services?.map(s => s.name || s.serviceName).join(', ') || 'Servicio'}
            </p>
            <p className={prof.isOvertime ? 'text-red-400 font-medium' : 'text-emerald-400'}>
              {prof.isOvertime ? `+${formatMins(Math.abs(prof.remainingMinutes))} extra` : `${formatMins(prof.remainingMinutes)} restante`}
            </p>
          </>
        )}

        {prof.status === 'free' && prof.nextBooking && (
          <p className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            Próx: {prof.nextBooking.startTime || ''} ({formatMins(prof.nextInMinutes)})
          </p>
        )}

        {prof.status === 'free' && !prof.nextBooking && (
          <p className="text-blue-400">Disponible</p>
        )}

        {prof.status === 'blocked' && prof.block && (
          <p className="truncate">{prof.block.reason || 'Bloqueado'} · {formatMins(prof.returnsInMinutes)}</p>
        )}

        {prof.status === 'unavailable' && (
          <p>No disponible hoy</p>
        )}
      </div>

      {/* Actions */}
      {prof.status === 'in_service' && prof.booking && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-6 text-[10px] mt-2 border-emerald-500/30 text-emerald-400 hover:text-emerald-300"
          disabled={isCompleting}
          onClick={(e) => { e.stopPropagation(); onComplete?.(prof.booking._id); }}
        >
          <CheckCircle className="h-2.5 w-2.5 mr-1" />
          {isCompleting ? 'Completando...' : 'Completar'}
        </Button>
      )}

      {prof.status === 'free' && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-6 text-[10px] mt-2 border-blue-500/30 text-blue-400 hover:text-blue-300"
          onClick={(e) => { e.stopPropagation(); onWalkIn?.(prof._id); }}
        >
          <UserPlus className="h-2.5 w-2.5 mr-1" />
          Walk-in
        </Button>
      )}
    </motion.div>
  );
}
