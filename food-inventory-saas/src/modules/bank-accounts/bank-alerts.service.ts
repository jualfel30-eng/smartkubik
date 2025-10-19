import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  BankAccount,
  BankAccountDocument,
} from "../../schemas/bank-account.schema";
import { EventsService } from "../events/events.service";

interface AlertOptions {
  userId?: string;
}

@Injectable()
export class BankAlertsService {
  private readonly logger = new Logger(BankAlertsService.name);
  private static readonly ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 horas

  constructor(
    @InjectModel(BankAccount.name)
    private readonly bankAccountModel: Model<BankAccountDocument>,
    private readonly eventsService: EventsService,
  ) {}

  async evaluateBalance(
    account: BankAccountDocument,
    tenantId: string,
    options: AlertOptions = {},
  ): Promise<void> {
    if (!account?.alertEnabled || account.minimumBalance == null) {
      return;
    }

    const currentBalance = Number(account.currentBalance ?? 0);
    const minimumBalance = Number(account.minimumBalance ?? 0);

    if (!Number.isFinite(currentBalance) || !Number.isFinite(minimumBalance)) {
      this.logger.warn(
        `Cannot evaluate alerts for account ${account._id}: invalid balance values.`,
      );
      return;
    }

    if (currentBalance > minimumBalance) {
      if (account.lastAlertSentAt) {
        await this.bankAccountModel
          .updateOne({ _id: account._id }, { $unset: { lastAlertSentAt: "" } })
          .exec();
      }
      return;
    }

    const now = new Date();
    if (
      account.lastAlertSentAt &&
      now.getTime() - account.lastAlertSentAt.getTime() <
        BankAlertsService.ALERT_INTERVAL_MS
    ) {
      return;
    }

    try {
      await this.eventsService.create(
        {
          title: `⚠️ Saldo bajo: ${account.bankName}`,
          description: `La cuenta ${account.accountNumber} tiene un saldo de ${currentBalance.toFixed(
            2,
          )} ${account.currency}. Umbral configurado: ${minimumBalance.toFixed(
            2,
          )}.`,
          start: now.toISOString(),
          allDay: true,
          color: "#f59e0b",
        },
        {
          id: options.userId ?? `system-bank-alert-${tenantId}`,
          tenantId,
        },
        undefined,
        { syncTodo: false },
      );

      await this.bankAccountModel
        .updateOne({ _id: account._id }, { $set: { lastAlertSentAt: now } })
        .exec();

      this.logger.warn(
        `Low balance alert triggered for bank account ${account._id}: balance ${currentBalance} ${account.currency}.`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to trigger bank alert for account ${account._id}: ${error.message}`,
        error.stack,
      );
    }
  }
}
