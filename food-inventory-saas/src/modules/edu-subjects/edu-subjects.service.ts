import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduSubject, EduSubjectDocument } from "../../schemas/edu-subject.schema";
import { CreateSubjectDto } from "./dto/create-subject.dto";
import { UpdateSubjectDto } from "./dto/update-subject.dto";
import { SubjectFiltersDto } from "./dto/subject-filters.dto";

@Injectable()
export class EduSubjectsService {
  constructor(
    @InjectModel(EduSubject.name) private subjectModel: Model<EduSubjectDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateSubjectDto, tenantId: string, userId: string): Promise<EduSubject> {
    const subject = new this.subjectModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return subject.save();
  }

  async findAll(tenantId: string, filters: SubjectFiltersDto = {}) {
    const { page = 1, limit = 20, academicYear, classroomId, teacherId } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (academicYear) baseFilter.academicYear = academicYear;
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (teacherId) baseFilter.teacherId = this.toObjectId(teacherId);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.subjectModel.find(baseFilter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.subjectModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduSubject> {
    const subject = await this.subjectModel
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!subject) throw new NotFoundException(`Asignatura con ID "${id}" no encontrada`);
    return subject;
  }

  async update(id: string, tenantId: string, dto: UpdateSubjectDto): Promise<EduSubject> {
    const updated = await this.subjectModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Asignatura con ID "${id}" no encontrada`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.subjectModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Asignatura con ID "${id}" no encontrada`);
    return { success: true, message: "Asignatura eliminada exitosamente" };
  }
}
