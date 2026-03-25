import { HkaFactoryProvider } from '../../src/modules/billing/providers/hka-factory.provider';
import axios from 'axios';
import { ControlNumberRequest } from '../../src/modules/billing/providers/base-imprenta.provider';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('HkaFactoryProvider', () => {
  let provider: HkaFactoryProvider;
  let mockAxiosInstance: any;

  const validConfig = {
    baseUrl: 'https://demoemisionv2.thefactoryhka.com.ve',
    usuario: 'test-user',
    clave: 'test-password',
    rifEmisor: 'J-12345678-0',
    razonSocialEmisor: 'Test Company C.A.',
    timeout: 30000,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('Constructor and Initialization', () => {
    it('should initialize with valid configuration', () => {
      provider = new HkaFactoryProvider(validConfig);

      expect(provider).toBeDefined();
      expect(provider.getProviderName()).toBe('HKA Factory');
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: validConfig.baseUrl,
        timeout: validConfig.timeout,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should throw error if baseUrl is missing', () => {
      const invalidConfig = { ...validConfig, baseUrl: '' };

      expect(() => new HkaFactoryProvider(invalidConfig)).toThrow(
        'HKA Factory config incompleta: baseUrl, usuario y clave son requeridos'
      );
    });

    it('should throw error if usuario is missing', () => {
      const invalidConfig = { ...validConfig, usuario: '' };

      expect(() => new HkaFactoryProvider(invalidConfig)).toThrow(
        'HKA Factory config incompleta: baseUrl, usuario y clave son requeridos'
      );
    });

    it('should throw error if clave is missing', () => {
      const invalidConfig = { ...validConfig, clave: '' };

      expect(() => new HkaFactoryProvider(invalidConfig)).toThrow(
        'HKA Factory config incompleta: baseUrl, usuario y clave son requeridos'
      );
    });

    it('should use default timeout if not provided', () => {
      const { timeout, ...configWithoutTimeout } = validConfig;

      provider = new HkaFactoryProvider(configWithoutTimeout);

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: validConfig.baseUrl,
        timeout: 45000, // default timeout
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('validateConfig', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);
    });

    it('should validate correct configuration', async () => {
      // Mock successful authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token-123', expiresIn: 43200 },
      });

      const result = await provider.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid RIF format', async () => {
      const providerWithInvalidRif = new HkaFactoryProvider({
        ...validConfig,
        rifEmisor: 'INVALID-RIF',
      });

      const result = await providerWithInvalidRif.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('rifEmisor debe tener formato válido: [VEJPGC]-12345678-9');
    });

    it('should accept valid RIF formats', async () => {
      const validRifs = ['V-12345678-0', 'E-98765432-1', 'J-11111111-9', 'P-22222222-5', 'G-33333333-3', 'C-44444444-7'];

      for (const rif of validRifs) {
        const testProvider = new HkaFactoryProvider({
          ...validConfig,
          rifEmisor: rif,
        });

        mockAxiosInstance.post.mockResolvedValueOnce({
          data: { token: 'test-token', expiresIn: 43200 },
        });

        const result = await testProvider.validateConfig();
        expect(result.valid).toBe(true);
      }
    });

    it('should detect authentication errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Credenciales inválidas')
      );

      const result = await provider.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Error de autenticación'))).toBe(true);
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);
    });

    it('should authenticate and cache token', async () => {
      const mockToken = 'jwt-token-12345';
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: mockToken, expiresIn: 43200 },
      });

      // First call - should authenticate
      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: {
          hkaJson: { documentoElectronico: {} },
        },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'Documento emitido exitosamente',
          resultado: {
            numeroControl: 'CTRL-001',
            fechaAsignacion: '23/03/2026',
            horaAsignacion: '10:30:00 am',
          },
        },
      });

      await provider.requestControlNumber(payload);

      // First call to authenticate
      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Autenticacion',
        {
          usuario: validConfig.usuario,
          clave: validConfig.clave,
        }
      );

      // Second call should reuse cached token
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'Documento emitido exitosamente',
          resultado: {
            numeroControl: 'CTRL-002',
            fechaAsignacion: '23/03/2026',
            horaAsignacion: '10:31:00 am',
          },
        },
      });

      await provider.requestControlNumber(payload);

      // Should only have called /api/Autenticacion once (cached)
      expect(mockAxiosInstance.post.mock.calls.filter(
        call => call[0] === '/api/Autenticacion'
      )).toHaveLength(1);
    });

    it('should handle token as string response', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: 'direct-token-string',
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
          resultado: { numeroControl: 'CTRL-001' },
        },
      });

      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      await provider.requestControlNumber(payload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Emision',
        {},
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer direct-token-string',
          },
        })
      );
    });

    it('should handle token in object response', async () => {
      const mockToken = 'object-token-value';
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: mockToken, expiresIn: 43200 },
      });

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
          resultado: { numeroControl: 'CTRL-001' },
        },
      });

      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      await provider.requestControlNumber(payload);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Emision',
        {},
        expect.objectContaining({
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        })
      );
    });

    it('should throw error if token not found in response', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { someOtherField: 'value' },
      });

      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      await expect(provider.requestControlNumber(payload)).rejects.toThrow(
        'Token no encontrado en respuesta'
      );
    });
  });

  describe('requestControlNumber', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);

      // Mock authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token', expiresIn: 43200 },
      });
    });

    it('should successfully request control number', async () => {
      const hkaJson = {
        documentoElectronico: {
          Encabezado: {
            IdentificacionDocumento: { TipoDocumento: '01' },
          },
        },
      };

      const payload: ControlNumberRequest = {
        documentId: 'doc-12345',
        seriesId: 'series-1',
        tenantId: 'tenant-67890',
        documentNumber: 'F-001-00000123',
        type: 'invoice',
        metadata: { hkaJson },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'Documento emitido exitosamente',
          resultado: {
            numeroControl: 'CTRL-F-001-00000123',
            fechaAsignacion: '23/03/2026',
            horaAsignacion: '11:45:30 am',
            autorizado: 'SENIAT',
            transaccionId: 'TXN-98765',
          },
        },
      });

      const result = await provider.requestControlNumber(payload);

      expect(result).toEqual({
        controlNumber: 'CTRL-F-001-00000123',
        provider: 'hka-factory',
        assignedAt: expect.any(Date),
        metadata: {
          fechaAsignacion: '23/03/2026',
          horaAsignacion: '11:45:30 am',
          autorizado: 'SENIAT',
          transaccionId: 'TXN-98765',
          codigo: '200',
          mensaje: 'Documento emitido exitosamente',
        },
        hash: 'doc-12345',
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Emision',
        hkaJson,
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer test-token',
          },
        })
      );
    });

    it('should throw error if hkaJson is missing', async () => {
      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: {}, // Missing hkaJson
      };

      await expect(provider.requestControlNumber(payload)).rejects.toThrow(
        'Payload HKA no encontrado en metadata. Usar HkaDocumentMapper primero.'
      );
    });

    it('should handle HKA rejection (codigo 203)', async () => {
      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '203',
          mensaje: 'Documento rechazado',
          validaciones: ['RIF inválido', 'Total no coincide'],
        },
      });

      await expect(provider.requestControlNumber(payload)).rejects.toThrow(
        'HKA rechazó el documento: RIF inválido, Total no coincide'
      );
    });

    it('should handle missing numero de control in response', async () => {
      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
          resultado: {}, // No numeroControl
        },
      });

      await expect(provider.requestControlNumber(payload)).rejects.toThrow(
        'Número de control no recibido de HKA'
      );
    });
  });

  describe('queryDocumentStatus', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);

      // Mock authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token', expiresIn: 43200 },
      });
    });

    it('should query document status successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'Consulta exitosa',
          resultado: {
            numeroControl: 'CTRL-001',
            estado: 'EMITIDO',
            fechaEmision: '23/03/2026',
          },
        },
      });

      const result = await provider.queryDocumentStatus(
        'CTRL-001',
        '01',
        'F-001-00000001',
        'F-001'
      );

      expect(result).toEqual({
        controlNumber: 'CTRL-001',
        status: 'issued',
        metadata: {
          estado: 'EMITIDO',
          fechaEmision: '23/03/2026',
          mensaje: 'Consulta exitosa',
        },
      });

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/EstadoDocumento',
        {
          serie: 'F-001',
          tipoDocumento: '01',
          numeroDocumento: 'F-001-00000001',
        },
        expect.any(Object)
      );
    });

    it('should map ANULADO status correctly', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
          resultado: {
            numeroControl: 'CTRL-002',
            estado: 'ANULADO',
          },
        },
      });

      const result = await provider.queryDocumentStatus('CTRL-002');

      expect(result.status).toBe('cancelled');
    });

    it('should map RECHAZADO status correctly', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
          resultado: {
            numeroControl: 'CTRL-003',
            estado: 'RECHAZADO',
          },
        },
      });

      const result = await provider.queryDocumentStatus('CTRL-003');

      expect(result.status).toBe('rejected');
    });

    it('should handle errors from HKA', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '404',
          mensaje: 'Documento no encontrado',
        },
      });

      await expect(
        provider.queryDocumentStatus('CTRL-INVALID')
      ).rejects.toThrow('Error consultando estado: Documento no encontrado');
    });
  });

  describe('cancelDocument', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);

      // Mock authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token', expiresIn: 43200 },
      });
    });

    it('should cancel document successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'Documento anulado exitosamente',
        },
      });

      const result = await provider.cancelDocument(
        'CTRL-001',
        'Error en facturación',
        '01',
        'F-001-00000001',
        'F-001'
      );

      expect(result).toBe(true);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Anular',
        expect.objectContaining({
          serie: 'F-001',
          tipoDocumento: '01',
          numeroDocumento: 'F-001-00000001',
          motivoAnulacion: 'Error en facturación',
          fechaAnulacion: expect.any(String),
          horaAnulacion: expect.any(String),
        }),
        expect.any(Object)
      );
    });

    it('should return false for non-200 response', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '400',
          mensaje: 'No se puede anular documento ya anulado',
        },
      });

      const result = await provider.cancelDocument(
        'CTRL-001',
        'Duplicado'
      );

      expect(result).toBe(false);
    });

    it('should format date and time correctly', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: {
          codigo: '200',
          mensaje: 'OK',
        },
      });

      await provider.cancelDocument('CTRL-001', 'Test');

      const callArgs = mockAxiosInstance.post.mock.calls.find(
        call => call[0] === '/api/Anular'
      )[1];

      // Check that fechaAnulacion matches DD/MM/YYYY format
      expect(callArgs.fechaAnulacion).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);

      // Check that horaAnulacion matches HH:MM:SS am/pm format (with or without periods)
      expect(callArgs.horaAnulacion).toMatch(/^\d{2}:\d{2}:\d{2}\s([ap]\.?\s?m\.?|[AP]M)$/i);
    });
  });

  describe('downloadPdf', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);

      // Mock authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token', expiresIn: 43200 },
      });
    });

    it('should download PDF successfully', async () => {
      const mockPdfData = Buffer.from('PDF content here');

      mockAxiosInstance.post.mockResolvedValueOnce({
        data: mockPdfData,
      });

      const result = await provider.downloadPdf(
        'CTRL-001',
        '01',
        'F-001-00000001',
        'F-001'
      );

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('PDF content here');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/DescargaArchivo',
        {
          serie: 'F-001',
          tipoDocumento: '01',
          numeroDocumento: 'F-001-00000001',
        },
        expect.objectContaining({
          responseType: 'arraybuffer',
        })
      );
    });

    it('should handle download errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('PDF no disponible')
      );

      await expect(
        provider.downloadPdf('CTRL-INVALID')
      ).rejects.toThrow('PDF no disponible');
    });
  });

  describe('sendEmail', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);

      // Mock authentication
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { token: 'test-token', expiresIn: 43200 },
      });
    });

    it('should send email successfully', async () => {
      mockAxiosInstance.post.mockResolvedValueOnce({
        data: { success: true },
      });

      const emails = ['cliente@example.com', 'contabilidad@example.com'];

      const result = await provider.sendEmail(
        'CTRL-001',
        emails,
        '01',
        'F-001-00000001',
        'F-001'
      );

      expect(result).toBe(true);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/Correo/Enviar',
        {
          serie: 'F-001',
          tipoDocumento: '01',
          numeroDocumento: 'F-001-00000001',
          correos: emails,
        },
        expect.any(Object)
      );
    });

    it('should handle email sending errors', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce(
        new Error('Servidor de correo no disponible')
      );

      await expect(
        provider.sendEmail('CTRL-001', ['test@example.com'])
      ).rejects.toThrow('Servidor de correo no disponible');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      provider = new HkaFactoryProvider(validConfig);
    });

    it('should handle network errors during authentication', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        message: 'Network Error',
        code: 'ECONNREFUSED',
      });

      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      await expect(provider.requestControlNumber(payload)).rejects.toThrow(
        'Error de autenticación HKA Factory'
      );
    });

    it('should handle HTTP error responses', async () => {
      mockAxiosInstance.post.mockRejectedValueOnce({
        response: {
          status: 401,
          data: { error: 'Unauthorized' },
        },
        message: 'Request failed with status code 401',
      });

      const payload: ControlNumberRequest = {
        documentId: 'doc-123',
        seriesId: 'series-1',
        tenantId: 'tenant-456',
        documentNumber: 'F-001-00000001',
        type: 'invoice',
        metadata: { hkaJson: {} },
      };

      await expect(provider.requestControlNumber(payload)).rejects.toThrow();
    });
  });
});
