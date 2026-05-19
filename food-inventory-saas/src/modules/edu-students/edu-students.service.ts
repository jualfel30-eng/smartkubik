import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import bcrypt from "bcrypt";
import { EduStudent, EduStudentDocument } from "../../schemas/edu-student.schema";
import { CreateStudentDto } from "./dto/create-student.dto";
import { UpdateStudentDto } from "./dto/update-student.dto";
import { StudentFiltersDto } from "./dto/student-filters.dto";

@Injectable()
export class EduStudentsService {
  constructor(
    @InjectModel(EduStudent.name) private eduStudentModel: Model<EduStudentDocument>,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async generateEnrollmentNumber(tenantId: string): Promise<string> {
    const last = await this.eduStudentModel
      .findOne({ tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } })
      .sort({ enrollmentNumber: -1 })
      .select("enrollmentNumber")
      .lean();

    if (!last) return "0001";

    const lastNum = parseInt(last.enrollmentNumber, 10);
    if (isNaN(lastNum)) return "0001";
    return String(lastNum + 1).padStart(4, "0");
  }

  async create(
    dto: CreateStudentDto,
    tenantId: string,
    createdBy: string,
  ): Promise<EduStudentDocument> {
    const existing = await this.eduStudentModel.findOne({
      tenantId: this.toObjectId(tenantId),
      email: dto.email.toLowerCase(),
      isDeleted: { $ne: true },
    });
    if (existing) {
      throw new ConflictException("Ya existe un alumno con este email en este tenant");
    }

    const enrollmentNumber = await this.generateEnrollmentNumber(tenantId);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const { password: _pw, classroomId, guardianCustomerId, ...rest } = dto;

    const student = new this.eduStudentModel({
      ...rest,
      email: dto.email.toLowerCase(),
      tenantId: this.toObjectId(tenantId),
      enrollmentNumber,
      passwordHash,
      createdBy: this.toObjectId(createdBy),
      ...(classroomId && { classroomId: this.toObjectId(classroomId) }),
      ...(guardianCustomerId && { guardianCustomerId: this.toObjectId(guardianCustomerId) }),
    });

    return student.save();
  }

  async findAll(tenantId: string, filters: StudentFiltersDto = {}) {
    const { page = 1, limit = 20, academicYear, classroomId, status, search } = filters;
    const baseFilter: any = {
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    };

    if (academicYear) baseFilter.academicYear = academicYear;
    if (classroomId) baseFilter.classroomId = this.toObjectId(classroomId);
    if (status) baseFilter.status = status;
    if (search) {
      const regex = new RegExp(search, "i");
      baseFilter.$or = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { enrollmentNumber: regex },
      ];
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.eduStudentModel
        .find(baseFilter)
        .select("-passwordHash")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.eduStudentModel.countDocuments(baseFilter).exec(),
    ]);

    return { data: items, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<EduStudentDocument> {
    const student = await this.eduStudentModel
      .findOne({
        _id: this.toObjectId(id),
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .select("-passwordHash")
      .exec();
    if (!student) throw new NotFoundException(`Alumno con ID "${id}" no encontrado`);
    return student;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateStudentDto,
  ): Promise<EduStudentDocument> {
    const updateData: any = { ...dto };
    if (dto.classroomId) updateData.classroomId = this.toObjectId(dto.classroomId);
    if (dto.guardianCustomerId) updateData.guardianCustomerId = this.toObjectId(dto.guardianCustomerId);

    const updated = await this.eduStudentModel
      .findOneAndUpdate(
        { _id: this.toObjectId(id), tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: updateData },
        { new: true },
      )
      .select("-passwordHash")
      .exec();
    if (!updated) throw new NotFoundException(`Alumno con ID "${id}" no encontrado`);
    return updated;
  }

  async remove(id: string, tenantId: string): Promise<{ success: boolean; message: string }> {
    const result = await this.eduStudentModel
      .updateOne(
        { _id: this.toObjectId(id), tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: { isDeleted: true } },
      )
      .exec();
    if (result.modifiedCount === 0) throw new NotFoundException(`Alumno con ID "${id}" no encontrado`);
    return { success: true, message: "Alumno eliminado exitosamente" };
  }

  async findByEmailAndTenant(
    email: string,
    tenantId: string,
  ): Promise<EduStudentDocument | null> {
    return this.eduStudentModel
      .findOne({
        email: email.toLowerCase(),
        tenantId: { $in: [tenantId, this.toObjectId(tenantId)] },
        isDeleted: { $ne: true },
      })
      .select("+passwordHash")
      .exec();
  }
}
