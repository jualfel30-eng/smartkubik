import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { IvaSalesBookService } from './iva-sales-book.service';
import { IvaSalesBook } from '../../../schemas/iva-sales-book.schema';

describe('IvaSalesBookService - Validations (Phase 3)', () => {
  let service: IvaSalesBookService;

  const mockIvaSalesBookModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IvaSalesBookService,
        {
          provide: getModelToken(IvaSalesBook.name),
          useValue: mockIvaSalesBookModel,
        },
      ],
    }).compile();

    service = module.get<IvaSalesBookService>(IvaSalesBookService);
    jest.clearAllMocks();
  });

  describe('validateRIF (static method)', () => {
    it('should accept valid Venezuelan RIF formats', () => {
      const validRIFs = [
        'J-12345678-9',
        'V-98765432-1',
        'E-123456789-0',
        'G-12345678-5',
        'P-87654321-2',
        'j-12345678-9', // lowercase
        'V-12345678-0', // 8 digits
        'E-123456789-1', // 9 digits
      ];

      validRIFs.forEach((rif) => {
        expect(IvaSalesBookService.validateRIF(rif)).toBe(true);
      });
    });

    it('should reject invalid RIF formats', () => {
      const invalidRIFs = [
        'J12345678-9', // sin guiones
        'J-1234567-9', // pocos dígitos
        'J-123456789-9', // 9 dígitos sin ser E
        'J-12345678-99', // dos dígitos verificadores
        'X-12345678-9', // letra inválida
        'J-12345678', // sin dígito verificador
        '12345678-9', // sin letra
        '', // vacío
        null as any, // null
        undefined as any, // undefined
      ];

      invalidRIFs.forEach((rif) => {
        expect(IvaSalesBookService.validateRIF(rif)).toBe(false);
      });
    });

    it('should handle RIFs with extra whitespace', () => {
      expect(IvaSalesBookService.validateRIF(' J-12345678-9 ')).toBe(true);
      expect(IvaSalesBookService.validateRIF('  V-98765432-1  ')).toBe(true);
    });
  });

  describe('validateForSENIAT', () => {
    it('should pass validation for complete valid entry', () => {
      const validEntry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 16,
        ivaRate: 16,
        isElectronic: true,
        electronicCode: 'SENIAT-12345',
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(validEntry);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing control number', () => {
      const entry = {
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 16,
        ivaRate: 16,
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Falta número de control SENIAT');
    });

    it('should detect invalid RIF', () => {
      const entry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'INVALID-RIF',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 16,
        ivaRate: 16,
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('RIF del cliente inválido'))).toBe(true);
    });

    it('should detect invalid IVA rates', () => {
      const entry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 15,
        ivaRate: 15, // tasa inválida
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Alícuota de IVA inválida'))).toBe(true);
    });

    it('should detect IVA calculation mismatch', () => {
      const entry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 20, // debería ser 16
        ivaRate: 16,
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('IVA calculado'))).toBe(true);
    });

    it('should detect missing electronic code for electronic invoices', () => {
      const entry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: 100,
        ivaAmount: 16,
        ivaRate: 16,
        isElectronic: true,
        // electronicCode faltante
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Factura electrónica requiere código de autorización SENIAT');
    });

    it('should detect negative amounts', () => {
      const entry = {
        invoiceControlNumber: 'CTRL-001',
        customerRif: 'J-12345678-9',
        invoiceNumber: 'FAC-001',
        invoiceDate: new Date(),
        baseAmount: -100,
        ivaAmount: -16,
        ivaRate: 16,
        customerName: 'Cliente Test',
      } as any;

      const result = service.validateForSENIAT(entry);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Base imponible no puede ser negativa');
      expect(result.errors).toContain('Monto de IVA no puede ser negativo');
    });

    it('should accept valid rates 0, 8, and 16', () => {
      const rates = [0, 8, 16];

      rates.forEach((rate) => {
        const entry = {
          invoiceControlNumber: 'CTRL-001',
          customerRif: 'J-12345678-9',
          invoiceNumber: 'FAC-001',
          invoiceDate: new Date(),
          baseAmount: 100,
          ivaAmount: (100 * rate) / 100,
          ivaRate: rate,
          customerName: 'Cliente Test',
        } as any;

        const result = service.validateForSENIAT(entry);

        const hasInvalidRateError = result.errors.some((e) => e.includes('Alícuota de IVA inválida'));
        expect(hasInvalidRateError).toBe(false);
      });
    });
  });

  describe('syncFromBillingDocument', () => {
    it('should create new entry from billing document', async () => {
      const billingDocumentId = '507f1f77bcf86cd799439011';
      const billingDoc = {
        documentNumber: 'FAC-001',
        controlNumber: 'CTRL-001',
        type: 'invoice',
        issueDate: new Date('2025-12-06'),
        customer: {
          name: 'Cliente Test',
          taxId: 'J-12345678-9',
          address: 'Caracas',
        },
        taxDetails: [
          {
            taxType: 'IVA',
            rate: 16,
            amount: 16,
            baseAmount: 100,
          },
        ],
        totals: {
          subtotal: 100,
          grandTotal: 116,
        },
      };
      const user = { tenantId: '507f1f77bcf86cd799439012', _id: 'user-id' };

      mockIvaSalesBookModel.findOne.mockResolvedValue(null); // No existe
      mockIvaSalesBookModel.create.mockResolvedValue({
        _id: 'sales-book-id',
        ...billingDoc,
      });

      const result = await service.syncFromBillingDocument(
        billingDocumentId,
        billingDoc,
        user,
      );

      expect(mockIvaSalesBookModel.findOne).toHaveBeenCalledWith({
        tenantId: user.tenantId,
        $or: [
          { invoiceNumber: 'FAC-001' },
          { billingDocumentId: billingDocumentId },
        ],
      });

      expect(mockIvaSalesBookModel.create).toHaveBeenCalled();
    });

    it('should return existing entry if already synced', async () => {
      const billingDocumentId = '507f1f77bcf86cd799439011';
      const billingDoc = {
        documentNumber: 'FAC-001',
        type: 'invoice',
      };
      const user = { tenantId: '507f1f77bcf86cd799439012', _id: 'user-id' };

      const existingEntry = { _id: 'existing-id', invoiceNumber: 'FAC-001' };
      mockIvaSalesBookModel.findOne.mockResolvedValue(existingEntry);

      const result = await service.syncFromBillingDocument(
        billingDocumentId,
        billingDoc,
        user,
      );

      expect(result).toEqual(existingEntry);
      expect(mockIvaSalesBookModel.create).not.toHaveBeenCalled();
    });

    it('should handle credit notes correctly', async () => {
      const billingDocumentId = '507f1f77bcf86cd799439011';
      const billingDoc = {
        documentNumber: 'NC-001',
        controlNumber: 'CTRL-002',
        type: 'credit_note',
        issueDate: new Date('2025-12-06'),
        customer: {
          name: 'Cliente Test',
          taxId: 'J-12345678-9',
        },
        taxDetails: [
          {
            taxType: 'IVA',
            rate: 16,
            amount: 8,
            baseAmount: 50,
          },
        ],
        totals: {
          subtotal: 50,
          grandTotal: 58,
        },
      };
      const user = { tenantId: '507f1f77bcf86cd799439012', _id: 'user-id' };

      mockIvaSalesBookModel.findOne.mockResolvedValue(null);
      mockIvaSalesBookModel.create.mockResolvedValue({
        _id: 'sales-book-id',
        transactionType: 'credit_note',
      });

      await service.syncFromBillingDocument(billingDocumentId, billingDoc, user);

      const createCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(createCall.transactionType).toBe('credit_note');
    });

    it('should use default values when data is missing', async () => {
      const billingDocumentId = '507f1f77bcf86cd799439011';
      const billingDoc = {
        documentNumber: 'FAC-001',
        type: 'invoice',
        issueDate: new Date('2025-12-06'),
        totals: {
          subtotal: 100,
        },
      };
      const user = { tenantId: '507f1f77bcf86cd799439012', _id: 'user-id' };

      mockIvaSalesBookModel.findOne.mockResolvedValue(null);
      mockIvaSalesBookModel.create.mockResolvedValue({ _id: 'id' });

      await service.syncFromBillingDocument(billingDocumentId, billingDoc, user);

      const createCall = mockIvaSalesBookModel.create.mock.calls[0][0];
      expect(createCall.customerName).toBe('Cliente sin nombre');
      expect(createCall.customerRif).toBe('J-00000000-0');
      expect(createCall.ivaRate).toBe(16); // default
    });
  });
});
