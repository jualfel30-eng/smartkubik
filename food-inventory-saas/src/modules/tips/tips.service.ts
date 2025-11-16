import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  TipsDistributionRule,
  TipsDistributionRuleDocument,
} from "../../schemas/tips-distribution-rule.schema";
import {
  TipsReport,
  TipsReportDocument,
} from "../../schemas/tips-report.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import { Shift, ShiftDocument } from "../../schemas/shift.schema";
import {
  CreateTipsDistributionRuleDto,
  UpdateTipsDistributionRuleDto,
  DistributeTipsDto,
  RegisterTipsDto,
} from "../../dto/tips.dto";

@Injectable()
export class TipsService {
  private readonly logger = new Logger(TipsService.name);

  constructor(
    @InjectModel(TipsDistributionRule.name)
    private tipsDistributionRuleModel: Model<TipsDistributionRuleDocument>,
    @InjectModel(TipsReport.name)
    private tipsReportModel: Model<TipsReportDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
    @InjectModel(Shift.name)
    private shiftModel: Model<ShiftDocument>,
  ) {}

  // ========== Distribution Rules ==========

  async createDistributionRule(
    dto: CreateTipsDistributionRuleDto,
    tenantId: string,
  ): Promise<TipsDistributionRule> {
    const rule = new this.tipsDistributionRuleModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
    });

    return rule.save();
  }

  async findAllDistributionRules(
    tenantId: string,
  ): Promise<TipsDistributionRule[]> {
    return this.tipsDistributionRuleModel
      .find({ tenantId: new Types.ObjectId(tenantId) })
      .sort({ isActive: -1, createdAt: -1 })
      .exec();
  }

  async findActiveDistributionRule(
    tenantId: string,
  ): Promise<TipsDistributionRule | null> {
    return this.tipsDistributionRuleModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateDistributionRule(
    ruleId: string,
    dto: UpdateTipsDistributionRuleDto,
    tenantId: string,
  ): Promise<TipsDistributionRule> {
    const rule = await this.tipsDistributionRuleModel
      .findOneAndUpdate(
        { _id: ruleId, tenantId: new Types.ObjectId(tenantId) },
        dto,
        { new: true },
      )
      .exec();

    if (!rule) {
      throw new NotFoundException("Distribution rule not found");
    }

    return rule;
  }

  async deleteDistributionRule(
    ruleId: string,
    tenantId: string,
  ): Promise<void> {
    const result = await this.tipsDistributionRuleModel
      .deleteOne({ _id: ruleId, tenantId: new Types.ObjectId(tenantId) })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Distribution rule not found");
    }
  }

  // ========== Register Tips on Order ==========

  async registerTipsOnOrder(
    orderId: string,
    dto: RegisterTipsDto,
    tenantId: string,
  ): Promise<Order> {
    const order = await this.orderModel
      .findOne({ _id: orderId, tenantId })
      .exec();

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    // Agregar propina al registro
    order.tipsRecords.push({
      amount: dto.amount,
      method: dto.method,
      distributedAt: undefined,
    });

    // Actualizar total de propinas
    order.totalTipsAmount = order.tipsRecords.reduce(
      (sum, tip) => sum + tip.amount,
      0,
    );

    await order.save();

    this.logger.log(
      `Tips ${dto.amount} registered on order ${orderId} via ${dto.method}`,
    );

    return order;
  }

  // ========== Distribution Logic ==========

  async distributeTips(
    dto: DistributeTipsDto,
    tenantId: string,
  ): Promise<{
    totalTips: number;
    employeesIncluded: number;
    distribution: Array<{
      employeeId: string;
      name: string;
      amount: number;
      ordersServed: number;
      hoursWorked?: number;
      salesGenerated?: number;
    }>;
  }> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // 1. Obtener regla de distribución
    const rule = await this.tipsDistributionRuleModel
      .findOne({ _id: dto.distributionRuleId, tenantId: tenantObjectId })
      .exec();

    if (!rule) {
      throw new NotFoundException("Distribution rule not found");
    }

    // 2. Obtener órdenes del período con propinas no distribuidas
    const orders = await this.orderModel
      .find({
        tenantId,
        status: { $in: ["completed", "closed"] },
        createdAt: { $gte: startDate, $lte: endDate },
        totalTipsAmount: { $gt: 0 },
      })
      .populate("assignedWaiterId", "firstName lastName role")
      .exec();

    if (!orders.length) {
      throw new BadRequestException(
        "No orders with tips found in this period",
      );
    }

    // 3. Calcular total de propinas
    const totalTips = orders.reduce(
      (sum, order) => sum + order.totalTipsAmount,
      0,
    );

    // 4. Obtener empleados elegibles
    let eligibleEmployees: UserDocument[];

    if (dto.employeeIds && dto.employeeIds.length > 0) {
      eligibleEmployees = await this.userModel
        .find({
          _id: { $in: dto.employeeIds.map((id) => new Types.ObjectId(id)) },
          tenantId: tenantObjectId,
        })
        .exec();
    } else {
      // Filtrar por roles incluidos en la regla
      eligibleEmployees = await this.userModel
        .find({
          tenantId: tenantObjectId,
          role: { $in: rule.rules.includedRoles },
          isActive: true,
        })
        .exec();
    }

    if (!eligibleEmployees.length) {
      throw new BadRequestException("No eligible employees found");
    }

    // 5. Distribuir según el tipo de regla
    let distribution: Array<{
      employeeId: string;
      name: string;
      amount: number;
      ordersServed: number;
      hoursWorked?: number;
      salesGenerated?: number;
    }>;

    switch (rule.type) {
      case "equal":
        distribution = await this.distributeEqually(
          totalTips,
          eligibleEmployees,
          orders,
        );
        break;

      case "by-hours":
        distribution = await this.distributeByHours(
          totalTips,
          eligibleEmployees,
          orders,
          startDate,
          endDate,
        );
        break;

      case "by-sales":
        distribution = await this.distributeBySales(
          totalTips,
          eligibleEmployees,
          orders,
        );
        break;

      case "custom":
        throw new BadRequestException(
          "Custom distribution formulas not yet implemented",
        );

      default:
        throw new BadRequestException(`Unknown distribution type: ${rule.type}`);
    }

    // 6. Actualizar órdenes con la distribución
    for (const order of orders) {
      const distributionForOrder = distribution.map((d) => ({
        employeeId: new Types.ObjectId(d.employeeId),
        employeeName: d.name,
        amount: order.totalTipsAmount / distribution.length, // Simplificado por ahora
        distributedAt: new Date(),
      }));

      order.tipsRecords.forEach((tip) => {
        tip.distributedAt = new Date();
      });

      await order.save();
    }

    // 7. Crear registros de TipsReport para cada empleado
    for (const dist of distribution) {
      await this.createOrUpdateTipsReport({
        tenantId: tenantObjectId,
        employeeId: new Types.ObjectId(dist.employeeId),
        period: { start: startDate, end: endDate },
        totalTips: dist.amount,
        ordersServed: dist.ordersServed,
        status: "distributed",
      });
    }

    this.logger.log(
      `Distributed ${totalTips} in tips to ${distribution.length} employees`,
    );

    return {
      totalTips,
      employeesIncluded: distribution.length,
      distribution,
    };
  }

  // Distribución equitativa
  private async distributeEqually(
    totalTips: number,
    employees: UserDocument[],
    orders: OrderDocument[],
  ): Promise<
    Array<{
      employeeId: string;
      name: string;
      amount: number;
      ordersServed: number;
    }>
  > {
    const amountPerEmployee = totalTips / employees.length;

    return employees.map((emp) => {
      const ordersServed = orders.filter(
        (o) => o.assignedWaiterId?.toString() === emp._id.toString(),
      ).length;

      return {
        employeeId: emp._id.toString(),
        name: `${emp.firstName} ${emp.lastName}`,
        amount: Number(amountPerEmployee.toFixed(2)),
        ordersServed,
      };
    });
  }

  // Distribución por horas trabajadas
  private async distributeByHours(
    totalTips: number,
    employees: UserDocument[],
    orders: OrderDocument[],
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      employeeId: string;
      name: string;
      amount: number;
      ordersServed: number;
      hoursWorked: number;
    }>
  > {
    // Obtener turnos de cada empleado en el período
    const employeeHours = await Promise.all(
      employees.map(async (emp) => {
        const shifts = await this.shiftModel
          .find({
            employeeId: emp._id,
            date: { $gte: startDate, $lte: endDate },
            status: "completed",
          })
          .exec();

        const totalHours = shifts.reduce((sum, shift) => {
          if (shift.clockIn && shift.clockOut) {
            const hours =
              (shift.clockOut.getTime() - shift.clockIn.getTime()) /
              (1000 * 60 * 60);
            return sum + hours;
          }
          return sum;
        }, 0);

        const ordersServed = orders.filter(
          (o) => o.assignedWaiterId?.toString() === emp._id.toString(),
        ).length;

        return {
          employeeId: emp._id.toString(),
          name: `${emp.firstName} ${emp.lastName}`,
          hoursWorked: totalHours,
          ordersServed,
        };
      }),
    );

    const totalHours = employeeHours.reduce(
      (sum, emp) => sum + emp.hoursWorked,
      0,
    );

    if (totalHours === 0) {
      throw new BadRequestException(
        "No hours worked found for employees in this period",
      );
    }

    return employeeHours.map((emp) => ({
      ...emp,
      amount: Number(((emp.hoursWorked / totalHours) * totalTips).toFixed(2)),
    }));
  }

  // Distribución por ventas generadas
  private async distributeBySales(
    totalTips: number,
    employees: UserDocument[],
    orders: OrderDocument[],
  ): Promise<
    Array<{
      employeeId: string;
      name: string;
      amount: number;
      ordersServed: number;
      salesGenerated: number;
    }>
  > {
    const employeeSales = employees.map((emp) => {
      const empOrders = orders.filter(
        (o) => o.assignedWaiterId?.toString() === emp._id.toString(),
      );

      const salesGenerated = empOrders.reduce(
        (sum, order) => sum + order.totalAmount,
        0,
      );

      return {
        employeeId: emp._id.toString(),
        name: `${emp.firstName} ${emp.lastName}`,
        ordersServed: empOrders.length,
        salesGenerated,
      };
    });

    const totalSales = employeeSales.reduce(
      (sum, emp) => sum + emp.salesGenerated,
      0,
    );

    if (totalSales === 0) {
      throw new BadRequestException("No sales found for employees");
    }

    return employeeSales.map((emp) => ({
      ...emp,
      amount: Number(((emp.salesGenerated / totalSales) * totalTips).toFixed(2)),
    }));
  }

  // ========== Tips Reports ==========

  private async createOrUpdateTipsReport(data: {
    tenantId: Types.ObjectId;
    employeeId: Types.ObjectId;
    period: { start: Date; end: Date };
    totalTips: number;
    ordersServed: number;
    status: string;
  }): Promise<TipsReport> {
    // Buscar si ya existe un reporte para este empleado y período
    const existing = await this.tipsReportModel
      .findOne({
        tenantId: data.tenantId,
        employeeId: data.employeeId,
        "period.start": data.period.start,
        "period.end": data.period.end,
      })
      .exec();

    if (existing) {
      existing.totalTips += data.totalTips;
      existing.ordersServed += data.ordersServed;
      existing.status = data.status;
      return existing.save();
    }

    const report = new this.tipsReportModel(data);
    return report.save();
  }

  async getTipsReportForEmployee(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<TipsReport> {
    const tenantObjectId = new Types.ObjectId(tenantId);
    const employeeObjectId = new Types.ObjectId(employeeId);

    // Buscar si existe un reporte consolidado
    let report = await this.tipsReportModel
      .findOne({
        tenantId: tenantObjectId,
        employeeId: employeeObjectId,
        "period.start": startDate,
        "period.end": endDate,
      })
      .exec();

    if (!report) {
      // Generar reporte en tiempo real
      const orders = await this.orderModel
        .find({
          tenantId,
          assignedWaiterId: employeeObjectId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ["completed", "closed"] },
        })
        .exec();

      const totalTips = orders.reduce((sum, order) => {
        const empTips = order.tipsRecords
          .filter(
            (tip) => tip.employeeId?.toString() === employeeObjectId.toString(),
          )
          .reduce((tipSum, tip) => tipSum + tip.amount, 0);
        return sum + empTips;
      }, 0);

      const tipsByCash = orders.reduce((sum, order) => {
        const cashTips = order.tipsRecords
          .filter(
            (tip) =>
              tip.method === "cash" &&
              tip.employeeId?.toString() === employeeObjectId.toString(),
          )
          .reduce((tipSum, tip) => tipSum + tip.amount, 0);
        return sum + cashTips;
      }, 0);

      const tipsByCard = orders.reduce((sum, order) => {
        const cardTips = order.tipsRecords
          .filter(
            (tip) =>
              tip.method === "card" &&
              tip.employeeId?.toString() === employeeObjectId.toString(),
          )
          .reduce((tipSum, tip) => tipSum + tip.amount, 0);
        return sum + cardTips;
      }, 0);

      report = new this.tipsReportModel({
        tenantId: tenantObjectId,
        employeeId: employeeObjectId,
        period: { start: startDate, end: endDate },
        totalTips,
        tipsByCash,
        tipsByCard,
        ordersServed: orders.length,
        averageTipPerOrder: orders.length > 0 ? totalTips / orders.length : 0,
        status: "pending",
      });
    }

    return report;
  }

  async getConsolidatedReport(
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<{
    totalTips: number;
    totalOrders: number;
    averageTipPerOrder: number;
    tipPercentage: number;
    byEmployee: Array<{
      employeeId: string;
      name: string;
      totalTips: number;
      orders: number;
    }>;
    byDay: Array<{ date: string; tips: number; orders: number }>;
    byMethod: { cash: number; card: number; digital: number };
  }> {
    const orders = await this.orderModel
      .find({
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ["completed", "closed"] },
        totalTipsAmount: { $gt: 0 },
      })
      .populate("assignedWaiterId", "firstName lastName")
      .exec();

    const totalTips = orders.reduce(
      (sum, order) => sum + order.totalTipsAmount,
      0,
    );
    const totalOrders = orders.length;
    const totalSales = orders.reduce((sum, order) => sum + order.totalAmount, 0);

    // Por empleado
    const employeeMap = new Map<
      string,
      { name: string; totalTips: number; orders: number }
    >();

    orders.forEach((order) => {
      if (order.assignedWaiterId) {
        const empId = order.assignedWaiterId._id.toString();
        if (!employeeMap.has(empId)) {
          employeeMap.set(empId, {
            name: `${order.assignedWaiterId.firstName} ${order.assignedWaiterId.lastName}`,
            totalTips: 0,
            orders: 0,
          });
        }
        const emp = employeeMap.get(empId)!;
        emp.totalTips += order.totalTipsAmount;
        emp.orders++;
      }
    });

    const byEmployee = Array.from(employeeMap.entries()).map(
      ([employeeId, data]) => ({
        employeeId,
        ...data,
      }),
    );

    // Por día
    const dayMap = new Map<string, { tips: number; orders: number }>();
    orders.forEach((order) => {
      const day = order.createdAt.toISOString().split("T")[0];
      if (!dayMap.has(day)) {
        dayMap.set(day, { tips: 0, orders: 0 });
      }
      const dayData = dayMap.get(day)!;
      dayData.tips += order.totalTipsAmount;
      dayData.orders++;
    });

    const byDay = Array.from(dayMap.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Por método
    let cash = 0,
      card = 0,
      digital = 0;
    orders.forEach((order) => {
      order.tipsRecords.forEach((tip) => {
        if (tip.method === "cash") cash += tip.amount;
        else if (tip.method === "card") card += tip.amount;
        else if (tip.method === "digital") digital += tip.amount;
      });
    });

    return {
      totalTips,
      totalOrders,
      averageTipPerOrder: totalOrders > 0 ? totalTips / totalOrders : 0,
      tipPercentage: totalSales > 0 ? (totalTips / totalSales) * 100 : 0,
      byEmployee,
      byDay,
      byMethod: { cash, card, digital },
    };
  }
}
