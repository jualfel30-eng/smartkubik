import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { encrypt, decrypt } from "../../utils/encryption.util";
import { request as httpsRequest } from "https";

@Injectable()
export class ResendService {
  private readonly logger = new Logger(ResendService.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  /**
   * Conectar Resend con API key
   */
  async connect(
    tenantId: string,
    apiKey: string,
    fromEmail: string,
  ): Promise<void> {
    this.logger.log(`Connecting Resend for tenant ${tenantId}`);

    // Validar API key enviando email de prueba (a través de la API de Resend)
    await this.validateApiKey(apiKey, fromEmail);

    // Guardar configuración encriptada
    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.provider": "resend",
          "emailConfig.enabled": true,
          "emailConfig.resendApiKey": encrypt(apiKey),
          "emailConfig.resendFromEmail": fromEmail,
        },
      },
    );

    this.logger.log(`Resend configured successfully for tenant ${tenantId}`);
  }

  /**
   * Desconectar Resend
   */
  async disconnect(tenantId: string): Promise<void> {
    this.logger.log(`Disconnecting Resend for tenant ${tenantId}`);

    await this.tenantModel.updateOne(
      { _id: tenantId },
      {
        $set: {
          "emailConfig.provider": "none",
          "emailConfig.enabled": false,
        },
        $unset: {
          "emailConfig.resendApiKey": "",
          "emailConfig.resendFromEmail": "",
        },
      },
    );
  }

  /**
   * Enviar email usando Resend API
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
      `Sending email via Resend for tenant ${tenantId} to ${options.to}`,
    );

    const tenant = await this.tenantModel.findById(tenantId).exec();

    if (
      !tenant ||
      !tenant.emailConfig?.resendApiKey ||
      !tenant.emailConfig?.resendFromEmail
    ) {
      throw new Error("Resend not configured for this tenant");
    }

    const apiKey = decrypt(tenant.emailConfig.resendApiKey);
    const from = tenant.emailConfig.resendFromEmail;

    const emailData = JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      ...(options.text && { text: options.text }),
    });

    return new Promise((resolve, reject) => {
      const options_req = {
        hostname: "api.resend.com",
        path: "/emails",
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Content-Length": emailData.length,
        },
      };

      const req = httpsRequest(options_req, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          if (res.statusCode === 200 || res.statusCode === 201) {
            this.logger.log(
              `Email sent successfully via Resend for tenant ${tenantId}`,
            );
            resolve();
          } else {
            this.logger.error(
              `Failed to send email via Resend for tenant ${tenantId}: ${res.statusCode} - ${data}`,
            );
            reject(
              new Error(
                `Failed to send email via Resend: ${res.statusCode} - ${data}`,
              ),
            );
          }
        });
      });

      req.on("error", (error) => {
        this.logger.error(
          `Failed to send email via Resend for tenant ${tenantId}: ${error.message}`,
          error.stack,
        );
        reject(error);
      });

      req.write(emailData);
      req.end();
    });
  }

  /**
   * Validar API key enviando request a Resend
   */
  private async validateApiKey(apiKey: string, fromEmail: string): Promise<void> {
    // Hacer una llamada simple a la API de Resend para validar el API key
    // Podríamos usar el endpoint /emails para hacer un test, pero mejor usar /domains o similar
    return new Promise((resolve, reject) => {
      const options = {
        hostname: "api.resend.com",
        path: "/api-keys",
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      };

      const req = httpsRequest(options, (res) => {
        if (res.statusCode === 200 || res.statusCode === 403) {
          // 403 significa que el key es válido pero no tiene permiso para ese endpoint
          // Lo cual está bien, solo queremos validar que el key existe
          resolve();
        } else {
          reject(
            new Error(
              `Invalid Resend API key or configuration (${res.statusCode})`,
            ),
          );
        }
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });
  }
}
