import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Client } from "@microsoft/microsoft-graph-client";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { encrypt, decrypt, encryptState } from "../../utils/encryption.util";
import { request as httpsRequest } from "https";

@Injectable()
export class OutlookOAuthService {
  private readonly logger = new Logger(OutlookOAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {
    this.clientId = this.configService.get<string>("MICROSOFT_CLIENT_ID") || "";
    this.clientSecret =
      this.configService.get<string>("MICROSOFT_CLIENT_SECRET") || "";
    this.redirectUri = `${this.configService.get<string>("API_BASE_URL")}/api/v1/email-config/outlook/callback`;
  }

  /**
   * Generar URL de autorización para Outlook
   */
  getAuthUrl(tenantId: string): string {
    this.logger.log(`Generating Outlook auth URL for tenant ${tenantId}`);

    const state = encryptState(tenantId);
    const scope = encodeURIComponent("Mail.Send User.Read offline_access");

    return (
      `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
      `client_id=${this.clientId}&` +
      `response_type=code&` +
      `redirect_uri=${encodeURIComponent(this.redirectUri)}&` +
      `response_mode=query&` +
      `scope=${scope}&` +
      `state=${encodeURIComponent(state)}`
    );
  }

  /**
   * Manejar callback de Microsoft OAuth
   */
  async handleCallback(code: string, tenantId: string): Promise<void> {
    this.logger.log(`Handling Outlook OAuth callback for tenant ${tenantId}`);

    try {
      // Intercambiar code por tokens
      const tokens = await this.getTokensFromCode(code);

      this.logger.log(
        `Received tokens for tenant ${tenantId}: ${JSON.stringify({
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
        })}`,
      );

      // Obtener email del usuario usando Microsoft Graph
      const client = Client.init({
        authProvider: (done) => {
          done(null, tokens.access_token);
        },
      });

      const user = await client.api("/me").get();

      // Guardar tokens encriptados en el tenant
      await this.tenantModel.updateOne(
        { _id: tenantId },
        {
          $set: {
            "emailConfig.provider": "outlook",
            "emailConfig.enabled": true,
            "emailConfig.outlookAccessToken": encrypt(tokens.access_token),
            "emailConfig.outlookRefreshToken": encrypt(tokens.refresh_token),
            "emailConfig.outlookEmail": user.mail || user.userPrincipalName,
          },
        },
      );

      this.logger.log(
        `Outlook OAuth configured successfully for tenant ${tenantId} with email ${user.mail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle Outlook OAuth callback for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Desconectar Outlook
   */
  async disconnect(tenantId: string): Promise<void> {
    this.logger.log(`Disconnecting Outlook for tenant ${tenantId}`);

    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.provider": "none",
          "emailConfig.enabled": false,
        },
        $unset: {
          "emailConfig.outlookAccessToken": "",
          "emailConfig.outlookRefreshToken": "",
          "emailConfig.outlookEmail": "",
        },
      },
    );
  }

  /**
   * Enviar email usando Microsoft Graph API
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
      `Sending email via Outlook for tenant ${tenantId} to ${options.to}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();

    if (
      !tenant ||
      !tenant.emailConfig?.outlookAccessToken ||
      !tenant.emailConfig?.outlookRefreshToken
    ) {
      throw new Error("Outlook not configured for this tenant");
    }

    try {
      const accessToken = decrypt(tenant.emailConfig.outlookAccessToken);

      // Crear cliente Microsoft Graph
      const client = Client.init({
        authProvider: (done) => {
          done(null, accessToken);
        },
      });

      // Enviar email
      const message = {
        message: {
          subject: options.subject,
          body: {
            contentType: "HTML",
            content: options.html,
          },
          toRecipients: [
            {
              emailAddress: {
                address: options.to,
              },
            },
          ],
        },
      };

      await client.api("/me/sendMail").post(message);

      this.logger.log(
        `Email sent successfully via Outlook for tenant ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send email via Outlook for tenant ${tenantId}: ${error.message}`,
        error.stack,
      );

      // Si el token expiró, intentar refrescar
      if (error.statusCode === 401 || error.message?.includes("Unauthorized")) {
        this.logger.log(
          `Refreshing Outlook tokens for tenant ${tenantId} and retrying`,
        );
        await this.refreshTokens(tenantId);
        // Retry una vez con token actualizado
        return this.sendEmail(tenantId, options);
      }

      throw error;
    }
  }

  /**
   * Obtener tokens desde code
   */
  private async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const postData = new URLSearchParams({
      client_id: this.clientId,
      scope: "Mail.Send User.Read offline_access",
      code: code,
      redirect_uri: this.redirectUri,
      grant_type: "authorization_code",
      client_secret: this.clientSecret,
    }).toString();

    return new Promise((resolve, reject) => {
      const options = {
        hostname: "login.microsoftonline.com",
        path: "/common/oauth2/v2.0/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": postData.length,
        },
      };

      const req = httpsRequest(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(
              new Error(`Failed to get tokens: ${res.statusCode} - ${data}`),
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Refrescar tokens de Outlook
   */
  private async refreshTokens(tenantId: string): Promise<void> {
    const tenant = await this.tenantModel.findById(tenantId).exec();

    if (!tenant?.emailConfig?.outlookRefreshToken) {
      throw new Error("No refresh token available");
    }

    const refreshToken = decrypt(tenant.emailConfig.outlookRefreshToken);

    const postData = new URLSearchParams({
      client_id: this.clientId,
      scope: "Mail.Send User.Read offline_access",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      client_secret: this.clientSecret,
    }).toString();

    const tokens = await new Promise<{
      access_token: string;
      refresh_token: string;
    }>((resolve, reject) => {
      const options = {
        hostname: "login.microsoftonline.com",
        path: "/common/oauth2/v2.0/token",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": postData.length,
        },
      };

      const req = httpsRequest(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(
              new Error(
                `Failed to refresh tokens: ${res.statusCode} - ${data}`,
              ),
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });

    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.outlookAccessToken": encrypt(tokens.access_token),
          "emailConfig.outlookRefreshToken": encrypt(tokens.refresh_token),
        },
      },
    );

    this.logger.log(`Outlook tokens refreshed for tenant ${tenantId}`);
  }
}
