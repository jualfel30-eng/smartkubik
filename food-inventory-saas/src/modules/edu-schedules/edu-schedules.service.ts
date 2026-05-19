import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduSchedule, EduScheduleDocument } from "../../schemas/edu-schedule.schema";
import { CreateScheduleDto } from "./dto/create-schedule.dto";
import { UpdateScheduleDto } from "./dto/update-schedule.dto";
import { ScheduleFiltersDto } from "./dto/schedule-filters.dto";

@Injectable()
export class EduSchedulesService {
  constructor(
    @InjectModel(EduSchedule.name) private scheduleModel: Model<EduScheduleDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateScheduleDto, tenantId: string, userId: string): Promise<EduSchedule> {
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

  async update(id: string, tenantId: string, dto: UpdateScheduleDto): Promise<EduSchedule> {
    const updated = await this.scheduleModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Horario con ID "${id}" no encontrado`);
    return updated;
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
