import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BeautyBooking,
  BeautyBookingDocument,
} from '../../../schemas/beauty-booking.schema';
import {
  StorefrontConfig,
  StorefrontConfigDocument,
} from '../../../schemas/storefront-config.schema';
import { BeautyWhatsAppNotificationsService } from './beauty-whatsapp-notifications.service';

/**
 * Servicio de trabajos programados para reservas de belleza.
 * Gestiona recordatorios automáticos 24h antes de las citas.
 */
@Injectable()
export class BeautyBookingsJobsService {
  private readonly logger = new Logger(BeautyBookingsJobsService.name);

  constructor(
    @InjectModel(BeautyBooking.name)
    private beautyBookingModel: Model<BeautyBookingDocument>,
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfigDocument>,
    private readonly whatsappService: BeautyWhatsAppNotificationsService,
  ) {}

  /**
   * Cron job que corre cada 30 minutos para enviar recordatorios 24h antes.
   * Idempotente: usa reminderSentAt como guard para no duplicar envíos.
   * Solo procesa tenants con reminderEnabled !== false.
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async sendReminders() {
    this.logger.log('Running 30-min reminder job...');

    try {
      // 1. Obtener tenants con recordatorios habilitados
      const enabledStorefronts = await this.storefrontConfigModel
        .find({
          'beautyConfig.enabled': true,
          'beautyConfig.bookingSettings.whatsappNotification.enabled': true,
          // reminderEnabled: undefined (default) o true → habilitado
          // reminderEnabled: false → deshabilitado
          'beautyConfig.notifications.reminderEnabled': { $ne: false },
        })
        .select('tenantId')
        .lean()
        .exec();

      if (enabledStorefronts.length === 0) {
        this.logger.log('No tenants with reminders enabled — skipping');
        return;
      }

      const enabledTenantIds = enabledStorefronts.map((s) => s.tenantId);

      // 2. Ventana de tiempo: ±30 min alrededor de 24h desde ahora
      // Ejecutando cada 30 min → cada booking cae en exactamente una ventana
      const now = new Date();
      const minDate = new Date(now.getTime() + 23.5 * 60 * 60 * 1000);
      const maxDate = new Date(now.getTime() + 24.5 * 60 * 60 * 1000);

      // 3. Buscar reservas en ventana que NO han recibido recordatorio
      const bookings = await this.beautyBookingModel
        .find({
          tenantId: { $in: enabledTenantIds },
          date: { $gte: minDate, $lte: maxDate },
          status: { $in: ['pending', 'confirmed'] },
          reminderSentAt: { $exists: false }, // Guard de idempotencia
          'client.phone': { $exists: true, $ne: '' },
        })
        .exec();

      this.logger.log(`Found ${bookings.length} bookings requiring reminders`);

      let successCount = 0;
      let failCount = 0;

      for (const booking of bookings) {
        try {
          const result = await this.whatsappService.sendReminderNotification(booking);

          if (result.success) {
            successCount++;
            // Marcar como enviado para evitar re-envío en próxima ejecución
            await this.beautyBookingModel.updateOne(
              { _id: booking._id },
              { $set: { reminderSentAt: new Date() } },
            );
            this.logger.log(`Reminder sent for booking ${booking.bookingNumber}`);
          } else {
            failCount++;
            this.logger.warn(
              `Failed to send reminder for ${booking.bookingNumber}: ${result.error}`,
            );
          }

          // Delay entre mensajes para no saturar la API de WhatsApp
          await this.delay(500);
        } catch (error) {
          failCount++;
          this.logger.error(
            `Error processing booking ${booking.bookingNumber}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Reminder job completed. Success: ${successCount}, Failed: ${failCount}, Total: ${bookings.length}`,
      );
    } catch (error) {
      this.logger.error(`Error in reminder job: ${error.message}`, error.stack);
    }
  }

  /**
   * Envía recordatorios manualmente para reservas de una fecha específica.
   * Útil para recuperar envíos fallidos o para testing.
   */
  async sendRemindersForDate(date: Date): Promise<{
    success: number;
    failed: number;
    bookings: string[];
  }> {
    this.logger.log(`Sending reminders for date: ${date.toISOString()}`);

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookings = await this.beautyBookingModel
      .find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: { $in: ['pending', 'confirmed'] },
      })
      .exec();

    let successCount = 0;
    let failCount = 0;
    const processedBookings: string[] = [];

    for (const booking of bookings) {
      const result = await this.whatsappService.sendReminderNotification(booking);
      if (result.success) {
        successCount++;
        await this.beautyBookingModel.updateOne(
          { _id: booking._id },
          { $set: { reminderSentAt: new Date() } },
        );
      } else {
        failCount++;
      }
      processedBookings.push(booking.bookingNumber);
      await this.delay(500);
    }

    return { success: successCount, failed: failCount, bookings: processedBookings };
  }

  /**
   * Obtiene estadísticas de notificaciones enviadas
   */
  async getNotificationStats(tenantId?: string): Promise<{
    total: number;
    byType: { confirmation: number; reminder: number; cancellation: number; rescheduled: number };
    byStatus: { sent: number; delivered: number; read: number; failed: number };
  }> {
    const query = tenantId ? { tenantId } : {};

    const bookings = await this.beautyBookingModel
      .find(query)
      .select('whatsappNotifications')
      .exec();

    const stats = {
      total: 0,
      byType: { confirmation: 0, reminder: 0, cancellation: 0, rescheduled: 0 },
      byStatus: { sent: 0, delivered: 0, read: 0, failed: 0 },
    };

    for (const booking of bookings) {
      for (const notification of booking.whatsappNotifications) {
        stats.total++;
        if (stats.byType[notification.type] !== undefined) {
          stats.byType[notification.type]++;
        }
        if (stats.byStatus[notification.status] !== undefined) {
          stats.byStatus[notification.status]++;
        }
      }
    }

    return stats;
  }

  /**
   * Limpia notificaciones fallidas antiguas (más de 7 días)
   */
  async cleanupOldFailedNotifications(): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const result = await this.beautyBookingModel
      .updateMany(
        {
          'whatsappNotifications.status': 'failed',
          'whatsappNotifications.sentAt': { $lt: sevenDaysAgo },
        },
        {
          $pull: {
            whatsappNotifications: {
              status: 'failed',
              sentAt: { $lt: sevenDaysAgo },
            },
          },
        },
      )
      .exec();

    this.logger.log(`Cleaned up ${result.modifiedCount} old failed notifications`);
    return result.modifiedCount;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
