import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ConfigService } from "@nestjs/config";
import {
  BinancePayTransaction,
  BinancePayTransactionDocument,
  BinancePayStatus,
  BinancePayTransactionType,
} from "../../schemas/binance-pay-transaction.schema";
import { BinancePayApiProvider } from "./binance-pay-api.provider";
import {
  CreateBinancePayOrderDto,
  BinancePayWebhookDto,
  BinancePayWebhookPayData,
  BinancePayWebhookRefundData,
  BinancePayWebhookEvent,
} from "./dto";

@Injectable()
export class BinancePayService {
  private readonly logger = new Logger(BinancePayService.name);

  constructor(
    @InjectModel(BinancePayTransaction.name)
    private readonly transactionModel: Model<BinancePayTransactionDocument>,
    private readonly binancePayApi: BinancePayApiProvider,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Genera un ID único para la orden
   */
  private generateMerchantTradeNo(tenantId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BPAY-${tenantId.substring(0, 8)}-${timestamp}-${random}`;
  }

  /**
   * Crea una nueva orden de pago con Binance Pay
   */
  async createOrder(
    tenantId: string,
    dto: CreateBinancePayOrderDto,
    userId?: string,
  ): Promise<BinancePayTransactionDocument> {
    // Verificar que Binance Pay está configurado
    if (!this.binancePayApi.isConfigured()) {
      throw new BadRequestException(
        "Binance Pay no está configurado. Contacte al administrador.",
      );
    }

    // Validar que si es suscripción, tenga plan
    if (
      dto.transactionType === BinancePayTransactionType.SUBSCRIPTION &&
      !dto.subscriptionPlanId
    ) {
      throw new BadRequestException(
        "subscriptionPlanId es requerido para transacciones de suscripción",
      );
    }

    const merchantTradeNo = this.generateMerchantTradeNo(tenantId);
    const currency = dto.currency || "USDT";

    // Construir URLs de callback
    const baseUrl = this.configService.get<string>("APP_BASE_URL");
    const returnUrl = `${baseUrl}/payment/success?tradeNo=${merchantTradeNo}`;
    const cancelUrl = `${baseUrl}/payment/cancel?tradeNo=${merchantTradeNo}`;
    const webhookUrl = `${baseUrl}/api/binance-pay/webhook`;

    // Crear registro en base de datos primero
    const transaction = new this.transactionModel({
      tenantId,
      merchantTradeNo,
      transactionType: dto.transactionType,
      subscriptionPlanId: dto.subscriptionPlanId
        ? new Types.ObjectId(dto.subscriptionPlanId)
        : undefined,
      productName: dto.productName,
      productDetail: dto.productDetail,
      orderAmount: dto.orderAmount,
      currency,
      status: BinancePayStatus.INITIAL,
      buyerEmail: dto.buyerEmail,
      buyerName: dto.buyerName,
      metadata: dto.metadata,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      statusHistory: [
        {
          status: BinancePayStatus.INITIAL,
          changedAt: new Date(),
        },
      ],
    });

    await transaction.save();

    try {
      // Llamar a Binance Pay API
      const response = await this.binancePayApi.createOrder({
        merchantTradeNo,
        orderAmount: dto.orderAmount,
        currency,
        productName: dto.productName,
        productDetail: dto.productDetail,
        returnUrl,
        cancelUrl,
        webhookUrl,
        buyerEmail: dto.buyerEmail,
        buyerName: dto.buyerName,
      });

      if (response.status !== "SUCCESS" || !response.data) {
        // Actualizar estado a error
        transaction.status = BinancePayStatus.ERROR;
        transaction.statusHistory.push({
          status: BinancePayStatus.ERROR,
          changedAt: new Date(),
          errorMessage: response.errorMessage || "Error desconocido de Binance Pay",
        });
        transaction.rawResponse = response;
        await transaction.save();

        throw new BadRequestException(
          response.errorMessage || "Error al crear la orden en Binance Pay",
        );
      }

      // Actualizar transacción con datos de Binance
      transaction.prepayId = response.data.prepayId;
      transaction.checkoutUrl = response.data.checkoutUrl;
      transaction.qrcodeLink = response.data.qrcodeLink;
      transaction.universalUrl = response.data.universalUrl;
      transaction.deeplink = response.data.deeplink;
      transaction.expireTime = new Date(response.data.expireTime);
      transaction.status = BinancePayStatus.PENDING;
      transaction.rawResponse = response.data;
      transaction.statusHistory.push({
        status: BinancePayStatus.PENDING,
        changedAt: new Date(),
      });

      await transaction.save();

      this.logger.log(
        `Orden Binance Pay creada: ${merchantTradeNo} para tenant ${tenantId}`,
      );

      return transaction;
    } catch (error) {
      // Si es un error de Binance Pay ya manejado, re-lanzar
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Error inesperado
      transaction.status = BinancePayStatus.ERROR;
      transaction.statusHistory.push({
        status: BinancePayStatus.ERROR,
        changedAt: new Date(),
        errorMessage: error.message,
      });
      await transaction.save();

      this.logger.error(
        `Error creando orden Binance Pay: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException(
        "Error al procesar el pago. Por favor intente nuevamente.",
      );
    }
  }

