import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AccountingService } from "../accounting.service";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingDocument } from "../../../schemas/billing-document.schema";

type BillingIssuedEvent = {
  documentId: string;
  tenantId: string;
  seriesId: string;
  controlNumber?: string;
  type: string;
};

@Injectable()
export class BillingAccountingListener {
  private readonly logger = new Logger(BillingAccountingListener.name);

  constructor(
    private readonly accountingService: AccountingService,
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocument>,
  ) {}

  /**
   * Escucha emisión de documentos de facturación para enlazar con contabilidad.
   * TODO: mapear documento → asiento (ingresos/impuestos) según tipo y origen.
   */
  @OnEvent("billing.document.issued")
  async handleBillingIssued(event: BillingIssuedEvent) {
    this.logger.log(
      `Recibido billing.document.issued ${event.documentId} control ${event.controlNumber}`,
    );
    const billing = await this.billingModel.findById(event.documentId);
    if (!billing) {
      this.logger.warn("Documento de billing no encontrado para contabilidad");
      return;
    }
    await this.accountingService.createJournalEntryForBillingDocument(
      billing,
      event.tenantId,
    );
  }
}
