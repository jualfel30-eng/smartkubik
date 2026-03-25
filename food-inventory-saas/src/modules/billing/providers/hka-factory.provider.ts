import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { BaseImprentaProvider, ControlNumberRequest, ControlNumberResponse, DocumentStatusResponse } from './base-imprenta.provider';

interface HkaFactoryConfig {
  baseUrl: string;
  usuario: string;
  clave: string;
  rifEmisor: string;
  razonSocialEmisor: string;
  timeout?: number;
}

interface HkaAuthResponse {
  token: string;
  expiresIn?: number;
}

interface HkaEmisionResponse {
  codigo: string;
  mensaje: string;
  validaciones?: string[];
  resultado?: {
    imprentaDigital?: string;
    autorizado?: string;
    serie?: string;
    tipoDocumento?: string;
    numeroDocumento?: string;
    numeroControl?: string;
    fechaAsignacion?: string;
    horaAsignacion?: string;
    fechaAsignacionNumeroControl?: string;
    horaAsignacionNumeroControl?: string;
    rangoAsignado?: string;
    transaccionId?: string;
  };
}

interface HkaEstadoResponse {
  codigo: string;
  mensaje: string;
  resultado?: {
    numeroControl?: string;
    estado?: string;
    fechaEmision?: string;
  };
}

interface HkaAnularResponse {
  codigo: string;
  mensaje: string;
  resultado?: any;
}

/**
 * Proveedor de imprenta digital para HKA Factory (THE FACTORY HKA VENEZUELA, C.A.)
 *
 * Soporta la API oficial de HKA Factory para emisión de documentos fiscales
 * conformes a SENIAT Venezuela.
 *
 * Endpoints soportados:
 * - POST /api/Autenticacion - Obtener token JWT
 * - POST /api/Emision - Emitir documento fiscal
 * - POST /api/EstadoDocumento - Consultar estado
 * - POST /api/Anular - Anular documento
 * - POST /api/DescargaArchivo - Descargar PDF
 *
 * @see https://demoemisionv2.thefactoryhka.com.ve/swagger/index.html
 */
@Injectable()
export class HkaFactoryProvider extends BaseImprentaProvider {
  private readonly logger = new Logger(HkaFactoryProvider.name);
  private httpClient: AxiosInstance;
  private authToken: string | null = null;
  private tokenExpiresAt: Date | null = null;

  constructor(config: HkaFactoryConfig) {
    super();

    if (!config.baseUrl || !config.usuario || !config.clave) {
      throw new Error('HKA Factory config incompleta: baseUrl, usuario y clave son requeridos');
    }

    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 45000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.config = config;

    this.logger.log(`HKA Factory Provider inicializado: ${config.baseUrl}`);
    this.logger.log(`RIF Emisor: ${config.rifEmisor}`);
  }

  /**
   * Obtiene el nombre del proveedor
   */
  getProviderName(): string {
    return 'HKA Factory';
  }

