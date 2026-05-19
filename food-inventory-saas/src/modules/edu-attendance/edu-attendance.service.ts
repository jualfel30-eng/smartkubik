import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduAttendance, EduAttendanceDocument } from "../../schemas/edu-attendance.schema";
import { CreateAttendanceDto } from "./dto/create-attendance.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";

@Injectable()
export class EduAttendanceService {
  constructor(
    @InjectModel(EduAttendance.name) private attendanceModel: Model<EduAttendanceDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateAttendanceDto, tenantId: string, userId: string): Promise<EduAttendance> {
    const normalizedDate = new Date(
      new Date(dto.date).toISOString().split("T")[0] + "T12:00:00.000Z",
    );
    const attendance = new this.attendanceModel({
      ...dto,
      date: normalizedDate,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return attendance.save();
  }

  async findAll(tenantId: string, filters: AttendanceFiltersDto = {}) {
    const { page = 1, limit = 20, classroomId, date, academicYear } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (date) {
      const normalizedDate = new Date(
        new Date(date).toISOString().split("T")[0] + "T12:00:00.000Z",
      );
      baseFilter.date = normalizedDate;
    }
    if (academicYear) {
      // Filter by year range if academicYear provided (e.g. "2024-2025")
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
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!attendance) throw new NotFoundException(`Asistencia con ID "${id}" no encontrada`);
    return attendance;
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
