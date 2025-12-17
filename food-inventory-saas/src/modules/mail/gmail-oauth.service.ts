import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { google } from "googleapis";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { encrypt, decrypt, encryptState } from "../../utils/encryption.util";
import { randomUUID } from "crypto";

@Injectable()
export class GmailOAuthService {
  private readonly logger = new Logger(GmailOAuthService.name);
  private oauth2Client;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {
    const apiBaseUrl = this.configService.get<string>("API_BASE_URL");
    if (!apiBaseUrl) {
      this.logger.warn(
        "API_BASE_URL not defined. Gmail OAuth callback URL might be incorrect.",
      );
    }

    // Reutiliza las mismas credenciales de Google OAuth ya configuradas
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>("GOOGLE_CLIENT_ID"),
      this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
      `${apiBaseUrl || ""}/api/v1/email-config/gmail/callback`,
    );
  }

  /**
   * Generar URL de autorización para Gmail
   */
  getAuthUrl(tenantId: string): string {
    this.logger.log(`Generating Gmail auth URL for tenant ${tenantId}`);

    const state = encryptState(tenantId);

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      prompt: "consent", // Forzar para obtener refresh_token
      scope: [
        "https://www.googleapis.com/auth/gmail.send", // Enviar emails
        "https://www.googleapis.com/auth/gmail.modify", // Leer/etiquetar
        "https://www.googleapis.com/auth/calendar", // Calendario completo (eventos/watch)
        "https://www.googleapis.com/auth/userinfo.email", // Obtener email del usuario
      ],
      state, // Encrypted tenant ID
    });
  }

  /**
   * Manejar callback de Google OAuth
   */
  async handleCallback(code: string, tenantId: string): Promise<void> {
    this.logger.log(`Handling Gmail OAuth callback for tenant ${tenantId}`);

    try {
      // Intercambiar code por tokens
      const { tokens } = await this.oauth2Client.getToken(code);

      this.logger.log(
        `Received tokens for tenant ${tenantId}: ${JSON.stringify({
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
        })}`,
      );

      // Obtener email del usuario
      this.oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: "v2", auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      // Guardar tokens encriptados en el tenant
      await this.tenantModel.updateOne(
        { _id: tenantId },
        {
          $set: {
            "emailConfig.provider": "gmail",
            "emailConfig.enabled": true,
            "emailConfig.gmailAccessToken": encrypt(tokens.access_token || ""),
            "emailConfig.gmailRefreshToken": encrypt(
              tokens.refresh_token || "",
            ),
            "emailConfig.gmailEmail": data.email,
          },
        },
      );

      this.logger.log(
        `Gmail OAuth configured successfully for tenant ${tenantId} with email ${data.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle Gmail OAuth callback for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async watchCalendar(tenantId: string, webhookUrl: string) {
    const calendar = await this.getCalendarClient(tenantId);
    const channelId = randomUUID();
    const watchReq = {
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
      },
      calendarId: "primary",
    } as any;
    const res = await calendar.events.watch(watchReq);
    const expiration = res.data.expiration ? new Date(Number(res.data.expiration)) : undefined;
    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "calendarConfig.provider": "google",
          "calendarConfig.watch": {
            channelId,
            resourceId: res.data.resourceId,
            expiration,
            address: webhookUrl,
          },
        },
      },
    );
    this.logger.log(`Calendar watch set for tenant ${tenantId}, channel ${channelId}`);
    return res.data;
  }

  private async getCalendarClient(tenantId: string) {
    const tenant = await this.tenantModel.findById(tenantId).exec();
    if (
      !tenant ||
      !tenant.emailConfig?.gmailAccessToken ||
      !tenant.emailConfig?.gmailRefreshToken
    ) {
      throw new Error("Gmail/Calendar not configured for this tenant");
    }
    this.oauth2Client.setCredentials({
      access_token: decrypt(tenant.emailConfig.gmailAccessToken),
      refresh_token: decrypt(tenant.emailConfig.gmailRefreshToken),
    });
    return google.calendar({ version: "v3", auth: this.oauth2Client });
  }

  /**
   * Desconectar Gmail
   */
  async disconnect(tenantId: string): Promise<void> {
    this.logger.log(`Disconnecting Gmail for tenant ${tenantId}`);

    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.provider": "none",
          "emailConfig.enabled": false,
        },
        $unset: {
          "emailConfig.gmailAccessToken": "",
          "emailConfig.gmailRefreshToken": "",
          "emailConfig.gmailEmail": "",
        },
      },
    );
  }

  /**
   * Enviar email usando Gmail API
   */
  async sendEmail(
    tenantId: string,
    options: {
      to: string;
      subject: string;
      html: string;
      text?: string;
    },
  ): Promise<void> {
    this.logger.log(
      `Sending email via Gmail for tenant ${tenantId} to ${options.to}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();

    if (
      !tenant ||
      !tenant.emailConfig?.gmailAccessToken ||
      !tenant.emailConfig?.gmailRefreshToken
    ) {
      throw new Error("Gmail not configured for this tenant");
    }

    try {
      // Configurar credenciales
      this.oauth2Client.setCredentials({
        access_token: decrypt(tenant.emailConfig.gmailAccessToken),
        refresh_token: decrypt(tenant.emailConfig.gmailRefreshToken),
      });

      // Crear mensaje en formato RFC 2822
      const message = this.createMessage(
        tenant.emailConfig.gmailEmail!,
        options.to,
        options.subject,
        options.html,
        options.text,
      );

      // Enviar usando Gmail API
      const gmail = google.gmail({ version: "v1", auth: this.oauth2Client });

      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: Buffer.from(message).toString("base64url"),
        },
      });

      this.logger.log(
        `Email sent successfully via Gmail for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email via Gmail for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );

      // Si el token expiró, intentar refrescar
      if (error.message?.includes("invalid_grant")) {
        this.logger.log(
          `Refreshing Gmail tokens for tenant ${tenantId} and retrying`,
        );
        await this.refreshTokens(tenantId);
        // Retry una vez con token actualizado
        return this.sendEmail(tenantId, options);
      }

      throw error;
    }
  }

  /**
   * Refrescar tokens de Gmail
   */
  private async refreshTokens(tenantId: string): Promise<void> {
    const tenant = await this.tenantModel.findById(tenantId).exec();

    if (!tenant?.emailConfig?.gmailRefreshToken) {
      throw new Error("No refresh token available");
    }

    this.oauth2Client.setCredentials({
      refresh_token: decrypt(tenant.emailConfig.gmailRefreshToken),
    });

    const { credentials } = await this.oauth2Client.refreshAccessToken();

    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.gmailAccessToken": encrypt(
            credentials.access_token || "",
          ),
        },
      },
    );

    this.logger.log(`Gmail tokens refreshed for tenant ${tenantId}`);
  }

  /**
   * Crear mensaje en formato RFC 2822
   */
  private createMessage(
    from: string,
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): string {
    const boundary = "boundary_" + Math.random().toString(36).substr(2);

    const message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      "",
    ];

    // Text part
    if (text) {
      message.push(`--${boundary}`);
      message.push("Content-Type: text/plain; charset=UTF-8");
      message.push("");
      message.push(text);
      message.push("");
    }

    // HTML part
    message.push(`--${boundary}`);
    message.push("Content-Type: text/html; charset=UTF-8");
    message.push("");
    message.push(html);
    message.push("");
    message.push(`--${boundary}--`);

    return message.join("\r\n");
  }
}
