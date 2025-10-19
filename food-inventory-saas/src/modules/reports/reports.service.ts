import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import * as moment from "moment-timezone";

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  async generateAccountsReceivableAging(tenantId: string, asOfDate?: string) {
    this.logger.log(`Generating A/R aging report for tenant ${tenantId}`);
    const endDate = asOfDate
      ? moment(asOfDate).endOf("day").toDate()
      : new Date();

    const unpaidOrders = await this.orderModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        paymentStatus: { $in: ["pending", "partial"] },
        createdAt: { $lte: endDate },
      })
      .populate("customerId", "name")
      .exec();

    const report = new Map<string, any>();

    for (const order of unpaidOrders) {
      const customer = order.customerId as any;
      if (!customer) continue;

      const customerId = customer._id.toString();
      const customerName = customer.name;
      const orderData: any = order;

      const paidAmount = (orderData.payments || [])
        .filter((p) => p.status === "confirmed")
        .reduce((sum, p) => sum + p.amount, 0);

      const balance = orderData.totalAmount - paidAmount;

      if (balance <= 0) continue;

      if (!report.has(customerId)) {
        report.set(customerId, {
          customerId,
          customerName,
          totalDue: 0,
          current: 0,
          "1-30": 0,
          "31-60": 0,
          "61-90": 0,
          ">90": 0,
        });
      }

      const customerReport = report.get(customerId);
      customerReport.totalDue += balance;

      const daysOverdue = moment(endDate).diff(
        moment(orderData.createdAt),
        "days",
      );

      if (daysOverdue <= 0) {
        // Should be current if not overdue
        customerReport.current += balance;
      } else if (daysOverdue <= 30) {
        customerReport["1-30"] += balance;
      } else if (daysOverdue <= 60) {
        customerReport["31-60"] += balance;
      } else if (daysOverdue <= 90) {
        customerReport["61-90"] += balance;
      } else {
        customerReport[">90"] += balance;
      }
    }

    const data = Array.from(report.values());
    const totals = {
      totalDue: data.reduce((sum, d) => sum + d.totalDue, 0),
      current: data.reduce((sum, d) => sum + d.current, 0),
      "1-30": data.reduce((sum, d) => sum + d["1-30"], 0),
      "31-60": data.reduce((sum, d) => sum + d["31-60"], 0),
      "61-90": data.reduce((sum, d) => sum + d["61-90"], 0),
      ">90": data.reduce((sum, d) => sum + d[">90"], 0),
    };

    return {
      asOfDate: endDate.toISOString().split("T")[0],
      data,
      totals,
    };
  }
}
