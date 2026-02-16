import {
  TaxEngine,
  TaxDefinition,
  TransactionTaxContext,
  WithholdingRule,
  TaxableItem,
  TaxResult,
  TaxableDocument,
  DocumentTaxResult,
} from '../../interfaces';

const USD_METHODS = [
  'efectivo_usd',
  'transferencia_usd',
  'zelle_usd',
];

export class VeTaxEngine implements TaxEngine {
  getDefaultTaxes(): TaxDefinition[] {
    return [
      {
        type: 'IVA',
        rate: 16,
        name: 'Impuesto al Valor Agregado',
        appliesTo: ['products', 'services'],
        isTransactional: false,
      },
    ];
  }

  getTransactionTaxes(context: TransactionTaxContext): TaxDefinition[] {
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
  }

  getWithholdingRules(): WithholdingRule[] {
    return [
      {
        type: 'IVA_WITHHOLDING',
        rate: 75,
        conditions: { taxpayerType: 'ordinary' },
      },
      {
        type: 'IVA_WITHHOLDING',
        rate: 100,
        conditions: { taxpayerType: 'special' },
      },
      {
        type: 'ISLR_WITHHOLDING',
        rate: 5,
        conditions: {},
      },
    ];
  }

  getExemptDocumentTypes(): string[] {
    return ['delivery_note'];
  }

  calculateLineTax(item: TaxableItem, taxes: TaxDefinition[]): TaxResult[] {
    return taxes
      .filter((t) => !t.isTransactional)
      .map((tax) => ({
        taxType: tax.type,
        rate: tax.rate,
        amount: item.subtotal * (tax.rate / 100),
      }));
  }

  calculateDocumentTaxes(document: TaxableDocument): DocumentTaxResult {
    const isExempt = this.getExemptDocumentTypes().includes(document.documentType);
    const subtotal = document.items.reduce((sum, item) => sum + item.subtotal, 0);

    let totalTax = 0;
    const breakdown: TaxResult[] = [];

    if (!isExempt) {
      const defaultTaxes = this.getDefaultTaxes();
      for (const tax of defaultTaxes) {
        const taxAmount = subtotal * (tax.rate / 100);
        totalTax += taxAmount;
        breakdown.push({ taxType: tax.type, rate: tax.rate, amount: taxAmount });
      }
    }

    let totalTransactionTax = 0;
    if (document.payments) {
      for (const payment of document.payments) {
        const txTaxes = this.getTransactionTaxes({
          paymentMethodId: payment.methodId,
          currency: payment.currency,
          amount: payment.amount,
        });
        for (const tax of txTaxes) {
          const txAmount = payment.amount * (tax.rate / 100);
          totalTransactionTax += txAmount;
          breakdown.push({ taxType: tax.type, rate: tax.rate, amount: txAmount });
        }
      }
    }

    return {
      subtotal,
      totalTax,
      totalTransactionTax,
      total: subtotal + totalTax + totalTransactionTax,
      breakdown,
    };
  }
}
