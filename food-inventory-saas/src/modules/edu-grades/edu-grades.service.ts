import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduGrade, EduGradeDocument } from "../../schemas/edu-grade.schema";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { GradeFiltersDto } from "./dto/grade-filters.dto";

@Injectable()
export class EduGradesService {
  constructor(
    @InjectModel(EduGrade.name) private gradeModel: Model<EduGradeDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateGradeDto, tenantId: string, userId: string): Promise<EduGrade> {
    const grade = new this.gradeModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return grade.save();
  }

  async findAll(tenantId: string, filters: GradeFiltersDto = {}) {
    const { page = 1, limit = 20, academicYear, classroomId, studentId, period, isPublished } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (academicYear) baseFilter.academicYear = academicYear;
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (studentId) baseFilter.studentId = this.toObjectId(studentId);
    if (period) baseFilter.period = period;
    if (isPublished !== undefined) baseFilter.isPublished = isPublished;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.gradeModel.find(baseFilter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.gradeModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduGrade> {
    const grade = await this.gradeModel
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!grade) throw new NotFoundException(`Nota con ID "${id}" no encontrada`);
    return grade;
  }

  async update(id: string, tenantId: string, dto: UpdateGradeDto): Promise<EduGrade> {
    const updated = await this.gradeModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Nota con ID "${id}" no encontrada`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.gradeModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Nota con ID "${id}" no encontrada`);
    return { success: true, message: "Nota eliminada exitosamente" };
  }
}
