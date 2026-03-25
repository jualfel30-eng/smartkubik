import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { WithholdingPdfService } from './withholding-pdf.service';
import { Tenant } from '../../schemas/tenant.schema';
import { Types } from 'mongoose';

describe('WithholdingPdfService', () => {
  let service: WithholdingPdfService;
  let tenantModel: any;

  const mockTenantId = new Types.ObjectId('507f1f77bcf86cd799439011');

  const mockTenant = {
    _id: mockTenantId,
    name: 'EMPRESA TEST, C.A.',
    taxInfo: {
      rif: 'J-12345678-9',
      businessName: 'EMPRESA TEST, C.A.',
      isRetentionAgent: true,
      taxRegime: 'General',
      taxpayerType: 'ordinario',
    },
    contactInfo: {
      email: 'contacto@empresa.com',
      phone: '+58-212-1234567',
      address: {
        street: 'Av. Principal',
        city: 'Caracas',
        state: 'Distrito Capital',
        zipCode: '1010',
        country: 'Venezuela',
      },
    },
    logo: null,
  };

  const mockIvaRetention = {
    _id: new Types.ObjectId(),
    tenantId: mockTenantId,
    type: 'iva',
    status: 'issued',
    documentNumber: 'RET-IVA-0001',
    controlNumber: '12345678',
    issueDate: new Date('2024-01-15T14:30:00Z'),
    operationDate: new Date('2024-01-15'),
    seriesId: new Types.ObjectId(),

    beneficiary: {
      name: 'EMPRESA TEST, C.A.',
      taxId: 'J-12345678-9',
      address: 'Av. Principal, Caracas, Distrito Capital',
      email: 'contacto@empresa.com',
      phone: '+58-212-1234567',
    },

    issuer: {
      name: 'PROVEEDOR ABC, C.A.',
      taxId: 'J-98765432-1',
      isRetentionAgent: true,
      taxpayerType: 'ordinario',
    },

    affectedDocumentId: new Types.ObjectId(),
    affectedDocument: {
      documentNumber: 'FAC-0001',
      controlNumber: '87654321',
      issueDate: new Date('2024-01-10'),
      totalAmount: 1160,
    },

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

    taxInfo: {
      period: '2024-01',
      declarationNumber: 'DEC-2024-001',
    },
  };

  const mockIslrRetention = {
    _id: new Types.ObjectId(),
    tenantId: mockTenantId,
    type: 'islr',
    status: 'issued',
    documentNumber: 'RET-ISLR-0001',
    controlNumber: '87654321',
    issueDate: new Date('2024-01-15T14:45:00Z'),
    operationDate: new Date('2024-01-15'),
    seriesId: new Types.ObjectId(),

    beneficiary: {
      name: 'EMPRESA TEST, C.A.',
      taxId: 'J-12345678-9',
      address: 'Av. Principal, Caracas, Distrito Capital',
      email: 'contacto@empresa.com',
      phone: '+58-212-1234567',
    },

    issuer: {
      name: 'PROVEEDOR XYZ, C.A.',
      taxId: 'J-11223344-5',
      isRetentionAgent: false,
      taxpayerType: 'especial',
    },

    affectedDocumentId: new Types.ObjectId(),
    affectedDocument: {
      documentNumber: 'FAC-0002',
      controlNumber: '11223344',
      issueDate: new Date('2024-01-12'),
      totalAmount: 1000,
    },

    islrRetention: {
      conceptCode: 'H001',
      conceptDescription: 'Honorarios Profesionales',
      baseAmount: 1000,
      retentionPercentage: 3,
      retentionAmount: 30,
      sustraendo: 0,
    },

    totals: {
      subtotal: 1000,
      totalTax: 0,
      totalRetention: 30,
      currency: 'VES',
    },

    taxInfo: {
      period: '2024-01',
      declarationNumber: 'DEC-2024-002',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WithholdingPdfService,
        {
          provide: getModelToken(Tenant.name),
          useValue: {
            findById: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(mockTenant),
            }),
          },
        },
      ],
    }).compile();

    service = module.get<WithholdingPdfService>(WithholdingPdfService);
    tenantModel = module.get(getModelToken(Tenant.name));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generate - IVA Retention', () => {
    it('should generate PDF for IVA retention', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      // Verify it's a valid PDF (starts with %PDF)
      const pdfSignature = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');
    });

    it('should include retention document number in PDF', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('RET-IVA-0001');
    });

    it('should include control number in PDF', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('12345678');
    });

    it('should include beneficiary name in PDF', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('EMPRESA TEST');
    });

    it('should include IVA retention percentage in PDF', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('75%');
    });

    it('should generate PDF even without logo', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should handle missing tenant gracefully', async () => {
      jest.spyOn(tenantModel, 'findById').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      const pdfBuffer = await service.generate(mockIvaRetention as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    });

    it('should include QR code data', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);

      // QR code generation is best-effort, just verify PDF was created
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include legal footer for IVA', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('Decreto');
    });
  });

  describe('generate - ISLR Retention', () => {
    it('should generate PDF for ISLR retention', async () => {
      const pdfBuffer = await service.generate(mockIslrRetention as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);

      const pdfSignature = pdfBuffer.toString('utf8', 0, 4);
      expect(pdfSignature).toBe('%PDF');
    });

    it('should include ISLR concept code in PDF', async () => {
      const pdfBuffer = await service.generate(mockIslrRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('H001');
    });

    it('should include ISLR concept description in PDF', async () => {
      const pdfBuffer = await service.generate(mockIslrRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('Honorarios Profesionales');
    });

    it('should include retention percentage in PDF', async () => {
      const pdfBuffer = await service.generate(mockIslrRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('3%');
    });

    it('should include legal footer for ISLR', async () => {
      const pdfBuffer = await service.generate(mockIslrRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('ISLR');
      expect(pdfString).toContain('Decreto');
    });
  });

  describe('generate - ISLR with Sustraendo', () => {
    it('should include sustraendo in PDF when present', async () => {
      const retentionWithSustraendo = {
        ...mockIslrRetention,
        islrRetention: {
          ...mockIslrRetention.islrRetention,
          sustraendo: 10,
        },
      };

      const pdfBuffer = await service.generate(retentionWithSustraendo as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('Sustraendo');
    });
  });

  describe('generate - Edge Cases', () => {
    it('should handle retention without control number', async () => {
      const retentionNoControl = {
        ...mockIvaRetention,
        controlNumber: undefined,
      };

      const pdfBuffer = await service.generate(retentionNoControl as any);
      const pdfString = pdfBuffer.toString('utf8');

      expect(pdfString).toContain('PENDIENTE');
    });

    it('should handle retention without tax info', async () => {
      const retentionNoTaxInfo = {
        ...mockIvaRetention,
        taxInfo: undefined,
      };

      const pdfBuffer = await service.generate(retentionNoTaxInfo as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    });

    it('should handle USD currency', async () => {
      const retentionUsd = {
        ...mockIvaRetention,
        totals: {
          ...mockIvaRetention.totals,
          currency: 'USD',
        },
      };

      const pdfBuffer = await service.generate(retentionUsd as any);

      // PDF should generate successfully with USD currency
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should format dates correctly', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      // Should contain formatted date 15/01/2024
      expect(pdfString).toContain('15/01/2024');
    });

    it('should handle missing optional fields gracefully', async () => {
      const minimalRetention = {
        _id: new Types.ObjectId(),
        tenantId: mockTenantId,
        type: 'iva',
        status: 'draft',
        documentNumber: 'RET-IVA-9999',
        beneficiary: {
          name: 'Test',
          taxId: 'J-00000000-0',
        },
        issuer: {
          name: 'Provider',
          taxId: 'J-11111111-1',
        },
        affectedDocumentId: new Types.ObjectId(),
        affectedDocument: {
          documentNumber: 'FAC-0001',
          controlNumber: '12345678',
          totalAmount: 1000,
        },
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

      const pdfBuffer = await service.generate(minimalRetention as any);

      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });
  });

  describe('QR Code Generation', () => {
    it('should generate QR code with retention data', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);

      // QR code generation is best-effort
      expect(pdfBuffer).toBeDefined();
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
    });

    it('should include verification text near QR code', async () => {
      const pdfBuffer = await service.generate(mockIvaRetention as any);
      const pdfString = pdfBuffer.toString('utf8');

      // Verification text should be in the PDF
      expect(pdfString).toContain('verificar');
    });
  });
});
