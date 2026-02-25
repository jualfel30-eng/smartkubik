import {
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { Tenant, TenantDocument } from "../../../schemas/tenant.schema";
import {
  BankAccount,
  BankAccountDocument,
} from "../../../schemas/bank-account.schema";
import { BulkRegisterPaymentsDto } from "../../../dto/order.dto";
import { PaymentsService } from "../../payments/payments.service";
import { InventoryMovementsService } from "../../inventory/inventory-movements.service";
import { TablesService } from "../../tables/tables.service";
import { OrderInventoryService } from "./order-inventory.service";
import { OrderFulfillmentService } from "./order-fulfillment.service";

@Injectable()
export class OrderPaymentsService {
  private readonly logger = new Logger(OrderPaymentsService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(BankAccount.name)
    private bankAccountModel: Model<BankAccountDocument>,
    private readonly paymentsService: PaymentsService,
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly tablesService: TablesService,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getPaymentMethods(user: any): Promise<any> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    const tenantCurrency = tenant.settings?.currency?.primary || "USD";
    const ccLabel = tenantCurrency === "EUR" ? "EUR" : "USD";

    const foreignMethods = [
      {
        id: "efectivo_usd",
        name: `Efectivo (${ccLabel})`,
        igtfApplicable: true,
      },
      {
        id: "transferencia_usd",
        name: `Transferencia (${ccLabel})`,
        igtfApplicable: true,
      },
      ...(tenantCurrency !== "EUR"
        ? [{ id: "zelle_usd", name: "Zelle (USD)", igtfApplicable: true }]
        : []),
    ];

    const baseMethods = [
      ...foreignMethods,
      { id: "efectivo_ves", name: "Efectivo (VES)", igtfApplicable: false },
      {
        id: "transferencia_ves",
        name: "Transferencia (VES)",
        igtfApplicable: false,
      },
      {
        id: "pago_movil_ves",
        name: "Pago Móvil (VES)",
        igtfApplicable: false,
      },
      { id: "pos_ves", name: "Punto de Venta (VES)", igtfApplicable: false },
      { id: "tarjeta_ves", name: "Tarjeta (VES)", igtfApplicable: false },
      { id: "pago_mixto", name: "Pago Mixto", igtfApplicable: false },
    ];

    const configuredMethods = tenant.settings?.paymentMethods;
    if (configuredMethods && configuredMethods.length > 0) {
      const enabledMap = new Map(
        configuredMethods.filter((m) => m.enabled).map((m) => [m.id, m]),
      );

      const activeMethods = baseMethods
        .filter((method) => enabledMap.has(method.id))
        .map((method) => {
          const config = enabledMap.get(method.id);
          return {
            ...method,
            enabled: true,
            instructions: config?.instructions,
            details: config?.details,
          };
        });

      return { methods: activeMethods };
    }

    return { methods: baseMethods };
  }

  async registerPayments(
    orderId: string,
    bulkRegisterPaymentsDto: BulkRegisterPaymentsDto,
    user: any,
    findOneCallback: (id: string, tenantId: string) => Promise<OrderDocument | null>,
  ): Promise<OrderDocument> {
    this.logger.log(`Registering payments for order ${orderId}`);
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }
    const tenantForCurrency = (await this.tenantModel
      .findById(user.tenantId)
      .select("settings.currency")
      .lean()) as any;
    const tenantCurrency =
      tenantForCurrency?.settings?.currency?.primary || "USD";
    const existingOutMovements =
      await this.inventoryMovementsService.hasOutMovementsForOrder(
        order._id.toString(),
        user.tenantId,
      );

    const paymentIdsToAdd: Types.ObjectId[] = [];
    const createdPaymentDocs: any[] = [];

    await Promise.all(
      bulkRegisterPaymentsDto.payments.map(async (p) => {
        try {
          const idempotencyKey =
            p.idempotencyKey ||
            (p.reference ? `${orderId}-${p.reference}` : undefined);

          let usdAmount = p.amount;
          let vesAmount = p.amountVes;
          const rate = p.exchangeRate || 1;
          const isVes = p.currency === "VES" || p.currency === "Bs";

          if (isVes) {
            if (!vesAmount && usdAmount) {
              vesAmount = usdAmount;
              usdAmount = vesAmount / (rate > 0 ? rate : 1);
            } else if (vesAmount && usdAmount === vesAmount) {
              usdAmount = vesAmount / (rate > 0 ? rate : 1);
            }
          } else {
            if (usdAmount && !vesAmount) {
              vesAmount = usdAmount * rate;
            }
          }

          const paymentDto: any = {
            paymentType: "sale",
            orderId: orderId,
            date: p.date
              ? new Date(p.date).toISOString()
              : new Date().toISOString(),
            amount: usdAmount,
            amountVes: vesAmount,
            exchangeRate: rate,
            method: p.method,
            currency: p.currency || tenantCurrency,
            reference: p.reference || "",
            bankAccountId: p.bankAccountId,
            amountTendered: (p as any).amountTendered,
            changeGiven: (p as any).changeGiven,
            changeGivenBreakdown: (p as any).changeGivenBreakdown,
            customerId: order.customerId
              ? order.customerId.toString()
              : undefined,
            status: p.isConfirmed ? "confirmed" : "pending_validation",
            idempotencyKey:
              idempotencyKey ||
              (p.reference ? `${orderId}-${p.reference}` : undefined),
            allocations: [
              {
                documentId: orderId,
                documentType: "order",
                amount: usdAmount,
              },
            ],
            fees: p.igtf ? { igtf: p.igtf } : undefined,
          };

          const paymentDoc = await this.paymentsService.create(
            paymentDto,
            user,
          );
          paymentIdsToAdd.push(paymentDoc._id);
          createdPaymentDocs.push(paymentDoc);
        } catch (err) {
          this.logger.warn(
            `No se pudo crear Payment de colección para orden ${orderId}: ${err.message}`,
          );
        }
      }),
    );

    this.logger.log(
      `Created ${createdPaymentDocs.length} payment documents for order ${orderId}`,
    );

    const newPaymentRecords = createdPaymentDocs.map((paymentDoc) => {
      const igtf = paymentDoc.fees?.igtf || 0;
      this.logger.log(
        `Payment ${paymentDoc._id}: method=${paymentDoc.method}, amount=${paymentDoc.amount}, IGTF=${igtf}`,
      );

      return {
        method: paymentDoc.method,
        amount: paymentDoc.amount,
        amountVes: paymentDoc.amountVes,
        exchangeRate: paymentDoc.exchangeRate,
        currency: paymentDoc.currency || tenantCurrency,
        reference: paymentDoc.reference || "",
        date: paymentDoc.date,
        isConfirmed: paymentDoc.status === "confirmed",
        bankAccountId: paymentDoc.bankAccountId,
        confirmedAt: paymentDoc.confirmedAt,
        confirmedMethod:
          paymentDoc.status === "confirmed" ? paymentDoc.method : undefined,
        igtf: igtf,
        amountTendered: paymentDoc.amountTendered,
        changeGiven: paymentDoc.changeGiven,
        changeGivenBreakdown: paymentDoc.changeGivenBreakdown,
      };
    });

    const mergedPaymentRecords = [
      ...(order.paymentRecords || []),
      ...newPaymentRecords,
    ];

    const totalPaidUSD = mergedPaymentRecords.reduce(
      (sum, p) => sum + (p.amount || 0) + (p.igtf || 0),
      0,
    );
    const totalPaidVES = mergedPaymentRecords.reduce(
      (sum, p) => sum + (p.amountVes || 0),
      0,
    );
    const paidAmount = totalPaidUSD;
    const paidAmountVes = totalPaidVES;

    const wasNotPaidBefore = order.paymentStatus !== "paid";

    const totalIgtf = mergedPaymentRecords.reduce((sum, record) => {
      return sum + (record.igtf || 0);
    }, 0);

    this.logger.log(
      `Total IGTF calculated for order ${orderId}: ${totalIgtf}`,
    );

    const updatedTotalAmount =
      order.subtotal +
      order.ivaTotal +
      totalIgtf +
      (order.shippingCost || 0);

    this.logger.log(
      `Order ${orderId} - Updated totals: subtotal=${order.subtotal}, IVA=${order.ivaTotal}, IGTF=${totalIgtf}, total=${updatedTotalAmount}`,
    );

    const newPaymentStatus =
      totalPaidUSD >= updatedTotalAmount - 0.01
        ? "paid"
        : totalPaidUSD > 0
          ? "partial"
          : order.paymentStatus;

    const update: any = {
      paymentRecords: mergedPaymentRecords,
      paidAmount,
      paidAmountVes,
      paymentStatus: newPaymentStatus,
      igtfTotal: totalIgtf,
      totalAmount: updatedTotalAmount,
      updatedBy: user.id,
    };
    const addToSet: any = {};
    if (paymentIdsToAdd.length > 0) {
      addToSet.payments = { $each: paymentIdsToAdd };
    }

    await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        $set: update,
        ...(paymentIdsToAdd.length > 0 ? { $addToSet: addToSet } : {}),
      },
      { new: true },
    );

    // Post-payment: if order just became fully paid
    if (wasNotPaidBefore && newPaymentStatus === "paid") {
      this.logger.log(
        `Order ${order.orderNumber} fully paid. Triggering post-payment hooks...`,
      );

      const freshOrder = await this.orderModel
        .findById(orderId)
        .select("tableId deliveryMethod orderNumber")
        .lean();

      // Auto-clean table
      if (freshOrder?.tableId) {
        this.orderFulfillmentService.cleanupTable(freshOrder, user.tenantId);
      }
      if (order.tableId) {
        this.orderFulfillmentService.cleanupTable(order, user.tenantId);
      }

      // Deduct ingredients (backflush) in background
      setImmediate(async () => {
        try {
          await this.orderInventoryService.deductIngredientsFromSale(
            order,
            user,
          );
        } catch (error) {
          this.logger.error(
            `Background ingredient deduction failed for order ${order.orderNumber}: ${error.message}`,
          );
        }
      });

      // Emit order.paid event
      this.eventEmitter.emit("order.paid", {
        orderId: order._id.toString(),
        orderNumber: order.orderNumber,
        customerId: order.customerId?.toString(),
        customerName: order.customerName,
        totalAmount: updatedTotalAmount,
        paidAmount: totalPaidUSD,
        tenantId: user.tenantId,
        source: order.channel || "pos",
      });
    }

    const finalOrder = await findOneCallback(orderId, user.tenantId);
    if (!finalOrder) {
      throw new NotFoundException(
        "Error al registrar el pago, no se pudo encontrar la orden final.",
      );
    }

    // OUT movements when order becomes paid
    if (
      wasNotPaidBefore &&
      newPaymentStatus === "paid" &&
      !existingOutMovements
    ) {
      setImmediate(async () => {
        try {
          await this.orderInventoryService.createOutMovementsForPaidOrder(
            order,
            user,
          );
        } catch (err) {
          this.logger.error(
            `Failed to create OUT movements for order ${order.orderNumber}: ${err.message}`,
          );
        }
      });
    }

    return finalOrder;
  }

  async confirmPayment(
    orderId: string,
    paymentIndex: number,
    bankAccountId: string,
    confirmedMethod: string,
    user: any,
  ): Promise<OrderDocument> {
    this.logger.log(
      `Confirming payment ${paymentIndex} for order ${orderId}`,
    );

    let order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (!order.paymentRecords || !order.paymentRecords[paymentIndex]) {
      throw new NotFoundException("Pago no encontrado");
    }

    const paymentRecord = order.paymentRecords[paymentIndex];

    let usdAmount = paymentRecord.amount;
    let vesAmount = paymentRecord.amountVes;
    const rate = paymentRecord.exchangeRate || 1;
    const isVes =
      paymentRecord.currency === "VES" || paymentRecord.currency === "Bs";

    if (isVes) {
      if (!vesAmount && usdAmount) {
        vesAmount = usdAmount;
        usdAmount = vesAmount / (rate > 0 ? rate : 1);
      } else if (vesAmount && usdAmount === vesAmount) {
        usdAmount = vesAmount / (rate > 0 ? rate : 1);
      }
    } else {
      if (usdAmount && !vesAmount) {
        vesAmount = usdAmount * rate;
      }
    }

    this.logger.log(
      `Creating payment: USD=${usdAmount}, VES=${vesAmount}, Rate=${rate}, Currency=${paymentRecord.currency}`,
    );

    await this.paymentsService.create(
      {
        paymentType: "sale",
        orderId: order._id.toString(),
        amount: usdAmount,
        amountVes: vesAmount,
        currency: paymentRecord.currency || "USD",
        method: confirmedMethod,
        reference: paymentRecord.reference || "N/A",
        bankAccountId: bankAccountId,
        exchangeRate: rate,
        date: new Date().toISOString(),
        status: "confirmed",
      },
      user,
    );

    order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Order not found after payment creation");
    }

    if (order.paymentRecords && order.paymentRecords[paymentIndex]) {
      order.paymentRecords[paymentIndex].isConfirmed = true;
      order.paymentRecords[paymentIndex].bankAccountId = new Types.ObjectId(
        bankAccountId,
      );
      order.paymentRecords[paymentIndex].confirmedMethod = confirmedMethod;
      order.paymentRecords[paymentIndex].confirmedAt = new Date();
      await order.save();
    }

    return order;
  }

  async fixHistoricPayments(user: any) {
    const tenantId = user.tenantId;
    this.logger.log(
      `Starting historic payments migration for tenant ${tenantId}`,
    );

    const orders = await this.orderModel
      .find({
        tenantId,
        "paymentRecords.isConfirmed": true,
        $or: [
          { payments: { $size: 0 } },
          { payments: { $exists: false } },
          { paidAmount: 0 },
        ],
      })
      .limit(500);

    let fixedCount = 0;
    const errors: any[] = [];

    for (const order of orders) {
      this.logger.log(`Processing historic order ${order.orderNumber}`);
      try {
        for (const record of order.paymentRecords || []) {
          if (!record.isConfirmed) continue;

          let usdAmount = record.amount;
          let vesAmount = record.amountVes;
          const rate = record.exchangeRate || 1;
          const isVes =
            record.currency === "VES" || record.currency === "Bs";

          if (isVes) {
            if (!vesAmount && usdAmount) {
              vesAmount = usdAmount;
              usdAmount = vesAmount / (rate > 0 ? rate : 1);
            } else if (vesAmount && usdAmount === vesAmount) {
              usdAmount = vesAmount / (rate > 0 ? rate : 1);
            }
          } else {
            if (usdAmount && !vesAmount) {
              vesAmount = usdAmount * rate;
            }
          }

          await this.paymentsService.create(
            {
              paymentType: "sale",
              orderId: order._id.toString(),
              amount: usdAmount,
              amountVes: vesAmount,
              currency: record.currency || "USD",
              method: record.confirmedMethod || record.method || "unknown",
              reference: record.reference || `MIG-${order.orderNumber}`,
              bankAccountId: record.bankAccountId?.toString(),
              exchangeRate: rate,
              date: (
                record.confirmedAt ||
                record.date ||
                new Date()
              ).toISOString(),
              status: "confirmed",
            },
            user,
          );

          fixedCount++;
        }
      } catch (e) {
        this.logger.error(
          `Failed to fix order ${order.orderNumber}: ${e.message}`,
        );
        errors.push({ order: order.orderNumber, error: e.message });
      }
    }

    return {
      processed: orders.length,
      fixed: fixedCount,
      errors,
    };
  }

  async migrateDeliveryNotePaymentStatus(
    tenantId: string,
  ): Promise<{ updated: number; checked: number }> {
    const orders = await this.orderModel
      .find({
        tenantId,
        billingDocumentType: "delivery_note",
        paymentStatus: "partial",
      })
      .select("_id subtotal shippingCost paidAmount")
      .lean();

    let updated = 0;
    for (const order of orders) {
      const effectiveTotal =
        Number(order.subtotal || 0) +
        Number((order as any).shippingCost || 0);
      const paidAmount = Number(order.paidAmount || 0);
      if (paidAmount >= effectiveTotal - 0.01) {
        await this.orderModel.updateOne(
          { _id: order._id },
          { $set: { paymentStatus: "paid" } },
        );
        updated++;
      }
    }

    this.logger.log(
      `[Migration] migrateDeliveryNotePaymentStatus: checked=${orders.length}, updated=${updated}`,
    );
    return { updated, checked: orders.length };
  }
}
