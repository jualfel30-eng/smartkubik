import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { WithholdingReportsService } from './withholding-reports.service';
import { WithholdingDocument } from '../../schemas/withholding-document.schema';
import { Tenant } from '../../schemas/tenant.schema';
import { Types } from 'mongoose';

describe('WithholdingReportsService', () => {
  let service: WithholdingReportsService;
  let withholdingModel: any;
  let tenantModel: any;

  const mockTenantId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const mockTenant = {
    _id: mockTenantId,
    name: 'EMPRESA TEST, C.A.',
    taxInfo: {
      rif: 'J-12345678-9',
    },
  };

  const mockIvaRetentions = [
    {
      _id: new Types.ObjectId(),
      tenantId: mockTenantId,
      type: 'iva',
      status: 'issued',
      documentNumber: 'RET-IVA-0001',
      controlNumber: '12345678',
      issueDate: new Date('2024-01-15'),
      beneficiary: {
        name: 'PROVEEDOR ABC, C.A.',
        taxId: 'J-98765432-1',
      },
      affectedDocument: {
        documentNumber: 'FAC-0001',
        controlNumber: '87654321',
      },
      ivaRetention: {
        baseAmount: 1000,
        taxAmount: 160,
        retentionPercentage: 75,
        retentionAmount: 120,
      },
    },
    {
      _id: new Types.ObjectId(),
      tenantId: mockTenantId,
      type: 'iva',
      status: 'issued',
      documentNumber: 'RET-IVA-0002',
      controlNumber: '12345679',
      issueDate: new Date('2024-01-20'),
      beneficiary: {
        name: 'PROVEEDOR ABC, C.A.',
        taxId: 'J-98765432-1',
      },
      affectedDocument: {
        documentNumber: 'FAC-0002',
        controlNumber: '87654322',
      },
      ivaRetention: {
        baseAmount: 2000,
        taxAmount: 320,
        retentionPercentage: 100,
        retentionAmount: 320,
      },
    },
  ];

  const mockIslrRetentions = [
    {
      _id: new Types.ObjectId(),
      tenantId: mockTenantId,
      type: 'islr',
      status: 'issued',
      documentNumber: 'RET-ISLR-0001',
      controlNumber: '22345678',
      issueDate: new Date('2024-01-15'),
      beneficiary: {
        name: 'PROFESIONAL XYZ',
        taxId: 'V-12345678',
      },
      affectedDocument: {
        documentNumber: 'FAC-0003',
      },
      islrRetention: {
        conceptCode: 'H001',
        conceptDescription: 'Honorarios Profesionales',
        baseAmount: 1000,
        retentionPercentage: 3,
        retentionAmount: 30,
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithholdingReportsService,
        {
          provide: getModelToken(WithholdingDocument.name),
          useValue: {
            find: jest.fn().mockReturnThis(),
            sort: jest.fn().mockReturnThis(),
            lean: jest.fn(),
          },
        },
        {
          provide: getModelToken(Tenant.name),
          useValue: {
            findById: jest.fn().mockReturnThis(),
            lean: jest.fn().mockResolvedValue(mockTenant),
          },
        },
      ],
    }).compile();

    service = module.get<WithholdingReportsService>(WithholdingReportsService);
    withholdingModel = module.get(getModelToken(WithholdingDocument.name));
    tenantModel = module.get(getModelToken(Tenant.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateIvaMonthlyReport', () => {
    it('should generate PDF report for IVA retentions', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIvaRetentions);

      const pdfBuffer = await service.generateIvaMonthlyReport(
        mockTenantId.toString(),
        2024,
        1,
        'pdf',
      );

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify it's a valid PDF
      const pdfSignature = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');
    });

    it('should generate JSON summary for IVA retentions', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIvaRetentions);

      const summary = await service.generateIvaMonthlyReport(
        mockTenantId.toString(),
        2024,
        1,
        'json',
      );

      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(1); // 1 provider

      const provider = summary[0] as any;
      expect(provider.providerName).toBe('PROVEEDOR ABC, C.A.');
      expect(provider.providerTaxId).toBe('J-98765432-1');
      expect(provider.retentions).toHaveLength(2);
      expect(provider.totals.baseAmount).toBe(3000);
      expect(provider.totals.retentionAmount).toBe(440);
    });

    it('should throw error for invalid year', async () => {
      await expect(
        service.generateIvaMonthlyReport(mockTenantId.toString(), 1999, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error for invalid month', async () => {
      await expect(
        service.generateIvaMonthlyReport(mockTenantId.toString(), 2024, 13),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when no retentions found', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue([]);

      await expect(
        service.generateIvaMonthlyReport(mockTenantId.toString(), 2024, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter retentions by date range', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIvaRetentions);

      await service.generateIvaMonthlyReport(mockTenantId.toString(), 2024, 1);

      expect(withholdingModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId.toString(),
          type: 'iva',
          status: 'issued',
          issueDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('generateIslrAnnualReport', () => {
    it('should generate PDF report for ISLR retentions', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIslrRetentions);

      const pdfBuffer = await service.generateIslrAnnualReport(
        mockTenantId.toString(),
        2024,
        'pdf',
      );

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      const pdfSignature = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');
    });

    it('should generate JSON summary for ISLR retentions', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIslrRetentions);

      const summary = await service.generateIslrAnnualReport(
        mockTenantId.toString(),
        2024,
        'json',
      );

      expect(Array.isArray(summary)).toBe(true);
      expect(summary).toHaveLength(1); // 1 concept

      const concept = summary[0] as any;
      expect(concept.conceptCode).toBe('H001');
      expect(concept.conceptDescription).toBe('Honorarios Profesionales');
      expect(concept.retentions).toHaveLength(1);
      expect(concept.totals.retentionAmount).toBe(30);
    });

    it('should generate TXT report for ISLR retentions', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIslrRetentions);

      const txtContent = await service.generateIslrAnnualReport(
        mockTenantId.toString(),
        2024,
        'txt',
      );

      expect(typeof txtContent).toBe('string');
      expect(txtContent).toContain('RELACION DE RETENCIONES ISLR');
      expect(txtContent).toContain('H001');
      expect(txtContent).toContain('PROFESIONAL XYZ');
    });

    it('should throw error for invalid year', async () => {
      await expect(
        service.generateIslrAnnualReport(mockTenantId.toString(), 1999),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw error when no retentions found', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue([]);

      await expect(
        service.generateIslrAnnualReport(mockTenantId.toString(), 2024),
      ).rejects.toThrow(BadRequestException);
    });

    it('should filter retentions by year range', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIslrRetentions);

      await service.generateIslrAnnualReport(mockTenantId.toString(), 2024);

      expect(withholdingModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId.toString(),
          type: 'islr',
          status: 'issued',
          issueDate: expect.objectContaining({
            $gte: expect.any(Date),
            $lte: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('Report grouping', () => {
    it('should group IVA retentions by provider correctly', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIvaRetentions);

      const summary = (await service.generateIvaMonthlyReport(
        mockTenantId.toString(),
        2024,
        1,
        'json',
      )) as any[];

      expect(summary).toHaveLength(1);
      expect(summary[0].retentions).toHaveLength(2);
      expect(summary[0].totals.count).toBe(2);
    });

    it('should group ISLR retentions by concept correctly', async () => {
      jest.spyOn(withholdingModel, 'lean').mockResolvedValue(mockIslrRetentions);

      const summary = (await service.generateIslrAnnualReport(
        mockTenantId.toString(),
        2024,
        'json',
      )) as any[];

      expect(summary).toHaveLength(1);
      expect(summary[0].retentions).toHaveLength(1);
      expect(summary[0].totals.count).toBe(1);
    });
  });
});
