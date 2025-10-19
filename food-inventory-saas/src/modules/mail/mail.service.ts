import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>("SMTP_HOST"),
      port: this.configService.get<number>("SMTP_PORT"),
      secure: this.configService.get<number>("SMTP_PORT") === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>("SMTP_USER"),
        pass: this.configService.get<string>("SMTP_PASS"),
      },
    });
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

    await this.transporter.sendMail(mailOptions);
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

    await this.transporter.sendMail(mailOptions);
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

    await this.transporter.sendMail(mailOptions);
  }
}
