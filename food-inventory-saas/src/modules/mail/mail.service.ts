
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
}
