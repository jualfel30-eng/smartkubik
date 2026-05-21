import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduGrade, EduGradeDocument } from "../../../schemas/edu-grade.schema";
import { EduStudent, EduStudentDocument } from "../../../schemas/edu-student.schema";
import { WhapiService } from "../../whapi/whapi.service";

interface GradesPublishedEvent {
  tenantId: string;
  subjectId: string;
  period: string;
  gradeIds: string[];
  publishedBy: string;
}

@Injectable()
export class GradesPublishedListener {
  private readonly logger = new Logger(GradesPublishedListener.name);

  constructor(
    @InjectModel(EduGrade.name) private gradeModel: Model<EduGradeDocument>,
    @InjectModel(EduStudent.name) private studentModel: Model<EduStudentDocument>,
    private readonly whapiService: WhapiService,
  ) {}

  @OnEvent("edu.grades.published")
  async handleGradesPublished(payload: GradesPublishedEvent) {
    try {
      const grades = await this.gradeModel
        .find({
          _id: { $in: payload.gradeIds.map((id) => new Types.ObjectId(id)) },
          tenantId: new Types.ObjectId(payload.tenantId),
        })
        .lean();

      // Obtener studentIds únicos con una sola query
      const uniqueStudentIds = [...new Set(grades.map((g) => g.studentId.toString()))];

      const students = await this.studentModel
        .find({
          _id: { $in: uniqueStudentIds.map((id) => new Types.ObjectId(id)) },
          tenantId: new Types.ObjectId(payload.tenantId),
          isDeleted: { $ne: true },
        })
        .lean();

      for (const student of students) {
        if (!student.guardian?.whatsapp) continue;

        const phone = student.guardian.whatsapp.replace(/\D/g, "");
        const message =
          `Hola ${student.guardian.name}, las calificaciones del ${payload.period} ` +
          `de su representado/a ${student.firstName} ${student.lastName} ya están ` +
          `disponibles en el portal estudiantil. — SmartKubik Educación`;

        try {
          await this.whapiService.sendWhatsAppMessage(payload.tenantId, phone, message);
          this.logger.log(
            `Notificación de notas enviada al tutor de alumno ${student._id}`,
          );
        } catch (sendError) {
          // Fallo individual no detiene el batch
          this.logger.error(
            `Error enviando notificación de notas al tutor de ${student._id}: ${sendError.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error procesando evento edu.grades.published: ${error.message}`,
        error.stack,
      );
    }
  }
}
