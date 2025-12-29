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
    let apiBaseUrl = this.configService.get<string>("API_BASE_URL");

    // Si no está definido, usar fallback según entorno
    if (!apiBaseUrl) {
      const isProd = this.configService.get<string>("NODE_ENV") === "production";
      apiBaseUrl = isProd
        ? "https://api.smartkubik.com"
        : "http://localhost:3000";

      this.logger.warn(
        `API_BASE_URL not defined. Using fallback '${apiBaseUrl}' for Gmail OAuth callback.`,
      );
    }

    // Reutiliza las mismas credenciales de Google OAuth ya configuradas
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get<string>("GOOGLE_CLIENT_ID"),
      this.configService.get<string>("GOOGLE_CLIENT_SECRET"),
      `${apiBaseUrl}/api/v1/email-config/gmail/callback`,
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
    this.logger.log(`Setting up calendar watch for tenant ${tenantId} at ${webhookUrl}`);
    try {
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

      this.logger.log(`Sending watch request to Google for channel ${channelId}`);
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
      this.logger.log(`Calendar watch set successfully for tenant ${tenantId}, channel ${channelId}`);
      return res.data;
    } catch (error) {
      this.logger.error(`Failed in watchCalendar for tenant ${tenantId}: ${error.message}`, error.stack);
      throw error;
    }
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
   * Crear calendario secundario en Google Calendar
   */
  async createSecondaryCalendar(
    tenantId: string,
    calendarData: {
      summary: string;
      description?: string;
      timeZone?: string;
    },
    color?: string,
  ): Promise<string> {
    this.logger.log(`Creating secondary calendar "${calendarData.summary}" for tenant ${tenantId}`);

    try {
      const calendar = await this.getCalendarClient(tenantId);

      // Crear el calendario secundario
      const response = await calendar.calendars.insert({
        requestBody: {
          summary: calendarData.summary,
          description: calendarData.description,
          timeZone: calendarData.timeZone || "America/Caracas",
        },
      });

      const calendarId = response.data.id;

      if (!calendarId) {
        throw new Error("Google Calendar did not return a calendar ID");
      }

      // Configurar el color si se proporcionó
      if (color) {
        try {
          // Mapear color hex a colorId de Google Calendar (1-24)
          const colorId = this.getGoogleCalendarColorId(color);

          await calendar.calendarList.update({
            calendarId,
            requestBody: {
              colorId,
            },
          });
        } catch (colorError) {
          this.logger.warn(`Could not set color for calendar: ${colorError.message}`);
        }
      }

      this.logger.log(`Secondary calendar created successfully: ${calendarId}`);
      return calendarId;
    } catch (error) {
      this.logger.error(`Failed to create secondary calendar: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Mapear color hex a colorId de Google Calendar
   * Google Calendar usa IDs predefinidos (1-24)
   */
  private getGoogleCalendarColorId(hexColor: string): string {
    // Mapeo aproximado de colores hex a IDs de Google Calendar
    const colorMap: Record<string, string> = {
      "#FF6B6B": "11", // Rojo
      "#4ECDC4": "7",  // Cyan
      "#95E1D3": "2",  // Verde claro
      "#F38181": "4",  // Rosa
      "#3B82F6": "9",  // Azul
      "#9333EA": "3",  // Púrpura
    };

    return colorMap[hexColor] || "9"; // Default: azul
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

  /**
   * Crear un watch channel para recibir notificaciones de cambios en un calendario
   * Solo funciona para calendarios del ERP sincronizados con Google
   */
  async createWatchChannel(
    tenantId: string,
    googleCalendarId: string,
    webhookUrl: string,
  ): Promise<{
    id: string;
    resourceId: string;
    expiration: number;
    token: string;
  }> {
    try {
      const calendar = await this.getCalendarClient(tenantId);

      // Generar un ID único y un token de verificación
      const channelId = randomUUID();
      const channelToken = randomUUID();

      this.logger.log(
        `Creating watch channel for calendar ${googleCalendarId} (tenant: ${tenantId})`,
      );

      const expirationTime = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 días

      const response = await calendar.events.watch({
        calendarId: googleCalendarId,
        requestBody: {
          id: channelId,
          type: "web_hook",
          address: webhookUrl,
          token: channelToken,
          // Los watch channels expiran después de cierto tiempo (máx 30 días para Calendar API)
          expiration: expirationTime.toString(),
        },
      });

      this.logger.log(
        `Watch channel created successfully: ${response.data.id}`,
      );

      return {
        id: response.data.id || channelId,
        resourceId: response.data.resourceId || "",
        expiration: response.data.expiration
          ? parseInt(response.data.expiration as string)
          : expirationTime,
        token: channelToken,
      };
    } catch (error) {
      this.logger.error(
        `Error creating watch channel for calendar ${googleCalendarId}:`,
        error,
      );
      throw new Error(`Failed to create watch channel: ${error.message}`);
    }
  }

  /**
   * Detener un watch channel existente
   */
  async stopWatchChannel(
    tenantId: string,
    channelId: string,
    resourceId: string,
  ): Promise<void> {
    try {
      const calendar = await this.getCalendarClient(tenantId);

      this.logger.log(`Stopping watch channel ${channelId}`);

      await calendar.channels.stop({
        requestBody: {
          id: channelId,
          resourceId: resourceId,
        },
      });

      this.logger.log(`Watch channel ${channelId} stopped successfully`);
    } catch (error) {
      this.logger.error(`Error stopping watch channel ${channelId}:`, error);
      // No lanzar error aquí, solo loguearlo
      // Los canales pueden ya haber expirado
    }
  }

  /**
   * Obtener cambios recientes en un calendario
   * Usado para sincronizar eventos desde Google hacia el ERP
   */
  async getCalendarChanges(
    tenantId: string,
    googleCalendarId: string,
    syncToken?: string,
  ): Promise<{
    events: any[];
    nextSyncToken: string;
  }> {
    try {
      const calendar = await this.getCalendarClient(tenantId);

      this.logger.log(
        `Fetching changes for calendar ${googleCalendarId} (syncToken: ${syncToken ? "exists" : "none"})`,
      );

      const params: any = {
        calendarId: googleCalendarId,
        singleEvents: true,
      };

      // Si tenemos un syncToken, úsalo para obtener solo cambios incrementales
      if (syncToken) {
        params.syncToken = syncToken;
      } else {
        // Primera sincronización: obtener eventos de los últimos 30 días
        const timeMin = new Date();
        timeMin.setDate(timeMin.getDate() - 30);
        params.timeMin = timeMin.toISOString();
      }

      const response = await calendar.events.list(params);

      this.logger.log(
        `Found ${response.data.items?.length || 0} events/changes`,
      );

      return {
        events: response.data.items || [],
        nextSyncToken: response.data.nextSyncToken || "",
      };
    } catch (error) {
      this.logger.error(
        `Error fetching calendar changes for ${googleCalendarId}:`,
        error,
      );
      throw new Error(`Failed to fetch calendar changes: ${error.message}`);
    }
  }
}
