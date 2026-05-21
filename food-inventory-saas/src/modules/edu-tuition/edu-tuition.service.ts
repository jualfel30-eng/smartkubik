import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Model, Types } from "mongoose";
import { EduTuitionFee, EduTuitionFeeDocument } from "../../schemas/edu-tuition-fee.schema";
import { EduStudent, EduStudentDocument } from "../../schemas/edu-student.schema";
import { CreateTuitionDto } from "./dto/create-tuition.dto";
import { GenerateTuitionDto } from "./dto/generate-tuition.dto";
import { PayTuitionDto } from "./dto/pay-tuition.dto";
import { UpdateTuitionDto } from "./dto/update-tuition.dto";
import { TuitionFiltersDto } from "./dto/tuition-filters.dto";

@Injectable()
export class EduTuitionService {
  constructor(
    @InjectModel(EduTuitionFee.name) private tuitionModel: Model<EduTuitionFeeDocument>,
    @InjectModel(EduStudent.name) private studentModel: Model<EduStudentDocument>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : (id as any);
  }

  private monthName(month: number): string {
    const months = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
    ];
    return months[month - 1] ?? `Mes ${month}`;
  }

  // ─── CRUD base ────────────────────────────────────────────────────────────

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

  async findOne(id: string, tenantId: string): Promise<EduTuitionFeeDocument> {
    const tuition = await this.tuitionModel
      .findOne({ _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } })
      .exec();
    if (!tuition) throw new NotFoundException(`Cuota con ID "${id}" no encontrada`);
    return tuition;
  }

  async getByStudent(studentId: string, tenantId: string) {
    return this.tuitionModel
      .find({
        studentId: this.toObjectId(studentId),
        tenantId: this.toObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .sort({ dueDate: 1 })
      .lean()
      .exec();
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

  // ─── Generación batch ─────────────────────────────────────────────────────

  async generateTuitionBatch(dto: GenerateTuitionDto, tenantId: string, userId: string) {
    const tenantObjId = this.toObjectId(tenantId);
    const studentQuery: any = {
      tenantId: tenantObjId,
      status: { $in: ["enrolled", "active"] },
      isDeleted: { $ne: true },
      academicYear: dto.academicYear,
    };
    if (dto.classroomId) {
      studentQuery.classroomId = this.toObjectId(dto.classroomId);
    }

    const students = await this.studentModel.find(studentQuery).lean();
    if (students.length === 0) {
      return { generated: 0, note: "No se encontraron alumnos activos con los filtros indicados" };
    }

    const baseYear = dto.academicYear.split("-")[0];
    const dueDay = String(dto.dueDay ?? 5).padStart(2, "0");
    const fees: any[] = [];

    for (const student of students) {
      for (const month of dto.months) {
        const monthStr = String(month).padStart(2, "0");
        fees.push({
          tenantId: tenantObjId,
          studentId: student._id,
          classroomId: student.classroomId,
          type: "monthly",
          academicYear: dto.academicYear,
          month,
          description: `Mensualidad ${this.monthName(month)} ${baseYear}`,
          amount: dto.amount,
          currency: dto.currency ?? "USD",
          dueDate: new Date(`${baseYear}-${monthStr}-${dueDay}T12:00:00.000Z`),
          status: "pending",
          createdBy: this.toObjectId(userId),
        });
      }
    }

    let insertedCount = fees.length;
    try {
      await this.tuitionModel.insertMany(fees, { ordered: false });
    } catch (e: any) {
      // MongoBulkWriteError con duplicados — las cuotas ya existentes se ignoran (idempotente)
      if (e.name !== "MongoBulkWriteError" && e.code !== 11000) throw e;
      insertedCount = e.result?.nInserted ?? fees.length - (e.writeErrors?.length ?? 0);
    }

    return {
      attempted: fees.length,
      inserted: insertedCount,
      skipped: fees.length - insertedCount,
      note: "Las cuotas ya existentes fueron ignoradas (idempotente)",
    };
  }

  // ─── Cuentas por cobrar ────────────────────────────────────────────────────

  async getOverdue(tenantId: string) {
    const tenantObjId = this.toObjectId(tenantId);

    // Pipeline único: agrupa cuotas vencidas por alumno y hace $lookup de student y classroom
    return this.tuitionModel.aggregate([
      { $match: { tenantId: tenantObjId, status: "overdue", isDeleted: { $ne: true } } },
      {
        $group: {
          _id: "$studentId",
          classroomId: { $first: "$classroomId" },
          overdueCount: { $sum: 1 },
          totalDebt: { $sum: "$amount" },
          currency: { $first: "$currency" },
          oldestDueDate: { $min: "$dueDate" },
        },
      },
      {
        $lookup: {
          from: "edustudents",
          localField: "_id",
          foreignField: "_id",
          as: "studentData",
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }],
        },
      },
      {
        $lookup: {
          from: "educlassrooms",
          localField: "classroomId",
          foreignField: "_id",
          as: "classroomData",
          pipeline: [{ $project: { name: 1, grade: 1, section: 1 } }],
        },
      },
      {
        $project: {
          studentId: "$_id",
          _id: 0,
          firstName: { $ifNull: [{ $arrayElemAt: ["$studentData.firstName", 0] }, "N/A"] },
          lastName: { $ifNull: [{ $arrayElemAt: ["$studentData.lastName", 0] }, "N/A"] },
          classroomId: 1,
          classroomName: {
            $let: {
              vars: { cls: { $arrayElemAt: ["$classroomData", 0] } },
              in: {
                $ifNull: [
                  {
                    $concat: [
                      "$$cls.grade", " ", "$$cls.section", " — ", "$$cls.name",
                    ],
                  },
                  "Sin salón",
                ],
              },
            },
          },
          overdueCount: 1,
          totalDebt: 1,
          currency: 1,
          oldestDueDate: 1,
        },
      },
      { $sort: { totalDebt: -1 } },
    ]);
  }

  // ─── Acciones sobre cuotas ────────────────────────────────────────────────

  async payManual(id: string, tenantId: string, dto: PayTuitionDto, userId: string) {
    const fee = await this.findOne(id, tenantId);
    if (fee.status === "paid") {
      throw new ConflictException("Esta cuota ya fue pagada");
    }
    if (fee.status === "waived") {
      throw new ConflictException("Esta cuota fue exonerada y no puede marcarse como pagada");
    }

    // Generamos un ObjectId como referencia del pago; el módulo de payments
    // actualiza este campo vía tuition-payment.listener cuando emite payment.confirmed
    const paymentRef = new Types.ObjectId();

    await this.tuitionModel.updateOne(
      { _id: fee._id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } },
      { $set: { status: "paid", paymentId: paymentRef } },
    );

    return {
      success: true,
      message: "Pago registrado exitosamente",
      paymentId: paymentRef,
      method: dto.method,
      reference: dto.reference,
      amount: dto.amount,
    };
  }

  async waive(id: string, tenantId: string) {
    const result = await this.tuitionModel.updateOne(
      {
        _id: id,
        tenantId: this.toObjectId(tenantId),
        status: { $in: ["pending", "overdue"] },
        isDeleted: { $ne: true },
      },
      { $set: { status: "waived" } },
    );
    if (result.modifiedCount === 0) {
      throw new NotFoundException("Cuota no encontrada o ya no puede ser exonerada (pagada/exonerada)");
    }
    return { success: true, message: "Cuota exonerada exitosamente" };
  }

  async notifyManual(id: string, tenantId: string) {
    const fee = await this.tuitionModel
      .findOne({ _id: id, tenantId: this.toObjectId(tenantId), isDeleted: { $ne: true } })
      .lean();
    if (!fee) throw new NotFoundException(`Cuota con ID "${id}" no encontrada`);

    const student = await this.studentModel
      .findOne({ _id: fee.studentId, isDeleted: { $ne: true } })
      .lean();

    if (!student?.guardian?.whatsapp) {
      throw new BadRequestException(
        "El alumno no tiene número de WhatsApp registrado para su representante",
      );
    }

    // El scheduler maneja el envío real vía @OnEvent('edu.tuition.notify')
    this.eventEmitter.emit("edu.tuition.notify", {
      tenantId,
      feeId: id,
      phone: student.guardian.whatsapp.replace(/\D/g, ""),
      guardianName: student.guardian.name,
      studentName: `${student.firstName} ${student.lastName}`,
      description: fee.description,
      amount: fee.amount,
      currency: fee.currency,
      dueDate: fee.dueDate,
    });

    await this.tuitionModel.updateOne(
      { _id: fee._id },
      { $inc: { notificationsCount: 1 }, $set: { lastNotifiedAt: new Date() } },
    );

    return { success: true, message: "Recordatorio enviado exitosamente" };
  }
}
