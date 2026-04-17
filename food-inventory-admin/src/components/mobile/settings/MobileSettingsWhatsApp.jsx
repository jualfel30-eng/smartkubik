import { useState, useEffect, useRef } from 'react';
import { Eye } from 'lucide-react';
import { motion } from 'framer-motion';
import { listItem, STAGGER } from '@/lib/motion';
import { toast } from 'sonner';
import { getTenantSettings, updateTenantSettings } from '@/lib/api';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import MobileToggleRow from './MobileToggleRow';
import { useDirtyState } from '@/hooks/use-dirty-state';

const VARIABLES = [
  { key: '{nombre}', label: 'Nombre' },
  { key: '{servicio}', label: 'Servicio' },
  { key: '{fecha}', label: 'Fecha' },
  { key: '{hora}', label: 'Hora' },
];

const SAMPLE_DATA = {
  '{nombre}': 'Maria Garcia',
  '{servicio}': 'Corte + Tinte',
  '{fecha}': '15 de abril',
  '{hora}': '10:30 AM',
};

const INITIAL = {
  enabled: false,
  confirmationTemplate: 'Hola {nombre}, tu cita de {servicio} esta confirmada para el {fecha} a las {hora}. Te esperamos!',
  reminderTemplate: 'Hola {nombre}, te recordamos que manana {fecha} tienes tu cita de {servicio} a las {hora}.',
};

function extractWhatsApp(tenantData) {
  const w = tenantData?.settings?.whatsapp || {};
  return {
    enabled: w.enabled ?? false,
    confirmationTemplate: w.confirmationTemplate || INITIAL.confirmationTemplate,
    reminderTemplate: w.reminderTemplate || INITIAL.reminderTemplate,
  };
}

function replaceVariables(template) {
  let result = template;
  Object.entries(SAMPLE_DATA).forEach(([key, val]) => {
    result = result.replaceAll(key, val);
  });
  return result;
}

function VariableChips({ textareaRef, onInsert }) {
  const handleInsert = (variable) => {
    haptics.tap();
    const el = textareaRef.current;
    if (!el) {
      onInsert(variable);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const newText = text.substring(0, start) + variable + text.substring(end);
    onInsert(newText);
    // Restore cursor
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + variable.length;
      el.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {VARIABLES.map(v => (
        <button
          key={v.key}
          type="button"
          onClick={() => handleInsert(v.key)}
          className="bg-primary/10 text-primary rounded-full px-2.5 py-1 text-xs font-medium no-tap-highlight
                     active:bg-primary/20 transition-colors"
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

export default function MobileSettingsWhatsApp({ onBack }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data, setData, isDirty, resetDirty, initialize } = useDirtyState(INITIAL);
  const [showPreview, setShowPreview] = useState(null); // 'confirmation' | 'reminder' | null
  const confirmRef = useRef(null);
  const reminderRef = useRef(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getTenantSettings();
      const tenantData = res?.data || res;
      initialize(extractWhatsApp(tenantData));
    } catch (err) {
      toast.error('Error al cargar configuracion de WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        settings: {
          whatsapp: {
            enabled: data.enabled,
            confirmationTemplate: data.confirmationTemplate,
            reminderTemplate: data.reminderTemplate,
          },
        },
      };

      const res = await updateTenantSettings(payload);
      if (res?.error) {
        toast.error('Error al guardar', { description: res.error });
        return;
      }

      haptics.success();
      toast.success('Configuracion de WhatsApp guardada');
      resetDirty();
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MobileSettingsLayout title="WhatsApp automatico" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout
      title="WhatsApp automatico"
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
        {/* Enable toggle */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4"
        >
          <MobileToggleRow
            label="WhatsApp automatico"
            description="Enviar mensajes automaticos por WhatsApp"
            checked={data.enabled}
            onChange={(v) => setData(prev => ({ ...prev, enabled: v }))}
          />
        </motion.div>

        {data.enabled && (
          <>
            {/* Confirmation template */}
            <motion.div
              variants={listItem}
              className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mensaje de confirmacion
                </p>
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setShowPreview(showPreview === 'confirmation' ? null : 'confirmation');
                  }}
                  className="flex items-center gap-1 text-xs text-primary font-medium no-tap-highlight"
                >
                  <Eye size={14} />
                  Vista previa
                </button>
              </div>
              <textarea
                ref={confirmRef}
                value={data.confirmationTemplate}
                onChange={(e) => setData(prev => ({ ...prev, confirmationTemplate: e.target.value }))}
                rows={4}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground resize-none
                           border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                           outline-none transition-all placeholder:text-muted-foreground/50"
              />
              <VariableChips
                textareaRef={confirmRef}
                onInsert={(text) => setData(prev => ({ ...prev, confirmationTemplate: text }))}
              />
              {showPreview === 'confirmation' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl bg-[#1a2e1a] p-4"
                >
                  <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                  <div className="bg-[#0d5e0d]/30 rounded-xl px-3 py-2 text-sm text-foreground inline-block max-w-[85%]">
                    {replaceVariables(data.confirmationTemplate)}
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Reminder template */}
            <motion.div
              variants={listItem}
              className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Mensaje de recordatorio
                </p>
                <button
                  type="button"
                  onClick={() => {
                    haptics.tap();
                    setShowPreview(showPreview === 'reminder' ? null : 'reminder');
                  }}
                  className="flex items-center gap-1 text-xs text-primary font-medium no-tap-highlight"
                >
                  <Eye size={14} />
                  Vista previa
                </button>
              </div>
              <textarea
                ref={reminderRef}
                value={data.reminderTemplate}
                onChange={(e) => setData(prev => ({ ...prev, reminderTemplate: e.target.value }))}
                rows={4}
                className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground resize-none
                           border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                           outline-none transition-all placeholder:text-muted-foreground/50"
              />
              <VariableChips
                textareaRef={reminderRef}
                onInsert={(text) => setData(prev => ({ ...prev, reminderTemplate: text }))}
              />
              {showPreview === 'reminder' && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 rounded-xl bg-[#1a2e1a] p-4"
                >
                  <p className="text-xs text-muted-foreground mb-2">Vista previa:</p>
                  <div className="bg-[#0d5e0d]/30 rounded-xl px-3 py-2 text-sm text-foreground inline-block max-w-[85%]">
                    {replaceVariables(data.reminderTemplate)}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </motion.div>
    </MobileSettingsLayout>
  );
}
