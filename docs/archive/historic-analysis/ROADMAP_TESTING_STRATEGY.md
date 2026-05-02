# ESTRATEGIA DE TESTING - MÓDULO FISCAL
## Testing Exhaustivo para Compliance

**Fecha**: 14 de Noviembre de 2025
**Versión**: 1.0

---

## ÍNDICE

1. [Pirámide de Testing](#pirámide-de-testing)
2. [Tests Unitarios](#tests-unitarios)
3. [Tests de Integración](#tests-de-integración)
4. [Tests End-to-End](#tests-end-to-end)
5. [Tests de Regresión](#tests-de-regresión)
6. [Tests de Performance](#tests-de-performance)
7. [Tests de Compliance](#tests-de-compliance)
8. [CI/CD Integration](#cicd-integration)

---

## PIRÁMIDE DE TESTING

```
              ┌─────────────┐
              │  Manual (5%)│
              │  ───────────│
              │  Compliance │
              └─────────────┘
            ┌───────────────────┐
            │   E2E (10%)       │
            │  ───────────────  │
            │  User Journeys    │
            └───────────────────┘
         ┌────────────────────────────┐
         │   Integration (25%)        │
         │  ───────────────────────── │
         │  Module Interactions       │
         └────────────────────────────┘
   ┌─────────────────────────────────────────┐
   │         Unit (60%)                       │
   │  ─────────────────────────────────────  │
   │  Functions, Services, Calculations      │
   └─────────────────────────────────────────┘
```

**Target Coverage**:
- Unitarios: 80%+
- Integración: 70%+
- E2E: Critical paths 100%
- Overall: 75%+

---

## TESTS UNITARIOS

### 1. TaxCalculationService Tests

**Archivo**: `src/modules/tax/tax-calculation.service.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { TaxCalculationService } from './tax-calculation.service';
import { getModelToken } from '@nestjs/mongoose';
import Decimal from 'decimal.js';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        TaxCalculationService,
        {
          provide: getModelToken('Product'),
          useValue: mockProductModel,
        },
        {
          provide: getModelToken('Customer'),
          useValue: mockCustomerModel,
        },
        {
          provide: 'TaxConfigurationService',
          useValue: mockTaxConfigService,
        },
      ],
    }).compile();

    service = module.get(TaxCalculationService);
  });

  describe('calculateAllTaxes', () => {
    describe('IVA Calculation', () => {
      it('should calculate 16% IVA for 100', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 100 },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(16.00);
      });

      it('should handle decimal precision correctly', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        // 33.33 × 0.16 = 5.3328 → debe redondear a 5.33
        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 33.33 },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(5.33);
      });

      it('should accumulate multiple lines without rounding errors', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          {
            taxType: 'IVA',
            lines: [
              { productId: 'p1', amount: 33.33 },
              { productId: 'p2', amount: 33.33 },
              { productId: 'p3', amount: 33.34 },
            ],
          },
          'tenant123',
        );

        // 100.00 × 0.16 = 16.00 (exacto)
        expect(result.totalBaseAmount).toBe(100.00);
        expect(result.totalTaxAmount).toBe(16.00);
      });

      it('should handle edge case: 0.01', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 0.01 },
          'tenant123',
        );

        // 0.01 × 0.16 = 0.0016 → 0.00
        expect(result.totalTaxAmount).toBe(0.00);
      });

      it('should handle large amounts', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 1000000 },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(160000.00);
      });
    });

    describe('Product Exemptions', () => {
      it('should skip exempt products', async () => {
        mockProductModel.findById.mockResolvedValue({
          _id: 'p1',
          ivaApplicable: false,
        });

        const result = await service.calculateAllTaxes(
          {
            taxType: 'IVA',
            lines: [{ productId: 'p1', amount: 100 }],
          },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(0);
        expect(result.exemptions).toContain('Product p1 is exempt from IVA');
      });

      it('should handle mixed taxable and exempt products', async () => {
        mockProductModel.findById
          .mockResolvedValueOnce({ _id: 'p1', ivaApplicable: true })
          .mockResolvedValueOnce({ _id: 'p2', ivaApplicable: false });

        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          {
            taxType: 'IVA',
            lines: [
              { productId: 'p1', amount: 100 },
              { productId: 'p2', amount: 50 },
            ],
          },
          'tenant123',
        );

        expect(result.totalBaseAmount).toBe(100); // Solo el taxable
        expect(result.totalTaxAmount).toBe(16.00);
      });
    });

    describe('Customer Exemptions', () => {
      it('should exempt government customers', async () => {
        mockCustomerModel.findById.mockResolvedValue({
          _id: 'c1',
          taxInfo: { isGovernment: true },
        });

        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 100, customerId: 'c1' },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(0);
      });

      it('should exempt diplomatic customers', async () => {
        mockCustomerModel.findById.mockResolvedValue({
          _id: 'c1',
          taxInfo: { isDiplomatic: true },
        });

        mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
          taxType: 'IVA',
          rate: 0.16,
        });

        const result = await service.calculateAllTaxes(
          { taxType: 'IVA', amount: 100, customerId: 'c1' },
          'tenant123',
        );

        expect(result.totalTaxAmount).toBe(0);
      });
    });

    describe('Error Handling', () => {
      it('should throw error if no tax configuration found', async () => {
        mockTaxConfigService.getActiveConfiguration.mockResolvedValue(null);

        await expect(
          service.calculateAllTaxes({ taxType: 'IVA', amount: 100 }, 'tenant123'),
        ).rejects.toThrow('No active tax configuration found');
      });

      it('should handle invalid product ID', async () => {
        mockProductModel.findById.mockResolvedValue(null);

        const result = await service.calculateAllTaxes(
          {
            taxType: 'IVA',
            lines: [{ productId: 'invalid', amount: 100 }],
          },
          'tenant123',
        );

        expect(result.warnings).toContain('Product invalid not found, skipping');
        expect(result.totalTaxAmount).toBe(0);
      });
    });
  });

  describe('Decimal Precision Edge Cases', () => {
    it('should handle repeating decimals', async () => {
      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'IVA',
        rate: 0.16,
      });

      // 1/3 = 0.333333...
      const result = await service.calculateAllTaxes(
        { taxType: 'IVA', amount: 0.33 },
        'tenant123',
      );

      expect(result.totalTaxAmount).toBe(0.05); // 0.33 × 0.16 = 0.0528 → 0.05
    });

    it('should maintain precision over 1000 line items', async () => {
      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'IVA',
        rate: 0.16,
      });

      const lines = Array.from({ length: 1000 }, (_, i) => ({
        productId: `p${i}`,
        amount: 1.00,
      }));

      const result = await service.calculateAllTaxes(
        { taxType: 'IVA', lines },
        'tenant123',
      );

      expect(result.totalBaseAmount).toBe(1000.00);
      expect(result.totalTaxAmount).toBe(160.00);
    });
  });
});
```

**Casos de Prueba Críticos**:
- [x] Cálculo básico de IVA 16%
- [x] Precisión decimal (33.33, 0.01)
- [x] Acumulación sin errores de redondeo
- [x] Productos exentos
- [x] Clientes exentos (gobierno, diplomáticos)
- [x] Múltiples líneas (1000+)
- [x] Errores de configuración
- [x] IDs inválidos

---

### 2. WithholdingsService Tests

**Archivo**: `src/modules/withholdings/withholdings.service.spec.ts`

```typescript
describe('WithholdingsService', () => {
  describe('calculateAndCreate', () => {
    it('should calculate 75% IVA withholding for juridical person', async () => {
      mockCustomerModel.findById.mockResolvedValue({
        _id: 's1',
        taxInfo: { taxType: 'J' },
      });

      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'Withholding_IVA',
        code: 'VE-RET-IVA-75',
        rate: 0.75,
      });

      const withholding = await service.calculateAndCreate(
        'payment123',
        1000,
        's1',
        'tenant123',
        'user123',
      );

      expect(withholding).toBeDefined();
      expect(withholding.withholdingAmount).toBe(750.00);
      expect(withholding.withholdingRate).toBe(0.75);
    });

    it('should calculate 100% IVA withholding for natural person professional', async () => {
      mockCustomerModel.findById.mockResolvedValue({
        _id: 's1',
        taxInfo: { taxType: 'V' },
      });

      mockTaxConfigService.getActiveConfiguration.mockResolvedValue({
        taxType: 'Withholding_IVA',
        code: 'VE-RET-IVA-100',
        rate: 1.00,
      });

      const withholding = await service.calculateAndCreate(
        'payment123',
        500,
        's1',
        'tenant123',
        'user123',
      );

      expect(withholding.withholdingAmount).toBe(500.00);
    });

    it('should skip withholding if amount below threshold', async () => {
      mockCustomerModel.findById.mockResolvedValue({
        _id: 's1',
        taxInfo: { taxType: 'J' },
      });

      const withholding = await service.calculateAndCreate(
        'payment123',
        50, // Muy bajo
        's1',
        'tenant123',
        'user123',
      );

      expect(withholding).toBeNull();
    });

    it('should skip withholding if tenant is not retention agent', async () => {
      // TODO: Implementar cuando se agregue lógica de agente de retención en Tenant
    });
  });

  describe('generateCertificate', () => {
    it('should generate certificate number and update status', async () => {
      const mockWithholding = {
        _id: 'w1',
        withholdingAmount: 750,
        save: jest.fn().mockResolvedValue(true),
      };

      mockWithholdingModel.findOne.mockResolvedValue(mockWithholding);

      const url = await service.generateCertificate('w1', 'tenant123', 'user123');

      expect(mockWithholding.certificateNumber).toMatch(/^RET-/);
      expect(mockWithholding.status).toBe('certified');
      expect(url).toContain('/certificates/');
    });
  });
});
```

---

## TESTS DE INTEGRACIÓN

### 1. Order → Tax Calculation → Accounting

**Archivo**: `test/integration/order-tax-flow.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { OrdersService } from '../src/modules/orders/orders.service';
import { TaxTransactionModel } from '../src/schemas/tax-transaction.schema';
import { JournalEntryModel } from '../src/schemas/journal-entry.schema';

describe('Order → Tax → Accounting Flow (Integration)', () => {
  let app;
  let ordersService: OrdersService;
  let taxTransactionModel: Model<TaxTransactionDocument>;
  let journalEntryModel: Model<JournalEntryDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    ordersService = app.get(OrdersService);
    taxTransactionModel = app.get('TaxTransactionModel');
    journalEntryModel = app.get('JournalEntryModel');
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create order with taxes and accounting entries', async () => {
    // 1. Crear orden
    const orderDto = {
      customerId: testCustomerId,
      items: [
        {
          productId: testProductId,
          quantity: 10,
          price: 10,
        },
      ],
    };

    const order = await ordersService.create(orderDto, testUser);

    // 2. Verificar impuestos calculados
    expect(order.subtotal).toBe(100);
    expect(order.ivaTotal).toBe(16);
    expect(order.totalAmount).toBe(116);

    // 3. Verificar TaxTransaction creada
    const taxTransactions = await taxTransactionModel
      .find({ sourceDocumentId: order._id })
      .exec();

    expect(taxTransactions).toHaveLength(1);
    expect(taxTransactions[0].taxType).toBe('IVA');
    expect(taxTransactions[0].taxAmount).toBe(16);

    // 4. Verificar asientos contables
    await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar setImmediate

    const journalEntries = await journalEntryModel
      .find({ 'metadata.orderId': order._id.toString() })
      .exec();

    expect(journalEntries.length).toBeGreaterThanOrEqual(1);

    const salesEntry = journalEntries.find(e =>
      e.description.includes('Asiento automático por venta'),
    );

    expect(salesEntry).toBeDefined();

    // Verificar líneas del asiento
    const accountsReceivableLine = salesEntry.lines.find(l => l.debit === 116);
    const salesRevenueLine = salesEntry.lines.find(l => l.credit === 100);
    const taxPayableLine = salesEntry.lines.find(l => l.credit === 16);

    expect(accountsReceivableLine).toBeDefined();
    expect(salesRevenueLine).toBeDefined();
    expect(taxPayableLine).toBeDefined();
  });

  it('should handle exempt products correctly', async () => {
    const orderDto = {
      customerId: testCustomerId,
      items: [
        {
          productId: exemptProductId, // Producto exento
          quantity: 5,
          price: 20,
        },
      ],
    };

    const order = await ordersService.create(orderDto, testUser);

    expect(order.subtotal).toBe(100);
    expect(order.ivaTotal).toBe(0); // Exento
    expect(order.totalAmount).toBe(100);

    const taxTransactions = await taxTransactionModel
      .find({ sourceDocumentId: order._id })
      .exec();

    expect(taxTransactions).toHaveLength(0); // No se crea transacción si es exento
  });
});
```

---

### 2. Payment → Withholding → Accounting

**Archivo**: `test/integration/payment-withholding-flow.spec.ts`

```typescript
describe('Payment → Withholding → Accounting Flow', () => {
  it('should create withholding when paying supplier', async () => {
    // 1. Crear payable
    const payable = await payablesService.create(
      {
        payeeName: 'Supplier ABC',
        supplierId: testSupplierId,
        totalAmount: 1000,
        lines: [
          {
            accountId: expenseAccountId,
            amount: 1000,
            description: 'Professional services',
          },
        ],
      },
      testUser,
    );

    // 2. Crear pago
    const payment = await paymentsService.create(
      {
        payableId: payable._id.toString(),
        amount: 1000,
        method: 'transferencia_ves',
        date: new Date(),
      },
      testUser,
    );

    // 3. Verificar retención creada
    const withholdings = await withholdingsModel
      .find({ sourcePaymentId: payment._id })
      .exec();

    expect(withholdings).toHaveLength(1);
    expect(withholdings[0].withholdingAmount).toBe(750); // 75% de 1000

    // 4. Verificar monto neto del pago
    const updatedPayment = await paymentsModel.findById(payment._id).exec();
    expect(updatedPayment.netAmount).toBe(250); // 1000 - 750

    // 5. Verificar asiento contable incluye retención
    await new Promise(resolve => setTimeout(resolve, 1000));

    const journalEntries = await journalEntryModel
      .find({ 'metadata.paymentId': payment._id.toString() })
      .exec();

    expect(journalEntries.length).toBeGreaterThan(0);

    // Debe tener línea de retención
    const withholdingLine = journalEntries[0].lines.find(
      l => l.description.includes('Retención'),
    );
    expect(withholdingLine).toBeDefined();
  });
});
```

---

## TESTS END-TO-END

### User Journey: Crear Orden hasta Declaración

**Archivo**: `test/e2e/full-tax-journey.spec.ts`

```typescript
describe('Full Tax Journey (E2E)', () => {
  it('should complete full flow: Order → Payment → Declaration', async () => {
    // 1. Login
    const { token } = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'password' })
      .expect(200);

    // 2. Crear orden
    const createOrderRes = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        customerId: testCustomerId,
        items: [{ productId: testProductId, quantity: 10, price: 10 }],
      })
      .expect(201);

    const order = createOrderRes.body.data;
    expect(order.ivaTotal).toBe(16);

    // 3. Registrar pago
    const paymentRes = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId: order._id,
        amount: 116,
        method: 'transferencia_ves',
      })
      .expect(201);

    // 4. Verificar orden pagada
    const orderAfterPayment = await request(app.getHttpServer())
      .get(`/orders/${order._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(orderAfterPayment.body.data.paymentStatus).toBe('paid');

    // 5. Generar Libro de Ventas
    const salesBookRes = await request(app.getHttpServer())
      .get('/fiscal-reports/sales-book?year=2025&month=11')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const salesBook = salesBookRes.body.data;
    expect(salesBook.entries.length).toBeGreaterThan(0);

    const orderEntry = salesBook.entries.find(
      e => e.invoiceNumber === order.orderNumber,
    );
    expect(orderEntry).toBeDefined();
    expect(orderEntry.ivaAmount).toBe(16);

    // 6. Exportar a TXT
    const exportRes = await request(app.getHttpServer())
      .post('/fiscal-reports/sales-book/export')
      .set('Authorization', `Bearer ${token}`)
      .send({ year: 2025, month: 11, format: 'txt' })
      .expect(200);

    expect(exportRes.body.data.filepath).toContain('libro_ventas_2025_11.txt');
  });
});
```

---

## TESTS DE REGRESIÓN

### Comparación Legacy vs Nuevo

**Archivo**: `test/regression/tax-calculation-comparison.spec.ts`

```typescript
import * as legacyFixtures from '../fixtures/legacy-orders.json';

describe('Regression: Legacy vs New Tax Calculation', () => {
  it('should produce identical results for 100 real orders', async () => {
    const differences = [];

    for (const fixture of legacyFixtures) {
      // Calcular con sistema nuevo
      const result = await taxCalculationService.calculateAllTaxes(
        {
          taxType: 'IVA',
          lines: fixture.input.items.map(item => ({
            productId: item.productId,
            amount: item.quantity * item.price,
          })),
        },
        fixture.input.tenantId,
      );

      const newIVA = result.totalTaxAmount;
      const legacyIVA = fixture.expectedOutput.ivaTotal;

      if (Math.abs(newIVA - legacyIVA) > 0.01) {
        differences.push({
          orderId: fixture.input.orderId,
          legacy: legacyIVA,
          new: newIVA,
          diff: Math.abs(newIVA - legacyIVA),
        });
      }
    }

    expect(differences).toHaveLength(0);

    if (differences.length > 0) {
      console.error('Differences found:', JSON.stringify(differences, null, 2));
    }
  });
});
```

---

## TESTS DE PERFORMANCE

### Load Testing

**Archivo**: `test/performance/tax-calculation.perf.spec.ts`

```typescript
describe('Performance: Tax Calculation', () => {
  it('should calculate taxes for 100 line order in <2s', async () => {
    const lines = Array.from({ length: 100 }, (_, i) => ({
      productId: testProductIds[i % 10],
      amount: Math.random() * 100,
    }));

    const start = Date.now();

    const result = await taxCalculationService.calculateAllTaxes(
      { taxType: 'IVA', lines },
      'tenant123',
    );

    const duration = Date.now() - start;

    expect(duration).toBeLessThan(2000);
    expect(result.totalTaxAmount).toBeGreaterThan(0);
  });

  it('should handle 1000 concurrent tax calculations', async () => {
    const promises = Array.from({ length: 1000 }, () =>
      taxCalculationService.calculateAllTaxes(
        { taxType: 'IVA', amount: 100 },
        'tenant123',
      ),
    );

    const start = Date.now();
    await Promise.all(promises);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(10000); // 10s para 1000 requests
  });
});
```

---

## TESTS DE COMPLIANCE

### Validación Contra Normativa

**Archivo**: `test/compliance/venezuela-compliance.spec.ts`

```typescript
describe('Venezuela Tax Compliance', () => {
  it('should generate Sales Book in SENIAT format', async () => {
    const { entries } = await salesBookService.generate('tenant123', 2025, 11);

    // Verificar estructura según especificación SENIAT
    for (const entry of entries) {
      expect(entry).toHaveProperty('transactionType');
      expect(entry.transactionType).toMatch(/^(01|02|03)$/); // 01=Venta, 02=N/D, 03=N/C

      expect(entry).toHaveProperty('customerTaxType');
      expect(entry.customerTaxType).toMatch(/^(V|E|J|G|P)$/);

      expect(entry).toHaveProperty('invoiceNumber');
      expect(entry.invoiceNumber).toBeTruthy();

      expect(entry.ivaAmount).toBeGreaterThanOrEqual(0);
    }
  });

  it('should export TXT with correct format', async () => {
    const filepath = await salesBookService.exportToTXT('tenant123', 2025, 11);

    const content = await fs.readFile(filepath, 'utf-8');
    const lines = content.split('\n');

    // Primera línea: cabecera
    expect(lines[0]).toMatch(/^RIF\|.+\|PERIODO\|202511$/);

    // Última línea: totales
    expect(lines[lines.length - 1]).toMatch(/^TOTALES\|/);
  });

  it('should calculate withholding according to Providencia 0049', async () => {
    // Juridica: 75%
    const w1 = await withholdingsService.calculateAndCreate(
      'p1',
      1000,
      'supplierId-juridica',
      'tenant123',
      'user123',
    );
    expect(w1.withholdingRate).toBe(0.75);

    // Natural professional: 100%
    const w2 = await withholdingsService.calculateAndCreate(
      'p2',
      500,
      'supplierId-natural',
      'tenant123',
      'user123',
    );
    expect(w2.withholdingRate).toBe(1.00);
  });
});
```

---

## CI/CD INTEGRATION

### GitHub Actions Workflow

**Archivo**: `.github/workflows/tax-module-tests.yml`

```yaml
name: Tax Module Tests

on:
  push:
    paths:
      - 'src/modules/tax/**'
      - 'src/modules/withholdings/**'
      - 'src/modules/fiscal-reports/**'
      - 'test/**'
  pull_request:
    paths:
      - 'src/modules/tax/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mongodb:
        image: mongo:6.0
        ports:
          - 27017:27017

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage

      - name: Run integration tests
        run: npm run test:integration
        env:
          MONGODB_URI: mongodb://localhost:27017/test

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          MONGODB_URI: mongodb://localhost:27017/test

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
          flags: tax-module

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
```

### Pre-commit Hook

**Archivo**: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run tests related to changed files
npm run test:changed

# Check coverage
npm run test:coverage-check
```

---

## CHECKLIST DE TESTING

### Pre-Release
- [ ] Tests unitarios pasan 100%
- [ ] Coverage >80% en módulo fiscal
- [ ] Tests de integración pasan 100%
- [ ] Tests E2E críticos pasan 100%
- [ ] Tests de regresión: 0 diferencias vs legacy
- [ ] Performance tests: <2s para orden 100 líneas
- [ ] Compliance tests: formato SENIAT válido
- [ ] Load tests: 1000 concurrent requests OK

### Durante Migración
- [ ] Regression tests ejecutados diariamente
- [ ] Smoke tests después de cada deploy
- [ ] Monitoring de errores en producción

### Post-Release
- [ ] Regression tests cada semana
- [ ] Performance monitoring continuo
- [ ] Compliance audits mensuales

---

**Siguiente**: [ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md](./ROADMAP_FASE_2_ARQUITECTURA_MULTI_PAIS.md)
