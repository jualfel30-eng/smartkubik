import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduTuitionFee, EduTuitionFeeDocument } from "../../schemas/edu-tuition-fee.schema";
import { CreateTuitionDto } from "./dto/create-tuition.dto";
import { UpdateTuitionDto } from "./dto/update-tuition.dto";
import { TuitionFiltersDto } from "./dto/tuition-filters.dto";

@Injectable()
export class EduTuitionService {
  constructor(
    @InjectModel(EduTuitionFee.name) private tuitionModel: Model<EduTuitionFeeDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateTuitionDto, tenantId: string, userId: string): Promise<EduTuitionFee> {
    const tuition = new this.tuitionModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return tuition.save();
  }

  async findAll(tenantId: string, filters: TuitionFiltersDto = {}) {
    const { page = 1, limit = 20, status, academicYear, classroomId, studentId } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (status) baseFilter.status = status;
    if (academicYear) baseFilter.academicYear = academicYear;
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (studentId) baseFilter.studentId = this.toObjectId(studentId);

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.tuitionModel.find(baseFilter).skip(skip).limit(limit).sort({ dueDate: 1 }).exec(),
      this.tuitionModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduTuitionFee> {
    const tuition = await this.tuitionModel
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!tuition) throw new NotFoundException(`Cuota con ID "${id}" no encontrada`);
    return tuition;
  }

  async update(id: string, tenantId: string, dto: UpdateTuitionDto): Promise<EduTuitionFee> {
    const updated = await this.tuitionModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Cuota con ID "${id}" no encontrada`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.tuitionModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Cuota con ID "${id}" no encontrada`);
    return { success: true, message: "Cuota eliminada exitosamente" };
  }
}
