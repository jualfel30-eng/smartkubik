import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import { ReservationsService } from "../reservations.service";
import { MailService } from "../../mail/mail.service";

@Injectable()
export class SendReservationConfirmationJob {
  private readonly logger = new Logger(SendReservationConfirmationJob.name);

  constructor(
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly reservationsService: ReservationsService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Envía confirmaciones de reservas pendientes cada 10 minutos
   * Solo procesa reservas creadas hace más de 5 minutos
   */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async sendPendingConfirmations() {
    this.logger.log("🔔 Starting reservation confirmations job...");

    try {
      // Obtener todos los tenants activos con módulo de reservations habilitado
      const tenants = await this.tenantModel
        .find({
          status: "active",
          "enabledModules.reservations": true,
          "settings.reservations.sendConfirmationEmail": true,
        })
        .exec();

      this.logger.log(
        `Found ${tenants.length} tenants with reservation confirmations enabled`,
      );

      let totalSent = 0;
      let totalErrors = 0;

      for (const tenant of tenants) {
        try {
          // Obtener reservas pendientes de confirmación
          const reservations =
            await this.reservationsService.getPendingConfirmations(
              tenant._id.toString(),
            );

          this.logger.log(
            `Tenant ${tenant.name}: ${reservations.length} pending confirmations`,
          );

          for (const reservation of reservations) {
            try {
              // Solo enviar si hay email
              if (!reservation.guestEmail) {
                this.logger.warn(
                  `Reservation ${reservation.reservationNumber} has no email, skipping`,
                );
                continue;
              }

              // Enviar email de confirmación
              const confirmationHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">Confirmación de Reserva</h2>
                  <p>Estimado/a ${reservation.guestName},</p>
                  <p>Su reserva ha sido confirmada exitosamente.</p>

                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">Detalles de la Reserva</h3>
                    <p><strong>Número de Reserva:</strong> ${reservation.reservationNumber}</p>
                    <p><strong>Fecha:</strong> ${new Date(reservation.date).toLocaleDateString("es-ES")}</p>
                    <p><strong>Hora:</strong> ${reservation.time}</p>
                    <p><strong>Número de Personas:</strong> ${reservation.partySize}</p>
                    ${reservation.tableNumber ? `<p><strong>Mesa:</strong> ${reservation.tableNumber}</p>` : ""}
                    ${reservation.section ? `<p><strong>Sección:</strong> ${reservation.section}</p>` : ""}
                    ${reservation.specialRequests ? `<p><strong>Solicitudes Especiales:</strong> ${reservation.specialRequests}</p>` : ""}
                  </div>

                  <p>Le esperamos en <strong>${tenant.name}</strong>.</p>
                  <p style="color: #6b7280; font-size: 12px;">Si necesita modificar o cancelar su reserva, por favor contáctenos.</p>
                </div>
              `;

              await this.mailService.sendTemplatedEmail({
                tenantId: tenant._id.toString(),
                to: reservation.guestEmail,
                subject: `Confirmación de Reserva ${reservation.reservationNumber} - ${tenant.name}`,
                html: confirmationHtml,
              });

              // Marcar como enviado
              reservation.confirmationSentAt = new Date();
              await reservation.save();

              totalSent++;
              this.logger.log(
                `✅ Sent confirmation for ${reservation.reservationNumber}`,
              );
            } catch (error) {
              totalErrors++;
              this.logger.error(
                `❌ Error sending confirmation for ${reservation.reservationNumber}:`,
                error.message,
              );
            }
          }
        } catch (error) {
          this.logger.error(
            `❌ Error processing tenant ${tenant.name}:`,
            error.message,
          );
        }
      }

      this.logger.log(
        `✅ Reservation confirmations job completed: ${totalSent} sent, ${totalErrors} errors`,
      );
    } catch (error) {
      this.logger.error("❌ Fatal error in confirmations job:", error.message);
    }
  }
}
