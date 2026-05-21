import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, LogOut, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SPRING } from '@/lib/motion';

function formatElapsed(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function HRClockFAB() {
  const { user } = useAuth();
  const [status, setStatus] = useState('unknown'); // unknown | out | in
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [shiftStart, setShiftStart] = useState(null);

  // Fetch current clock status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      if (!user) return;
      try {
        const today = new Date().toISOString().split('T')[0];
        const res = await fetchApi(`/shifts/my-shifts?date=${today}`);
        if (res.success) {
          const active = (res.data || []).find(s => s.status === 'in-progress');
          if (active) {
            setStatus('in');
            setShiftStart(new Date(active.actualStart || active.scheduledStart));
          } else {
            setStatus('out');
          }
        } else {
          setStatus('out');
        }
      } catch {
        setStatus('out');
      }
    };
    fetchStatus();
  }, [user]);

  // Elapsed timer
  useEffect(() => {
    if (status !== 'in' || !shiftStart) return;
    const tick = () => {
      setElapsed(Math.floor((Date.now() - shiftStart.getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [status, shiftStart]);

  const handleClock = useCallback(async () => {
    if (loading || status === 'unknown') return;
    const action = status === 'out' ? 'clock-in' : 'clock-out';
    setLoading(true);
    try {
      const res = await fetchApi(`/shifts/${action}`, { method: 'POST' });
      if (res.success || res._id || res.data) {
        if (action === 'clock-in') {
          const start = new Date();
          setStatus('in');
          setShiftStart(start);
          setElapsed(0);
          toast.success(`Buenos días${user?.name ? `, ${user.name}` : ''} · Entrada registrada ${format(start, 'HH:mm', { locale: es })}`);
        } else {
          const duration = res.data?.durationInHours;
          setStatus('out');
          setShiftStart(null);
          setElapsed(0);
          toast.success(`Turno completado${duration ? ` · ${duration.toFixed(1)}h trabajadas` : ''} · Hasta mañana 👋`);
        }
      }
    } catch {
      toast.error('Error al registrar marca de tiempo');
    } finally {
      setLoading(false);
    }
  }, [loading, status, user]);

  if (status === 'unknown') return null;

  const isIn = status === 'in';

  return (
    <>
      {/* Mobile FAB */}
      <motion.div
        className="fixed bottom-6 right-6 z-50 md:hidden"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={SPRING.bouncy}
      >
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleClock}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-xl font-semibold text-sm text-white transition-colors ${
            isIn
              ? 'bg-amber-500 hover:bg-amber-600'
              : 'bg-green-600 hover:bg-green-700'
          }`}
          style={{ minWidth: 120 }}
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : isIn ? (
            <LogOut size={18} />
          ) : (
            <LogIn size={18} />
          )}
          <AnimatePresence mode="wait">
            <motion.span
              key={isIn ? 'in' : 'out'}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              {isIn ? (elapsed > 0 ? formatElapsed(elapsed) : 'Fichar salida') : 'Fichar entrada'}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Desktop inline button (rendered by HRLayout header slot) */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleClock}
        disabled={loading}
        className={`hidden md:flex items-center gap-2 ${
          isIn ? 'border-amber-400 text-amber-600 hover:bg-amber-50' : 'border-green-500 text-green-700 hover:bg-green-50'
        }`}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : isIn ? (
          <LogOut size={15} />
        ) : (
          <LogIn size={15} />
        )}
        {isIn ? (elapsed > 0 ? `Salida · ${formatElapsed(elapsed)}` : 'Fichar salida') : 'Fichar entrada'}
      </Button>
    </>
  );
}
