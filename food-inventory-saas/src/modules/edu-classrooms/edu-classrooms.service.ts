import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EduClassroom, EduClassroomDocument } from "../../schemas/edu-classroom.schema";
import { EduStudent, EduStudentDocument } from "../../schemas/edu-student.schema";
import { CreateClassroomDto } from "./dto/create-classroom.dto";
import { UpdateClassroomDto } from "./dto/update-classroom.dto";
import { ClassroomFiltersDto } from "./dto/classroom-filters.dto";

@Injectable()
export class EduClassroomsService {
  constructor(
    @InjectModel(EduClassroom.name) private classroomModel: Model<EduClassroomDocument>,
    @InjectModel(EduStudent.name) private eduStudentModel: Model<EduStudentDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(dto: CreateClassroomDto, tenantId: string, userId: string): Promise<EduClassroom> {
    const classroom = new this.classroomModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(userId),
    });
    return classroom.save();
  }

  async findAll(tenantId: string, filters: ClassroomFiltersDto = {}) {
    const { page = 1, limit = 20, academicYear, grade } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (academicYear) baseFilter.academicYear = academicYear;
    if (grade) baseFilter.grade = grade;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.classroomModel.find(baseFilter).skip(skip).limit(limit).sort({ createdAt: -1 }).exec(),
      this.classroomModel.countDocuments(baseFilter).exec(),
    ]);
    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduClassroom> {
    const classroom = await this.classroomModel
      .findOne({
        _id: id,
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!classroom) throw new NotFoundException(`Salón con ID "${id}" no encontrado`);
    return classroom;
  }

  async update(id: string, tenantId: string, dto: UpdateClassroomDto): Promise<EduClassroom> {
    const updated = await this.classroomModel
      .findOneAndUpdate(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: dto },
        { new: true },
      )
      .exec();
    if (!updated) throw new NotFoundException(`Salón con ID "${id}" no encontrado`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.classroomModel
      .updateOne(
        { _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Salón con ID "${id}" no encontrado`);
    return { success: true, message: "Salón eliminado exitosamente" };
  }

  async assignStudents(
    tenantId: string,
    classroomId: string,
    studentIds: string[],
  ): Promise<{ classroom: EduClassroom | null; studentCount: number }> {
    const classroom = await this.classroomModel
      .findOne({
        _id: this.toObjectId(classroomId),
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .exec();
    if (!classroom) throw new NotFoundException(`Salón con ID "${classroomId}" no encontrado`);

    const studentObjectIds = studentIds.map((id) => this.toObjectId(id));

    // Verify all students belong to this tenant
    const verifiedCount = await this.eduStudentModel.countDocuments({
      _id: { $in: studentObjectIds },
      tenantId: { $in: [tenantId, this.toObjectId(tenantId)] },
      isDeleted: { $ne: true },
    });

    if (verifiedCount !== studentIds.length) {
      throw new BadRequestException(
        "Uno o más alumnos no pertenecen a este tenant o no existen",
      );
    }

    // Update classroom studentIds (no duplicates)
    await this.classroomModel
      .updateOne(
        { _id: this.toObjectId(classroomId), tenantId: this.toObjectId(tenantId) },
        { $addToSet: { studentIds: { $each: studentObjectIds } } },
      )
      .exec();

    // Update each student's classroomId
    await this.eduStudentModel.updateMany(
      {
        _id: { $in: studentObjectIds },
        tenantId: { $in: [tenantId, this.toObjectId(tenantId)] },
      },
      { $set: { classroomId: this.toObjectId(classroomId) } },
    );

    const refreshed = await this.classroomModel
      .findOne({ _id: this.toObjectId(classroomId), tenantId: this.toObjectId(tenantId) })
      .exec();

    return {
      classroom: refreshed,
      studentCount: refreshed?.studentIds?.length ?? 0,
    };
  }
}
