import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { listItem, STAGGER, DUR, EASE } from '@/lib/motion';
import { toast } from 'sonner';
import { fetchApi, getTenantSettings, updateTenantSettings } from '@/lib/api';
import { useCountryPlugin } from '@/country-plugins/CountryPluginContext';
import haptics from '@/lib/haptics';
import MobileSettingsLayout from './MobileSettingsLayout';
import MobileSettingsSkeleton from './MobileSettingsSkeleton';
import MobileToggleRow from './MobileToggleRow';
import { useDirtyState } from '@/hooks/use-dirty-state';

const INITIAL = {
  methods: [],
  depositRequired: false,
  depositPercentage: 30,
  cancellationWindowHours: 24,
};

function extractPaymentData(tenantData, baseMethods) {
  const saved = tenantData?.settings?.paymentMethods || [];
  const policies = tenantData?.settings?.hospitalityPolicies || {};

  const methods = baseMethods.map(base => {
    const existing = saved.find(m => m.id === base.id);
    const defaultDetails = { bank: '', accountNumber: '', accountName: '', cid: '', phoneNumber: '', email: '' };
    if (existing) {
      return {
        ...base,
        ...existing,
        details: { ...defaultDetails, ...(existing.details || {}) },
      };
    }
    return { ...base, enabled: false, instructions: '', details: defaultDetails };
  });

  return {
    methods,
    depositRequired: policies.depositRequired ?? false,
    depositPercentage: policies.depositPercentage ?? 30,
    cancellationWindowHours: policies.cancellationWindowHours ?? 24,
  };
}

