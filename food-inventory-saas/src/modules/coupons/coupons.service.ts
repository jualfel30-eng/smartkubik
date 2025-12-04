import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Coupon, CouponDocument } from "../../schemas/coupon.schema";
import {
  CouponUsage,
  CouponUsageDocument,
} from "../../schemas/coupon-usage.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  ApplyCouponDto,
  GetCouponsQueryDto,
  CouponValidationResponseDto,
  CouponStatsResponseDto,
} from "../../dto/coupon.dto";

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponUsage.name)
    private couponUsageModel: Model<CouponUsageDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  /**
   * Crear un nuevo cupón
   */
  async create(
    tenantId: string,
    dto: CreateCouponDto,
    userId?: string,
  ): Promise<CouponDocument> {
    const code = dto.code.toUpperCase().trim();

    // Verificar que el código no existe
    const existing = await this.couponModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        code,
      })
      .lean();

    if (existing) {
      throw new ConflictException(`Ya existe un cupón con el código "${code}"`);
    }

    // Validaciones de negocio
    if (new Date(dto.validFrom) >= new Date(dto.validUntil)) {
      throw new BadRequestException(
        "La fecha de inicio debe ser anterior a la fecha de fin",
      );
    }

    if (dto.discountType === "percentage" && dto.discountValue > 100) {
      throw new BadRequestException(
        "El porcentaje de descuento no puede ser mayor a 100%",
      );
    }

    // Crear cupón
    const coupon = await this.couponModel.create({
      tenantId: new Types.ObjectId(tenantId),
      code,
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      minimumPurchaseAmount: dto.minimumPurchaseAmount,
      maxDiscountAmount: dto.maxDiscountAmount,
      validFrom: dto.validFrom,
      validUntil: dto.validUntil,
      isActive: dto.isActive !== undefined ? dto.isActive : true,
      maxUsageCount: dto.maxUsageCount,
      currentUsageCount: 0,
      maxUsagePerCustomer: dto.maxUsagePerCustomer,
      applicableProducts: dto.applicableProducts?.map(
        (id) => new Types.ObjectId(id),
      ),
      applicableCategories: dto.applicableCategories?.map(
        (id) => new Types.ObjectId(id),
      ),
      customerEligibility: dto.customerEligibility || "all",
      excludedCustomers: dto.excludedCustomers?.map(
        (id) => new Types.ObjectId(id),
      ),
      combinableWithOtherOffers:
        dto.combinableWithOtherOffers !== undefined
          ? dto.combinableWithOtherOffers
          : true,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      metadata: dto.metadata,
    });

    return coupon;
  }

  /**
   * Actualizar un cupón existente
   */
  async update(
    tenantId: string,
    couponId: string,
    dto: UpdateCouponDto,
  ): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!coupon) {
      throw new NotFoundException("Cupón no encontrado");
    }

    // Validaciones
    if (dto.validFrom && dto.validUntil) {
      if (new Date(dto.validFrom) >= new Date(dto.validUntil)) {
        throw new BadRequestException(
          "La fecha de inicio debe ser anterior a la fecha de fin",
        );
      }
    }

    if (
      dto.discountType === "percentage" &&
      dto.discountValue &&
      dto.discountValue > 100
    ) {
      throw new BadRequestException(
        "El porcentaje de descuento no puede ser mayor a 100%",
      );
    }

    // Actualizar campos
    if (dto.description !== undefined) coupon.description = dto.description;
    if (dto.discountType !== undefined) coupon.discountType = dto.discountType;
    if (dto.discountValue !== undefined)
      coupon.discountValue = dto.discountValue;
    if (dto.minimumPurchaseAmount !== undefined)
      coupon.minimumPurchaseAmount = dto.minimumPurchaseAmount;
    if (dto.maxDiscountAmount !== undefined)
      coupon.maxDiscountAmount = dto.maxDiscountAmount;
    if (dto.validFrom !== undefined) coupon.validFrom = dto.validFrom;
    if (dto.validUntil !== undefined) coupon.validUntil = dto.validUntil;
    if (dto.isActive !== undefined) coupon.isActive = dto.isActive;
    if (dto.maxUsageCount !== undefined)
      coupon.maxUsageCount = dto.maxUsageCount;
    if (dto.maxUsagePerCustomer !== undefined)
      coupon.maxUsagePerCustomer = dto.maxUsagePerCustomer;
    if (dto.applicableProducts !== undefined)
      coupon.applicableProducts = dto.applicableProducts.map(
        (id) => new Types.ObjectId(id),
      );
    if (dto.applicableCategories !== undefined)
      coupon.applicableCategories = dto.applicableCategories.map(
        (id) => new Types.ObjectId(id),
      );
    if (dto.customerEligibility !== undefined)
      coupon.customerEligibility = dto.customerEligibility;
    if (dto.excludedCustomers !== undefined)
      coupon.excludedCustomers = dto.excludedCustomers.map(
        (id) => new Types.ObjectId(id),
      );
    if (dto.combinableWithOtherOffers !== undefined)
      coupon.combinableWithOtherOffers = dto.combinableWithOtherOffers;
    if (dto.metadata !== undefined)
      coupon.metadata = { ...coupon.metadata, ...dto.metadata };

    await coupon.save();
    return coupon;
  }

  /**
   * Validar un cupón para aplicación en checkout
   */
  async validate(
    tenantId: string,
    dto: ValidateCouponDto,
  ): Promise<CouponValidationResponseDto> {
    const code = dto.code.toUpperCase().trim();
    const now = new Date();

    // Buscar cupón
    const coupon = await this.couponModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        code,
      })
      .lean();

    if (!coupon) {
      return {
        isValid: false,
        code,
        message: "Cupón no encontrado",
      };
    }

    // Verificar estado activo
    if (!coupon.isActive) {
      return {
        isValid: false,
        code,
        message: "Este cupón no está activo",
      };
    }

    // Verificar validez temporal
    if (now < new Date(coupon.validFrom)) {
      return {
        isValid: false,
        code,
        message: `Este cupón será válido a partir del ${new Date(coupon.validFrom).toLocaleDateString()}`,
      };
    }

    if (now > new Date(coupon.validUntil)) {
      return {
        isValid: false,
        code,
        message: "Este cupón ha expirado",
      };
    }

    // Verificar límite de uso total
    if (
      coupon.maxUsageCount &&
      coupon.currentUsageCount >= coupon.maxUsageCount
    ) {
      return {
        isValid: false,
        code,
        message: "Este cupón ha alcanzado su límite de usos",
      };
    }

    // Verificar límite de uso por cliente
    if (coupon.maxUsagePerCustomer) {
      const customerUsageCount = await this.couponUsageModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        couponId: coupon._id,
        customerId: new Types.ObjectId(dto.customerId),
      });

      if (customerUsageCount >= coupon.maxUsagePerCustomer) {
        return {
          isValid: false,
          code,
          message: "Has alcanzado el límite de usos de este cupón",
        };
      }
    }

    // Verificar monto mínimo de compra
    if (
      coupon.minimumPurchaseAmount &&
      dto.orderAmount < coupon.minimumPurchaseAmount
    ) {
      return {
        isValid: false,
        code,
        message: `Monto mínimo requerido: $${coupon.minimumPurchaseAmount.toFixed(2)}`,
      };
    }

    // Verificar elegibilidad del cliente
    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(dto.customerId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!customer) {
      return {
        isValid: false,
        code,
        message: "Cliente no encontrado",
      };
    }

    // Verificar si cliente está excluido
    if (
      coupon.excludedCustomers &&
      coupon.excludedCustomers.some((id) => id.equals(customer._id))
    ) {
      return {
        isValid: false,
        code,
        message: "Este cupón no está disponible para tu cuenta",
      };
    }

    // Verificar elegibilidad por tipo de cliente
    if (coupon.customerEligibility === "new_customers") {
      // Verificar si es cliente nuevo (sin órdenes previas)
      // Aquí podrías verificar contra el modelo Order
      // Por ahora asumimos que está bien
    }

    // Verificar productos/categorías aplicables
    if (
      coupon.applicableProducts &&
      coupon.applicableProducts.length > 0 &&
      dto.productIds
    ) {
      const hasApplicableProduct = dto.productIds.some((productId) =>
        coupon.applicableProducts!.some((id) => id.toString() === productId),
      );

      if (!hasApplicableProduct) {
        return {
          isValid: false,
          code,
          message: "Este cupón no es válido para los productos seleccionados",
        };
      }
    }

    if (
      coupon.applicableCategories &&
      coupon.applicableCategories.length > 0 &&
      dto.categoryIds
    ) {
      const hasApplicableCategory = dto.categoryIds.some((categoryId) =>
        coupon.applicableCategories!.some((id) => id.toString() === categoryId),
      );

      if (!hasApplicableCategory) {
        return {
          isValid: false,
          code,
          message: "Este cupón no es válido para las categorías seleccionadas",
        };
      }
    }

    // Calcular descuento
    let discountAmount = 0;
    if (coupon.discountType === "percentage") {
      discountAmount = (dto.orderAmount * coupon.discountValue) / 100;
      // Aplicar máximo de descuento si existe
      if (coupon.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountAmount);
      }
    } else {
      // fixed_amount
      discountAmount = Math.min(coupon.discountValue, dto.orderAmount);
    }

    const finalAmount = Math.max(0, dto.orderAmount - discountAmount);

    return {
      isValid: true,
      code,
      message: "Cupón válido",
      discountAmount,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      finalAmount,
      couponId: coupon._id.toString(),
    };
  }

  /**
   * Aplicar cupón a una orden y registrar uso
   */
  async apply(
    tenantId: string,
    dto: ApplyCouponDto,
  ): Promise<{
    usage: CouponUsageDocument;
    discountAmount: number;
  }> {
    // Primero validar
    const validation = await this.validate(tenantId, {
      code: dto.code,
      customerId: dto.customerId,
      orderAmount: dto.orderAmount,
    });

    if (!validation.isValid) {
      throw new BadRequestException(validation.message);
    }

    const code = dto.code.toUpperCase().trim();

    const coupon = await this.couponModel.findOne({
      tenantId: new Types.ObjectId(tenantId),
      code,
    });

    if (!coupon) {
      throw new NotFoundException("Cupón no encontrado");
    }

    // Registrar uso
    const usage = await this.couponUsageModel.create({
      tenantId: new Types.ObjectId(tenantId),
      couponId: coupon._id,
      couponCode: code,
      customerId: new Types.ObjectId(dto.customerId),
      orderId: new Types.ObjectId(dto.orderId),
      orderAmount: dto.orderAmount,
      discountAmount: validation.discountAmount!,
      usedAt: new Date(),
      metadata: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
      },
    });

    // Incrementar contador de uso
    await this.couponModel.updateOne(
      { _id: coupon._id },
      { $inc: { currentUsageCount: 1 } },
    );

    return {
      usage,
      discountAmount: validation.discountAmount!,
    };
  }

  /**
   * Obtener lista de cupones con filtros
   */
  async findAll(tenantId: string, query: GetCouponsQueryDto) {
    const {
      search,
      isActive,
      discountType,
      onlyValid,
      onlyAvailable,
      page = 1,
      limit = 20,
    } = query;

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
    };

    // Filtro por búsqueda
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // Filtro por estado activo
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // Filtro por tipo de descuento
    if (discountType) {
      filter.discountType = discountType;
    }

    // Filtro por validez temporal
    if (onlyValid) {
      const now = new Date();
      filter.validFrom = { $lte: now };
      filter.validUntil = { $gte: now };
    }

    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      this.couponModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.couponModel.countDocuments(filter),
    ]);

    // Filtrar por disponibilidad si se requiere
    let filteredCoupons = coupons;
    if (onlyAvailable) {
      filteredCoupons = coupons.filter((coupon) => {
        if (
          coupon.maxUsageCount &&
          coupon.currentUsageCount >= coupon.maxUsageCount
        ) {
          return false;
        }
        return true;
      });
    }

    return {
      coupons: filteredCoupons,
      total: onlyAvailable ? filteredCoupons.length : total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener un cupón por ID
   */
  async findOne(tenantId: string, couponId: string): Promise<CouponDocument> {
    const coupon = await this.couponModel.findOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!coupon) {
      throw new NotFoundException("Cupón no encontrado");
    }

    return coupon;
  }

  /**
   * Obtener estadísticas de uso de un cupón
   */
  async getStats(
    tenantId: string,
    couponId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<CouponStatsResponseDto> {
    const coupon = await this.findOne(tenantId, couponId);

    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      couponId: coupon._id,
    };

    if (startDate || endDate) {
      filter.usedAt = {};
      if (startDate) filter.usedAt.$gte = startDate;
      if (endDate) filter.usedAt.$lte = endDate;
    }

    const usages = await this.couponUsageModel.find(filter).lean();

    const totalUsageCount = usages.length;
    const totalDiscountAmount = usages.reduce(
      (sum, u) => sum + u.discountAmount,
      0,
    );
    const totalOrderAmount = usages.reduce((sum, u) => sum + u.orderAmount, 0);
    const uniqueCustomers = new Set(usages.map((u) => u.customerId.toString()))
      .size;

    // Agrupar por fecha
    const usageByDate = usages.reduce(
      (acc, usage) => {
        const date = new Date(usage.usedAt).toISOString().split("T")[0];
        if (!acc[date]) {
          acc[date] = { count: 0, discountAmount: 0 };
        }
        acc[date].count++;
        acc[date].discountAmount += usage.discountAmount;
        return acc;
      },
      {} as Record<string, { count: number; discountAmount: number }>,
    );

    const usageByDateArray = Object.entries(usageByDate).map(
      ([date, data]) => ({
        date,
        count: data.count,
        discountAmount: data.discountAmount,
      }),
    );

    return {
      couponId: coupon._id.toString(),
      code: coupon.code,
      totalUsageCount,
      maxUsageCount: coupon.maxUsageCount,
      remainingUses: coupon.maxUsageCount
        ? coupon.maxUsageCount - totalUsageCount
        : undefined,
      totalDiscountAmount,
      totalOrderAmount,
      averageDiscountAmount:
        totalUsageCount > 0 ? totalDiscountAmount / totalUsageCount : 0,
      uniqueCustomers,
      usageByDate: usageByDateArray.sort((a, b) =>
        a.date.localeCompare(b.date),
      ),
    };
  }

  /**
   * Eliminar un cupón
   */
  async remove(tenantId: string, couponId: string): Promise<void> {
    const result = await this.couponModel.deleteOne({
      _id: new Types.ObjectId(couponId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("Cupón no encontrado");
    }
  }

  /**
   * Obtener historial de uso de cupones por cliente
   */
  async getCustomerUsageHistory(
    tenantId: string,
    customerId: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const [usages, total] = await Promise.all([
      this.couponUsageModel
        .find({
          tenantId: new Types.ObjectId(tenantId),
          customerId: new Types.ObjectId(customerId),
        })
        .sort({ usedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("couponId")
        .lean(),
      this.couponUsageModel.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        customerId: new Types.ObjectId(customerId),
      }),
    ]);

    return {
      usages,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
