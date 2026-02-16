import {
  PaymentEngine,
  PaymentMethodDefinition,
  PaymentMethodField,
  PaymentGateway,
} from '../../interfaces';

const VE_PAYMENT_METHODS: PaymentMethodDefinition[] = [
  {
    id: 'efectivo_usd',
    name: 'Efectivo (USD)',
    currency: 'USD',
    category: 'cash',
    igtfApplicable: true,
    fields: [],
  },
  {
    id: 'transferencia_usd',
    name: 'Transferencia (USD)',
    currency: 'USD',
    category: 'transfer',
    igtfApplicable: true,
    fields: [
      { key: 'bank', label: 'Banco', type: 'text', required: false, placeholder: 'Ej: Banesco Panamá' },
      { key: 'accountNumber', label: 'Número de Cuenta / IBAN', type: 'text', required: false, placeholder: '...' },
      { key: 'accountName', label: 'Titular', type: 'text', required: false, placeholder: 'Nombre del titular' },
      { key: 'email', label: 'Email Confirmación (Opcional)', type: 'text', required: false, placeholder: 'pagos@empresa.com' },
    ],
  },
  {
    id: 'zelle_usd',
    name: 'Zelle (USD)',
    currency: 'USD',
    category: 'transfer',
    igtfApplicable: true,
    fields: [
      { key: 'email', label: 'Correo Zelle', type: 'text', required: false, placeholder: 'correo@ejemplo.com' },
      { key: 'accountName', label: 'Nombre del Titular', type: 'text', required: false, placeholder: 'Nombre Completo' },
    ],
  },
  {
    id: 'efectivo_ves',
    name: 'Efectivo (VES)',
    currency: 'VES',
    category: 'cash',
    igtfApplicable: false,
    fields: [],
  },
  {
    id: 'transferencia_ves',
    name: 'Transferencia (VES)',
    currency: 'VES',
    category: 'transfer',
    igtfApplicable: false,
    fields: [
      { key: 'bank', label: 'Banco', type: 'text', required: false, placeholder: 'Ej: Mercantil' },
      { key: 'accountNumber', label: 'Número de Cuenta', type: 'text', required: false, placeholder: '0105...' },
      { key: 'accountName', label: 'Titular', type: 'text', required: false, placeholder: 'Nombre del titular' },
      { key: 'cid', label: 'Cédula / RIF', type: 'text', required: false, placeholder: 'V-123456 / J-123456' },
      { key: 'email', label: 'Email Confirmación (Opcional)', type: 'text', required: false, placeholder: 'pagos@empresa.com' },
    ],
  },
  {
    id: 'pago_movil_ves',
    name: 'Pago Móvil (VES)',
    currency: 'VES',
    category: 'mobile',
    igtfApplicable: false,
    fields: [
      { key: 'bank', label: 'Banco', type: 'text', required: false, placeholder: 'Ej: Banesco' },
      { key: 'phoneNumber', label: 'Teléfono', type: 'phone', required: false, placeholder: 'Ej: 0414-1234567' },
      { key: 'cid', label: 'Cédula / RIF', type: 'text', required: false, placeholder: 'Ej: J-12345678' },
    ],
  },
  {
    id: 'pos_ves',
    name: 'Punto de Venta (VES)',
    currency: 'VES',
    category: 'card',
    igtfApplicable: false,
    fields: [],
  },
  {
    id: 'tarjeta_ves',
    name: 'Tarjeta (VES)',
    currency: 'VES',
    category: 'card',
    igtfApplicable: false,
    fields: [],
  },
  {
    id: 'pago_mixto',
    name: 'Pago Mixto',
    currency: 'USD',
    category: 'mixed',
    igtfApplicable: false,
    fields: [],
  },
];

export class VePaymentEngine implements PaymentEngine {
  getAvailableMethods(): PaymentMethodDefinition[] {
    return VE_PAYMENT_METHODS;
  }

  triggersAdditionalTax(methodId: string): boolean {
    const method = VE_PAYMENT_METHODS.find((m) => m.id === methodId);
    return method?.igtfApplicable ?? false;
  }

  getMethodFields(methodId: string): PaymentMethodField[] {
    const method = VE_PAYMENT_METHODS.find((m) => m.id === methodId);
    return method?.fields ?? [];
  }

  supportsGlobalGateways(): boolean {
    return false;
  }

  getGlobalGateways(): PaymentGateway[] {
    return [];
  }
}
