import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import axios from "axios";
import { createHmac } from "crypto";
import {
  PayrollWebhookConfig,
  PayrollWebhookConfigDocument,
} from "../../schemas/payroll-webhook-config.schema";

@Injectable()
export class PayrollWebhooksService {
  constructor(
    @InjectModel(PayrollWebhookConfig.name)
    private readonly configModel: Model<PayrollWebhookConfigDocument>,
  ) {}

  private toObjectId(id: string | Types.ObjectId) {
    return id instanceof Types.ObjectId ? id : new Types.ObjectId(id);
  }

  async getConfig(tenantId: string) {
    return this.configModel
      .findOne({ tenantId: this.toObjectId(tenantId) })
      .lean();
  }

  async upsertConfig(tenantId: string, payload: Partial<PayrollWebhookConfig>) {
    const result = await this.configModel.findOneAndUpdate(
      { tenantId: this.toObjectId(tenantId) },
      { $set: { ...payload, tenantId: this.toObjectId(tenantId) } },
      { new: true, upsert: true },
    );
    return result.toObject();
  }

  private signPayload(secret: string, body: any) {
    const json = JSON.stringify(body);
    return createHmac("sha256", secret).update(json).digest("hex");
  }

  async sendTest(tenantId: string, event: string = "payroll.test") {
    const config = await this.getConfig(tenantId);
    if (!config?.enabled) {
      throw new Error("Webhook no configurado o deshabilitado");
    }
    return this.dispatch(config, event, { ping: true });
  }

  async dispatchEvent(tenantId: string, event: string, data: any) {
    const config = await this.getConfig(tenantId);
    if (!config || !config.enabled) return;
    await this.dispatch(config, event, data);
  }

  private async dispatch(
    config: PayrollWebhookConfig,
    event: string,
    data: any,
  ) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };
    const signature = this.signPayload(config.secret, payload);
    const maxRetries = config.maxRetries ?? 3;
    const retryDelayMs = config.retryDelayMs ?? 2000;
    let attempt = 0;
    let lastError: any = null;
    while (attempt < maxRetries) {
      try {
        const resp = await axios.post(config.endpointUrl, payload, {
          headers: {
            "Content-Type": "application/json",
            "X-Payroll-Signature": signature,
            "X-Payroll-Event": event,
          },
          timeout: 5000,
        });
        await this.configModel.updateOne(
          { tenantId: config.tenantId },
          {
            $set: {
              lastAttemptAt: new Date(),
              lastStatusCode: resp.status,
              lastError: undefined,
            },
          },
        );
        return;
      } catch (err: any) {
        lastError = err;
        attempt += 1;
        if (attempt >= maxRetries) break;
        await new Promise((res) => setTimeout(res, retryDelayMs));
      }
    }
    await this.configModel.updateOne(
      { tenantId: config.tenantId },
      {
        $set: {
          lastAttemptAt: new Date(),
          lastStatusCode: lastError?.response?.status,
          lastError: lastError?.message,
        },
      },
    );
  }
}
