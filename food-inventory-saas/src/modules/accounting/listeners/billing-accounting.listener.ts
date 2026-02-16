import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { AccountingService } from "../accounting.service";
import { IvaSalesBookService } from "../services/iva-sales-book.service";
import {
  BillingDocument,
  BillingDocumentDocument,
} from "../../../schemas/billing-document.schema";

type BillingIssuedEvent = {
  documentId: string;
  tenantId: string;
  seriesId: string;
  controlNumber?: string;
  type: string;
  documentNumber: string;
  issueDate: string;
  customerName?: string;
  customerRif?: string;
  customerAddress?: string;
  // Montos originales (moneda del documento)
  subtotal: number;
  taxAmount: number;
  total: number;
  taxes: Array<{ type: string; rate: number; amount: number }>;
  currency: string;
  exchangeRate: number;
  // Montos en VES pre-calculados en issue() — fuente de verdad
  subtotalVes: number;
  taxAmountVes: number;
  totalVes: number;
};

@Injectable()
export class BillingAccountingListener {
  private readonly logger = new Logger(BillingAccountingListener.name);

  constructor(
    private readonly accountingService: AccountingService,
    private readonly ivaSalesBookService: IvaSalesBookService,
    @InjectModel(BillingDocument.name)
    private readonly billingDocumentModel: Model<BillingDocumentDocument>,
  ) {}

  /**
   * Escucha emisión de documentos de facturación y crea automáticamente:
   * 1. Asiento contable en VES (débito CxC, crédito Ingresos + IVA)
   * 2. Entrada en Libro de Ventas IVA
   */
  @OnEvent("billing.document.issued")
  async handleBillingIssued(event: BillingIssuedEvent) {
    this.logger.log(
      `Procesando factura emitida: ${event.documentNumber} (${event.controlNumber}) ` +
        `[${event.currency} @ ${event.exchangeRate}] → VES total: ${event.totalVes}`,
    );

    try {
      await this.createJournalEntry(event);
      await this.registerInSalesBook(event);

      this.logger.log(
        `Factura ${event.documentNumber} procesada exitosamente`,
      );
    } catch (error) {
      this.logger.error(
        `Error procesando factura ${event.documentNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Crea el asiento contable usando los montos VES ya calculados en la factura.
   * No recalcula nada — la factura es la fuente de verdad.
   */
  private async createJournalEntry(event: BillingIssuedEvent) {
    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // credit_note invierte el asiento
    const isCredit = event.type === "credit_note";
    const multiplier = isCredit ? -1 : 1;

    const docLabel =
      event.type === "invoice"
        ? "Factura"
        : event.type === "credit_note"
          ? "Nota de Crédito"
          : "Documento";

    // Débito: Cuentas por Cobrar (monto total VES de la factura)
    lines.push({
      accountId: "1102",
      debit: event.totalVes * multiplier,
      credit: 0,
      description: `${docLabel} ${event.documentNumber}`,
    });

    // Crédito: Ingresos por Ventas (subtotal VES de la factura)
    lines.push({
      accountId: "4101",
      debit: 0,
      credit: event.subtotalVes * multiplier,
      description: `Venta ${event.customerName || "Cliente"}`,
    });

    // Crédito: IVA por Pagar (IVA VES de la factura)
    if (event.taxAmountVes > 0) {
      lines.push({
        accountId: "2102",
        debit: 0,
        credit: event.taxAmountVes * multiplier,
        description: "IVA Débito Fiscal",
      });
    }

    await this.accountingService.createJournalEntry(
      {
        date: event.issueDate,
        description: `${docLabel} ${event.documentNumber} - ${event.customerName || "Cliente"} (Bs. ${event.totalVes.toLocaleString("es-VE")})`,
        lines,
        isAutomatic: true,
      },
      event.tenantId,
    );

    this.logger.log(
      `  Asiento contable creado: ${event.documentNumber} → Bs. ${event.totalVes}`,
    );
  }

  /**
   * Registra la factura en el Libro de Ventas IVA usando syncFromBillingDocument
   */
  private async registerInSalesBook(event: BillingIssuedEvent) {
    const billingDoc = await this.billingDocumentModel
      .findById(event.documentId)
      .lean();

    if (!billingDoc) {
      this.logger.warn(
        `BillingDocument ${event.documentId} no encontrado para registro en Libro de Ventas.`,
      );
      return;
    }

    await this.ivaSalesBookService.syncFromBillingDocument(
      event.documentId,
      billingDoc,
      { tenantId: event.tenantId, _id: "system" } as any,
    );

    this.logger.log(
      `  Entrada en Libro de Ventas creada para ${event.documentNumber}`,
    );
  }
}
