const USD_METHODS = [
  'efectivo_usd',
  'transferencia_usd',
  'zelle_usd',
];

export const veTaxConfig = {
  getDefaultTaxes() {
    return [
      {
        type: 'IVA',
        rate: 16,
        name: 'Impuesto al Valor Agregado',
        appliesTo: ['products', 'services'],
        isTransactional: false,
      },
    ];
  },

  getTransactionTaxes(context) {
    if (USD_METHODS.includes(context.paymentMethodId) || context.currency === 'USD') {
      return [
        {
          type: 'IGTF',
          rate: 3,
          name: 'Impuesto a las Grandes Transacciones Financieras',
          appliesTo: ['foreign_currency'],
          isTransactional: true,
        },
      ];
    }
    return [];
  },

  getExemptDocumentTypes() {
    return ['delivery_note'];
  },

  getWithholdingRules() {
    return [
      { type: 'IVA_WITHHOLDING', rate: 75, conditions: { taxpayerType: 'ordinary' } },
      { type: 'IVA_WITHHOLDING', rate: 100, conditions: { taxpayerType: 'special' } },
      { type: 'ISLR_WITHHOLDING', rate: 5, conditions: {} },
    ];
  },
};
