import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Opportunity, OpportunityDocument } from "../schemas/opportunity.schema";
import { NotificationsService } from "../modules/notifications/notifications.service";

@Injectable()
export class OpportunityAgingAlertsJob {
  private readonly logger = new Logger(OpportunityAgingAlertsJob.name);

  constructor(
    @InjectModel(Opportunity.name)
    private readonly opportunityModel: Model<OpportunityDocument>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Ejecutar alertas de aging diariamente a las 9 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleAgingAlerts() {
    this.logger.log("Starting opportunity aging alerts job...");

    try {
      const now = new Date();
      let totalAlerts = 0;

      // 1. Oportunidades con nextStepDue vencido
      const overdue = await this.opportunityModel
        .find({
          stage: { $nin: ['Cierre ganado', 'Cierre perdido'] },
          nextStepDue: { $lt: now },
        })
        .populate('ownerId', 'name email')
        .populate('customerId', 'name')
        .exec();

      this.logger.log(`Found ${overdue.length} overdue opportunities`);

      for (const opp of overdue) {
        await this.notificationsService.enqueueInAppNotification({
          tenantId: opp.tenantId.toString(),
          userId: opp.ownerId?.toString(),
          title: `⚠️ Próximo paso vencido`,
          message: `La oportunidad "${opp.name}" tiene el próximo paso vencido desde ${opp.nextStepDue.toLocaleDateString('es-ES')}`,
          metadata: {
            opportunityId: opp._id.toString(),
            type: 'next_step_overdue',
          },
        });
        totalAlerts++;
      }

      // 2. Alertas de aging 7/14/21 días
      const agingThresholds = [
        { days: 7, emoji: '⏰', severity: 'warning' },
        { days: 14, emoji: '⚠️', severity: 'alert' },
        { days: 21, emoji: '🔴', severity: 'critical' },
      ];

      for (const threshold of agingThresholds) {
        const thresholdDate = new Date(
          now.getTime() - threshold.days * 24 * 60 * 60 * 1000,
        );

        const aging = await this.opportunityModel
          .find({
            stage: { $nin: ['Cierre ganado', 'Cierre perdido'] },
            updatedAt: { $lte: thresholdDate },
            // Evitar alertar la misma oportunidad múltiples veces
            $or: [
              { lastAgingAlert: { $exists: false } },
              { lastAgingAlert: { $lt: thresholdDate } },
            ],
          })
          .populate('ownerId', 'name email')
          .populate('customerId', 'name')
          .limit(50) // Limitar para evitar spam
          .exec();

        this.logger.log(
          `Found ${aging.length} opportunities aging ${threshold.days}+ days`,
        );

        for (const opp of aging) {
          await this.notificationsService.enqueueInAppNotification({
            tenantId: opp.tenantId.toString(),
            userId: opp.ownerId?.toString(),
            title: `${threshold.emoji} Oportunidad sin actividad (${threshold.days}+ días)`,
            message: `La oportunidad "${opp.name}" lleva ${threshold.days}+ días sin actualización. Etapa actual: ${opp.stage}`,
            metadata: {
              opportunityId: opp._id.toString(),
              type: 'aging_alert',
              agingDays: threshold.days,
              severity: threshold.severity,
            },
          });

          // Marcar que se envió alerta
          opp.set('lastAgingAlert', new Date());
          await opp.save();
          totalAlerts++;
        }
      }

      // 3. Oportunidades sin owner (más de 4 horas)
      const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
      const unassigned = await this.opportunityModel
        .find({
          stage: { $nin: ['Cierre ganado', 'Cierre perdido'] },
          ownerId: { $exists: false },
          createdAt: { $lt: fourHoursAgo },
        })
        .populate('customerId', 'name')
        .limit(20)
        .exec();

      this.logger.log(`Found ${unassigned.length} unassigned opportunities`);

      // Notificar a admins (aquí se podría implementar notificación a roles admin)
      for (const opp of unassigned) {
        this.logger.warn(
          `Opportunity ${opp._id} (${opp.name}) has no owner for 4+ hours`,
        );
        // TODO: Notificar a admins o managers
        totalAlerts++;
      }

      this.logger.log(
        `Opportunity aging alerts job completed: ${totalAlerts} alerts sent`,
      );
    } catch (error) {
      this.logger.error(
        `Opportunity aging alerts job failed: ${error.message}`,
        error.stack,
      );
    }
  }
}
