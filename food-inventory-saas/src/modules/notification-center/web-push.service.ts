import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as webpush from 'web-push';
import { User, UserDocument } from '../../schemas/user.schema';

@Injectable()
export class WebPushService implements OnModuleInit {
  private readonly logger = new Logger(WebPushService.name);
  private initialized = false;

  constructor(
    private readonly config: ConfigService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  onModuleInit() {
    const publicKey = this.config.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.config.get<string>('VAPID_PRIVATE_KEY');
    const contact = this.config.get<string>('VAPID_CONTACT', 'mailto:admin@smartkubik.com');

    if (!publicKey || !privateKey) {
      this.logger.warn('VAPID keys not configured — Web Push disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars.');
      return;
    }

    webpush.setVapidDetails(contact, publicKey, privateKey);
    this.initialized = true;
    this.logger.log('Web Push initialized');
  }

  getPublicKey(): string | null {
    return this.config.get<string>('VAPID_PUBLIC_KEY') ?? null;
  }

  /**
   * Registra (o actualiza) una suscripción push para el usuario.
   */
  async saveSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
    userAgent?: string,
  ): Promise<void> {
    const endpoint = subscription.endpoint;

    // Evitar duplicados por endpoint
    await this.userModel.updateOne(
      { _id: userId, 'pushSubscriptions.endpoint': endpoint },
      { $set: { 'pushSubscriptions.$.keys': subscription.keys } },
    );

    // Si no existía, push
    await this.userModel.updateOne(
      { _id: userId, 'pushSubscriptions.endpoint': { $ne: endpoint } },
      {
        $push: {
          pushSubscriptions: {
            endpoint,
            keys: subscription.keys,
            userAgent: userAgent ?? '',
            createdAt: new Date(),
          },
        },
      },
    );
  }

  /**
   * Elimina una suscripción push (cuando el usuario revoca permiso o cambia de dispositivo).
   */
  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { pushSubscriptions: { endpoint } } },
    );
  }

  /**
   * Envía una notificación push a todas las suscripciones del usuario.
   */
  async sendToUser(
    userId: string,
    payload: { title: string; body: string; url?: string; icon?: string },
  ): Promise<void> {
    if (!this.initialized) return;

    const user = await this.userModel.findById(userId).select('pushSubscriptions').lean();
    if (!user?.pushSubscriptions?.length) return;

    const body = JSON.stringify({ ...payload, icon: payload.icon ?? '/favicon-smartkubik.png' });
    const stale: string[] = [];

    await Promise.allSettled(
      user.pushSubscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub as any, body);
        } catch (err: any) {
          if (err.statusCode === 410 || err.statusCode === 404) stale.push(sub.endpoint);
          else this.logger.error(`Push failed for ${sub.endpoint}: ${err.message}`);
        }
      }),
    );

    if (stale.length) {
      await this.userModel.updateOne(
        { _id: userId },
        { $pull: { pushSubscriptions: { endpoint: { $in: stale } } } },
      );
    }
  }

  /**
   * Envía a todos los usuarios de un tenant (p.ej. reserva nueva en el salón).
   */
  async sendToTenant(
    tenantId: string,
    payload: { title: string; body: string; url?: string },
  ): Promise<void> {
    if (!this.initialized) return;
    const users = await this.userModel
      .find({ tenantId, 'pushSubscriptions.0': { $exists: true } })
      .select('pushSubscriptions')
      .lean();

    await Promise.all(users.map((u) => this.sendToUser(String(u._id), payload)));
  }
}
