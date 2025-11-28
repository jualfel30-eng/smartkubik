import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Promotion, PromotionDocument } from "../../schemas/promotion.schema";
import {
  PromotionUsage,
  PromotionUsageDocument,
} from "../../schemas/promotion-usage.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  CreatePromotionDto,
  UpdatePromotionDto,
  FindApplicablePromotionsDto,
  ApplyPromotionDto,
  GetPromotionsQueryDto,
  PromotionApplicationResponseDto,
  PromotionStatsResponseDto,
} from "../../dto/promotion.dto";

@Injectable()
export class PromotionsService {
  constructor(
    @InjectModel(Promotion.name)
    private promotionModel: Model<PromotionDocument>,
    @InjectModel(PromotionUsage.name)
    private promotionUsageModel: Model<PromotionUsageDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Crear una nueva promoción
   */
  async create(
    tenantId: string,
    dto: CreatePromotionDto,
    userId?: string,
  ): Promise<PromotionDocument> {
    // Validaciones de negocio
    if (new Date(dto.startDate) >= new Date(dto.endDate)) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    // Validaciones específicas por tipo
    this.validatePromotionType(dto);

    const status = this.determineStatus(dto.startDate, dto.endDate, dto.status);

    const promotion = await this.promotionModel.create({
      tenantId: new Types.ObjectId(tenantId),
      name: dto.name,
      description: dto.description,
      type: dto.type,
      status,
      startDate: dto.startDate,
      endDate: dto.endDate,
      priority: dto.priority || 0,
      discountValue: dto.discountValue,
      maxDiscountAmount: dto.maxDiscountAmount,
      buyQuantity: dto.buyQuantity,
      getQuantity: dto.getQuantity,
      getDiscountPercentage: dto.getDiscountPercentage,
      tiers: dto.tiers,
      minimumPurchaseAmount: dto.minimumPurchaseAmount,
      minimumQuantity: dto.minimumQuantity,
      applicableProducts: dto.applicableProducts?.map(
        (id) => new Types.ObjectId(id),
      ),
      applicableCategories: dto.applicableCategories?.map(
        (id) => new Types.ObjectId(id),
      ),
      excludedProducts: dto.excludedProducts?.map(
        (id) => new Types.ObjectId(id),
      ),
      bundleItems: dto.bundleItems?.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        quantity: item.quantity,
      })),
      bundleDiscountPercentage: dto.bundleDiscountPercentage,
      applicableDays: dto.applicableDays,
      applicableStartTime: dto.applicableStartTime,
      applicableEndTime: dto.applicableEndTime,
      maxUsageCount: dto.maxUsageCount,
      currentUsageCount: 0,
      maxUsagePerCustomer: dto.maxUsagePerCustomer,
      customerEligibility: dto.customerEligibility || "all",
      excludedCustomers: dto.excludedCustomers?.map(
        (id) => new Types.ObjectId(id),
      ),
      combinableWithCoupons: dto.combinableWithCoupons ?? false,
      combinableWithOtherPromotions: dto.combinableWithOtherPromotions ?? false,
      autoApply: dto.autoApply ?? true,
      showInStorefront: dto.showInStorefront ?? true,
      imageUrl: dto.imageUrl,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      metadata: dto.metadata,
      totalRevenue: 0,
      totalOrders: 0,
      totalDiscountGiven: 0,
    });

    return promotion;
  }

  /**
   * Validar configuración según tipo de promoción
   */
  private validatePromotionType(dto: CreatePromotionDto) {
    const type = dto.type;

    if (!type) return;

    switch (type) {
      case "percentage_discount":
        if (!dto.discountValue || dto.discountValue > 100) {
          throw new BadRequestException(
            "El descuento porcentual debe estar entre 0 y 100",
          );
        }
        break;

      case "fixed_amount_discount":
        if (!dto.discountValue || dto.discountValue <= 0) {
          throw new BadRequestException(
            "El monto de descuento debe ser mayor a 0",
          );
        }
        break;

      case "buy_x_get_y":
        if (!dto.buyQuantity || !dto.getQuantity) {
          throw new BadRequestException(
            "Debe especificar buyQuantity y getQuantity",
          );
        }
        if (!dto.getDiscountPercentage) {
          throw new BadRequestException(
            "Debe especificar getDiscountPercentage (0-100)",
          );
        }
        break;

      case "tiered_pricing":
        if (!dto.tiers || dto.tiers.length === 0) {
          throw new BadRequestException("Debe especificar al menos un tier");
        }
        break;

      case "bundle_discount":
        if (!dto.bundleItems || dto.bundleItems.length < 2) {
          throw new BadRequestException(
            "Un bundle debe tener al menos 2 productos",
          );
        }
        if (!dto.bundleDiscountPercentage) {
          throw new BadRequestException(
            "Debe especificar bundleDiscountPercentage",
          );
        }
        break;
    }
  }

  /**
   * Determinar el estado de la promoción
   */
  private determineStatus(
    startDate: Date,
    endDate: Date,
    requestedStatus?: string,
  ): string {
    const now = new Date();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < now) return "expired";
    if (start > now) return "scheduled";
    if (requestedStatus === "inactive") return "inactive";
    return "active";
  }

  /**
   * Actualizar promoción
   */
  async update(
    tenantId: string,
    promotionId: string,
    dto: UpdatePromotionDto,
  ): Promise<PromotionDocument> {
    const promotion = await this.promotionModel.findOne({
      _id: new Types.ObjectId(promotionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!promotion) {
      throw new NotFoundException("Promoción no encontrada");
    }

    // Validar si hay cambios en fechas
    if (dto.startDate && dto.endDate) {
      if (new Date(dto.startDate) >= new Date(dto.endDate)) {
        throw new BadRequestException(
          "La fecha de inicio debe ser anterior a la fecha de fin",
        );
      }
    }

    // Actualizar campos
    Object.keys(dto).forEach((key) => {
      if (dto[key] !== undefined) {
        if (
          key === "applicableProducts" ||
          key === "applicableCategories" ||
          key === "excludedProducts" ||
          key === "excludedCustomers"
        ) {
          promotion[key] = dto[key]?.map((id) => new Types.ObjectId(id));
        } else if (key === "bundleItems") {
          promotion[key] = dto[key]?.map((item) => ({
            productId: new Types.ObjectId(item.productId),
            quantity: item.quantity,
          }));
        } else if (key === "metadata") {
          promotion.metadata = { ...promotion.metadata, ...dto[key] };
        } else {
          promotion[key] = dto[key];
        }
      }
    });

    // Actualizar status si cambió
    const newStatus = this.determineStatus(
      promotion.startDate,
      promotion.endDate,
      dto.status,
    );
    promotion.status = newStatus;

    await promotion.save();
    return promotion;
  }

  /**
   * Encontrar promociones aplicables a una orden
   */
  async findApplicable(
    tenantId: string,
    dto: FindApplicablePromotionsDto,
  ): Promise<PromotionDocument[]> {
    const now = new Date();
    const dayOfWeek = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][now.getDay()];

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      status: "active",
      startDate: { $lte: now },
      endDate: { $gte: now },
      autoApply: true,
    };

    // Filtrar por día de la semana si aplica
    filter.$or = [
      { applicableDays: { $exists: false } },
      { applicableDays: { $size: 0 } },
      { applicableDays: dayOfWeek },
    ];

    const promotions = await this.promotionModel
      .find(filter)
      .sort({ priority: -1 })
      .lean();

    // Filtrar adicionales en memoria
    const applicable: any[] = [];

    for (const promotion of promotions) {
      // Verificar límite de uso total
      if (
        promotion.maxUsageCount &&
        promotion.currentUsageCount >= promotion.maxUsageCount
      ) {
        continue;
      }

      // Verificar límite de uso por cliente
      if (dto.customerId && promotion.maxUsagePerCustomer) {
        const customerUsage = await this.promotionUsageModel.countDocuments({
          tenantId: new Types.ObjectId(tenantId),
          promotionId: promotion._id,
          customerId: new Types.ObjectId(dto.customerId),
        });

        if (customerUsage >= promotion.maxUsagePerCustomer) {
          continue;
        }
      }

      // Verificar monto mínimo
      if (
        dto.orderAmount &&
        promotion.minimumPurchaseAmount &&
        dto.orderAmount < promotion.minimumPurchaseAmount
      ) {
        continue;
      }

      // Verificar horario
      if (promotion.applicableStartTime && promotion.applicableEndTime) {
        const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        if (
          currentTime < promotion.applicableStartTime ||
          currentTime > promotion.applicableEndTime
        ) {
          continue;
        }
      }

      // Verificar productos/categorías si se proporcionan
      if (dto.productItems && dto.productItems.length > 0) {
        if (
          promotion.applicableProducts &&
          promotion.applicableProducts.length > 0
        ) {
          const hasApplicableProduct = dto.productItems.some((item) =>
            promotion.applicableProducts!.some(
              (id) => id.toString() === item.productId,
            ),
          );
          if (!hasApplicableProduct) continue;
        }

        if (
          promotion.applicableCategories &&
          promotion.applicableCategories.length > 0
        ) {
          const hasApplicableCategory = dto.productItems.some(
            (item) =>
              item.categoryId &&
              promotion.applicableCategories!.some(
                (id) => id.toString() === item.categoryId,
              ),
          );
          if (!hasApplicableCategory) continue;
        }
      }

      applicable.push(promotion);
    }

    return applicable as PromotionDocument[];
  }

  /**
   * Calcular descuento de una promoción
   */
  async calculateDiscount(
    promotion: PromotionDocument | any,
    dto: ApplyPromotionDto,
  ): Promise<PromotionApplicationResponseDto> {
    let discountAmount = 0;
    const productsAffected: any[] = [];

    switch (promotion.type) {
      case "percentage_discount":
        discountAmount = (dto.orderAmount * promotion.discountValue) / 100;
        if (promotion.maxDiscountAmount) {
          discountAmount = Math.min(
            discountAmount,
            promotion.maxDiscountAmount,
          );
        }
        break;

      case "fixed_amount_discount":
        discountAmount = Math.min(promotion.discountValue, dto.orderAmount);
        break;

      case "buy_x_get_y":
        // Lógica BOGO
        const applicableItems = this.filterApplicableItems(
          dto.productItems,
          promotion,
        );
        const totalQty = applicableItems.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        const sets = Math.floor(
          totalQty / (promotion.buyQuantity + promotion.getQuantity),
        );
        if (sets > 0) {
          // Calcular descuento en los items "get"
          const itemsToDiscount = sets * promotion.getQuantity;
          const sortedItems = [...applicableItems].sort(
            (a, b) => a.price - b.price,
          );

          let remainingToDiscount = itemsToDiscount;
          for (const item of sortedItems) {
            if (remainingToDiscount <= 0) break;
            const qtyToDiscount = Math.min(item.quantity, remainingToDiscount);
            const itemDiscount =
              (item.price *
                qtyToDiscount *
                (promotion.getDiscountPercentage || 100)) /
              100;
            discountAmount += itemDiscount;
            remainingToDiscount -= qtyToDiscount;

            productsAffected.push({
              productId: item.productId,
              originalPrice: item.price,
              discountedPrice:
                item.price -
                (item.price * (promotion.getDiscountPercentage || 100)) / 100,
              discountAmount: itemDiscount,
            });
          }
        }
        break;

      case "tiered_pricing":
        // Descuento escalonado por cantidad
        const items = this.filterApplicableItems(dto.productItems, promotion);
        const totalQuantity = items.reduce(
          (sum, item) => sum + item.quantity,
          0,
        );

        const applicableTier = promotion.tiers
          ?.sort((a, b) => b.minQuantity - a.minQuantity)
          .find((tier) => {
            if (tier.maxQuantity) {
              return (
                totalQuantity >= tier.minQuantity &&
                totalQuantity <= tier.maxQuantity
              );
            }
            return totalQuantity >= tier.minQuantity;
          });

        if (applicableTier) {
          const subtotal = items.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0,
          );
          discountAmount =
            (subtotal * applicableTier.discountPercentage) / 100;
        }
        break;

      case "bundle_discount":
        // Verificar si el carrito contiene el bundle completo
        const hasBundle = promotion.bundleItems?.every((bundleItem) => {
          const cartItem = dto.productItems.find(
            (item) => item.productId === bundleItem.productId.toString(),
          );
          return cartItem && cartItem.quantity >= bundleItem.quantity;
        });

        if (hasBundle) {
          const bundleTotal = promotion.bundleItems!.reduce((sum, bundleItem) => {
            const cartItem = dto.productItems.find(
              (item) => item.productId === bundleItem.productId.toString(),
            )!;
            return sum + cartItem.price * bundleItem.quantity;
          }, 0);

          discountAmount =
            (bundleTotal * (promotion.bundleDiscountPercentage || 0)) / 100;
        }
        break;
    }

    const finalAmount = Math.max(0, dto.orderAmount - discountAmount);

    return {
      isApplicable: discountAmount > 0,
      promotionId: promotion._id.toString(),
      promotionName: promotion.name,
      promotionType: promotion.type,
      message:
        discountAmount > 0
          ? `Promoción "${promotion.name}" aplicada`
          : "Promoción no aplicable",
      discountAmount,
      finalAmount,
      productsAffected:
        productsAffected.length > 0 ? productsAffected : undefined,
    };
  }

  /**
   * Filtrar items aplicables según configuración de promoción
   */
  private filterApplicableItems(
    items: Array<{ productId: string; quantity: number; price: number; categoryId?: string }>,
    promotion: any,
  ) {
    let filtered = [...items];

    // Filtrar por productos excluidos
    if (promotion.excludedProducts && promotion.excludedProducts.length > 0) {
      filtered = filtered.filter(
        (item) =>
          !promotion.excludedProducts.some(
            (id) => id.toString() === item.productId,
          ),
      );
    }

    // Filtrar por productos aplicables
    if (
      promotion.applicableProducts &&
      promotion.applicableProducts.length > 0
    ) {
      filtered = filtered.filter((item) =>
        promotion.applicableProducts.some(
          (id) => id.toString() === item.productId,
        ),
      );
    }

    // Filtrar por categorías
    if (
      promotion.applicableCategories &&
      promotion.applicableCategories.length > 0
    ) {
      filtered = filtered.filter(
        (item) =>
          item.categoryId &&
          promotion.applicableCategories.some(
            (id) => id.toString() === item.categoryId,
          ),
      );
    }

    return filtered;
  }

  /**
   * Aplicar promoción a una orden
   */
  async apply(
    tenantId: string,
    dto: ApplyPromotionDto,
  ): Promise<{
    usage: PromotionUsageDocument;
    result: PromotionApplicationResponseDto;
  }> {
    const promotion = await this.promotionModel.findOne({
      _id: new Types.ObjectId(dto.promotionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!promotion) {
      throw new NotFoundException("Promoción no encontrada");
    }

    // Calcular descuento
    const result = await this.calculateDiscount(promotion, dto);

    if (!result.isApplicable || !result.discountAmount) {
      throw new BadRequestException("La promoción no es aplicable");
    }

    // Registrar uso
    const usage = await this.promotionUsageModel.create({
      tenantId: new Types.ObjectId(tenantId),
      promotionId: promotion._id,
      promotionName: promotion.name,
      customerId: dto.customerId
        ? new Types.ObjectId(dto.customerId)
        : undefined,
      orderId: new Types.ObjectId(dto.orderId),
      orderAmount: dto.orderAmount,
      discountAmount: result.discountAmount,
      finalAmount: result.finalAmount!,
      appliedAt: new Date(),
      metadata: {
        promotionType: promotion.type,
        productsAffected: result.productsAffected?.map((p) => p.productId),
      },
    });

    // Actualizar estadísticas de la promoción
    await this.promotionModel.updateOne(
      { _id: promotion._id },
      {
        $inc: {
          currentUsageCount: 1,
          totalOrders: 1,
          totalRevenue: result.finalAmount!,
          totalDiscountGiven: result.discountAmount,
        },
      },
    );

    return { usage, result };
  }

  /**
   * Obtener lista de promociones
   */
  async findAll(tenantId: string, query: GetPromotionsQueryDto) {
    const { search, status, type, onlyActive, showInStorefront, page = 1, limit = 20 } = query;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (type) {
      filter.type = type;
    }

    if (onlyActive) {
      const now = new Date();
      filter.status = "active";
      filter.startDate = { $lte: now };
      filter.endDate = { $gte: now };
    }

    if (showInStorefront !== undefined) {
      filter.showInStorefront = showInStorefront;
    }

    const skip = (page - 1) * limit;

    const [promotions, total] = await Promise.all([
      this.promotionModel
        .find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.promotionModel.countDocuments(filter),
    ]);

    return {
      promotions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener una promoción por ID
   */
  async findOne(
    tenantId: string,
    promotionId: string,
  ): Promise<PromotionDocument> {
    const promotion = await this.promotionModel.findOne({
      _id: new Types.ObjectId(promotionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!promotion) {
      throw new NotFoundException("Promoción no encontrada");
    }

    return promotion;
  }

  /**
   * Obtener estadísticas de una promoción
   */
  async getStats(
    tenantId: string,
    promotionId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<PromotionStatsResponseDto> {
    const promotion = await this.findOne(tenantId, promotionId);

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      promotionId: promotion._id,
    };

    if (startDate || endDate) {
      filter.appliedAt = {};
      if (startDate) filter.appliedAt.$gte = startDate;
      if (endDate) filter.appliedAt.$lte = endDate;
    }

    const usages = await this.promotionUsageModel.find(filter).lean();

    const totalUsageCount = usages.length;
    const totalRevenue = usages.reduce((sum, u) => sum + u.finalAmount, 0);
    const totalDiscountGiven = usages.reduce(
      (sum, u) => sum + u.discountAmount,
      0,
    );
    const totalOrders = usages.length;

    // Agrupar por fecha
    const usageByDate = usages.reduce(
      (acc, usage) => {
        const date = new Date(usage.appliedAt).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { orders: 0, revenue: 0, discount: 0 };
        }
        acc[date].orders++;
        acc[date].revenue += usage.finalAmount;
        acc[date].discount += usage.discountAmount;
        return acc;
      },
      {} as Record<
        string,
        { orders: number; revenue: number; discount: number }
      >,
    );

    const usageByDateArray = Object.entries(usageByDate).map(
      ([date, data]) => ({
        date,
        orders: data.orders,
        revenue: data.revenue,
        discount: data.discount,
      }),
    );

    return {
      promotionId: promotion._id.toString(),
      name: promotion.name,
      type: promotion.type,
      status: promotion.status,
      totalUsageCount,
      maxUsageCount: promotion.maxUsageCount,
      remainingUses: promotion.maxUsageCount
        ? promotion.maxUsageCount - totalUsageCount
        : undefined,
      totalRevenue,
      totalOrders,
      totalDiscountGiven,
      averageDiscountPerOrder:
        totalOrders > 0 ? totalDiscountGiven / totalOrders : 0,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      usageByDate: usageByDateArray.sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }

  /**
   * Eliminar promoción
   */
  async remove(tenantId: string, promotionId: string): Promise<void> {
    const result = await this.promotionModel.deleteOne({
      _id: new Types.ObjectId(promotionId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("Promoción no encontrada");
    }
  }

  /**
   * Job para expirar promociones
   */
  async expirePromotions(tenantId: string): Promise<number> {
    const now = new Date();

    const result = await this.promotionModel.updateMany(
      {
        tenantId: new Types.ObjectId(tenantId),
        status: { $in: ["active", "scheduled"] },
        endDate: { $lt: now },
      },
      {
        $set: { status: "expired" },
      },
    );

    return result.modifiedCount;
  }
}