export default function MobileSettingsPayments({ onBack }) {
  const plugin = useCountryPlugin();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { data, setData, isDirty, resetDirty, initialize } = useDirtyState(INITIAL);
  const [expanded, setExpanded] = useState(null);

  const baseMethods = useMemo(() => {
    return plugin.paymentEngine.getAvailableMethods().map(m => ({
      id: m.id,
      name: m.name,
      igtfApplicable: m.igtfApplicable,
    }));
  }, [plugin]);

  useEffect(() => {
    loadSettings();
  }, [baseMethods]);

  const loadSettings = async () => {
    try {
      const res = await getTenantSettings();
      const tenantData = res?.data || res;
      initialize(extractPaymentData(tenantData, baseMethods));
    } catch (err) {
      toast.error('Error al cargar metodos de pago');
    } finally {
      setLoading(false);
    }
  };

  const toggleMethod = (id) => {
    setData(prev => ({
      ...prev,
      methods: prev.methods.map(m =>
        m.id === id ? { ...m, enabled: !m.enabled } : m
      ),
    }));
  };

  const updateMethodInstruction = (id, value) => {
    setData(prev => ({
      ...prev,
      methods: prev.methods.map(m =>
        m.id === id ? { ...m, instructions: value } : m
      ),
    }));
  };

  const updateMethodDetail = (id, fieldKey, value) => {
    setData(prev => ({
      ...prev,
      methods: prev.methods.map(m =>
        m.id === id ? { ...m, details: { ...m.details, [fieldKey]: value } } : m
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        settings: {
          paymentMethods: data.methods.map(m => ({
            id: m.id,
            name: m.name,
            enabled: m.enabled,
            igtfApplicable: m.igtfApplicable,
            instructions: m.instructions || '',
            details: m.details,
          })),
          hospitalityPolicies: {
            depositRequired: data.depositRequired,
            depositPercentage: data.depositPercentage,
            cancellationWindowHours: data.cancellationWindowHours,
          },
        },
      };

      const res = await updateTenantSettings(payload);
      if (res?.error) {
        toast.error('Error al guardar', { description: res.error });
        return;
      }

      haptics.success();
      toast.success('Metodos de pago guardados');
      resetDirty();
    } catch (err) {
      toast.error('Error al guardar metodos de pago');
    } finally {
      setSaving(false);
    }
  };

  const getMethodFields = (methodId) => {
    const fields = plugin.paymentEngine.getMethodFields(methodId);
    return fields.length > 0 ? fields : null;
  };

  if (loading) {
    return (
      <MobileSettingsLayout title="Metodos de pago" onBack={onBack}>
        <MobileSettingsSkeleton />
      </MobileSettingsLayout>
    );
  }

  return (
    <MobileSettingsLayout
      title="Metodos de pago"
      onBack={onBack}
      isDirty={isDirty}
      isSaving={saving}
      onSave={handleSave}
    >
      <motion.div
        variants={STAGGER(0.05, 0.03)}
        initial="initial"
        animate="animate"
        className="space-y-5"
      >
        {/* Payment methods */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border overflow-hidden"
        >
          <div className="px-4 pt-4 pb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Metodos de pago
            </p>
          </div>
          <div className="divide-y divide-border">
            {data.methods.map((method) => {
              const isExpanded = expanded === method.id && method.enabled;
              const fields = getMethodFields(method.id);
              return (
                <div key={method.id} className="px-4">
                  <div className="flex items-center">
                    <MobileToggleRow
                      label={method.name}
                      checked={method.enabled}
                      onChange={() => toggleMethod(method.id)}
                    />
                    {method.enabled && fields && (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tap();
                          setExpanded(isExpanded ? null : method.id);
                        }}
                        className="text-xs text-primary font-medium no-tap-highlight shrink-0 ml-2"
                      >
                        {isExpanded ? 'Cerrar' : 'Detalles'}
                      </button>
                    )}
                  </div>
                  <AnimatePresence>
                    {isExpanded && fields && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: DUR.base, ease: EASE.out }}
                        className="overflow-hidden"
                      >
                        <div className="pb-4 space-y-3">
                          {fields.map(f => (
                            <div key={f.key}>
                              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                                {f.label}
                              </label>
                              <input
                                type={f.type || 'text'}
                                value={method.details?.[f.key] || ''}
                                onChange={(e) => updateMethodDetail(method.id, f.key, e.target.value)}
                                placeholder={f.placeholder || ''}
                                className="w-full min-h-[44px] bg-muted rounded-xl px-4 py-3 text-sm text-foreground
                                           border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                                           outline-none transition-all placeholder:text-muted-foreground/50"
                              />
                            </div>
                          ))}
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">
                              Instrucciones para el cliente
                            </label>
                            <textarea
                              value={method.instructions || ''}
                              onChange={(e) => updateMethodInstruction(method.id, e.target.value)}
                              rows={2}
                              placeholder="Ej: Transferir a cuenta..."
                              className="w-full bg-muted rounded-xl px-4 py-3 text-sm text-foreground resize-none
                                         border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                                         outline-none transition-all placeholder:text-muted-foreground/50"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Deposits / Policies */}
        <motion.div
          variants={listItem}
          className="bg-card rounded-[var(--mobile-radius-lg)] border border-border p-4 space-y-4"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Depositos y politicas
          </p>
          <MobileToggleRow
            label="Requiere deposito"
            description="Solicitar deposito anticipado al agendar"
            checked={data.depositRequired}
            onChange={(v) => setData(prev => ({ ...prev, depositRequired: v }))}
          />
          {data.depositRequired && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="overflow-hidden"
            >
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Porcentaje de deposito
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={data.depositPercentage}
                    onChange={(e) => setData(prev => ({ ...prev, depositPercentage: Number(e.target.value) }))}
                    className="w-24 min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground text-center
                               border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                               outline-none transition-all"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </motion.div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Ventana de cancelacion (horas)
            </label>
            <input
              type="number"
              min={0}
              value={data.cancellationWindowHours}
              onChange={(e) => setData(prev => ({ ...prev, cancellationWindowHours: Number(e.target.value) }))}
              className="w-24 min-h-[44px] bg-muted rounded-xl px-4 py-3 text-base text-foreground text-center
                         border border-transparent focus:border-primary/30 focus:ring-2 focus:ring-primary/20
                         outline-none transition-all"
            />
          </div>
        </motion.div>
      </motion.div>
    </MobileSettingsLayout>
  );
}
