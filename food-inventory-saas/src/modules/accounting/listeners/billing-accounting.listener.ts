import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AccountingService } from "../accounting.service";
import { IvaSalesBookService } from "../services/iva-sales-book.service";

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
  subtotal: number;
  taxAmount: number;
  total: number;
  taxes: Array<{ type: string; rate: number; amount: number }>;
};

@Injectable()
export class BillingAccountingListener {
  private readonly logger = new Logger(BillingAccountingListener.name);

  constructor(
    private readonly accountingService: AccountingService,
    private readonly ivaSalesBookService: IvaSalesBookService,
  ) { }

  /**
   * Escucha emisión de documentos de facturación y crea automáticamente:
   * 1. Asiento contable (débito CxC, crédito Ingresos + IVA)
   * 2. Entrada en Libro de Ventas IVA
   */
  @OnEvent("billing.document.issued")
  async handleBillingIssued(event: BillingIssuedEvent) {
    this.logger.log(
      `📄 Procesando factura emitida: ${event.documentNumber} (${event.controlNumber})`,
    );

    try {
      // 1. Crear asiento contable
      await this.createJournalEntry(event);

      // 2. Registrar en Libro de Ventas
      await this.registerInSalesBook(event);

      this.logger.log(
        `✅ Factura ${event.documentNumber} procesada exitosamente`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Error procesando factura ${event.documentNumber}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Crea el asiento contable automático para la factura emitida
   * Débito: 1102 Cuentas por Cobrar
   * Crédito: 4101 Ingresos por Ventas + 2102 IVA por Pagar
   */
  private async createJournalEntry(event: BillingIssuedEvent) {
    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // Tipo de documento determina el signo (credit_note invierte el asiento)
    const isCredit = event.type === "credit_note";
    const multiplier = isCredit ? -1 : 1;

    // Débito: Cuentas por Cobrar
    lines.push({
      accountId: "1102", // Cuentas por Cobrar
      debit: event.total * multiplier,
      credit: 0,
      description: `${event.type === "invoice" ? "Factura" : event.type === "credit_note" ? "Nota de Crédito" : "Documento"} ${event.documentNumber}`,
    });

    // Crédito: Ingresos por Ventas
    lines.push({
      accountId: "4101", // Ingresos por Ventas
      debit: 0,
      credit: event.subtotal * multiplier,
      description: `Venta ${event.customerName || "Cliente"}`,
    });

    // Crédito: IVA por Pagar
    if (event.taxAmount > 0) {
      lines.push({
        accountId: "2102", // IVA por Pagar
        debit: 0,
        credit: event.taxAmount * multiplier,
        description: "IVA Débito Fiscal",
      });
    }

    await this.accountingService.createJournalEntry(
      {
        date: event.issueDate,
        description: `Factura ${event.documentNumber} - ${event.customerName || "Cliente"}`,
        lines,
        isAutomatic: true,
      },
      event.tenantId,
    );

    this.logger.log(`  ✓ Asiento contable creado para ${event.documentNumber}`);
  }

  /**
   * Registra la factura en el Libro de Ventas IVA
   * Valida RIF antes de crear la entrada
   */
  private async registerInSalesBook(event: BillingIssuedEvent) {
    // Validar RIF del cliente antes de proceder
    const customerRif = event.customerRif || "J-00000000-0";
    if (!/^[VEJPG]-\d{8,9}-\d$/.test(customerRif)) {
      this.logger.warn(
        `  ⚠️  RIF inválido para ${event.documentNumber}: "${customerRif}". Se registrará de todas formas.`,
      );
    }

    // Extraer mes y año de la fecha de emisión
    const issueDate = new Date(event.issueDate);
    const month = issueDate.getMonth() + 1;
    const year = issueDate.getFullYear();

    // Obtener datos de IVA (asumiendo que el primer tax es IVA)
    const ivaTax = event.taxes.find((t) => t.type === "IVA");
    const ivaRate = ivaTax?.rate !== undefined ? ivaTax.rate : 16;
    const ivaAmount = ivaTax?.amount !== undefined ? ivaTax.amount : event.taxAmount;

    // Validar que el control number exista
    if (!event.controlNumber) {
      this.logger.warn(
        `  ⚠️  Factura ${event.documentNumber} sin número de control SENIAT`,
      );
    }

    await this.ivaSalesBookService.create(
      {
        month,
        year,
        operationDate: event.issueDate,
        customerId: `BILLING-${event.documentId}`, // Usar documentId como referencia
        customerName: event.customerName || "Cliente sin nombre",
        customerRif,
        customerAddress: event.customerAddress,
        invoiceNumber: event.documentNumber,
        invoiceControlNumber: event.controlNumber || "",
        invoiceDate: event.issueDate,
        transactionType: event.type === "invoice" ? "sale" : event.type === "credit_note" ? "credit_note" : "sale",
        baseAmount: event.subtotal,
        ivaRate,
        ivaAmount,
        totalAmount: event.total,
        isElectronic: true, // SENIAT digital
        electronicCode: event.controlNumber,
      },
      { tenantId: event.tenantId, _id: "system" } as any, // User system
    );

    this.logger.log(
      `  ✓ Entrada en Libro de Ventas creada para ${event.documentNumber}`,
    );
  }
}
