import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { SalesGoal, SalesGoalDocument } from "../../../schemas/sales-goal.schema";
import {
  GoalProgress,
  GoalProgressDocument,
} from "../../../schemas/goal-progress.schema";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { User, UserDocument } from "../../../schemas/user.schema";
import { Role, RoleDocument } from "../../../schemas/role.schema";

import {
  CreateSalesGoalDto,
  UpdateSalesGoalDto,
  SalesGoalFilterDto,
  GoalProgressFilterDto,
  GoalsDashboardResponse,
} from "../../../dto/commissions.dto";

@Injectable()
export class GoalService {
  private readonly logger = new Logger(GoalService.name);

  constructor(
    @InjectModel(SalesGoal.name)
    private salesGoalModel: Model<SalesGoalDocument>,
    @InjectModel(GoalProgress.name)
    private goalProgressModel: Model<GoalProgressDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,
    private eventEmitter: EventEmitter2,
  ) { }

  // ════════════════════════════════════════════════════════════════════════════
  // SALES GOALS CRUD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Crear meta de ventas
   */
  async createGoal(
    dto: CreateSalesGoalDto,
    tenantId: string,
    userId?: string,
  ): Promise<SalesGoal> {
    const goal = await this.salesGoalModel.create({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      employeeIds: dto.employeeIds?.map((id) => new Types.ObjectId(id)),
      roleIds: dto.roleIds?.map((id) => new Types.ObjectId(id)),
      teamId: dto.teamId ? new Types.ObjectId(dto.teamId) : undefined,
      applicableProducts: dto.applicableProducts?.map(
        (id) => new Types.ObjectId(id),
      ),
      customPeriodStart: dto.customPeriodStart
        ? new Date(dto.customPeriodStart)
        : undefined,
      customPeriodEnd: dto.customPeriodEnd
        ? new Date(dto.customPeriodEnd)
        : undefined,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      activatedAt: dto.isActive !== false ? new Date() : undefined,
    });

    this.logger.log(`Sales goal created: ${goal.name} (${goal._id})`);

    // Inicializar progreso para empleados aplicables si la meta está activa
    if (goal.isActive) {
      await this.initializeProgressForGoalInternal(goal, tenantId);
    }

    return goal;
  }

