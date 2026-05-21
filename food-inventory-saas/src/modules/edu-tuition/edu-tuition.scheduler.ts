import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Cron } from "@nestjs/schedule";
import { OnEvent } from "@nestjs/event-emitter";
import { Model, Types } from "mongoose";
import { EduTuitionFee, EduTuitionFeeDocument } from "../../schemas/edu-tuition-fee.schema";
import { EduStudent, EduStudentDocument } from "../../schemas/edu-student.schema";
import { WhapiService } from "../whapi/whapi.service";

@Injectable()
export class EduTuitionScheduler {
  private readonly logger = new Logger(EduTuitionScheduler.name);

  constructor(
    @InjectModel(EduTuitionFee.name) private tuitionModel: Model<EduTuitionFeeDocument>,
    @InjectModel(EduStudent.name) private studentModel: Model<EduStudentDocument>,
    private readonly whapiService: WhapiService,
  ) {}

  // 1 AM diariamente — marca cuotas pending vencidas como overdue
  @Cron("0 1 * * *")
  async updateOverdueStatus() {
    this.logger.log("Iniciando job de actualización de cuotas vencidas");
    try {
      const result = await this.tuitionModel.updateMany(
        {
          status: "pending",
          dueDate: { $lt: new Date() },
          isDeleted: { $ne: true },
        },
        { $set: { status: "overdue" } },
      );
      this.logger.log(`Cuotas marcadas como overdue: ${result.modifiedCount}`);
    } catch (error) {
      this.logger.error(`Error en job updateOverdueStatus: ${error.message}`, error.stack);
    }
  }

  // 9 AM diariamente — envía recordatorios a tutores (máx 3 por cuota)
  @Cron("0 9 * * *")
  async sendOverdueReminders() {
    this.logger.log("Iniciando job de recordatorios de cuotas vencidas");
    try {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      const overdueFees = await this.tuitionModel
        .find({
          status: "overdue",
          notificationsCount: { $lt: 3 },
          isDeleted: { $ne: true },
        })
        .lean();

      this.logger.log(`Cuotas pendientes de notificación: ${overdueFees.length}`);

      for (const fee of overdueFees) {
        const student = await this.studentModel
          .findOne({
            _id: new Types.ObjectId(fee.studentId.toString()),
            isDeleted: { $ne: true },
          })
          .lean();

        if (!student?.guardian?.whatsapp) continue;

        const daysOverdue = Math.floor(
          (today.getTime() - new Date(fee.dueDate).getTime()) / (1000 * 60 * 60 * 24),
        );

        const phone = student.guardian.whatsapp.replace(/\D/g, "");
        const message =
          `Estimado/a ${student.guardian.name}, la ${fee.description} de ` +
          `${student.firstName} ${student.lastName} lleva ${daysOverdue} días vencida. ` +
          `Monto: ${fee.currency} ${fee.amount}. Por favor regularice cuanto antes. ` +
          `— SmartKubik Educación`;

        try {
          await this.whapiService.sendWhatsAppMessage(
            fee.tenantId.toString(),
            phone,
            message,
          );

          await this.tuitionModel.updateOne(
            { _id: fee._id },
            {
              $inc: { notificationsCount: 1 },
              $set: { lastNotifiedAt: new Date() },
            },
          );

          this.logger.log(
            `Recordatorio enviado para cuota ${fee._id} (aviso ${(fee.notificationsCount ?? 0) + 1}/3)`,
          );
        } catch (sendError) {
          // Un fallo individual no detiene el batch
          this.logger.error(
            `Error enviando recordatorio para cuota ${fee._id}: ${sendError.message}`,
          );
        }
      }

      this.logger.log("Job de recordatorios finalizado");
    } catch (error) {
      this.logger.error(`Error en job sendOverdueReminders: ${error.message}`, error.stack);
    }
  }

  // Recordatorio manual solicitado desde EduTuitionService.notifyManual()
  @OnEvent("edu.tuition.notify")
  async handleManualNotify(payload: {
    tenantId: string;
    feeId: string;
    phone: string;
    guardianName: string;
    studentName: string;
    description: string;
    amount: number;
    currency: string;
    dueDate: Date;
  }) {
    const daysOverdue = Math.floor(
      (Date.now() - new Date(payload.dueDate).getTime()) / (1000 * 60 * 60 * 24),
    );
    const message =
      daysOverdue > 0
        ? `Estimado/a ${payload.guardianName}, la ${payload.description} de ${payload.studentName} lleva ${daysOverdue} día(s) vencida. Monto: ${payload.currency} ${payload.amount}. Por favor regularice cuanto antes. — SmartKubik Educación`
        : `Estimado/a ${payload.guardianName}, le recordamos que la ${payload.description} de ${payload.studentName} vence pronto. Monto: ${payload.currency} ${payload.amount}. — SmartKubik Educación`;

    try {
      await this.whapiService.sendWhatsAppMessage(payload.tenantId, payload.phone, message);
    } catch (error) {
      this.logger.error(`Error enviando recordatorio manual para cuota ${payload.feeId}: ${error.message}`);
    }
  }
}
