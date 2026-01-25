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
  CommissionPlan,
  CommissionPlanDocument,
} from "../../../schemas/commission-plan.schema";
import {
  EmployeeCommissionConfig,
  EmployeeCommissionConfigDocument,
} from "../../../schemas/employee-commission-config.schema";
import {
  CommissionRecord,
  CommissionRecordDocument,
} from "../../../schemas/commission-record.schema";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { User, UserDocument } from "../../../schemas/user.schema";

import {
  CreateCommissionPlanDto,
  UpdateCommissionPlanDto,
  AssignCommissionPlanDto,
  UpdateEmployeeCommissionConfigDto,
  CommissionRecordFilterDto,
  CommissionCalculationResponse,
  CommissionsSummaryResponse,
} from "../../../dto/commissions.dto";

import { COMMISSION_ACCOUNT_CODES } from "../../../config/commission-system-accounts.config";

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(
    @InjectModel(CommissionPlan.name)
    private commissionPlanModel: Model<CommissionPlanDocument>,
    @InjectModel(EmployeeCommissionConfig.name)
    private employeeConfigModel: Model<EmployeeCommissionConfigDocument>,
    @InjectModel(CommissionRecord.name)
    private commissionRecordModel: Model<CommissionRecordDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
  ) { }

  // ════════════════════════════════════════════════════════════════════════════
  // COMMISSION PLANS CRUD
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Crear un nuevo plan de comisión
   */
  async createCommissionPlan(
    dto: CreateCommissionPlanDto,
    tenantId: string,
    userId?: string,
  ): Promise<CommissionPlan> {
    // Si es default, desactivar otros defaults
    if (dto.isDefault) {
      await this.commissionPlanModel.updateMany(
        { tenantId: new Types.ObjectId(tenantId), isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const plan = await this.commissionPlanModel.create({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      applicableRoles: dto.applicableRoles?.map((id) => new Types.ObjectId(id)),
      applicableProducts: dto.applicableProducts?.map(
        (id) => new Types.ObjectId(id),
      ),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.logger.log(
      `Commission plan created: ${plan.name} (${plan._id}) for tenant ${tenantId}`,
    );

    return plan;
  }

  /**
   * Actualizar plan de comisión
   */
  async updateCommissionPlan(
    planId: string,
    dto: UpdateCommissionPlanDto,
    tenantId: string,
    userId?: string,
  ): Promise<CommissionPlan> {
    const plan = await this.commissionPlanModel.findOne({
      _id: new Types.ObjectId(planId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!plan) {
      throw new NotFoundException(`Commission plan ${planId} not found`);
    }

    // Si se está estableciendo como default, desactivar otros
    if (dto.isDefault && !plan.isDefault) {
      await this.commissionPlanModel.updateMany(
        { tenantId: new Types.ObjectId(tenantId), isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    const updateData: any = { ...dto };
    if (dto.applicableRoles) {
      updateData.applicableRoles = dto.applicableRoles.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (dto.applicableProducts) {
      updateData.applicableProducts = dto.applicableProducts.map(
        (id) => new Types.ObjectId(id),
      );
    }
    if (userId) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    const updated = await this.commissionPlanModel.findByIdAndUpdate(
      planId,
      { $set: updateData },
      { new: true },
    );

    if (!updated) {
      throw new NotFoundException(`Commission plan ${planId} not found after update`);
    }

    this.logger.log(`Commission plan updated: ${planId}`);

    return updated;
  }

  /**
   * Obtener todos los planes de comisión
   */
  async findAllCommissionPlans(
    tenantId: string,
    includeInactive = false,
  ): Promise<CommissionPlan[]> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (!includeInactive) {
      filter.isActive = true;
    }

    return this.commissionPlanModel.find(filter).sort({ isDefault: -1, name: 1 });
  }

  /**
   * Obtener plan por ID
   */
  async findCommissionPlanById(
    planId: string,
    tenantId: string,
  ): Promise<CommissionPlan> {
    const plan = await this.commissionPlanModel.findOne({
      _id: new Types.ObjectId(planId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!plan) {
      throw new NotFoundException(`Commission plan ${planId} not found`);
    }

    return plan;
  }

  /**
   * Obtener plan default del tenant
   */
  async findDefaultPlan(tenantId: string): Promise<CommissionPlan | null> {
    return this.commissionPlanModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      isDefault: true,
      isActive: true,
    });
  }

  /**
   * Eliminar plan de comisión
   */
  async deleteCommissionPlan(planId: string, tenantId: string): Promise<void> {
    // Verificar si hay empleados usando este plan
    const employeesUsingPlan = await this.employeeConfigModel.countDocuments({
      tenantId: new Types.ObjectId(tenantId),
      commissionPlanId: new Types.ObjectId(planId),
      isActive: true,
    });

    if (employeesUsingPlan > 0) {
      throw new ConflictException(
        `Cannot delete plan: ${employeesUsingPlan} employees are using it`,
      );
    }

    const result = await this.commissionPlanModel.deleteOne({
      _id: new Types.ObjectId(planId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Commission plan ${planId} not found`);
    }

    this.logger.log(`Commission plan deleted: ${planId}`);
  }

  /**
   * Establecer plan como default
   */
  async setDefaultPlan(planId: string, tenantId: string): Promise<CommissionPlan> {
    // Desactivar otros defaults
    await this.commissionPlanModel.updateMany(
      { tenantId: new Types.ObjectId(tenantId), isDefault: true },
      { $set: { isDefault: false } },
    );

    // Activar este como default
    const plan = await this.commissionPlanModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(planId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { isDefault: true, isActive: true } },
      { new: true },
    );

    if (!plan) {
      throw new NotFoundException(`Commission plan ${planId} not found`);
    }

    return plan;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EMPLOYEE COMMISSION CONFIG
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Asignar plan de comisión a empleado
   */
  async assignPlanToEmployee(
    employeeId: string,
    dto: AssignCommissionPlanDto,
    tenantId: string,
    userId?: string,
  ): Promise<EmployeeCommissionConfig> {
    // Verificar que el plan existe
    const plan = await this.findCommissionPlanById(dto.commissionPlanId, tenantId);

    // Desactivar configuraciones previas activas
    await this.employeeConfigModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(employeeId),
        isActive: true,
      },
      { $set: { isActive: false, endDate: new Date() } },
    );

    // Crear nueva configuración
    const config = await this.employeeConfigModel.create({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      commissionPlanId: new Types.ObjectId(dto.commissionPlanId),
      overridePercentage: dto.overridePercentage,
      overrideFixedAmount: dto.overrideFixedAmount,
      overrideTiers: dto.overrideTiers,
      overrideMaxCommission: dto.overrideMaxCommission,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : new Date(),
      endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      notes: dto.notes,
      isActive: true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
    });

    this.logger.log(
      `Commission plan ${plan.name} assigned to employee ${employeeId}`,
    );

    return config;
  }

  /**
   * Obtener configuración de comisión de empleado
   */
  async getEmployeeCommissionConfig(
    employeeId: string,
    tenantId: string,
  ): Promise<EmployeeCommissionConfig | null> {
    const now = new Date();

    return this.employeeConfigModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(employeeId),
        isActive: true,
        effectiveDate: { $lte: now },
        $or: [{ endDate: null }, { endDate: { $gt: now } }],
      })
      .populate("commissionPlanId");
  }

  /**
   * Actualizar configuración de empleado
   */
  async updateEmployeeCommissionConfig(
    configId: string,
    dto: UpdateEmployeeCommissionConfigDto,
    tenantId: string,
    userId?: string,
  ): Promise<EmployeeCommissionConfig> {
    const updateData: any = { ...dto };
    if (dto.commissionPlanId) {
      updateData.commissionPlanId = new Types.ObjectId(dto.commissionPlanId);
    }
    if (dto.effectiveDate) {
      updateData.effectiveDate = new Date(dto.effectiveDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    if (userId) {
      updateData.updatedBy = new Types.ObjectId(userId);
    }

    const config = await this.employeeConfigModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(configId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: updateData },
      { new: true },
    );

    if (!config) {
      throw new NotFoundException(`Commission config ${configId} not found`);
    }

    return config;
  }

  /**
   * Remover empleado de plan (desactivar configuración)
   */
  async removeEmployeeFromPlan(
    employeeId: string,
    tenantId: string,
  ): Promise<void> {
    await this.employeeConfigModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        employeeId: new Types.ObjectId(employeeId),
        isActive: true,
      },
      { $set: { isActive: false, endDate: new Date() } },
    );

    this.logger.log(`Employee ${employeeId} removed from commission plan`);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMMISSION CALCULATION
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Calcular comisión para una orden
   * Este es el método principal que se llama cuando se completa una orden
   */
  async calculateCommission(
    orderId: string,
    tenantId: string,
  ): Promise<CommissionCalculationResponse | null> {
    const order = await this.orderModel.findOne({
      _id: new Types.ObjectId(orderId),
      tenantId,
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Verificar si ya se calculó comisión
    if (order.commissionCalculated) {
      this.logger.warn(`Commission already calculated for order ${orderId}`);
      return null;
    }

    // Obtener el vendedor (salesPersonId o assignedWaiterId o createdBy)
    const salesPersonId =
      order.salesPersonId || order.assignedWaiterId || order.createdBy;

    if (!salesPersonId) {
      this.logger.warn(`No salesperson assigned to order ${orderId}`);
      return null;
    }

    // Obtener configuración de comisión del empleado
    const config = await this.getEmployeeCommissionConfig(
      salesPersonId.toString(),
      tenantId,
    );

    if (!config) {
      // Intentar con plan default
      const defaultPlan = await this.findDefaultPlan(tenantId);
      if (!defaultPlan) {
        this.logger.warn(`No commission plan for employee ${salesPersonId}`);
        return null;
      }

      // Usar plan default sin overrides
      return this.calculateAndCreateRecord(
        order,
        defaultPlan,
        null,
        salesPersonId.toString(),
        tenantId,
      );
    }

    const plan = config.commissionPlanId as unknown as CommissionPlan;

    return this.calculateAndCreateRecord(
      order,
      plan,
      config,
      salesPersonId.toString(),
      tenantId,
    );
  }

  /**
   * Calcular y crear registro de comisión
   */
  private async calculateAndCreateRecord(
    order: OrderDocument,
    plan: CommissionPlan,
    config: EmployeeCommissionConfig | null,
    employeeId: string,
    tenantId: string,
  ): Promise<CommissionCalculationResponse> {
    // Calcular base de comisión
    let commissionBase = plan.calculateOnDiscountedAmount
      ? order.subtotal - order.discountAmount
      : order.subtotal;

    if (plan.includeTaxesInBase) {
      commissionBase += order.ivaTotal + order.igtfTotal;
    }

    if (plan.includeShippingInBase) {
      commissionBase += order.shippingCost;
    }

    // Verificar monto mínimo
    if (plan.minOrderAmount && commissionBase < plan.minOrderAmount) {
      this.logger.log(
        `Order ${order._id} below minimum amount for commission (${commissionBase} < ${plan.minOrderAmount})`,
      );
      // No genera comisión pero no es un error - retornamos respuesta con monto 0
      return {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        orderAmount: order.totalAmount,
        commissionBaseAmount: commissionBase,
        employeeId,
        employeeName: "",
        commissionPlanId: plan._id.toString(),
        commissionPlanName: plan.name,
        commissionType: plan.type,
        commissionPercentage: 0,
        commissionAmount: 0,
        wasOverridden: false,
        wasCapped: false,
        // skippedReason: "below_minimum_amount", // Not in DTO interface
      };
    }

    // Calcular comisión según tipo
    let commissionAmount = 0;
    let commissionPercentage = 0;
    let tierApplied: { from: number; to: number; percentage: number } | undefined = undefined;
    let wasOverridden = false;

    // Verificar overrides del empleado
    const effectivePercentage =
      config?.overridePercentage ?? plan.defaultPercentage;
    const effectiveTiers =
      (config?.overrideTiers && config?.overrideTiers?.length > 0) ? config.overrideTiers : plan.tiers;
    const effectiveFixedAmount =
      config?.overrideFixedAmount ?? plan.fixedAmount;

    if (config?.overridePercentage || (config?.overrideTiers && config?.overrideTiers?.length > 0)) {
      wasOverridden = true;
    }

    switch (plan.type) {
      case "percentage":
        commissionPercentage = effectivePercentage;
        commissionAmount = (commissionBase * commissionPercentage) / 100;
        break;

      case "tiered":
        const tier = this.findApplicableTier(commissionBase, effectiveTiers);
        if (tier) {
          commissionPercentage = tier.percentage;
          commissionAmount = (commissionBase * tier.percentage) / 100;
          tierApplied = {
            from: tier.from,
            to: tier.to,
            percentage: tier.percentage,
          };
        }
        break;

      case "fixed":
        commissionAmount = effectiveFixedAmount;
        break;

      case "mixed":
        commissionPercentage = effectivePercentage;
        commissionAmount =
          effectiveFixedAmount + (commissionBase * commissionPercentage) / 100;
        break;
    }

    // Aplicar tope máximo
    let wasCapped = false;
    let originalAmount = commissionAmount;
    const maxCommission = config?.overrideMaxCommission ?? plan.maxCommissionAmount;

    if (maxCommission && commissionAmount > maxCommission) {
      originalAmount = commissionAmount;
      commissionAmount = maxCommission;
      wasCapped = true;
    }

    // Obtener nombre del empleado
    const employee = await this.userModel.findById(employeeId).select("firstName lastName");
    const employeeName = employee
      ? `${employee.firstName} ${employee.lastName}`
      : "Unknown";

    // Crear registro de comisión
    const commissionRecord = await this.commissionRecordModel.create({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      orderTotalAmount: order.totalAmount,
      orderSubtotal: order.subtotal,
      orderDiscountAmount: order.discountAmount,
      commissionBaseAmount: commissionBase,
      commissionPlanId: plan._id,
      commissionPlanName: plan.name,
      commissionType: plan.type,
      commissionPercentage,
      commissionAmount,
      tierApplied,
      wasOverridden,
      wasCapped,
      originalAmount: wasCapped ? originalAmount : undefined,
      status: "pending",
      journalEntryCreated: false,
    });

    // Actualizar orden
    await this.orderModel.updateOne(
      { _id: order._id },
      {
        $set: {
          commissionCalculated: true,
          commissionRecordId: commissionRecord._id,
          commissionAmount,
          salesPersonId: new Types.ObjectId(employeeId),
          contributesToGoals: true,
        },
      },
    );

    // Emitir evento para crear asiento contable
    this.eventEmitter.emit("commission.calculated", {
      commissionRecordId: commissionRecord._id.toString(),
      tenantId,
      employeeId,
      amount: commissionAmount,
      orderId: order._id.toString(),
    });

    this.logger.log(
      `Commission calculated for order ${order.orderNumber}: $${commissionAmount} (${commissionPercentage}%) for employee ${employeeId}`,
    );

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      orderAmount: order.totalAmount,
      commissionBaseAmount: commissionBase,
      employeeId,
      employeeName,
      commissionPlanId: plan._id.toString(),
      commissionPlanName: plan.name,
      commissionType: plan.type,
      commissionPercentage,
      commissionAmount,
      tierApplied,
      wasOverridden,
      wasCapped,
    };
  }

  /**
   * Encontrar tier aplicable según monto
   */
  private findApplicableTier(
    amount: number,
    tiers: Array<{ from: number; to: number; percentage: number }>,
  ): { from: number; to: number; percentage: number } | null {
    if (!tiers || tiers.length === 0) return null;

    // Ordenar tiers por 'from' ascendente
    const sortedTiers = [...tiers].sort((a, b) => a.from - b.from);

    for (const tier of sortedTiers) {
      if (amount >= tier.from && amount <= tier.to) {
        return tier;
      }
    }

    // Si el monto es mayor que todos los tiers, usar el último
    const lastTier = sortedTiers[sortedTiers.length - 1];
    if (amount > lastTier.to) {
      return lastTier;
    }

    return null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // COMMISSION RECORDS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener registros de comisión con filtros
   */
  async getCommissionRecords(
    filters: CommissionRecordFilterDto,
    tenantId: string,
  ): Promise<{ records: CommissionRecord[]; total: number; pages: number }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters.employeeId) {
      query.employeeId = new Types.ObjectId(filters.employeeId);
    }
    if (filters.status) {
      query.status = filters.status;
    }
    if (filters.commissionPlanId) {
      query.commissionPlanId = new Types.ObjectId(filters.commissionPlanId);
    }
    if (filters.startDate || filters.endDate) {
      query.orderDate = {};
      if (filters.startDate) {
        query.orderDate.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.orderDate.$lte = new Date(filters.endDate);
      }
    }

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      this.commissionRecordModel
        .find(query)
        .sort({ orderDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate("employeeId", "firstName lastName email")
        .populate("commissionPlanId", "name type"),
      this.commissionRecordModel.countDocuments(query),
    ]);

    return {
      records,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  /**
   * Aprobar comisión
   */
  async approveCommission(
    recordId: string,
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<CommissionRecord> {
    const record = await this.commissionRecordModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(recordId),
        tenantId: new Types.ObjectId(tenantId),
        status: "pending",
      },
      {
        $set: {
          status: "approved",
          approvedBy: new Types.ObjectId(userId),
          approvedAt: new Date(),
          notes,
        },
      },
      { new: true },
    );

    if (!record) {
      throw new NotFoundException(
        `Commission record ${recordId} not found or not in pending status`,
      );
    }

    this.logger.log(`Commission ${recordId} approved by ${userId}`);

    return record;
  }

  /**
   * Rechazar comisión
   */
  async rejectCommission(
    recordId: string,
    reason: string,
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<CommissionRecord> {
    const record = await this.commissionRecordModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(recordId),
        tenantId: new Types.ObjectId(tenantId),
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectedBy: new Types.ObjectId(userId),
          rejectedAt: new Date(),
          rejectionReason: reason,
          notes,
        },
      },
      { new: true },
    );

    if (!record) {
      throw new NotFoundException(
        `Commission record ${recordId} not found or not in pending status`,
      );
    }

    this.logger.log(`Commission ${recordId} rejected by ${userId}: ${reason}`);

    return record;
  }

  /**
   * Aprobar múltiples comisiones
   */
  async bulkApproveCommissions(
    recordIds: string[],
    tenantId: string,
    userId: string,
    notes?: string,
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;

    for (const recordId of recordIds) {
      try {
        await this.approveCommission(recordId, tenantId, userId, notes);
        approved++;
      } catch (error) {
        this.logger.warn(`Failed to approve commission ${recordId}: ${error.message}`);
        failed++;
      }
    }

    return { approved, failed };
  }

  /**
   * Obtener comisiones aprobadas pendientes de pago
   */
  async getApprovedCommissions(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<{ total: number; recordIds: string[]; records: CommissionRecord[] }> {
    const records = await this.commissionRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      status: "approved",
      orderDate: { $gte: periodStart, $lte: periodEnd },
      payrollRunId: null,
    });

    const total = records.reduce((sum, r) => sum + r.commissionAmount, 0);
    const recordIds = records.map((r) => r._id.toString());

    return { total, recordIds, records };
  }

  /**
   * Marcar comisiones como pagadas
   */
  async markAsPaid(
    recordIds: string[],
    payrollRunId: string,
    tenantId: string,
  ): Promise<number> {
    const result = await this.commissionRecordModel.updateMany(
      {
        _id: { $in: recordIds.map((id) => new Types.ObjectId(id)) },
        tenantId: new Types.ObjectId(tenantId),
        status: "approved",
      },
      {
        $set: {
          status: "paid",
          payrollRunId: new Types.ObjectId(payrollRunId),
          paidAt: new Date(),
        },
      },
    );

    this.logger.log(
      `${result.modifiedCount} commissions marked as paid in payroll ${payrollRunId}`,
    );

    return result.modifiedCount;
  }

  /**
   * Obtener todas las comisiones aprobadas pendientes de pago para nómina
   * Agrupa por empleado para facilitar integración con PayrollRunsService
   */
  async getAllApprovedCommissionsForPayroll(
    periodStart: Date,
    periodEnd: Date,
    tenantId: string,
  ): Promise<
    Array<{
      employeeId: string;
      employeeName: string;
      totalCommissions: number;
      commissionCount: number;
      records: CommissionRecord[];
    }>
  > {
    const records = await this.commissionRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      status: "approved",
      orderDate: { $gte: periodStart, $lte: periodEnd },
      payrollRunId: null,
    });

    // Agrupar por empleado
    const byEmployee = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalCommissions: number;
        commissionCount: number;
        records: CommissionRecord[];
      }
    >();

    for (const record of records) {
      const empId = record.employeeId.toString();

      if (!byEmployee.has(empId)) {
        // Obtener nombre del empleado
        const employee = await this.userModel
          .findById(record.employeeId)
          .select("firstName lastName");

        byEmployee.set(empId, {
          employeeId: empId,
          employeeName: employee
            ? `${employee.firstName} ${employee.lastName}`
            : "Unknown",
          totalCommissions: 0,
          commissionCount: 0,
          records: [],
        });
      }

      const entry = byEmployee.get(empId)!;
      entry.totalCommissions += record.commissionAmount;
      entry.commissionCount++;
      entry.records.push(record);
    }

    return Array.from(byEmployee.values());
  }

  // ════════════════════════════════════════════════════════════════════════════
  // REPORTS
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Obtener resumen de comisiones por empleado
   */
  async getEmployeeCommissionsSummary(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    const records = await this.commissionRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      employeeId: new Types.ObjectId(employeeId),
      orderDate: { $gte: startDate, $lte: endDate },
    });

    const summary = {
      totalCommissions: 0,
      pending: 0,
      approved: 0,
      paid: 0,
      rejected: 0,
      ordersCount: records.length,
      averageCommission: 0,
      averagePercentage: 0,
    };

    for (const record of records) {
      summary.totalCommissions += record.commissionAmount;
      summary[record.status] += record.commissionAmount;
    }

    if (records.length > 0) {
      summary.averageCommission = summary.totalCommissions / records.length;
      summary.averagePercentage =
        records.reduce((sum, r) => sum + r.commissionPercentage, 0) / records.length;
    }

    return {
      employeeId,
      period: { start: startDate, end: endDate },
      summary,
      records,
    };
  }

  /**
   * Obtener resumen consolidado de comisiones
   */
  async getCommissionsSummary(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<CommissionsSummaryResponse> {
    const records = await this.commissionRecordModel.find({
      tenantId: new Types.ObjectId(tenantId),
      orderDate: { $gte: startDate, $lte: endDate },
    });

    // Agrupar por empleado
    const byEmployee = new Map<
      string,
      {
        employeeId: string;
        employeeName: string;
        totalCommissions: number;
        ordersCount: number;
        status: { pending: number; approved: number; paid: number };
      }
    >();

    // Agrupar por plan
    const byPlan = new Map<
      string,
      {
        planId: string;
        planName: string;
        totalCommissions: number;
        employeesSet: Set<string>;
      }
    >();

    let totalPending = 0;
    let totalApproved = 0;
    let totalPaid = 0;
    let totalRejected = 0;

    for (const record of records) {
      const empId = record.employeeId.toString();
      const planId = record.commissionPlanId.toString();

      // Por empleado
      if (!byEmployee.has(empId)) {
        byEmployee.set(empId, {
          employeeId: empId,
          employeeName: "", // Se poblará después
          totalCommissions: 0,
          ordersCount: 0,
          status: { pending: 0, approved: 0, paid: 0 },
        });
      }
      const empData = byEmployee.get(empId)!;
      empData.totalCommissions += record.commissionAmount;
      empData.ordersCount++;
      if (record.status === "pending") empData.status.pending += record.commissionAmount;
      if (record.status === "approved") empData.status.approved += record.commissionAmount;
      if (record.status === "paid") empData.status.paid += record.commissionAmount;

      // Por plan
      if (!byPlan.has(planId)) {
        byPlan.set(planId, {
          planId,
          planName: record.commissionPlanName,
          totalCommissions: 0,
          employeesSet: new Set(),
        });
      }
      const planData = byPlan.get(planId)!;
      planData.totalCommissions += record.commissionAmount;
      planData.employeesSet.add(empId);

      // Totales por status
      switch (record.status) {
        case "pending":
          totalPending += record.commissionAmount;
          break;
        case "approved":
          totalApproved += record.commissionAmount;
          break;
        case "paid":
          totalPaid += record.commissionAmount;
          break;
        case "rejected":
          totalRejected += record.commissionAmount;
          break;
      }
    }

    const totalCommissions = records.reduce((sum, r) => sum + r.commissionAmount, 0);
    const avgPercentage =
      records.length > 0
        ? records.reduce((sum, r) => sum + r.commissionPercentage, 0) / records.length
        : 0;

    return {
      period: { start: startDate, end: endDate },
      summary: {
        totalCommissions,
        totalPending,
        totalApproved,
        totalPaid,
        totalRejected,
        employeesWithCommissions: byEmployee.size,
        ordersWithCommissions: records.length,
        averageCommissionRate: avgPercentage,
      },
      byEmployee: Array.from(byEmployee.values()).map((e) => ({
        ...e,
        averageCommission: e.totalCommissions / e.ordersCount,
      })),
      byPlan: Array.from(byPlan.values()).map((p) => ({
        planId: p.planId,
        planName: p.planName,
        totalCommissions: p.totalCommissions,
        employeesCount: p.employeesSet.size,
      })),
    };
  }

  /**
   * Obtener comisiones pendientes de aprobación
   */
  async getPendingCommissions(tenantId: string): Promise<CommissionRecord[]> {
    return this.commissionRecordModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        status: "pending",
      })
      .sort({ orderDate: -1 })
      .populate("employeeId", "firstName lastName")
      .limit(100);
  }
}
