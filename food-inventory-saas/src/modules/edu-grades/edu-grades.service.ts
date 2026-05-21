import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { EduGrade, EduGradeDocument } from "../../schemas/edu-grade.schema";
import { EduSubject, EduSubjectDocument } from "../../schemas/edu-subject.schema";
import { EmployeeProfile, EmployeeProfileDocument } from "../../schemas/employee-profile.schema";
import { CreateGradeDto } from "./dto/create-grade.dto";
import { UpdateGradeDto } from "./dto/update-grade.dto";
import { GradeFiltersDto } from "./dto/grade-filters.dto";
import { PublishGradesDto } from "./dto/publish-grades.dto";

@Injectable()
export class EduGradesService {
  constructor(
    @InjectModel(EduGrade.name) private gradeModel: Model<EduGradeDocument>,
    @InjectModel(EduSubject.name) private subjectModel: Model<EduSubjectDocument>,
    @InjectModel(EmployeeProfile.name) private employeeModel: Model<EmployeeProfileDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  async create(
    dto: CreateGradeDto,
    tenantId: string,
    requesterId: string,
    requesterRole?: string,
  ): Promise<EduGrade> {
    const subject = await this.subjectModel.findOne({
      _id: this.toObjectId(dto.subjectId),
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!subject) throw new NotFoundException("Materia no encontrada");

    // Si es TEACHER, verificar que es el docente asignado a la materia
    if (requesterRole === "TEACHER") {
      const employee = await this.employeeModel.findOne({
        userId: this.toObjectId(requesterId),
        tenantId: this.toObjectId(tenantId),
      });

      if (!employee || subject.teacherId.toString() !== employee._id.toString()) {
        throw new ForbiddenException("Solo el docente asignado puede cargar notas de esta materia");
      }
    }

    // isPassing se calcula desde la escala de la materia, ignorando lo que envíe el cliente
    const isPassing = dto.score >= subject.gradeScale.passing;

    const grade = new this.gradeModel({
      ...dto,
      tenantId: this.toObjectId(tenantId),
      createdBy: this.toObjectId(requesterId),
      isPassing,
      isPublished: false,
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

  async findByClassroom(classroomId: string, tenantId: string, filters: Partial<GradeFiltersDto> = {}) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      classroomId: this.toObjectId(classroomId),
      isDeleted: { $ne: true },
    };
    if (filters.academicYear) filter.academicYear = filters.academicYear;
    if (filters.period) filter.period = filters.period;
    if (filters.isPublished !== undefined) filter.isPublished = filters.isPublished;

    return this.gradeModel.find(filter).sort({ studentId: 1, period: 1 }).exec();
  }

  // Solo retorna notas publicadas (portal alumno) o todas (admin con edu_grades_read)
  async findByStudent(studentId: string, tenantId: string, onlyPublished = false) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      studentId: this.toObjectId(studentId),
      isDeleted: { $ne: true },
    };
    if (onlyPublished) filter.isPublished = true;

    return this.gradeModel.find(filter).sort({ academicYear: -1, period: 1 }).exec();
  }

  async findBySubject(subjectId: string, tenantId: string, filters: Partial<GradeFiltersDto> = {}) {
    const filter: any = {
      tenantId: this.toObjectId(tenantId),
      subjectId: this.toObjectId(subjectId),
      isDeleted: { $ne: true },
    };
    if (filters.period) filter.period = filters.period;
    if (filters.isPublished !== undefined) filter.isPublished = filters.isPublished;

    return this.gradeModel.find(filter).sort({ studentId: 1 }).exec();
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateGradeDto,
    requesterId: string,
    requesterPermissions: string[],
  ): Promise<EduGrade> {
    const grade = await this.gradeModel.findOne({
      _id: id,
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!grade) throw new NotFoundException(`Nota con ID "${id}" no encontrada`);

    // Notas publicadas solo editables con permiso especial
    if (grade.isPublished && !requesterPermissions.includes("edu_grades_publish")) {
      throw new ForbiddenException(
        "Las calificaciones publicadas no pueden editarse. Contacte al director para autorización.",
      );
    }

    let isPassing = grade.isPassing;
    if (dto.score !== undefined) {
      const subjectId = dto.subjectId ?? grade.subjectId.toString();
      const subject = await this.subjectModel.findOne({
        _id: this.toObjectId(subjectId),
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      });
      if (subject) {
        isPassing = dto.score >= subject.gradeScale.passing;
      }
    }

    return grade.set({ ...dto, isPassing }).save();
  }

  async publishGrades(dto: PublishGradesDto, tenantId: string, publisherId: string) {
    const grades = await this.gradeModel.find({
      _id: { $in: dto.gradeIds.map((id) => this.toObjectId(id)) },
      tenantId: this.toObjectId(tenantId),
      isDeleted: { $ne: true },
    });

    if (grades.length !== dto.gradeIds.length) {
      throw new BadRequestException("Una o más calificaciones no pertenecen a este tenant");
    }

    await this.gradeModel.updateMany(
      { _id: { $in: grades.map((g) => g._id) } },
      {
        $set: {
          isPublished: true,
          publishedAt: new Date(),
          publishedBy: this.toObjectId(publisherId),
        },
      },
    );

    this.eventEmitter.emit("edu.grades.published", {
      tenantId,
      subjectId: dto.subjectId,
      period: dto.period,
      gradeIds: dto.gradeIds,
      publishedBy: publisherId,
    });

    return { published: grades.length };
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
