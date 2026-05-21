import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduSchedule, EduScheduleDocument } from "../../schemas/edu-schedule.schema";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { ScheduleFiltersDto } from "./dto/schedule-filters.dto";

// startTime / endTime son strings HH:MM — la comparación lexicográfica es correcta
// siempre que el cliente envíe formato de dos dígitos (e.g. "08:00", no "8:00")
@Injectable()
export class EduSchedulesService {
  constructor(
    @InjectModel(EduSchedule.name) private scheduleModel: Model<EduScheduleDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  private dayNames: Record<number, string> = {
    1: "lunes",
    2: "martes",
    3: "miércoles",
    4: "jueves",
    5: "viernes",
  };

  private async validateNoTeacherConflict(
    tenantId: string,
    fields: Pick<CreateScheduleDto, "teacherId" | "dayOfWeek" | "startTime" | "endTime" | "academicYear">,
    excludeId?: string,
  ) {
    const conflict = await this.scheduleModel.findOne({
      tenantId: this.toObjectId(tenantId),
      teacherId: this.toObjectId(fields.teacherId),
      dayOfWeek: fields.dayOfWeek,
      academicYear: fields.academicYear,
      isDeleted: { $ne: true },
      startTime: { $lt: fields.endTime },
      endTime: { $gt: fields.startTime },
      ...(excludeId ? { _id: { $ne: this.toObjectId(excludeId) } } : {}),
    });

    if (conflict) {
      throw new ConflictException(
        `El docente ya tiene clase el ${this.dayNames[fields.dayOfWeek]} de ${conflict.startTime} a ${conflict.endTime}`,
      );
    }
  }

  private async validateNoClassroomConflict(
    tenantId: string,
    fields: Pick<CreateScheduleDto, "classroomId" | "dayOfWeek" | "startTime" | "endTime" | "academicYear">,
    excludeId?: string,
  ) {
    const conflict = await this.scheduleModel.findOne({
      tenantId: this.toObjectId(tenantId),
      classroomId: this.toObjectId(fields.classroomId),
      dayOfWeek: fields.dayOfWeek,
      academicYear: fields.academicYear,
      isDeleted: { $ne: true },
      startTime: { $lt: fields.endTime },
      endTime: { $gt: fields.startTime },
      ...(excludeId ? { _id: { $ne: this.toObjectId(excludeId) } } : {}),
    });

    if (conflict) {
      throw new ConflictException(
        `El salón ya tiene clase en ese horario (${conflict.startTime} - ${conflict.endTime})`,
      );
    }
  }

  async create(dto: CreateScheduleDto, tenantId: string, userId: string): Promise<EduSchedule> {
    await this.validateNoTeacherConflict(tenantId, dto);
    await this.validateNoClassroomConflict(tenantId, dto);

    const schedule = new this.scheduleModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return schedule.save();
  }

  async findAll(tenantId: string, filters: ScheduleFiltersDto = {}) {
    const { page = 1, limit = 20, academicYear, classroomId, teacherId, dayOfWeek } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (academicYear) baseFilter.academicYear = academicYear;
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (teacherId) baseFilter.teacherId = this.toObjectId(teacherId);
    if (dayOfWeek !== undefined) baseFilter.dayOfWeek = dayOfWeek;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.scheduleModel.find(baseFilter).skip(skip).limit(limit).sort({ dayOfWeek: 1, startTime: 1 }).exec(),
      this.scheduleModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduSchedule> {
    const schedule = await this.scheduleModel
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!schedule) throw new NotFoundException(`Horario con ID "${id}" no encontrado`);
    return schedule;
  }

  // Retorna bloques del docente agrupados por día, ordenados por startTime
  async findByTeacher(teacherId: string, tenantId: string, academicYear?: string) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      teacherId: this.toObjectId(teacherId),
      isDeleted: { $ne: true },
    };
    if (academicYear) filter.academicYear = academicYear;

    const items = await this.scheduleModel
      .find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();

    const grouped: Record<number, typeof items> = {};
    for (const item of items) {
      const day = item.dayOfWeek;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(item);
    }
    return grouped;
  }

  // Retorna el horario semanal completo de un salón
  async findByClassroom(classroomId: string, tenantId: string, academicYear?: string) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      classroomId: this.toObjectId(classroomId),
      isDeleted: { $ne: true },
    };
    if (academicYear) filter.academicYear = academicYear;

    const items = await this.scheduleModel
      .find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .exec();

    const grouped: Record<number, typeof items> = {};
    for (const item of items) {
      const day = item.dayOfWeek;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(item);
    }
    return grouped;
  }

  async update(id: string, tenantId: string, dto: UpdateScheduleDto): Promise<EduSchedule> {
    const existing = await this.scheduleModel.findOne({
      _id: id,
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!existing) throw new NotFoundException(`Horario con ID "${id}" no encontrado`);

    // Combinar campos actuales con la actualización para validar conflictos
    const merged = {
      teacherId: dto.teacherId ?? existing.teacherId.toString(),
      classroomId: dto.classroomId ?? existing.classroomId.toString(),
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      academicYear: dto.academicYear ?? existing.academicYear,
    };

    await this.validateNoTeacherConflict(tenantId, merged, id);
    await this.validateNoClassroomConflict(tenantId, merged, id);

    return existing.set(dto).save();
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.scheduleModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Horario con ID "${id}" no encontrado`);
    return { success: true, message: "Horario eliminado exitosamente" };
  }
}
