import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

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
  { id: 'zelle', name: 'Zelle', fields: ['zelleEmail'] },
  { id: 'pago_movil', name: 'Pago Móvil', fields: ['pagoMovilPhone', 'bankName', 'idNumber'] },
  { id: 'transfer', name: 'Transferencia Bancaria', fields: ['bankName', 'accountNumber', 'accountHolder', 'routingNumber'] },
  { id: 'cash', name: 'Efectivo', fields: [] },
  { id: 'card', name: 'Tarjeta de Crédito/Débito', fields: [] },
];

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
        // No config exists yet, create empty one
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
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Métodos de Pago
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configura los métodos de pago disponibles para tus clientes en el storefront
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          + Agregar Método
        </button>
      </div>

      {/* Payment Methods List */}
      <div className="space-y-3">
        {config?.paymentMethods?.length === 0 && (
          <div className="text-center p-8 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
            <p className="text-gray-500 dark:text-gray-400">
              No hay métodos de pago configurados. Agrega uno para comenzar.
            </p>
          </div>
        )}

        {config?.paymentMethods?.map((method) => (
          <div
            key={method.methodId}
            className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={method.isActive}
                  onChange={() => toggleMethodActive(method)}
                  className="h-5 w-5 text-blue-600 rounded"
                />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-gray-100">
                    {method.name}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {method.currency || 'USD'} • Orden: {method.displayOrder}
                  </p>
                  {method.accountDetails && (
                    <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      {method.accountDetails.zelleEmail && (
                        <div>📧 Zelle: {method.accountDetails.zelleEmail}</div>
                      )}
                      {method.accountDetails.pagoMovilPhone && (
                        <div>📱 Pago Móvil: {method.accountDetails.pagoMovilPhone} - {method.accountDetails.bankName}</div>
                      )}
                      {method.accountDetails.accountNumber && (
                        <div>🏦 Cuenta: {method.accountDetails.bankName} - {method.accountDetails.accountNumber}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingMethod(method)}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Editar
                </button>
                <button
                  onClick={() => deletePaymentMethod(method.methodId)}
                  className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-900/50"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Modal */}
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
    </div>
  );
}

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

  const selectedType = PAYMENT_METHOD_TYPES.find(t =>
    formData.name.toLowerCase().includes(t.name.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {method ? 'Editar' : 'Agregar'} Método de Pago
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo de Método */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Tipo de Método *
            </label>
            <select
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              required
            >
              <option value="">Seleccionar...</option>
              {PAYMENT_METHOD_TYPES.map(type => (
                <option key={type.id} value={type.name}>{type.name}</option>
              ))}
            </select>
          </div>

          {/* Campos según tipo */}
          {selectedType?.fields.includes('zelleEmail') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Email de Zelle
              </label>
              <input
                type="email"
                value={formData.accountDetails?.zelleEmail || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  accountDetails: { ...formData.accountDetails, zelleEmail: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          )}

          {selectedType?.fields.includes('pagoMovilPhone') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Teléfono Pago Móvil
                </label>
                <input
                  type="tel"
                  value={formData.accountDetails?.pagoMovilPhone || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountDetails: { ...formData.accountDetails, pagoMovilPhone: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
                  placeholder="0414-1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Cédula/RIF
                </label>
                <input
                  type="text"
                  value={formData.accountDetails?.idNumber || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountDetails: { ...formData.accountDetails, idNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
                  placeholder="V-12345678"
                />
              </div>
            </>
          )}

          {selectedType?.fields.includes('bankName') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Nombre del Banco
              </label>
              <input
                type="text"
                value={formData.accountDetails?.bankName || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  accountDetails: { ...formData.accountDetails, bankName: e.target.value }
                })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          )}

          {selectedType?.fields.includes('accountNumber') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Número de Cuenta
                </label>
                <input
                  type="text"
                  value={formData.accountDetails?.accountNumber || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountDetails: { ...formData.accountDetails, accountNumber: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                  Titular de la Cuenta
                </label>
                <input
                  type="text"
                  value={formData.accountDetails?.accountHolder || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    accountDetails: { ...formData.accountDetails, accountHolder: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </>
          )}

          {/* Instrucciones */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Instrucciones para el Cliente
            </label>
            <textarea
              value={formData.instructions || ''}
              onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              placeholder="Ej: Por favor incluye tu número de orden en la referencia del pago"
            />
          </div>

          {/* Moneda y Orden */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Moneda
              </label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="USD">USD</option>
                <option value="VES">VES</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Orden de Visualización
              </label>
              <input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
          </div>

          {/* IGTF */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.igtfApplicable || false}
              onChange={(e) => setFormData({ ...formData, igtfApplicable: e.target.checked })}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-200">
              Aplicar IGTF (Impuesto a las Grandes Transacciones Financieras)
            </span>
          </label>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
