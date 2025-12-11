import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BillingAccountingListener } from './billing-accounting.listener';
import { AccountingService } from '../accounting.service';
import { IvaSalesBookService } from '../services/iva-sales-book.service';
import { JournalEntry } from '../../../schemas/journal-entry.schema';
import { IvaSalesBook } from '../../../schemas/iva-sales-book.schema';

/**
 * FASE 4: TESTS END-TO-END
 * Verifica el flujo completo de integración Billing → Accounting
 */
describe('Billing-Accounting Integration E2E (Phase 4)', () => {
  let listener: BillingAccountingListener;
  let accountingService: AccountingService;
  let ivaSalesBookService: IvaSalesBookService;

  // Mock constructor functions for Mongoose models
  const mockJournalEntry = {
    save: jest.fn().mockResolvedValue({ _id: 'journal-entry-id' }),
  };

  const mockJournalEntryModel: any = jest.fn().mockImplementation(() => mockJournalEntry);
  Object.assign(mockJournalEntryModel, {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  });

  const mockIvaSalesBookEntry = {
    save: jest.fn().mockResolvedValue({ _id: 'sales-book-id' }),
  };

  const mockIvaSalesBookModel: any = jest.fn().mockImplementation(() => mockIvaSalesBookEntry);
  Object.assign(mockIvaSalesBookModel, {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  });

  const mockChartOfAccountsModel = {
    findOne: jest.fn(),
  };

  const mockTenantModel = {
    findOne: jest.fn(),
  };

  const mockOrderModel = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockPayableModel = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockBillingDocumentModel = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingAccountingListener,
        AccountingService,
        IvaSalesBookService,
        {
          provide: getModelToken(JournalEntry.name),
          useValue: mockJournalEntryModel,
        },
        {
          provide: getModelToken(IvaSalesBook.name),
          useValue: mockIvaSalesBookModel,
        },
        {
          provide: getModelToken('ChartOfAccounts'),
          useValue: mockChartOfAccountsModel,
        },
        {
          provide: getModelToken('Tenant'),
          useValue: mockTenantModel,
        },
        {
          provide: getModelToken('Order'),
          useValue: mockOrderModel,
        },
        {
          provide: getModelToken('Payable'),
          useValue: mockPayableModel,
        },
        {
          provide: getModelToken('BillingDocument'),
          useValue: mockBillingDocumentModel,
        },
      ],
    }).compile();

    listener = module.get<BillingAccountingListener>(BillingAccountingListener);
    accountingService = module.get<AccountingService>(AccountingService);
    ivaSalesBookService = module.get<IvaSalesBookService>(IvaSalesBookService);

    // Clear all mocks
    jest.clearAllMocks();
    mockJournalEntry.save.mockClear();
    mockIvaSalesBookEntry.save.mockClear();

    // Reset mock implementations
    mockJournalEntry.save.mockResolvedValue({ _id: 'journal-entry-id' });
    mockIvaSalesBookEntry.save.mockResolvedValue({ _id: 'sales-book-id' });

    // Setup default mocks
    mockTenantModel.findOne.mockResolvedValue({
      _id: 'tenant-id',
      name: 'Test Company',
    });

    mockChartOfAccountsModel.findOne.mockResolvedValue({
      tenantId: 'tenant-id',
      accounts: [
        { accountId: '1102', name: 'Cuentas por Cobrar' },
        { accountId: '4101', name: 'Ingresos por Ventas' },
        { accountId: '2102', name: 'IVA por Pagar' },
      ],
    });

    // Setup IvaSalesBookModel mocks for duplicate check and create
    mockIvaSalesBookModel.findOne.mockResolvedValue(null); // No duplicates
    mockIvaSalesBookModel.create.mockImplementation((data) =>
      Promise.resolve({ _id: 'sales-book-id', ...data }),
    );
  });

  describe('E2E Test 1: Complete Invoice Flow', () => {
    it('should create both journal entry and sales book entry for a complete invoice', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439011',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00001',
        type: 'invoice',
        documentNumber: 'FAC-2025-00001',
        issueDate: '2025-12-06T10:00:00.000Z',
        customerName: 'Restaurante El Buen Sabor C.A.',
        customerRif: 'J-12345678-9',
        customerAddress: 'Av. Principal, Caracas',
        subtotal: 1000,
        taxAmount: 160, // IVA 16%
        total: 1160,
        taxes: [{ type: 'IVA', rate: 16, amount: 160 }],
      };

      // No need to mock - using constructor mocks above

      // Execute the listener
      await listener.handleBillingIssued(invoiceEvent);

      // Verify journal entry was created (constructor was called + save was called)
      expect(mockJournalEntryModel).toHaveBeenCalledTimes(1);
      const journalEntryCall = mockJournalEntryModel.mock.calls[0][0];
      expect(journalEntryCall.tenantId).toBe('tenant-id');
      expect(journalEntryCall.lines).toHaveLength(3);

      // Verify debits = credits (balanced entry)
      const totalDebits = journalEntryCall.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalEntryCall.lines.reduce((sum, line) => sum + line.credit, 0);
      expect(totalDebits).toBe(totalCredits);
      expect(totalDebits).toBe(1160);

      // Verify save was called
      expect(mockJournalEntry.save).toHaveBeenCalledTimes(1);

      // Verify sales book entry was created using .create()
      expect(mockIvaSalesBookModel.create).toHaveBeenCalledTimes(1);
      const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(salesBookCall.invoiceNumber).toBe('FAC-2025-00001');
      expect(salesBookCall.invoiceControlNumber).toBe('CTRL-2025-00001');
      expect(salesBookCall.customerRif).toBe('J-12345678-9');
      expect(salesBookCall.baseAmount).toBe(1000);
      expect(salesBookCall.ivaAmount).toBe(160);
      expect(salesBookCall.ivaRate).toBe(16);
      expect(salesBookCall.totalAmount).toBe(1160);
      expect(salesBookCall.transactionType).toBe('sale');
      expect(salesBookCall.isElectronic).toBe(true);
    });

    it('should handle invoice with multiple tax rates', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439012',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00002',
        type: 'invoice',
        documentNumber: 'FAC-2025-00002',
        issueDate: '2025-12-06T11:00:00.000Z',
        customerName: 'Hotel Cinco Estrellas C.A.',
        customerRif: 'J-98765432-1',
        customerAddress: 'Zona Colonial, Caracas',
        subtotal: 500,
        taxAmount: 40, // IVA 8%
        total: 540,
        taxes: [{ type: 'IVA', rate: 8, amount: 40 }],
      };

      await listener.handleBillingIssued(invoiceEvent);

      // Verify IVA rate is correctly recorded
      const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(salesBookCall.ivaRate).toBe(8);
      expect(salesBookCall.ivaAmount).toBe(40);
    });

    it('should handle invoice with zero IVA (exento)', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439013',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00003',
        type: 'invoice',
        documentNumber: 'FAC-2025-00003',
        issueDate: '2025-12-06T12:00:00.000Z',
        customerName: 'Fundación Educativa',
        customerRif: 'G-20000000-5',
        customerAddress: 'Caracas',
        subtotal: 800,
        taxAmount: 0, // IVA 0% (exento)
        total: 800,
        taxes: [{ type: 'IVA', rate: 0, amount: 0 }],
      };

      await listener.handleBillingIssued(invoiceEvent);

      // Verify journal entry has only 2 lines (no IVA line)
      const journalEntryCall = mockJournalEntryModel.mock.calls[0][0];
      expect(journalEntryCall.lines).toHaveLength(2); // Solo CxC y Ingresos

      // Verify sales book records zero IVA
      const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(salesBookCall.ivaRate).toBe(0);
      expect(salesBookCall.ivaAmount).toBe(0);
    });
  });

  describe('E2E Test 2: Credit Note Flow with Reversal', () => {
    it('should create reversed journal entry for credit note', async () => {
      const creditNoteEvent = {
        documentId: '507f1f77bcf86cd799439014',
        tenantId: 'tenant-id',
        seriesId: 'series-002',
        controlNumber: 'CTRL-NC-2025-00001',
        type: 'credit_note',
        documentNumber: 'NC-2025-00001',
        issueDate: '2025-12-06T14:00:00.000Z',
        customerName: 'Restaurante El Buen Sabor C.A.',
        customerRif: 'J-12345678-9',
        customerAddress: 'Av. Principal, Caracas',
        subtotal: 500,
        taxAmount: 80, // IVA 16%
        total: 580,
        taxes: [{ type: 'IVA', rate: 16, amount: 80 }],
      };

      await listener.handleBillingIssued(creditNoteEvent);

      // Verify journal entry has negative amounts (reversal)
      const journalEntryCall = mockJournalEntryModel.mock.calls[0][0];
      expect(journalEntryCall.lines).toHaveLength(3);

      // Verify amounts are negative (credit note reverses the original)
      const cxcLine = journalEntryCall.lines.find((l) => l.account === '1102');
      expect(cxcLine.debit).toBe(-580); // Negative debit

      const ingresosLine = journalEntryCall.lines.find((l) => l.account === '4101');
      expect(ingresosLine.credit).toBe(-500); // Negative credit

      const ivaLine = journalEntryCall.lines.find((l) => l.account === '2102');
      expect(ivaLine.credit).toBe(-80); // Negative credit

      // Verify sales book entry is marked as credit_note
      const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(salesBookCall.transactionType).toBe('credit_note');
    });

    it('should maintain balanced entry even with negative amounts', async () => {
      const creditNoteEvent = {
        documentId: '507f1f77bcf86cd799439015',
        tenantId: 'tenant-id',
        seriesId: 'series-002',
        controlNumber: 'CTRL-NC-2025-00002',
        type: 'credit_note',
        documentNumber: 'NC-2025-00002',
        issueDate: '2025-12-06T15:00:00.000Z',
        customerName: 'Cliente Test',
        customerRif: 'V-11111111-1',
        subtotal: 300,
        taxAmount: 48,
        total: 348,
        taxes: [{ type: 'IVA', rate: 16, amount: 48 }],
      };

      await listener.handleBillingIssued(creditNoteEvent);

      const journalEntryCall = mockJournalEntryModel.mock.calls[0][0];
      const totalDebits = journalEntryCall.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = journalEntryCall.lines.reduce((sum, line) => sum + line.credit, 0);

      // Even with negative amounts, debits should equal credits
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe('E2E Test 3: Error Handling', () => {
    it('should throw error if journal entry creation fails', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439016',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00004',
        type: 'invoice',
        documentNumber: 'FAC-2025-00004',
        issueDate: '2025-12-06T16:00:00.000Z',
        customerName: 'Test Customer',
        customerRif: 'J-11111111-1',
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      // Mock failure in journal entry save
      mockJournalEntry.save.mockRejectedValue(
        new Error('Database connection lost'),
      );

      await expect(listener.handleBillingIssued(invoiceEvent)).rejects.toThrow(
        'Database connection lost',
      );

      // Verify sales book was NOT created (transaction consistency)
      expect(mockIvaSalesBookModel.create).not.toHaveBeenCalled();
    });

    it('should throw error if sales book creation fails', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439017',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00005',
        type: 'invoice',
        documentNumber: 'FAC-2025-00005',
        issueDate: '2025-12-06T17:00:00.000Z',
        customerName: 'Test Customer',
        customerRif: 'J-22222222-2',
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      // Mock the create method to throw an error for this specific test
      mockIvaSalesBookModel.create.mockRejectedValueOnce(
        new Error('Duplicate invoice number'),
      );

      await expect(listener.handleBillingIssued(invoiceEvent)).rejects.toThrow(
        'Duplicate invoice number',
      );

      // Verify journal entry WAS created (no transaction rollback)
      expect(mockJournalEntryModel).toHaveBeenCalled();
    });

    it('should handle missing customer data gracefully', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439018',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00006',
        type: 'invoice',
        documentNumber: 'FAC-2025-00006',
        issueDate: '2025-12-06T18:00:00.000Z',
        // customerName: missing
        // customerRif: missing
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      await listener.handleBillingIssued(invoiceEvent);

      // Verify defaults were used
      const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(salesBookCall.customerName).toBe('Cliente sin nombre');
      expect(salesBookCall.customerRif).toBe('J-00000000-0');
    });
  });

  describe('E2E Test 4: RIF Validation Integration', () => {
    it('should warn about invalid RIF but still process invoice', async () => {
      const invoiceEvent = {
        documentId: '507f1f77bcf86cd799439019',
        tenantId: 'tenant-id',
        seriesId: 'series-001',
        controlNumber: 'CTRL-2025-00007',
        type: 'invoice',
        documentNumber: 'FAC-2025-00007',
        issueDate: '2025-12-06T19:00:00.000Z',
        customerName: 'Cliente con RIF inválido',
        customerRif: 'INVALID-RIF', // RIF inválido
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      // Should not throw error (only warns)
      await expect(
        listener.handleBillingIssued(invoiceEvent),
      ).resolves.not.toThrow();

      // Verify invoice was still processed
      expect(mockJournalEntryModel).toHaveBeenCalled();
      expect(mockIvaSalesBookModel.create).toHaveBeenCalled();
    });

    it('should accept valid Venezuelan RIF formats', async () => {
      const validRIFs = [
        'J-12345678-9',
        'V-98765432-1',
        'E-123456789-0',
        'G-11111111-1',
        'P-22222222-2',
      ];

      for (const rif of validRIFs) {
        jest.clearAllMocks();
        mockJournalEntry.save.mockClear();
        mockIvaSalesBookEntry.save.mockClear();

        const invoiceEvent = {
          documentId: `doc-${rif}`,
          tenantId: 'tenant-id',
          seriesId: 'series-001',
          controlNumber: `CTRL-${rif}`,
          type: 'invoice',
          documentNumber: `FAC-${rif}`,
          issueDate: '2025-12-06T20:00:00.000Z',
          customerName: 'Cliente Test',
          customerRif: rif,
          subtotal: 100,
          taxAmount: 16,
          total: 116,
          taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
        };

        await listener.handleBillingIssued(invoiceEvent);

        const salesBookCall = mockIvaSalesBookModel.create.mock.calls[0][0];
        expect(salesBookCall.customerRif).toBe(rif);
      }
    });
  });

  describe('E2E Test 5: Monthly Declaration Data Consistency', () => {
    it('should create sales book entries ready for monthly declaration', async () => {
      // Simular 3 facturas en el mismo mes
      const invoices = [
        {
          documentId: '1',
          documentNumber: 'FAC-2025-00001',
          controlNumber: 'CTRL-00001',
          subtotal: 1000,
          taxAmount: 160,
          total: 1160,
        },
        {
          documentId: '2',
          documentNumber: 'FAC-2025-00002',
          controlNumber: 'CTRL-00002',
          subtotal: 500,
          taxAmount: 80,
          total: 580,
        },
        {
          documentId: '3',
          documentNumber: 'FAC-2025-00003',
          controlNumber: 'CTRL-00003',
          subtotal: 2000,
          taxAmount: 320,
          total: 2320,
        },
      ];

      for (const invoice of invoices) {
        const event = {
          documentId: invoice.documentId,
          tenantId: 'tenant-id',
          seriesId: 'series-001',
          controlNumber: invoice.controlNumber,
          type: 'invoice',
          documentNumber: invoice.documentNumber,
          issueDate: '2025-12-06T10:00:00.000Z',
          customerName: 'Cliente Test',
          customerRif: 'J-12345678-9',
          subtotal: invoice.subtotal,
          taxAmount: invoice.taxAmount,
          total: invoice.total,
          taxes: [{ type: 'IVA', rate: 16, amount: invoice.taxAmount }],
        };

        await listener.handleBillingIssued(event);
      }

      // Verify 3 sales book entries were created
      expect(mockIvaSalesBookModel.create).toHaveBeenCalledTimes(3);

      // Verify all entries have consistent month/year
      const calls = mockIvaSalesBookModel.create.mock.calls;
      expect(calls[0][0].month).toBe(12);
      expect(calls[0][0].year).toBe(2025);
      expect(calls[1][0].month).toBe(12);
      expect(calls[1][0].year).toBe(2025);
      expect(calls[2][0].month).toBe(12);
      expect(calls[2][0].year).toBe(2025);

      // Calculate total IVA for declaration
      const totalIVA = calls.reduce((sum, call) => sum + call[0].ivaAmount, 0);
      expect(totalIVA).toBe(560); // 160 + 80 + 320
    });
  });
});
