import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { WithholdingService } from './withholding.service';
import {
  WithholdingDocument,
  IVA_RETENTION_PERCENTAGES,
} from '../../schemas/withholding-document.schema';
import { BillingDocument } from '../../schemas/billing-document.schema';
import { DocumentSequence } from '../../schemas/document-sequence.schema';
import { NumberingService } from './numbering.service';
import { ImprentaProviderFactory } from './providers/imprenta-provider.factory';
import { HkaWithholdingMapper } from './mappers/hka-withholding.mapper';
import { ImprentaFailure } from '../../schemas/imprenta-failure.schema';
import { Tenant } from '../../schemas/tenant.schema';
import {
  CreateIvaRetentionDto,
  CreateIslrRetentionDto,
  IssueWithholdingDto,
} from '../../dto/withholding.dto';

describe('WithholdingService', () => {
  let service: WithholdingService;
  let withholdingModel: Model<WithholdingDocument>;
  let billingModel: Model<BillingDocument>;
  let sequenceModel: Model<DocumentSequence>;
  let tenantModel: Model<Tenant>;
  let numberingService: NumberingService;
  let imprentaProviderFactory: ImprentaProviderFactory;
  let hkaWithholdingMapper: HkaWithholdingMapper;
  let imprentaFailureModel: Model<ImprentaFailure>;

  const mockTenantId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockInvoiceId = '507f1f77bcf86cd799439013';
  const mockSeriesId = '507f1f77bcf86cd799439014';

  // Mock class for creating new WithholdingDocument instances
  class MockWithholdingModel {
    static findOne = jest.fn();
    static find = jest.fn();

    [key: string]: any;

    constructor(data: any) {
      Object.assign(this, data);
    }
    async save() {
      return this;
    }
  }

  const mockInvoice = {
    _id: mockInvoiceId,
    tenantId: mockTenantId,
    documentNumber: 'FAC-0001',
    controlNumber: '12345678',
    status: 'issued',
    issueDate: new Date('2024-01-15'),
    customer: {
      name: 'Cliente Test',
      taxId: 'J-12345678-9',
      address: 'Dirección Test',
      email: 'cliente@test.com',
      phone: '+58-412-1234567',
    },
    totals: {
      subtotal: 1000,
      taxableAmount: 1000,
      taxes: [
        {
          type: 'IVA',
          rate: 16,
          amount: 160,
        },
      ],
      grandTotal: 1160,
      currency: 'VES',
      exchangeRate: 36.5,
    },
    metadata: {
      series: 'FAC',
    },
  };

  const mockSeries = {
    _id: mockSeriesId,
    tenantId: mockTenantId,
    prefix: 'RET-IVA',
    documentType: '05',
    currentNumber: 100,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithholdingService,
        {
          provide: getModelToken(WithholdingDocument.name),
          useValue: MockWithholdingModel,
        },
        {
          provide: getModelToken(BillingDocument.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(DocumentSequence.name),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: NumberingService,
          useValue: {
            getNextNumber: jest.fn(),
          },
        },
        {
          provide: ImprentaProviderFactory,
          useValue: {
            getProvider: jest.fn().mockReturnValue({
              getProviderName: jest.fn().mockReturnValue('MockProvider'),
              requestControlNumber: jest.fn(),
            }),
          },
        },
        {
          provide: HkaWithholdingMapper,
          useValue: {
            toHkaJson: jest.fn(),
          },
        },
        {
          provide: getModelToken(ImprentaFailure.name),
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<WithholdingService>(WithholdingService);
    withholdingModel = module.get(getModelToken(WithholdingDocument.name)) as any;
    billingModel = module.get<Model<BillingDocument>>(
      getModelToken(BillingDocument.name),
    );
    sequenceModel = module.get<Model<DocumentSequence>>(
      getModelToken(DocumentSequence.name),
    );
    tenantModel = module.get<Model<Tenant>>(getModelToken(Tenant.name));
    numberingService = module.get<NumberingService>(NumberingService);
    imprentaProviderFactory = module.get<ImprentaProviderFactory>(ImprentaProviderFactory);
    hkaWithholdingMapper = module.get<HkaWithholdingMapper>(HkaWithholdingMapper);
    imprentaFailureModel = module.get<Model<ImprentaFailure>>(getModelToken(ImprentaFailure.name));
  });

  describe('createIvaRetention', () => {
    const createDto: CreateIvaRetentionDto = {
      affectedDocumentId: mockInvoiceId,
      retentionPercentage: 75,
      seriesId: mockSeriesId,
      operationDate: '2024-01-15',
      notes: 'Test retention',
    };

    beforeEach(() => {
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(mockInvoice as any);
      jest.spyOn(sequenceModel, 'findOne').mockResolvedValue(mockSeries as any);
      jest
        .spyOn(numberingService, 'getNextNumber')
        .mockResolvedValue('RET-IVA-0101');
    });

    it('should create IVA retention with 75% percentage', async () => {
      MockWithholdingModel.findOne.mockResolvedValue(null);

      const result = await service.createIvaRetention(
        createDto,
        mockTenantId,
        mockUserId,
      );

      expect(billingModel.findOne).toHaveBeenCalledWith({
        _id: mockInvoiceId,
        tenantId: mockTenantId,
      });

      expect(MockWithholdingModel.findOne).toHaveBeenCalledWith({
        affectedDocumentId: mockInvoiceId,
        type: 'iva',
        tenantId: mockTenantId,
        status: { $ne: 'archived' },
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('iva');
      expect(result.documentNumber).toBe('RET-IVA-0101');
    });

    it('should calculate IVA retention correctly for 75%', async () => {
      MockWithholdingModel.findOne.mockResolvedValue(null);

      const result = await service.createIvaRetention(createDto, mockTenantId, mockUserId);

      // Calculate expected retention
      const taxAmount = 160; // From mockInvoice
      const retentionFactor = IVA_RETENTION_PERCENTAGES[75];
      const expectedRetention = Math.round(taxAmount * retentionFactor * 100) / 100;

      expect(result.ivaRetention!.retentionAmount).toBe(expectedRetention);
      expect(result.ivaRetention!.baseAmount).toBe(1000);
      expect(result.ivaRetention!.taxRate).toBe(16);
      expect(result.ivaRetention!.taxAmount).toBe(160);
    });

    it('should calculate IVA retention correctly for 100%', async () => {
      MockWithholdingModel.findOne.mockResolvedValue(null);

      const dto100: CreateIvaRetentionDto = {
        ...createDto,
        retentionPercentage: 100,
      };

      const result = await service.createIvaRetention(dto100, mockTenantId, mockUserId);

      const taxAmount = 160;
      const retentionFactor = IVA_RETENTION_PERCENTAGES[100];
      const expectedRetention = Math.round(taxAmount * retentionFactor * 100) / 100;

      expect(result.ivaRetention!.retentionAmount).toBe(expectedRetention);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.createIvaRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invoice is not issued', async () => {
      const draftInvoice = { ...mockInvoice, status: 'draft' };
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(draftInvoice as any);

      await expect(
        service.createIvaRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if IVA retention already exists', async () => {
      const existingRetention = {
        _id: new Types.ObjectId(),
        type: 'iva',
        status: 'issued',
      };
      MockWithholdingModel.findOne.mockResolvedValue(existingRetention as any);

      await expect(
        service.createIvaRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if series not found', async () => {
      jest.spyOn(withholdingModel, 'findOne').mockResolvedValue(null);
      jest.spyOn(sequenceModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.createIvaRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createIslrRetention', () => {
    const createDto: CreateIslrRetentionDto = {
      affectedDocumentId: mockInvoiceId,
      conceptCode: 'H001',
      conceptDescription: 'Honorarios Profesionales',
      retentionPercentage: 3,
      seriesId: mockSeriesId,
      baseAmount: 1000,
      sustraendo: 10,
      notes: 'Test ISLR retention',
    };

    beforeEach(() => {
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(mockInvoice as any);
      jest.spyOn(sequenceModel, 'findOne').mockResolvedValue(mockSeries as any);
      jest
        .spyOn(numberingService, 'getNextNumber')
        .mockResolvedValue('RET-ISLR-0201');
    });

    it('should create ISLR retention with sustraendo', async () => {
      const result = await service.createIslrRetention(createDto, mockTenantId, mockUserId);

      // baseAmount * (retentionPercentage / 100) - sustraendo
      // 1000 * 0.03 - 10 = 30 - 10 = 20
      const expectedRetention = Math.max(0, 1000 * 0.03 - 10);
      const roundedRetention = Math.round(expectedRetention * 100) / 100;

      expect(result.islrRetention!.retentionAmount).toBe(roundedRetention);
      expect(result.islrRetention!.baseAmount).toBe(1000);
      expect(result.islrRetention!.retentionPercentage).toBe(3);
      expect(result.islrRetention!.sustraendo).toBe(10);
    });

    it('should create ISLR retention without sustraendo', async () => {
      const dtoNoSustraendo = { ...createDto };
      delete dtoNoSustraendo.sustraendo;

      const result = await service.createIslrRetention(dtoNoSustraendo, mockTenantId, mockUserId);

      // baseAmount * (retentionPercentage / 100)
      // 1000 * 0.03 = 30
      const expectedRetention = Math.round(1000 * 0.03 * 100) / 100;

      expect(result.islrRetention!.retentionAmount).toBe(expectedRetention);
    });

    it('should not allow negative retention with large sustraendo', async () => {
      const dtoLargeSustraendo = { ...createDto, sustraendo: 100 };

      const result = await service.createIslrRetention(dtoLargeSustraendo, mockTenantId, mockUserId);

      // 1000 * 0.03 - 100 = 30 - 100 = -70 → max(0, -70) = 0
      expect(result.islrRetention!.retentionAmount).toBe(0);
    });

    it('should throw NotFoundException if invoice not found', async () => {
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(null);

      await expect(
        service.createIslrRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if invoice is not issued', async () => {
      const draftInvoice = { ...mockInvoice, status: 'draft' };
      jest.spyOn(billingModel, 'findOne').mockResolvedValue(draftInvoice as any);

      await expect(
        service.createIslrRetention(createDto, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('issue', () => {
    const mockRetentionId = '507f1f77bcf86cd799439015';

    it('should issue a draft retention with HKA Factory', async () => {
      const draftRetention = {
        _id: mockRetentionId,
        tenantId: mockTenantId,
        seriesId: mockSeriesId,
        documentNumber: 'RET-IVA-0101',
        type: 'iva',
        status: 'draft',
        controlNumber: undefined as any,
        issueDate: undefined as any,
        issuedBy: undefined as any,
        taxInfo: {},
        metadata: {},
        toObject: jest.fn().mockReturnValue({}),
        save: jest.fn().mockResolvedValue({
          status: 'issued',
          issueDate: expect.any(Date),
        }),
      };

      MockWithholdingModel.findOne.mockResolvedValue(draftRetention as any);

      const issueDto: IssueWithholdingDto = {
        fiscalInfo: {
          period: '2024-01',
          declarationNumber: 'DEC-001',
        },
      };

      // Mock HKA mapper
      const mockHkaJson = { documentoElectronico: {} };
      jest.spyOn(hkaWithholdingMapper, 'toHkaJson').mockReturnValue(mockHkaJson);

      // Mock imprenta provider
      const mockProvider = {
        getProviderName: jest.fn().mockReturnValue('HKA Factory'),
        requestControlNumber: jest.fn().mockResolvedValue({
          controlNumber: '12345678',
          success: true,
          metadata: {
            transaccionId: 'TXN-123',
            fechaAsignacion: '2024-01-15',
          },
        }),
      };
      jest.spyOn(imprentaProviderFactory, 'getProvider').mockReturnValue(mockProvider as any);

      const result = await service.issue(
        mockRetentionId,
        issueDto,
        mockTenantId,
        mockUserId,
      );

      expect(hkaWithholdingMapper.toHkaJson).toHaveBeenCalledWith(draftRetention);
      expect(mockProvider.requestControlNumber).toHaveBeenCalledWith({
        documentId: mockRetentionId,
        tenantId: mockTenantId,
        seriesId: mockSeriesId,
        documentNumber: 'RET-IVA-0101',
        type: '05',
        metadata: {
          hkaJson: mockHkaJson,
          retentionType: 'iva',
        },
      });
      expect(draftRetention.controlNumber).toBe('12345678');
      expect(draftRetention.status).toBe('issued');
      expect(draftRetention.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if retention not found', async () => {
      MockWithholdingModel.findOne.mockResolvedValue(null);

      await expect(
        service.issue(mockRetentionId, {}, mockTenantId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return retention if already issued', async () => {
      const issuedRetention = {
        _id: mockRetentionId,
        tenantId: mockTenantId,
        status: 'issued',
      };

      MockWithholdingModel.findOne.mockResolvedValue(issuedRetention as any);

      const result = await service.issue(
        mockRetentionId,
        {},
        mockTenantId,
        mockUserId,
      );

      expect(result).toEqual(issuedRetention);
    });

    it('should handle HKA Factory error and log failure', async () => {
      const draftRetention = {
        _id: mockRetentionId,
        tenantId: mockTenantId,
        seriesId: mockSeriesId,
        documentNumber: 'RET-IVA-0101',
        type: 'iva',
        status: 'draft',
        controlNumber: undefined as any,
        issueDate: undefined as any,
        issuedBy: undefined as any,
        taxInfo: {},
        metadata: {},
        toObject: jest.fn().mockReturnValue({}),
        save: jest.fn(),
      };

      MockWithholdingModel.findOne.mockResolvedValue(draftRetention as any);

      // Mock HKA mapper
      const mockHkaJson = { documentoElectronico: {} };
      jest.spyOn(hkaWithholdingMapper, 'toHkaJson').mockReturnValue(mockHkaJson);

      // Mock imprenta provider to throw error
      const mockProvider = {
        getProviderName: jest.fn().mockReturnValue('HKA Factory'),
        requestControlNumber: jest.fn().mockRejectedValue(new Error('HKA API Error')),
      };
      jest.spyOn(imprentaProviderFactory, 'getProvider').mockReturnValue(mockProvider as any);
      jest.spyOn(imprentaFailureModel, 'create').mockResolvedValue({} as any);

      await expect(
        service.issue(mockRetentionId, {}, mockTenantId, mockUserId),
      ).rejects.toThrow('Error al emitir retención');

      expect(imprentaFailureModel.create).toHaveBeenCalledWith({
        documentId: mockRetentionId,
        documentType: '05',
        documentNumber: 'RET-IVA-0101',
        tenantId: mockTenantId,
        errorMessage: 'HKA API Error',
        errorStack: expect.any(String),
        payload: {},
        retryCount: 0,
        nextRetryAt: expect.any(Date),
      });
    });
  });

  describe('findByInvoice', () => {
    it('should return all retentions for an invoice', async () => {
      const mockRetentions = [
        {
          _id: new Types.ObjectId(),
          type: 'iva',
          status: 'issued',
          affectedDocumentId: mockInvoiceId,
        },
        {
          _id: new Types.ObjectId(),
          type: 'islr',
          status: 'issued',
          affectedDocumentId: mockInvoiceId,
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRetentions),
      };

      MockWithholdingModel.find.mockReturnValue(mockQuery as any);

      const result = await service.findByInvoice(mockInvoiceId, mockTenantId);

      expect(MockWithholdingModel.find).toHaveBeenCalledWith({
        affectedDocumentId: mockInvoiceId,
        tenantId: mockTenantId,
        status: { $ne: 'archived' },
      });

      expect(result).toEqual(mockRetentions);
    });
  });

  describe('calculateTotalRetentions', () => {
    it('should calculate total IVA and ISLR retentions', async () => {
      const mockRetentions = [
        {
          type: 'iva',
          status: 'issued',
          totals: { totalRetention: 120 },
        },
        {
          type: 'islr',
          status: 'issued',
          totals: { totalRetention: 30 },
        },
        {
          type: 'iva',
          status: 'draft', // Should not be counted
          totals: { totalRetention: 50 },
        },
      ];

      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockRetentions),
      };

      MockWithholdingModel.find.mockReturnValue(mockQuery as any);

      const result = await service.calculateTotalRetentions(
        mockInvoiceId,
        mockTenantId,
      );

      expect(result.totalIva).toBe(120);
      expect(result.totalIslr).toBe(30);
      expect(result.total).toBe(150);
    });

    it('should return zeros if no issued retentions exist', async () => {
      const mockQuery = {
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };

      MockWithholdingModel.find.mockReturnValue(mockQuery as any);

      const result = await service.calculateTotalRetentions(
        mockInvoiceId,
        mockTenantId,
      );

      expect(result.totalIva).toBe(0);
      expect(result.totalIslr).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('cancel', () => {
    it('should cancel a retention', async () => {
      const mockRetention = {
        _id: new Types.ObjectId(),
        documentNumber: 'RET-IVA-0101',
        status: 'issued',
        save: jest.fn().mockResolvedValue({ status: 'archived' }),
      };

      MockWithholdingModel.findOne.mockResolvedValue(mockRetention as any);

      await service.cancel(mockRetention._id.toString(), mockTenantId);

      expect(mockRetention.status).toBe('archived');
      expect(mockRetention.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if retention not found', async () => {
      MockWithholdingModel.findOne.mockResolvedValue(null);

      await expect(
        service.cancel('nonexistent-id', mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
