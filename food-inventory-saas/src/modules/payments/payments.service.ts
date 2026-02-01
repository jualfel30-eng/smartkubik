import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Payment, PaymentDocument } from "../../schemas/payment.schema";
import { Payable, PayableDocument } from "../../schemas/payable.schema";
import { Order, OrderDocument } from "../../schemas/order.schema";
import {
  BankTransaction,
  BankTransactionDocument,
} from "../../schemas/bank-transaction.schema";
import { CreatePaymentDto, PaymentStatus, ReconciliationStatus } from "../../dto/payment.dto";
import { AccountingService } from "../accounting/accounting.service";
import { BankAccountsService } from "../bank-accounts/bank-accounts.service";
import { BankTransactionsService } from "../bank-accounts/bank-transactions.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Payable.name) private payableModel: Model<PayableDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>, // Injected OrderModel
    @InjectModel(BankTransaction.name)
    private bankTransactionModel: Model<BankTransactionDocument>,
    private readonly accountingService: AccountingService,
    private readonly bankAccountsService: BankAccountsService,
    private readonly bankTransactionsService: BankTransactionsService,
  ) { }

  async getSummary(
    tenantId: string,
    query: {
      from?: string;
      to?: string;
      groupBy?: "method" | "status" | "currency";
    },
  ): Promise<
    Array<{
      key: string;
      totalAmount: number;
      count: number;
    }>
  > {
    const { from, to, groupBy = "method" } = query;
    const match: any = { tenantId };
    if (from || to) {
      match.date = {};
      if (from) match.date.$gte = new Date(from);
      if (to) match.date.$lte = new Date(to);
    }

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: `$${groupBy}`,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 as 1 | -1 } },
    ];

    const result = await this.paymentModel.aggregate(pipeline).exec();
    return result.map((r) => ({
      key: r._id || "N/A",
      totalAmount: r.totalAmount,
      count: r.count,
    }));
  }

  async getAging(
    tenantId: string,
    query: { asOf?: string; buckets?: string },
  ): Promise<
    Array<{
      bucket: string;
      amount: number;
      count: number;
    }>
  > {
    const asOfDate = query.asOf ? new Date(query.asOf) : new Date();
    const bucketEdges = query.buckets
      ?.split(",")
      .map((v) => Number(v.trim()))
      .filter((v) => !Number.isNaN(v))
      .sort((a, b) => a - b) || [30, 60, 90];

    // Aging simple: usa fecha de payment y agrupa por días transcurridos hasta asOf
    const pipeline = [
      { $match: { tenantId } },
      {
        $project: {
          amount: 1,
          days: {
            $divide: [{ $subtract: [asOfDate, "$date"] }, 1000 * 60 * 60 * 24],
          },
        },
      },
      {
        $bucket: {
          groupBy: "$days",
          boundaries: [
            Number.NEGATIVE_INFINITY,
            ...bucketEdges,
            Number.POSITIVE_INFINITY,
          ],
          default: ">last",
          output: {
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      },
    ];

    const agg = await this.paymentModel.aggregate(pipeline as any[]).exec();

    const labels: string[] = [];
    let prev = -Infinity;
    for (const edge of bucketEdges) {
      labels.push(prev === -Infinity ? `0-${edge}` : `${prev + 1}-${edge}`);
      prev = edge;
    }
    labels.push(`>${prev}`);

    // Map results to readable buckets
    return agg.map((entry) => {
      const idx = agg.indexOf(entry);
      return {
        bucket: labels[idx] || labels[labels.length - 1],
        amount: entry.amount,
        count: entry.count,
      };
    });
  }

  async applyAllocations(
    paymentId: string,
    allocations: Array<{
      documentId: string;
      documentType: string;
      amount: number;
    }>,
    user: any,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      tenantId: user.tenantId,
    });
    if (!payment) {
      throw new NotFoundException("Pago no encontrado");
    }

    const normalizedAllocations =
      allocations?.map((a) => ({
        documentId: new Types.ObjectId(a.documentId),
        documentType: a.documentType,
        amount: a.amount,
      })) || [];

    payment.allocations = normalizedAllocations;
    await payment.save();

    // Reconstruir pagos aplicados por documento (órdenes y cuentas por pagar)
    const orderIds = normalizedAllocations
      .filter((a) => a.documentType === "order")
      .map((a) => a.documentId.toString());
    const payableIds = normalizedAllocations
      .filter((a) => a.documentType === "payable")
      .map((a) => a.documentId.toString());

    // Actualizar órdenes: recalcula montos pagados en base a allocations
    for (const orderId of Array.from(new Set(orderIds))) {
      const oid = new Types.ObjectId(orderId);
      const agg = await this.paymentModel
        .aggregate([
          { $match: { tenantId: user.tenantId, "allocations.documentId": oid } },
          { $unwind: "$allocations" },
          { $match: { "allocations.documentId": oid } },
          {
            $group: {
              _id: null,
              total: { $sum: "$allocations.amount" },
            },
          },
        ])
        .exec();
      const totalAlloc = agg?.[0]?.total || 0;
      const order = await this.orderModel.findById(oid);
      if (order) {
        const paymentStatus =
          totalAlloc >= Number(order.totalAmount || 0)
            ? "paid"
            : totalAlloc > 0
              ? "partial"
              : order.paymentStatus;
        order.paidAmount = totalAlloc;
        order.paymentStatus = paymentStatus;
        if (
          !order.payments?.some((p) => p.toString() === payment._id.toString())
        ) {
          order.payments = order.payments || [];
          order.payments.push(payment._id);
        }
        await order.save();
      }
    }

    // Actualizar payables: recalcula montos pagados en base a allocations
    for (const payableId of Array.from(new Set(payableIds))) {
      const pid = new Types.ObjectId(payableId);
      const agg = await this.paymentModel
        .aggregate([
          { $match: { tenantId: user.tenantId, "allocations.documentId": pid } },
          { $unwind: "$allocations" },
          { $match: { "allocations.documentId": pid } },
          {
            $group: {
              _id: null,
              total: { $sum: "$allocations.amount" },
            },
          },
        ])
        .exec();
      const totalAlloc = agg?.[0]?.total || 0;
      const payable = await this.payableModel.findById(pid);
      if (payable) {
        const remaining = Math.max(
          0,
          Number(payable.totalAmount || 0) - Number(totalAlloc || 0),
        );
        payable.paidAmount = Number(totalAlloc || 0);
        payable.status =
          remaining <= 0.01
            ? "paid"
            : payable.paidAmount > 0
              ? "partially_paid"
              : "open";
        await payable.save();
      }
    }

    return payment;
  }

  async updateStatus(
    paymentId: string,
    nextStatus: PaymentStatus,
    user: any,
    reason?: string,
  ): Promise<PaymentDocument> {
    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      tenantId: user.tenantId,
    });
    if (!payment) {
      throw new NotFoundException("Pago no encontrado");
    }

    const validStatuses: PaymentStatus[] = [
      "draft",
      "pending_validation",
      "confirmed",
      "failed",
      "reversed",
      "refunded",
    ];
    if (!validStatuses.includes(nextStatus)) {
      throw new BadRequestException("Estado de pago no permitido");
    }

    // Transiciones permitidas básicas
    const allowedTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      draft: ["pending_validation", "confirmed", "failed"],
      pending_validation: ["confirmed", "failed"],
      confirmed: ["reversed", "refunded"],
      failed: [],
      reversed: [],
      refunded: [],
    };

    const currentStatus = payment.status as PaymentStatus;
    const allowed = allowedTransitions[currentStatus] || [];
    if (!allowed.includes(nextStatus)) {
      throw new BadRequestException(
        `Transición no permitida de ${currentStatus} a ${nextStatus}`,
      );
    }

    payment.status = nextStatus;
    if (nextStatus === "confirmed") {
      payment.confirmedAt = new Date();
      payment.confirmedBy = new Types.ObjectId(user.id);
    }

    // Historial de estados
    payment.statusHistory = payment.statusHistory || [];
    payment.statusHistory.push({
      status: nextStatus,
      reason,
      changedAt: new Date(),
      changedBy: user?.id ? new Types.ObjectId(user.id) : undefined,
    });

    // Guardar motivo en metadata genérica
    const note = reason ? `status change: ${reason}` : undefined;
    if (note) {
      (payment as any).notes = note;
    }

    await payment.save();
    return payment;
  }

  async reconcile(
    paymentId: string,
    status: ReconciliationStatus,
    user: any,
    statementRef?: string,
    note?: string,
  ): Promise<PaymentDocument> {
    const requireNote = status === "manual" || status === "rejected";
    if (requireNote && !note) {
      throw new BadRequestException(
        "Debe especificar un motivo al marcar la conciliación como manual o rechazada",
      );
    }

    const payment = await this.paymentModel.findOne({
      _id: paymentId,
      tenantId: user.tenantId,
    });
    if (!payment) {
      throw new NotFoundException("Pago no encontrado");
    }

    // Auditoría
    payment.reconciliationStatus = status;
    payment.statementRef = statementRef;
    payment.reconciledAt = new Date();
    payment.reconciledBy = new Types.ObjectId(user.id);

    payment.statusHistory = payment.statusHistory || [];
    payment.statusHistory.push({
      status: `reconciliation:${status}`,
      reason: note,
      changedAt: new Date(),
      changedBy: new Types.ObjectId(user.id),
    });

    // Actualizar movimiento bancario vinculado (si existe)
    const tx = await this.bankTransactionModel.findOne({
      tenantId: user.tenantId,
      paymentId: payment._id,
    });
    if (tx) {
      tx.reconciliationStatus =
        status === "matched" ? "matched" : status === "manual" ? "manually_matched" : status;
      tx.reconciled = status === "matched" || status === "manual";
      tx.reconciledAt = new Date();
      if (statementRef) {
        tx.statementTransactionId = statementRef as any;
      }
      await tx.save();
    }

    await payment.save();
    return payment;
  }

  async create(dto: CreatePaymentDto, user: any): Promise<PaymentDocument> {
    const {
      paymentType,
      orderId,
      payableId,
      idempotencyKey,
      allocations,
      fees,
      status,
      customerId,
      ...paymentDetails
    } = dto;

    if (paymentDetails.bankAccountId && !paymentDetails.reference) {
      throw new BadRequestException(
        "La referencia es obligatoria para pagos asociados a cuenta bancaria",
      );
    }
    const methodsRequiringReference = ["transferencia", "pago_movil", "pos"];
    if (
      paymentDetails.method &&
      methodsRequiringReference.includes(paymentDetails.method) &&
      !paymentDetails.reference
    ) {
      throw new BadRequestException(
        "La referencia es obligatoria para pagos con métodos bancarios",
      );
    }
    const { tenantId, id: userId } = user;

    // Permitir anticipos (sin documento) siempre que existan allocations o customerId
    if (!orderId && !payableId && (!allocations || allocations.length === 0)) {
      throw new BadRequestException(
        "El pago debe apuntar a una orden, un payable o traer allocations.",
      );
    }

    // Idempotencia básica por tenant + idempotencyKey
    if (idempotencyKey) {
      const existing = await this.paymentModel.findOne({
        tenantId,
        idempotencyKey,
      });
      if (existing) {
        this.logger.warn(
          `Idempotent payment detected (tenant=${tenantId}, key=${idempotencyKey}). Returning existing ${existing._id}`,
        );
        return existing;
      }
    }

    // Idempotencia por referencia+method+documento (cuando no hay idempotencyKey)
    if (!idempotencyKey && orderId && paymentDetails.reference) {
      const existingRef = await this.paymentModel.findOne({
        tenantId,
        orderId: new Types.ObjectId(orderId),
        reference: paymentDetails.reference,
        method: paymentDetails.method,
        amount: paymentDetails.amount,
      });
      if (existingRef) {
        this.logger.warn(
          `Duplicate payment prevented by reference/method for order ${orderId} ref=${paymentDetails.reference}`,
        );
        return existingRef;
      }
    }

    // Resolver estado inicial
    // Resolved status con validación
    const validStatuses: PaymentStatus[] = [
      "draft",
      "pending_validation",
      "confirmed",
      "failed",
      "reversed",
      "refunded",
    ];
    const resolvedStatus: PaymentStatus =
      status && validStatuses.includes(status as PaymentStatus)
        ? (status as PaymentStatus)
        : "confirmed";

    const autoReconcileEnabled =
      (process.env.PAYMENTS_AUTO_RECONCILE || "false").toLowerCase() === "true";
    const autoReconciliate = !!paymentDetails.bankAccountId && autoReconcileEnabled;
    const initialReconciliationStatus =
      paymentDetails.reconciliationStatus || (autoReconciliate ? "matched" : "pending");

    // Calculate IGTF automatically for foreign currency payments
    let calculatedFees = { ...fees };
    const igtfApplicableMethods = [
      'efectivo_usd',
      'transferencia_usd',
      'zelle_usd'
    ];
    const shouldApplyIgtf = igtfApplicableMethods.includes(paymentDetails.method);

    if (shouldApplyIgtf) {
      const igtfRate = 0.03; // 3% IGTF - TODO: Load from TaxSettings
      const igtfAmount = paymentDetails.amount * igtfRate;
      calculatedFees = {
        ...calculatedFees,
        igtf: igtfAmount,
      };
      this.logger.log(
        `IGTF calculated for payment: method=${paymentDetails.method}, amount=${paymentDetails.amount}, igtf=${igtfAmount}`,
      );
    }

    // === Cash Tender & Change Validation ===
    const isCashPayment = paymentDetails.method?.toLowerCase().includes('efectivo') ||
      paymentDetails.method?.toLowerCase().includes('cash');

    if (isCashPayment && paymentDetails.amountTendered) {
      // Validate that tender amount is sufficient
      if (paymentDetails.amountTendered < paymentDetails.amount) {
        throw new BadRequestException(
          `Amount tendered ($${paymentDetails.amountTendered}) is less than payment amount ($${paymentDetails.amount})`
        );
      }

      // Calculate change if not provided
      if (paymentDetails.changeGiven === undefined || paymentDetails.changeGiven === null) {
        // Determine the amount to subtract based on currency
        const isVesPayment = paymentDetails.currency === 'VES' || paymentDetails.method?.toLowerCase().includes('ves');
        const amountToSubtract = isVesPayment
          ? (paymentDetails.amountVes || (paymentDetails.amount * (paymentDetails.exchangeRate || 1)))
          : paymentDetails.amount;

        paymentDetails.changeGiven = paymentDetails.amountTendered - amountToSubtract;

        this.logger.log(
          `Auto-calculated change: tendered=${paymentDetails.amountTendered}, amountToPay=${amountToSubtract} (${isVesPayment ? 'VES' : 'USD'}), change=${paymentDetails.changeGiven}`
        );
      }
    } else if (isCashPayment && !paymentDetails.amountTendered) {
      // Legacy cash payment without tender tracking - assume exact payment
      paymentDetails.amountTendered = paymentDetails.amount;
      paymentDetails.changeGiven = 0;
      paymentDetails.isLegacyPayment = true;
    }

    // === Mixed Change Validation (USD + VES) ===
    if (paymentDetails.changeGivenBreakdown) {
      // Only allow breakdown for cash payments
      if (!isCashPayment) {
        throw new BadRequestException(
          'Change breakdown is only allowed for cash payments'
        );
      }

      const { usd, ves, vesMethod } = paymentDetails.changeGivenBreakdown;

      // Validar que la suma coincida (convirtiendo VES a USD si aplica)
      const rate = paymentDetails.exchangeRate && paymentDetails.exchangeRate > 0
        ? paymentDetails.exchangeRate
        : 1;

      const vesInUsd = ves ? (ves / rate) : 0;
      const breakdownTotal = (usd || 0) + vesInUsd;

      // Tolerancia amplia para evitar bloqueo por redondeo
      const tolerance = 0.50;

      if (Math.abs(breakdownTotal - (paymentDetails.changeGiven || 0)) > tolerance) {
        // CAMBIO CRÍTICO: Solo advertir, NO bloquear la venta.
        this.logger.warn(
          `Change breakdown mismatch (non-blocking): USD=$${usd} + VES=${ves} (~$${vesInUsd.toFixed(2)}) = $${breakdownTotal.toFixed(2)} vs Given=$${paymentDetails.changeGiven}`
        );
      }

      // Validate VES method if VES amount is provided
      if (ves && ves > 0 && !vesMethod) {
        // También relajar esto a advertencia por ahora
        this.logger.warn('vesMethod missing for VES change component');
      }

      this.logger.log(
        `Mixed change breakdown accepted: USD=$${usd}, VES=Bs${ves}, method=${vesMethod || 'N/A'}`
      );
    }



    // Create and save the core payment document first
    const newPayment = new this.paymentModel({
      ...paymentDetails,
      paymentType,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      payableId: payableId ? new Types.ObjectId(payableId) : undefined,
      customerId: customerId ? new Types.ObjectId(customerId) : undefined,
      tenantId,
      createdBy: userId,
      confirmedBy: userId,
      confirmedAt: new Date(),
      status: resolvedStatus,
      reconciliationStatus: initialReconciliationStatus,
      reconciledAt: autoReconciliate ? new Date() : undefined,
      reconciledBy: autoReconciliate ? new Types.ObjectId(userId) : undefined,
      statusHistory: [
        {
          status: resolvedStatus,
          changedAt: new Date(),
          changedBy: new Types.ObjectId(userId),
        },
      ],
      idempotencyKey,
      allocations:
        allocations?.map((a) => ({
          documentId: new Types.ObjectId(a.documentId),
          documentType: a.documentType,
          amount: a.amount,
        })) || [],
      fees: calculatedFees,
    });
    await newPayment.save();
    if (autoReconciliate) {
      newPayment.statusHistory = newPayment.statusHistory || [];
      newPayment.statusHistory.push({
        status: "reconciliation:matched",
        reason: "Auto-conciliado al seleccionar cuenta bancaria",
        changedAt: new Date(),
        changedBy: new Types.ObjectId(userId),
      });
      await newPayment.save();
    }
    this.logger.log(
      `Created new payment document ${newPayment._id} of type ${paymentType}`,
    );
    this.logger.debug(
      `🔍 [DEBUG] Payment saved with: payableId=${newPayment.payableId}, orderId=${newPayment.orderId}, amount=${newPayment.amount}`,
    );

    // Handle the specific logic for each payment type
    if (paymentType === "sale" && orderId) {
      await this.handleSalePayment(orderId, newPayment, tenantId);
    } else if (paymentType === "payable" && payableId) {
      await this.handlePayablePayment(payableId, newPayment, tenantId);
    } else if (allocations?.length) {
      // Pago adelantado o multi-documento; aplicar allocations para recalcular saldos
      await this.applyAllocations(newPayment._id.toString(), allocations, user);
    }

    // Update bank account balance if bankAccountId is provided
    if (newPayment.bankAccountId) {
      try {
        // Get bank account to determine its currency
        const bankAccount = await this.bankAccountsService.findOne(
          newPayment.bankAccountId.toString(),
          tenantId,
        );

        // Get descriptive information for the transaction
        let description = "";
        if (paymentType === "sale" && orderId) {
          const order = await this.orderModel
            .findById(orderId)
            .select("orderNumber customerName")
            .exec();
          description = order
            ? `Cobro orden #${order.orderNumber} - ${order.customerName || "Cliente"}`
            : `Cobro orden ${orderId}`;
        } else if (paymentType === "payable" && payableId) {
          const payable = await this.payableModel
            .findById(payableId)
            .select("payeeName description")
            .exec();
          description = payable
            ? payable.description
              ? `Pago: ${payable.description} - ${payable.payeeName}`
              : `Pago a ${payable.payeeName}`
            : `Pago documento ${payableId}`;
        }

        // Determine the amount to adjust based on bank account currency
        let amountToAdjust: number;
        if (bankAccount.currency === "VES") {
          amountToAdjust =
            dto.amountVes || dto.amount * (dto.exchangeRate || 1);
        } else {
          amountToAdjust = dto.amount;
        }

        // For payables (payments out), negate the amount
        const adjustment =
          paymentType === "sale" ? amountToAdjust : -amountToAdjust;

        const updatedAccount = await this.bankAccountsService.updateBalance(
          newPayment.bankAccountId.toString(),
          adjustment,
          tenantId,
          undefined,
          { userId },
        );

        await this.bankTransactionsService.recordPaymentMovement(
          tenantId,
          userId,
          {
            bankAccountId: newPayment.bankAccountId.toString(),
            paymentId: newPayment._id.toString(),
            paymentType: paymentType as "sale" | "payable",
            amount: amountToAdjust,
            method: newPayment.method,
            reference: newPayment.reference,
            description: description,
            transactionDate: newPayment.date.toISOString(),
            metadata: {
              currency: bankAccount.currency,
              exchangeRate: dto.exchangeRate,
              amountUSD: dto.amount,
              amountVES: dto.amountVes,
            },
            balanceAfter: updatedAccount.currentBalance,
            reconciliationStatus: initialReconciliationStatus,
          },
        );
        this.logger.log(
          `Updated bank account ${newPayment.bankAccountId} (${bankAccount.currency}) balance by ${adjustment} and recorded movement`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to update bank account balance or record movement: ${error.message}`,
        );
      }
    }

    return newPayment;
  }

  private async handleSalePayment(
    orderId: string,
    payment: PaymentDocument,
    tenantId: string,
  ): Promise<void> {
    const order = await this.orderModel
      .findById(orderId)
      .select("payments paymentStatus totalAmount totalAmountVes tenantId orderNumber")
      .lean();
    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found.`);
    }

    // Calcular pagos acumulados (evita conflictos de versión /v key)
    const paymentsForOrder = await this.paymentModel
      .find({ orderId: new Types.ObjectId(orderId) })
      .select("amount amountVes fees _id")
      .lean();

    const paidAmount = paymentsForOrder.reduce(
      (sum, p) => sum + Number(p?.amount || 0) + Number(p?.fees?.igtf || 0),
      0,
    );
    const paidAmountVes = paymentsForOrder.reduce(
      (sum, p) => sum + Number(p?.amountVes || 0),
      0,
    );

    const paymentStatus =
      paidAmount >= Number(order.totalAmount || 0) - 0.01
        ? "paid"
        : paidAmount > 0
          ? "partial"
          : order.paymentStatus;

    // Actualizar sin depender de versión previa
    const paymentRecord = {
      _id: payment._id,
      method: payment.method,
      amount: payment.amount,
      amountVes: payment.amountVes,
      currency: payment.currency,
      exchangeRate: payment.fees?.igtf ? 0 : 1, // simplified
      amountTendered: payment.amountTendered,
      changeGiven: payment.changeGiven,
      changeGivenBreakdown: payment.changeGivenBreakdown,
      reference: payment.reference,
      date: payment.date
    };

    await this.orderModel.findByIdAndUpdate(
      orderId,
      {
        $set: {
          paymentStatus,
          paidAmount,
          paidAmountVes,
        },
        $addToSet: {
          payments: payment._id,
          paymentRecords: paymentRecord // Push to snapshot array too
        },
      },
      { new: true },
    );
    this.logger.log(`Updated order ${orderId} with new payment ${payment._id}`);

    // Los asientos contables se generan SOLO desde la factura emitida
    // (billing.document.issued → BillingAccountingListener)
    // para evitar duplicidad y usar los montos VES ya calculados en la factura.
  }

  private async handlePayablePayment(
    payableId: string,
    payment: PaymentDocument,
    tenantId: string,
  ): Promise<void> {
    const payable = await this.payableModel.findById(payableId).exec();
    if (!payable) {
      throw new NotFoundException(`Payable with ID ${payableId} not found.`);
    }

    this.logger.debug(
      `🔍 [DEBUG] Incoming payment details: id=${payment._id}, payableId=${payment.payableId}, amount=${payment.amount}`,
    );

    // Recalculate paid amount and status
    const allPayments = await this.paymentModel.find({
      payableId: payable._id,
    });

    this.logger.debug(
      `🔍 [DEBUG] Query for payments with payableId=${payable._id}`,
    );
    this.logger.debug(
      `🔍 [DEBUG] Found ${allPayments.length} payments: ${JSON.stringify(allPayments.map((p) => ({ id: p._id, amount: p.amount, payableId: p.payableId })))}`,
    );

    const paidAmountRaw = allPayments.reduce(
      (sum, p) => sum + Number(p?.amount ?? 0),
      0,
    );
    const payableTotal = Number(payable.totalAmount ?? 0);

    this.logger.debug(
      `🔍 [DEBUG] paidAmountRaw calculated: ${paidAmountRaw} from ${allPayments.length} payments`,
    );

    if (paidAmountRaw > payableTotal + 0.009) {
      throw new BadRequestException(
        `Payment amount exceeds the remaining balance.`,
      );
    }

    const paidAmount = Math.max(
      0,
      Math.round((paidAmountRaw + Number.EPSILON) * 100) / 100,
    );
    const totalAmountRounded =
      Math.round((payableTotal + Number.EPSILON) * 100) / 100;
    const remainingBalance = Math.max(0, totalAmountRounded - paidAmount);
    const tolerance = Math.max(
      0.01,
      Number((totalAmountRounded * 0.001).toFixed(2)),
    );
    const isFullyPaid = remainingBalance <= tolerance;

    // Determine next status based on payment amount
    const nextStatus = isFullyPaid
      ? "paid"
      : paidAmount > 0
        ? "partially_paid"
        : "open"; // Default to 'open' for unpaid payables

    this.logger.debug(
      `Payable ${payableId} payment summary → total: ${totalAmountRounded}, paid: ${paidAmount}, remaining: ${remainingBalance}, tolerance: ${tolerance}, fullyPaid: ${isFullyPaid}, previousStatus: ${payable.status}`,
    );

    payable.paidAmount = isFullyPaid ? totalAmountRounded : paidAmount;
    payable.status = nextStatus;

    await payable.save();

    this.logger.log(
      `Updated payable ${payableId} with new payment ${payment._id} – status: ${nextStatus} (paid: ${paidAmount}/${totalAmountRounded}, remaining: ${remainingBalance})`,
    );

    // --- Automatic Journal Entry Creation ---
    try {
      await this.accountingService.createJournalEntryForPayablePayment(
        payment,
        payable,
        tenantId,
      );
      this.logger.log(
        `Successfully created journal entry for payable payment ${payment._id}`,
      );
    } catch (accountingError) {
      this.logger.error(
        `Failed to create journal entry for payable payment ${payment._id}. The payment was processed correctly, but accounting needs review.`,
        accountingError.stack,
      );
    }
  }

  async findAll(
    tenantId: string,
    query: {
      status?: string;
      method?: string;
      reference?: string;
      orderId?: string;
      payableId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      customerId?: string;
    },
  ): Promise<{
    data: Payment[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const {
      status,
      method,
      reference,
      orderId,
      payableId,
      from,
      to,
      page = 1,
      limit = 50,
      customerId,
    } = query;

    const effectiveLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const currentPage = Math.max(Number(page) || 1, 1);

    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (method) filter.method = method;
    if (reference) filter.reference = reference;
    if (orderId) filter.orderId = new Types.ObjectId(orderId);
    if (payableId) filter.payableId = new Types.ObjectId(payableId);
    if (customerId) filter.customerId = new Types.ObjectId(customerId);
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    // Búsqueda por texto (nombre cliente / taxId / referencia)
    if ((query as any).search) {
      const term = (query as any).search.trim();
      if (term) {
        filter.$or = [
          { reference: { $regex: term, $options: "i" } },
          { "orderId.customerName": { $regex: term, $options: "i" } },
          { "customerId.name": { $regex: term, $options: "i" } },
          { "orderId.taxInfo.customerTaxId": { $regex: term, $options: "i" } },
          { "customerId.taxInfo.taxId": { $regex: term, $options: "i" } },
        ];
      }
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ date: -1 })
        .skip((currentPage - 1) * effectiveLimit)
        .limit(effectiveLimit)
        .populate({ path: "payableId", select: "description payeeName" })
        .populate({
          path: "orderId",
          select: "orderNumber customerName taxInfo",
        })
        .populate({ path: "customerId", select: "name taxInfo" })
        .exec(),
      this.paymentModel.countDocuments(filter),
    ]);

    // Conciliación: adjuntar estado desde movimientos bancarios asociados
    const paymentIds = data.map((p) => p._id);
    const txs = await this.bankTransactionModel
      .find({ tenantId, paymentId: { $in: paymentIds } })
      .select(
        "paymentId reconciliationStatus reconciled reconciledAt reference statementTransactionId",
      )
      .lean()
      .exec();
    const txByPayment: Record<string, any> = {};
    txs.forEach((tx) => {
      if (tx.paymentId) {
        txByPayment[tx.paymentId.toString()] = tx;
      }
    });
    data.forEach((p) => {
      const tx = txByPayment[p._id.toString()];
      if (tx) {
        (p as any)._reconciliation = {
          status: tx.reconciliationStatus,
          reconciled: tx.reconciled,
          reconciledAt: tx.reconciledAt,
          statementTransactionId: tx.statementTransactionId,
          bankReference: tx.reference,
        };
      }
    });

    const totalPages = Math.max(1, Math.ceil(total / effectiveLimit));

    return {
      data,
      pagination: {
        page: currentPage,
        limit: effectiveLimit,
        total,
        totalPages,
      },
    };
  }

  async exportAll(tenantId: string, query: any) {
    // Reutilizar findAll pero sin paginación dura (máx 5000)
    const cloned = { ...query, page: 1, limit: 5000 };
    const result = await this.findAll(tenantId, cloned);
    return result.data;
  }
}
