import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduStudent, EduStudentDocument } from "../../../schemas/edu-student.schema";
import { EduClassroom, EduClassroomDocument } from "../../../schemas/edu-classroom.schema";
import { WhapiService } from "../../whapi/whapi.service";

interface EduAbsenceEvent {
  tenantId: string;
  studentId: string;
  classroomId: string;
  date: Date;
  teacherId: string;
}

@Injectable()
export class EduAbsenceListener {
  private readonly logger = new Logger(EduAbsenceListener.name);

  constructor(
    @InjectModel(EduStudent.name) private studentModel: Model<EduStudentDocument>,
    @InjectModel(EduClassroom.name) private classroomModel: Model<EduClassroomDocument>,
    private readonly whapiService: WhapiService,
  ) {}

  @OnEvent("edu.attendance.absence")
  async handleAbsence(payload: EduAbsenceEvent) {
    try {
      const student = await this.studentModel
        .findOne({
          _id: new Types.ObjectId(payload.studentId),
          tenantId: new Types.ObjectId(payload.tenantId),
          isDeleted: { $ne: true },
        })
        .lean();

      if (!student?.guardian?.whatsapp) return;

      const classroom = await this.classroomModel
        .findById(new Types.ObjectId(payload.classroomId))
        .lean();

      const phone = student.guardian.whatsapp.replace(/\D/g, "");
      const dateStr = new Date(payload.date).toLocaleDateString("es-VE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      });

      const message =
        `Estimado/a ${student.guardian.name}, le informamos que ` +
        `${student.firstName} ${student.lastName} estuvo AUSENTE el ${dateStr} ` +
        `en ${classroom?.name ?? "su salón"}. Si tiene alguna novedad, ` +
        `comuníquese con la institución. — SmartKubik Educación`;

      await this.whapiService.sendWhatsAppMessage(payload.tenantId, phone, message);

      this.logger.log(
        `Notificación de ausencia enviada para alumno ${payload.studentId} (${dateStr})`,
      );
    } catch (error) {
      // Un fallo de WhatsApp no debe propagar errores al flujo de asistencia
      this.logger.error(
        `Error enviando notificación de ausencia para alumno ${payload.studentId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
