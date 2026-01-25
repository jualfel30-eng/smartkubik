import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";

import {
  BonusRecord,
  BonusRecordDocument,
} from "../../../schemas/bonus-record.schema";
import {
  GoalProgress,
  GoalProgressDocument,
} from "../../../schemas/goal-progress.schema";
import {
  SalesGoal,
  SalesGoalDocument,
} from "../../../schemas/sales-goal.schema";
import { User, UserDocument } from "../../../schemas/user.schema";

import {
  CreateManualBonusDto,
  BonusFilterDto,
  EmployeeBonusSummaryResponse,
} from "../../../dto/commissions.dto";

import { COMMISSION_ACCOUNT_CODES } from "../../../config/commission-system-accounts.config";

@Injectable()
export class BonusService {
  private readonly logger = new Logger(BonusService.name);

  constructor(
    @InjectModel(BonusRecord.name)
    private bonusRecordModel: Model<BonusRecordDocument>,
    @InjectModel(GoalProgress.name)
    private goalProgressModel: Model<GoalProgressDocument>,
    @InjectModel(SalesGoal.name)
    private salesGoalModel: Model<SalesGoalDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
  ) { }

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL ACHIEVEMENT BONUS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Otorgar bono por logro de meta
   * Este método es llamado automáticamente cuando un empleado alcanza una meta
   */
  async awardGoalBonus(
    goalProgressId: string,
    tenantId: string,
    userId?: string,
  ): Promise<BonusRecord> {
    const goalProgress = await this.goalProgressModel.findOne({
      _id: new Types.ObjectId(goalProgressId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!goalProgress) {
      throw new NotFoundException(`Goal progress ${goalProgressId} not found`);
    }

    // Verificar que el progreso califica para bono
    if (!goalProgress.bonusEligible) {
      throw new BadRequestException(
        `Goal progress ${goalProgressId} is not eligible for bonus`,
      );
    }

    // Verificar que no se haya otorgado ya un bono
    if (goalProgress.bonusAwarded) {
      throw new ConflictException(
        `Bonus already awarded for goal progress ${goalProgressId}`,
      );
    }

    // Verificar que no exista un bono previo para este progreso
    const existingBonus = await this.bonusRecordModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      sourceGoalProgressId: new Types.ObjectId(goalProgressId),
      type: "goal_achievement",
      status: { $nin: ["cancelled", "rejected"] },
    });

    if (existingBonus) {
      throw new ConflictException(
        `Bonus already exists for goal progress ${goalProgressId}`,
      );
    }

    // Obtener la meta original para información
    const goal = await this.salesGoalModel.findById(goalProgress.goalId);

    // Crear el registro de bono
    const bonus = await this.bonusRecordModel.create({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: goalProgress.employeeId,
      type: "goal_achievement",
      sourceGoalId: goalProgress.goalId,
      sourceGoalProgressId: goalProgress._id,
      sourceGoalName: goalProgress.goalSnapshot.name,
      amount: goalProgress.bonusAmount,
      currency: goal?.currency || "USD",
      description: `Bono por alcanzar meta "${goalProgress.goalSnapshot.name}" - ${goalProgress.periodLabel}`,
      internalNotes: `Logro: ${goalProgress.percentageComplete.toFixed(1)}% | Tier: ${goalProgress.bonusTierLabel || "Base"}`,
      periodStart: goalProgress.periodStart,
      periodEnd: goalProgress.periodEnd,
      periodLabel: goalProgress.periodLabel,
      status: "pending",
      isTaxable: true,
      createdBy: userId
        ? new Types.ObjectId(userId)
        : goalProgress.employeeId,
    });

    // Actualizar el goal progress
    await this.goalProgressModel.updateOne(
      { _id: goalProgress._id },
      {
        $set: {
          bonusAwarded: true,
          bonusRecordId: bonus._id,
          status: "bonus_pending",
        },
      },
    );

    // Emitir evento
    this.eventEmitter.emit("bonus.created", {
      bonusId: bonus._id.toString(),
      tenantId,
      employeeId: goalProgress.employeeId.toString(),
      type: "goal_achievement",
      amount: bonus.amount,
      goalId: goalProgress.goalId.toString(),
    });

    this.logger.log(
      `Goal achievement bonus created: $${bonus.amount} for employee ${goalProgress.employeeId} (Goal: ${goalProgress.goalSnapshot.name})`,
    );

    return bonus;
  }

