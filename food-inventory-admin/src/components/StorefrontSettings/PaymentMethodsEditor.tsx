import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { listItem, STAGGER, scaleIn, SPRING, tapScale } from '@/lib/motion';
import {
  DollarSign, Smartphone, Building2, Banknote, CreditCard,
  Plus, Pencil, Trash2, Check, X, Loader2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface PaymentMethod {
  methodId: string;
  name: string;
  isActive: boolean;
  accountDetails?: {
    bankName?: string;
    accountNumber?: string;
    zelleEmail?: string;
    pagoMovilPhone?: string;
    routingNumber?: string;
    swiftCode?: string;
    accountHolder?: string;
    idNumber?: string;
  };
  instructions?: string;
  igtfApplicable?: boolean;
  currency?: string;
  displayOrder: number;
}

interface PaymentConfig {
  _id?: string;
  paymentMethods: PaymentMethod[];
}

const PAYMENT_METHOD_TYPES = [
  { id: 'zelle', name: 'Zelle', fields: ['zelleEmail'], icon: DollarSign, color: '#6D28D9' },
  { id: 'pago_movil', name: 'Pago Móvil', fields: ['pagoMovilPhone', 'bankName', 'idNumber'], icon: Smartphone, color: '#2563EB' },
  { id: 'transfer', name: 'Transferencia Bancaria', fields: ['bankName', 'accountNumber', 'accountHolder', 'routingNumber'], icon: Building2, color: '#059669' },
  { id: 'cash', name: 'Efectivo', fields: [], icon: Banknote, color: '#D97706' },
  { id: 'card', name: 'Tarjeta de Crédito/Débito', fields: [], icon: CreditCard, color: '#DC2626' },
];

// ─── Helper ──────────────────────────────────────────────────────────────────
function getMethodType(name: string) {
  return PAYMENT_METHOD_TYPES.find((t) =>
    name.toLowerCase().includes(t.name.toLowerCase())
  ) || PAYMENT_METHOD_TYPES[3]; // default to cash
}

function getMethodSummary(method: PaymentMethod): string {
  const d = method.accountDetails;
  if (d?.zelleEmail) return d.zelleEmail;
  if (d?.pagoMovilPhone) return `${d.pagoMovilPhone}${d.bankName ? ` • ${d.bankName}` : ''}`;
  if (d?.accountNumber) return `${d.bankName || 'Banco'} • ****${d.accountNumber.slice(-4)}`;
  return method.currency || 'USD';
}

// ─── Main component ──────────────────────────────────────────────────────────
export function PaymentMethodsEditor() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchPaymentConfig();
  }, []);

  const fetchPaymentConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tenant-payment-config');
      setConfig(response.data || response);
    } catch (error: any) {
      if (error?.response?.status === 404) {
        setConfig({ paymentMethods: [] });
      } else {
        toast.error('Error al cargar métodos de pago');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const savePaymentMethod = async (method: PaymentMethod) => {
    try {
      setSaving(true);
      await api.post('/tenant-payment-config/payment-methods', method);
      toast.success('Método de pago guardado');
      await fetchPaymentConfig();
      setEditingMethod(null);
      setShowAddModal(false);
    } catch (error) {
      toast.error('Error al guardar método de pago');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const deletePaymentMethod = async (methodId: string) => {
    if (!confirm('¿Eliminar este método de pago?')) return;
    try {
      setSaving(true);
      await api.delete(`/tenant-payment-config/payment-methods/${methodId}`);
      toast.success('Método de pago eliminado');
      await fetchPaymentConfig();
    } catch (error) {
      toast.error('Error al eliminar método de pago');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const toggleMethodActive = async (method: PaymentMethod) => {
    await savePaymentMethod({ ...method, isActive: !method.isActive });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const methods = config?.paymentMethods || [];

  return (
    <div className="space-y-4">
      {/* Cards grid */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        variants={STAGGER(0.06)}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence mode="popLayout">
          {methods.map((method) => {
            const type = getMethodType(method.name);
            const Icon = type.icon;

            return (
              <motion.div
                key={method.methodId}
                variants={listItem}
                layout
                exit={{ opacity: 0, scale: 0.95 }}
                className={`
                  relative rounded-xl border p-4 transition-colors
                  ${method.isActive
                    ? 'bg-white/[0.04] border-white/[0.1]'
                    : 'bg-white/[0.02] border-white/[0.05] opacity-60'
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: `${type.color}20` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: type.color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-medium text-gray-100 truncate">{method.name}</h4>
                      {method.isActive && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-[10px] font-medium text-emerald-400">
                          <Check className="w-2.5 h-2.5" /> Activo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {getMethodSummary(method)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-3 pt-3 border-t border-white/[0.06]">
                  <motion.button
                    whileTap={tapScale}
                    onClick={() => toggleMethodActive(method)}
                    className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      method.isActive
                        ? 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    }`}
                  >
                    {method.isActive ? 'Desactivar' : 'Activar'}
                  </motion.button>
                  <motion.button
                    whileTap={tapScale}
                    onClick={() => setEditingMethod(method)}
                    className="px-2 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/[0.06] transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </motion.button>
                  <motion.button
                    whileTap={tapScale}
                    onClick={() => deletePaymentMethod(method.methodId)}
                    className="px-2 py-1.5 rounded-lg text-xs text-red-400/60 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}

          {/* Add card */}
          <motion.button
            key="add"
            variants={listItem}
            layout
            whileTap={tapScale}
            onClick={() => setShowAddModal(true)}
            className="rounded-xl border-2 border-dashed border-white/[0.08] p-4 flex flex-col items-center justify-center gap-2 min-h-[120px] hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors group"
          >
            <Plus className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
            <span className="text-xs text-gray-500 group-hover:text-blue-400 transition-colors">
              Agregar metodo de pago
            </span>
          </motion.button>
        </AnimatePresence>
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingMethod) && (
          <PaymentMethodModal
            method={editingMethod}
            onSave={savePaymentMethod}
            onClose={() => {
              setShowAddModal(false);
              setEditingMethod(null);
            }}
            saving={saving}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface PaymentMethodModalProps {
  method: PaymentMethod | null;
  onSave: (method: PaymentMethod) => void;
  onClose: () => void;
  saving: boolean;
}

function PaymentMethodModal({ method, onSave, onClose, saving }: PaymentMethodModalProps) {
  const [formData, setFormData] = useState<PaymentMethod>(
    method || {
      methodId: `method_${Date.now()}`,
      name: '',
      isActive: true,
      accountDetails: {},
      instructions: '',
      displayOrder: 0,
      currency: 'USD',
    }
  );

  const selectedType = PAYMENT_METHOD_TYPES.find((t) =>
    formData.name.toLowerCase().includes(t.name.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/[0.06] border border-white/[0.08] text-gray-100 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40';
  const labelClass = 'block text-sm font-medium text-gray-200 mb-1.5';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        variants={scaleIn}
        initial="initial"
        animate="animate"
        exit="exit"
        className="bg-[#111827] border border-white/[0.08] rounded-xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-100">
            {method ? 'Editar' : 'Agregar'} Metodo de Pago
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.06] text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type */}
          <div>
            <label className={labelClass}>Tipo de Metodo *</label>
            <select
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={inputClass}
              required
            >
              <option value="">Seleccionar...</option>
              {PAYMENT_METHOD_TYPES.map((type) => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Dynamic fields */}
          {selectedType?.fields.includes('zelleEmail') && (
            <div>
              <label className={labelClass}>Email de Zelle</label>
              <input
                type="email"
                value={formData.accountDetails?.zelleEmail || ''}
                onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, zelleEmail: e.target.value } })}
                className={inputClass}
              />
            </div>
          )}

          {selectedType?.fields.includes('pagoMovilPhone') && (
            <>
              <div>
                <label className={labelClass}>Telefono Pago Movil</label>
                <input
                  type="tel"
                  value={formData.accountDetails?.pagoMovilPhone || ''}
                  onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, pagoMovilPhone: e.target.value } })}
                  className={inputClass}
                  placeholder="0414-1234567"
                />
              </div>
              <div>
                <label className={labelClass}>Cedula/RIF</label>
                <input
                  type="text"
                  value={formData.accountDetails?.idNumber || ''}
                  onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, idNumber: e.target.value } })}
                  className={inputClass}
                  placeholder="V-12345678"
                />
              </div>
            </>
          )}

          {selectedType?.fields.includes('bankName') && (
            <div>
              <label className={labelClass}>Nombre del Banco</label>
              <input
                type="text"
                value={formData.accountDetails?.bankName || ''}
                onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, bankName: e.target.value } })}
                className={inputClass}
              />
            </div>
          )}

          {selectedType?.fields.includes('accountNumber') && (
            <>
              <div>
                <label className={labelClass}>Numero de Cuenta</label>
                <input
                  type="text"
                  value={formData.accountDetails?.accountNumber || ''}
                  onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, accountNumber: e.target.value } })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Titular de la Cuenta</label>
                <input
                  type="text"
                  value={formData.accountDetails?.accountHolder || ''}
                  onChange={(e) => setFormData({ ...formData, accountDetails: { ...formData.accountDetails, accountHolder: e.target.value } })}
                  className={inputClass}
                />
              </div>
            </>
          )}

          {/* Instructions */}
          <div>
            <label className={labelClass}>Instrucciones para el Cliente</label>
            <textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={3}
              className={`${inputClass} resize-none`}
              placeholder="Ej: Incluye tu numero de orden en la referencia"
            />
          </div>

          {/* Currency & Order */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Moneda</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className={inputClass}
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Orden</label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          {/* IGTF */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.igtfApplicable || false}
              onChange={(e) => setFormData({ ...formData, igtfApplicable: e.target.checked })}
              className="h-4 w-4 rounded border-gray-600 bg-white/[0.06] text-blue-500"
            />
            <span className="text-sm text-gray-300">Aplicar IGTF</span>
          </label>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/[0.06] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Guardar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
