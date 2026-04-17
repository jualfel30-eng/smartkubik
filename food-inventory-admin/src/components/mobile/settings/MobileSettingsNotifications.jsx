import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings } from '@/lib/api';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import MobileToggleRow from './MobileToggleRow';
import { useDirtyState } from '@/hooks/use-dirty-state';

const INITIAL = {
  pushEnabled: false,
  emailReminders: false,
  smsReminders: false,
  reminderHoursBefore: 24,
  noShowAlerts: false,
};

const HOUR_OPTIONS = [1, 2, 4, 12, 24, 48];

function extractNotifications(tenantData) {
  const n = tenantData?.settings?.notifications || {};
  return {
    pushEnabled: n.pushEnabled ?? false,
    emailReminders: n.emailReminders ?? false,
    smsReminders: n.smsReminders ?? false,
    reminderHoursBefore: n.reminderHoursBefore ?? 24,
    noShowAlerts: n.noShowAlerts ?? false,
  };
}

function HourChips({ value, onChange }) {
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {HOUR_OPTIONS.map(h => {
        const isSelected = value === h;
        return (
          <button
            key={h}
            type="button"
            onClick={() => { haptics.tap(); onChange(h); }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium no-tap-highlight transition-colors ${
              isSelected
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {h}h
          </button>
        );
      })}
    </div>
  );
}

export default function MobileSettingsNotifications({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data, setData, isDirty, resetDirty, initialize } = useDirtyState(INITIAL);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getTenantSettings();
      const tenantData = res?.data || res;
      initialize(extractNotifications(tenantData));
    } catch (err) {
      toast.error('Error al cargar notificaciones');
    } finally {
      setLoading(false);
    }
  };

  const update = (field, value) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        settings: {
          notifications: {
            pushEnabled: data.pushEnabled,
            emailReminders: data.emailReminders,
            smsReminders: data.smsReminders,
            reminderHoursBefore: data.reminderHoursBefore,
            noShowAlerts: data.noShowAlerts,
          },
        },
      };

      const res = await updateTenantSettings(payload);
      if (res?.error) {
        toast.error('Error al guardar', { description: res.error });
        return;
      }

      haptics.success();
      toast.success('Notificaciones guardadas');
      resetDirty();
    } catch (err) {
      toast.error('Error al guardar notificaciones');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileSettingsLayout title="Push y recordatorios" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout
      title="Push y recordatorios"
      onBack={onBack}
      isDirty={isDirty}
      isSaving={saving}
      onSave={handleSave}
    >
      <motion.div
        variants={STAGGER(0.06, 0.04)}
        initial="initial"
        animate="animate"
        className="space-y-5"
      >
        {/* Push */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Notificaciones push
          </p>
          <MobileToggleRow
            label="Activar notificaciones push"
            description="Envia notificaciones al dispositivo del cliente"
            checked={data.pushEnabled}
            onChange={(v) => update('pushEnabled', v)}
          />
        </motion.div>

        {/* Email reminders */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recordatorios por email
          </p>
          <MobileToggleRow
            label="Recordatorios por email"
            description="Envia un recordatorio antes de la cita"
            checked={data.emailReminders}
            onChange={(v) => update('emailReminders', v)}
          />
          {data.emailReminders && (
            <div className="mt-1">
              <span className="text-xs text-muted-foreground">Enviar con anticipacion:</span>
              <HourChips
                value={data.reminderHoursBefore}
                onChange={(h) => update('reminderHoursBefore', h)}
              />
            </div>
          )}
        </motion.div>

        {/* SMS reminders */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Recordatorios por SMS
          </p>
          <MobileToggleRow
            label="Recordatorios por SMS"
            description="Envia un SMS antes de la cita"
            checked={data.smsReminders}
            onChange={(v) => update('smsReminders', v)}
          />
        </motion.div>

        {/* No-show alerts */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Alertas
          </p>
          <MobileToggleRow
            label="Alertas de no-show"
            description="Notificar cuando un cliente no se presenta"
            checked={data.noShowAlerts}
            onChange={(v) => update('noShowAlerts', v)}
          />
        </motion.div>
      </motion.div>
    </MobileSettingsLayout>
  );
}
