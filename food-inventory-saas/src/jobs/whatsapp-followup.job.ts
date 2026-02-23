import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../schemas/tenant.schema";
import { WhapiService } from "../modules/whapi/whapi.service";

/**
 * WhatsApp Follow-Up Sequence for Trial Users
 *
 * Sends timed messages after registration to guide users through
 * activation and toward the Founders Program.
 *
 * Sequence:
 *   Day 0  (immediate) — Welcome + quick-start tips       → triggered in onboarding service
 *   Day 1  — Check-in: "¿Pudiste configurar tu inventario?"
 *   Day 3  — Value demo: feature highlight + tip
 *   Day 7  — Social proof: founder testimonial + CTA
 *   Day 12 — Urgency: trial ending soon, founder slots closing
 */

interface FollowUpStep {
  id: string;
  dayAfterRegistration: number;
  getMessage: (tenant: TenantDocument) => string;
}

const FOLLOW_UP_SEQUENCE: FollowUpStep[] = [
  {
    id: "day1_checkin",
    dayAfterRegistration: 1,
    getMessage: (tenant) =>
      `¡Hola${tenant.ownerFirstName ? ` ${tenant.ownerFirstName}` : ""}! 👋\n\n` +
      `Soy del equipo de SmartKubik. ¿Pudiste configurar tu primer producto en el inventario?\n\n` +
      `Si necesitas ayuda con algo, solo responde este mensaje — estoy aquí para ti.\n\n` +
      `💡 *Tip rápido:* Desde el Dashboard puedes ver un resumen de todo tu negocio en tiempo real.`,
  },
  {
    id: "day3_value",
    dayAfterRegistration: 3,
    getMessage: (tenant) =>
      `¡Hola${tenant.ownerFirstName ? ` ${tenant.ownerFirstName}` : ""}! 🚀\n\n` +
      `¿Sabías que SmartKubik puede enviar confirmaciones de pedido automáticas por WhatsApp a tus clientes?\n\n` +
      `Así funciona:\n` +
      `1️⃣ Un cliente hace un pedido\n` +
      `2️⃣ El sistema le envía la confirmación automáticamente\n` +
      `3️⃣ Tú te ahorras tiempo y tu cliente queda tranquilo\n\n` +
      `Actívalo en *Configuración → WhatsApp*. ¿Quieres que te ayude a configurarlo?`,
  },
  {
    id: "day7_social_proof",
    dayAfterRegistration: 7,
    getMessage: (tenant) =>
      `¡Hola${tenant.ownerFirstName ? ` ${tenant.ownerFirstName}` : ""}! 📊\n\n` +
      `Ya llevas una semana con SmartKubik. Otros negocios como el tuyo han logrado:\n\n` +
      `✅ Reducir la merma un 40% en el primer mes\n` +
      `✅ Ahorrar 3 horas diarias en gestión manual\n` +
      `✅ Cero errores en pedidos y comandas\n\n` +
      `¿Qué tal va tu experiencia? Cuéntame cómo te ha ido.\n\n` +
      `Por cierto, como *Cliente Fundador* puedes bloquear tu precio de por vida con hasta 51% OFF. Solo quedan 78 cupos:\n` +
      `👉 https://smartkubik.com/fundadores`,
  },
  {
    id: "day12_urgency",
    dayAfterRegistration: 12,
    getMessage: (tenant) =>
      `¡Hola${tenant.ownerFirstName ? ` ${tenant.ownerFirstName}` : ""}! ⏰\n\n` +
      `Tu prueba gratuita de SmartKubik termina en *2 días*.\n\n` +
      `No te preocupes — tus datos están 100% seguros. Cuando actives un plan, todo estará exactamente como lo dejaste.\n\n` +
      `🔥 *Oferta especial:* Como Cliente Fundador tienes hasta 51% de descuento *de por vida*. Es un precio que nunca se repetirá.\n\n` +
      `Los cupos se están agotando. Elige tu plan aquí:\n` +
      `👉 https://smartkubik.com/fundadores\n\n` +
      `¿Tienes alguna duda? Responde este mensaje y te ayudo.`,
  },
];

@Injectable()
export class WhatsAppFollowUpJob {
  private readonly logger = new Logger(WhatsAppFollowUpJob.name);

  constructor(
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly whapiService: WhapiService,
  ) {}

  /**
   * Runs every day at 10 AM (good time for Venezuelan business owners).
   * Checks all active trial tenants and sends due follow-up messages.
   */
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleFollowUpSequence() {
    this.logger.log("Starting WhatsApp follow-up sequence check...");

    try {
      // Find all active trial tenants that have a phone and trialStartDate
      const trialTenants = await this.tenantModel
        .find({
          subscriptionPlan: "Trial",
          status: "active",
          trialStartDate: { $exists: true },
          "contactInfo.phone": { $exists: true, $ne: "" },
        })
        .exec();

      if (trialTenants.length === 0) {
        this.logger.log("No trial tenants with phone numbers found.");
        return;
      }

      let sent = 0;
      let skipped = 0;

      for (const tenant of trialTenants) {
        if (!tenant.trialStartDate) continue;
        const daysSinceRegistration = this.getDaysSince(tenant.trialStartDate);
        const alreadySent = tenant.whatsappFollowUpsSent || [];

        for (const step of FOLLOW_UP_SEQUENCE) {
          if (alreadySent.includes(step.id)) continue;
          if (daysSinceRegistration < step.dayAfterRegistration) continue;

          // Send this follow-up
          try {
            const message = step.getMessage(tenant);
            await this.whapiService.sendWhatsAppMessage(
              tenant._id.toString(),
              tenant.contactInfo.phone,
              message,
            );

            // Mark as sent
            await this.tenantModel.updateOne(
              { _id: tenant._id },
              { $push: { whatsappFollowUpsSent: step.id } },
            );

            this.logger.log(
              `Sent follow-up "${step.id}" to ${tenant.name} (${tenant.contactInfo.phone})`,
            );
            sent++;
          } catch (error) {
            this.logger.error(
              `Failed to send follow-up "${step.id}" to ${tenant.name}: ${error.message}`,
            );
            skipped++;
          }
        }
      }

      this.logger.log(
        `WhatsApp follow-up check completed: ${sent} sent, ${skipped} failed, ${trialTenants.length} tenants checked.`,
      );
    } catch (error) {
      this.logger.error(
        `WhatsApp follow-up job failed: ${error.message}`,
        error.stack,
      );
    }
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
