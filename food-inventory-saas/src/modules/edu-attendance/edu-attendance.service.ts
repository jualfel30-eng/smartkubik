import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EduAttendance, EduAttendanceDocument } from "../../schemas/edu-attendance.schema";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";

@Injectable()
export class EduAttendanceService {
  constructor(
    @InjectModel(EduAttendance.name) private attendanceModel: Model<EduAttendanceDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  // Registro bulk de asistencia con upsert (único por salón/fecha)
  async recordAttendance(
    dto: CreateAttendanceDto,
    tenantId: string,
    createdBy: string,
  ): Promise<EduAttendance> {
    if (new Date(dto.date) > new Date()) {
      throw new BadRequestException("No se puede registrar asistencia de una fecha futura");
    }

    // Normalizar a mediodía UTC para evitar bugs de timezone
    const normalizedDate = new Date(
      new Date(dto.date).toISOString().split("T")[0] + "T12:00:00.000Z",
    );

    const result = await this.attendanceModel.findOneAndUpdate(
      {
        tenantId: this.toObjectId(tenantId),
        classroomId: this.toObjectId(dto.classroomId),
        date: normalizedDate,
      },
      {
        $set: {
          teacherId: this.toObjectId(dto.teacherId),
          ...(dto.subjectId ? { subjectId: this.toObjectId(dto.subjectId) } : {}),
          entries: dto.entries.map((e) => ({
            studentId: this.toObjectId(e.studentId),
            status: e.status,
            notes: e.notes,
          })),
          createdBy: this.toObjectId(createdBy),
        },
      },
      { upsert: true, new: true },
    );

    // Emitir evento por cada alumno ausente — el listener maneja el WhatsApp desacoplado
    const absences = dto.entries.filter((e) => e.status === "absent");
    for (const absence of absences) {
      this.eventEmitter.emit("edu.attendance.absence", {
        tenantId,
        studentId: absence.studentId,
        classroomId: dto.classroomId,
        date: normalizedDate,
        teacherId: dto.teacherId,
      });
    }

    return result;
  }

  async findAll(tenantId: string, filters: AttendanceFiltersDto = {}) {
    const { page = 1, limit = 20, classroomId, date, academicYear } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (date) {
      baseFilter.date = new Date(
        new Date(date).toISOString().split("T")[0] + "T12:00:00.000Z",
      );
    }
    if (academicYear) {
      const year = parseInt(academicYear.split("-")[0], 10);
      if (!isNaN(year)) {
        baseFilter.date = {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lt: new Date(`${year + 1}-12-31T23:59:59.999Z`),
        };
      }
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.attendanceModel.find(baseFilter).skip(skip).limit(limit).sort({ date: -1 }).exec(),
      this.attendanceModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduAttendance> {
    const attendance = await this.attendanceModel
      .findOne({ _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } })
      .exec();
    if (!attendance) throw new NotFoundException(`Asistencia con ID "${id}" no encontrada`);
    return attendance;
  }

  // Historial de asistencia de un salón entre dos fechas
  async findByClassroomRange(
    classroomId: string,
    tenantId: string,
    from?: string,
    to?: string,
  ) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      classroomId: this.toObjectId(classroomId),
      isDeleted: { $ne: true },
    };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    return this.attendanceModel.find(filter).sort({ date: -1 }).exec();
  }

  // Historial de asistencia de un alumno (busca dentro del array entries)
  async findByStudent(studentId: string, tenantId: string, academicYear?: string) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      "entries.studentId": this.toObjectId(studentId),
      isDeleted: { $ne: true },
    };
    if (academicYear) {
      const year = parseInt(academicYear.split("-")[0], 10);
      if (!isNaN(year)) {
        filter.date = {
          $gte: new Date(`${year}-01-01T00:00:00.000Z`),
          $lt: new Date(`${year + 1}-12-31T23:59:59.999Z`),
        };
      }
    }
    return this.attendanceModel.find(filter).sort({ date: -1 }).exec();
  }

  // % de asistencia por alumno en un salón — útil para boletines
  async getClassroomSummary(classroomId: string, tenantId: string) {
    const records = await this.attendanceModel
      .find({
        tenantId: this.toObjectId(tenantId),
        classroomId: this.toObjectId(classroomId),
        isDeleted: { $ne: true },
      })
      .lean()
      .exec();

    const totalDays = records.length;
    const summary: Record<string, { present: number; absent: number; late: number; excused: number; pct: number }> = {};

    for (const record of records) {
      for (const entry of record.entries) {
        const sid = entry.studentId.toString();
        if (!summary[sid]) summary[sid] = { present: 0, absent: 0, late: 0, excused: 0, pct: 0 };
        summary[sid][entry.status] = (summary[sid][entry.status] ?? 0) + 1;
      }
    }

    for (const sid of Object.keys(summary)) {
      const s = summary[sid];
      const attended = s.present + s.late;
      s.pct = totalDays > 0 ? Math.round((attended / totalDays) * 100) : 0;
    }

    return { totalDays, students: summary };
  }

  async update(id: string, tenantId: string, dto: UpdateAttendanceDto): Promise<EduAttendance> {
    const updateData: any = { ...dto };
    if (dto.date) {
      updateData.date = new Date(
        new Date(dto.date).toISOString().split("T")[0] + "T12:00:00.000Z",
      );
    }
    const updated = await this.attendanceModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: updateData },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Asistencia con ID "${id}" no encontrada`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.attendanceModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Asistencia con ID "${id}" no encontrada`);
    return { success: true, message: "Asistencia eliminada exitosamente" };
  }
}
