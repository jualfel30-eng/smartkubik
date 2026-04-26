export const PAYMENT_METHODS = [
  { id: 'efectivo_usd', name: 'Efectivo USD' },
  { id: 'efectivo_ves', name: 'Efectivo VES' },
  { id: 'transferencia_usd', name: 'Transferencia USD' },
  { id: 'transferencia_ves', name: 'Transferencia VES' },
  { id: 'zelle_usd', name: 'Zelle' },
  { id: 'pago_movil_ves', name: 'Pagomóvil' },
  { id: 'pos_ves', name: 'POS' },
  { id: 'tarjeta_ves', name: 'Tarjeta de Crédito' },
];

export const isVesMethod = (methodId) => {
  return methodId && methodId.includes('_ves');
};

export const mapPaymentMethodToName = (methodId) => {
  const mapping = {
    'efectivo_usd': 'Efectivo',
    'efectivo_ves': 'Efectivo',
    'transferencia_usd': 'Transferencia',
    'transferencia_ves': 'Transferencia',
    'zelle_usd': 'Zelle',
    'pago_movil_ves': 'Pagomóvil',
    'pos_ves': 'POS',
    'tarjeta_ves': 'Tarjeta de Crédito',
  };
  return mapping[methodId] || methodId;
};
