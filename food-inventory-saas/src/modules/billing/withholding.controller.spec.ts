import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WithholdingController } from './withholding.controller';
import { WithholdingService } from './withholding.service';
import { WithholdingPdfService } from './withholding-pdf.service';
import { WithholdingReportsService } from './withholding-reports.service';
import {
  CreateIvaRetentionDto,
  CreateIslrRetentionDto,
  IssueWithholdingDto,
  WithholdingFiltersDto,
} from '../../dto/withholding.dto';

describe('WithholdingController', () => {
  let controller: WithholdingController;
  let service: WithholdingService;

  const mockTenantId = '507f1f77bcf86cd799439011';
  const mockUserId = '507f1f77bcf86cd799439012';
  const mockInvoiceId = '507f1f77bcf86cd799439013';
  const mockRetentionId = '507f1f77bcf86cd799439014';

  const mockRequest = {
    user: {
      tenantId: mockTenantId,
      id: mockUserId,
    },
  };

  const mockIvaRetention = {
    _id: mockRetentionId,
    type: 'iva',
    tenantId: mockTenantId,
    documentNumber: 'RET-IVA-0001',
    status: 'draft',
    affectedDocumentId: mockInvoiceId,
    ivaRetention: {
      baseAmount: 1000,
      taxRate: 16,
      taxAmount: 160,
      retentionPercentage: 75,
      retentionAmount: 120,
    },
    totals: {
      subtotal: 1000,
      totalTax: 160,
      totalRetention: 120,
      currency: 'VES',
    },
  };

  const mockIslrRetention = {
    _id: mockRetentionId,
    type: 'islr',
    tenantId: mockTenantId,
    documentNumber: 'RET-ISLR-0001',
    status: 'draft',
    affectedDocumentId: mockInvoiceId,
    islrRetention: {
      conceptCode: 'H001',
      conceptDescription: 'Honorarios Profesionales',
      baseAmount: 1000,
      retentionPercentage: 3,
      retentionAmount: 30,
    },
    totals: {
      subtotal: 1000,
      totalTax: 0,
      totalRetention: 30,
      currency: 'VES',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WithholdingController],
      providers: [
        {
          provide: WithholdingService,
          useValue: {
            createIvaRetention: jest.fn(),
            createIslrRetention: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            issue: jest.fn(),
            cancel: jest.fn(),
            findByInvoice: jest.fn(),
            calculateTotalRetentions: jest.fn(),
          },
        },
        {
          provide: WithholdingPdfService,
          useValue: {
            generate: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
          },
        },
        {
          provide: WithholdingReportsService,
          useValue: {
            generateIvaMonthlyReport: jest.fn().mockResolvedValue(Buffer.from('mock-iva-report')),
            generateIslrAnnualReport: jest.fn().mockResolvedValue(Buffer.from('mock-islr-report')),
          },
        },
      ],
    }).compile();

    controller = module.get<WithholdingController>(WithholdingController);
    service = module.get<WithholdingService>(WithholdingService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /withholding/iva - createIvaRetention', () => {
    const createDto: CreateIvaRetentionDto = {
      affectedDocumentId: mockInvoiceId,
      retentionPercentage: 75,
      seriesId: '507f1f77bcf86cd799439015',
      notes: 'Test IVA retention',
    };

    it('should create an IVA retention', async () => {
      jest
        .spyOn(service, 'createIvaRetention')
        .mockResolvedValue(mockIvaRetention as any);

      const result = await controller.createIvaRetention(createDto, mockRequest);

      expect(service.createIvaRetention).toHaveBeenCalledWith(
        createDto,
        mockTenantId,
        mockUserId,
      );
      expect(result).toEqual(mockIvaRetention);
    });

    it('should pass operation date if provided', async () => {
      const dtoWithDate = {
        ...createDto,
        operationDate: '2024-01-15',
      };

      jest
        .spyOn(service, 'createIvaRetention')
        .mockResolvedValue(mockIvaRetention as any);

      await controller.createIvaRetention(dtoWithDate, mockRequest);

      expect(service.createIvaRetention).toHaveBeenCalledWith(
        dtoWithDate,
        mockTenantId,
        mockUserId,
      );
    });
  });

  describe('POST /withholding/islr - createIslrRetention', () => {
    const createDto: CreateIslrRetentionDto = {
      affectedDocumentId: mockInvoiceId,
      conceptCode: 'H001',
      conceptDescription: 'Honorarios Profesionales',
      retentionPercentage: 3,
      seriesId: '507f1f77bcf86cd799439015',
    };

    it('should create an ISLR retention', async () => {
      jest
        .spyOn(service, 'createIslrRetention')
        .mockResolvedValue(mockIslrRetention as any);

      const result = await controller.createIslrRetention(createDto, mockRequest);

      expect(service.createIslrRetention).toHaveBeenCalledWith(
        createDto,
        mockTenantId,
        mockUserId,
      );
      expect(result).toEqual(mockIslrRetention);
    });

    it('should create ISLR retention with sustraendo', async () => {
      const dtoWithSustraendo = {
        ...createDto,
        sustraendo: 10,
      };

      jest
        .spyOn(service, 'createIslrRetention')
        .mockResolvedValue(mockIslrRetention as any);

      await controller.createIslrRetention(dtoWithSustraendo, mockRequest);

      expect(service.createIslrRetention).toHaveBeenCalledWith(
        dtoWithSustraendo,
        mockTenantId,
        mockUserId,
      );
    });
  });

  describe('GET /withholding - findAll', () => {
    it('should return all retentions without filters', async () => {
      const mockRetentions = [mockIvaRetention, mockIslrRetention];
      jest.spyOn(service, 'findAll').mockResolvedValue(mockRetentions as any);

      const filters: WithholdingFiltersDto = {};
      const result = await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
      expect(result).toEqual(mockRetentions);
    });

    it('should filter by type', async () => {
      const filters: WithholdingFiltersDto = { type: 'iva' };
      jest.spyOn(service, 'findAll').mockResolvedValue([mockIvaRetention] as any);

      const result = await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
      expect(result).toEqual([mockIvaRetention]);
    });

    it('should filter by status', async () => {
      const filters: WithholdingFiltersDto = { status: 'issued' };
      jest.spyOn(service, 'findAll').mockResolvedValue([mockIvaRetention] as any);

      await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
    });

    it('should filter by date range', async () => {
      const filters: WithholdingFiltersDto = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };
      jest.spyOn(service, 'findAll').mockResolvedValue([mockIvaRetention] as any);

      await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
    });

    it('should filter by beneficiary tax ID', async () => {
      const filters: WithholdingFiltersDto = {
        beneficiaryTaxId: 'J-12345678-9',
      };
      jest.spyOn(service, 'findAll').mockResolvedValue([mockIvaRetention] as any);

      await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
    });

    it('should filter by period', async () => {
      const filters: WithholdingFiltersDto = {
        period: '2024-01',
      };
      jest.spyOn(service, 'findAll').mockResolvedValue([mockIvaRetention] as any);

      await controller.findAll(filters, mockRequest);

      expect(service.findAll).toHaveBeenCalledWith(filters, mockTenantId);
    });
  });

  describe('GET /withholding/:id - findOne', () => {
    it('should return a retention by ID', async () => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockIvaRetention as any);

      const result = await controller.findOne(mockRetentionId, mockRequest);

      expect(service.findOne).toHaveBeenCalledWith(mockRetentionId, mockTenantId);
      expect(result).toEqual(mockIvaRetention);
    });

    it('should throw NotFoundException if retention not found', async () => {
      jest
        .spyOn(service, 'findOne')
        .mockRejectedValue(new NotFoundException('Retención no encontrada'));

      await expect(
        controller.findOne('nonexistent-id', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /withholding/:id/issue - issue', () => {
    const issueDto: IssueWithholdingDto = {
      fiscalInfo: {
        period: '2024-01',
        declarationNumber: 'DEC-001',
      },
    };

    it('should issue a retention', async () => {
      const issuedRetention = {
        ...mockIvaRetention,
        status: 'issued',
        issueDate: new Date(),
      };

      jest.spyOn(service, 'issue').mockResolvedValue(issuedRetention as any);

      const result = await controller.issue(mockRetentionId, issueDto, mockRequest);

      expect(service.issue).toHaveBeenCalledWith(
        mockRetentionId,
        issueDto,
        mockTenantId,
        mockUserId,
      );
      expect(result).toEqual(issuedRetention);
      expect(result.status).toBe('issued');
    });

    it('should issue retention without fiscal info', async () => {
      const emptyDto: IssueWithholdingDto = {};
      const issuedRetention = {
        ...mockIvaRetention,
        status: 'issued',
      };

      jest.spyOn(service, 'issue').mockResolvedValue(issuedRetention as any);

      await controller.issue(mockRetentionId, emptyDto, mockRequest);

      expect(service.issue).toHaveBeenCalledWith(
        mockRetentionId,
        emptyDto,
        mockTenantId,
        mockUserId,
      );
    });
  });

  describe('POST /withholding/:id/cancel - cancel', () => {
    it('should cancel a retention', async () => {
      const cancelledRetention = {
        ...mockIvaRetention,
        status: 'archived',
      };

      jest.spyOn(service, 'cancel').mockResolvedValue(cancelledRetention as any);

      const result = await controller.cancel(mockRetentionId, mockRequest);

      expect(service.cancel).toHaveBeenCalledWith(mockRetentionId, mockTenantId);
      expect(result).toEqual(cancelledRetention);
      expect(result.status).toBe('archived');
    });

    it('should throw NotFoundException if retention not found', async () => {
      jest
        .spyOn(service, 'cancel')
        .mockRejectedValue(new NotFoundException('Retención no encontrada'));

      await expect(
        controller.cancel('nonexistent-id', mockRequest),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('GET /withholding/by-invoice/:invoiceId - findByInvoice', () => {
    it('should return all retentions for an invoice', async () => {
      const mockRetentions = [mockIvaRetention, mockIslrRetention];
      jest
        .spyOn(service, 'findByInvoice')
        .mockResolvedValue(mockRetentions as any);

      const result = await controller.findByInvoice(mockInvoiceId, mockRequest);

      expect(service.findByInvoice).toHaveBeenCalledWith(
        mockInvoiceId,
        mockTenantId,
      );
      expect(result).toEqual(mockRetentions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array if no retentions exist', async () => {
      jest.spyOn(service, 'findByInvoice').mockResolvedValue([]);

      const result = await controller.findByInvoice(mockInvoiceId, mockRequest);

      expect(result).toEqual([]);
    });
  });

  describe('GET /withholding/by-invoice/:invoiceId/totals - calculateTotals', () => {
    it('should calculate totals for an invoice', async () => {
      const mockTotals = {
        totalIva: 120,
        totalIslr: 30,
        total: 150,
      };

      jest
        .spyOn(service, 'calculateTotalRetentions')
        .mockResolvedValue(mockTotals);

      const result = await controller.calculateTotals(mockInvoiceId, mockRequest);

      expect(service.calculateTotalRetentions).toHaveBeenCalledWith(
        mockInvoiceId,
        mockTenantId,
      );
      expect(result).toEqual(mockTotals);
      expect(result.total).toBe(150);
    });

    it('should return zeros if no retentions exist', async () => {
      const mockTotals = {
        totalIva: 0,
        totalIslr: 0,
        total: 0,
      };

      jest
        .spyOn(service, 'calculateTotalRetentions')
        .mockResolvedValue(mockTotals);

      const result = await controller.calculateTotals(mockInvoiceId, mockRequest);

      expect(result.total).toBe(0);
    });
  });

  describe('Permission and Guard Tests', () => {
    it('should require billing_create permission for POST /iva', () => {
      const metadata = Reflect.getMetadata(
        'permissions',
        controller.createIvaRetention,
      );
      expect(metadata).toContain('billing_create');
    });

    it('should require billing_create permission for POST /islr', () => {
      const metadata = Reflect.getMetadata(
        'permissions',
        controller.createIslrRetention,
      );
      expect(metadata).toContain('billing_create');
    });

    it('should require billing_read permission for GET /', () => {
      const metadata = Reflect.getMetadata('permissions', controller.findAll);
      expect(metadata).toContain('billing_read');
    });

    it('should require billing_read permission for GET /:id', () => {
      const metadata = Reflect.getMetadata('permissions', controller.findOne);
      expect(metadata).toContain('billing_read');
    });

    it('should require billing_issue permission for POST /:id/issue', () => {
      const metadata = Reflect.getMetadata('permissions', controller.issue);
      expect(metadata).toContain('billing_issue');
    });

    it('should require billing_cancel permission for POST /:id/cancel', () => {
      const metadata = Reflect.getMetadata('permissions', controller.cancel);
      expect(metadata).toContain('billing_cancel');
    });
  });
});
