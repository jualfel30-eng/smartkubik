import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import {
  QualityControlPlan,
  QualityControlPlanDocument,
} from "../../schemas/quality-control-plan.schema";
import {
  QualityInspection,
  QualityInspectionDocument,
  NonConformance,
  NonConformanceDocument,
} from "../../schemas/quality-inspection.schema";

@Injectable()
export class QualityControlService {
  constructor(
    @InjectModel(QualityControlPlan.name)
    private readonly qcPlanModel: Model<QualityControlPlanDocument>,
    @InjectModel(QualityInspection.name)
    private readonly inspectionModel: Model<QualityInspectionDocument>,
    @InjectModel(NonConformance.name)
    private readonly nonConformanceModel: Model<NonConformanceDocument>,
  ) {}

  // ==================== QC PLANS ====================

  async createQCPlan(dto: any, user: any): Promise<QualityControlPlan> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Verificar duplicados
    const existing = await this.qcPlanModel
      .findOne({ planCode: dto.planCode, tenantId })
      .lean()
      .exec();

    if (existing) {
      throw new BadRequestException(
        `Plan de QC con código ${dto.planCode} ya existe`,
      );
    }

    const qcPlan = new this.qcPlanModel({
      ...dto,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return qcPlan.save();
  }

  async findAllQCPlans(query: any, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, isActive, inspectionStage } = query;

    const filter: any = { tenantId };
    if (isActive !== undefined) filter.isActive = isActive;
    if (inspectionStage) filter.inspectionStages = inspectionStage;

    const [data, total] = await Promise.all([
      this.qcPlanModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.qcPlanModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneQCPlan(id: string, user: any): Promise<QualityControlPlan> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const qcPlan = await this.qcPlanModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("applicableProducts", "name sku")
      .lean()
      .exec();

    if (!qcPlan) {
      throw new NotFoundException("Plan de QC no encontrado");
    }

    return qcPlan;
  }

  async updateQCPlan(id: string, dto: any, user: any): Promise<QualityControlPlan> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updated = await this.qcPlanModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: { ...dto, updatedBy: new Types.ObjectId(user._id) } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Plan de QC no encontrado");
    }

    return updated;
  }