  /**
   * Valida la configuración del proveedor
   */
  async validateConfig(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const config = this.config as HkaFactoryConfig;

    if (!config.baseUrl) errors.push('baseUrl es requerido');
    if (!config.usuario) errors.push('usuario es requerido');
    if (!config.clave) errors.push('clave es requerido');
    if (!config.rifEmisor) errors.push('rifEmisor es requerido');
    if (!config.razonSocialEmisor) errors.push('razonSocialEmisor es requerido');

    // Validar formato de RIF
    if (config.rifEmisor && !/^[VEJPGC]-\d{8,9}-\d$/.test(config.rifEmisor)) {
      errors.push('rifEmisor debe tener formato válido: [VEJPGC]-12345678-9');
    }

    // Intentar autenticación si config es válida
    if (errors.length === 0) {
      try {
        await this.authenticate();
      } catch (error) {
        errors.push(`Error de autenticación: ${error.message}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Autenticación con HKA Factory usando JWT
   *
   * El token es válido por 12 horas según documentación.
   * Se cachea para evitar llamadas innecesarias.
   */
  private async authenticate(): Promise<string> {
    // Si tenemos token válido, retornar
    if (this.authToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return this.authToken;
    }

    const config = this.config as HkaFactoryConfig;

    try {
      this.logger.log('🔐 Autenticando con HKA Factory...');

      const response = await this.httpClient.post<HkaAuthResponse>('/api/Autenticacion', {
        usuario: config.usuario,
        clave: config.clave,
      });

      if (!response.data) {
        throw new Error('Respuesta de autenticación inválida');
      }

      // HKA devuelve el token directamente como string en algunos casos
      // o dentro de un objeto { token: string }
      let token: string;
      let expiresIn = 43200; // 12 horas en segundos (default)

      if (typeof response.data === 'string') {
        token = response.data;
      } else if (typeof response.data === 'object') {
        if (response.data.token) {
          token = response.data.token;
          expiresIn = response.data.expiresIn || 43200;
        } else {
          throw new Error('Token no encontrado en respuesta');
        }
      } else {
        throw new Error('Formato de respuesta inválido');
      }

      this.authToken = token;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      this.logger.log(`✅ Autenticación exitosa. Token expira en ${expiresIn / 3600} horas`);

      return token;
    } catch (error) {
      this.logger.error('❌ Error de autenticación con HKA Factory:', error.message);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }

      throw new Error(`Error de autenticación HKA Factory: ${error.message}`);
    }
  }

  /**
   * Solicita número de control fiscal a HKA Factory
   *
   * @param payload Datos del documento a emitir (ya mapeado a formato HKA)
   * @returns Respuesta con número de control y metadata
   */
  async requestControlNumber(payload: ControlNumberRequest): Promise<ControlNumberResponse> {
    try {
      this.logger.log(`📄 Solicitando número de control para documento ${payload.documentNumber}...`);

      // Obtener token válido
      const token = await this.authenticate();

      // El payload debe venir ya mapeado al formato HKA desde el mapper
      // Aquí solo enviamos a la API
      const hkaPayload = payload.metadata?.hkaJson;

      if (!hkaPayload) {
        throw new Error('Payload HKA no encontrado en metadata. Usar HkaDocumentMapper primero.');
      }

      // Emitir documento
      const response = await this.httpClient.post<HkaEmisionResponse>(
        '/api/Emision',
        hkaPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { codigo, mensaje, validaciones, resultado } = response.data;

      // Debug: log the full response
      this.logger.debug(`HKA Response: ${JSON.stringify(response.data, null, 2)}`);

      // HKA devuelve código 200 para éxito, 203 para rechazo
      if (codigo === '203' || codigo === '400' || codigo === '500') {
        const errorMsg = validaciones?.join(', ') || mensaje;
        throw new Error(`HKA rechazó el documento: ${errorMsg}`);
      }

      if (!resultado || !resultado.numeroControl) {
        this.logger.error(`Resultado: ${JSON.stringify(resultado, null, 2)}`);
        throw new Error('Número de control no recibido de HKA');
      }

      this.logger.log(`✅ Número de control asignado: ${resultado.numeroControl}`);

      return {
        controlNumber: resultado.numeroControl,
        provider: 'hka-factory',
        assignedAt: new Date(),
        metadata: {
          fechaAsignacion: resultado.fechaAsignacion,
          horaAsignacion: resultado.horaAsignacion,
          autorizado: resultado.autorizado,
          transaccionId: resultado.transaccionId,
          codigo,
          mensaje,
        },
        hash: payload.documentId, // El hash real se genera en el mapper
      };
    } catch (error) {
      this.logger.error(`❌ Error emitiendo documento con HKA Factory:`, error.message);

      if (error.response) {
        this.logger.error(`Status: ${error.response.status}`);
        this.logger.error(`Data: ${JSON.stringify(error.response.data)}`);
      }

      throw error;
    }
  }

  /**
   * Consulta el estado de un documento emitido
   *
   * @param controlNumber Número de control del documento
   * @param documentType Tipo de documento (01, 02, etc.)
   * @param documentNumber Número del documento
   * @param series Serie del documento (opcional)
   */
  async queryDocumentStatus(
    controlNumber: string,
    documentType?: string,
    documentNumber?: string,
    series?: string
  ): Promise<DocumentStatusResponse> {
    try {
      this.logger.log(`🔍 Consultando estado del documento ${documentNumber || controlNumber}...`);

      const token = await this.authenticate();

      const response = await this.httpClient.post<HkaEstadoResponse>(
        '/api/EstadoDocumento',
        {
          serie: series || '',
          tipoDocumento: documentType || '01',
          numeroDocumento: documentNumber || controlNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { codigo, mensaje, resultado } = response.data;

      if (codigo !== '200' || !resultado) {
        throw new Error(`Error consultando estado: ${mensaje}`);
      }

      // Mapear estado de HKA a estados internos
      let status: 'pending' | 'issued' | 'cancelled' | 'rejected' = 'pending';

      if (resultado.estado === 'ANULADO') {
        status = 'cancelled';
      } else if (resultado.estado === 'RECHAZADO') {
        status = 'rejected';
      } else if (resultado.estado === 'EMITIDO' || resultado.numeroControl) {
        status = 'issued';
      }

      return {
        controlNumber: resultado.numeroControl || controlNumber,
        status,
        metadata: {
          estado: resultado.estado,
          fechaEmision: resultado.fechaEmision,
          mensaje,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error consultando estado:`, error.message);
      throw error;
    }
  }

  /**
   * Anula un documento previamente emitido
   *
   * @param controlNumber Número de control del documento
   * @param reason Motivo de anulación
   * @param documentType Tipo de documento
   * @param documentNumber Número del documento
   * @param series Serie del documento (opcional)
   */
  async cancelDocument(
    controlNumber: string,
    reason?: string,
    documentType?: string,
    documentNumber?: string,
    series?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`🚫 Anulando documento ${documentNumber || controlNumber}...`);

      const token = await this.authenticate();

      const now = new Date();
      const fechaAnulacion = now.toLocaleDateString('es-VE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).replace(/\//g, '/'); // DD/MM/YYYY

      const horaAnulacion = now.toLocaleTimeString('es-VE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }); // HH:MM:SS am/pm

      const response = await this.httpClient.post<HkaAnularResponse>(
        '/api/Anular',
        {
          serie: series || '',
          tipoDocumento: documentType || '01',
          numeroDocumento: documentNumber || controlNumber,
          motivoAnulacion: reason || 'Anulación solicitada',
          fechaAnulacion,
          horaAnulacion,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const { codigo, mensaje } = response.data;

      if (codigo === '200') {
        this.logger.log(`✅ Documento anulado exitosamente`);
        return true;
      } else {
        this.logger.warn(`⚠️ Anulación con código ${codigo}: ${mensaje}`);
        return false;
      }
    } catch (error) {
      this.logger.error(`❌ Error anulando documento:`, error.message);
      throw error;
    }
  }

  /**
   * Descarga el archivo PDF del documento desde HKA Factory
   *
   * @param controlNumber Número de control
   * @param documentType Tipo de documento
   * @param documentNumber Número del documento
   * @param series Serie (opcional)
   * @returns Buffer con el PDF
   */
  async downloadPdf(
    controlNumber: string,
    documentType?: string,
    documentNumber?: string,
    series?: string
  ): Promise<Buffer> {
    try {
      this.logger.log(`📥 Descargando PDF del documento ${documentNumber || controlNumber}...`);

      const token = await this.authenticate();

      const response = await this.httpClient.post(
        '/api/DescargaArchivo',
        {
          serie: series || '',
          tipoDocumento: documentType || '01',
          numeroDocumento: documentNumber || controlNumber,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: 'arraybuffer',
        }
      );

      this.logger.log(`✅ PDF descargado exitosamente (${response.data.length} bytes)`);

      return Buffer.from(response.data);
    } catch (error) {
      this.logger.error(`❌ Error descargando PDF:`, error.message);
      throw error;
    }
  }

  /**
   * Envía el documento por email usando HKA Factory
   *
   * ⚠️ IMPORTANTE: Según HKA Factory, HKA envía automáticamente el documento
   * al email del cliente al momento de la emisión.
   *
   * Este método es para REENVÍO manual del documento.
   *
   * 🔄 REINTENTOS: Si necesitas reintentar el envío, HKA recomienda un delay
   * de 30 segundos entre intentos para evitar rechazo por duplicado.
   *
   * @param controlNumber Número de control
   * @param emails Lista de emails destinatarios
   * @param documentType Tipo de documento
   * @param documentNumber Número del documento
   * @param series Serie (opcional)
   */
  async sendEmail(
    controlNumber: string,
    emails: string[],
    documentType?: string,
    documentNumber?: string,
    series?: string
  ): Promise<boolean> {
    try {
      this.logger.log(`📧 Enviando documento por email a ${emails.join(', ')}...`);

      const token = await this.authenticate();

      const response = await this.httpClient.post(
        '/api/Correo/Enviar',
        {
          serie: series || '',
          tipoDocumento: documentType || '01',
          numeroDocumento: documentNumber || controlNumber,
          correos: emails,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      this.logger.log(`✅ Email enviado exitosamente`);

      return true;
    } catch (error) {
      this.logger.error(`❌ Error enviando email:`, error.message);
      throw error;
    }
  }
}