  /**
   * Calcular monto de bono basado en logro
   * Este método determina el monto del bono según el tipo de bonificación de la meta
   */
  calculateBonusAmount(
    goal: SalesGoal,
    achievementPercentage: number,
    currentValue: number,
  ): { amount: number; tierLabel?: string } {
    // Verificar mínimo requerido
    if (achievementPercentage < goal.minAchievementForBonus) {
      return { amount: 0 };
    }

    switch (goal.bonusType) {
      case "fixed":
        // Bono fijo si alcanza la meta
        if (goal.bonusProRated) {
          // Proporcional al logro
          return {
            amount: (goal.bonusAmount * achievementPercentage) / 100,
            tierLabel: "Proporcional",
          };
        }
        return { amount: goal.bonusAmount, tierLabel: "Meta" };

      case "percentage":
        // Porcentaje del valor de la meta
        const percentageBonus =
          (goal.targetValue * goal.bonusPercentage) / 100;
        if (goal.bonusProRated) {
          return {
            amount: (percentageBonus * achievementPercentage) / 100,
            tierLabel: "Proporcional",
          };
        }
        return { amount: percentageBonus, tierLabel: "Meta" };

      case "tiered":
        // Bonos escalonados
        if (!goal.bonusTiers || goal.bonusTiers.length === 0) {
          return { amount: 0 };
        }

        // Ordenar tiers por porcentaje descendente
        const sortedTiers = [...goal.bonusTiers].sort(
          (a, b) => b.achievementPercentage - a.achievementPercentage,
        );

        // Encontrar el tier aplicable (el más alto que haya alcanzado)
        for (const tier of sortedTiers) {
          if (achievementPercentage >= tier.achievementPercentage) {
            return {
              amount: tier.bonusAmount,
              tierLabel: tier.label || `${tier.achievementPercentage}%`,
            };
          }
        }
        return { amount: 0 };

      case "none":
      default:
        return { amount: 0 };
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MANUAL BONUS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Crear bono manual
   * Para bonos especiales, retención, performance, etc.
   */
  async createManualBonus(
    dto: CreateManualBonusDto,
    tenantId: string,
    userId: string,
  ): Promise<BonusRecord> {
    // Verificar que el empleado existe
    const employee = await this.userModel.findOne({
      _id: new Types.ObjectId(dto.employeeId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`);
    }

    const bonus = await this.bonusRecordModel.create({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(dto.employeeId),
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency || "USD",
      description: dto.description,
      internalNotes: dto.internalNotes,
      periodStart: dto.periodStart ? new Date(dto.periodStart) : undefined,
      periodEnd: dto.periodEnd ? new Date(dto.periodEnd) : undefined,
      periodLabel: dto.periodLabel,
      status: "pending",
      isTaxable: dto.isTaxable !== false, // Default true
      createdBy: new Types.ObjectId(userId),
    });

    // Emitir evento
    this.eventEmitter.emit("bonus.created", {
      bonusId: bonus._id.toString(),
      tenantId,
      employeeId: dto.employeeId,
      type: dto.type,
      amount: dto.amount,
    });

    this.logger.log(
      `Manual bonus created: $${dto.amount} (${dto.type}) for employee ${dto.employeeId}`,
    );

    return bonus;
  }

  /**
   * Actualizar bono manual (solo si está en estado pending)
   */
  async updateManualBonus(
    bonusId: string,
    updates: Partial<CreateManualBonusDto>,
    tenantId: string,
    userId: string,
  ): Promise<BonusRecord> {
    const bonus = await this.bonusRecordModel.findOne({
      _id: new Types.ObjectId(bonusId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!bonus) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    if (bonus.status !== "pending") {
      throw new BadRequestException(
        `Cannot update bonus in status '${bonus.status}'`,
      );
    }

    // No permitir actualizar bonos de metas
    if (bonus.type === "goal_achievement") {
      throw new BadRequestException("Cannot manually update goal achievement bonuses");
    }

    const updateData: any = {};
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.description) updateData.description = updates.description;
    if (updates.internalNotes !== undefined)
      updateData.internalNotes = updates.internalNotes;
    if (updates.periodStart)
      updateData.periodStart = new Date(updates.periodStart);
    if (updates.periodEnd) updateData.periodEnd = new Date(updates.periodEnd);
    if (updates.periodLabel) updateData.periodLabel = updates.periodLabel;
    if (updates.isTaxable !== undefined) updateData.isTaxable = updates.isTaxable;

    updateData.updatedBy = new Types.ObjectId(userId);

    const updated = await this.bonusRecordModel.findByIdAndUpdate(
      bonusId,
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    this.logger.log(`Bonus ${bonusId} updated by ${userId}`);

    return updated;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BONUS APPROVAL WORKFLOW
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Aprobar bono
   */
  async approveBonus(
    bonusId: string,
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<BonusRecord> {
    const existingBonus = await this.bonusRecordModel.findOne({
      _id: new Types.ObjectId(bonusId),
      tenantId: new Types.ObjectId(tenantId),
      status: "pending",
    });

    if (!existingBonus) {
      throw new NotFoundException(
        `Bonus ${bonusId} not found or not in pending status`,
      );
    }

    const bonus = await this.bonusRecordModel.findByIdAndUpdate(
      bonusId,
      {
        $set: {
          status: "approved",
          approvedBy: new Types.ObjectId(userId),
          approvedAt: new Date(),
          internalNotes: notes
            ? `${notes}${existingBonus.internalNotes ? ` | ${existingBonus.internalNotes}` : ""}`
            : existingBonus.internalNotes,
        },
      },
      { new: true },
    );

    if (!bonus) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }



    // Si es un bono de meta, actualizar el goal progress
    if (bonus.sourceGoalProgressId) {
      await this.goalProgressModel.updateOne(
        { _id: bonus.sourceGoalProgressId },
        { $set: { status: "bonus_awarded" } },
      );
    }

    // Emitir evento para crear asiento contable
    this.eventEmitter.emit("bonus.approved", {
      bonusId: bonus._id.toString(),
      tenantId,
      employeeId: bonus.employeeId.toString(),
      amount: bonus.amount,
      type: bonus.type,
    });

    this.logger.log(`Bonus ${bonusId} approved by ${userId}`);

    return bonus;
  }

  /**
   * Rechazar bono
   */
  async rejectBonus(
    bonusId: string,
    reason: string,
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<BonusRecord> {
    const existingBonus = await this.bonusRecordModel.findOne({
      _id: new Types.ObjectId(bonusId),
      tenantId: new Types.ObjectId(tenantId),
      status: "pending",
    });

    if (!existingBonus) {
      throw new NotFoundException(
        `Bonus ${bonusId} not found or not in pending status`,
      );
    }

    const bonus = await this.bonusRecordModel.findByIdAndUpdate(
      bonusId,
      {
        $set: {
          status: "rejected",
          rejectedBy: new Types.ObjectId(userId),
          rejectedAt: new Date(),
          rejectionReason: reason,
          internalNotes: notes
            ? `${notes}${existingBonus.internalNotes ? ` | ${existingBonus.internalNotes}` : ""}`
            : existingBonus.internalNotes,
        },
      },
      { new: true },
    );

    if (!bonus) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }



    // Si es un bono de meta, actualizar el goal progress
    if (bonus.sourceGoalProgressId) {
      await this.goalProgressModel.updateOne(
        { _id: bonus.sourceGoalProgressId },
        {
          $set: {
            bonusAwarded: false,
            bonusRecordId: null,
            status: "achieved", // Vuelve a achieved sin bono
          },
        },
      );
    }

    this.logger.log(`Bonus ${bonusId} rejected by ${userId}: ${reason}`);

    return bonus;
  }

  /**
   * Cancelar bono aprobado (antes de ser pagado)
   */
  async cancelBonus(
    bonusId: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<BonusRecord> {
    const bonus = await this.bonusRecordModel.findOne({
      _id: new Types.ObjectId(bonusId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!bonus) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    if (bonus.status === "paid") {
      throw new BadRequestException("Cannot cancel a paid bonus");
    }

    if (bonus.status === "cancelled") {
      throw new BadRequestException("Bonus is already cancelled");
    }

    const updated = await this.bonusRecordModel.findByIdAndUpdate(
      bonusId,
      {
        $set: {
          status: "cancelled",
          cancelledBy: new Types.ObjectId(userId),
          cancelledAt: new Date(),
          cancellationReason: reason,
        },
      },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    if (!updated) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    // Si es un bono de meta, actualizar el goal progress
    if (bonus.sourceGoalProgressId) {
      await this.goalProgressModel.updateOne(
        { _id: bonus.sourceGoalProgressId },
        {
          $set: {
            bonusAwarded: false,
            bonusRecordId: null,
            status: bonus.status === "pending" ? "achieved" : "bonus_pending",
          },
        },
      );
    }

    // Emitir evento para reversar asiento contable si existía
    if (updated.journalEntryCreated) {
      this.eventEmitter.emit("bonus.cancelled", {
        bonusId: updated._id.toString(),
        tenantId,
        journalEntryId: updated.journalEntryId?.toString(),
      });
    }

    this.logger.log(`Bonus ${bonusId} cancelled by ${userId}: ${reason}`);

    return updated;
  }

  /**
   * Aprobar múltiples bonos
   */
  async bulkApproveBonuses(
    bonusIds: string[],
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const bonusId of bonusIds) {
      try {
        await this.approveBonus(bonusId, tenantId, userId, notes);
        approved++;
      } catch (error) {
        this.logger.warn(`Failed to approve bonus ${bonusId}: ${error.message}`);
        failed++;
      }
    }

    return { approved, failed };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // PAYROLL INTEGRATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener bonos aprobados pendientes de pago para un empleado
   */
  async getApprovedBonuses(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<{ total: number; bonusIds: string[]; bonuses: BonusRecord[] }> {
    const bonuses = await this.bonusRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      status: "approved",
      approvedAt: { $gte: periodStart, $lte: periodEnd },
      payrollRunId: null,
    });

    const total = bonuses.reduce((sum, b) => sum + b.amount, 0);
    const bonusIds = bonuses.map((b) => b._id.toString());

    return { total, bonusIds, bonuses };
  }

  /**
   * Obtener todos los bonos aprobados pendientes de pago
   */
  async getAllApprovedBonusesForPayroll(
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<
    Array<{
      employeeId: string;
      employeeName: string;
      totalBonuses: number;
      bonusCount: number;
      bonuses: BonusRecord[];
    }>
  > {
    const bonuses = await this.bonusRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      status: "approved",
      approvedAt: { $gte: periodStart, $lte: periodEnd },
      payrollRunId: null,
    });

    // Agrupar por empleado
    const byEmployee = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalBonuses: number;
        bonusCount: number;
        bonuses: BonusRecord[];
      }
    >();

    for (const bonus of bonuses) {
      const empId = bonus.employeeId.toString();

      if (!byEmployee.has(empId)) {
        // Obtener nombre del empleado
        const employee = await this.userModel
          .findById(bonus.employeeId)
          .select("firstName lastName");

        byEmployee.set(empId, {
          employeeId: empId,
          employeeName: employee
            ? `${employee.firstName} ${employee.lastName}`
            : "Unknown",
          totalBonuses: 0,
          bonusCount: 0,
          bonuses: [],
        });
      }

      const empData = byEmployee.get(empId)!;
      empData.totalBonuses += bonus.amount;
      empData.bonusCount++;
      empData.bonuses.push(bonus);
    }

    return Array.from(byEmployee.values());
  }

  /**
   * Marcar bonos como pagados
   */
  async markAsPaid(
    bonusIds: string[],
    payrollRunId: string,
    payrollPeriodLabel: string,
    tenantId: string,
  ): Promise<number> {
    const result = await this.bonusRecordModel.updateMany(
      {
        _id: { $in: bonusIds.map((id) => new Types.ObjectId(id)) },
        tenantId: new Types.ObjectId(tenantId),
        status: "approved",
      },
      {
        $set: {
          status: "paid",
          payrollRunId: new Types.ObjectId(payrollRunId),
          paidAt: new Date(),
          payrollPeriodLabel,
        },
      },
    );

    // Actualizar goal progress para bonos de metas pagados
    const paidBonuses = await this.bonusRecordModel.find({
      _id: { $in: bonusIds.map((id) => new Types.ObjectId(id)) },
      sourceGoalProgressId: { $ne: null },
    });

    for (const bonus of paidBonuses) {
      if (bonus.sourceGoalProgressId) {
        await this.goalProgressModel.updateOne(
          { _id: bonus.sourceGoalProgressId },
          { $set: { status: "bonus_paid" } },
        );
      }
    }

    this.logger.log(
      `${result.modifiedCount} bonuses marked as paid in payroll ${payrollRunId}`,
    );

    return result.modifiedCount;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // BONUS QUERIES
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener bonos con filtros
   */
  async getBonuses(
    filters: BonusFilterDto,
    tenantId: string,
  ): Promise<{ bonuses: BonusRecord[]; total: number; pages: number }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters.employeeId) {
      query.employeeId = new Types.ObjectId(filters.employeeId);
    }
    if (filters.type) {
      query.type = filters.type;
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [bonuses, total] = await Promise.all([
      this.bonusRecordModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("employeeId", "firstName lastName email")
        .populate("approvedBy", "firstName lastName")
        .populate("createdBy", "firstName lastName"),
      this.bonusRecordModel.countDocuments(query),
    ]);

    return {
      bonuses,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener bono por ID
   */
  async getBonusById(bonusId: string, tenantId: string): Promise<BonusRecord> {
    const bonus = await this.bonusRecordModel
      .findOne({
        _id: new Types.ObjectId(bonusId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate("employeeId", "firstName lastName email")
      .populate("approvedBy", "firstName lastName")
      .populate("rejectedBy", "firstName lastName")
      .populate("cancelledBy", "firstName lastName")
      .populate("createdBy", "firstName lastName");

    if (!bonus) {
      throw new NotFoundException(`Bonus ${bonusId} not found`);
    }

    return bonus;
  }

  /**
   * Obtener bonos pendientes de aprobación
   */
  async getPendingBonuses(tenantId: string): Promise<BonusRecord[]> {
    return this.bonusRecordModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: "pending",
      })
      .sort({ createdAt: -1 })
      .populate("employeeId", "firstName lastName")
      .populate("createdBy", "firstName lastName")
      .limit(100);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener resumen de bonos por empleado
   */
  async getEmployeeBonusSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<EmployeeBonusSummaryResponse> {
    const employee = await this.userModel
      .findById(employeeId)
      .select("firstName lastName");

    const bonuses = await this.bonusRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      createdAt: { $gte: startDate, $lte: endDate },
    });

    const summary = {
      totalBonuses: 0,
      totalPending: 0,
      totalApproved: 0,
      totalPaid: 0,
      byType: {} as Record<string, number>,
    };

    for (const bonus of bonuses) {
      summary.totalBonuses += bonus.amount;

      switch (bonus.status) {
        case "pending":
          summary.totalPending += bonus.amount;
          break;
        case "approved":
          summary.totalApproved += bonus.amount;
          break;
        case "paid":
          summary.totalPaid += bonus.amount;
          break;
      }

      // Por tipo
      if (!summary.byType[bonus.type]) {
        summary.byType[bonus.type] = 0;
      }
      summary.byType[bonus.type] += bonus.amount;
    }

    return {
      employeeId,
      employeeName: employee
        ? `${employee.firstName} ${employee.lastName}`
        : "Unknown",
      period: { start: startDate, end: endDate },
      summary,
      bonuses: bonuses.map((b) => ({
        bonusId: b._id.toString(),
        type: b.type,
        amount: b.amount,
        description: b.description,
        status: b.status,
        createdAt: b["createdAt"],
        paidAt: b.paidAt,
      })),
    };
  }

  /**
   * Obtener resumen consolidado de bonos
   */
  async getBonusesSummary(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<{
    period: { start: Date; end: Date };
    summary: {
      totalBonuses: number;
      totalPending: number;
      totalApproved: number;
      totalPaid: number;
      totalRejected: number;
      totalCancelled: number;
      employeesWithBonuses: number;
      bonusCount: number;
      averageBonus: number;
    };
    byType: Array<{
      type: string;
      total: number;
      count: number;
    }>;
    byEmployee: Array<{
      employeeId: string;
      employeeName: string;
      totalBonuses: number;
      bonusCount: number;
    }>;
  }> {
    const bonuses = await this.bonusRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      createdAt: { $gte: startDate, $lte: endDate },
    });

    let totalPending = 0;
    let totalApproved = 0;
    let totalPaid = 0;
    let totalRejected = 0;
    let totalCancelled = 0;

    const byType = new Map<string, { total: number; count: number }>();
    const byEmployee = new Map<
      string,
      { employeeId: string; totalBonuses: number; bonusCount: number }
    >();

    for (const bonus of bonuses) {
      // Por estado
      switch (bonus.status) {
        case "pending":
          totalPending += bonus.amount;
          break;
        case "approved":
          totalApproved += bonus.amount;
          break;
        case "paid":
          totalPaid += bonus.amount;
          break;
        case "rejected":
          totalRejected += bonus.amount;
          break;
        case "cancelled":
          totalCancelled += bonus.amount;
          break;
      }

      // Por tipo
      if (!byType.has(bonus.type)) {
        byType.set(bonus.type, { total: 0, count: 0 });
      }
      const typeData = byType.get(bonus.type)!;
      typeData.total += bonus.amount;
      typeData.count++;

      // Por empleado
      const empId = bonus.employeeId.toString();
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, {
          employeeId: empId,
          totalBonuses: 0,
          bonusCount: 0,
        });
      }
      const empData = byEmployee.get(empId)!;
      empData.totalBonuses += bonus.amount;
      empData.bonusCount++;
    }

    const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);

    // Obtener nombres de empleados
    const employeeIds = Array.from(byEmployee.keys());
    const employees = await this.userModel
      .find({ _id: { $in: employeeIds.map((id) => new Types.ObjectId(id)) } })
      .select("firstName lastName");

    const employeeNames = new Map(
      employees.map((e) => [e._id.toString(), `${e.firstName} ${e.lastName}`]),
    );

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalBonuses,
        totalPending,
        totalApproved,
        totalPaid,
        totalRejected,
        totalCancelled,
        employeesWithBonuses: byEmployee.size,
        bonusCount: bonuses.length,
        averageBonus: bonuses.length > 0 ? totalBonuses / bonuses.length : 0,
      },
      byType: Array.from(byType.entries()).map(([type, data]) => ({
        type,
        ...data,
      })),
      byEmployee: Array.from(byEmployee.values()).map((e) => ({
        ...e,
        employeeName: employeeNames.get(e.employeeId) || "Unknown",
      })),
    };
  }

  /**
   * Obtener estadísticas de bonos de metas
   */
  async getGoalBonusStats(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<{
    totalGoalBonuses: number;
    goalsWithBonuses: number;
    averageBonus: number;
    byGoal: Array<{
      goalId: string;
      goalName: string;
      totalBonuses: number;
      employeesRewarded: number;
    }>;
  }> {
    const bonuses = await this.bonusRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      type: "goal_achievement",
      createdAt: { $gte: startDate, $lte: endDate },
      status: { $nin: ["rejected", "cancelled"] },
    });

    const byGoal = new Map<
      string,
      {
        goalId: string;
        goalName: string;
        totalBonuses: number;
        employeesSet: Set<string>;
      }
    >();

    for (const bonus of bonuses) {
      const goalId = bonus.sourceGoalId?.toString() || "unknown";

      if (!byGoal.has(goalId)) {
        byGoal.set(goalId, {
          goalId,
          goalName: bonus.sourceGoalName || "Unknown Goal",
          totalBonuses: 0,
          employeesSet: new Set(),
        });
      }

      const goalData = byGoal.get(goalId)!;
      goalData.totalBonuses += bonus.amount;
      goalData.employeesSet.add(bonus.employeeId.toString());
    }

    const totalBonuses = bonuses.reduce((sum, b) => sum + b.amount, 0);

    return {
      totalGoalBonuses: totalBonuses,
      goalsWithBonuses: byGoal.size,
      averageBonus: bonuses.length > 0 ? totalBonuses / bonuses.length : 0,
      byGoal: Array.from(byGoal.values()).map((g) => ({
        goalId: g.goalId,
        goalName: g.goalName,
        totalBonuses: g.totalBonuses,
        employeesRewarded: g.employeesSet.size,
      })),
    };
  }
}
