import {
  Body,
  Controller,
  Post,
  Headers,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  BillingDocument,
  BillingDocumentDocument,
} from '../../../schemas/billing-document.schema';
import {
  BillingAuditLog,
} from '../../../schemas/billing-audit-log.schema';

/**
 * Controlador para recibir webhooks de HKA Factory
 *
 * ⚠️ IMPORTANTE: Según respuesta del soporte de HKA Factory (2026-03-23):
 * "Actualmente no tenemos un webhook con esas características"
 *
 * Este controlador está implementado como PLACEHOLDER para futuro.
 * Por ahora, HKA Factory NO soporta webhooks.
 *
 * Para monitorear estado de documentos, usar: GET /api/v1/billing/documents/:id/query-imprenta
 * que consulta el endpoint /api/EstadoDocumento de HKA.
 *
 * Si HKA Factory implementa webhooks en el futuro, este endpoint estará listo.
 */
@ApiTags('webhooks')
@Controller('webhooks/hka')
export class HkaWebhookController {
  private readonly logger = new Logger(HkaWebhookController.name);

  constructor(
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
    @InjectModel(BillingAuditLog.name)
    private auditModel: Model<BillingAuditLog>,
  ) {}

  @Post()
  @ApiOperation({
    summary: 'Recibir notificaciones de HKA Factory',
    description: 'Endpoint para webhooks de HKA Factory. Actualiza el estado de documentos basado en notificaciones.'
  })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-hka-signature') signature: string,
  ) {
    this.logger.log('📥 Webhook recibido de HKA Factory');
    this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

    try {
      // TODO: Verificar firma/autenticación del webhook (cuando HKA proporcione el método)
      // if (!this.verifySignature(payload, signature)) {
      //   throw new BadRequestException('Firma inválida');
      // }

      // Log webhook en audit
      await this.auditModel.create({
        event: 'hka_webhook_received',
        payload,
        metadata: {
          signature,
          receivedAt: new Date(),
        },
      });

      // Procesar evento según tipo
      const eventType = payload.event || payload.tipo || payload.eventType;

      switch (eventType) {
        case 'document.issued':
        case 'emision_exitosa':
          await this.handleDocumentIssued(payload);
          break;

        case 'document.cancelled':
        case 'anulacion_exitosa':
          await this.handleDocumentCancelled(payload);
          break;

        case 'document.rejected':
        case 'emision_rechazada':
          await this.handleDocumentRejected(payload);
          break;

        case 'status.updated':
        case 'estado_actualizado':
          await this.handleStatusUpdated(payload);
          break;

        default:
          this.logger.warn(`⚠️ Tipo de evento desconocido: ${eventType}`);
          return {
            success: true,
            message: 'Evento recibido pero no procesado (tipo desconocido)',
            eventType,
          };
      }

      return {
        success: true,
        message: 'Webhook procesado exitosamente',
        eventType,
      };

    } catch (error) {
      this.logger.error(`❌ Error procesando webhook:`, error.stack);

      // Log error en audit
      await this.auditModel.create({
        event: 'hka_webhook_error',
        payload,
        metadata: {
          error: error.message,
          stack: error.stack,
        },
      });

      throw new BadRequestException(`Error procesando webhook: ${error.message}`);
    }
  }

  /**
   * Maneja notificación de documento emitido exitosamente
   */
  private async handleDocumentIssued(payload: any) {
    this.logger.log('✅ Procesando emisión exitosa de documento');

    const {
      controlNumber,
      documentNumber,
      documentId,
      tenantId,
      hash,
      verificationUrl,
    } = this.extractDocumentData(payload);

    if (!documentNumber && !documentId && !controlNumber) {
      this.logger.warn('⚠️ No se pudo extraer identificador del documento del payload');
      return;
    }

    // Buscar documento por número de control o número de documento
    const query: any = {};
    if (documentId) {
      query._id = documentId;
    } else if (controlNumber) {
      query.controlNumber = controlNumber;
    } else if (documentNumber) {
      query.documentNumber = documentNumber;
    }

    if (tenantId) {
      query.tenantId = tenantId;
    }

    const doc = await this.billingModel.findOne(query);

    if (!doc) {
      this.logger.warn(`⚠️ Documento no encontrado: ${JSON.stringify(query)}`);
      return;
    }

    // Actualizar documento
    const updates: any = {
      status: 'issued',
    };

    if (controlNumber && !doc.controlNumber) {
      updates.controlNumber = controlNumber;
    }

    if (hash) {
      updates['taxInfo.hash'] = hash;
    }

    if (verificationUrl) {
      updates['taxInfo.verificationUrl'] = verificationUrl;
    }

    await this.billingModel.findByIdAndUpdate(doc._id, {
      $set: updates,
    });

    this.logger.log(`✅ Documento ${doc.documentNumber} actualizado con control number ${controlNumber}`);
  }

  /**
   * Maneja notificación de documento anulado
   */
  private async handleDocumentCancelled(payload: any) {
    this.logger.log('🚫 Procesando anulación de documento');

    const {
      controlNumber,
      documentNumber,
      documentId,
      reason,
    } = this.extractDocumentData(payload);

    const query: any = {};
    if (documentId) {
      query._id = documentId;
    } else if (controlNumber) {
      query.controlNumber = controlNumber;
    } else if (documentNumber) {
      query.documentNumber = documentNumber;
    }

    const doc = await this.billingModel.findOne(query);

    if (!doc) {
      this.logger.warn(`⚠️ Documento no encontrado: ${JSON.stringify(query)}`);
      return;
    }

    await this.billingModel.findByIdAndUpdate(doc._id, {
      $set: {
        status: 'cancelled',
        'metadata.cancellationReason': reason || 'Anulado vía HKA Factory',
        'metadata.cancelledAt': new Date(),
      },
    });

    this.logger.log(`✅ Documento ${doc.documentNumber} marcado como anulado`);
  }

  /**
   * Maneja notificación de documento rechazado
   */
  private async handleDocumentRejected(payload: any) {
    this.logger.log('❌ Procesando rechazo de documento');

    const {
      documentNumber,
      documentId,
      reason,
      errors,
    } = this.extractDocumentData(payload);

    const query: any = {};
    if (documentId) {
      query._id = documentId;
    } else if (documentNumber) {
      query.documentNumber = documentNumber;
    }

    const doc = await this.billingModel.findOne(query);

    if (!doc) {
      this.logger.warn(`⚠️ Documento no encontrado: ${JSON.stringify(query)}`);
      return;
    }

    await this.billingModel.findByIdAndUpdate(doc._id, {
      $set: {
        status: 'draft', // Volver a draft para permitir correcciones
        'metadata.rejectionReason': reason || 'Rechazado por HKA Factory',
        'metadata.rejectionErrors': errors,
        'metadata.rejectedAt': new Date(),
      },
    });

    this.logger.log(`✅ Documento ${doc.documentNumber} marcado como rechazado`);
  }

  /**
   * Maneja notificación de estado actualizado
   */
  private async handleStatusUpdated(payload: any) {
    this.logger.log('🔄 Procesando actualización de estado');

    const {
      controlNumber,
      documentNumber,
      documentId,
      status,
    } = this.extractDocumentData(payload);

    const query: any = {};
    if (documentId) {
      query._id = documentId;
    } else if (controlNumber) {
      query.controlNumber = controlNumber;
    } else if (documentNumber) {
      query.documentNumber = documentNumber;
    }

    const doc = await this.billingModel.findOne(query);

    if (!doc) {
      this.logger.warn(`⚠️ Documento no encontrado: ${JSON.stringify(query)}`);
      return;
    }

    // Mapear estado de HKA a estados internos
    let internalStatus = doc.status;

    if (status === 'EMITIDO' || status === 'issued') {
      internalStatus = 'issued';
    } else if (status === 'ANULADO' || status === 'cancelled') {
      internalStatus = 'archived';
    } else if (status === 'RECHAZADO' || status === 'rejected') {
      internalStatus = 'draft';
    }

    await this.billingModel.findByIdAndUpdate(doc._id, {
      $set: {
        status: internalStatus,
        'metadata.lastWebhookUpdate': new Date(),
      },
    });

    this.logger.log(`✅ Estado del documento ${doc.documentNumber} actualizado a ${internalStatus}`);
  }

  /**
   * Extrae datos del documento del payload de HKA
   * Soporta múltiples formatos de payload
   */
  private extractDocumentData(payload: any) {
    return {
      controlNumber: payload.controlNumber || payload.numeroControl || payload.control_number,
      documentNumber: payload.documentNumber || payload.numeroDocumento || payload.document_number,
      documentId: payload.documentId || payload.document_id || payload.id,
      tenantId: payload.tenantId || payload.tenant_id,
      hash: payload.hash || payload.hashSha256,
      verificationUrl: payload.verificationUrl || payload.urlVerificacion || payload.verification_url,
      reason: payload.reason || payload.motivo || payload.mensaje,
      errors: payload.errors || payload.errores || payload.validaciones,
      status: payload.status || payload.estado,
    };
  }

  /**
   * Verifica la firma del webhook (cuando HKA proporcione el método)
   * TODO: Implementar cuando HKA proporcione documentación de firma
   */
  private verifySignature(payload: any, signature: string): boolean {
    // Por ahora, siempre retorna true
    // En producción, implementar verificación real según documentación de HKA
    return true;
  }
}
