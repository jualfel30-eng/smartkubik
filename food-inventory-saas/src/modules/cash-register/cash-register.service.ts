import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CashRegisterSession,
  CashRegisterSessionDocument,
} from "../../schemas/cash-register-session.schema";
import {
  CashRegisterClosing,
  CashRegisterClosingDocument,
} from "../../schemas/cash-register-closing.schema";
import * as PDFDocument from 'pdfkit';
import { Order, OrderDocument } from "../../schemas/order.schema";
import { Payment, PaymentDocument } from "../../schemas/payment.schema";
import { User, UserDocument } from "../../schemas/user.schema";
import {
  OpenCashRegisterDto,
  CloseCashRegisterDto,
  CashMovementDto,
  CreateGlobalClosingDto,
  CashRegisterQueryDto,
  CashRegisterClosingQueryDto,
  ApproveClosingDto,
  RejectClosingDto,
  CashRegisterReportDto,
} from "../../dto/cash-register.dto";

@Injectable()
export class CashRegisterService {
  private readonly logger = new Logger(CashRegisterService.name);

  constructor(
    @InjectModel(CashRegisterSession.name)
    private sessionModel: Model<CashRegisterSessionDocument>,
    @InjectModel(CashRegisterClosing.name)
    private closingModel: Model<CashRegisterClosingDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Payment.name)
    private paymentModel: Model<PaymentDocument>,
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,
  ) { }

  // ============================================
  // GENERACIÓN DE NÚMEROS SECUENCIALES
  // ============================================

  private async generateSessionNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.sessionModel.countDocuments({
      tenantId,
      sessionNumber: { $regex: `^CAJ-${year}-` },
    });
    const nextNumber = (count + 1).toString().padStart(4, "0");
    return `CAJ-${year}-${nextNumber}`;
  }

  private async generateClosingNumber(tenantId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.closingModel.countDocuments({
      tenantId,
      closingNumber: { $regex: `^CIE-${year}-` },
    });
    const nextNumber = (count + 1).toString().padStart(4, "0");
    return `CIE-${year}-${nextNumber}`;
  }

  // ============================================
  // APERTURA DE CAJA
  // ============================================

  async openSession(
    dto: OpenCashRegisterDto,
    user: any,
  ): Promise<CashRegisterSessionDocument> {
    const { tenantId, id: userId } = user;

    // Verificar que el usuario no tenga ya una sesión abierta
    const existingOpen = await this.sessionModel.findOne({
      tenantId,
      cashierId: new Types.ObjectId(userId),
      status: "open",
    });

    if (existingOpen) {
      throw new ConflictException(
        `Ya tienes una sesión de caja abierta (${existingOpen.sessionNumber}). Debes cerrarla antes de abrir otra.`,
      );
    }

    // Verificar si la caja específica ya está en uso por otro usuario
    const registerInUse = await this.sessionModel.findOne({
      tenantId,
      registerName: dto.registerName,
      status: "open",
    });

    if (registerInUse) {
      throw new ConflictException(
        `La caja "${dto.registerName}" ya está en uso por ${registerInUse.cashierName}. Sesión: ${registerInUse.sessionNumber}`,
      );
    }

    // Obtener datos del usuario
    const userData = await this.userModel
      .findById(userId)
      .select("firstName lastName")
      .lean();
    const cashierName = userData
      ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
      : "Usuario";

    const sessionNumber = await this.generateSessionNumber(tenantId);

    const session = new this.sessionModel({
      tenantId,
      sessionNumber,
      registerName: dto.registerName,
      registerId: dto.registerId,
      cashierId: new Types.ObjectId(userId),
      cashierName,
      openedAt: new Date(),
      openingFunds: dto.openingFunds || [],
      openingAmountUsd: dto.openingAmountUsd || 0,
      openingAmountVes: dto.openingAmountVes || 0,
      openingNotes: dto.openingNotes,
      openedBy: new Types.ObjectId(userId),
      status: "open",
      workShift: dto.workShift,
      cashMovements: [],
      totalTransactions: 0,
      totalSalesUsd: 0,
      totalSalesVes: 0,
    });

    await session.save();
    this.logger.log(
      `Sesión de caja abierta: ${sessionNumber} por ${cashierName} en ${dto.registerName}`,
    );

    return session;
  }

  // ============================================
  // MOVIMIENTOS DE EFECTIVO
  // ============================================

  async addCashMovement(
    sessionId: string,
    dto: CashMovementDto,
    user: any,
  ): Promise<CashRegisterSessionDocument> {
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      tenantId: user.tenantId,
    });

    if (!session) {
      throw new NotFoundException("Sesión de caja no encontrada");
    }

    if (session.status !== "open") {
      throw new BadRequestException(
        "No se pueden agregar movimientos a una sesión cerrada",
      );
    }

    session.cashMovements.push({
      type: dto.type,
      amount: dto.amount,
      currency: dto.currency,
      reason: dto.reason,
      description: dto.description,
      reference: dto.reference,
      authorizedBy: new Types.ObjectId(user.id),
      timestamp: new Date(),
    });

    await session.save();
    this.logger.log(
      `Movimiento de efectivo registrado en sesión ${session.sessionNumber}: ${dto.type} ${dto.amount} ${dto.currency}`,
    );

    return session;
  }

  // ============================================
  // CIERRE DE CAJA (INDIVIDUAL)
  // ============================================

  async closeSession(
    dto: CloseCashRegisterDto,
    user: any,
  ): Promise<CashRegisterClosingDocument> {
    const { tenantId, id: userId } = user;

    const session = await this.sessionModel.findOne({
      _id: dto.sessionId,
      tenantId,
    });

    if (!session) {
      throw new NotFoundException("Sesión de caja no encontrada");
    }

    if (session.status === "closed") {
      throw new BadRequestException("Esta sesión ya fue cerrada");
    }

    // Marcar sesión como "closing" para prevenir modificaciones
    session.status = "closing";
    await session.save();

    try {
      // NUEVO: Calcular totales desde las órdenes vinculadas a la sesión
      // Esto reemplaza o complementa el cálculo basado en tiempo
      const calculatedTotals = await this.calculateSessionTotals(session._id.toString(), tenantId);

      // Mantener compatibilidad con el formato anterior de summary si es necesario, 
      // pero priorizar los datos calculados explícitamente.
      // Aquí mapeamos calculatedTotals al formato que espera CashRegisterClosing

      // Calcular efectivo esperado (Apertura + Ventas Efectivo + Entradas - Salidas)
      // Calcular efectivo esperado (Apertura + Ventas Efectivo + Entradas - Salidas)
      const cashMovements = session.cashMovements || [];

      const cashInUsd = cashMovements.filter(m => m.type === 'in' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
      const cashInVes = cashMovements.filter(m => m.type === 'in' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);

      const cashOutUsd = cashMovements.filter(m => m.type === 'out' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
      const cashOutVes = cashMovements.filter(m => m.type === 'out' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);

      const expectedCashUsd =
        (session.openingAmountUsd || 0) +
        calculatedTotals.salesUsd + // Use salesUsd which includes cash - change? NO. 
        // calculatedTotals.cashUsd is Net Cash? 
        // Logic check: calculatedTotals.cashUsd = CashReceived (Positive) + ChangeGiven (Negative).
        // So cashUsd matches the Net Cash in drawer from sales.
        calculatedTotals.cashUsd +
        cashInUsd -
        cashOutUsd;

      const expectedCashVes =
        (session.openingAmountVes || 0) +
        calculatedTotals.cashVes +
        cashInVes -
        cashOutVes;

      // Calcular diferencias
      const differenceUsd = (dto.closingAmountUsd || 0) - expectedCashUsd;
      const differenceVes = (dto.closingAmountVes || 0) - expectedCashVes;
      const hasDifferences = Math.abs(differenceUsd) > 0.01 || Math.abs(differenceVes) > 1;

      // Generar número de cierre
      const closingNumber = await this.generateClosingNumber(tenantId);

      // Crear documento de cierre
      const closing = new this.closingModel({
        tenantId,
        closingNumber,
        sessionId: session._id,
        sessionNumber: session.sessionNumber,
        registerName: session.registerName,
        periodStart: session.openedAt,
        periodEnd: new Date(),
        cashierId: session.cashierId,
        cashierName: session.cashierName,
        closingType: "individual",

        // Datos del resumen
        totalTransactions: calculatedTotals.totalOrders,
        totalGrossSalesUsd: calculatedTotals.salesUsd,
        totalGrossSalesVes: calculatedTotals.salesVes,
        // Asumimos Net = Gross por simplicidad si no hay descuentos complejos calculados aquí
        totalNetSalesUsd: calculatedTotals.salesUsd,
        totalNetSalesVes: calculatedTotals.salesVes,

        // Desglose (guardamos en salesByPaymentMethod si el schema lo soporta, o adaptamos)
        // El schema actual parece usar campos planos summary...
        // Vamos a usar los campos existentes del schema CashRegisterClosing

        cashReceivedUsd: calculatedTotals.cashUsd,
        cashReceivedVes: calculatedTotals.cashVes,

        // Payment Method breakdown
        paymentMethodSummary: calculatedTotals.paymentMethodSummary || [],

        // Tax summary
        taxSummary: calculatedTotals.taxSummary || [],

        // NEW: Change Given
        changeGiven: [
          { currency: 'USD', totalChangeGiven: calculatedTotals.changeGivenUsd || 0, transactionCount: 0 },
          { currency: 'VES', totalChangeGiven: calculatedTotals.changeGivenVes || 0, transactionCount: 0 }
        ],

        // NEW: Cash Movements
        cashInMovementsUsd: cashInUsd,
        cashInMovementsVes: cashInVes, // Ensure schema has this field? Yes checked schema.
        cashOutMovementsUsd: cashOutUsd,
        cashOutMovementsVes: cashOutVes,

        closingFundUsd: dto.closingAmountUsd || 0,
        closingFundVes: dto.closingAmountVes || 0,

        // Diferencias
        cashDifferences: [
          {
            currency: 'USD',
            expectedAmount: expectedCashUsd,
            declaredAmount: dto.closingAmountUsd || 0,
            difference: differenceUsd,
            status: Math.abs(differenceUsd) < 0.01 ? 'balanced' : differenceUsd > 0 ? 'surplus' : 'shortage'
          },
          {
            currency: 'VES',
            expectedAmount: expectedCashVes,
            declaredAmount: dto.closingAmountVes || 0,
            difference: differenceVes,
            status: Math.abs(differenceVes) < 1 ? 'balanced' : differenceVes > 0 ? 'surplus' : 'shortage'
          }
        ],
        hasDifferences,

        status: hasDifferences ? 'pending_approval' : 'approved', // Auto-aprobar si no hay diferencias
        cashierNotes: dto.closingNotes,
        createdBy: new Types.ObjectId(userId),
        exchangeRate: dto.exchangeRate || 1,
      });

      await closing.save();

      // Actualizar sesión con datos de cierre
      session.status = "closed";
      session.closedAt = new Date();
      session.closingFunds = dto.closingFunds || [];
      session.closingAmountUsd = dto.closingAmountUsd;
      session.closingAmountVes = dto.closingAmountVes;
      session.closingNotes = dto.closingNotes;
      session.closedBy = new Types.ObjectId(userId);
      session.closingDocumentId = closing._id;
      session.totalTransactions = calculatedTotals.totalOrders;
      session.totalSalesUsd = calculatedTotals.salesUsd;
      session.totalSalesVes = calculatedTotals.salesVes;
      await session.save();

      this.logger.log(
        `Cierre de caja generado: ${closingNumber} para sesión ${session.sessionNumber}`,
      );

      return closing;
    } catch (error) {
      // Revertir estado de sesión si hay error
      session.status = "open";
      await session.save();
      throw error;
    }
  }

  /**
   * Calcula los totales de ventas para una sesión de caja
   * basándose en las órdenes vinculadas a esa sesión
   */
  async calculateSessionTotals(sessionId: string, tenantId: string) {
    // Cast explicitly to ensure match
    const sessionObjectId = new Types.ObjectId(sessionId);

    // Obtener todas las órdenes de esta sesión
    // Usamos find con lean() para mejor rendimiento
    const orders = await this.orderModel.find({
      cashSessionId: sessionObjectId,
      tenantId,
      // Consideramos órdenes que no estén canceladas ni en borrador
      status: { $nin: ['draft', 'cancelled'] },
    }).lean();

    this.logger.warn(`[calculateSessionTotals] Session: ${sessionId} (ObjectId: ${sessionObjectId}) | Orders found: ${orders.length}`);
    if (orders.length > 0) {
      this.logger.warn(`[calculateSessionTotals] First order: ${orders[0].orderNumber} | Payments: ${JSON.stringify(orders[0].paymentRecords)}`);
      this.logger.warn(`[calculateSessionTotals] All Orders Payment Records: ${JSON.stringify(orders.map(o => ({ no: o.orderNumber, pay: o.paymentRecords })))}`);
    } else {
      this.logger.warn(`[calculateSessionTotals] No orders found directly. Query: cashSessionId=${sessionObjectId}, tenantId=${tenantId}`);
    }

    // Inicializar totales
    const totals = {
      totalOrders: orders.length,
      // Ventas por moneda
      salesUsd: 0,
      salesVes: 0,
      // Ventas por método de pago
      cashUsd: 0,
      cashVes: 0,
      cardUsd: 0,
      cardVes: 0,
      transferUsd: 0,
      transferVes: 0,
      mobilePaymentVes: 0, // Pago móvil solo en VES
      otherUsd: 0,
      otherVes: 0,
      changeGivenUsd: 0,
      changeGivenVes: 0,
    };

    // Maps for detailed aggregations
    const paymentMethodMap = new Map<string, any>();
    const taxMap = new Map<string, any>();

    // Helper to get or create payment summary
    const getPaymentSummary = (method: string, currency: string) => {
      const key = `${method}_${currency}`;
      if (!paymentMethodMap.has(key)) {
        paymentMethodMap.set(key, {
          methodId: method,
          methodName: method.toUpperCase(), // Simple formatting, can be improved
          currency: currency,
          transactionCount: 0,
          totalAmount: 0,
          totalAmountUsd: 0,
          totalAmountVes: 0,
          igtfAmount: 0,
          tipsAmount: 0
        });
      }
      return paymentMethodMap.get(key);
    };

    // Calcular totales
    for (const order of orders) {
      // Calculate Tax Summary (IVA)
      if (order.ivaTotal > 0) {
        const taxName = 'IVA';
        if (!taxMap.has(taxName)) {
          taxMap.set(taxName, {
            taxType: taxName,
            rate: 16, // Assuming standard 16%
            baseAmount: 0,
            taxAmount: 0,
            transactionCount: 0
          });
        }
        const taxEntry = taxMap.get(taxName);
        taxEntry.taxAmount += order.ivaTotal;
        // Base amount approx: IVA / 0.16
        taxEntry.baseAmount += (order.ivaTotal / 0.16);
        taxEntry.transactionCount++;
      }

      // Calculate Tax Summary (IGTF)
      if (order.igtfTotal > 0) {
        const taxName = 'IGTF';
        if (!taxMap.has(taxName)) {
          taxMap.set(taxName, {
            taxType: taxName,
            rate: 3, // Assuming standard 3% for foreign currency
            baseAmount: 0,
            taxAmount: 0,
            transactionCount: 0
          });
        }
        const taxEntry = taxMap.get(taxName);
        taxEntry.taxAmount += order.igtfTotal;
        // Base amount approx: IGTF / 0.03
        taxEntry.baseAmount += (order.igtfTotal / 0.03);
        taxEntry.transactionCount++;
      }

      // Usar los registros de pago si existen, es más preciso
      if (order.paymentRecords && order.paymentRecords.length > 0) {
        for (const payment of order.paymentRecords) {
          const amount = payment.amount || 0;
          const currency = payment.currency || 'USD';
          const method = (payment.method || 'unknown').toLowerCase();
          const amountVes = payment.amountVes || 0;

          // Skip negative amounts (change/vueltos) for Sales summary, 
          // but include them if we want NET sales per method? 
          // usually paymentMethodSummary shows GROSS received per method.
          if (amount < 0) continue;

          // Sumar al total general
          if (currency === 'USD') totals.salesUsd += amount;
          else totals.salesVes += (payment.amountVes || amount); // amountVes si existe, sino amount

          // Determine exchange rate for this payment or order
          const paymentRate = payment.exchangeRate || (order.totalAmount > 0 ? (order.totalAmountVes / order.totalAmount) : 1) || 1;

          // Detailed Payment Summary
          const summary = getPaymentSummary(method, currency);
          summary.transactionCount++;
          summary.totalAmount += (currency === 'USD' ? amount : amountVes);
          summary.totalAmountUsd += (currency === 'USD' ? amount : (amountVes / paymentRate));
          summary.totalAmountVes += (currency === 'VES' ? amountVes : (amount * paymentRate));


          // Clasificar (Legacy/Flat totals)
          if (method.includes('efectivo') || method.includes('cash')) {
            if (currency === 'USD') totals.cashUsd += amount;
            else totals.cashVes += (payment.amountVes || amount);
          } else if (
            method.includes('tarjeta') ||
            method.includes('card') ||
            method === 'debit' ||
            method === 'credit' ||
            method.includes('pos') ||
            method.includes('punto') ||
            method.includes('biopago')
          ) {
            if (currency === 'USD') totals.cardUsd += amount;
            else totals.cardVes += (payment.amountVes || amount);
          } else if (method.includes('transfer') || method === 'zelle') {
            if (currency === 'USD') totals.transferUsd += amount;
            else totals.transferVes += (payment.amountVes || amount);
          } else if (method.includes('pago_movil') || method.includes('mobile')) {
            totals.mobilePaymentVes += (payment.amountVes || amount);
          } else {
            this.logger.warn(`[calculateSessionTotals] Falling to OTHER: Method=${method} Currency=${currency} Amount=${amount} AmountVes=${payment.amountVes}`);
            if (currency === 'USD') totals.otherUsd += amount;
            else totals.otherVes += (payment.amountVes || amount);
          }
        }
      } else {
        // Fallback a totales de la orden si no hay registros de pago detallados (legacy o simple)
        const amount = order.totalAmount || 0;
        totals.salesUsd += amount;
        totals.otherUsd += amount;

        // Add to generic payment summary
        const summary = getPaymentSummary('other', 'USD');
        const fallbackRate = (order.totalAmount > 0 ? (order.totalAmountVes / order.totalAmount) : 1) || 1;
        summary.transactionCount++;
        summary.totalAmount += amount;
        summary.totalAmountUsd += amount;
        summary.totalAmountVes += (amount * fallbackRate);
      }

      // Process payments for detailed breakdown (Logic for Change Given)
      if (order.paymentRecords && order.paymentRecords.length > 0) {
        for (const payment of order.paymentRecords) {
          const method = (payment.method || 'other').toLowerCase();
          const currency = payment.currency || 'USD';
          const amount = payment.amount || 0;
          const amountVes = payment.amountVes || 0;

          // Calculate change (negative amounts)
          if (amount < 0 || amountVes < 0) {
            if (method.includes('efectivo') || method.includes('cash') || method.includes('vuelto') || method.includes('change')) {
              // It's a change/vuelto
              if (currency === 'USD') totals.changeGivenUsd = (totals.changeGivenUsd || 0) + Math.abs(amount);
              else totals.changeGivenVes = (totals.changeGivenVes || 0) + Math.abs(amountVes || amount);
            }
          }
        }
      }
    }

    const finalTotals = {
      ...totals,
      paymentMethodSummary: Array.from(paymentMethodMap.values()),
      taxSummary: Array.from(taxMap.values())
    };

    this.logger.warn(`[calculateSessionTotals] Final Calculated Totals: ${JSON.stringify(finalTotals)}`);
    return finalTotals;
  }

  // ============================================
  // CIERRE GLOBAL (CONSOLIDADO - ADMIN)
  // ============================================

  async createGlobalClosing(
    dto: CreateGlobalClosingDto,
    user: any,
  ): Promise<CashRegisterClosingDocument> {
    const { tenantId, id: userId } = user;

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Buscar sesiones cerradas en el período
    const sessionsQuery: any = {
      tenantId,
      status: "closed",
      closedAt: { $gte: periodStart, $lte: periodEnd },
    };

    if (dto.sessionIds?.length) {
      sessionsQuery._id = { $in: dto.sessionIds.map((id) => new Types.ObjectId(id)) };
    }

    if (dto.cashierIds?.length) {
      sessionsQuery.cashierId = { $in: dto.cashierIds.map((id) => new Types.ObjectId(id)) };
    }

    if (dto.registerNames?.length) {
      sessionsQuery.registerName = { $in: dto.registerNames };
    }

    const sessions = await this.sessionModel.find(sessionsQuery).lean();

    if (sessions.length === 0) {
      throw new BadRequestException(
        "No se encontraron sesiones cerradas en el período especificado",
      );
    }

    // Calcular resumen consolidado
    const closingSummary = await this.calculateClosingSummary(
      tenantId,
      periodStart,
      periodEnd,
      undefined, // Todos los cajeros
      dto.exchangeRate || 1,
    );

    // Generar número de cierre
    const closingNumber = await this.generateClosingNumber(tenantId);

    // Crear documento de cierre consolidado
    const closing = new this.closingModel({
      tenantId,
      closingNumber,
      sessionId: sessions[0]._id, // Referencia a primera sesión
      sessionNumber: `CONSOLIDADO-${sessions.length}-SESIONES`,
      registerName: "CONSOLIDADO",
      periodStart,
      periodEnd,
      cashierId: new Types.ObjectId(userId),
      cashierName: "Cierre Global (Admin)",
      closingType: "consolidated",
      includedSessions: sessions.map((s) => s._id),
      ...closingSummary,
      cashDifferences: [], // No aplica para consolidado
      hasDifferences: false,
      status: "draft",
      supervisorNotes: dto.notes,
      createdBy: new Types.ObjectId(userId),
      exchangeRate: dto.exchangeRate || closingSummary.exchangeRate,
    });

    await closing.save();

    this.logger.log(
      `Cierre global generado: ${closingNumber} consolidando ${sessions.length} sesiones`,
    );

    return closing;
  }

  // ============================================
  // CÁLCULO DE RESUMEN DE CIERRE
  // ============================================

  private async calculateClosingSummary(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    cashierId?: string,
    exchangeRate: number = 1,
  ): Promise<any> {
    // Filtro base para órdenes
    const orderFilter: any = {
      tenantId,
      createdAt: { $gte: periodStart, $lte: periodEnd },
      status: { $nin: ["draft", "cancelled"] },
    };

    if (cashierId) {
      orderFilter.createdBy = new Types.ObjectId(cashierId);
    }

    // Obtener órdenes del período
    const orders = await this.orderModel.find(orderFilter).lean();

    // Filtro para pagos
    const paymentFilter: any = {
      tenantId,
      date: { $gte: periodStart, $lte: periodEnd },
      status: "confirmed",
    };

    if (cashierId) {
      paymentFilter.createdBy = new Types.ObjectId(cashierId);
    }

    // Obtener pagos del período
    const payments = await this.paymentModel.find(paymentFilter).lean();

    // Calcular totales de ventas
    const totalTransactions = orders.length;
    let totalGrossSalesUsd = 0;
    let totalGrossSalesVes = 0;
    let totalNetSalesUsd = 0;
    let totalNetSalesVes = 0;
    let totalDiscountsUsd = 0;
    let totalDiscountsVes = 0;
    let totalIvaCollected = 0;
    let totalIgtfCollected = 0;
    let totalTipsUsd = 0;
    let totalTipsVes = 0;
    let totalRefundsUsd = 0;
    let totalRefundsVes = 0;
    let totalCancelledUsd = 0;
    let totalCancelledVes = 0;

    // Transacciones para el reporte detallado
    const transactions: any[] = [];

    for (const order of orders) {
      if (order.status === "cancelled") {
        totalCancelledUsd += order.totalAmount || 0;
        totalCancelledVes += order.totalAmountVes || 0;
        continue;
      }

      totalGrossSalesUsd += order.totalAmount || 0;
      totalGrossSalesVes += order.totalAmountVes || 0;
      totalNetSalesUsd += order.subtotal || 0;
      totalNetSalesVes += (order.subtotal || 0) * exchangeRate;
      totalDiscountsUsd += order.discountAmount || 0;
      totalDiscountsVes += (order.discountAmount || 0) * exchangeRate;
      totalIvaCollected += order.ivaTotal || 0;
      totalIgtfCollected += order.igtfTotal || 0;
      totalTipsUsd += order.totalTipsAmount || 0;
      totalTipsVes += (order.totalTipsAmount || 0) * exchangeRate;

      // Agregar a lista de transacciones
      const paymentMethods = order.paymentRecords?.map((p) => p.method) || [];
      transactions.push({
        orderId: order._id,
        orderNumber: order.orderNumber,
        timestamp: order.createdAt,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        totalAmountVes: order.totalAmountVes,
        paymentStatus: order.paymentStatus,
        paymentMethods: [...new Set(paymentMethods)],
        status: order.status,
        ivaAmount: order.ivaTotal,
        igtfAmount: order.igtfTotal,
        tipAmount: order.totalTipsAmount || 0,
        discountAmount: order.discountAmount,
      });
    }

    // Calcular resumen por método de pago
    const paymentMethodMap = new Map<string, any>();

    for (const payment of payments) {
      const methodId = payment.method || "unknown";
      const currency = payment.currency || "USD";

      if (!paymentMethodMap.has(methodId)) {
        paymentMethodMap.set(methodId, {
          methodId,
          methodName: this.getPaymentMethodName(methodId),
          currency,
          transactionCount: 0,
          totalAmount: 0,
          totalAmountUsd: 0,
          totalAmountVes: 0,
          igtfAmount: 0,
          tipsAmount: 0,
        });
      }

      const summary = paymentMethodMap.get(methodId);
      summary.transactionCount++;
      summary.totalAmount += payment.amount || 0;
      summary.totalAmountUsd +=
        currency === "VES"
          ? (payment.amount || 0) / exchangeRate
          : payment.amount || 0;
      summary.totalAmountVes +=
        currency === "USD"
          ? (payment.amount || 0) * exchangeRate
          : payment.amountVes || payment.amount || 0;
      summary.igtfAmount += payment.fees?.igtf || 0;
      summary.tipsAmount += payment.tipAmount || 0;
    }

    const paymentMethodSummary = Array.from(paymentMethodMap.values());

    // Calcular efectivo recibido y cambios dados
    let cashReceivedUsd = 0;
    let cashReceivedVes = 0;

    for (const payment of payments) {
      if (payment.method?.includes("efectivo")) {
        if (payment.currency === "USD") {
          cashReceivedUsd += payment.amount || 0;
        } else {
          cashReceivedVes += payment.amountVes || payment.amount || 0;
        }
      }
    }

    // Calcular cambios/vueltos (simplificado - asumimos que están en paymentRecords)
    let changeGivenUsd = 0;
    let changeGivenVes = 0;

    for (const order of orders) {
      for (const record of order.paymentRecords || []) {
        if (record.method?.includes("efectivo")) {
          const orderTotal = order.totalAmount || 0;
          const paid = record.amount || 0;
          if (paid > orderTotal) {
            const change = paid - orderTotal;
            if (record.currency === "USD") {
              changeGivenUsd += change;
            } else {
              changeGivenVes += change;
            }
          }
        }
      }
    }

    // Calcular resumen de impuestos
    const taxSummary = [
      {
        taxType: "IVA",
        rate: 16,
        baseAmount: totalNetSalesUsd,
        taxAmount: totalIvaCollected,
        transactionCount: orders.filter((o) => (o.ivaTotal || 0) > 0).length,
      },
      {
        taxType: "IGTF",
        rate: 3,
        baseAmount: payments
          .filter((p) => p.currency === "USD")
          .reduce((sum, p) => sum + (p.amount || 0), 0),
        taxAmount: totalIgtfCollected,
        transactionCount: payments.filter((p) => (p.fees?.igtf || 0) > 0).length,
      },
    ];

    // Calcular efectivo esperado
    const expectedCashUsd = cashReceivedUsd - changeGivenUsd;
    const expectedCashVes = cashReceivedVes - changeGivenVes;

    return {
      totalTransactions,
      totalGrossSalesUsd,
      totalGrossSalesVes,
      totalNetSalesUsd,
      totalNetSalesVes,
      totalDiscountsUsd,
      totalDiscountsVes,
      totalRefundsUsd,
      totalRefundsVes,
      totalCancelledUsd,
      totalCancelledVes,
      paymentMethodSummary,
      cashReceivedUsd,
      cashReceivedVes,
      changeGiven: [
        { currency: "USD", totalChangeGiven: changeGivenUsd, transactionCount: 0 },
        { currency: "VES", totalChangeGiven: changeGivenVes, transactionCount: 0 },
      ],
      taxSummary,
      totalIvaCollected,
      totalIgtfCollected,
      totalTipsUsd,
      totalTipsVes,
      cashInMovementsUsd: 0, // Se calculará de los movimientos de sesión
      cashInMovementsVes: 0,
      cashOutMovementsUsd: 0,
      cashOutMovementsVes: 0,
      openingFundUsd: 0, // Se tomará de la sesión
      openingFundVes: 0,
      expectedCashUsd,
      expectedCashVes,
      transactions,
      exchangeRate,
    };
  }

  // ============================================
  // CÁLCULO DE DIFERENCIAS DE CAJA
  // ============================================

  private calculateCashDifferences(
    summary: any,
    session: CashRegisterSessionDocument,
    dto: CloseCashRegisterDto,
  ): any[] {
    const differences: any[] = [];

    // Calcular diferencia en USD
    const expectedUsd =
      (session.openingAmountUsd || 0) +
      summary.cashReceivedUsd -
      summary.changeGiven.find((c: any) => c.currency === "USD")?.totalChangeGiven || 0;
    const declaredUsd = dto.closingAmountUsd || 0;
    const diffUsd = declaredUsd - expectedUsd;

    differences.push({
      currency: "USD",
      expectedAmount: expectedUsd,
      declaredAmount: declaredUsd,
      difference: diffUsd,
      status:
        Math.abs(diffUsd) < 0.01
          ? "balanced"
          : diffUsd > 0
            ? "surplus"
            : "shortage",
      explanation:
        dto.declaredAmounts?.find((d) => d.currency === "USD")?.explanation,
    });

    // Calcular diferencia en VES
    const expectedVes =
      (session.openingAmountVes || 0) +
      summary.cashReceivedVes -
      summary.changeGiven.find((c: any) => c.currency === "VES")?.totalChangeGiven || 0;
    const declaredVes = dto.closingAmountVes || 0;
    const diffVes = declaredVes - expectedVes;

    differences.push({
      currency: "VES",
      expectedAmount: expectedVes,
      declaredAmount: declaredVes,
      difference: diffVes,
      status:
        Math.abs(diffVes) < 1
          ? "balanced"
          : diffVes > 0
            ? "surplus"
            : "shortage",
      explanation:
        dto.declaredAmounts?.find((d) => d.currency === "VES")?.explanation,
    });

    return differences;
  }

  // ============================================
  // CONSULTAS
  // ============================================

  async getOpenSession(user: any): Promise<CashRegisterSessionDocument | null> {
    return this.sessionModel.findOne({
      tenantId: user.tenantId,
      cashierId: new Types.ObjectId(user.id),
      status: "open",
    });
  }

  async getAllOpenSessions(tenantId: string): Promise<CashRegisterSessionDocument[]> {
    return this.sessionModel
      .find({ tenantId, status: "open" })
      .sort({ openedAt: -1 });
  }

  async findSessions(
    tenantId: string,
    query: CashRegisterQueryDto,
  ): Promise<{
    data: CashRegisterSession[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: any = { tenantId };

    if (query.startDate || query.endDate) {
      filter.openedAt = {};
      if (query.startDate) filter.openedAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.openedAt.$lte = new Date(query.endDate);
    }

    if (query.cashierId) {
      filter.cashierId = new Types.ObjectId(query.cashierId);
    }

    if (query.registerName) {
      filter.registerName = query.registerName;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);

    const [data, total] = await Promise.all([
      this.sessionModel
        .find(filter)
        .sort({ openedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.sessionModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findClosings(
    tenantId: string,
    query: CashRegisterClosingQueryDto,
  ): Promise<{
    data: CashRegisterClosing[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const filter: any = { tenantId };

    if (query.startDate || query.endDate) {
      filter.periodEnd = {};
      if (query.startDate) filter.periodEnd.$gte = new Date(query.startDate);
      if (query.endDate) filter.periodEnd.$lte = new Date(query.endDate);
    }

    if (query.cashierId) {
      filter.cashierId = new Types.ObjectId(query.cashierId);
    }

    if (query.registerName) {
      filter.registerName = query.registerName;
    }

    if (query.closingType) {
      filter.closingType = query.closingType;
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.hasDifferences !== undefined) {
      filter.hasDifferences = query.hasDifferences;
    }

    const page = Math.max(query.page || 1, 1);
    const limit = Math.min(Math.max(query.limit || 20, 1), 100);

    const [data, total] = await Promise.all([
      this.closingModel
        .find(filter)
        .sort({ periodEnd: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.closingModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getClosingById(
    closingId: string,
    tenantId: string,
  ): Promise<CashRegisterClosingDocument> {
    const closing = await this.closingModel.findOne({
      _id: closingId,
      tenantId,
    });

    if (!closing) {
      throw new NotFoundException("Cierre de caja no encontrado");
    }

    return closing;
  }

  // ============================================
  // APROBACIÓN / RECHAZO
  // ============================================

  async approveClosing(
    dto: ApproveClosingDto,
    user: any,
  ): Promise<CashRegisterClosingDocument> {
    const closing = await this.closingModel.findOne({
      _id: dto.closingId,
      tenantId: user.tenantId,
    });

    if (!closing) {
      throw new NotFoundException("Cierre de caja no encontrado");
    }

    if (closing.status === "approved") {
      throw new BadRequestException("Este cierre ya fue aprobado");
    }

    closing.status = "approved";
    closing.approvedBy = new Types.ObjectId(user.id);
    closing.approvedAt = new Date();
    closing.approvalNotes = dto.approvalNotes;

    await closing.save();

    this.logger.log(`Cierre ${closing.closingNumber} aprobado por usuario ${user.id}`);

    return closing;
  }

  async rejectClosing(
    dto: RejectClosingDto,
    user: any,
  ): Promise<CashRegisterClosingDocument> {
    const closing = await this.closingModel.findOne({
      _id: dto.closingId,
      tenantId: user.tenantId,
    });

    if (!closing) {
      throw new NotFoundException("Cierre de caja no encontrado");
    }

    if (closing.status === "approved") {
      throw new BadRequestException("No se puede rechazar un cierre ya aprobado");
    }

    closing.status = "rejected";
    closing.rejectionReason = dto.rejectionReason;

    await closing.save();

    this.logger.log(`Cierre ${closing.closingNumber} rechazado por usuario ${user.id}`);

    return closing;
  }

  // ============================================
  // REPORTES
  // ============================================

  async generateReport(
    tenantId: string,
    dto: CashRegisterReportDto,
  ): Promise<any> {
    const periodStart = new Date(dto.startDate);
    const periodEnd = new Date(dto.endDate);

    // Obtener cierres en el período
    const filter: any = {
      tenantId,
      periodEnd: { $gte: periodStart, $lte: periodEnd },
      status: "approved",
    };

    if (dto.cashierIds?.length) {
      filter.cashierId = { $in: dto.cashierIds.map((id) => new Types.ObjectId(id)) };
    }

    if (dto.registerNames?.length) {
      filter.registerName = { $in: dto.registerNames };
    }

    const closings = await this.closingModel.find(filter).lean();

    // Agrupar según lo solicitado
    const grouped: any = {};

    for (const closing of closings) {
      let key: string;
      if (dto.groupBy === "daily") {
        key = closing.periodEnd.toISOString().split("T")[0];
      } else if (dto.groupBy === "weekly") {
        const weekStart = new Date(closing.periodEnd);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().split("T")[0];
      } else if (dto.groupBy === "monthly") {
        key = `${closing.periodEnd.getFullYear()}-${String(closing.periodEnd.getMonth() + 1).padStart(2, "0")}`;
      } else {
        key = "total";
      }

      if (!grouped[key]) {
        grouped[key] = {
          period: key,
          totalClosings: 0,
          totalGrossSalesUsd: 0,
          totalGrossSalesVes: 0,
          totalNetSalesUsd: 0,
          totalNetSalesVes: 0,
          totalTransactions: 0,
          totalIvaCollected: 0,
          totalIgtfCollected: 0,
          totalTipsUsd: 0,
          totalTipsVes: 0,
          paymentMethodBreakdown: {},
        };
      }

      const g = grouped[key];
      g.totalClosings++;
      g.totalGrossSalesUsd += closing.totalGrossSalesUsd || 0;
      g.totalGrossSalesVes += closing.totalGrossSalesVes || 0;
      g.totalNetSalesUsd += closing.totalNetSalesUsd || 0;
      g.totalNetSalesVes += closing.totalNetSalesVes || 0;
      g.totalTransactions += closing.totalTransactions || 0;
      g.totalIvaCollected += closing.totalIvaCollected || 0;
      g.totalIgtfCollected += closing.totalIgtfCollected || 0;
      g.totalTipsUsd += closing.totalTipsUsd || 0;
      g.totalTipsVes += closing.totalTipsVes || 0;

      // Agregar breakdown por método de pago
      for (const pm of closing.paymentMethodSummary || []) {
        if (!g.paymentMethodBreakdown[pm.methodId]) {
          g.paymentMethodBreakdown[pm.methodId] = {
            methodId: pm.methodId,
            methodName: pm.methodName,
            totalAmountUsd: 0,
            totalAmountVes: 0,
            transactionCount: 0,
          };
        }
        g.paymentMethodBreakdown[pm.methodId].totalAmountUsd += pm.totalAmountUsd || 0;
        g.paymentMethodBreakdown[pm.methodId].totalAmountVes += pm.totalAmountVes || 0;
        g.paymentMethodBreakdown[pm.methodId].transactionCount += pm.transactionCount || 0;
      }
    }

    // Convertir payment breakdown a array
    for (const key of Object.keys(grouped)) {
      grouped[key].paymentMethodBreakdown = Object.values(
        grouped[key].paymentMethodBreakdown,
      );
    }

    return {
      periodStart,
      periodEnd,
      groupBy: dto.groupBy || "total",
      data: Object.values(grouped),
      summary: {
        totalClosings: closings.length,
        totalGrossSalesUsd: closings.reduce(
          (sum, c) => sum + (c.totalGrossSalesUsd || 0),
          0,
        ),
        totalGrossSalesVes: closings.reduce(
          (sum, c) => sum + (c.totalGrossSalesVes || 0),
          0,
        ),
        totalTransactions: closings.reduce(
          (sum, c) => sum + (c.totalTransactions || 0),
          0,
        ),
      },
    };
  }

  // ============================================
  // EXPORTACIÓN
  // ============================================

  /**
   * REPAIR UTILITY: Re-calculates and updates the latest closing.
   * Use this to fix reports generated before the logic fix.
   */
  async repairLastClosing(tenantId: string) {
    const lastClosing = await this.closingModel.findOne({ tenantId }).sort({ createdAt: -1 });
    if (!lastClosing) throw new NotFoundException("No closings found to repair");

    this.logger.warn(`Reparing closing ${lastClosing.closingNumber} (ID: ${lastClosing._id})...`);

    // Re-calculate totals
    const calculatedTotals = await this.calculateSessionTotals(lastClosing.sessionId.toString(), tenantId);

    // Update fields
    lastClosing.totalTransactions = calculatedTotals.totalOrders;

    lastClosing.cashReceivedUsd = calculatedTotals.cashUsd;
    lastClosing.cashReceivedVes = calculatedTotals.cashVes;

    // Payment Method breakdown
    lastClosing.paymentMethodSummary = calculatedTotals.paymentMethodSummary || [];

    // Tax summary
    lastClosing.taxSummary = calculatedTotals.taxSummary || [];

    // Change Given
    lastClosing.changeGiven = [
      { currency: 'USD', totalChangeGiven: calculatedTotals.changeGivenUsd || 0, transactionCount: 0 },
      { currency: 'VES', totalChangeGiven: calculatedTotals.changeGivenVes || 0, transactionCount: 0 }
    ];

    // Cash Movements (need to re-fetch session to get movements if not in calculatedTotals, but we can do it)
    const session = await this.sessionModel.findById(lastClosing.sessionId);
    if (session) {
      const cashMovements = session.cashMovements || [];
      lastClosing.cashInMovementsUsd = cashMovements.filter(m => m.type === 'in' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
      lastClosing.cashInMovementsVes = cashMovements.filter(m => m.type === 'in' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);
      lastClosing.cashOutMovementsUsd = cashMovements.filter(m => m.type === 'out' && m.currency === 'USD').reduce((s, m) => s + m.amount, 0);
      lastClosing.cashOutMovementsVes = cashMovements.filter(m => m.type === 'out' && m.currency === 'VES').reduce((s, m) => s + m.amount, 0);
    }

    await lastClosing.save();
    this.logger.log(`Closing ${lastClosing.closingNumber} repaired successfully.`);
    return lastClosing;
  }

  async exportClosing(
    closingId: string,
    tenantId: string,
    format: string,
  ): Promise<any> {
    const closing = await this.getClosingById(closingId, tenantId);

    if (format === 'pdf') {
      const doc = new PDFDocument({
        size: [226, 800], // ~80mm width x dynamic height (auto-paged)
        margins: { top: 10, bottom: 10, left: 10, right: 10 },
        autoFirstPage: true
      });

      const buffer = [];
      doc.on('data', calculate => { }); // no-op to keeping stream active if needed, but we return doc directly usually or stream it.
      // Actually best practice in NestJS is to return the stream directly or buffer it.
      // Let's return the doc stream for the controller to pipe.

      // HEADER
      doc.fontSize(10).font('Helvetica-Bold').text('REPORTE DE CIERRE', { align: 'center' });
      doc.fontSize(8).font('Helvetica').text(`Cierre #: ${closing.closingNumber}`, { align: 'left' });
      doc.text(`Fecha: ${closing.periodEnd.toLocaleString()}`);
      doc.text(`Cajero: ${closing.cashierName}`);
      doc.text(`Caja: ${closing.registerName}`);
      doc.moveDown();

      // SALES SUMMARY
      doc.font('Helvetica-Bold').text('RESUMEN DE VENTAS');
      doc.font('Helvetica').text('--------------------------------');
      doc.text(`Transacciones: ${closing.totalTransactions}`);
      doc.text(`Ventas Brutas: $${closing.totalGrossSalesUsd.toFixed(2)}`);
      doc.text(`Ventas Brutas (Bs): Bs.${closing.totalGrossSalesVes.toFixed(2)}`);
      doc.moveDown();

      // PAYMENT METHODS
      doc.font('Helvetica-Bold').text('FORMAS DE PAGO');
      doc.font('Helvetica').text('--------------------------------');
      closing.paymentMethodSummary.forEach(pm => {
        doc.text(`${this.getPaymentMethodName(pm.methodId)}:`);
        doc.text(`  $${pm.totalAmountUsd.toFixed(2)} / Bs.${pm.totalAmountVes.toFixed(2)}`, { indent: 10 });
      });
      doc.moveDown();

      // TAXES
      doc.font('Helvetica-Bold').text('IMPUESTOS');
      doc.font('Helvetica').text('--------------------------------');
      const iva = closing.totalIvaCollected || closing.taxSummary?.find(t => t.taxType === 'IVA')?.taxAmount || 0;
      const igtf = closing.totalIgtfCollected || closing.taxSummary?.find(t => t.taxType === 'IGTF')?.taxAmount || 0;
      doc.text(`IVA (16%): $${iva.toFixed(2)}`);
      doc.text(`IGTF (3%): $${igtf.toFixed(2)}`);
      doc.moveDown();

      // CASH MOVEMENTS (Derived)
      doc.font('Helvetica-Bold').text('MOVIMIENTOS DE CAJA');
      doc.font('Helvetica').text('--------------------------------');
      // Entradas
      const entradasUsd = (closing.cashInMovementsUsd || 0) + (closing.cashReceivedUsd || 0);
      const entradasVes = (closing.cashInMovementsVes || 0) + (closing.cashReceivedVes || 0);
      doc.text(`Entradas (+):`);
      doc.text(`  USD: $${entradasUsd.toFixed(2)}`, { indent: 10 });
      doc.text(`  VES: Bs.${entradasVes.toFixed(2)}`, { indent: 10 });

      // Salidas
      const salidasUsd = (closing.cashOutMovementsUsd || 0) + (closing.changeGiven?.find(c => c.currency === 'USD')?.totalChangeGiven || 0);
      const salidasVes = (closing.cashOutMovementsVes || 0) + (closing.changeGiven?.find(c => c.currency === 'VES')?.totalChangeGiven || 0);
      doc.text(`Salidas (-):`);
      doc.text(`  USD: $${salidasUsd.toFixed(2)}`, { indent: 10 });
      doc.text(`  VES: Bs.${salidasVes.toFixed(2)}`, { indent: 10 });

      // Neto
      const netoUsd = entradasUsd - salidasUsd;
      const netoVes = entradasVes - salidasVes;
      doc.font('Helvetica-Bold').text(`NETO CAJA:`);
      doc.text(`  USD: $${netoUsd.toFixed(2)}`, { indent: 10 });
      doc.text(`  VES: Bs.${netoVes.toFixed(2)}`, { indent: 10 });

      doc.end();

      return { stream: doc, type: 'pdf', filename: `cierre-${closing.closingNumber}.pdf` };
    }

    return {
      format,
      data: closing,
      generatedAt: new Date(),
    };
  }

  // ============================================
  // HELPERS
  // ============================================

  private getPaymentMethodName(methodId: string): string {
    const methodNames: Record<string, string> = {
      efectivo_usd: "Efectivo USD",
      efectivo_ves: "Efectivo VES",
      transferencia_usd: "Transferencia USD",
      transferencia_ves: "Transferencia VES",
      zelle_usd: "Zelle",
      pago_movil_ves: "Pago Móvil",
      pos_ves: "POS",
      tarjeta_ves: "Tarjeta de Crédito",
      tarjeta_usd: "Tarjeta de Crédito USD",
    };
    return methodNames[methodId] || methodId;
  }
}
