import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import {
  JournalEntry,
  JournalEntryDocument,
} from "../../schemas/journal-entry.schema";

/**
 * Asiento contable de una devolución (Fase 0.1).
 *
 * Vive en el módulo returns —no en accounting.service.ts— a propósito: tocar
 * ese archivo legacy arrastra ~286 errores prettier preexistentes al gate de
 * lint. Aquí replicamos el mínimo necesario (findOrCreateAccount + creación del
 * asiento) sin reformatear el módulo fiscal.
 *
 * Contabilidad correcta de una devolución de venta:
 *   - Débito a "Devoluciones en Ventas" (contra-ingreso 4102, reduce ingresos)
 *   - Crédito según cómo se reembolsa:
 *       · efectivo → "Caja" (1101) — sale el dinero hacia el cliente
 *       · saldo a favor → "Saldo a favor de clientes" (2104, Pasivo) — el
 *         negocio queda debiéndole al cliente, no sale caja
 */
@Injectable()
export class ReturnsAccountingService {
  private readonly logger = new Logger(ReturnsAccountingService.name);

  constructor(
    @InjectModel(ChartOfAccounts.name)
    private readonly chartOfAccountsModel: Model<ChartOfAccountsDocument>,
    @InjectModel(JournalEntry.name)
    private readonly journalEntryModel: Model<JournalEntryDocument>,
  ) {}

  private async findOrCreateAccount(
    details: { code: string; name: string; type: string },
    tenantId: string,
  ): Promise<ChartOfAccountsDocument> {
    const existing = await this.chartOfAccountsModel.findOne({
      code: details.code,
      tenantId,
    });
    if (existing) return existing;

    const account = new this.chartOfAccountsModel({
      ...details,
      isSystemAccount: true,
      isEditable: false,
      tenantId,
    });
    return account.save();
  }

  /**
   * Crea el asiento de la devolución. Devuelve null si el monto es <= 0.
   * Pensado para llamarse dentro de try/catch: si algo falla, la devolución
   * igual queda registrada (la salida real de dinero ya está en la caja).
   */
  async createRefundEntry(params: {
    tenantId: string;
    refundAmount: number;
    orderId: string;
    orderNumber?: string;
    customerName?: string;
    returnNumber?: string;
    transactionDate: Date;
    refundMethod?: "cash" | "store_credit";
  }): Promise<JournalEntryDocument | null> {
    const {
      tenantId,
      refundAmount,
      orderId,
      orderNumber,
      customerName,
      returnNumber,
      transactionDate,
      refundMethod = "cash",
    } = params;

    const amount = Math.round((Number(refundAmount) || 0) * 100) / 100;
    if (amount <= 0) return null;

    const salesReturnsAccount = await this.findOrCreateAccount(
      { code: "4102", name: "Devoluciones en Ventas", type: "Ingreso" },
      tenantId,
    );
    // El crédito va a Caja (efectivo) o al pasivo de saldo a favor.
    const creditAccount =
      refundMethod === "store_credit"
        ? await this.findOrCreateAccount(
            { code: "2104", name: "Saldo a favor de clientes", type: "Pasivo" },
            tenantId,
          )
        : await this.findOrCreateAccount(
            { code: "1101", name: "Caja", type: "Activo" },
            tenantId,
          );
    const creditDesc =
      refundMethod === "store_credit"
        ? `Saldo a favor al cliente (${orderNumber || orderId})`
        : `Reembolso en efectivo (${orderNumber || orderId})`;

    const descBase = [
      "Devolución de venta",
      orderNumber ? `Orden ${orderNumber}` : undefined,
      customerName ? `- ${customerName}` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
    const description = descBase || `Devolución ${returnNumber || orderId}`;

    const entry = new this.journalEntryModel({
      date: transactionDate,
      description,
      lines: [
        {
          account: salesReturnsAccount._id,
          debit: amount,
          credit: 0,
          description,
        },
        {
          account: creditAccount._id,
          debit: 0,
          credit: amount,
          description: creditDesc,
        },
      ],
      tenantId,
      isAutomatic: true,
      metadata: {
        createdFrom: "order_return_refund",
        orderId,
        orderNumber: orderNumber ?? null,
        returnNumber: returnNumber ?? null,
        customerName: customerName ?? null,
        refundAmount: amount,
        refundMethod,
      },
    });

    return entry.save();
  }
}
