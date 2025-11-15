import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { request as httpsRequest } from "https";
import { MailService } from "../mail/mail.service";
import { NotificationTemplateLoader } from "./templates/notification-template.loader";
import { CustomersService } from "../customers/customers.service";
import {
  Configuration,
  MessagesApi,
  SendMessageTextRequest,
} from "../../lib/whapi-sdk/whapi-sdk-typescript-fetch";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  GlobalSetting,
  GlobalSettingDocument,
} from "../../schemas/global-settings.schema";

export type NotificationChannel = "email" | "sms" | "whatsapp";

export interface TemplateNotificationTarget {
  tenantId: string;
  customerId: string;
  templateId: string;
  channels: NotificationChannel[];
  context: Record<string, any>;
  customerEmail?: string | null;
  customerPhone?: string | null;
  whatsappChatId?: string | null;
  language?: string;
}

export interface AppointmentNotificationTarget
  extends TemplateNotificationTarget {
  appointmentId: string;
}

export interface DispatchResult {
  channel: NotificationChannel;
  success: boolean;
  error?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly twilioAccountSid?: string;
  private readonly twilioAuthToken?: string;
  private readonly twilioSmsFrom?: string;
  private readonly whapiTokenCache = new Map<string, string>();

  constructor(
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly templateLoader: NotificationTemplateLoader,
    private readonly customersService: CustomersService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @InjectModel(GlobalSetting.name)
    private readonly globalSettingModel: Model<GlobalSettingDocument>,
  ) {
    this.twilioAccountSid =
      this.configService.get<string>("TWILIO_ACCOUNT_SID") ?? undefined;
    this.twilioAuthToken =
      this.configService.get<string>("TWILIO_AUTH_TOKEN") ?? undefined;
    this.twilioSmsFrom =
      this.configService.get<string>("TWILIO_SMS_FROM") ?? undefined;
  }

  async sendAppointmentNotification(
    payload: AppointmentNotificationTarget,
  ): Promise<DispatchResult[]> {
    return this.sendTemplateNotification(payload, {
      appointmentId: payload.appointmentId,
    });
  }

