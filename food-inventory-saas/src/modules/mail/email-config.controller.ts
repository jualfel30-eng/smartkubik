import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  UseGuards,
  Logger,
  Res,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Response } from "express";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { Public } from "../../decorators/public.decorator";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { GmailOAuthService } from "./gmail-oauth.service";
import { OutlookOAuthService } from "./outlook-oauth.service";
import { ResendService } from "./resend.service";
import { MailService } from "./mail.service";
import {
  ConnectResendDto,
  ConnectSmtpDto,
  TestEmailConfigDto,
  GetEmailConfigResponseDto,
} from "../../dto/email-config.dto";
import { decryptState, encrypt } from "../../utils/encryption.util";

@Controller("email-config")
@UseGuards(JwtAuthGuard)
export class EmailConfigController {
  private readonly logger = new Logger(EmailConfigController.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly gmailOAuthService: GmailOAuthService,
    private readonly outlookOAuthService: OutlookOAuthService,
    private readonly resendService: ResendService,
    private readonly mailService: MailService,
  ) {}

  // ==================== Get Current Configuration ====================

  @Get()
  async getEmailConfig(@Request() req): Promise<{
    success: boolean;
    data: GetEmailConfigResponseDto;
  }> {
    this.logger.log(
      `GET /email-config - Getting email config for tenant ${req.user.tenantId}`,
    );

    const tenant = await this.tenantModel.findById(req.user.tenantId).exec();

    if (!tenant) {
      throw new HttpException("Tenant not found", HttpStatus.NOT_FOUND);
    }

    const config = tenant.emailConfig || {
      provider: "none" as const,
      enabled: false,
    };

    return {
      success: true,
      data: {
        provider: config.provider,
        enabled: config.enabled,
        connectedEmail:
          config.gmailEmail || config.outlookEmail || config.smtpUser,
        fromEmail: config.resendFromEmail || config.smtpFrom,
      },
    };
  }

  // ==================== Gmail OAuth ====================

  @Get("gmail/auth-url")
  async getGmailAuthUrl(@Request() req): Promise<{
    success: boolean;
    authUrl: string;
    message: string;
  }> {
    this.logger.log(
      `GET /email-config/gmail/auth-url - Generating Gmail auth URL for tenant ${req.user.tenantId}`,
    );

    const authUrl = this.gmailOAuthService.getAuthUrl(req.user.tenantId);

    return {
      success: true,
      authUrl,
      message:
        "Abre esta URL en una ventana nueva para conectar tu cuenta de Gmail",
    };
  }

