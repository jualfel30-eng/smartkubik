import { Test, TestingModule } from '@nestjs/testing';
import { BankAccountsService } from './bank-accounts.service';
import { getModelToken } from '@nestjs/mongoose';
import { BankAccount } from '../../schemas/bank-account.schema';
import { BankAlertsService } from './bank-alerts.service';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';

describe('BankAccountsService', () => {
  let service: BankAccountsService;
  let bankAccountModel: any;
  let bankAlertsService: any;

  const mockTenantId = new Types.ObjectId().toString();
  const mockAccountId = new Types.ObjectId().toString();

  beforeEach(async () => {
    // Mock del modelo BankAccount
    bankAccountModel = {
      find: jest.fn().mockReturnThis(),
      findOne: jest.fn().mockReturnThis(),
      findOneAndUpdate: jest.fn().mockReturnThis(),
      deleteOne: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      session: jest.fn().mockReturnThis(),
      exec: jest.fn(),
    };

    // Mock del servicio de alertas
    bankAlertsService = {
      evaluateBalance: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountsService,
        {
          provide: getModelToken(BankAccount.name),
          useValue: bankAccountModel,
        },
        {
          provide: BankAlertsService,
          useValue: bankAlertsService,
        },
      ],
    }).compile();

    service = module.get<BankAccountsService>(BankAccountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new bank account successfully', async () => {
      // Arrange
      const createDto = {
        bankName: 'Banco Nacional',
        accountNumber: '1234567890',
        accountType: 'corriente' as const,
        currency: 'USD',
        initialBalance: 1000,
        alertEnabled: true,
        minimumBalance: 100,
      };

      const mockSave = jest.fn().mockResolvedValue({
        _id: mockAccountId,
        ...createDto,
        currentBalance: createDto.initialBalance,
        tenantId: mockTenantId,
      });

      (service as any).bankAccountModel = jest.fn().mockImplementation(() => ({
        save: mockSave,
      }));

      // Act
      const result = await service.create(createDto, mockTenantId);

      // Assert
      expect(result).toBeDefined();
      expect(result.bankName).toBe(createDto.bankName);
      expect(result.currentBalance).toBe(createDto.initialBalance);
      expect(mockSave).toHaveBeenCalled();
      expect(bankAlertsService.evaluateBalance).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return only active accounts by default', async () => {
      // Arrange
      const mockAccounts = [
        { _id: '1', bankName: 'Bank A', isActive: true },
        { _id: '2', bankName: 'Bank B', isActive: true },
      ];

      bankAccountModel.exec.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.findAll(mockTenantId, false);

      // Assert
      expect(result).toEqual(mockAccounts);
      expect(bankAccountModel.find).toHaveBeenCalled();
      expect(bankAccountModel.sort).toHaveBeenCalledWith({
        bankName: 1,
        accountNumber: 1,
      });
    });

    it('should return all accounts when includeInactive is true', async () => {
      // Arrange
      const mockAccounts = [
        { _id: '1', bankName: 'Bank A', isActive: true },
        { _id: '2', bankName: 'Bank B', isActive: false },
      ];

      bankAccountModel.exec.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.findAll(mockTenantId, true);

      // Assert
      expect(result).toEqual(mockAccounts);
      expect(bankAccountModel.find).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a bank account when found', async () => {
      // Arrange
      const mockAccount = {
        _id: mockAccountId,
        bankName: 'Test Bank',
        accountNumber: '1234567890',
        currentBalance: 5000,
      };

      bankAccountModel.exec.mockResolvedValue(mockAccount);

      // Act
      const result = await service.findOne(mockAccountId, mockTenantId);

      // Assert
      expect(result).toEqual(mockAccount);
      expect(bankAccountModel.findOne).toHaveBeenCalled();
      expect(bankAccountModel.session).toHaveBeenCalledWith(null);
    });

    it('should throw NotFoundException when account not found', async () => {
      // Arrange
      bankAccountModel.exec.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findOne(mockAccountId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a bank account successfully', async () => {
      // Arrange
      const updateDto = {
        bankName: 'Updated Bank Name',
        alertEnabled: true,
        minimumBalance: 500,
      };

      const mockUpdated = {
        _id: mockAccountId,
        ...updateDto,
        currentBalance: 1000,
      };

      bankAccountModel.exec.mockResolvedValue(mockUpdated);

      // Act
      const result = await service.update(
        mockAccountId,
        updateDto,
        mockTenantId,
      );

      // Assert
      expect(result).toEqual(mockUpdated);
      expect(bankAccountModel.findOneAndUpdate).toHaveBeenCalled();
      expect(bankAlertsService.evaluateBalance).toHaveBeenCalled();
    });

    it('should throw NotFoundException when updating non-existent account', async () => {
      // Arrange
      const updateDto = { bankName: 'Test' };
      bankAccountModel.exec.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.update(mockAccountId, updateDto, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete a bank account successfully', async () => {
      // Arrange
      bankAccountModel.exec.mockResolvedValue({ deletedCount: 1 });

      // Act
      await service.delete(mockAccountId, mockTenantId);

      // Assert
      expect(bankAccountModel.deleteOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when deleting non-existent account', async () => {
      // Arrange
      bankAccountModel.exec.mockResolvedValue({ deletedCount: 0 });

      // Act & Assert
      await expect(
        service.delete(mockAccountId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('adjustBalance', () => {
    it('should increase balance correctly', async () => {
      // Arrange
      const mockAccount = {
        _id: mockAccountId,
        currentBalance: 1000,
      };

      const adjustDto = {
        type: 'increase' as const,
        amount: 500,
        reason: 'Deposit',
      };

      const mockUpdated = {
        _id: mockAccountId,
        currentBalance: 1500,
      };

      // Mock findOne
      bankAccountModel.exec.mockResolvedValueOnce(mockAccount);
      // Mock findOneAndUpdate
      bankAccountModel.exec.mockResolvedValueOnce(mockUpdated);

      // Act
      const result = await service.adjustBalance(
        mockAccountId,
        adjustDto,
        mockTenantId,
      );

      // Assert
      expect(result.currentBalance).toBe(1500);
      expect(bankAlertsService.evaluateBalance).toHaveBeenCalled();
    });

    it('should decrease balance correctly', async () => {
      // Arrange
      const mockAccount = {
        _id: mockAccountId,
        currentBalance: 1000,
      };

      const adjustDto = {
        type: 'decrease' as const,
        amount: 300,
        reason: 'Withdrawal',
      };

      const mockUpdated = {
        _id: mockAccountId,
        currentBalance: 700,
      };

      bankAccountModel.exec.mockResolvedValueOnce(mockAccount);
      bankAccountModel.exec.mockResolvedValueOnce(mockUpdated);

      // Act
      const result = await service.adjustBalance(
        mockAccountId,
        adjustDto,
        mockTenantId,
      );

      // Assert
      expect(result.currentBalance).toBe(700);
    });
  });

  describe('updateBalance', () => {
    it('should update balance using $inc operator', async () => {
      // Arrange
      const mockAccount = {
        _id: mockAccountId,
        currentBalance: 1000,
      };

      const mockUpdated = {
        _id: mockAccountId,
        currentBalance: 1250,
      };

      bankAccountModel.exec.mockResolvedValueOnce(mockAccount);
      bankAccountModel.exec.mockResolvedValueOnce(mockUpdated);

      // Act
      const result = await service.updateBalance(
        mockAccountId,
        250,
        mockTenantId,
      );

      // Assert
      expect(result.currentBalance).toBe(1250);
      expect(bankAccountModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        { $inc: { currentBalance: 250 } },
        { new: true },
      );
    });
  });

  describe('getTotalBalance', () => {
    it('should return total balance for all active accounts', async () => {
      // Arrange
      const mockAccounts = [
        { currentBalance: 1000, isActive: true, currency: 'USD' },
        { currentBalance: 2500, isActive: true, currency: 'USD' },
        { currentBalance: 1500, isActive: true, currency: 'USD' },
      ];

      bankAccountModel.exec.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getTotalBalance(mockTenantId);

      // Assert
      expect(result).toBe(5000);
    });

    it('should return total balance filtered by currency', async () => {
      // Arrange
      const mockAccounts = [
        { currentBalance: 1000, isActive: true, currency: 'VES' },
        { currentBalance: 500, isActive: true, currency: 'VES' },
      ];

      bankAccountModel.exec.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getTotalBalance(mockTenantId, 'VES');

      // Assert
      expect(result).toBe(1500);
    });
  });

  describe('getBalancesByCurrency', () => {
    it('should group balances by currency', async () => {
      // Arrange
      const mockAccounts = [
        { currency: 'USD', currentBalance: 1000, isActive: true },
        { currency: 'USD', currentBalance: 2000, isActive: true },
        { currency: 'VES', currentBalance: 50000, isActive: true },
        { currency: 'EUR', currentBalance: 800, isActive: true },
      ];

      bankAccountModel.exec.mockResolvedValue(mockAccounts);

      // Act
      const result = await service.getBalancesByCurrency(mockTenantId);

      // Assert
      expect(result).toEqual({
        USD: 3000,
        VES: 50000,
        EUR: 800,
      });
    });

    it('should return empty object when no accounts exist', async () => {
      // Arrange
      bankAccountModel.exec.mockResolvedValue([]);

      // Act
      const result = await service.getBalancesByCurrency(mockTenantId);

      // Assert
      expect(result).toEqual({});
    });
  });
});
