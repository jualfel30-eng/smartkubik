import { Test, TestingModule } from '@nestjs/testing';
import { BillingAccountingListener } from './billing-accounting.listener';
import { AccountingService } from '../accounting.service';
import { IvaSalesBookService } from '../services/iva-sales-book.service';

describe('BillingAccountingListener', () => {
  let listener: BillingAccountingListener;
  let accountingService: AccountingService;
  let ivaSalesBookService: IvaSalesBookService;

  const mockAccountingService = {
    createJournalEntry: jest.fn(),
  };

  const mockIvaSalesBookService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingAccountingListener,
        {
          provide: AccountingService,
          useValue: mockAccountingService,
        },
        {
          provide: IvaSalesBookService,
          useValue: mockIvaSalesBookService,
        },
      ],
    }).compile();

    listener = module.get<BillingAccountingListener>(BillingAccountingListener);
    accountingService = module.get<AccountingService>(AccountingService);
    ivaSalesBookService = module.get<IvaSalesBookService>(IvaSalesBookService);

    // Clear mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(listener).toBeDefined();
  });

  describe('handleBillingIssued - Invoice', () => {
    const invoiceEvent = {
      documentId: '507f1f77bcf86cd799439011',
      tenantId: '507f1f77bcf86cd799439012',
      seriesId: '507f1f77bcf86cd799439013',
      controlNumber: 'CTRL-001',
      type: 'invoice',
      documentNumber: 'FAC-001',
      issueDate: '2025-12-06T10:00:00.000Z',
      customerName: 'Test Customer',
      customerRif: 'J-12345678-9',
      customerAddress: 'Caracas, Venezuela',
      subtotal: 100,
      taxAmount: 16,
      total: 116,
      taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
    };

    it('should create journal entry for invoice', async () => {
      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(invoiceEvent);

      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        {
          date: invoiceEvent.issueDate,
          description: `Factura ${invoiceEvent.documentNumber} - ${invoiceEvent.customerName}`,
          lines: [
            {
              accountId: '1102',
              debit: 116, // total
              credit: 0,
              description: `Factura ${invoiceEvent.documentNumber}`,
            },
            {
              accountId: '4101',
              debit: 0,
              credit: 100, // subtotal
              description: `Venta ${invoiceEvent.customerName}`,
            },
            {
              accountId: '2102',
              debit: 0,
              credit: 16, // tax
              description: 'IVA Débito Fiscal',
            },
          ],
          isAutomatic: true,
        },
        invoiceEvent.tenantId,
      );
    });

    it('should register invoice in sales book', async () => {
      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(invoiceEvent);

      expect(mockIvaSalesBookService.create).toHaveBeenCalledWith(
        {
          month: 12,
          year: 2025,
          operationDate: invoiceEvent.issueDate,
          customerId: `BILLING-${invoiceEvent.documentId}`,
          customerName: invoiceEvent.customerName,
          customerRif: invoiceEvent.customerRif,
          customerAddress: invoiceEvent.customerAddress,
          invoiceNumber: invoiceEvent.documentNumber,
          invoiceControlNumber: invoiceEvent.controlNumber,
          invoiceDate: invoiceEvent.issueDate,
          transactionType: 'sale',
          baseAmount: 100,
          ivaRate: 16,
          ivaAmount: 16,
          totalAmount: 116,
          isElectronic: true,
          electronicCode: invoiceEvent.controlNumber,
        },
        { tenantId: invoiceEvent.tenantId, _id: 'system' },
      );
    });

    it('should handle invoice without tax', async () => {
      const noTaxEvent = {
        ...invoiceEvent,
        taxAmount: 0,
        total: 100,
        taxes: [],
      };

      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(noTaxEvent);

      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          lines: expect.arrayContaining([
            expect.objectContaining({ accountId: '1102', debit: 100 }),
            expect.objectContaining({ accountId: '4101', credit: 100 }),
          ]),
        }),
        noTaxEvent.tenantId,
      );

      // Should not have IVA line
      const call = mockAccountingService.createJournalEntry.mock.calls[0][0];
      expect(call.lines.length).toBe(2);
    });
  });

  describe('handleBillingIssued - Credit Note', () => {
    const creditNoteEvent = {
      documentId: '507f1f77bcf86cd799439014',
      tenantId: '507f1f77bcf86cd799439012',
      seriesId: '507f1f77bcf86cd799439013',
      controlNumber: 'CTRL-002',
      type: 'credit_note',
      documentNumber: 'NC-001',
      issueDate: '2025-12-06T11:00:00.000Z',
      customerName: 'Test Customer',
      customerRif: 'J-12345678-9',
      customerAddress: 'Caracas, Venezuela',
      subtotal: 50,
      taxAmount: 8,
      total: 58,
      taxes: [{ type: 'IVA', rate: 16, amount: 8 }],
    };

    it('should create reversed journal entry for credit note', async () => {
      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(creditNoteEvent);

      expect(mockAccountingService.createJournalEntry).toHaveBeenCalledWith(
        {
          date: creditNoteEvent.issueDate,
          description: `Factura ${creditNoteEvent.documentNumber} - ${creditNoteEvent.customerName}`,
          lines: [
            {
              accountId: '1102',
              debit: -58, // negative total (reversal)
              credit: 0,
              description: `Nota de Crédito ${creditNoteEvent.documentNumber}`,
            },
            {
              accountId: '4101',
              debit: 0,
              credit: -50, // negative subtotal (reversal)
              description: `Venta ${creditNoteEvent.customerName}`,
            },
            {
              accountId: '2102',
              debit: 0,
              credit: -8, // negative tax (reversal)
              description: 'IVA Débito Fiscal',
            },
          ],
          isAutomatic: true,
        },
        creditNoteEvent.tenantId,
      );
    });

    it('should register credit note in sales book', async () => {
      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(creditNoteEvent);

      expect(mockIvaSalesBookService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transactionType: 'credit_note',
          invoiceNumber: 'NC-001',
        }),
        { tenantId: creditNoteEvent.tenantId, _id: 'system' },
      );
    });
  });

  describe('Error Handling', () => {
    const errorEvent = {
      documentId: '507f1f77bcf86cd799439015',
      tenantId: '507f1f77bcf86cd799439012',
      seriesId: '507f1f77bcf86cd799439013',
      controlNumber: 'CTRL-003',
      type: 'invoice',
      documentNumber: 'FAC-002',
      issueDate: '2025-12-06T12:00:00.000Z',
      customerName: 'Test Customer',
      customerRif: 'J-12345678-9',
      subtotal: 100,
      taxAmount: 16,
      total: 116,
      taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
    };

    it('should throw error if journal entry creation fails', async () => {
      mockAccountingService.createJournalEntry.mockRejectedValue(
        new Error('Journal entry creation failed'),
      );

      await expect(listener.handleBillingIssued(errorEvent)).rejects.toThrow(
        'Journal entry creation failed',
      );
    });

    it('should throw error if sales book registration fails', async () => {
      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockRejectedValue(
        new Error('Sales book registration failed'),
      );

      await expect(listener.handleBillingIssued(errorEvent)).rejects.toThrow(
        'Sales book registration failed',
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing customer name', async () => {
      const event = {
        documentId: '507f1f77bcf86cd799439016',
        tenantId: '507f1f77bcf86cd799439012',
        seriesId: '507f1f77bcf86cd799439013',
        controlNumber: 'CTRL-004',
        type: 'invoice',
        documentNumber: 'FAC-003',
        issueDate: '2025-12-06T13:00:00.000Z',
        customerRif: 'J-12345678-9',
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(event);

      expect(mockIvaSalesBookService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerName: 'Cliente sin nombre',
        }),
        expect.any(Object),
      );
    });

    it('should handle missing customer RIF', async () => {
      const event = {
        documentId: '507f1f77bcf86cd799439017',
        tenantId: '507f1f77bcf86cd799439012',
        seriesId: '507f1f77bcf86cd799439013',
        controlNumber: 'CTRL-005',
        type: 'invoice',
        documentNumber: 'FAC-004',
        issueDate: '2025-12-06T14:00:00.000Z',
        customerName: 'Test Customer',
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [{ type: 'IVA', rate: 16, amount: 16 }],
      };

      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(event);

      expect(mockIvaSalesBookService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          customerRif: 'J-00000000-0',
        }),
        expect.any(Object),
      );
    });

    it('should use default IVA rate when tax not found', async () => {
      const event = {
        documentId: '507f1f77bcf86cd799439018',
        tenantId: '507f1f77bcf86cd799439012',
        seriesId: '507f1f77bcf86cd799439013',
        controlNumber: 'CTRL-006',
        type: 'invoice',
        documentNumber: 'FAC-005',
        issueDate: '2025-12-06T15:00:00.000Z',
        customerName: 'Test Customer',
        customerRif: 'J-12345678-9',
        subtotal: 100,
        taxAmount: 16,
        total: 116,
        taxes: [], // No IVA in array
      };

      mockAccountingService.createJournalEntry.mockResolvedValue({
        _id: 'journal-entry-id',
      });
      mockIvaSalesBookService.create.mockResolvedValue({
        _id: 'sales-book-id',
      });

      await listener.handleBillingIssued(event);

      expect(mockIvaSalesBookService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ivaRate: 16, // default rate
          ivaAmount: 16, // taxAmount
        }),
        expect.any(Object),
      );
    });
  });
});
