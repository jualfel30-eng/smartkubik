import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  StoreCreditAccount,
  StoreCreditAccountDocument,
  StoreCreditMovement,
  StoreCreditMovementDocument,
} from "./schemas/store-credit.schema";

interface MutationParams {
  tenantId: string;
  customerId: string;
  amount: number;
  source: "return" | "order_redemption" | "manual";
  referenceId?: string;
  reference?: string;
  reason?: string;
  createdBy?: string;
}

const oid = (v: string | Types.ObjectId) =>
  typeof v === "string" ? new Types.ObjectId(v) : v;

/**
 * Motor de saldo a favor (store credit). El balance se muta atómicamente:
 *  - `credit`: `$inc` + upsert (nunca falla por carrera).
 *  - `debit`: `findOneAndUpdate` con filtro `balance >= amount` — si no hay
 *    saldo suficiente el update no matchea y devolvemos error (sin read-modify-
 *    write, a prueba de carreras).
 * Cada mutación escribe un movimiento en el ledger con el `balanceAfter` real.
 */
@Injectable()
export class StoreCreditService {
  private readonly logger = new Logger(StoreCreditService.name);

  constructor(
    @InjectModel(StoreCreditAccount.name)
    private readonly accountModel: Model<StoreCreditAccountDocument>,
    @InjectModel(StoreCreditMovement.name)
    private readonly movementModel: Model<StoreCreditMovementDocument>,
  ) {}

  async getBalance(tenantId: string, customerId: string): Promise<number> {
    const acct = await this.accountModel
      .findOne({ tenantId: oid(tenantId), customerId: oid(customerId) })
      .lean();
    return acct?.balance || 0;
  }

  async getMovements(
    tenantId: string,
    customerId: string,
  ): Promise<StoreCreditMovementDocument[]> {
    return this.movementModel
      .find({ tenantId: oid(tenantId), customerId: oid(customerId) })
      .sort({ createdAt: -1 });
  }

  /** Acredita saldo (p.ej. una devolución con reembolso a saldo a favor). */
  async credit(
    params: MutationParams,
  ): Promise<{ balance: number; movement: StoreCreditMovementDocument }> {
    const amount = this.normalizeAmount(params.amount);

    const acct = await this.accountModel.findOneAndUpdate(
      { tenantId: oid(params.tenantId), customerId: oid(params.customerId) },
      { $inc: { balance: amount }, $setOnInsert: { currency: "USD" } },
      { new: true, upsert: true },
    );

    const movement = await this.writeMovement(
      "credit",
      amount,
      acct.balance,
      params,
    );
    this.logger.log(
      `Saldo a favor +${amount} para cliente ${params.customerId} (balance ${acct.balance})`,
    );
    return { balance: acct.balance, movement };
  }

  /** Debita saldo (redención al cobrar una orden). Falla si no hay suficiente. */
  async debit(
    params: MutationParams,
  ): Promise<{ balance: number; movement: StoreCreditMovementDocument }> {
    const amount = this.normalizeAmount(params.amount);

    const acct = await this.accountModel.findOneAndUpdate(
      {
        tenantId: oid(params.tenantId),
        customerId: oid(params.customerId),
        balance: { $gte: amount },
      },
      { $inc: { balance: -amount } },
      { new: true },
    );
    if (!acct) {
      throw new BadRequestException("Saldo a favor insuficiente");
    }

    const movement = await this.writeMovement(
      "debit",
      amount,
      acct.balance,
      params,
    );
    this.logger.log(
      `Saldo a favor -${amount} para cliente ${params.customerId} (balance ${acct.balance})`,
    );
    return { balance: acct.balance, movement };
  }

  private normalizeAmount(raw: number): number {
    const amount = Math.round((Number(raw) || 0) * 100) / 100;
    if (amount <= 0) {
      throw new BadRequestException(
        "El monto de saldo a favor debe ser mayor a 0",
      );
    }
    return amount;
  }

  private async writeMovement(
    type: "credit" | "debit",
    amount: number,
    balanceAfter: number,
    params: MutationParams,
  ): Promise<StoreCreditMovementDocument> {
    return this.movementModel.create({
      tenantId: oid(params.tenantId),
      customerId: oid(params.customerId),
      type,
      amount,
      balanceAfter,
      currency: "USD",
      source: params.source,
      referenceId: params.referenceId ? oid(params.referenceId) : undefined,
      reference: params.reference,
      reason: params.reason,
      createdBy: params.createdBy ? oid(params.createdBy) : undefined,
    });
  }
}