  async deleteQCPlan(id: string, user: any): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.qcPlanModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Plan de QC no encontrado");
    }
  }

  async getQCPlansForProduct(productId: string, user: any): Promise<QualityControlPlan[]> {
    const tenantId = new Types.ObjectId(user.tenantId);

    return this.qcPlanModel
      .find({
        tenantId,
        isActive: true,
        applicableProducts: new Types.ObjectId(productId),
      })
      .lean()
      .exec();
  }

  // ==================== INSPECTIONS ====================

  async createInspection(dto: any, user: any): Promise<QualityInspection> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Generar inspection number
    const count = await this.inspectionModel.countDocuments({ tenantId });
    const inspectionNumber = `INS-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    // Obtener plan de QC
    const qcPlan = await this.findOneQCPlan(dto.qcPlanId, user);

    const inspection = new this.inspectionModel({
      ...dto,
      inspectionNumber,
      qcPlanName: qcPlan.name,
      totalCheckpoints: qcPlan.checkpoints.length,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return inspection.save();
  }

  async findAllInspections(query: any, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, status, inspectionType, productId, lotNumber } = query;

    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (inspectionType) filter.inspectionType = inspectionType;
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (lotNumber) filter.lotNumber = lotNumber;

    const [data, total] = await Promise.all([
      this.inspectionModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ inspectionDate: -1 })
        .populate("qcPlanId", "planCode name")
        .populate("productId", "name sku")
        .populate("inspector", "firstName lastName email")
        .lean()
        .exec(),
      this.inspectionModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOneInspection(id: string, user: any): Promise<QualityInspection> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const inspection = await this.inspectionModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("qcPlanId")
      .populate("productId")
      .populate("inspector", "firstName lastName email")
      .populate("nonConformances")
      .lean()
      .exec();

    if (!inspection) {
      throw new NotFoundException("Inspección no encontrada");
    }

    return inspection;
  }

  async recordInspectionResult(
    inspectionId: string,
    results: any[],
    user: any,
  ): Promise<QualityInspection> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Calcular resultados
    const passedCheckpoints = results.filter(r => r.passed).length;
    const failedCheckpoints = results.filter(r => !r.passed).length;
    const overallResult = failedCheckpoints === 0;

    const updated = await this.inspectionModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(inspectionId), tenantId },
        {
          $set: {
            results,
            passedCheckpoints,
            failedCheckpoints,
            overallResult,
            status: "completed",
            completedAt: new Date(),
            updatedBy: new Types.ObjectId(user._id),
          },
        },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Inspección no encontrada");
    }

    // Si hubo fallas críticas, crear no conformidades automáticamente
    if (!overallResult) {
      const failedResults = results.filter(r => !r.passed);
      for (const result of failedResults) {
        await this.createNonConformance(
          {
            inspectionId,
            type: "quality_defect",
            severity: "major",
            description: `Falla en checkpoint: ${result.checkpointName}. Valor medido: ${result.measuredValue}, Valor esperado: ${result.expectedValue}`,
            productId: updated.productId,
            productName: updated.productName,
            lotNumber: updated.lotNumber,
            affectedQuantity: updated.quantity,
            unit: updated.unit,
          },
          user,
        );
      }
    }

    return updated;
  }

  // ==================== NON-CONFORMANCES ====================

  async createNonConformance(dto: any, user: any): Promise<NonConformance> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Generar NC number
    const count = await this.nonConformanceModel.countDocuments({ tenantId });
    const ncNumber = `NC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;

    const nc = new this.nonConformanceModel({
      ...dto,
      ncNumber,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    const saved = await nc.save();

    // Actualizar inspección si aplica
    if (dto.inspectionId) {
      await this.inspectionModel
        .findOneAndUpdate(
          { _id: new Types.ObjectId(dto.inspectionId), tenantId },
          { $push: { nonConformances: saved._id } },
        )
        .exec();
    }

    return saved;
  }

  async findAllNonConformances(query: any, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, status, severity, productId } = query;

    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (productId) filter.productId = new Types.ObjectId(productId);

    const [data, total] = await Promise.all([
      this.nonConformanceModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .populate("inspectionId", "inspectionNumber")
        .populate("productId", "name sku")
        .populate("responsibleUserId", "firstName lastName email")
        .lean()
        .exec(),
      this.nonConformanceModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateNonConformance(id: string, dto: any, user: any): Promise<NonConformance> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updated = await this.nonConformanceModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: { ...dto, updatedBy: new Types.ObjectId(user._id) } },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("No Conformidad no encontrada");
    }

    return updated;
  }

  // ==================== CERTIFICATE OF ANALYSIS (CoA) ====================

  async generateCoA(lotNumber: string, user: any): Promise<any> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Obtener todas las inspecciones del lote
    const inspections = await this.inspectionModel
      .find({ tenantId, lotNumber, overallResult: true })
      .populate("qcPlanId")
      .populate("productId")
      .sort({ inspectionDate: -1 })
      .lean()
      .exec();

    if (inspections.length === 0) {
      throw new NotFoundException(
        `No se encontraron inspecciones aprobadas para el lote ${lotNumber}`,
      );
    }

    // TODO: Generar PDF del CoA
    // Por ahora retornamos los datos estructurados

    return {
      lotNumber,
      productName: inspections[0].productName,
      productSku: inspections[0].productSku,
      quantity: inspections[0].quantity,
      unit: inspections[0].unit,
      inspections: inspections.map(insp => ({
        inspectionNumber: insp.inspectionNumber,
        inspectionType: insp.inspectionType,
        inspectionDate: insp.inspectionDate,
        inspector: insp.inspectorName,
        results: insp.results,
        overallResult: insp.overallResult,
      })),
      generatedAt: new Date(),
      generatedBy: user.email,
    };
  }
}
