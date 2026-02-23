import {
  Injectable,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  NewsletterSubscriber,
  NewsletterSubscriberDocument,
} from "../../schemas/newsletter-subscriber.schema";
import { MailService } from "../mail/mail.service";

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectModel(NewsletterSubscriber.name)
    private readonly subscriberModel: Model<NewsletterSubscriberDocument>,
    private readonly mailService: MailService,
  ) {}

  async subscribe(
    email: string,
    source?: string,
    utmParams?: Record<string, string>,
  ) {
    const existing = await this.subscriberModel.findOne({ email }).exec();

    if (existing) {
      if (!existing.active) {
        existing.active = true;
        await existing.save();
        return { message: "Te has re-suscrito exitosamente." };
      }
      throw new ConflictException("Este email ya está suscrito al boletín.");
    }

    await this.subscriberModel.create({
      email,
      source: source || "unknown",
      utmParams: utmParams || {},
    });

    // Send welcome email (fire-and-forget)
    this.sendWelcomeEmail(email).catch((err) =>
      this.logger.warn(`Failed to send welcome email to ${email}: ${err.message}`),
    );

    return { message: "¡Suscripción exitosa! Revisa tu bandeja de entrada." };
  }

  async unsubscribe(email: string) {
    const subscriber = await this.subscriberModel.findOne({ email }).exec();
    if (subscriber) {
      subscriber.active = false;
      await subscriber.save();
    }
    return { message: "Te has desuscrito del boletín." };
  }

  async getSubscribers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.subscriberModel
        .find({ active: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.subscriberModel.countDocuments({ active: true }).exec(),
    ]);
    return { data, total, page, limit };
  }

  private async sendWelcomeEmail(email: string) {
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
        <img src="https://smartkubik.com/assets/logo-smartkubik.png" alt="SmartKubik" style="height: 32px; margin-bottom: 24px;" />
        <h1 style="font-size: 22px; color: #0f172a; margin-bottom: 8px;">¡Bienvenido al boletín de SmartKubik!</h1>
        <p style="color: #475569; font-size: 15px; line-height: 1.6;">
          Gracias por suscribirte. Recibirás contenido exclusivo sobre:
        </p>
        <ul style="color: #475569; font-size: 15px; line-height: 1.8; padding-left: 20px;">
          <li>Tips para optimizar tu negocio</li>
          <li>Novedades de SmartKubik</li>
          <li>Guías prácticas de inventario, ventas y operaciones</li>
        </ul>
        <p style="color: #475569; font-size: 15px; line-height: 1.6; margin-top: 16px;">
          Mientras tanto, explora nuestro <a href="https://smartkubik.com/blog" style="color: #0891b2;">blog</a>
          o conoce el <a href="https://smartkubik.com/fundadores" style="color: #0891b2;">Programa Clientes Fundadores</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">
          SmartKubik Inc. — Hecho en Venezuela<br/>
          <a href="https://smartkubik.com/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color: #94a3b8;">Desuscribirse</a>
        </p>
      </div>
    `;

    await this.mailService.sendTemplatedEmail({
      to: email,
      subject: "¡Bienvenido al boletín de SmartKubik!",
      html,
    });
  }
}
