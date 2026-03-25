import { Test, TestingModule } from '@nestjs/testing';
import { HkaWithholdingMapper } from './hka-withholding.mapper';
import { WithholdingDocument } from '../../../schemas/withholding-document.schema';

describe('HkaWithholdingMapper', () => {
  let mapper: HkaWithholdingMapper;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HkaWithholdingMapper],
    }).compile();

    mapper = module.get<HkaWithholdingMapper>(HkaWithholdingMapper);
  });

  it('should be defined', () => {
    expect(mapper).toBeDefined();
  });

  describe('toHkaJson - IVA Retention (Type 05)', () => {
    const mockIvaRetention: Partial<WithholdingDocument> = {
      type: 'iva',
      documentNumber: 'RET-IVA-0001',
      issueDate: new Date('2024-01-15T10:30:00Z'),
      operationDate: new Date('2024-01-15'),
      metadata: {
        series: 'RET-IVA',
        notes: 'Test IVA retention',
      },
      taxInfo: {
        period: '2024-01',
      },
      issuer: {
        name: 'CLIENTE COMPRADOR, C.A.',
        taxId: 'J-12345678-9',
        address: 'Av. Principal, Caracas',
        phone: '+58-212-1234567',
        email: 'cliente@ejemplo.com',
      },
      beneficiary: {
        name: 'EMPRESA VENDEDORA, C.A.',
        taxId: 'J-98765432-1',
        address: 'Calle Secundaria, Valencia',
        phone: '+58-241-9876543',
        email: 'vendedor@ejemplo.com',
      },
      affectedDocument: {
        documentNumber: 'FAC-0001',
        controlNumber: '12345678',
        issueDate: new Date('2024-01-10'),
        totalAmount: 1160,
      },
      ivaRetention: {
        baseAmount: 1000,
        taxRate: 16,
        taxAmount: 160,
        retentionPercentage: 75,
        retentionAmount: 120,
        taxCode: 'G',
      },
      totals: {
        subtotal: 1000,
        totalTax: 160,
        totalRetention: 120,
        currency: 'VES',
      },
    };

    it('should map IVA retention to HKA format (type 05)', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      expect(result).toHaveProperty('documentoElectronico');
      expect(result.documentoElectronico).toHaveProperty('Encabezado');
      expect(result.documentoElectronico).toHaveProperty('DetallesRetencion');
    });

    it('should set correct document type (05) for IVA', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      expect(
        result.documentoElectronico.Encabezado.IdentificacionDocumento.TipoDocumento,
      ).toBe('05');
    });

    it('should format document number correctly', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      expect(
        result.documentoElectronico.Encabezado.IdentificacionDocumento
          .NumeroDocumento,
      ).toBe('RET-IVA-0001');
    });

    it('should format dates as DD/MM/YYYY', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const fechaEmision =
        result.documentoElectronico.Encabezado.IdentificacionDocumento.FechaEmision;

      // Check format DD/MM/YYYY
      expect(fechaEmision).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });

    it('should format time as HH:MM:SS am/pm', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const horaEmision =
        result.documentoElectronico.Encabezado.IdentificacionDocumento.HoraEmision;

      // Check format HH:MM:SS am/pm
      expect(horaEmision).toMatch(/^\d{2}:\d{2}:\d{2} (am|pm)$/);
    });

    it('should set period dates from taxInfo.period', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const periodoDesde =
        result.documentoElectronico.Encabezado.IdentificacionDocumento
          .PeriodoImpositivoDesde;
      const periodoHasta =
        result.documentoElectronico.Encabezado.IdentificacionDocumento
          .PeriodoImpositivoHasta;

      // January 2024: should be 01/01/2024 to 31/01/2024
      expect(periodoDesde).toBe('01/01/2024');
      expect(periodoHasta).toBe('31/01/2024');
    });

    it('should map issuer (Proveedor) correctly', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const proveedor = result.documentoElectronico.Encabezado.Proveedor;

      expect(proveedor.TipoIdentificacion).toBe('J');
      expect(proveedor.NumeroIdentificacion).toBe('123456789'); // Sin guiones
      expect(proveedor.RazonSocial).toBe('CLIENTE COMPRADOR, C.A.');
      expect(proveedor.Direccion).toBe('Av. Principal, Caracas');
      expect(proveedor.Pais).toBe('VE');
      expect(proveedor.Telefono).toContain('+58-212-1234567');
      expect(proveedor.Correo).toContain('cliente@ejemplo.com');
    });

    it('should map beneficiary (Beneficiario) correctly', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const beneficiario = result.documentoElectronico.Encabezado.Beneficiario;

      expect(beneficiario.TipoIdentificacion).toBe('J');
      expect(beneficiario.NumeroIdentificacion).toBe('987654321');
      expect(beneficiario.RazonSocial).toBe('EMPRESA VENDEDORA, C.A.');
      expect(beneficiario.Direccion).toBe('Calle Secundaria, Valencia');
      expect(beneficiario.Pais).toBe('VE');
    });

    it('should map affected document correctly', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const docAfectado =
        result.documentoElectronico.Encabezado.DocumentoAfectado;

      expect(docAfectado.TipoDocumento).toBe('01'); // Factura
      expect(docAfectado.NumeroDocumento).toBe('FAC-0001');
      expect(docAfectado.NumeroControl).toBe('12345678');
      expect(docAfectado.MontoTotal).toBe('1160.00');
    });

    it('should map totals with correct decimal formatting', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const totales = result.documentoElectronico.Encabezado.Totales;

      expect(totales.MontoBaseImponible).toBe('1000.00');
      expect(totales.MontoImpuesto).toBe('160.00');
      expect(totales.PorcentajeRetencion).toBe('75');
      expect(totales.MontoRetenido).toBe('120.00');
      expect(totales.Moneda).toBe('VES');
    });

    it('should map retention details correctly', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const detalles = result.documentoElectronico.DetallesRetencion;

      expect(detalles).toHaveLength(1);
      expect(detalles[0].NumeroLinea).toBe('1');
      expect(detalles[0].CodigoImpuesto).toBe('G');
      expect(detalles[0].BaseImponible).toBe('1000.00');
      expect(detalles[0].AlicuotaIVA).toBe('16');
      expect(detalles[0].MontoIVA).toBe('160.00');
      expect(detalles[0].PorcentajeRetencion).toBe('75');
      expect(detalles[0].MontoRetenido).toBe('120.00');
    });

    it('should include additional info if notes are provided', () => {
      const result = mapper.toHkaJson(mockIvaRetention as any);

      const infoAdicional = result.documentoElectronico.InfoAdicional;

      expect(infoAdicional).toEqual(
        expect.arrayContaining([
          {
            Campo: 'Observaciones',
            Valor: 'Test IVA retention',
          },
        ]),
      );
    });

    it('should handle 100% retention percentage', () => {
      const retention100 = {
        ...mockIvaRetention,
        ivaRetention: {
          ...mockIvaRetention.ivaRetention,
          retentionPercentage: 100,
          retentionAmount: 160,
        },
      };

      const result = mapper.toHkaJson(retention100 as any);

      expect(
        result.documentoElectronico.Encabezado.Totales.PorcentajeRetencion,
      ).toBe('100');
      expect(result.documentoElectronico.Encabezado.Totales.MontoRetenido).toBe(
        '160.00',
      );
    });

    it('should handle different tax ID types (V, E, J, P, G, C)', () => {
      const testCases = [
        { taxId: 'V-12345678-9', expected: 'V' },
        { taxId: 'E-12345678-9', expected: 'E' },
        { taxId: 'J-12345678-9', expected: 'J' },
        { taxId: 'P-12345678-9', expected: 'P' },
        { taxId: 'G-12345678-9', expected: 'G' },
        { taxId: 'C-12345678-9', expected: 'C' },
      ];

      testCases.forEach(({ taxId, expected }) => {
        const retentionWithType = {
          ...mockIvaRetention,
          issuer: { ...mockIvaRetention.issuer, taxId },
        };

        const result = mapper.toHkaJson(retentionWithType as any);

        expect(
          result.documentoElectronico.Encabezado.Proveedor.TipoIdentificacion,
        ).toBe(expected);
      });
    });
  });

  describe('toHkaJson - ISLR Retention (Type 06)', () => {
    const mockIslrRetention: Partial<WithholdingDocument> = {
      type: 'islr',
      documentNumber: 'RET-ISLR-0001',
      issueDate: new Date('2024-01-15T14:45:00Z'),
      operationDate: new Date('2024-01-15'),
      metadata: {
        series: 'RET-ISLR',
        notes: 'Retención por honorarios profesionales',
      },
      taxInfo: {
        period: '2024-01',
        declarationNumber: 'DEC-2024-001',
      },
      issuer: {
        name: 'CLIENTE PAGADOR, C.A.',
        taxId: 'J-11111111-1',
        address: 'Av. Libertador, Caracas',
        phone: '+58-212-1111111',
        email: 'pagador@ejemplo.com',
      },
      beneficiary: {
        name: 'PROFESIONAL SERVICIOS, C.A.',
        taxId: 'J-22222222-2',
        address: 'Calle Los Profesionales, Maracay',
        phone: '+58-243-2222222',
        email: 'profesional@ejemplo.com',
      },
      affectedDocument: {
        documentNumber: 'FAC-0050',
        controlNumber: '87654321',
        issueDate: new Date('2024-01-10'),
        totalAmount: 5000,
      },
      islrRetention: {
        conceptCode: 'H001',
        conceptDescription: 'Honorarios Profesionales',
        baseAmount: 5000,
        retentionPercentage: 3,
        retentionAmount: 140,
        sustraendo: 10,
      },
      totals: {
        subtotal: 5000,
        totalTax: 0,
        totalRetention: 140,
        currency: 'VES',
      },
    };

    it('should map ISLR retention to HKA format (type 06)', () => {
      const result = mapper.toHkaJson(mockIslrRetention as any);

      expect(result).toHaveProperty('documentoElectronico');
      expect(
        result.documentoElectronico.Encabezado.IdentificacionDocumento.TipoDocumento,
      ).toBe('06');
    });

    it('should map ISLR totals correctly', () => {
      const result = mapper.toHkaJson(mockIslrRetention as any);

      const totales = result.documentoElectronico.Encabezado.Totales;

      expect(totales.MontoBaseImponible).toBe('5000.00');
      expect(totales.PorcentajeRetencion).toBe('3');
      expect(totales.MontoRetenido).toBe('140.00');
      expect(totales.Sustraendo).toBe('10.00');
      expect(totales.Moneda).toBe('VES');
    });

    it('should map ISLR retention details correctly', () => {
      const result = mapper.toHkaJson(mockIslrRetention as any);

      const detalles = result.documentoElectronico.DetallesRetencion;

      expect(detalles).toHaveLength(1);
      expect(detalles[0].NumeroLinea).toBe('1');
      expect(detalles[0].CodigoConcepto).toBe('H001');
      expect(detalles[0].DescripcionConcepto).toBe('Honorarios Profesionales');
      expect(detalles[0].BaseImponible).toBe('5000.00');
      expect(detalles[0].PorcentajeRetencion).toBe('3');
      expect(detalles[0].Sustraendo).toBe('10.00');
      expect(detalles[0].MontoRetenido).toBe('140.00');
    });

    it('should handle ISLR without sustraendo', () => {
      const retentionNoSustraendo = {
        ...mockIslrRetention,
        islrRetention: {
          ...mockIslrRetention.islrRetention,
          sustraendo: undefined,
        },
      };

      const result = mapper.toHkaJson(retentionNoSustraendo as any);

      expect(result.documentoElectronico.Encabezado.Totales.Sustraendo).toBe(
        '0.00',
      );
      expect(result.documentoElectronico.DetallesRetencion[0].Sustraendo).toBe(
        '0.00',
      );
    });

    it('should include declaration number in additional info', () => {
      const result = mapper.toHkaJson(mockIslrRetention as any);

      const infoAdicional = result.documentoElectronico.InfoAdicional;

      expect(infoAdicional).toEqual(
        expect.arrayContaining([
          {
            Campo: 'Numero Declaracion',
            Valor: 'DEC-2024-001',
          },
        ]),
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error for unsupported retention type', () => {
      const invalidRetention = {
        type: 'invalid' as any,
      };

      expect(() => mapper.toHkaJson(invalidRetention as any)).toThrow(
        'Tipo de retención no soportado: invalid',
      );
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalRetention: Partial<WithholdingDocument> = {
        type: 'iva',
        documentNumber: 'RET-IVA-0001',
        issueDate: new Date('2024-01-15'),
        operationDate: new Date('2024-01-15'),
        metadata: {},
        issuer: {
          name: 'Test',
          taxId: 'J-12345678-9',
        },
        beneficiary: {
          name: 'Test2',
          taxId: 'J-98765432-1',
        },
        affectedDocument: {
          documentNumber: 'FAC-0001',
          issueDate: new Date('2024-01-10'),
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

      const result = mapper.toHkaJson(minimalRetention as any);

      expect(result.documentoElectronico.Encabezado.Proveedor.Direccion).toBe(
        'Sin dirección',
      );
      expect(result.documentoElectronico.Encabezado.Proveedor.Telefono).toEqual([]);
      expect(result.documentoElectronico.Encabezado.Proveedor.Correo).toEqual([]);
    });

    it('should handle BSD currency', () => {
      const retentionBSD: Partial<WithholdingDocument> = {
        type: 'iva',
        documentNumber: 'RET-IVA-0001',
        issueDate: new Date('2024-01-15'),
        operationDate: new Date('2024-01-15'),
        metadata: {},
        issuer: { name: 'Test', taxId: 'J-12345678-9' },
        beneficiary: { name: 'Test2', taxId: 'J-98765432-1' },
        affectedDocument: {
          documentNumber: 'FAC-0001',
          issueDate: new Date('2024-01-10'),
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
          currency: 'BSD',
        },
      };

      const result = mapper.toHkaJson(retentionBSD as any);

      expect(result.documentoElectronico.Encabezado.Totales.Moneda).toBe('BSD');
    });
  });

  describe('Date and Time Formatting Edge Cases', () => {
    it('should handle February period (28 days)', () => {
      const retention: Partial<WithholdingDocument> = {
        type: 'iva',
        documentNumber: 'RET-IVA-0001',
        issueDate: new Date('2024-02-15'),
        operationDate: new Date('2024-02-15'),
        metadata: {},
        taxInfo: { period: '2024-02' },
        issuer: { name: 'Test', taxId: 'J-12345678-9' },
        beneficiary: { name: 'Test2', taxId: 'J-98765432-1' },
        affectedDocument: {
          documentNumber: 'FAC-0001',
          issueDate: new Date('2024-02-10'),
          totalAmount: 1000,
        },
        ivaRetention: {
          baseAmount: 1000,
          taxRate: 16,
          taxAmount: 160,
          retentionPercentage: 75,
          retentionAmount: 120,
        },
        totals: { subtotal: 1000, totalTax: 160, totalRetention: 120, currency: 'VES' },
      };

      const result = mapper.toHkaJson(retention as any);

      // 2024 is a leap year, so February has 29 days
      expect(
        result.documentoElectronico.Encabezado.IdentificacionDocumento
          .PeriodoImpositivoHasta,
      ).toBe('29/02/2024');
    });

    it('should format midnight time correctly', () => {
      // Use local midnight to avoid timezone issues
      const midnight = new Date('2024-01-15T00:00:00');

      const retention: Partial<WithholdingDocument> = {
        type: 'iva',
        documentNumber: 'RET-IVA-0001',
        issueDate: midnight,
        operationDate: new Date('2024-01-15'),
        metadata: {},
        issuer: { name: 'Test', taxId: 'J-12345678-9' },
        beneficiary: { name: 'Test2', taxId: 'J-98765432-1' },
        affectedDocument: {
          documentNumber: 'FAC-0001',
          issueDate: new Date('2024-01-10'),
          totalAmount: 1000,
        },
        ivaRetention: {
          baseAmount: 1000,
          taxRate: 16,
          taxAmount: 160,
          retentionPercentage: 75,
          retentionAmount: 120,
        },
        totals: { subtotal: 1000, totalTax: 160, totalRetention: 120, currency: 'VES' },
      };

      const result = mapper.toHkaJson(retention as any);

      const horaEmision =
        result.documentoElectronico.Encabezado.IdentificacionDocumento.HoraEmision;

      // Should format as 12:00:00 am for midnight
      expect(horaEmision).toMatch(/12:00:00 am/);
    });

    it('should format noon time correctly', () => {
      // Use local noon to avoid timezone issues
      const noon = new Date('2024-01-15T12:00:00');

      const retention: Partial<WithholdingDocument> = {
        type: 'iva',
        documentNumber: 'RET-IVA-0001',
        issueDate: noon,
        operationDate: new Date('2024-01-15'),
        metadata: {},
        issuer: { name: 'Test', taxId: 'J-12345678-9' },
        beneficiary: { name: 'Test2', taxId: 'J-98765432-1' },
        affectedDocument: {
          documentNumber: 'FAC-0001',
          issueDate: new Date('2024-01-10'),
          totalAmount: 1000,
        },
        ivaRetention: {
          baseAmount: 1000,
          taxRate: 16,
          taxAmount: 160,
          retentionPercentage: 75,
          retentionAmount: 120,
        },
        totals: { subtotal: 1000, totalTax: 160, totalRetention: 120, currency: 'VES' },
      };

      const result = mapper.toHkaJson(retention as any);

      const horaEmision =
        result.documentoElectronico.Encabezado.IdentificacionDocumento.HoraEmision;

      // Should format as 12:00:00 pm for noon
      expect(horaEmision).toMatch(/12:00:00 pm/);
    });
  });
});
