import { describe, it, expect } from 'vitest';
import { generateComprobanteHTML } from './payable-comprobante';

// ─── Factories ──────────────────────────────────────────────────────────────

const makeLine = (overrides = {}) => ({
  description: 'Servicio de limpieza',
  amount: 500,
  ...overrides,
});

const makePayment = (overrides = {}) => ({
  date: '2026-05-15T00:00:00.000Z',
  method: 'zelle',
  reference: 'ZEL-001234',
  amount: 500,
  ...overrides,
});

const makePayable = (overrides = {}) => ({
  payableNumber: 'PAY-1716000000000',
  payeeName: 'Proveedor XYZ',
  type: 'service_payment',
  status: 'paid',
  issueDate: '2026-05-01T00:00:00.000Z',
  dueDate: '2026-05-31T00:00:00.000Z',
  paidAmount: 500,
  lines: [makeLine()],
  notes: null,
  ...overrides,
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('generateComprobanteHTML', () => {
  describe('estructura HTML básica', () => {
    it('retorna un string que comienza con DOCTYPE html', () => {
      const html = generateComprobanteHTML(makePayable());
      expect(html.trimStart()).toMatch(/^<!DOCTYPE html>/i);
    });

    it('contiene etiquetas html, head y body', () => {
      const html = generateComprobanteHTML(makePayable());
      expect(html).toContain('<html');
      expect(html).toContain('<head>');
      expect(html).toContain('<body>');
      expect(html).toContain('</html>');
    });

    it('incluye charset UTF-8', () => {
      const html = generateComprobanteHTML(makePayable());
      expect(html).toContain('charset="UTF-8"');
    });

    it('incluye el branding SmartKubik', () => {
      const html = generateComprobanteHTML(makePayable());
      expect(html).toContain('SmartKubik');
    });
  });

  describe('datos del payable', () => {
    it('muestra el número de factura en el título y en el documento', () => {
      const html = generateComprobanteHTML(makePayable({ payableNumber: 'PAY-9999' }));
      expect(html).toContain('PAY-9999');
    });

    it('usa N/A cuando no hay número de factura', () => {
      const html = generateComprobanteHTML(makePayable({ payableNumber: undefined }));
      expect(html).toContain('N/A');
    });

    it('muestra el nombre del proveedor', () => {
      const html = generateComprobanteHTML(makePayable({ payeeName: 'Empresa TEST SA' }));
      expect(html).toContain('Empresa TEST SA');
    });

    it('usa — cuando no hay nombre de proveedor', () => {
      const html = generateComprobanteHTML(makePayable({ payeeName: undefined }));
      expect(html.match(/—/g)?.length).toBeGreaterThanOrEqual(1);
    });

    it('traduce el tipo de gasto al español', () => {
      const html = generateComprobanteHTML(makePayable({ type: 'service_payment' }));
      expect(html).toContain('Pago de Servicio');
    });

    it('muestra el tipo raw cuando no tiene traducción', () => {
      const html = generateComprobanteHTML(makePayable({ type: 'custom_type_x' }));
      expect(html).toContain('custom_type_x');
    });

    it('incluye la fecha de emisión', () => {
      const html = generateComprobanteHTML(makePayable({ issueDate: '2026-05-01T00:00:00.000Z' }));
      expect(html).toContain('Emitida:');
    });

    it('incluye la fecha de vencimiento cuando existe', () => {
      const html = generateComprobanteHTML(makePayable({ dueDate: '2026-05-31T00:00:00.000Z' }));
      expect(html).toContain('Vence:');
    });

    it('omite la fecha de vencimiento cuando es null', () => {
      const html = generateComprobanteHTML(makePayable({ dueDate: null }));
      expect(html).not.toContain('Vence:');
    });
  });

  describe('sello de estado', () => {
    it('muestra sello PAGADO cuando status es paid', () => {
      const html = generateComprobanteHTML(makePayable({ status: 'paid' }));
      expect(html).toContain('PAGADO');
    });

    it('muestra sello PARCIAL cuando status es partially_paid', () => {
      const html = generateComprobanteHTML(makePayable({ status: 'partially_paid' }));
      expect(html).toContain('PARCIAL');
    });

    it('muestra sello PARCIAL cuando status es open', () => {
      const html = generateComprobanteHTML(makePayable({ status: 'open', paidAmount: 0 }));
      expect(html).toContain('PARCIAL');
    });

    it('usa color verde (#059669) para sello PAGADO', () => {
      const html = generateComprobanteHTML(makePayable({ status: 'paid' }));
      expect(html).toContain('#059669');
    });

    it('usa color ámbar (#d97706) para sello PARCIAL', () => {
      const html = generateComprobanteHTML(makePayable({ status: 'partially_paid' }));
      expect(html).toContain('#d97706');
    });
  });

  describe('líneas del gasto', () => {
    it('muestra la descripción de cada línea', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [
          makeLine({ description: 'Mano de obra' }),
          makeLine({ description: 'Materiales' }),
        ],
      }));
      expect(html).toContain('Mano de obra');
      expect(html).toContain('Materiales');
    });

    it('usa "Sin descripción" cuando falta la descripción de una línea', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ description: undefined })],
      }));
      expect(html).toContain('Sin descripción');
    });

    it('calcula el total sumando todas las líneas', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ amount: 300 }), makeLine({ amount: 200 })],
        paidAmount: 500,
      }));
      // $500.00 formatted as currency
      expect(html).toContain('$500.00');
    });

    it('muestra el total en el tfoot de la tabla de líneas', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ amount: 1500 })],
        paidAmount: 1500,
      }));
      expect(html).toContain('$1,500.00');
    });

    it('maneja array de líneas vacío sin error', () => {
      expect(() => generateComprobanteHTML(makePayable({ lines: [] }))).not.toThrow();
    });
  });

  describe('totales y saldo', () => {
    it('muestra "PAGADO COMPLETAMENTE" cuando balance es cero', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ amount: 500 })],
        paidAmount: 500,
        status: 'paid',
      }));
      expect(html).toContain('PAGADO COMPLETAMENTE');
    });

    it('muestra saldo pendiente cuando el pago es parcial', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ amount: 1000 })],
        paidAmount: 400,
        status: 'partially_paid',
      }));
      expect(html).toContain('Saldo pendiente');
      expect(html).toContain('$600.00');
    });

    it('muestra el monto pagado con color verde en la sección de totales', () => {
      const html = generateComprobanteHTML(makePayable({
        lines: [makeLine({ amount: 500 })],
        paidAmount: 500,
      }));
      // "paid" class or green color should be present for paid amount
      expect(html).toContain('row paid');
    });
  });

  describe('pagos realizados', () => {
    it('muestra los pagos individuales cuando se pasan', () => {
      const payments = [
        makePayment({ method: 'zelle', reference: 'ZEL-001', amount: 250 }),
        makePayment({ method: 'transferencia_usd', reference: 'TRF-002', amount: 250 }),
      ];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html).toContain('ZEL-001');
      expect(html).toContain('TRF-002');
    });

    it('traduce el método de pago al label legible', () => {
      const payments = [makePayment({ method: 'pago_movil' })];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html).toContain('Pago Móvil');
    });

    it('traduce Zelle correctamente', () => {
      const payments = [makePayment({ method: 'zelle' })];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html).toContain('Zelle');
    });

    it('usa el método raw cuando no tiene traducción', () => {
      const payments = [makePayment({ method: 'crypto_usdt' })];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html).toContain('crypto_usdt');
    });

    it('muestra — en referencia cuando está vacía', () => {
      const payments = [makePayment({ reference: undefined })];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html.match(/—/g)?.length).toBeGreaterThanOrEqual(1);
    });

    it('muestra "Sin registros de pago individuales" cuando no hay pagos', () => {
      const html = generateComprobanteHTML(makePayable(), []);
      expect(html).toContain('Sin registros de pago individuales');
    });

    it('muestra "Sin registros de pago individuales" cuando payments se omite', () => {
      const html = generateComprobanteHTML(makePayable());
      expect(html).toContain('Sin registros de pago individuales');
    });

    it('formatea el monto de cada pago correctamente', () => {
      const payments = [makePayment({ amount: 1250.5 })];
      const html = generateComprobanteHTML(makePayable(), payments);
      expect(html).toContain('$1,250.50');
    });
  });

  describe('notas', () => {
    it('incluye la sección de notas cuando hay notas', () => {
      const html = generateComprobanteHTML(makePayable({ notes: 'Pago contra factura física' }));
      expect(html).toContain('Pago contra factura física');
    });

    it('omite la sección de notas cuando notes es null', () => {
      const html = generateComprobanteHTML(makePayable({ notes: null }));
      // Should not have a "Notas" heading when null
      const notasCount = (html.match(/<h2>Notas<\/h2>/g) || []).length;
      expect(notasCount).toBe(0);
    });

    it('omite la sección de notas cuando notes es string vacío', () => {
      const html = generateComprobanteHTML(makePayable({ notes: '' }));
      const notasCount = (html.match(/<h2>Notas<\/h2>/g) || []).length;
      expect(notasCount).toBe(0);
    });
  });

  describe('tipos de gasto – traducciones completas', () => {
    const cases = [
      ['purchase_order', 'Orden de Compra'],
      ['service_payment', 'Pago de Servicio'],
      ['utility_bill', 'Servicio Básico'],
      ['payroll', 'Nómina'],
      ['other', 'Otro'],
    ];

    it.each(cases)('traduce "%s" → "%s"', (type, label) => {
      const html = generateComprobanteHTML(makePayable({ type }));
      expect(html).toContain(label);
    });
  });
});