  @Public()
  @Get("gmail/callback")
  async handleGmailCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`GET /email-config/gmail/callback - Handling callback`);

    try {
      // Decrypt and validate state
      const stateData = decryptState(state);
      if (!stateData) {
        throw new HttpException(
          "Invalid or expired state parameter",
          HttpStatus.BAD_REQUEST,
        );
      }

      const { tenantId } = stateData;

      // Handle OAuth callback
      await this.gmailOAuthService.handleCallback(code, tenantId);

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(`${frontendUrl}/settings?emailConnected=gmail&success=true`);
    } catch (error) {
      this.logger.error(
        `Failed to handle Gmail callback: ${error.message}`,
        error.stack,
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}/settings?emailConnected=gmail&success=false&error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // ==================== Outlook OAuth ====================

  @Get("outlook/auth-url")
  async getOutlookAuthUrl(@Request() req): Promise<{
    success: boolean;
    authUrl: string;
    message: string;
  }> {
    this.logger.log(
      `GET /email-config/outlook/auth-url - Generating Outlook auth URL for tenant ${req.user.tenantId}`,
    );

    const authUrl = this.outlookOAuthService.getAuthUrl(req.user.tenantId);

    return {
      success: true,
      authUrl,
      message:
        "Abre esta URL en una ventana nueva para conectar tu cuenta de Outlook",
    };
  }

  @Public()
  @Get("outlook/callback")
  async handleOutlookCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
  ): Promise<void> {
    this.logger.log(`GET /email-config/outlook/callback - Handling callback`);

    try {
      // Decrypt and validate state
      const stateData = decryptState(state);
      if (!stateData) {
        throw new HttpException(
          "Invalid or expired state parameter",
          HttpStatus.BAD_REQUEST,
        );
      }

      const { tenantId } = stateData;

      // Handle OAuth callback
      await this.outlookOAuthService.handleCallback(code, tenantId);

      // Redirect to frontend success page
      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}/settings?emailConnected=outlook&success=true`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle Outlook callback: ${error.message}`,
        error.stack,
      );

      const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
      res.redirect(
        `${frontendUrl}/settings?emailConnected=outlook&success=false&error=${encodeURIComponent(error.message)}`,
      );
    }
  }

  // ==================== Resend ====================

  @Post("resend/connect")
  async connectResend(
    @Body() connectDto: ConnectResendDto,
    @Request() req,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `POST /email-config/resend/connect - Connecting Resend for tenant ${req.user.tenantId}`,
    );

    try {
      await this.resendService.connect(
        req.user.tenantId,
        connectDto.apiKey,
        connectDto.fromEmail,
      );

      return {
        success: true,
        message: "Resend conectado exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        `Error al conectar Resend: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== SMTP Manual ====================

  @Post("smtp/connect")
  async connectSmtp(
    @Body() connectDto: ConnectSmtpDto,
    @Request() req,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `POST /email-config/smtp/connect - Connecting SMTP for tenant ${req.user.tenantId}`,
    );

    try {
      await this.tenantModel.updateOne(
        { _id: req.user.tenantId },
        {
          $set: {
            "emailConfig.provider": "smtp",
            "emailConfig.enabled": true,
            "emailConfig.smtpHost": connectDto.host,
            "emailConfig.smtpPort": connectDto.port,
            "emailConfig.smtpSecure": connectDto.secure,
            "emailConfig.smtpUser": connectDto.user,
            "emailConfig.smtpPass": encrypt(connectDto.pass),
            "emailConfig.smtpFrom": connectDto.from,
            "emailConfig.smtpReplyTo": connectDto.replyTo,
          },
        },
      );

      return {
        success: true,
        message: "SMTP configurado exitosamente",
      };
    } catch (error) {
      throw new HttpException(
        `Error al configurar SMTP: ${error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // ==================== Test Email Configuration ====================

  @Post("test")
  async testEmailConfig(
    @Body() testDto: TestEmailConfigDto,
    @Request() req,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `POST /email-config/test - Testing email config for tenant ${req.user.tenantId}`,
    );

    try {
      await this.mailService.sendTemplatedEmail({
        to: testDto.testEmail,
        subject: "Prueba de configuración de email - SmartKubik",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">¡Prueba exitosa!</h1>
            <p>Tu configuración de email está funcionando correctamente.</p>
            <p>Este es un mensaje de prueba enviado desde SmartKubik.</p>
            <hr style="border: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              SmartKubik · Transformando la gestión de tu negocio
            </p>
          </div>
        `,
        text: "¡Prueba exitosa! Tu configuración de email está funcionando correctamente.",
        tenantId: req.user.tenantId,
      });

      return {
        success: true,
        message: `Email de prueba enviado exitosamente a ${testDto.testEmail}`,
      };
    } catch (error) {
      this.logger.error(
        `Failed to send test email for tenant ${req.user.tenantId}: ${error.message}`,
        error.stack,
      );

      throw new HttpException(
        `Error al enviar email de prueba: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // ==================== Disconnect ====================

  @Post("disconnect")
  async disconnect(@Request() req): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(
      `POST /email-config/disconnect - Disconnecting email for tenant ${req.user.tenantId}`,
    );

    try {
      const tenant = await this.tenantModel.findById(req.user.tenantId).exec();

      if (
        !tenant?.emailConfig?.provider ||
        tenant.emailConfig.provider === "none"
      ) {
        return {
          success: true,
          message: "No hay ningún proveedor de email configurado",
        };
      }

      const provider = tenant.emailConfig.provider;

      // Disconnect based on provider
      switch (provider) {
        case "gmail":
          await this.gmailOAuthService.disconnect(req.user.tenantId);
          break;
        case "outlook":
          await this.outlookOAuthService.disconnect(req.user.tenantId);
          break;
        case "resend":
          await this.resendService.disconnect(req.user.tenantId);
          break;
        case "smtp":
          await this.tenantModel.updateOne(
            { _id: req.user.tenantId },
            {
              $set: {
                "emailConfig.provider": "none",
                "emailConfig.enabled": false,
              },
              $unset: {
                "emailConfig.smtpHost": "",
                "emailConfig.smtpPort": "",
                "emailConfig.smtpSecure": "",
                "emailConfig.smtpUser": "",
                "emailConfig.smtpPass": "",
                "emailConfig.smtpFrom": "",
                "emailConfig.smtpReplyTo": "",
              },
            },
          );
          break;
      }

      return {
        success: true,
        message: `Proveedor de email ${provider} desconectado exitosamente`,
      };
    } catch (error) {
      throw new HttpException(
        `Error al desconectar proveedor: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
