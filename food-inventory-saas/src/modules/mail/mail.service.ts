import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as nodemailer from "nodemailer";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import { GmailOAuthService } from "./gmail-oauth.service";
import { OutlookOAuthService } from "./outlook-oauth.service";
import { ResendService } from "./resend.service";
import { decrypt } from "../../utils/encryption.util";

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private defaultTransporter: nodemailer.Transporter;

  constructor(
    private configService: ConfigService,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    @Inject(forwardRef(() => GmailOAuthService))
    private readonly gmailOAuthService: GmailOAuthService,
    @Inject(forwardRef(() => OutlookOAuthService))
    private readonly outlookOAuthService: OutlookOAuthService,
    @Inject(forwardRef(() => ResendService))
    private readonly resendService: ResendService,
  ) {
    // Default SMTP transporter (fallback global)
    this.defaultTransporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: this.configService.get<number>("SMTP_PORT"),
      secure: this.configService.get<number>("SMTP_PORT") === 465,
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASS"),
      },
    });
  }

  async sendTemplatedEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: nodemailer.SendMailOptions["attachments"];
    tenantId?: string; // NUEVO: opcional tenant ID para usar su configuración
  }): Promise<void> {
    // Si hay tenantId, intentar usar su configuración de email
    if (options.tenantId) {
      const tenant = await this.tenantModel.findById(options.tenantId).exec();

      if (tenant?.emailConfig?.enabled) {
        this.logger.log(
          `Sending email via ${tenant.emailConfig.provider} for tenant ${options.tenantId}`,
        );

        try {
          switch (tenant.emailConfig.provider) {
            case "gmail":
              return await this.gmailOAuthService.sendEmail(options.tenantId, {
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
              });

            case "outlook":
              return await this.outlookOAuthService.sendEmail(
                options.tenantId,
                {
                  to: options.to,
                  subject: options.subject,
                  html: options.html,
                  text: options.text,
                },
              );

            case "resend":
              return await this.resendService.sendEmail(options.tenantId, {
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
              });

            case "smtp":
              return await this.sendViaTenantSmtp(tenant, options);

            default:
              this.logger.warn(
                `Unknown email provider ${tenant.emailConfig.provider} for tenant ${options.tenantId}, falling back to default SMTP`,
              );
          }
        } catch (error) {
          this.logger.error(
            `Failed to send email via ${tenant.emailConfig.provider} for tenant ${options.tenantId}: ${error.message}. Falling back to default SMTP`,
            error.stack,
          );
          // Fall through to default SMTP
        }
      }
    }

    // Fallback: usar SMTP global por defecto
    this.logger.log(`Sending email via default SMTP`);
    const mailOptions = {
      from: this.configService.get<string>("SMTP_FROM"),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    };

    await this.defaultTransporter.sendMail(mailOptions);
  }

  /**
   * Enviar email usando SMTP configurado por el tenant
   */
  private async sendViaTenantSmtp(
    tenant: TenantDocument,
    options: {
      to: string;
      subject: string;
      html: string;
      text?: string;
      attachments?: nodemailer.SendMailOptions["attachments"];
    },
  ): Promise<void> {
    if (!tenant.emailConfig?.smtpHost || !tenant.emailConfig?.smtpUser) {
      throw new Error("SMTP configuration incomplete for tenant");
    }

    const transporter = nodemailer.createTransport({
      host: tenant.emailConfig.smtpHost,
      port: tenant.emailConfig.smtpPort || 587,
      secure: tenant.emailConfig.smtpSecure || false,
      auth: {
        user: tenant.emailConfig.smtpUser,
        pass: decrypt(tenant.emailConfig.smtpPass || ""),
      },
    });

    const mailOptions = {
      from: tenant.emailConfig.smtpFrom || tenant.emailConfig.smtpUser,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
      replyTo: tenant.emailConfig.smtpReplyTo,
    };

    await transporter.sendMail(mailOptions);
  }

  async sendUserWelcomeEmail(email: string, tempPassword: string) {
    const mailOptions = {
      from: this.configService.get<string>("SMTP_FROM"),
      to: email,
      subject: "¡Bienvenido! Credenciales de Acceso",
      html: `
        <h1>¡Bienvenido a la plataforma!</h1>
        <p>Hola,</p>
        <p>Se ha creado una cuenta para ti. A continuación encontrarás tus credenciales de acceso:</p>
        <ul>
          <li><strong>Usuario:</strong> ${email}</li>
          <li><strong>Contraseña Temporal:</strong> ${tempPassword}</li>
        </ul>
        <p>Te recomendamos cambiar tu contraseña después de iniciar sesión por primera vez.</p>
        <p>Saludos,</p>
        <p>El equipo</p>
      `,
    };

    await this.defaultTransporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, resetToken: string) {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "https://smartkubik.com";
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>("SMTP_FROM"),
      to: email,
      subject: "Recuperación de Contraseña",
      html: `
        <h1>Recuperación de Contraseña</h1>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña:</p>
        <p>
          <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
            Restablecer Contraseña
          </a>
        </p>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p>${resetLink}</p>
        <p><strong>Este enlace expirará en 1 hora.</strong></p>
        <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.</p>
        <p>Saludos,</p>
        <p>El equipo</p>
      `,
    };

    await this.defaultTransporter.sendMail(mailOptions);
  }

  async sendTrialExpiredEmail(
    email: string,
    options: {
      businessName: string;
      ownerFirstName?: string;
    },
  ) {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "https://smartkubik.com";
    const foundersUrl = `${frontendUrl}/fundadores`;
    const whatsappUrl = "https://wa.me/584124000000?text=Hola%2C%20mi%20prueba%20de%20SmartKubik%20terminó%20y%20quiero%20saber%20más";
    const greeting = options.ownerFirstName
      ? `Hola ${options.ownerFirstName},`
      : "Hola,";

    const mailOptions = {
      from: this.configService.get<string>("SMTP_FROM"),
      to: email,
      subject:
        "Tu prueba de SmartKubik terminó — tus datos están seguros 🔒",
      html: `
        <table style="width:100%;max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;">
          <tr>
            <td style="padding:24px 0;text-align:center;background-color:#111827;color:#ffffff;">
              <h1 style="margin:0;font-size:24px;">Tu prueba gratuita terminó</h1>
              <p style="margin:8px 0 0;font-size:14px;">${options.businessName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;background-color:#f9fafb;color:#111827;">
              <p style="margin:0 0 16px;font-size:16px;">${greeting}</p>
              <p style="margin:0 0 16px;font-size:14px;">Tu período de prueba de 14 días en SmartKubik ha finalizado. <strong>Tranquilo — todos tus datos están guardados y seguros.</strong> Cuando actives un plan, todo estará exactamente como lo dejaste.</p>
              <p style="margin:0 0 16px;font-size:14px;">Como parte de nuestro programa de <strong>Clientes Fundadores</strong>, puedes acceder a SmartKubik con hasta <strong>51% de descuento de por vida</strong>. Solo quedan cupos limitados.</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${foundersUrl}" style="display:inline-block;padding:14px 28px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:16px;font-weight:bold;">Asegurar mi precio de Fundador</a>
              </p>
              <p style="margin:0 0 16px;font-size:14px;text-align:center;">
                <a href="${whatsappUrl}" style="color:#2563eb;text-decoration:underline;">¿Prefieres hablar con nosotros por WhatsApp?</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;text-align:center;background-color:#f3f4f6;color:#6b7280;font-size:12px;">
              SmartKubik · Transformando la gestión de tu negocio
            </td>
          </tr>
        </table>
      `,
    };

    await this.defaultTransporter.sendMail(mailOptions);
  }

  async sendTenantWelcomeEmail(
    email: string,
    options: {
      businessName: string;
      planName: string;
      confirmationCode: string;
    },
  ) {
    const frontendUrl =
      this.configService.get<string>("FRONTEND_URL") ||
      "https://smartkubik.com";
    const confirmationUrl = `${frontendUrl}/confirm-account`;

    const mailOptions = {
      from: this.configService.get<string>("SMTP_FROM"),
      to: email,
      subject: "¡Bienvenido a SmartKubik! Confirma tu cuenta",
      html: `
        <table style="width:100%;max-width:600px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;border-collapse:collapse;">
          <tr>
            <td style="padding:24px 0;text-align:center;background-color:#111827;color:#ffffff;">
              <h1 style="margin:0;font-size:24px;">Bienvenido a SmartKubik</h1>
              <p style="margin:8px 0 0;font-size:14px;">${options.businessName}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;background-color:#f9fafb;color:#111827;">
              <p style="margin:0 0 16px;font-size:16px;">Hola,</p>
              <p style="margin:0 0 16px;font-size:14px;">Gracias por iniciar tu registro en SmartKubik. Seleccionaste el plan <strong>${options.planName}</strong>. Para comenzar a usar todas las funcionalidades, confirma tu cuenta ingresando el siguiente código:</p>
              <div style="margin:24px 0;text-align:center;">
                <span style="display:inline-block;padding:12px 24px;font-size:24px;font-weight:bold;letter-spacing:6px;background-color:#1f2937;color:#ffffff;border-radius:8px;">
                  ${options.confirmationCode}
                </span>
              </div>
              <p style="margin:0 0 16px;font-size:14px;">Puedes ingresar este código en la siguiente página:</p>
              <p style="margin:0 0 24px;text-align:center;">
                <a href="${confirmationUrl}" style="display:inline-block;padding:12px 24px;background-color:#2563eb;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;">Confirmar cuenta</a>
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">El código expira en 1 hora. Si no solicitaste esta cuenta, puedes ignorar este correo.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px;text-align:center;background-color:#f3f4f6;color:#6b7280;font-size:12px;">
              SmartKubik · Transformando la gestión de tu negocio gastronómico
            </td>
          </tr>
        </table>
      `,
    };

    await this.defaultTransporter.sendMail(mailOptions);
  }
}
