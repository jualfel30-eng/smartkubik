import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { BeautyBookingDocument } from '../../../schemas/beauty-booking.schema';
import {
  StorefrontConfig,
  StorefrontConfigDocument,
} from '../../../schemas/storefront-config.schema';

/**
 * Servicio simplificado para notificaciones WhatsApp en Beauty Module
 * Usa la API de Whapi directamente sin dependencias complejas
 */
@Injectable()
export class BeautyWhatsAppNotificationsService {
  private readonly logger = new Logger(
    BeautyWhatsAppNotificationsService.name,
  );

  constructor(
    @InjectModel(StorefrontConfig.name)
    private storefrontConfigModel: Model<StorefrontConfigDocument>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Envía notificación de confirmación al cliente
   */
  async sendConfirmationNotification(
    booking: BeautyBookingDocument,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 1. Obtener configuración del storefront
      const storefront = await this.storefrontConfigModel
        .findOne({ tenantId: booking.tenantId })
        .exec();

      if (!storefront || !(storefront as any).beautyConfig?.enabled) {
        this.logger.warn(
          `Beauty config not enabled for tenant ${booking.tenantId}`,
        );
        return { success: false, error: 'Beauty config not enabled' };
      }

      // 2. Verificar si WhatsApp está habilitado
      const whatsappConfig =
        (storefront as any).beautyConfig.bookingSettings?.whatsappNotification;
      if (!whatsappConfig?.enabled || whatsappConfig.mode === 'disabled') {
        this.logger.log('WhatsApp notifications disabled for this tenant');
        return { success: false, error: 'WhatsApp notifications disabled' };
      }

      // 3. Construir mensaje
      const message = this.buildConfirmationMessage(booking, storefront);

      // 4. Enviar según el modo configurado
      let result: { success: boolean; messageId?: string; error?: string };

      switch (whatsappConfig.mode) {
        case 'auto':
          // Envío automático via API
          result = await this.sendWhatsAppMessage(
            booking.client.phone,
            message,
            booking.tenantId.toString(),
          );
          break;

        case 'manual':
          // Solo registrar, el admin enviará manualmente
          this.logger.log(
            `Manual mode: notification logged but not sent for booking ${booking.bookingNumber}`,
          );
          result = {
            success: true,
            messageId: 'MANUAL_MODE',
          };
          break;

        default:
          result = { success: false, error: 'Invalid WhatsApp mode' };
      }

      // 5. Registrar notificación en el booking
      if (result.success) {
        booking.whatsappNotifications.push({
          type: 'confirmation',
          sentAt: new Date(),
          status: 'sent',
          messageId: result.messageId,
        });
        await booking.save();
      }

      return result;
    } catch (error) {
      this.logger.error(
        `Error sending confirmation notification: ${error.message}`,
        error.stack,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía recordatorio 24h antes de la cita
   */
  async sendReminderNotification(
    booking: BeautyBookingDocument,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storefront = await this.storefrontConfigModel
        .findOne({ tenantId: booking.tenantId })
        .exec();

      if (!storefront || !(storefront as any)?.beautyConfig?.bookingSettings?.whatsappNotification?.enabled) {
        return { success: false, error: 'WhatsApp not enabled' };
      }

      const message = this.buildReminderMessage(booking, storefront);
      const result = await this.sendWhatsAppMessage(
        booking.client.phone,
        message,
        booking.tenantId.toString(),
      );

      if (result.success) {
        booking.whatsappNotifications.push({
          type: 'reminder',
          sentAt: new Date(),
          status: 'sent',
          messageId: result.messageId,
        });
        await booking.save();
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending reminder: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación de cancelación
   */
  async sendCancellationNotification(
    booking: BeautyBookingDocument,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storefront = await this.storefrontConfigModel
        .findOne({ tenantId: booking.tenantId })
        .exec();

      if (!storefront || !(storefront as any)?.beautyConfig?.bookingSettings?.whatsappNotification?.enabled) {
        return { success: false, error: 'WhatsApp not enabled' };
      }

      // Respetar setting de notificaciones de cambios (cancelaciones incluidas)
      if ((storefront as any)?.beautyConfig?.notifications?.autoChangeNotify === false) {
        this.logger.log('Change notifications disabled for this tenant — skipping cancellation');
        return { success: false, error: 'Change notifications disabled' };
      }

      const message = this.buildCancellationMessage(booking, storefront);
      const result = await this.sendWhatsAppMessage(
        booking.client.phone,
        message,
        booking.tenantId.toString(),
      );

      if (result.success) {
        booking.whatsappNotifications.push({
          type: 'cancellation',
          sentAt: new Date(),
          status: 'sent',
          messageId: result.messageId,
        });
        await booking.save();
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending cancellation: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Envía notificación de reagendamiento (cambio de fecha/hora)
   */
  async sendRescheduledNotification(
    booking: BeautyBookingDocument,
    previousDate: string,
    previousTime: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const storefront = await this.storefrontConfigModel
        .findOne({ tenantId: booking.tenantId })
        .exec();

      if (!storefront || !(storefront as any)?.beautyConfig?.bookingSettings?.whatsappNotification?.enabled) {
        return { success: false, error: 'WhatsApp not enabled' };
      }

      if ((storefront as any)?.beautyConfig?.notifications?.autoChangeNotify === false) {
        return { success: false, error: 'Change notifications disabled' };
      }

      const servicesList = booking.services.map((s) => `• ${s.name}`).join('\n');

      const message =
        `Hola ${booking.client.name}, tu cita en *${(storefront as any).name}* ha sido reagendada 📅\n\n` +
        `*Nueva fecha:* ${this.formatDate(booking.date)}\n` +
        `*Nueva hora:* ${booking.startTime}\n\n` +
        `*Servicios:*\n${servicesList}\n\n` +
        `Código de reserva: *${booking.bookingNumber}*\n\n` +
        `Si necesitas más cambios, contáctanos.\n— ${(storefront as any).name}`;

      const result = await this.sendWhatsAppMessage(
        booking.client.phone,
        message,
        booking.tenantId.toString(),
      );

      if (result.success) {
        booking.whatsappNotifications.push({
          type: 'rescheduled' as any,
          sentAt: new Date(),
          status: 'sent',
          messageId: result.messageId,
        });
        await booking.save();
      }

      return result;
    } catch (error) {
      this.logger.error(`Error sending rescheduled notification: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Construye mensaje de confirmación
   */
  private buildConfirmationMessage(
    booking: BeautyBookingDocument,
    storefront: StorefrontConfigDocument,
  ): string {
    // Usar template personalizado si existe
    const customTemplate =
      (storefront as any).beautyConfig?.bookingSettings?.whatsappNotification
        ?.messageTemplate;

    if (customTemplate) {
      return this.replaceTemplateVariables(customTemplate, booking, storefront);
    }

    // Template por defecto
    const servicesList = booking.services.map((s) => `• ${s.name}`).join('\n');

    const paymentMethods = (storefront as any).beautyConfig?.paymentMethods
      ?.filter((pm) => pm.isActive)
      .map((pm) => `• ${pm.name}: ${pm.details}`)
      .join('\n');

    return `¡Hola ${booking.client.name}! 👋

Tu reserva en *${(storefront as any).name}* ha sido confirmada:

💈 *Servicios:*
${servicesList}

${booking.professionalName ? `👤 *Profesional:* ${booking.professionalName}` : '👤 *Profesional:* El siguiente disponible'}

📅 *Fecha:* ${this.formatDate(booking.date)}
🕐 *Hora:* ${booking.startTime}
⏱️ *Duración:* ${booking.totalDuration} min
💰 *Total:* $${booking.totalPrice.toFixed(2)}

${paymentMethods ? `*Métodos de pago aceptados:*\n${paymentMethods}\n\n` : ''}${(storefront as any).contactInfo?.address ? `📍 *Dirección:* ${(storefront as any).contactInfo.address}\n\n` : ''}Tu código de reserva es: *${booking.bookingNumber}*

Si necesitas reprogramar o cancelar, responde a este mensaje.

— ${(storefront as any).name}
Reserva gestionada por SmartKubik`;
  }

  /**
   * Construye mensaje de recordatorio
   */
  private buildReminderMessage(
    booking: BeautyBookingDocument,
    storefront: StorefrontConfigDocument,
  ): string {
    return `Hola ${booking.client.name}! 👋

Te recordamos tu cita en *${(storefront as any).name}* mañana:

📅 *Fecha:* ${this.formatDate(booking.date)}
🕐 *Hora:* ${booking.startTime}
💰 *Total:* $${booking.totalPrice.toFixed(2)}

Tu código de reserva: *${booking.bookingNumber}*

${(storefront as any).contactInfo?.address ? `📍 *Dirección:* ${(storefront as any).contactInfo.address}\n\n` : ''}¡Te esperamos!

— ${(storefront as any).name}`;
  }

  /**
   * Construye mensaje de cancelación
   */
  private buildCancellationMessage(
    booking: BeautyBookingDocument,
    storefront: StorefrontConfigDocument,
  ): string {
    return `Hola ${booking.client.name},

Tu reserva *${booking.bookingNumber}* en *${(storefront as any).name}* ha sido cancelada.

📅 Era para: ${this.formatDate(booking.date)} a las ${booking.startTime}

${booking.cancellationReason ? `Motivo: ${booking.cancellationReason}\n\n` : ''}Si deseas hacer una nueva reserva, puedes contactarnos.

— ${(storefront as any).name}`;
  }

  /**
   * Reemplaza variables del template personalizado
   */
  private replaceTemplateVariables(
    template: string,
    booking: BeautyBookingDocument,
    storefront: StorefrontConfigDocument,
  ): string {
    const servicesList = booking.services.map((s) => s.name).join(', ');
    const paymentMethodsList = (storefront as any).beautyConfig?.paymentMethods
      ?.filter((pm) => pm.isActive)
      .map((pm) => `${pm.name}: ${pm.details}`)
      .join('\n');

    return template
      .replace(/{{clientName}}/g, booking.client.name)
      .replace(/{{salonName}}/g, (storefront as any).name)
      .replace(/{{storeName}}/g, (storefront as any).name)
      .replace(/{{servicesList}}/g, servicesList)
      .replace(
        /{{professionalName}}/g,
        booking.professionalName || 'El siguiente disponible',
      )
      .replace(/{{date}}/g, this.formatDate(booking.date))
      .replace(/{{startTime}}/g, booking.startTime)
      .replace(/{{endTime}}/g, booking.endTime)
      .replace(/{{totalDuration}}/g, booking.totalDuration.toString())
      .replace(/{{totalPrice}}/g, `$${booking.totalPrice.toFixed(2)}`)
      .replace(/{{bookingNumber}}/g, booking.bookingNumber)
      .replace(/{{bookingCode}}/g, booking.bookingNumber)
      .replace(/{{paymentMethodsList}}/g, paymentMethodsList || 'Consultar al llegar')
      .replace(/{{address}}/g, (storefront as any).contactInfo?.address || 'Ver ubicación en el mapa');
  }

  /**
   * Formatea fecha a string legible
   */
  private formatDate(date: Date): string {
    const d = new Date(date);
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    return `${days[d.getDay()]} ${d.getDate()} de ${months[d.getMonth()]}`;
  }

  /**
   * Envía mensaje WhatsApp via API de Whapi
   * Esta es una implementación simplificada que usa fetch directo
   */
  private async sendWhatsAppMessage(
    to: string,
    message: string,
    tenantId: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Obtener token de Whapi (de tenant o master)
      const token = await this.getWhapiToken(tenantId);

      if (!token) {
        return { success: false, error: 'Whapi token not configured' };
      }

      // Normalizar número de teléfono
      const normalizedPhone = this.normalizePhoneNumber(to);

      // Enviar mensaje usando Whapi API
      const response = await fetch('https://gate.whapi.cloud/messages/text', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: normalizedPhone,
          body: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Whapi API error: ${JSON.stringify(data)}`);
        return { success: false, error: data.message || 'Whapi API error' };
      }

      this.logger.log(
        `WhatsApp message sent to ${normalizedPhone}, ID: ${data.id}`,
      );

      return {
        success: true,
        messageId: data.id || data.message_id,
      };
    } catch (error) {
      this.logger.error(`Error sending WhatsApp message: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtiene token de Whapi (del tenant o master)
   */
  private async getWhapiToken(tenantId: string): Promise<string | null> {
    try {
      // TODO: Implementar obtención del token
      // Prioridad: tenant.whapiToken (encriptado) > WHAPI_MASTER_TOKEN env > SuperAdmin setting

      const masterToken = this.configService.get<string>('WHAPI_MASTER_TOKEN');

      if (masterToken) {
        return masterToken;
      }

      // TODO: Buscar token del tenant en BD
      // const tenant = await this.tenantModel.findById(tenantId);
      // if (tenant.whapiToken) {
      //   return safeDecrypt(tenant.whapiToken);
      // }

      return null;
    } catch (error) {
      this.logger.error(`Error getting Whapi token: ${error.message}`);
      return null;
    }
  }

  /**
   * Normaliza número de teléfono para WhatsApp
   */
  private normalizePhoneNumber(phone: string): string {
    // Remover espacios, guiones, paréntesis
    let normalized = phone.replace(/[\s\-\(\)]/g, '');

    // Asegurar que tiene el + al inicio
    if (!normalized.startsWith('+')) {
      normalized = '+' + normalized;
    }

    return normalized;
  }

  /**
   * Envía notificación de slot disponible a cliente en lista de espera
   */
  async sendWaitlistNotification(
    booking: any,
    date: string,
    timeSlot?: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (!booking?.client?.phone) return { success: false, error: 'No phone' };

      const formattedDate = new Date(date).toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      });

      const message =
        `¡Hola ${booking.client.name}! 🎉 Se liberó un espacio para el ${formattedDate}` +
        `${timeSlot ? ` a las ${timeSlot}` : ''}. ¿Te gustaría confirmar tu cita? ` +
        `Tienes 2 horas para responder. Responde SÍ para confirmar o NO para cancelar tu lugar en la lista de espera.`;

      return await this.sendWhatsAppMessage(
        booking.client.phone,
        message,
        booking.tenantId?.toString() || '',
      );
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Obtiene link de WhatsApp pre-armado (fallback si API falla)
   */
  getWhatsAppLink(phone: string, message: string): string {
    const normalizedPhone = this.normalizePhoneNumber(phone).substring(1); // Sin el +
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${normalizedPhone}?text=${encodedMessage}`;
  }
}
