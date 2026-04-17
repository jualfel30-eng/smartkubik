import { useState, useEffect, useMemo } from 'react';
import { Copy } from 'lucide-react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings } from '@/lib/api';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import MobileToggleRow from './MobileToggleRow';
import { useDirtyState } from '@/hooks/use-dirty-state';

const DAY_NAMES = ['Lunes', 'Martes', 'Miercoles', 'Jueves', 'Viernes', 'Sabado', 'Domingo'];
const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_DAYS = DAY_KEYS.map((key, i) => ({
  key,
  name: DAY_NAMES[i],
  isOpen: i < 6, // Mon-Sat open, Sun closed
  open: '09:00',
  close: '19:00',
}));

function extractSchedule(tenantData) {
  const bh = tenantData?.settings?.businessHours;
  if (!bh?.days?.length) {
    // Try legacy schedule object
    const schedule = tenantData?.settings?.schedule || bh;
    if (schedule && typeof schedule === 'object') {
      return DAY_KEYS.map((key, i) => {
        const day = schedule[key];
        return {
          key,
          name: DAY_NAMES[i],
          isOpen: day?.available ?? day?.isOpen ?? (i < 6),
          open: day?.start || day?.open || '09:00',
          close: day?.end || day?.close || '19:00',
        };
      });
    }
    return DEFAULT_DAYS;
  }
  return bh.days.map((d, i) => ({
    key: DAY_KEYS[i] || d.key,
    name: DAY_NAMES[i] || d.dayName,
    isOpen: d.isOpen ?? d.available ?? true,
    open: d.open || d.start || '09:00',
    close: d.close || d.end || '19:00',
  }));
}

function TimeBar({ open, close }) {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + (m || 0);
  };
  const startPct = (toMinutes(open) / 1440) * 100;
  const widthPct = Math.max(0, ((toMinutes(close) - toMinutes(open)) / 1440) * 100);

  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
      <motion.div
        className="h-full rounded-full bg-primary/70"
        initial={{ width: 0, marginLeft: `${startPct}%` }}
        animate={{ width: `${widthPct}%`, marginLeft: `${startPct}%` }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export default function MobileSettingsHours({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data: days, setData: setDays, isDirty, resetDirty, initialize } = useDirtyState(DEFAULT_DAYS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getTenantSettings();
      const tenantData = res?.data || res;
      initialize(extractSchedule(tenantData));
    } catch (err) {
      toast.error('Error al cargar horarios');
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (idx, field, value) => {
    setDays(prev => prev.map((d, i) => i === idx ? { ...d, [field]: value } : d));
  };

  const copyToAll = () => {
    const source = days.find(d => d.isOpen);
    if (!source) {
      toast.error('No hay ningun dia abierto para copiar');
      return;
    }
    haptics.impact();
    setDays(prev => prev.map(d => ({
      ...d,
      open: source.open,
      close: source.close,
    })));
    toast.success('Horarios copiados a todos los dias');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build schedule object for backend compatibility
      const schedule = {};
      days.forEach(d => {
        schedule[d.key] = {
          available: d.isOpen,
          start: d.open,
          end: d.close,
        };
      });

      // Also compute derived start/end for the businessHours simple format
      const openDays = days.filter(d => d.isOpen);
      const earliestStart = openDays.length ? openDays.reduce((min, d) => d.open < min ? d.open : min, '23:59') : '09:00';
      const latestEnd = openDays.length ? openDays.reduce((max, d) => d.close > max ? d.close : max, '00:00') : '19:00';

      const payload = {
        settings: {
          businessHours: {
            start: earliestStart,
            end: latestEnd,
            days: days.map(d => ({
              key: d.key,
              dayName: d.name,
              isOpen: d.isOpen,
              open: d.open,
              close: d.close,
            })),
          },
          schedule,
        },
      };

      const res = await updateTenantSettings(payload);
      if (res?.error) {
        toast.error('Error al guardar', { description: res.error });
        return;
      }

      haptics.success();
      toast.success('Horarios guardados');
      resetDirty();
    } catch (err) {
      toast.error('Error al guardar horarios');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileSettingsLayout title="Horarios de atencion" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout
      title="Horarios de atencion"
      onBack={onBack}
      isDirty={isDirty}
      isSaving={saving}
      onSave={handleSave}
      headerRight={
        <button
          type="button"
          onClick={copyToAll}
          className="flex items-center gap-1.5 text-xs font-medium text-primary no-tap-highlight px-2 py-1 rounded-lg active:bg-muted transition-colors"
        >
          <Copy size={14} />
          Copiar a todos
        </button>
      }
    >
      <motion.div
        variants={STAGGER(0.04, 0.02)}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {days.map((day, idx) => (
          <motion.div
            key={day.key}
            variants={listItem}
            className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
          >
            <MobileToggleRow
              label={day.name}
              checked={day.isOpen}
              onChange={(v) => updateDay(idx, 'isOpen', v)}
            />

            {day.isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Apertura
                    </label>
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => updateDay(idx, 'open', e.target.value)}
                      className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                                 border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                                 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                      Cierre
                    </label>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => updateDay(idx, 'close', e.target.value)}
                      className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground
                                 border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                                 outline-none transition-all"
                    />
                  </div>
                </div>
                <TimeBar open={day.open} close={day.close} />
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>
    </MobileSettingsLayout>
  );
}
