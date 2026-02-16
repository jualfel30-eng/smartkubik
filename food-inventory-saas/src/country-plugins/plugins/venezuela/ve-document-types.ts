import {
  DocumentTypes,
  DocumentTypeDefinition,
  BillingChannel,
  NumberingScope,
  NumberingRule,
} from '../../interfaces';

export class VeDocumentTypes implements DocumentTypes {
  getTypes(): DocumentTypeDefinition[] {
    return [
      {
        code: 'invoice',
        name: 'Factura',
        hasTaxes: true,
        requiresControlNumber: true,
        requiresFiscalId: true,
      },
      {
        code: 'credit_note',
        name: 'Nota de Crédito',
        hasTaxes: true,
        requiresControlNumber: true,
        requiresFiscalId: true,
      },
      {
        code: 'debit_note',
        name: 'Nota de Débito',
        hasTaxes: true,
        requiresControlNumber: true,
        requiresFiscalId: true,
      },
      {
        code: 'delivery_note',
        name: 'Nota de Entrega',
        hasTaxes: false,
        requiresControlNumber: false,
        requiresFiscalId: false,
      },
      {
        code: 'quote',
        name: 'Presupuesto',
        hasTaxes: false,
        requiresControlNumber: false,
        requiresFiscalId: false,
      },
    ];
  }

  getChannels(): BillingChannel[] {
    return [
      { code: 'digital', name: 'Imprenta Digital' },
      { code: 'machine_fiscal', name: 'Máquina Fiscal' },
      { code: 'contingency', name: 'Contingencia' },
    ];
  }

  getNumberingScopes(): NumberingScope[] {
    return [
      { code: 'tenant', name: 'Global (Empresa)' },
      { code: 'sucursal', name: 'Por Sucursal' },
      { code: 'caja', name: 'Por Caja' },
    ];
  }

  getNumberingRules(documentType: string): NumberingRule {
    const rules: Record<string, NumberingRule> = {
      invoice: { format: '{prefix}{number}', padLength: 8, prefixSeparator: '-' },
      credit_note: { format: '{prefix}{number}', padLength: 8, prefixSeparator: '-' },
      debit_note: { format: '{prefix}{number}', padLength: 8, prefixSeparator: '-' },
      delivery_note: { format: '{prefix}{number}', padLength: 8, prefixSeparator: '-' },
      quote: { format: '{prefix}{number}', padLength: 6, prefixSeparator: '-' },
    };
    return rules[documentType] || rules.invoice;
  }
}
