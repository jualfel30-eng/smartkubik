import { Test, TestingModule } from '@nestjs/testing';
import { BankTransactionsService } from './bank-transactions.service';
import { getModelToken } from '@nestjs/mongoose';
import { BankTransaction } from '../../schemas/bank-transaction.schema';
import { Payment } from '../../schemas/payment.schema';
import { Types } from 'mongoose';

describe('BankTransactionsService', () => {
  let service: BankTransactionsService;
  let bankTransactionModel: any;
  let paymentModel: any;

  const mockTenantId = new Types.ObjectId().toString();
  const mockBankAccountId = new Types.ObjectId().toString();
  const mockTransactionId = new Types.ObjectId().toString();

  beforeEach(async () => {
    bankTransactionModel = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn().mockReturnThis(),
      findByIdAndUpdate: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    paymentModel = {
      findByIdAndUpdate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankTransactionsService,
        {
          provide: getModelToken(BankTransaction.name),
          useValue: bankTransactionModel,
        },
        {
          provide: getModelToken(Payment.name),
          useValue: paymentModel,
        },
      ],
    }).compile();

    service = module.get<BankTransactionsService>(BankTransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return a transaction when found', async () => {
      // Arrange
      const mockTransaction = {
        _id: mockTransactionId,
        tenantId: mockTenantId,
        amount: 500,
        type: 'credit',
      };

      bankTransactionModel.exec.mockResolvedValue(mockTransaction);

      // Act
      const result = await service.findById(mockTenantId, mockTransactionId);

      // Assert
      expect(result).toEqual(mockTransaction);
      expect(bankTransactionModel.findOne).toHaveBeenCalled();
    });

    it('should return null when transaction not found', async () => {
      // Arrange
      bankTransactionModel.exec.mockResolvedValue(null);

      // Act
      const result = await service.findById(mockTenantId, 'nonexistent');

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('createTransaction', () => {
    it('should create a new bank transaction successfully', async () => {
      // Arrange
      const createDto = {
        type: 'credit' as const,
        channel: 'transferencia',
        method: 'pago_movil',
        amount: 1000,
        description: 'Test transaction',
        reference: 'REF-123',
        transactionDate: new Date().toISOString(),
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: mockTransactionId,
        ...createDto,
        tenantId: mockTenantId,
        bankAccountId: mockBankAccountId,
      });

      (service as any).bankTransactionModel = jest
        .fn()
        .mockImplementation(() => ({
          save: mockSave,
        }));

      // Act
      const result = await service.createTransaction(
        mockTenantId,
        mockBankAccountId,
        createDto,
        '65e0f8c2d7a7b1c5e4f1a0b2',
        1500,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('recordPaymentMovement', () => {
    it('should record a sale payment as credit transaction', async () => {
      // Arrange
      const payload = {
        paymentId: new Types.ObjectId().toString(),
        paymentType: 'sale' as const,
        bankAccountId: mockBankAccountId,
        amount: 500,
        method: 'pago_movil',
        reference: 'REF-456',
        transactionDate: new Date().toISOString(),
        balanceAfter: 2000,
      };

      const mockTransaction = {
        _id: mockTransactionId,
        type: 'credit',
        amount: payload.amount,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (service as any).bankTransactionModel = jest
        .fn()
        .mockImplementation(() => mockTransaction);

      // Act
      const result = await service.recordPaymentMovement(
        mockTenantId,
        '65e0f8c2d7a7b1c5e4f1a0b2',
        payload,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('credit');
    });

    it('should record a payable payment as debit transaction', async () => {
      // Arrange
      const payload = {
        paymentId: new Types.ObjectId().toString(),
        paymentType: 'payable' as const,
        bankAccountId: mockBankAccountId,
        amount: 300,
        method: 'transferencia',
        reference: 'REF-789',
        transactionDate: new Date().toISOString(),
        balanceAfter: 1700,
      };

      const mockTransaction = {
        _id: mockTransactionId,
        type: 'debit',
        amount: payload.amount,
        save: jest.fn().mockResolvedValue(undefined),
      };

      (service as any).bankTransactionModel = jest
        .fn()
        .mockImplementation(() => mockTransaction);

      // Act
      const result = await service.recordPaymentMovement(
        mockTenantId,
        '65e0f8c2d7a7b1c5e4f1a0b2',
        payload,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.type).toBe('debit');
    });
  });

  describe('markAsReconciled', () => {
    it('should mark transaction as reconciled and update payment', async () => {
      // Arrange
      const reconciliationId = new Types.ObjectId().toString();
      const statementTransactionId = new Types.ObjectId().toString();
      const paymentId = new Types.ObjectId().toString();
      const userId = '65e0f8c2d7a7b1c5e4f1a0b2';

      const mockTransaction = {
        _id: mockTransactionId,
        paymentId: new Types.ObjectId(paymentId),
        reconciliationStatus: 'matched',
      };

      bankTransactionModel.findByIdAndUpdate.mockResolvedValue(
        mockTransaction,
      );
      paymentModel.findByIdAndUpdate.mockResolvedValue({});

      // Act
      await service.markAsReconciled(
        mockTransactionId,
        reconciliationId,
        statementTransactionId,
        userId,
      );

      // Assert
      expect(bankTransactionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          $set: expect.objectContaining({
            reconciliationStatus: 'matched',
            reconciled: true,
          }),
        }),
        { new: true },
      );
      expect(paymentModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('markAsPending', () => {
    it('should mark transaction as pending and undo reconciliation', async () => {
      // Arrange
      const paymentId = new Types.ObjectId();

      const mockTransaction = {
        _id: mockTransactionId,
        paymentId,
        reconciliationStatus: 'pending',
      };

      bankTransactionModel.findByIdAndUpdate.mockResolvedValue(
        mockTransaction,
      );
      paymentModel.findByIdAndUpdate.mockResolvedValue({});

      // Act
      await service.markAsPending(mockTransactionId);

      // Assert
      expect(bankTransactionModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockTransactionId,
        expect.objectContaining({
          $set: expect.objectContaining({
            reconciliationStatus: 'pending',
            reconciled: false,
          }),
          $unset: expect.any(Object),
        }),
        { new: true },
      );
      expect(paymentModel.findByIdAndUpdate).toHaveBeenCalled();
    });
  });

  describe('createTransfer', () => {
    it('should create transfer with debit and credit transactions', async () => {
      // Arrange
      const sourceAccountId = new Types.ObjectId().toString();
      const destinationAccountId = new Types.ObjectId().toString();
      const transferDto = {
        destinationAccountId: destinationAccountId,
        amount: 1000,
        description: 'Transfer between accounts',
        reference: 'TRF-001',
      };

      const mockDebit = {
        _id: new Types.ObjectId(),
        type: 'debit',
        amount: transferDto.amount,
        save: jest.fn().mockResolvedValue(undefined),
      };

      const mockCredit = {
        _id: new Types.ObjectId(),
        type: 'credit',
        amount: transferDto.amount,
        save: jest.fn().mockResolvedValue(undefined),
      };

      let callCount = 0;
      const mockConstructor: any = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? mockDebit : mockCredit;
      });

      // Preserve the findByIdAndUpdate method from the original mock
      mockConstructor.findByIdAndUpdate = jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue({}),
      });

      (service as any).bankTransactionModel = mockConstructor;

      // Act
      const result = await service.createTransfer(
        mockTenantId,
        sourceAccountId,
        destinationAccountId,
        transferDto,
        '65e0f8c2d7a7b1c5e4f1a0b2',
        4000,
        6000,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.debit).toBeDefined();
      expect(result.credit).toBeDefined();
      expect(result.transferGroupId).toBeDefined();
      expect(result.debit.type).toBe('debit');
      expect(result.credit.type).toBe('credit');
    });
  });

  describe('listTransactions', () => {
    it('should list transactions with filters and pagination', async () => {
      // Arrange
      const mockTransactions = [
        {
          _id: '1',
          type: 'credit',
          amount: 500,
          description: 'Payment received',
        },
        {
          _id: '2',
          type: 'debit',
          amount: 300,
          description: 'Payment sent',
        },
      ];

      const query = {
        page: 1,
        limit: 10,
        type: 'credit' as const,
      };

      bankTransactionModel.exec.mockResolvedValue(mockTransactions);
      bankTransactionModel.countDocuments.mockResolvedValue(2);

      // Act
      const result = await service.listTransactions(
        mockTenantId,
        mockBankAccountId,
        query,
      );

      // Assert
      expect(result.data).toEqual(mockTransactions);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.total).toBe(2);
    });

    it('should support text search in description and reference', async () => {
      // Arrange
      const mockTransactions = [
        {
          _id: '1',
          description: 'Payment for invoice #123',
          reference: 'INV-123',
        },
      ];

      const query = {
        search: 'invoice',
        page: 1,
        limit: 25,
      };

      bankTransactionModel.exec.mockResolvedValue(mockTransactions);
      bankTransactionModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.listTransactions(
        mockTenantId,
        mockBankAccountId,
        query,
      );

      // Assert
      expect(result.data).toEqual(mockTransactions);
      expect(bankTransactionModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.arrayContaining([
            { description: { $regex: 'invoice', $options: 'i' } },
            { reference: { $regex: 'invoice', $options: 'i' } },
          ]),
        }),
      );
    });
  });
});
