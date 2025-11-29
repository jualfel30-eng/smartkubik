import { Injectable, Logger, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  ServicePackage,
  ServicePackageDocument,
} from "../../schemas/service-package.schema";
import {
  LoyaltyTransaction,
  LoyaltyTransactionDocument,
} from "../../schemas/loyalty-transaction.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";

interface ApplyPackageBenefitsInput {
  tenantId: string;
  packageId: string;
  customerId?: string;
  currentPrice: number;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(ServicePackage.name)
    private readonly packageModel: Model<ServicePackageDocument>,
    @InjectModel(LoyaltyTransaction.name)
    private readonly transactionModel: Model<LoyaltyTransactionDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
  ) {}

  async resolveLoyaltyTier(
    tenantId: string,
    customerId?: string,
  ): Promise<string | undefined> {
    if (!customerId) {
      return undefined;
    }

    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(customerId),
        tenantId,
      })
      .lean();

    if (!customer) {
      return undefined;
    }

    return customer.loyalty?.tier || customer.tier;
  }

  async applyPackageBenefits(input: ApplyPackageBenefitsInput): Promise<{
    finalPrice: number;
    appliedBenefits: Array<Record<string, any>>;
    tier?: string;
    rewardCreditsEarned: number;
  }> {
    const { tenantId, packageId, customerId, currentPrice } = input;
    const appliedBenefits: Array<Record<string, any>> = [];

    let finalPrice = currentPrice;
    let tier: string | undefined;

    const servicePackage = await this.packageModel
      .findOne({ _id: packageId, tenantId })
      .lean();

    if (customerId) {
      const customer = await this.customerModel
        .findOne({ _id: new Types.ObjectId(customerId), tenantId })
        .lean();

      if (customer) {
        tier = customer.loyalty?.tier || customer.tier || "bronce";
        const discountPercentage = this.resolveDiscountPercentage(
          tier,
          servicePackage?.metadata,
        );

        if (discountPercentage > 0) {
          const amount = finalPrice * (discountPercentage / 100);
          finalPrice -= amount;
          appliedBenefits.push({
            type: "tier-discount",
            tier,
            percentage: discountPercentage,
            amount: Math.round((amount + Number.EPSILON) * 100) / 100,
          });
        }

        const complimentaryAddons =
          servicePackage?.metadata?.loyalty?.complimentaryAddons?.filter(
            (addon: any) => !addon.tiers?.length || addon.tiers.includes(tier!),
          );

        if (complimentaryAddons?.length) {
          appliedBenefits.push({
            type: "complimentary-addons",
            addons: complimentaryAddons.map(
              (addon: any) => addon.name || addon.id,
            ),
          });
        }

        await this.customerModel.updateOne(
          { _id: customer._id },
          {
            $set: {
              loyalty: {
                ...(customer.loyalty || {}),
                tier,
                lastUpgradeAt:
                  customer.loyalty?.tier !== tier
                    ? new Date()
                    : customer.loyalty?.lastUpgradeAt,
              },
            },
            $inc: {
              loyaltyScore: Math.max(currentPrice / 50, 1),
            },
          },
        );
      }
    }

    const rewardCreditsEarned = Math.round((currentPrice / 25) * 100) / 100;
    if (rewardCreditsEarned > 0 && customerId) {
      appliedBenefits.push({
        type: "reward-credit",
        amount: rewardCreditsEarned,
      });
    }

    finalPrice = Math.max(
      Math.round((finalPrice + Number.EPSILON) * 100) / 100,
      0,
    );

    return {
      finalPrice,
      appliedBenefits,
      tier,
      rewardCreditsEarned,
    };
  }

  async syncTierFromScore(options: {
    tenantId: string;
    customerId: string;
    loyaltyScore: number;
  }): Promise<void> {
    const { tenantId, customerId, loyaltyScore } = options;

    const tier = this.scoreToTier(loyaltyScore);

    await this.customerModel.updateOne(
      { _id: new Types.ObjectId(customerId), tenantId },
      {
        $set: {
          loyaltyScore,
          tier, // Update root tier field (used by marketing filters)
          "loyalty.tier": tier, // Also update subdocument for consistency
        },
      },
      { upsert: false },
    );
  }

  private scoreToTier(score: number): string {
    if (score >= 85) {
      return "diamante";
    }
    if (score >= 70) {
      return "oro";
    }
    if (score >= 55) {
      return "plata";
    }
    if (score >= 35) {
      return "bronce";
    }
    return "explorador";
  }

  private resolveDiscountPercentage(
    tier: string,
    metadata?: Record<string, any>,
  ): number {
    const overrides = metadata?.loyalty?.tierDiscounts || {};
    const normalizedTier = tier?.toLowerCase();
    if (overrides[normalizedTier] !== undefined) {
      return Number(overrides[normalizedTier]) || 0;
    }

    switch (normalizedTier) {
      case "diamante":
        return 18;
      case "oro":
        return 12;
      case "plata":
        return 7;
      case "bronce":
        return 3;
      default:
        return 0;
    }
  }

  // ==================== MÉTODOS DE PUNTOS DE LEALTAD ====================

  /**
   * Acumula puntos de lealtad para un cliente basado en una compra
   */
  async earnPoints(options: {
    tenantId: string;
    customerId: string;
    amount: number;
    orderId?: string;
    description?: string;
  }): Promise<LoyaltyTransactionDocument> {
    const { tenantId, customerId, amount, orderId, description } = options;

    // Obtener configuración de loyalty del tenant
    const tenant = await this.tenantModel.findById(tenantId).lean();
    const config = tenant?.settings?.loyalty || {};
    const pointsPerDollar = config.pointsPerDollar || 1; // Default: 1 punto por dólar

    // Calcular puntos a otorgar
    const points = Math.floor(amount * pointsPerDollar);

    if (points <= 0) {
      throw new BadRequestException("El monto debe generar al menos 1 punto");
    }

    // Obtener cliente
    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId,
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }

    // Calcular fecha de expiración si aplica
    let expiresAt: Date | undefined;
    if (config.pointsExpirationDays && config.pointsExpirationDays > 0) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.pointsExpirationDays);
    }

    // Crear transacción
    const transaction = await this.transactionModel.create({
      customerId: customer._id,
      tenantId,
      type: "earn",
      points,
      balanceAfter: (customer.loyaltyPoints || 0) + points,
      description: description || `Compra de $${amount.toFixed(2)}`,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      orderAmount: amount,
      pointsRate: pointsPerDollar,
      subType: "purchase",
      expiresAt,
    });

    // Actualizar puntos del cliente
    await this.customerModel.updateOne(
      { _id: customer._id },
      {
        $inc: { loyaltyPoints: points },
        $set: { lastPointsEarnedAt: new Date() },
      },
    );

    this.logger.log(
      `Customer ${customerId} earned ${points} points from $${amount} purchase`,
    );

    return transaction;
  }

  /**
   * Redime puntos de lealtad de un cliente
   */
  async redeemPoints(options: {
    tenantId: string;
    customerId: string;
    points: number;
    orderId?: string;
    description?: string;
  }): Promise<{
    transaction: LoyaltyTransactionDocument;
    discountAmount: number;
  }> {
    const { tenantId, customerId, points, orderId, description } = options;

    // Obtener configuración
    const tenant = await this.tenantModel.findById(tenantId).lean();
    const config = tenant?.settings?.loyalty || {};
    const minimumPoints = config.minimumPointsToRedeem || 100;
    const pointsValue = config.pointsValue || 0.01; // Default: 1 punto = $0.01

    // Validar mínimo de puntos
    if (points < minimumPoints) {
      throw new BadRequestException(
        `Debe redimir al menos ${minimumPoints} puntos`,
      );
    }

    // Obtener cliente
    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId,
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }

    // Verificar balance de puntos
    const availablePoints = customer.loyaltyPoints || 0;
    if (availablePoints < points) {
      throw new BadRequestException(
        `Puntos insuficientes. Disponible: ${availablePoints}, Solicitado: ${points}`,
      );
    }

    // Calcular monto del descuento
    const discountAmount = points * pointsValue;

    // Crear transacción
    const transaction = await this.transactionModel.create({
      customerId: customer._id,
      tenantId,
      type: "redeem",
      points: -points, // Negativo para indicar redención
      balanceAfter: availablePoints - points,
      description: description || `Redención de ${points} puntos`,
      orderId: orderId ? new Types.ObjectId(orderId) : undefined,
      subType: "redemption",
      metadata: {
        discountAmount,
        pointsValue,
      },
    });

    // Actualizar puntos del cliente
    await this.customerModel.updateOne(
      { _id: customer._id },
      {
        $inc: { loyaltyPoints: -points },
        $set: { lastPointsRedeemedAt: new Date() },
      },
    );

    this.logger.log(
      `Customer ${customerId} redeemed ${points} points for $${discountAmount.toFixed(2)} discount`,
    );

    return {
      transaction,
      discountAmount,
    };
  }

  /**
   * Ajusta puntos manualmente (admin)
   */
  async adjustPoints(options: {
    tenantId: string;
    customerId: string;
    points: number;
    reason: string;
    type: "admin_adjustment" | "correction" | "bonus" | "penalty";
    userId?: string;
  }): Promise<LoyaltyTransactionDocument> {
    const { tenantId, customerId, points, reason, type, userId } = options;

    if (points === 0) {
      throw new BadRequestException("El ajuste debe ser diferente de 0");
    }

    // Obtener cliente
    const customer = await this.customerModel.findOne({
      _id: new Types.ObjectId(customerId),
      tenantId,
    });

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }

    const currentPoints = customer.loyaltyPoints || 0;
    const newBalance = currentPoints + points;

    if (newBalance < 0) {
      throw new BadRequestException(
        "El ajuste resultaría en un balance negativo",
      );
    }

    // Crear transacción
    const transaction = await this.transactionModel.create({
      customerId: customer._id,
      tenantId,
      type: "adjust",
      points,
      balanceAfter: newBalance,
      description: reason,
      subType: type,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      metadata: { reason, adjustmentType: type },
    });

    // Actualizar puntos del cliente
    await this.customerModel.updateOne(
      { _id: customer._id },
      { $inc: { loyaltyPoints: points } },
    );

    this.logger.log(
      `Admin adjusted ${points} points for customer ${customerId}: ${reason}`,
    );

    return transaction;
  }

  /**
   * Obtiene el balance de puntos de un cliente
   */
  async getPointsBalance(
    tenantId: string,
    customerId: string,
  ): Promise<{
    totalPoints: number;
    availablePoints: number;
    expiringPoints: number;
    expiringDate?: Date;
    tier: string;
    pointsValue: number;
  }> {
    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(customerId),
        tenantId,
      })
      .lean();

    if (!customer) {
      throw new NotFoundException("Cliente no encontrado");
    }

    const tenant = await this.tenantModel.findById(tenantId).lean();
    const config = tenant?.settings?.loyalty || {};
    const pointsValueRate = config.pointsValue || 0.01;

    const totalPoints = customer.loyaltyPoints || 0;

    // Obtener puntos que expirarán pronto (próximos 30 días)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringTransactions = await this.transactionModel
      .find({
        customerId: customer._id,
        tenantId,
        type: "earn",
        expiresAt: { $lte: thirtyDaysFromNow, $gte: new Date() },
      })
      .sort({ expiresAt: 1 })
      .lean();

    const expiringPoints = expiringTransactions.reduce(
      (sum, t) => sum + t.points,
      0,
    );
    const expiringDate = expiringTransactions[0]?.expiresAt;

    return {
      totalPoints,
      availablePoints: totalPoints,
      expiringPoints,
      expiringDate,
      tier: customer.loyalty?.tier || customer.tier || "explorador",
      pointsValue: totalPoints * pointsValueRate,
    };
  }

  /**
   * Obtiene el historial de transacciones de puntos
   */
  async getPointsHistory(options: {
    tenantId: string;
    customerId?: string;
    type?: "earn" | "redeem" | "expire" | "adjust";
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: LoyaltyTransactionDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const {
      tenantId,
      customerId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const query: any = { tenantId };

    if (customerId) {
      query.customerId = new Types.ObjectId(customerId);
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = startDate;
      if (endDate) query.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name email")
        .lean(),
      this.transactionModel.countDocuments(query),
    ]);

    return {
      transactions: transactions as any,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Job para expirar puntos automáticamente
   */
  async expirePoints(tenantId: string): Promise<number> {
    const now = new Date();

    // Buscar transacciones de earn con puntos expirados
    const expiredTransactions = await this.transactionModel
      .find({
        tenantId,
        type: "earn",
        expiresAt: { $lte: now },
      })
      .lean();

    let totalExpired = 0;

    for (const transaction of expiredTransactions) {
      try {
        // Crear transacción de expiración
        const customer = await this.customerModel
          .findById(transaction.customerId)
          .lean();

        if (!customer) continue;

        const currentBalance = customer.loyaltyPoints || 0;
        const pointsToExpire = Math.min(transaction.points, currentBalance);

        if (pointsToExpire <= 0) continue;

        await this.transactionModel.create({
          customerId: transaction.customerId,
          tenantId,
          type: "expire",
          points: -pointsToExpire,
          balanceAfter: currentBalance - pointsToExpire,
          description: `Expiración de puntos ganados el ${new Date((transaction as any).createdAt).toLocaleDateString()}`,
          subType: "expiration",
          metadata: {
            originalTransactionId: transaction._id,
          },
        });

        await this.customerModel.updateOne(
          { _id: transaction.customerId },
          { $inc: { loyaltyPoints: -pointsToExpire } },
        );

        totalExpired += pointsToExpire;
      } catch (error) {
        this.logger.error(
          `Error expiring points for transaction ${transaction._id}: ${error.message}`,
        );
      }
    }

    this.logger.log(`Expired ${totalExpired} points for tenant ${tenantId}`);
    return totalExpired;
  }

  /**
   * Obtener lista de clientes para el selector de loyalty
   */
  async getCustomers(tenantId: string): Promise<any[]> {
    const customers = await this.customerModel
      .find({ tenantId })
      .select('_id name email phone customerNumber')
      .sort({ name: 1 })
      .limit(500)
      .lean();

    return customers;
  }
}