  /**
   * Actualizar meta de ventas
   */
  async updateGoal(
    goalId: string,
    dto: UpdateSalesGoalDto,
    tenantId: string,
    userId?: string,
  ): Promise<SalesGoal> {
    const goal = await this.salesGoalModel.findOne({
      _id: new Types.ObjectId(goalId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!goal) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    const updateData: any = { ...dto };
    if (dto.employeeIds) {
      updateData.employeeIds = dto.employeeIds.map((id) => new Types.ObjectId(id));
    }
    if (dto.roleIds) {
      updateData.roleIds = dto.roleIds.map((id) => new Types.ObjectId(id));
    }
    if (dto.teamId) {
      updateData.teamId = new Types.ObjectId(dto.teamId);
    }
    if (dto.applicableProducts) {
      updateData.applicableProducts = dto.applicableProducts.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.customPeriodStart) {
      updateData.customPeriodStart = new Date(dto.customPeriodStart);
    }
    if (dto.customPeriodEnd) {
      updateData.customPeriodEnd = new Date(dto.customPeriodEnd);
    }
    if (userId) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    // Si se está activando la meta
    if (dto.isActive === true && !goal.isActive) {
      updateData.activatedAt = new Date();
    }
    // Si se está desactivando
    if (dto.isActive === false && goal.isActive) {
      updateData.deactivatedAt = new Date();
    }

    const updated = await this.salesGoalModel.findByIdAndUpdate(
      goalId,
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    this.logger.log(`Sales goal updated: ${goalId}`);

    return updated;
  }

  /**
   * Obtener todas las metas
   */
  async findAllGoals(
    tenantId: string,
    filters?: SalesGoalFilterDto,
  ): Promise<SalesGoal[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters?.targetType) query.targetType = filters.targetType;
    if (filters?.periodType) query.periodType = filters.periodType;
    if (filters?.applicableTo) query.applicableTo = filters.applicableTo;
    if (filters?.isActive !== undefined) query.isActive = filters.isActive;
    if (filters?.employeeId) {
      query.$or = [
        { applicableTo: "all" },
        { employeeIds: new Types.ObjectId(filters.employeeId) },
      ];
    }
    if (filters?.roleId) {
      query.$or = [
        { applicableTo: "all" },
        { roleIds: new Types.ObjectId(filters.roleId) },
      ];
    }

    return this.salesGoalModel.find(query).sort({ createdAt: -1 });
  }

  /**
   * Obtener meta por ID
   */
  async findGoalById(goalId: string, tenantId: string): Promise<SalesGoal> {
    const goal = await this.salesGoalModel.findOne({
      _id: new Types.ObjectId(goalId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!goal) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    return goal;
  }

  /**
   * Eliminar meta
   */
  async deleteGoal(goalId: string, tenantId: string): Promise<void> {
    const result = await this.salesGoalModel.deleteOne({
      _id: new Types.ObjectId(goalId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    // También eliminar progresos asociados
    await this.goalProgressModel.deleteMany({
      goalId: new Types.ObjectId(goalId),
      tenantId: new Types.ObjectId(tenantId),
    });

    this.logger.log(`Sales goal deleted: ${goalId}`);
  }

  /**
   * Activar meta
   */
  async activateGoal(goalId: string, tenantId: string): Promise<SalesGoal> {
    const goal = await this.salesGoalModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        tenantId: new Types.ObjectId(tenantId),
      },
      {
        $set: {
          isActive: true,
          activatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!goal) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    // Inicializar progreso
    await this.initializeProgressForGoalInternal(goal, tenantId);

    return goal;
  }

  /**
   * Desactivar meta
   */
  async deactivateGoal(goalId: string, tenantId: string): Promise<SalesGoal> {
    const goal = await this.salesGoalModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(goalId),
        tenantId: new Types.ObjectId(tenantId),
      },
      {
        $set: {
          isActive: false,
          deactivatedAt: new Date(),
        },
      },
      { new: true },
    );

    if (!goal) {
      throw new NotFoundException(`Sales goal ${goalId} not found`);
    }

    return goal;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // GOAL PROGRESS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Inicializar progreso para una meta (interno)
   */
  private async initializeProgressForGoalInternal(
    goal: SalesGoal,
    tenantId: string,
  ): Promise<void> {
    const { periodStart, periodEnd, periodLabel } = this.calculatePeriodDates(goal);
    const employees = await this.getApplicableEmployees(goal, tenantId);

    for (const employee of employees) {
      // Verificar si ya existe progreso para este período
      const existing = await this.goalProgressModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        goalId: goal._id,
        employeeId: employee._id,
        periodStart,
      });

      if (existing) continue;

      await this.goalProgressModel.create({
        tenantId: new Types.ObjectId(tenantId),
        goalId: goal._id,
        employeeId: employee._id,
        periodStart,
        periodEnd,
        periodLabel,
        currentValue: 0,
        targetValue: goal.targetValue,
        percentageComplete: 0,
        status: "in_progress",
        goalSnapshot: {
          name: goal.name,
          targetType: goal.targetType,
          targetValue: goal.targetValue,
          bonusType: goal.bonusType,
          bonusAmount: goal.bonusAmount,
          bonusPercentage: goal.bonusPercentage,
          bonusTiers: goal.bonusTiers,
        },
      });
    }

    this.logger.log(
      `Initialized progress for goal ${goal._id} for ${employees.length} employees`,
    );
  }

  /**
   * Calcular fechas del período actual según tipo
   */
  private calculatePeriodDates(goal: SalesGoal): {
    periodStart: Date;
    periodEnd: Date;
    periodLabel: string;
  } {
    const now = new Date();
    let periodStart: Date;
    let periodEnd: Date;
    let periodLabel: string;

    switch (goal.periodType) {
      case "daily":
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 1);
        periodEnd.setMilliseconds(-1);
        periodLabel = periodStart.toISOString().split("T")[0];
        break;

      case "weekly":
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        periodEnd = new Date(periodStart);
        periodEnd.setDate(periodEnd.getDate() + 7);
        periodEnd.setMilliseconds(-1);
        const weekNum = Math.ceil(
          (now.getDate() - now.getDay() + 1) / 7,
        );
        periodLabel = `Semana ${weekNum} - ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
        break;

      case "biweekly":
        const biweekDay = now.getDate() <= 15 ? 1 : 16;
        periodStart = new Date(now.getFullYear(), now.getMonth(), biweekDay);
        periodEnd = new Date(now.getFullYear(), now.getMonth(), biweekDay === 1 ? 16 : 1);
        if (biweekDay === 16) {
          periodEnd.setMonth(periodEnd.getMonth() + 1);
        }
        periodEnd.setMilliseconds(-1);
        periodLabel = `${biweekDay === 1 ? "1ra" : "2da"} Quincena - ${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
        break;

      case "monthly":
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        periodEnd.setMilliseconds(-1);
        periodLabel = `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
        break;

      case "quarterly":
        const quarter = Math.floor(now.getMonth() / 3);
        periodStart = new Date(now.getFullYear(), quarter * 3, 1);
        periodEnd = new Date(now.getFullYear(), (quarter + 1) * 3, 1);
        periodEnd.setMilliseconds(-1);
        periodLabel = `Q${quarter + 1} ${now.getFullYear()}`;
        break;

      case "yearly":
        periodStart = new Date(now.getFullYear(), 0, 1);
        periodEnd = new Date(now.getFullYear() + 1, 0, 1);
        periodEnd.setMilliseconds(-1);
        periodLabel = `${now.getFullYear()}`;
        break;

      case "custom":
        periodStart = goal.customPeriodStart || new Date();
        periodEnd = goal.customPeriodEnd || new Date();
        periodLabel = `${periodStart.toLocaleDateString()} - ${periodEnd.toLocaleDateString()}`;
        break;

      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        periodEnd.setMilliseconds(-1);
        periodLabel = `${now.toLocaleString("default", { month: "long" })} ${now.getFullYear()}`;
    }

    return { periodStart, periodEnd, periodLabel };
  }

  /**
   * Obtener empleados aplicables para una meta
   */
  private async getApplicableEmployees(
    goal: SalesGoal,
    tenantId: string,
  ): Promise<UserDocument[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    };

    switch (goal.applicableTo) {
      case "all":
        // Todos los empleados activos
        break;

      case "individual":
        if (goal.employeeIds?.length > 0) {
          query._id = { $in: goal.employeeIds };
        }
        break;

      case "role":
        if (goal.roleIds?.length > 0) {
          query.role = { $in: goal.roleIds };
        }
        break;

      case "team":
        // TODO: Implementar cuando exista el modelo de Team
        break;
    }

    return this.userModel.find(query).select("_id firstName lastName");
  }

  /**
   * Actualizar progreso de meta después de una venta (llamado desde listener)
   */
  async updateGoalProgressForOrder(
    employeeId: string,
    orderData: {
      orderId: string;
      orderNumber: string;
      amount: number;
      subtotal: number;
      items: Array<{
        productId: string;
        quantity: number;
        price: number;
        category?: string;
      }>;
    },
    tenantId: string,
  ): Promise<GoalProgress[]> {
    // Obtener progresos activos del empleado
    const now = new Date();
    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      status: "in_progress",
      periodStart: { $lte: now },
      periodEnd: { $gte: now },
    });

    const updatedProgresses: GoalProgress[] = [];

    for (const progress of progresses) {
      const goal = await this.salesGoalModel.findById(progress.goalId);
      if (!goal || !goal.isActive) continue;

      // Calcular contribución según tipo de meta
      let contribution = 0;
      switch (goal.targetType) {
        case "amount":
          contribution = orderData.amount;
          break;
        case "units":
          contribution = orderData.items.reduce((sum, item) => sum + item.quantity, 0);
          break;
        case "orders":
          contribution = 1;
          break;
        case "margin":
          // Margin requires cost info, use amount as fallback
          contribution = orderData.subtotal * 0.3; // Estimate 30% margin
          break;
      }

      // Verificar si aplican filtros de productos
      if (goal.applicableProducts?.length > 0) {
        const applicableItems = orderData.items.filter((item) =>
          goal.applicableProducts.some(
            (p) => p.toString() === item.productId,
          ),
        );
        if (applicableItems.length === 0) continue;

        // Recalcular contribución solo con productos aplicables
        switch (goal.targetType) {
          case "amount":
            contribution = applicableItems.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
            break;
          case "units":
            contribution = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
            break;
        }
      }

      if (contribution <= 0) continue;

      // Actualizar progreso
      const newValue = progress.currentValue + contribution;
      const percentageComplete = (newValue / progress.targetValue) * 100;
      const achieved = percentageComplete >= 100;

      const updateData: any = {
        currentValue: newValue,
        percentageComplete,
        ordersCount: progress.ordersCount + 1,
        lastUpdatedAt: new Date(),
      };

      // Agregar contribución al array
      const newContribution = {
        orderId: new Types.ObjectId(orderData.orderId),
        orderNumber: orderData.orderNumber,
        date: new Date(),
        amount: contribution,
        orderTotal: orderData.amount,
      };

      // Verificar milestones
      const milestonesToNotify: number[] = [];
      if (goal.progressMilestones) {
        for (const milestone of goal.progressMilestones) {
          if (
            percentageComplete >= milestone &&
            !progress.milestonesReached.includes(milestone)
          ) {
            milestonesToNotify.push(milestone);
          }
        }
      }

      // Si se alcanzó la meta
      if (achieved && !progress.achieved) {
        updateData.achieved = true;
        updateData.achievedAt = new Date();
        updateData.finalAchievementPercentage = percentageComplete;
        updateData.status = "achieved";
        updateData.bonusEligible = percentageComplete >= (goal.minAchievementForBonus || 100);

        // Calcular monto del bono
        const bonusCalc = await this.calculateBonusForProgress(goal, percentageComplete);
        updateData.bonusAmount = bonusCalc.amount;
        updateData.bonusTierLabel = bonusCalc.tierLabel;
      }

      const updated = await this.goalProgressModel.findByIdAndUpdate(
        progress._id,
        {
          $set: updateData,
          $push: { contributions: newContribution },
          $addToSet: { milestonesReached: { $each: milestonesToNotify } },
        },
        { new: true },
      );

      if (updated) {
        updatedProgresses.push(updated);
      }

      // Emitir eventos
      if (achieved && !progress.achieved) {
        this.eventEmitter.emit("goal.achieved", {
          goalProgressId: progress._id.toString(),
          goalId: goal._id.toString(),
          employeeId,
          tenantId,
          achievementPercentage: percentageComplete,
          bonusAmount: updateData.bonusAmount || 0,
          autoAwardBonus: goal.bonusType !== "none",
        });
      }

      for (const milestone of milestonesToNotify) {
        this.eventEmitter.emit("goal.milestone.reached", {
          goalProgressId: progress._id.toString(),
          goalId: goal._id.toString(),
          employeeId,
          milestone,
          currentPercentage: percentageComplete,
          tenantId,
        });
      }
    }

    return updatedProgresses;
  }

  /**
   * Calcular bono para un progreso
   */
  private async calculateBonusForProgress(
    goal: SalesGoal,
    achievementPercentage: number,
  ): Promise<{ amount: number; tierLabel?: string }> {
    let amount = 0;
    let tierLabel: string | undefined;

    switch (goal.bonusType) {
      case "fixed":
        amount = goal.bonusAmount || 0;
        break;

      case "percentage":
        amount = (goal.targetValue * (goal.bonusPercentage || 0)) / 100;
        break;

      case "tiered":
        if (goal.bonusTiers?.length > 0) {
          const sortedTiers = [...goal.bonusTiers].sort(
            (a, b) => b.achievementPercentage - a.achievementPercentage,
          );
          for (const tier of sortedTiers) {
            if (achievementPercentage >= tier.achievementPercentage) {
              amount = tier.bonusAmount;
              tierLabel = tier.label;
              break;
            }
          }
        }
        break;

      case "none":
        amount = 0;
        break;
    }

    // Aplicar prorrateo si está configurado
    if (goal.bonusProRated && achievementPercentage < 100) {
      amount = (amount * achievementPercentage) / 100;
    }

    return { amount, tierLabel };
  }

  /**
   * Actualizar progreso de meta después de una venta (por orderId)
   */
  async updateGoalProgress(
    orderId: string,
    tenantId: string,
  ): Promise<GoalProgress[]> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      tenantId,
    });

    if (!order || !order.contributesToGoals) {
      return [];
    }

    const salesPersonId = order.salesPersonId || order.assignedWaiterId || order.createdBy;
    if (!salesPersonId) return [];

    // Obtener progresos activos del empleado
    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: salesPersonId,
      status: "in_progress",
      periodStart: { $lte: order.createdAt },
      periodEnd: { $gte: order.createdAt },
    });

    const updatedProgresses: GoalProgress[] = [];

    for (const progress of progresses) {
      const goal = await this.salesGoalModel.findById(progress.goalId);
      if (!goal || !goal.isActive) continue;

      // Calcular contribución según tipo de meta
      let contribution = 0;
      switch (goal.targetType) {
        case "amount":
          contribution = order.totalAmount;
          break;
        case "units":
          contribution = order.items.reduce((sum, item) => sum + item.quantity, 0);
          break;
        case "orders":
          contribution = 1;
          break;
        case "margin":
          contribution = order.metrics?.totalMargin || 0;
          break;
      }

      // Verificar si aplican filtros de productos/categorías
      if (goal.applicableProducts?.length > 0) {
        const applicableItems = order.items.filter((item) =>
          goal.applicableProducts.some(
            (p) => p.toString() === item.productId.toString(),
          ),
        );
        if (applicableItems.length === 0) continue;

        // Recalcular contribución solo con productos aplicables
        switch (goal.targetType) {
          case "amount":
            contribution = applicableItems.reduce((sum, item) => sum + item.totalPrice, 0);
            break;
          case "units":
            contribution = applicableItems.reduce((sum, item) => sum + item.quantity, 0);
            break;
        }
      }

      if (contribution <= 0) continue;

      // Actualizar progreso
      const newValue = progress.currentValue + contribution;
      const percentageComplete = (newValue / progress.targetValue) * 100;
      const achieved = percentageComplete >= 100;

      const updateData: any = {
        currentValue: newValue,
        percentageComplete,
        ordersCount: progress.ordersCount + 1,
        lastUpdatedAt: new Date(),
        $push: {
          contributions: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            date: order.createdAt,
            amount: contribution,
            orderTotal: order.totalAmount,
          },
        },
      };

      // Verificar milestones
      const milestonesToNotify: number[] = [];
      if (goal.progressMilestones) {
        for (const milestone of goal.progressMilestones) {
          if (
            percentageComplete >= milestone &&
            !progress.milestonesReached.includes(milestone)
          ) {
            milestonesToNotify.push(milestone);
            updateData.$addToSet = updateData.$addToSet || {};
            updateData.$addToSet.milestonesReached = milestone;
          }
        }
      }

      // Si se alcanzó la meta
      if (achieved && !progress.achieved) {
        updateData.achieved = true;
        updateData.achievedAt = new Date();
        updateData.finalAchievementPercentage = percentageComplete;
        updateData.status = "achieved";
        updateData.bonusEligible = percentageComplete >= (goal.minAchievementForBonus || 100);
      }

      const updated = await this.goalProgressModel.findByIdAndUpdate(
        progress._id,
        updateData,
        { new: true },
      );

      if (updated) {
        updatedProgresses.push(updated);
      }

      // Emitir eventos
      if (achieved && !progress.achieved) {
        this.eventEmitter.emit("goal.achieved", {
          goalProgressId: progress._id.toString(),
          goalId: goal._id.toString(),
          employeeId: salesPersonId.toString(),
          tenantId,
          achievementPercentage: percentageComplete,
        });
      }

      for (const milestone of milestonesToNotify) {
        this.eventEmitter.emit("goal.milestone.reached", {
          goalProgressId: progress._id.toString(),
          goalId: goal._id.toString(),
          employeeId: salesPersonId.toString(),
          milestone,
          tenantId,
        });
      }
    }

    return updatedProgresses;
  }

  /**
   * Verificar logro de meta y otorgar bono
   */
  async checkGoalAchievement(
    progressId: string,
    tenantId: string,
  ): Promise<{
    achieved: boolean;
    bonusAmount: number;
    bonusTierLabel?: string;
  }> {
    const progress = await this.goalProgressModel.findOne({
      _id: new Types.ObjectId(progressId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!progress) {
      throw new NotFoundException(`Goal progress ${progressId} not found`);
    }

    if (!progress.achieved || progress.bonusAwarded) {
      return { achieved: false, bonusAmount: 0 };
    }

    const goal = await this.salesGoalModel.findById(progress.goalId);
    if (!goal) {
      return { achieved: false, bonusAmount: 0 };
    }

    // Calcular bono
    let bonusAmount = 0;
    let bonusTierLabel: string | undefined;

    switch (goal.bonusType) {
      case "fixed":
        bonusAmount = goal.bonusAmount || 0;
        break;

      case "percentage":
        bonusAmount = (progress.currentValue * (goal.bonusPercentage || 0)) / 100;
        break;

      case "tiered":
        if (goal.bonusTiers?.length > 0) {
          // Ordenar tiers por achievementPercentage descendente
          const sortedTiers = [...goal.bonusTiers].sort(
            (a, b) => b.achievementPercentage - a.achievementPercentage,
          );
          for (const tier of sortedTiers) {
            if (progress.percentageComplete >= tier.achievementPercentage) {
              bonusAmount = tier.bonusAmount;
              bonusTierLabel = tier.label;
              break;
            }
          }
        }
        break;

      case "none":
        bonusAmount = 0;
        break;
    }

    // Aplicar prorrateo si está configurado y no se alcanzó el 100%
    if (
      goal.bonusProRated &&
      progress.percentageComplete < 100 &&
      progress.percentageComplete >= (goal.minAchievementForBonus || 100)
    ) {
      bonusAmount = (bonusAmount * progress.percentageComplete) / 100;
    }

    return { achieved: true, bonusAmount, bonusTierLabel };
  }

  /**
   * Obtener progreso de metas de un empleado
   */
  async getEmployeeGoalProgress(
    employeeId: string,
    tenantId: string,
    filters?: GoalProgressFilterDto,
  ): Promise<GoalProgress[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
    };

    if (filters?.goalId) {
      query.goalId = new Types.ObjectId(filters.goalId);
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.periodStart) {
      query.periodStart = { $gte: new Date(filters.periodStart) };
    }
    if (filters?.periodEnd) {
      query.periodEnd = { $lte: new Date(filters.periodEnd) };
    }

    return this.goalProgressModel
      .find(query)
      .populate("goalId", "name targetType periodType bonusType bonusAmount")
      .sort({ periodStart: -1 });
  }

  /**
   * Obtener progreso de metas con filtros (versión flexible)
   * Acepta filtros que pueden incluir goalId, employeeId, etc.
   */
  async getGoalProgress(
    filters: GoalProgressFilterDto,
    tenantId: string,
  ): Promise<GoalProgress[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters?.goalId) {
      query.goalId = new Types.ObjectId(filters.goalId);
    }
    if (filters?.employeeId) {
      query.employeeId = new Types.ObjectId(filters.employeeId);
    }
    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.periodStart) {
      query.periodStart = { $gte: new Date(filters.periodStart) };
    }
    if (filters?.periodEnd) {
      query.periodEnd = { $lte: new Date(filters.periodEnd) };
    }

    return this.goalProgressModel
      .find(query)
      .populate("employeeId", "firstName lastName email")
      .populate("goalId", "name targetType periodType bonusType")
      .sort({ percentageComplete: -1 });
  }

  /**
   * Obtener progreso de una meta específica por goalId
   */
  async getGoalProgressByGoalId(
    goalId: string,
    tenantId: string,
    filters?: GoalProgressFilterDto,
  ): Promise<GoalProgress[]> {
    return this.getGoalProgress({ ...filters, goalId }, tenantId);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD & REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener dashboard de metas
   */
  async getGoalsDashboard(
    tenantId: string,
    periodStart?: Date,
    periodEnd?: Date,
  ): Promise<GoalsDashboardResponse> {
    const now = new Date();
    const start = periodStart || new Date(now.getFullYear(), now.getMonth(), 1);
    const end =
      periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Obtener progresos del período
    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      periodStart: { $gte: start },
      periodEnd: { $lte: end },
    });

    // Calcular métricas
    const totalGoals = progresses.length;
    const achievedGoals = progresses.filter((p) => p.achieved).length;
    const inProgressGoals = progresses.filter(
      (p) => p.status === "in_progress",
    ).length;
    const failedGoals = progresses.filter((p) => p.status === "failed").length;
    const totalBonuses = progresses
      .filter((p) => p.bonusAwarded)
      .reduce((sum, p) => sum + p.bonusAmount, 0);

    // Top performers
    const performerMap = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        goalsAchieved: number;
        totalBonus: number;
        achievements: number[];
      }
    >();

    for (const progress of progresses) {
      const empId = progress.employeeId.toString();
      if (!performerMap.has(empId)) {
        performerMap.set(empId, {
          employeeId: empId,
          employeeName: "",
          goalsAchieved: 0,
          totalBonus: 0,
          achievements: [],
        });
      }
      const perf = performerMap.get(empId)!;
      if (progress.achieved) perf.goalsAchieved++;
      if (progress.bonusAwarded) perf.totalBonus += progress.bonusAmount;
      perf.achievements.push(progress.percentageComplete);
    }

    const topPerformers = Array.from(performerMap.values())
      .map((p) => ({
        ...p,
        averageAchievement:
          p.achievements.length > 0
            ? p.achievements.reduce((a, b) => a + b, 0) / p.achievements.length
            : 0,
      }))
      .sort((a, b) => b.goalsAchieved - a.goalsAchieved)
      .slice(0, 10);

    // Goal progress summary
    const goalMap = new Map<
      string,
      {
        goalId: string;
        goalName: string;
        targetValue: number;
        totalProgress: number;
        employeesInProgress: number;
        employeesAchieved: number;
      }
    >();

    for (const progress of progresses) {
      const goalId = progress.goalId.toString();
      if (!goalMap.has(goalId)) {
        goalMap.set(goalId, {
          goalId,
          goalName: progress.goalSnapshot?.name || "Unknown",
          targetValue: progress.targetValue,
          totalProgress: 0,
          employeesInProgress: 0,
          employeesAchieved: 0,
        });
      }
      const goalData = goalMap.get(goalId)!;
      goalData.totalProgress += progress.currentValue;
      if (progress.status === "in_progress") goalData.employeesInProgress++;
      if (progress.achieved) goalData.employeesAchieved++;
    }

    const goalProgress = Array.from(goalMap.values()).map((g) => ({
      ...g,
      currentValue: g.totalProgress,
      percentageComplete:
        g.employeesAchieved + g.employeesInProgress > 0
          ? (g.totalProgress /
            (g.targetValue * (g.employeesAchieved + g.employeesInProgress))) *
          100
          : 0,
    }));

    return {
      period: {
        current: `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`,
        start,
        end,
      },
      summary: {
        totalGoals,
        achievedGoals,
        inProgressGoals,
        failedGoals,
        achievementRate: totalGoals > 0 ? (achievedGoals / totalGoals) * 100 : 0,
        totalBonusesAwarded: totalBonuses,
      },
      topPerformers,
      goalProgress,
    };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // ALIAS METHODS FOR CONTROLLER COMPATIBILITY
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Alias: createSalesGoal
   */
  async createSalesGoal(
    dto: CreateSalesGoalDto,
    tenantId: string,
    userId?: string,
  ): Promise<SalesGoal> {
    return this.createGoal(dto, tenantId, userId);
  }

  /**
   * Alias: findAllSalesGoals
   */
  async findAllSalesGoals(
    filters: SalesGoalFilterDto,
    tenantId: string,
  ): Promise<SalesGoal[]> {
    return this.findAllGoals(tenantId, filters);
  }

  /**
   * Obtener solo metas activas
   */
  async findActiveSalesGoals(tenantId: string): Promise<SalesGoal[]> {
    return this.salesGoalModel.find({
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
    }).sort({ createdAt: -1 });
  }

  /**
   * Alias: findSalesGoalById
   */
  async findSalesGoalById(goalId: string, tenantId: string): Promise<SalesGoal> {
    return this.findGoalById(goalId, tenantId);
  }

  /**
   * Alias: updateSalesGoal
   */
  async updateSalesGoal(
    goalId: string,
    dto: UpdateSalesGoalDto,
    tenantId: string,
    userId?: string,
  ): Promise<SalesGoal> {
    return this.updateGoal(goalId, dto, tenantId, userId);
  }

  /**
   * Alias: deleteSalesGoal
   */
  async deleteSalesGoal(goalId: string, tenantId: string): Promise<void> {
    return this.deleteGoal(goalId, tenantId);
  }

  /**
   * Alias: activateSalesGoal
   */
  async activateSalesGoal(goalId: string, tenantId: string): Promise<SalesGoal> {
    return this.activateGoal(goalId, tenantId);
  }

  /**
   * Alias: deactivateSalesGoal
   */
  async deactivateSalesGoal(goalId: string, tenantId: string): Promise<SalesGoal> {
    return this.deactivateGoal(goalId, tenantId);
  }

  /**
   * Obtener metas aplicables a un empleado específico
   */
  async getApplicableGoalsForEmployee(
    employeeId: string,
    tenantId: string,
  ): Promise<SalesGoal[]> {
    const employee = await this.userModel.findOne({
      _id: new Types.ObjectId(employeeId),
      tenantId: new Types.ObjectId(tenantId),
    }).populate("role");

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const now = new Date();

    // Buscar metas que apliquen a este empleado
    const goals = await this.salesGoalModel.find({
      tenantId: new Types.ObjectId(tenantId),
      isActive: true,
      $or: [
        // Metas para todos
        { applicableTo: "all" },
        // Metas individuales que incluyan a este empleado
        {
          applicableTo: "individual",
          employeeIds: new Types.ObjectId(employeeId),
        },
        // Metas por rol
        ...(employee.role
          ? [
            {
              applicableTo: "role",
              roleIds: employee.role._id || employee.role,
            },
          ]
          : []),
      ],
    });

    return goals;
  }

  /**
   * Inicializar progreso para una meta (versión pública con goalId)
   */
  async initializeProgressForGoal(
    goalId: string,
    tenantId: string,
  ): Promise<{ initialized: number }> {
    const goal = await this.findGoalById(goalId, tenantId);
    const { periodStart, periodEnd, periodLabel } = this.calculatePeriodDates(goal);
    const employees = await this.getApplicableEmployees(goal, tenantId);

    let initialized = 0;

    for (const employee of employees) {
      // Verificar si ya existe progreso para este período
      const existing = await this.goalProgressModel.findOne({
        tenantId: new Types.ObjectId(tenantId),
        goalId: goal._id,
        employeeId: employee._id,
        periodStart,
      });

      if (existing) continue;

      await this.goalProgressModel.create({
        tenantId: new Types.ObjectId(tenantId),
        goalId: goal._id,
        employeeId: employee._id,
        periodStart,
        periodEnd,
        periodLabel,
        currentValue: 0,
        targetValue: goal.targetValue,
        percentageComplete: 0,
        status: "in_progress",
        goalSnapshot: {
          name: goal.name,
          targetType: goal.targetType,
          targetValue: goal.targetValue,
          bonusType: goal.bonusType,
          bonusAmount: goal.bonusAmount,
          bonusPercentage: goal.bonusPercentage,
          bonusTiers: goal.bonusTiers,
        },
      });

      initialized++;
    }

    this.logger.log(
      `Initialized progress for goal ${goalId} for ${initialized} employees`,
    );

    return { initialized };
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXTENDED REPORTS & PERIOD MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Reporte de metas de un empleado
   */
  async getEmployeeGoalsReport(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<{
    employee: {
      id: string;
      name: string;
    };
    period: {
      start: Date;
      end: Date;
    };
    summary: {
      totalGoals: number;
      goalsAchieved: number;
      goalsInProgress: number;
      goalsFailed: number;
      achievementRate: number;
      totalBonusEarned: number;
      totalBonusPending: number;
    };
    goals: Array<{
      goalId: string;
      goalName: string;
      targetType: string;
      targetValue: number;
      currentValue: number;
      percentageComplete: number;
      achieved: boolean;
      bonusAmount: number;
      bonusAwarded: boolean;
    }>;
  }> {
    const employee = await this.userModel.findOne({
      _id: new Types.ObjectId(employeeId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      periodStart: { $gte: periodStart },
      periodEnd: { $lte: periodEnd },
    });

    const goalsAchieved = progresses.filter((p) => p.achieved).length;
    const goalsInProgress = progresses.filter((p) => p.status === "in_progress").length;
    const goalsFailed = progresses.filter((p) => p.status === "failed").length;
    const totalBonusEarned = progresses
      .filter((p) => p.bonusAwarded)
      .reduce((sum, p) => sum + p.bonusAmount, 0);
    const totalBonusPending = progresses
      .filter((p) => p.bonusEligible && !p.bonusAwarded)
      .reduce((sum, p) => sum + p.bonusAmount, 0);

    return {
      employee: {
        id: employee._id.toString(),
        name: `${employee.firstName} ${employee.lastName}`,
      },
      period: {
        start: periodStart,
        end: periodEnd,
      },
      summary: {
        totalGoals: progresses.length,
        goalsAchieved,
        goalsInProgress,
        goalsFailed,
        achievementRate: progresses.length > 0 ? (goalsAchieved / progresses.length) * 100 : 0,
        totalBonusEarned,
        totalBonusPending,
      },
      goals: progresses.map((p) => ({
        goalId: p.goalId.toString(),
        goalName: p.goalSnapshot?.name || "Unknown",
        targetType: p.goalSnapshot?.targetType || "amount",
        targetValue: p.targetValue,
        currentValue: p.currentValue,
        percentageComplete: p.percentageComplete,
        achieved: p.achieved,
        bonusAmount: p.bonusAmount,
        bonusAwarded: p.bonusAwarded,
      })),
    };
  }

  /**
   * Reporte de equipo (ranking por meta)
   */
  async getTeamGoalsReport(
    goalId: string | undefined,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<{
    period: {
      start: Date;
      end: Date;
    };
    goals: Array<{
      goalId: string;
      goalName: string;
      ranking: Array<{
        position: number;
        employeeId: string;
        employeeName: string;
        currentValue: number;
        targetValue: number;
        percentageComplete: number;
        achieved: boolean;
        bonusAmount: number;
      }>;
    }>;
  }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      periodStart: { $gte: periodStart },
      periodEnd: { $lte: periodEnd },
    };

    if (goalId) {
      query.goalId = new Types.ObjectId(goalId);
    }

    const progresses = await this.goalProgressModel
      .find(query)
      .populate("employeeId", "firstName lastName");

    // Agrupar por meta
    const goalMap = new Map<
      string,
      {
        goalId: string;
        goalName: string;
        progresses: any[];
      }
    >();

    for (const progress of progresses) {
      const gId = progress.goalId.toString();
      if (!goalMap.has(gId)) {
        goalMap.set(gId, {
          goalId: gId,
          goalName: progress.goalSnapshot?.name || "Unknown",
          progresses: [],
        });
      }
      goalMap.get(gId)!.progresses.push(progress);
    }

    // Crear ranking por meta
    const goals = Array.from(goalMap.values()).map((g) => ({
      goalId: g.goalId,
      goalName: g.goalName,
      ranking: g.progresses
        .sort((a, b) => b.percentageComplete - a.percentageComplete)
        .map((p, index) => ({
          position: index + 1,
          employeeId: p.employeeId?._id?.toString() || p.employeeId?.toString(),
          employeeName: p.employeeId?.firstName
            ? `${p.employeeId.firstName} ${p.employeeId.lastName}`
            : "Unknown",
          currentValue: p.currentValue,
          targetValue: p.targetValue,
          percentageComplete: p.percentageComplete,
          achieved: p.achieved,
          bonusAmount: p.bonusAmount,
        })),
    }));

    return {
      period: {
        start: periodStart,
        end: periodEnd,
      },
      goals,
    };
  }

  /**
   * Cerrar período y procesar logros
   */
  async closePeriodAndProcessAchievements(
    periodEnd: Date,
    tenantId: string,
  ): Promise<{
    processed: number;
    achieved: number;
    failed: number;
    bonusesAwarded: number;
  }> {
    // Obtener todos los progresos en curso cuyo período ha terminado
    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      status: "in_progress",
      periodEnd: { $lte: periodEnd },
    });

    let processed = 0;
    let achieved = 0;
    let failed = 0;
    let bonusesAwarded = 0;

    for (const progress of progresses) {
      processed++;

      const goal = await this.salesGoalModel.findById(progress.goalId);
      if (!goal) continue;

      const isAchieved = progress.percentageComplete >= 100;
      const meetsMinimum = progress.percentageComplete >= (goal.minAchievementForBonus || 100);

      const updateData: any = {
        status: isAchieved ? "achieved" : "failed",
        periodEndedAt: new Date(),
      };

      if (isAchieved && !progress.achieved) {
        updateData.achieved = true;
        updateData.achievedAt = new Date();
        updateData.finalAchievementPercentage = progress.percentageComplete;
        achieved++;
      } else if (!isAchieved) {
        failed++;
      }

      // Calcular bono si es elegible
      if (meetsMinimum && !progress.bonusAwarded && goal.bonusType !== "none") {
        const bonusCalc = await this.calculateBonusForProgress(
          goal,
          progress.percentageComplete,
        );
        updateData.bonusEligible = true;
        updateData.bonusAmount = bonusCalc.amount;
        updateData.bonusTierLabel = bonusCalc.tierLabel;

        // Emitir evento para auto-award si está configurado
        if ((goal as any).autoAwardBonus && bonusCalc.amount > 0) {
          this.eventEmitter.emit("goal.achieved", {
            goalProgressId: progress._id.toString(),
            goalId: goal._id.toString(),
            employeeId: progress.employeeId.toString(),
            tenantId,
            achievementPercentage: progress.percentageComplete,
            bonusAmount: bonusCalc.amount,
            autoAwardBonus: true,
          });
          bonusesAwarded++;
        }
      }

      await this.goalProgressModel.findByIdAndUpdate(progress._id, {
        $set: updateData,
      });
    }

    this.logger.log(
      `Period closed: ${processed} processed, ${achieved} achieved, ${failed} failed, ${bonusesAwarded} bonuses`,
    );

    return { processed, achieved, failed, bonusesAwarded };
  }

  /**
   * Recalcular progreso de una meta (para correcciones)
   */
  async recalculateGoalProgress(
    goalId: string,
    tenantId: string,
  ): Promise<{
    recalculated: number;
    updated: number;
  }> {
    const goal = await this.findGoalById(goalId, tenantId);
    const { periodStart, periodEnd } = this.calculatePeriodDates(goal);

    // Obtener todos los progresos de esta meta
    const progresses = await this.goalProgressModel.find({
      tenantId: new Types.ObjectId(tenantId),
      goalId: new Types.ObjectId(goalId),
      periodStart,
    });

    let recalculated = 0;
    let updated = 0;

    for (const progress of progresses) {
      recalculated++;

      // Recalcular basándose en las órdenes del período
      const orders = await this.orderModel.find({
        tenantId: new Types.ObjectId(tenantId),
        $or: [
          { salesPersonId: progress.employeeId },
          { assignedWaiterId: progress.employeeId },
          { createdBy: progress.employeeId },
        ],
        status: { $in: ["completed", "paid"] },
        createdAt: { $gte: periodStart, $lte: periodEnd },
        contributesToGoals: true,
      });

      let newValue = 0;
      const contributions: any[] = [];

      for (const order of orders) {
        let contribution = 0;

        switch (goal.targetType) {
          case "amount":
            contribution = order.totalAmount;
            break;
          case "units":
            contribution = order.items.reduce((sum, item) => sum + item.quantity, 0);
            break;
          case "orders":
            contribution = 1;
            break;
          case "margin":
            contribution = order.metrics?.totalMargin || 0;
            break;
        }

        // Filtrar por productos aplicables si está configurado
        if (goal.applicableProducts?.length > 0) {
          const applicableItems = order.items.filter((item) =>
            goal.applicableProducts.some(
              (p) => p.toString() === item.productId.toString(),
            ),
          );
          if (applicableItems.length === 0) continue;

          switch (goal.targetType) {
            case "amount":
              contribution = applicableItems.reduce(
                (sum, item) => sum + item.totalPrice,
                0,
              );
              break;
            case "units":
              contribution = applicableItems.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              break;
          }
        }

        if (contribution > 0) {
          newValue += contribution;
          contributions.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            date: order.createdAt,
            amount: contribution,
            orderTotal: order.totalAmount,
          });
        }
      }

      const percentageComplete = (newValue / progress.targetValue) * 100;
      const achieved = percentageComplete >= 100;

      // Solo actualizar si hay cambios significativos
      if (
        Math.abs(newValue - progress.currentValue) > 0.01 ||
        achieved !== progress.achieved
      ) {
        const updateData: any = {
          currentValue: newValue,
          percentageComplete,
          ordersCount: contributions.length,
          contributions,
          lastUpdatedAt: new Date(),
        };

        if (achieved && !progress.achieved) {
          updateData.achieved = true;
          updateData.achievedAt = new Date();
          updateData.finalAchievementPercentage = percentageComplete;
          updateData.status = "achieved";
        }

        await this.goalProgressModel.findByIdAndUpdate(progress._id, {
          $set: updateData,
        });

        updated++;
      }
    }

    this.logger.log(
      `Recalculated goal ${goalId}: ${recalculated} checked, ${updated} updated`,
    );

    return { recalculated, updated };
  }
}
