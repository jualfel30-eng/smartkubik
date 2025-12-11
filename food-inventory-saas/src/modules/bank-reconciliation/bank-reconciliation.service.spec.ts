import { Test, TestingModule } from '@nestjs/testing';
import { BankReconciliationService } from './bank-reconciliation.service';
import { getModelToken } from '@nestjs/mongoose';
import { BankStatement } from '../../schemas/bank-statement.schema';
import { BankReconciliation } from '../../schemas/bank-reconciliation.schema';
import { JournalEntry } from '../../schemas/journal-entry.schema';
import { BankTransaction } from '../../schemas/bank-transaction.schema';
import { BankStatementImport } from '../../schemas/bank-statement-import.schema';
import { BankTransactionsService } from '../bank-accounts/bank-transactions.service';
import { BankAccountsService } from '../bank-accounts/bank-accounts.service';
import { PaymentsService } from '../payments/payments.service';
import { Types } from 'mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('BankReconciliationService', () => {
  let service: BankReconciliationService;
  let bankStatementModel: any;
  let bankReconciliationModel: any;
  let journalEntryModel: any;
  let bankTransactionModel: any;
  let statementImportModel: any;
  let bankTransactionsService: any;
  let bankAccountsService: any;
  let paymentsService: any;

  const mockTenantId = new Types.ObjectId().toString();
  const mockBankAccountId = new Types.ObjectId().toString();
  const mockStatementId = new Types.ObjectId().toString();
  const mockReconciliationId = new Types.ObjectId().toString();
  const mockUserId = '65e0f8c2d7a7b1c5e4f1a0b2';

  beforeEach(async () => {
    bankStatementModel = {
      findOne: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      findById: jest.fn(),
      updateOne: jest.fn(),
      countDocuments: jest.fn(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    bankReconciliationModel = {
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    journalEntryModel = {};

    bankTransactionModel = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    statementImportModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findOne: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    bankTransactionsService = {
      findById: jest.fn(),
      markAsReconciled: jest.fn(),
      markAsPending: jest.fn(),
    };

    bankAccountsService = {
      setCurrentBalance: jest.fn(),
    };

    paymentsService = {
      reconcile: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankReconciliationService,
        {
          provide: getModelToken(BankStatement.name),
          useValue: bankStatementModel,
        },
        {
          provide: getModelToken(BankReconciliation.name),
          useValue: bankReconciliationModel,
        },
        {
          provide: getModelToken(JournalEntry.name),
          useValue: journalEntryModel,
        },
        {
          provide: getModelToken(BankTransaction.name),
          useValue: bankTransactionModel,
        },
        {
          provide: getModelToken(BankStatementImport.name),
          useValue: statementImportModel,
        },
        {
          provide: BankTransactionsService,
          useValue: bankTransactionsService,
        },
        {
          provide: BankAccountsService,
          useValue: bankAccountsService,
        },
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    }).compile();

    service = module.get<BankReconciliationService>(BankReconciliationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBankStatement', () => {
    it('should create a bank statement successfully', async () => {
      // Arrange
      const dto = {
        statementDate: new Date().toISOString(),
        startingBalance: 1000,
        endingBalance: 1500,
        currency: 'USD',
        transactions: [
          {
            date: new Date().toISOString(),
            description: 'Payment received',
            amount: 500,
            type: 'credit' as const,
            reference: 'REF-001',
          },
        ],
      };

      const mockStatement: any = {
        _id: mockStatementId,
        tenantId: new Types.ObjectId(mockTenantId),
        bankAccountId: new Types.ObjectId(mockBankAccountId),
        statementDate: new Date(dto.statementDate),
        startingBalance: dto.startingBalance,
        endingBalance: dto.endingBalance,
        currency: dto.currency,
        transactions: dto.transactions,
      };

      mockStatement.save = jest.fn().mockResolvedValue(mockStatement);

      (service as any).bankStatementModel = jest.fn().mockImplementation(() => mockStatement);

      // Act
      const result = await service.createBankStatement(
        mockTenantId,
        mockBankAccountId,
        dto,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockStatement.save).toHaveBeenCalled();
    });
  });

  describe('getBankStatement', () => {
    it('should return a bank statement when found', async () => {
      // Arrange
      const mockStatement = {
        _id: mockStatementId,
        tenantId: new Types.ObjectId(mockTenantId),
        statementDate: new Date(),
        startingBalance: 1000,
        endingBalance: 1500,
      };

      bankStatementModel.exec.mockResolvedValue(mockStatement);

      // Act
      const result = await service.getBankStatement(mockTenantId, mockStatementId);

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toBe(mockStatementId);
    });

    it('should throw NotFoundException when statement not found', async () => {
      // Arrange
      bankStatementModel.exec.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getBankStatement(mockTenantId, mockStatementId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listBankStatements', () => {
    it('should list bank statements with pagination', async () => {
      // Arrange
      const mockStatements = [
        {
          _id: mockStatementId,
          statementDate: new Date(),
          startingBalance: 1000,
          endingBalance: 1500,
        },
      ];

      bankStatementModel.exec.mockResolvedValue(mockStatements);
      bankStatementModel.countDocuments.mockResolvedValue(1);

      // Act
      const result = await service.listBankStatements(mockTenantId, mockBankAccountId, 1, 20);

      // Assert
      expect(result).toBeDefined();
      expect(result.data).toEqual(mockStatements);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(1);
      expect(result.pagination.totalPages).toBe(1);
    });
  });

  describe('startReconciliation', () => {
    it('should start a new reconciliation process', async () => {
      // Arrange
      const mockStatement = {
        _id: new Types.ObjectId(mockStatementId),
        tenantId: new Types.ObjectId(mockTenantId),
        bankAccountId: new Types.ObjectId(mockBankAccountId),
        endingBalance: 1500,
        transactions: [{ _id: new Types.ObjectId(), amount: 500 }],
        status: 'imported',
        save: jest.fn().mockResolvedValue(undefined),
      };

      const mockReconciliation: any = {
        _id: mockReconciliationId,
        tenantId: mockStatement.tenantId,
        bankStatementId: mockStatement._id,
        status: 'in_progress',
        summary: {
          totalTransactions: 1,
          matched: 0,
          outstanding: 1,
        },
      };

      mockReconciliation.save = jest.fn().mockResolvedValue(mockReconciliation);

      bankStatementModel.findOne.mockResolvedValue(mockStatement);
      (service as any).bankReconciliationModel = jest
        .fn()
        .mockImplementation(() => mockReconciliation);

      // Act
      const result = await service.startReconciliation(
        mockTenantId,
        mockStatementId,
        mockUserId,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.status).toBe('in_progress');
      expect(mockStatement.status).toBe('reconciling');
      expect(mockStatement.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException when statement not found', async () => {
      // Arrange
      bankStatementModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.startReconciliation(mockTenantId, mockStatementId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getReconciliation', () => {
    it('should return a reconciliation when found', async () => {
      // Arrange
      const mockReconciliation = {
        _id: mockReconciliationId,
        tenantId: new Types.ObjectId(mockTenantId),
        status: 'in_progress',
      };

      bankReconciliationModel.exec.mockResolvedValue(mockReconciliation);

      // Act
      const result = await service.getReconciliation(mockTenantId, mockReconciliationId);

      // Assert
      expect(result).toBeDefined();
      expect(result._id).toBe(mockReconciliationId);
    });

    it('should throw NotFoundException when reconciliation not found', async () => {
      // Arrange
      bankReconciliationModel.exec.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.getReconciliation(mockTenantId, mockReconciliationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('matchTransaction', () => {
    it('should match a statement transaction with a bank transaction', async () => {
      // Arrange
      const statementTransactionId = new Types.ObjectId().toString();
      const bankTransactionId = new Types.ObjectId().toString();

      const dto = {
        statementTransactionId,
        bankTransactionId,
      };

      const mockReconciliation = {
        _id: new Types.ObjectId(mockReconciliationId),
        bankStatementId: new Types.ObjectId(mockStatementId),
        status: 'in_progress',
        clearedTransactions: [],
        summary: {
          matched: 0,
          outstanding: 1,
        },
        save: jest.fn().mockResolvedValue(undefined),
      };

      const mockStatement = {
        _id: new Types.ObjectId(mockStatementId),
        transactions: [
          {
            _id: new Types.ObjectId(statementTransactionId),
            amount: 500,
            status: 'unmatched',
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      const mockBankTransaction = {
        _id: new Types.ObjectId(bankTransactionId),
        amount: 500,
      };

      bankReconciliationModel.findOne.mockResolvedValue(mockReconciliation);
      bankStatementModel.findById.mockResolvedValue(mockStatement);
      bankTransactionsService.findById.mockResolvedValue(mockBankTransaction);

      // Act
      await service.matchTransaction(mockTenantId, mockReconciliationId, dto, mockUserId);

      // Assert
      expect(bankTransactionsService.markAsReconciled).toHaveBeenCalledWith(
        bankTransactionId,
        mockReconciliationId,
        statementTransactionId,
        mockUserId,
      );
      expect(mockStatement.transactions[0].status).toBe('matched');
      expect(mockReconciliation.clearedTransactions).toContain(mockBankTransaction._id);
      expect(mockReconciliation.summary.matched).toBe(1);
    });
  });

  describe('unmatchTransaction', () => {
    it('should unmatch a previously matched transaction', async () => {
      // Arrange
      const statementTransactionId = new Types.ObjectId().toString();
      const bankTransactionId = new Types.ObjectId();

      const mockReconciliation = {
        _id: new Types.ObjectId(mockReconciliationId),
        bankStatementId: new Types.ObjectId(mockStatementId),
        clearedTransactions: [bankTransactionId],
        summary: {
          matched: 1,
          outstanding: 0,
        },
        save: jest.fn().mockResolvedValue(undefined),
      };

      const mockStatement = {
        _id: new Types.ObjectId(mockStatementId),
        transactions: [
          {
            _id: new Types.ObjectId(statementTransactionId),
            amount: 500,
            status: 'matched',
            bankTransactionId: bankTransactionId,
          },
        ],
        save: jest.fn().mockResolvedValue(undefined),
      };

      bankReconciliationModel.findOne.mockResolvedValue(mockReconciliation);
      bankStatementModel.findById.mockResolvedValue(mockStatement);

      // Act
      await service.unmatchTransaction(
        mockTenantId,
        mockReconciliationId,
        statementTransactionId,
      );

      // Assert
      expect(bankTransactionsService.markAsPending).toHaveBeenCalledWith(
        bankTransactionId.toString(),
      );
      expect(mockStatement.transactions[0].status).toBe('unmatched');
      expect(mockStatement.transactions[0].bankTransactionId).toBeUndefined();
      expect(mockReconciliation.summary.matched).toBe(0);
      expect(mockReconciliation.summary.outstanding).toBe(1);
    });
  });

  describe('completeReconciliation', () => {
    it('should complete a reconciliation process', async () => {
      // Arrange
      const mockReconciliation: any = {
        _id: new Types.ObjectId(mockReconciliationId),
        bankStatementId: new Types.ObjectId(mockStatementId),
        tenantId: new Types.ObjectId(mockTenantId),
        status: 'in_progress',
        summary: {},
        save: jest.fn().mockResolvedValue(undefined),
      };

      bankReconciliationModel.findOne.mockResolvedValue(mockReconciliation);
      bankStatementModel.updateOne.mockResolvedValue({ modifiedCount: 1 });

      // Act
      await service.completeReconciliation(mockTenantId, mockReconciliationId, mockUserId);

      // Assert
      expect(mockReconciliation.status).toBe('completed');
      expect(mockReconciliation.completedBy).toEqual(new Types.ObjectId(mockUserId));
      expect(mockReconciliation.completedAt).toBeDefined();
      expect(mockReconciliation.save).toHaveBeenCalled();
      expect(bankStatementModel.updateOne).toHaveBeenCalledWith(
        { _id: mockReconciliation.bankStatementId },
        { $set: { status: 'reconciled' } },
      );
    });
  });

  describe('manualReconcile', () => {
    it('should manually reconcile a transaction', async () => {
      // Arrange
      const transactionId = new Types.ObjectId().toString();
      const dto = {
        transactionId,
        bankAmount: 500,
        bankReference: 'REF-123',
        bankDate: new Date().toISOString(),
      };

      const mockTransaction: any = {
        _id: new Types.ObjectId(transactionId),
        tenantId: new Types.ObjectId(mockTenantId),
        reconciled: false,
        metadata: {},
        save: jest.fn().mockResolvedValue(undefined),
      };

      bankTransactionModel.findOne.mockResolvedValue(mockTransaction);

      // Act
      const result = await service.manualReconcile(dto, mockTenantId, { id: mockUserId });

      // Assert
      expect(result).toBeDefined();
      expect(mockTransaction.reconciled).toBe(true);
      expect(mockTransaction.reconciledAt).toBeDefined();
      expect(mockTransaction.reconciliationStatus).toBe('manually_matched');
      expect(mockTransaction.metadata.bankAmount).toBe(dto.bankAmount);
      expect(mockTransaction.metadata.reconciledManually).toBe(true);
      expect(mockTransaction.save).toHaveBeenCalled();
    });
  });

});