  /**
   * Obtiene una transacción por merchantTradeNo
   */
  async findByMerchantTradeNo(
    tenantId: string,
    merchantTradeNo: string,
  ): Promise<BinancePayTransactionDocument> {
    const transaction = await this.transactionModel.findOne({
      tenantId,
      merchantTradeNo,
    });

    if (!transaction) {
      throw new NotFoundException(
        `Transacción ${merchantTradeNo} no encontrada`,
      );
    }

    return transaction;
  }

  /**
   * Obtiene una transacción por ID
   */
  async findById(
    tenantId: string,
    id: string,
  ): Promise<BinancePayTransactionDocument> {
    const transaction = await this.transactionModel.findOne({
      tenantId,
      _id: new Types.ObjectId(id),
    });

    if (!transaction) {
      throw new NotFoundException(`Transacción ${id} no encontrada`);
    }

    return transaction;
  }

  /**
   * Lista todas las transacciones de un tenant con filtros
   */
  async findAll(
    tenantId: string,
    query: {
      status?: BinancePayStatus;
      transactionType?: BinancePayTransactionType;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    },
  ): Promise<{
    transactions: BinancePayTransactionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const filter: any = { tenantId };

    if (query.status) {
      filter.status = query.status;
    }

    if (query.transactionType) {
      filter.transactionType = query.transactionType;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        filter.createdAt.$gte = query.startDate;
      }
      if (query.endDate) {
        filter.createdAt.$lte = query.endDate;
      }
    }

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.transactionModel.countDocuments(filter),
    ]);

    return {
      transactions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Consulta el estado actual de una orden en Binance Pay
   */
  async syncOrderStatus(
    tenantId: string,
    merchantTradeNo: string,
  ): Promise<BinancePayTransactionDocument> {
    const transaction = await this.findByMerchantTradeNo(
      tenantId,
      merchantTradeNo,
    );

    // Si ya está en estado final, no consultar
    if (
      [
        BinancePayStatus.PAID,
        BinancePayStatus.CANCELED,
        BinancePayStatus.REFUNDED,
      ].includes(transaction.status as BinancePayStatus)
    ) {
      return transaction;
    }

    try {
      const response = await this.binancePayApi.queryOrder({
        merchantTradeNo,
      });

      if (response.status === "SUCCESS" && response.data) {
        const binanceStatus = response.data.status;
        let newStatus: BinancePayStatus;

        switch (binanceStatus) {
          case "INITIAL":
            newStatus = BinancePayStatus.INITIAL;
            break;
          case "PENDING":
            newStatus = BinancePayStatus.PENDING;
            break;
          case "PAID":
            newStatus = BinancePayStatus.PAID;
            break;
          case "CANCELED":
            newStatus = BinancePayStatus.CANCELED;
            break;
          case "EXPIRED":
            newStatus = BinancePayStatus.EXPIRED;
            break;
          case "REFUNDING":
            newStatus = BinancePayStatus.REFUNDING;
            break;
          case "REFUNDED":
            newStatus = BinancePayStatus.REFUNDED;
            break;
          default:
            newStatus = transaction.status as BinancePayStatus;
        }

        if (newStatus !== transaction.status) {
          transaction.status = newStatus;
          transaction.statusHistory.push({
            status: newStatus,
            changedAt: new Date(),
          });

          if (response.data.transactionId) {
            transaction.transactionalId = response.data.transactionId;
          }

          await transaction.save();

          this.logger.log(
            `Orden ${merchantTradeNo} actualizada a estado ${newStatus}`,
          );
        }
      }

      return transaction;
    } catch (error) {
      this.logger.error(
        `Error sincronizando estado de orden ${merchantTradeNo}: ${error.message}`,
      );
      return transaction;
    }
  }

  /**
   * Procesa un webhook de Binance Pay
   */
  async handleWebhook(
    payload: string,
    timestamp: string,
    nonce: string,
    signature: string,
  ): Promise<{ returnCode: string; returnMessage: string }> {
    // Verificar firma
    const isValid = this.binancePayApi.verifyWebhookSignature(
      payload,
      timestamp,
      nonce,
      signature,
    );

    if (!isValid) {
      this.logger.warn("Webhook con firma inválida recibido");
      return { returnCode: "FAIL", returnMessage: "Invalid signature" };
    }

    try {
      const webhookData: BinancePayWebhookDto = JSON.parse(payload);
      const eventData = JSON.parse(webhookData.data);

      this.logger.log(`Webhook recibido: ${webhookData.bizType}`);

      // Buscar la transacción
      const transaction = await this.transactionModel.findOne({
        merchantTradeNo: eventData.merchantTradeNo,
      });

      if (!transaction) {
        this.logger.warn(
          `Transacción no encontrada para webhook: ${eventData.merchantTradeNo}`,
        );
        // Retornar SUCCESS para que Binance no reintente
        return { returnCode: "SUCCESS", returnMessage: "OK" };
      }

      // Verificar si ya fue procesado (idempotencia)
      if (transaction.webhookProcessed) {
        this.logger.log(
          `Webhook ya procesado para ${eventData.merchantTradeNo}`,
        );
        return { returnCode: "SUCCESS", returnMessage: "OK" };
      }

      // Procesar según tipo de evento
      switch (webhookData.bizType) {
        case BinancePayWebhookEvent.PAY_SUCCESS:
          await this.handlePaymentSuccess(
            transaction,
            eventData as BinancePayWebhookPayData,
          );
          break;

        case BinancePayWebhookEvent.PAY_CLOSED:
          await this.handlePaymentClosed(transaction, eventData);
          break;

        case BinancePayWebhookEvent.PAY_REFUNDED:
          await this.handlePaymentRefunded(
            transaction,
            eventData as BinancePayWebhookRefundData,
          );
          break;

        default:
          this.logger.warn(`Tipo de evento desconocido: ${webhookData.bizType}`);
      }

      return { returnCode: "SUCCESS", returnMessage: "OK" };
    } catch (error) {
      this.logger.error(`Error procesando webhook: ${error.message}`, error.stack);
      return { returnCode: "FAIL", returnMessage: error.message };
    }
  }

  /**
   * Procesa un pago exitoso
   */
  private async handlePaymentSuccess(
    transaction: BinancePayTransactionDocument,
    data: BinancePayWebhookPayData,
  ): Promise<void> {
    transaction.status = BinancePayStatus.PAID;
    transaction.transactionalId = data.transactionId;
    transaction.webhookProcessed = true;
    transaction.webhookProcessedAt = new Date();

    if (data.payerInfo) {
      transaction.payer = {
        binanceId: data.openUserId,
      };
    }

    transaction.statusHistory.push({
      status: BinancePayStatus.PAID,
      changedAt: new Date(),
      webhookData: data,
    });

    await transaction.save();

    this.logger.log(`Pago confirmado para ${transaction.merchantTradeNo}`);

    // TODO: Aquí se puede emitir un evento para activar la suscripción
    // Ejemplo: this.eventEmitter.emit('binancePay.paymentSuccess', transaction);
  }

  /**
   * Procesa una orden cerrada/cancelada
   */
  private async handlePaymentClosed(
    transaction: BinancePayTransactionDocument,
    data: any,
  ): Promise<void> {
    transaction.status = BinancePayStatus.CANCELED;
    transaction.webhookProcessed = true;
    transaction.webhookProcessedAt = new Date();

    transaction.statusHistory.push({
      status: BinancePayStatus.CANCELED,
      changedAt: new Date(),
      webhookData: data,
    });

    await transaction.save();

    this.logger.log(`Orden cancelada: ${transaction.merchantTradeNo}`);
  }

  /**
   * Procesa un reembolso
   */
  private async handlePaymentRefunded(
    transaction: BinancePayTransactionDocument,
    data: BinancePayWebhookRefundData,
  ): Promise<void> {
    transaction.status = BinancePayStatus.REFUNDED;
    transaction.webhookProcessed = true;
    transaction.webhookProcessedAt = new Date();

    transaction.refundInfo = {
      refundId: data.refundId,
      refundAmount: data.refundedAmount,
      refundedAt: new Date(),
    };

    transaction.statusHistory.push({
      status: BinancePayStatus.REFUNDED,
      changedAt: new Date(),
      webhookData: data,
    });

    await transaction.save();

    this.logger.log(`Reembolso procesado para ${transaction.merchantTradeNo}`);
  }

  /**
   * Solicita un reembolso para una transacción
   */
  async requestRefund(
    tenantId: string,
    merchantTradeNo: string,
    amount?: number,
    reason?: string,
  ): Promise<BinancePayTransactionDocument> {
    const transaction = await this.findByMerchantTradeNo(
      tenantId,
      merchantTradeNo,
    );

    if (transaction.status !== BinancePayStatus.PAID) {
      throw new BadRequestException(
        "Solo se pueden reembolsar transacciones pagadas",
      );
    }

    if (!transaction.prepayId) {
      throw new BadRequestException(
        "No se puede procesar el reembolso: falta prepayId",
      );
    }

    const refundAmount = amount || transaction.orderAmount;
    const refundRequestId = `REF-${merchantTradeNo}-${Date.now()}`;

    try {
      const response = await this.binancePayApi.refundOrder({
        refundRequestId,
        prepayId: transaction.prepayId,
        refundAmount,
        refundReason: reason,
      });

      if (response.status !== "SUCCESS" || !response.data) {
        throw new BadRequestException(
          response.errorMessage || "Error al procesar el reembolso",
        );
      }

      transaction.status = BinancePayStatus.REFUNDING;
      transaction.refundInfo = {
        refundId: response.data.refundId,
        refundAmount,
        refundReason: reason,
      };

      transaction.statusHistory.push({
        status: BinancePayStatus.REFUNDING,
        changedAt: new Date(),
      });

      await transaction.save();

      this.logger.log(`Reembolso solicitado para ${merchantTradeNo}`);

      return transaction;
    } catch (error) {
      this.logger.error(
        `Error solicitando reembolso: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Obtiene un resumen de transacciones para el dashboard
   */
  async getSummary(tenantId: string): Promise<{
    totalTransactions: number;
    totalPaid: number;
    totalPending: number;
    totalAmount: number;
    byCurrency: Record<string, { count: number; amount: number }>;
  }> {
    const [totals, byCurrency] = await Promise.all([
      this.transactionModel.aggregate([
        { $match: { tenantId } },
        {
          $group: {
            _id: null,
            totalTransactions: { $sum: 1 },
            totalPaid: {
              $sum: { $cond: [{ $eq: ["$status", BinancePayStatus.PAID] }, 1, 0] },
            },
            totalPending: {
              $sum: {
                $cond: [
                  { $in: ["$status", [BinancePayStatus.INITIAL, BinancePayStatus.PENDING]] },
                  1,
                  0,
                ],
              },
            },
            totalAmount: {
              $sum: {
                $cond: [{ $eq: ["$status", BinancePayStatus.PAID] }, "$orderAmount", 0],
              },
            },
          },
        },
      ]),
      this.transactionModel.aggregate([
        { $match: { tenantId, status: BinancePayStatus.PAID } },
        {
          $group: {
            _id: "$currency",
            count: { $sum: 1 },
            amount: { $sum: "$orderAmount" },
          },
        },
      ]),
    ]);

    const currencyMap: Record<string, { count: number; amount: number }> = {};
    byCurrency.forEach((item) => {
      currencyMap[item._id] = { count: item.count, amount: item.amount };
    });

    return {
      totalTransactions: totals[0]?.totalTransactions || 0,
      totalPaid: totals[0]?.totalPaid || 0,
      totalPending: totals[0]?.totalPending || 0,
      totalAmount: totals[0]?.totalAmount || 0,
      byCurrency: currencyMap,
    };
  }
}
