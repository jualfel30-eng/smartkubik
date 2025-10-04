
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT'),
      secure: this.configService.get<number>('SMTP_PORT') === 465, // true for 465, false for other ports
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendUserWelcomeEmail(email: string, tempPassword: string) {
    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to: email,
      subject: '¡Bienvenido! Credenciales de Acceso',
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
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5174';
    const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'),
      to: email,
      subject: 'Recuperación de Contraseña',
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
}