  async sendTemplateNotification(
    payload: TemplateNotificationTarget,
    options?: { appointmentId?: string; engagementDelta?: number },
  ): Promise<DispatchResult[]> {
    const template = await this.templateLoader.load(payload.templateId);
    const language = (payload.language || "es").toLowerCase().startsWith("en")
      ? "en"
      : "es";

    const results: DispatchResult[] = [];
    for (const channel of payload.channels) {
      try {
        await this.dispatchChannel({
          channel,
          template,
          language,
          payload,
        });
        results.push({ channel, success: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : `${error}`;
        this.logger.error(
          `Failed to send ${channel} notification for template ${payload.templateId}: ${message}`,
        );
        results.push({ channel, success: false, error: message });
      }
    }

    try {
      await this.customersService.recordCommunicationEvent({
        tenantId: payload.tenantId,
        customerId: payload.customerId,
        event: {
          appointmentId: options?.appointmentId,
          channels: payload.channels,
          templateId: payload.templateId,
          deliveredAt: new Date(),
          contextSnapshot: payload.context,
          engagementDelta: options?.engagementDelta,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Unable to record CRM communication event for template ${payload.templateId}: ${error instanceof Error ? error.message : error}`,
      );
    }

    return results;
  }

  private async dispatchChannel(params: {
    channel: NotificationChannel;
    template: Awaited<ReturnType<NotificationTemplateLoader["load"]>>;
    language: string;
    payload: TemplateNotificationTarget;
  }): Promise<void> {
    const { channel, template, language, payload } = params;
    const channelTemplate = template.channels[channel];
    if (!channelTemplate) {
      this.logger.warn(
        `Template ${template.id} does not include channel ${channel}. Skipping dispatch.`,
      );
      return;
    }

    const renderedSubject = channelTemplate.subject
      ? this.renderTemplate(
          channelTemplate.subject[language] || "",
          payload.context,
        )
      : undefined;
    const renderedBody = this.renderTemplate(
      channelTemplate.body[language] || "",
      payload.context,
    );

    switch (channel) {
      case "email":
        if (!payload.customerEmail) {
          throw new Error(
            "Customer email not available for email notification",
          );
        }
        await this.mailService.sendTemplatedEmail({
          to: payload.customerEmail,
          subject:
            renderedSubject ||
            this.renderTemplate(
              `Notificación de ${payload.context.hotelName || "SmartKubik"}`,
              payload.context,
            ),
          html: renderedBody,
        });
        break;
      case "sms":
        if (!payload.customerPhone) {
          throw new Error("Customer phone not available for SMS notification");
        }
        await this.sendSms(payload.customerPhone, renderedBody);
        break;
      case "whatsapp":
        if (!(payload.whatsappChatId || payload.customerPhone)) {
          throw new Error(
            "Neither WhatsApp chat id nor phone available for WhatsApp notification",
          );
        }
        await this.sendWhatsApp(
          payload.tenantId,
          payload.whatsappChatId ?? payload.customerPhone!,
          renderedBody,
        );
        break;
      default:
        throw new Error(`Unsupported channel ${channel}`);
    }
  }

  private renderTemplate(
    template: string,
    context: Record<string, any>,
  ): string {
    if (!template) {
      return "";
    }

    const withConditionals = template.replace(
      /\{\{#if ([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, rawKey: string, inner: string) => {
        const value = this.resolveContextValue(context, rawKey.trim());
        if (this.isTruthy(value)) {
          return this.renderTemplate(inner, context);
        }
        return "";
      },
    );

    return withConditionals.replace(/\{\{([^}]+)\}\}/g, (_, rawKey: string) => {
      const key = rawKey.trim();
      const value = this.resolveContextValue(context, key);
      if (value === undefined || value === null) {
        return "";
      }
      return String(value);
    });
  }

  private resolveContextValue(context: Record<string, any>, key: string): any {
    if (!key.includes(".")) {
      return context[key];
    }
    return key.split(".").reduce((acc, segment) => {
      if (acc && typeof acc === "object" && segment in acc) {
        return acc[segment];
      }
      return undefined;
    }, context as any);
  }

  private isTruthy(value: any): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  }

  private async sendSms(to: string, body: string): Promise<void> {
    if (
      !this.twilioAccountSid ||
      !this.twilioAuthToken ||
      !this.twilioSmsFrom
    ) {
      this.logger.warn(
        `Twilio SMS credentials missing. Pretending to send SMS to ${to}: ${body}`,
      );
      return;
    }

    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
    const payload = new URLSearchParams({
      To: to,
      From: this.twilioSmsFrom,
      Body: body,
    });
    await this.executeTwilioRequest(url, payload);
  }

  private async sendWhatsApp(
    tenantId: string,
    recipient: string,
    body: string,
  ): Promise<void> {
    const accessToken = await this.resolveWhapiAccessToken(tenantId);
    if (!accessToken) {
      throw new Error(
        `WhatsApp provider token is not configured for tenant ${tenantId || "<unknown>"}`,
      );
    }

    const normalizedRecipient = this.normalizeWhatsAppRecipient(recipient);
    const config = new Configuration({ accessToken });
    const messagesApi = new MessagesApi(config);
    const request: SendMessageTextRequest = {
      senderText: {
        to: normalizedRecipient,
        body,
      },
    };

    try {
      await messagesApi.sendMessageText(request);
      this.logger.log(
        `Sent WhatsApp notification via Whapi to ${normalizedRecipient} (tenant: ${tenantId || "<unknown>"})`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Unknown error: ${JSON.stringify(error)}`;
      throw new Error(`Failed to send WhatsApp message via Whapi: ${message}`);
    }
  }

  private normalizeWhatsAppRecipient(recipient: string): string {
    const trimmed = recipient.trim();
    if (!trimmed) {
      return trimmed;
    }

    if (trimmed.includes("@")) {
      return trimmed;
    }

    if (trimmed.startsWith("+") || /\d+/.test(trimmed)) {
      return trimmed.replace(/[^+\d]/g, "");
    }

    return trimmed;
  }

  private async resolveWhapiAccessToken(
    tenantId: string,
  ): Promise<string | undefined> {
    const cacheKey = tenantId || "__master__";
    const cached = this.whapiTokenCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    let tenantToken: string | undefined;
    if (tenantId) {
      try {
        const tenantObjectId = Types.ObjectId.isValid(tenantId)
          ? new Types.ObjectId(tenantId)
          : undefined;
        const tenant = tenantObjectId
          ? await this.tenantModel
              .findById(tenantObjectId)
              .select("whapiToken")
              .exec()
          : await this.tenantModel
              .findOne({ code: tenantId })
              .select("whapiToken")
              .exec();
        tenantToken = tenant?.whapiToken?.trim() || undefined;
        if (tenantToken) {
          this.whapiTokenCache.set(cacheKey, tenantToken);
          return tenantToken;
        }
      } catch (error) {
        this.logger.warn(
          `Unable to resolve tenant-specific Whapi token for ${tenantId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    const masterCached = this.whapiTokenCache.get("__master__");
    if (masterCached) {
      return masterCached;
    }

    const globalSetting = await this.globalSettingModel
      .findOne({ key: "WHAPI_MASTER_TOKEN" })
      .exec();
    const masterToken = globalSetting?.value?.trim();
    if (masterToken) {
      this.whapiTokenCache.set("__master__", masterToken);
      if (tenantId) {
        this.logger.warn(
          `Tenant ${tenantId} is missing a dedicated WhatsApp token. Falling back to master token.`,
        );
      }
      return masterToken;
    }

    this.logger.warn(
      `No Whapi token configured${tenantId ? ` for tenant ${tenantId}` : " in master settings"}.`,
    );
    return undefined;
  }

  private async executeTwilioRequest(
    url: string,
    payload: URLSearchParams,
  ): Promise<void> {
    const auth = Buffer.from(
      `${this.twilioAccountSid}:${this.twilioAuthToken}`,
    ).toString("base64");

    await new Promise<void>((resolve, reject) => {
      const request = httpsRequest(
        url,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Content-Length": Buffer.byteLength(payload.toString()).toString(),
          },
        },
        (response) => {
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
          response.on("end", () => {
            if (
              response.statusCode &&
              response.statusCode >= 200 &&
              response.statusCode < 300
            ) {
              resolve();
              return;
            }
            const bodyText = Buffer.concat(chunks).toString("utf8");
            reject(
              new Error(
                `Twilio request failed with status ${response.statusCode}: ${bodyText}`,
              ),
            );
          });
        },
      );

      request.on("error", (error) => reject(error));
      request.write(payload.toString());
      request.end();
    });
  }
}
