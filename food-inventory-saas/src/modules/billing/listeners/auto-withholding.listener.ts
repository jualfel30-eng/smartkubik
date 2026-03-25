import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { WithholdingService } from '../withholding.service';
import { Tenant } from '../../../schemas/tenant.schema';
import { PurchaseOrder } from '../../../schemas/purchase-order.schema';
import { BillingDocument } from '../../../schemas/billing-document.schema';

interface PurchaseReceivedEvent {
  purchaseOrderId: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  ivaTotal: number;
  subtotal: number;
  tenantId: string;
  billingDocumentId?: string;
}

/**
 * Listener que genera comprobantes de retención automáticamente cuando se recibe una compra,
 * si el tenant tiene habilitada la opción autoWithholdingOnPurchase.
 *
 * Características:
 * - Genera retenciones IVA automáticamente según configuración del tenant
 * - Vincula las retenciones con el documento de facturación de compra
 * - Respeta las series configuradas para retenciones
 */
@Injectable()
export class AutoWithholdingListener {
  private readonly logger = new Logger(AutoWithholdingListener.name);

  constructor(
    private readonly withholdingService: WithholdingService,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<Tenant>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrder>,
    @InjectModel(BillingDocument.name)
    private readonly billingDocumentModel: Model<BillingDocument>,
  ) {}

  @OnEvent('purchase.received')
  async handlePurchaseReceived(event: PurchaseReceivedEvent) {
    try {
      // 1. Verificar si el tenant tiene auto-retención habilitada
      const tenant: any = await this.tenantModel
        .findOne({ tenantId: event.tenantId })
        .lean();

      if (!tenant?.settings?.billingPreferences?.autoWithholdingOnPurchase) {
        return; // Auto-retención no habilitada, salir silenciosamente
      }

      this.logger.log(
        `Auto-withholding triggered for PO ${event.poNumber} (tenant: ${event.tenantId})`,
      );

      // 2. Verificar que existe una factura de compra asociada
      if (!event.billingDocumentId) {
        this.logger.warn(
          `Auto-withholding: PO ${event.poNumber} has no billing document, skipping`,
        );
        return;
      }

      // 3. Obtener el documento de facturación
      const billingDoc: any = await this.billingDocumentModel
        .findById(event.billingDocumentId)
        .lean();

      if (!billingDoc || billingDoc.status !== 'issued') {
        this.logger.warn(
          `Auto-withholding: Billing document ${event.billingDocumentId} not found or not issued, skipping`,
        );
        return;
      }

      // 4. Verificar que no tenga ya retenciones creadas
      const existingWithholding = await this.withholdingService.findByInvoice(
        event.billingDocumentId,
        event.tenantId,
      );

      if (existingWithholding && existingWithholding.length > 0) {
        this.logger.log(
          `Auto-withholding: PO ${event.poNumber} already has withholding documents, skipping`,
        );
        return;
      }

      // 5. Obtener configuración de retenciones del tenant
      const withholdingConfig = tenant.settings.billingPreferences.withholdingConfig || {};
      const { enableIva, ivaPercentage, ivaSeriesId, enableIslr, islrPercentage, islrSeriesId, islrConceptCode, islrConceptDescription } = withholdingConfig;

      // 6. Crear retención IVA si está habilitada y hay monto de IVA
      if (enableIva && event.ivaTotal > 0 && ivaSeriesId) {
        try {
          const ivaRetention = await this.withholdingService.createIvaRetention(
            {
              affectedDocumentId: event.billingDocumentId,
              retentionPercentage: ivaPercentage || 75,
              seriesId: ivaSeriesId,
              notes: `Generada automáticamente desde OC ${event.poNumber}`,
            },
            event.tenantId,
            undefined, // System-generated
          );

          this.logger.log(
            `Auto-withholding: Created IVA retention ${ivaRetention.documentNumber} for PO ${event.poNumber}`,
          );
        } catch (error) {
          this.logger.error(
            `Auto-withholding: Failed to create IVA retention for PO ${event.poNumber}: ${error.message}`,
          );
        }
      }

      // 7. Crear retención ISLR si está habilitada
      if (enableIslr && event.subtotal > 0 && islrSeriesId && islrConceptCode) {
        try {
          const islrRetention = await this.withholdingService.createIslrRetention(
            {
              affectedDocumentId: event.billingDocumentId,
              conceptCode: islrConceptCode,
              conceptDescription: islrConceptDescription || 'Retención ISLR por servicio',
              retentionPercentage: islrPercentage || 5,
              seriesId: islrSeriesId,
              notes: `Generada automáticamente desde OC ${event.poNumber}`,
            },
            event.tenantId,
            undefined, // System-generated
          );

          this.logger.log(
            `Auto-withholding: Created ISLR retention ${islrRetention.documentNumber} for PO ${event.poNumber}`,
          );
        } catch (error) {
          this.logger.error(
            `Auto-withholding: Failed to create ISLR retention for PO ${event.poNumber}: ${error.message}`,
          );
        }
      }
    } catch (error) {
      // No lanzar el error para no afectar otros listeners de purchase.received
      this.logger.error(
        `Auto-withholding failed for PO ${event.poNumber} (tenant: ${event.tenantId}): ${error.message}`,
        error.stack,
      );
    }
  }
}
