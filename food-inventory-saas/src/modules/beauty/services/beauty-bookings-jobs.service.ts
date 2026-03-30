import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  BeautyBooking,
  BeautyBookingDocument,
} from '../../../schemas/beauty-booking.schema';
import { BeautyWhatsAppNotificationsService } from './beauty-whatsapp-notifications.service';

/**
 * Servicio de trabajos programados para reservas de belleza
 * Gestiona recordatorios automáticos 24h antes de las citas
 */
@Injectable()
export class BeautyBookingsJobsService {
  private readonly logger = new Logger(BeautyBookingsJobsService.name);

  constructor(
    @InjectModel(BeautyBooking.name)
    private beautyBookingModel: Model<BeautyBookingDocument>,
    private readonly whatsappService: BeautyWhatsAppNotificationsService,
  ) {}

  /**
   * Cron job que corre cada hora para verificar reservas que necesitan recordatorio
   * Envía recordatorio 24h antes de la cita
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendReminders() {
    this.logger.log('Running reminder job...');

    try {
      // Calcular ventana de tiempo: entre 23 y 25 horas desde ahora
      const now = new Date();
      const minDate = new Date(now.getTime() + 23 * 60 * 60 * 1000); // 23h
      const maxDate = new Date(now.getTime() + 25 * 60 * 60 * 1000); // 25h

      // Buscar reservas confirmadas en las próximas 24h que NO han recibido recordatorio
      const bookings = await this.beautyBookingModel
        .find({
          date: {
            $gte: minDate,
            $lte: maxDate,
          },
          status: { $in: ['pending', 'confirmed'] },
          // Solo enviar si NO hay recordatorio previo
          'whatsappNotifications.type': { $ne: 'reminder' },
        })
        .exec();

      this.logger.log(
        `Found ${bookings.length} bookings requiring reminders`,
      );

      let successCount = 0;
      let failCount = 0;

      for (const booking of bookings) {
        try {
          const result = await this.whatsappService.sendReminderNotification(
            booking,
          );

          if (result.success) {
            successCount++;
            this.logger.log(
              `Reminder sent for booking ${booking.bookingNumber}`,
            );
          } else {
            failCount++;
            this.logger.warn(
              `Failed to send reminder for booking ${booking.bookingNumber}: ${result.error}`,
            );
          }

          // Pequeño delay entre mensajes para no saturar API
          await this.delay(500);
        } catch (error) {
          failCount++;
          this.logger.error(
            `Error processing booking ${booking.bookingNumber}: ${error.message}`,
          );
        }
      }

      this.logger.log(
        `Reminder job completed. Success: ${successCount}, Failed: ${failCount}`,
      );
    } catch (error) {
      this.logger.error(`Error in reminder job: ${error.message}`, error.stack);
    }
  }

  /**
   * Envía recordatorios manualmente para reservas de una fecha específica
   * Útil para recuperar envíos fallidos o para testing
   */
  async sendRemindersForDate(date: Date): Promise<{
    success: number;
    failed: number;
    bookings: string[];
  }> {
    this.logger.log(`Sending reminders for date: ${date.toISOString()}`);

    const bookings = await this.beautyBookingModel
      .find({
        date: {
          $gte: new Date(date.setHours(0, 0, 0, 0)),
          $lte: new Date(date.setHours(23, 59, 59, 999)),
        },
        status: { $in: ['pending', 'confirmed'] },
      })
      .exec();

    let successCount = 0;
    let failCount = 0;
    const processedBookings: string[] = [];

    for (const booking of bookings) {
      const result = await this.whatsappService.sendReminderNotification(
        booking,
      );

      if (result.success) {
        successCount++;
      } else {
        failCount++;
      }

      processedBookings.push(booking.bookingNumber);
      await this.delay(500);
    }

    return {
      success: successCount,
      failed: failCount,
      bookings: processedBookings,
    };
  }

  /**
   * Obtiene estadísticas de notificaciones enviadas
   */
  async getNotificationStats(tenantId?: string): Promise<{
    total: number;
    byType: {
      confirmation: number;
      reminder: number;
      cancellation: number;
    };
    byStatus: {
      sent: number;
      delivered: number;
      read: number;
      failed: number;
    };
  }> {
    const query = tenantId ? { tenantId } : {};

    const bookings = await this.beautyBookingModel
      .find(query)
      .select('whatsappNotifications')
      .exec();

    const stats = {
      total: 0,
      byType: {
        confirmation: 0,
        reminder: 0,
        cancellation: 0,
      },
      byStatus: {
        sent: 0,
        delivered: 0,
        read: 0,
        failed: 0,
      },
    };

    for (const booking of bookings) {
      for (const notification of booking.whatsappNotifications) {
        stats.total++;
        stats.byType[notification.type]++;
        stats.byStatus[notification.status]++;
      }
    }

    return stats;
  }

  /**
   * Limpia notificaciones fallidas antiguas (más de 7 días)
   * Útil para mantenimiento de la BD
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

    this.logger.log(
      `Cleaned up ${result.modifiedCount} old failed notifications`,
    );

    return result.modifiedCount;
  }

  /**
   * Helper: delay en milisegundos
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
