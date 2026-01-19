import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Order, OrderDocument, OrderItem } from "../../schemas/order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  BankAccount,
  BankAccountDocument,
} from "../../schemas/bank-account.schema";
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderCalculationDto,
  BulkRegisterPaymentsDto,
  CreateOrderItemDto,
} from "../../dto/order.dto";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import { PaymentsService } from "../payments/payments.service";
import { DeliveryService } from "../delivery/delivery.service";
import { ExchangeRateService } from "../exchange-rate/exchange-rate.service";
import { CreatePaymentDto } from "../../dto/payment.dto";
import { UnitConversionUtil } from "../../utils/unit-conversion.util";
import { ShiftsService } from "../shifts/shifts.service";
import { FEATURES } from "../../config/features.config";
import { getVerticalProfile } from "../../config/vertical-profiles";
import { DiscountService } from "./services/discount.service";
import { TransactionHistoryService } from "../../services/transaction-history.service";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../schemas/bill-of-materials.schema";
import { Modifier } from "../../schemas/modifier.schema";
import { CouponsService } from "../coupons/coupons.service";
import { PromotionsService } from "../promotions/promotions.service";
import { WhapiService } from "../whapi/whapi.service";
import { InventoryMovementsService } from "../inventory/inventory-movements.service";
import { MovementType } from "../../dto/inventory-movement.dto";
import { WhatsAppOrderNotificationsService } from "./whatsapp-order-notifications.service";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(BankAccount.name)
    private bankAccountModel: Model<BankAccountDocument>,
    @InjectModel(BillOfMaterials.name)
    private bomModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Modifier.name)
    private modifierModel: Model<Modifier>,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly paymentsService: PaymentsService,
    private readonly deliveryService: DeliveryService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly shiftsService: ShiftsService,
    private readonly discountService: DiscountService,
    private readonly transactionHistoryService: TransactionHistoryService,
    private readonly couponsService: CouponsService,
    private readonly promotionsService: PromotionsService,
    private readonly whapiService: WhapiService,
    private readonly inventoryMovementsService: InventoryMovementsService,
    private readonly whatsappOrderNotificationsService: WhatsAppOrderNotificationsService,
    private readonly eventEmitter: EventEmitter2,
    @InjectConnection() private readonly connection: Connection,
  ) { }

  private async getTenantVerticalProfile(tenantId: string | Types.ObjectId): Promise<any> {
    const tenant = await this.tenantModel.findById(tenantId).select('vertical settings').lean() as any;
    // Prioritize specific vertical setting, fallback to tenant vertical, then default
    const verticalKey = tenant?.settings?.vertical || tenant?.vertical || 'food-service';
    return getVerticalProfile(verticalKey);
  }

  async getPaymentMethods(user: any): Promise<any> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    const baseMethods = [
      { id: "efectivo_usd", name: "Efectivo (USD)", igtfApplicable: true },
      { id: "transferencia_usd", name: "Transferencia (USD)", igtfApplicable: true },
      { id: "zelle_usd", name: "Zelle (USD)", igtfApplicable: true },
      { id: "efectivo_ves", name: "Efectivo (VES)", igtfApplicable: false },
      { id: "transferencia_ves", name: "Transferencia (VES)", igtfApplicable: false },
      { id: "pago_movil_ves", name: "Pago Móvil (VES)", igtfApplicable: false },
      { id: "pos_ves", name: "Punto de Venta (VES)", igtfApplicable: false },
      { id: "tarjeta_ves", name: "Tarjeta (VES)", igtfApplicable: false },
      { id: "pago_mixto", name: "Pago Mixto", igtfApplicable: false },
    ];

    // Check if tenant has customized payment methods
    const configuredMethods = tenant.settings?.paymentMethods;
    // ... logic
    if (configuredMethods && configuredMethods.length > 0) {
      // Filter base methods strictly based on enabled config AND merge details
      const enabledMap = new Map(
        configuredMethods.filter((m) => m.enabled).map((m) => [m.id, m])
      );

      const activeMethods = baseMethods
        .filter((method) => enabledMap.has(method.id))
        .map((method) => {
          const config = enabledMap.get(method.id);
          return {
            ...method,
            enabled: true,
            instructions: config?.instructions,
            details: config?.details
          };
        });

      return { methods: activeMethods };
    }

    // Default fallback: return all base methods
    return { methods: baseMethods };
  }

  async getTopSellingProducts(tenantId: string, limit: number = 5): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.orderModel.aggregate([
      {
        $match: {
          tenantId: new Types.ObjectId(tenantId),
          status: { $ne: 'cancelled' },
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          totalQuantity: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } },
          productName: { $first: "$items.productName" } // Optimistic name
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productInfo"
        }
      },
      { $unwind: { path: "$productInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productName: { $ifNull: ["$productInfo.name", "$productName"] },
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    const { customerId, customerName, customerRif, taxType, items, payments, customerAddress, customerPhone } =
      createOrderDto;
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant || tenant.usage.currentOrders >= tenant.limits.maxOrders) {
      throw new BadRequestException(
        "Límite de órdenes alcanzado o tenant no encontrado.",
      );
    }

    let customer: CustomerDocument | null = null;
    if (customerId) {
      customer = await this.customerModel.findById(customerId).exec();
      // Update existing customer from ID if needed
      if (customer) {
        let updated = false;
        if (customerPhone && !customer.contacts.some(c => c.value === customerPhone)) {
          customer.contacts.push({ type: 'phone', value: customerPhone, isPrimary: false, isActive: true } as any);
          updated = true;
        }
        if (customerAddress && !customer.addresses.some(a => a.street === customerAddress)) {
          customer.addresses.push({
            type: 'billing',
            street: customerAddress,
            city: 'Valencia',
            state: 'Carabobo',
            country: 'Venezuela',
            isDefault: false
          } as any);
          updated = true;
        }
        if (updated) {
          await customer.save();
        }
      }
    } else if (customerRif && customerName) {
      customer = await this.customerModel
        .findOne({ "taxInfo.taxId": customerRif, tenantId: user.tenantId })
        .exec();
      if (!customer) {
        const contacts: any[] = [];
        if (customerPhone) {
          contacts.push({ type: 'phone', value: customerPhone, isPrimary: true });
        }

        const addresses: any[] = [];
        if (customerAddress) {
          addresses.push({
            type: 'billing',
            street: customerAddress,
            city: 'Valencia', // Default fallback
            state: 'Carabobo', // Default fallback
            country: 'Venezuela',
            isDefault: true
          });
        }

        customer = await new this.customerModel({
          name: customerName,
          customerType: "individual",
          customerNumber: `CUST-${Date.now()}`,
          taxInfo: { taxId: customerRif, taxType, taxName: customerName },
          contacts,
          addresses,
          createdBy: user.id,
          tenantId: user.tenantId,
        }).save();
      } else {
        // Should update existing customer if new info is provided?
        let updated = false;

        if (customerPhone && !customer.contacts.some(c => c.value === customerPhone)) {
          customer.contacts.push({ type: 'phone', value: customerPhone, isPrimary: false, isActive: true } as any);
          updated = true;
        }

        if (customerAddress && !customer.addresses.some(a => a.street === customerAddress)) {
          customer.addresses.push({
            type: 'billing',
            street: customerAddress,
            city: 'Valencia',
            state: 'Carabobo',
            country: 'Venezuela',
            isDefault: false
          } as any);
          updated = true;
        }

        if (updated) {
          await customer.save();
        }
      }
    }

    if (!customer) {
      throw new BadRequestException(
        "Se debe proporcionar un ID de cliente o los datos para crear uno nuevo.",
      );
    }

    // Update customer location if provided in the order and customer doesn't have one or it's different
    if (createOrderDto.customerLocation && customer) {
      const shouldUpdateLocation =
        !customer.primaryLocation ||
        customer.primaryLocation.coordinates?.lat !==
        createOrderDto.customerLocation.coordinates?.lat ||
        customer.primaryLocation.coordinates?.lng !==
        createOrderDto.customerLocation.coordinates?.lng;

      if (shouldUpdateLocation) {
        await this.customerModel.findByIdAndUpdate(customer._id, {
          primaryLocation: createOrderDto.customerLocation,
        });
        this.logger.log(`Updated customer ${customer._id} location from order`);
      }
    }

    const products = await this.productModel.find({
      _id: { $in: items.map((i) => i.productId) },
    });
    const detailedItems: OrderItem[] = [];
    let subtotal = 0;
    let ivaTotal = 0;

    for (const itemDto of items) {
      const product = products.find(
        (p) => p._id.toString() === itemDto.productId,
      );
      if (!product)
        throw new NotFoundException(
          `Producto con ID "${itemDto.productId}" no encontrado.`,
        );

      const variant = this.resolveVariant(product, itemDto);

      let originalUnitPrice: number;
      let costPrice: number;
      let conversionFactor = 1;
      let quantityInBaseUnit = itemDto.quantity;
      let selectedUnit: string | undefined;

      // ======== MULTI-UNIT LOGIC / GET ORIGINAL PRICE ========
      if (
        product.hasMultipleSellingUnits &&
        itemDto.selectedUnit &&
        product.sellingUnits?.length > 0
      ) {
        const sellingUnit = UnitConversionUtil.validateQuantityAndUnit(
          itemDto.quantity,
          itemDto.selectedUnit,
          product.sellingUnits,
        );
        originalUnitPrice = sellingUnit.pricePerUnit;
        costPrice = sellingUnit.costPerUnit;
        conversionFactor = sellingUnit.conversionFactor;
        selectedUnit = sellingUnit.abbreviation;
        quantityInBaseUnit = UnitConversionUtil.convertToBaseUnit(
          itemDto.quantity,
          sellingUnit,
        );
      } else {
        originalUnitPrice = variant?.basePrice ?? 0;
        costPrice = variant?.costPrice ?? 0;
        selectedUnit = undefined;
      }

      // ======== DISCOUNT CALCULATION ========
      // OPTIMIZED: Pass product object instead of ID to avoid redundant DB query
      const discountResult = await this.discountService.calculateBestDiscount(
        product, // Pass full product object (already loaded)
        itemDto.quantity,
        originalUnitPrice,
      );

      const finalUnitPrice = discountResult.discountedPrice;
      const totalPrice = UnitConversionUtil.calculateTotalPrice(
        itemDto.quantity,
        finalUnitPrice,
      );
      const totalDiscountAmount =
        (originalUnitPrice - finalUnitPrice) * itemDto.quantity;

      const isIvaApplicable = itemDto.ivaApplicable !== undefined ? itemDto.ivaApplicable : product.ivaApplicable;
      const ivaAmount = isIvaApplicable ? totalPrice * 0.16 : 0;

      const attributesSnapshot = this.buildOrderItemAttributes(
        product,
        variant,
        itemDto,
      );
      const attributeSummary = this.buildAttributeSummary(attributesSnapshot);

      // Crear OrderItem con toda la información de unidades y descuentos
      detailedItems.push({
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        variantId: variant?._id,
        variantSku: variant?.sku,
        quantity: itemDto.quantity,
        selectedUnit,
        conversionFactor: selectedUnit ? conversionFactor : undefined,
        quantityInBaseUnit: selectedUnit ? quantityInBaseUnit : undefined,
        unitPrice: originalUnitPrice,
        costPrice,
        totalPrice,
        ivaAmount,
        igtfAmount: 0,
        finalPrice: finalUnitPrice,
        discountPercentage: discountResult.discountPercentage,
        discountAmount: totalDiscountAmount,
        discountReason: discountResult.applied
          ? discountResult.rule
            ? "bulk"
            : "promotion"
          : undefined,
        status: "pending",
        attributes:
          Object.keys(attributesSnapshot).length > 0
            ? attributesSnapshot
            : undefined,
        attributeSummary,
      } as OrderItem);

      subtotal += totalPrice;
      ivaTotal += ivaAmount;
    }

    // Calculate delivery cost
    let shippingCost = createOrderDto.shippingCost || 0;
    let shippingInfo: any = undefined;

    if (
      createOrderDto.deliveryMethod &&
      createOrderDto.deliveryMethod !== "pickup"
    ) {
      try {
        const deliveryCostResult =
          await this.deliveryService.calculateDeliveryCost({
            tenantId: user.tenantId,
            method: createOrderDto.deliveryMethod as
              | "pickup"
              | "delivery"
              | "envio_nacional",
            customerLocation: customer.primaryLocation?.coordinates,
            destinationState: createOrderDto.shippingAddress?.state,
            destinationCity: createOrderDto.shippingAddress?.city,
            orderAmount: subtotal + ivaTotal,
          });

        shippingCost = deliveryCostResult.cost || 0;

        if (
          createOrderDto.deliveryMethod === "delivery" ||
          createOrderDto.deliveryMethod === "envio_nacional"
        ) {
          shippingInfo = {
            method: createOrderDto.deliveryMethod,
            cost: shippingCost,
            distance: deliveryCostResult.distance,
            estimatedDuration: deliveryCostResult.duration,
            address: createOrderDto.shippingAddress,
          };
        }
      } catch (error) {
        this.logger.warn(`Error calculating delivery cost: ${error.message}`);
      }
    } else if (createOrderDto.deliveryMethod === "pickup") {
      shippingInfo = {
        method: "pickup",
        cost: 0,
      };
    }

    // ========================================
    // MARKETING: Validar cupón y aplicar promociones
    // ========================================
    let appliedCoupon: any = null;
    const appliedPromotions: any[] = [];
    let couponDiscountAmount = 0;
    let promotionsDiscountAmount = 0;

    // 1. Validar y aplicar cupón si se proporcionó
    if (createOrderDto.couponCode) {
      try {
        const couponValidation = await this.couponsService.validate(
          user.tenantId,
          {
            code: createOrderDto.couponCode.toUpperCase(),
            customerId: customer._id.toString(),
            orderAmount: subtotal,
            productIds: items.map((item) => item.productId),
          },
        );

        if (couponValidation.isValid && couponValidation.discountAmount) {
          couponDiscountAmount = couponValidation.discountAmount;

          appliedCoupon = {
            couponId: couponValidation.couponId,
            code: couponValidation.code,
            discountType: couponValidation.discountType || "unknown",
            discountValue: couponValidation.discountValue || 0,
            discountAmount: couponDiscountAmount,
          };

          this.logger.log(
            `Coupon ${couponValidation.code} applied: $${couponDiscountAmount} discount`,
          );
        }
      } catch (error) {
        this.logger.warn(`Coupon validation failed: ${error.message}`);
        // No lanzamos error, simplemente no aplicamos el cupón
      }
    }

    // 2. Buscar y aplicar promociones automáticas
    try {
      const applicablePromotions = await this.promotionsService.findApplicable(
        user.tenantId,
        {
          productItems: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          orderAmount: subtotal,
          customerId: customer._id.toString(),
        },
      );

      for (const promotion of applicablePromotions) {
        // Solo aplicar promociones con autoApply: true
        if (promotion.autoApply) {
          const result = await this.promotionsService.calculateDiscount(
            promotion,
            {
              promotionId: promotion._id.toString(),
              orderId: "", // Will be set after order is created
              customerId: customer._id.toString(),
              orderAmount: subtotal,
              productItems: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price:
                  detailedItems.find(
                    (di) => di.productId.toString() === item.productId,
                  )?.unitPrice || 0,
              })),
            },
          );

          if (
            result.isApplicable &&
            result.discountAmount &&
            result.discountAmount > 0
          ) {
            appliedPromotions.push({
              promotionId: promotion._id,
              name: promotion.name,
              type: promotion.type,
              discountAmount: result.discountAmount,
              productsAffected:
                result.productsAffected?.map((p) => p.productId) || [],
            });

            promotionsDiscountAmount += result.discountAmount;

            this.logger.log(
              `Promotion "${promotion.name}" applied: $${result.discountAmount} discount`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(`Promotions detection failed: ${error.message}`);
      // No lanzamos error, simplemente no aplicamos promociones
    }

    const totalMarketingDiscount =
      couponDiscountAmount + promotionsDiscountAmount;

    const foreignCurrencyPaymentAmount = (payments || [])
      .filter((p) => p.method.includes("_usd"))
      .reduce((sum, p) => sum + p.amount, 0);
    const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
    const totalAmount =
      subtotal +
      ivaTotal +
      igtfTotal +
      shippingCost -
      (createOrderDto.discountAmount || 0) -
      totalMarketingDiscount;

    // Calcular totalAmountVes usando la tasa de cambio actual
    let totalAmountVes = 0;
    try {
      const rateData = await this.exchangeRateService.getBCVRate();
      totalAmountVes = totalAmount * rateData.rate;
      this.logger.log(
        `Calculated totalAmountVes: ${totalAmountVes} (rate: ${rateData.rate})`,
      );
    } catch (error) {
      this.logger.warn("Failed to get exchange rate, totalAmountVes will be 0");
    }

    // Determine Fulfillment Type and Status
    const fulfillmentType =
      createOrderDto.deliveryMethod === "delivery" ||
        createOrderDto.deliveryMethod === "envio_nacional"
        ? createOrderDto.deliveryMethod === "envio_nacional"
          ? "delivery_national"
          : "delivery_local"
        : createOrderDto.deliveryMethod === "pickup"
          ? "pickup"
          : "store";

    // If it's a store sale, fulfillment is immediate
    const fulfillmentStatus = fulfillmentType === "store" ? "delivered" : "pending";
    const fulfillmentDate = fulfillmentType === "store" ? new Date() : undefined;

    const orderData: Partial<Order> = {
      orderNumber: await this.generateOrderNumber(user.tenantId),
      customerId: customer._id,
      customerName: customer.name,
      items: detailedItems,
      subtotal,
      ivaTotal,
      igtfTotal,
      totalAmount,
      totalAmountVes,
      shippingCost,
      shipping: shippingInfo,
      discountAmount: createOrderDto.discountAmount || 0,
      appliedCoupon: appliedCoupon || undefined,
      appliedPromotions:
        appliedPromotions.length > 0 ? appliedPromotions : undefined,
      payments: [],
      paymentStatus: "pending",
      notes: createOrderDto.notes,
      channel: createOrderDto.channel,
      status: "pending",
      // Fulfillment Fields
      fulfillmentType,
      fulfillmentStatus,
      fulfillmentDate,
      inventoryReservation: { isReserved: false },
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const shouldAssignEmployee =
      FEATURES.EMPLOYEE_PERFORMANCE_TRACKING && user?.id && user?.tenantId;

    if (shouldAssignEmployee) {
      try {
        const activeShift = await this.shiftsService.findActiveShift(
          user.id,
          user.tenantId,
        );

        if (activeShift) {
          const staffObjectId =
            user.id instanceof Types.ObjectId
              ? user.id
              : Types.ObjectId.isValid(user.id)
                ? new Types.ObjectId(user.id)
                : null;

          if (staffObjectId) {
            orderData.assignedTo = staffObjectId;
            this.logger.log(
              `Order will be assigned to user ${user.id} (active shift detected)`,
            );
          } else {
            this.logger.warn(
              `User ID ${user.id} is not a valid ObjectId. Skipping automatic assignment.`,
            );
          }
        } else {
          this.logger.debug(
            `User ${user.id} has no active shift. Order will remain unassigned.`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to determine active shift for user ${user?.id}: ${error.message}`,
        );
      }
    }

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();
    await this.tenantModel.findByIdAndUpdate(user.tenantId, {
      $inc: { "usage.currentOrders": 1 },
    });

    // ========================================
    // MARKETING: Track coupon and promotion usage
    // ========================================
    if (appliedCoupon) {
      try {
        await this.couponsService.apply(user.tenantId, {
          code: appliedCoupon.code,
          customerId: customer._id.toString(),
          orderId: savedOrder._id.toString(),
          orderAmount: totalAmount,
        });
        this.logger.log(
          `Coupon usage tracked for ${appliedCoupon.code} on order ${savedOrder.orderNumber}`,
        );
      } catch (error) {
        this.logger.error(`Failed to track coupon usage: ${error.message}`);
      }
    }

    if (appliedPromotions.length > 0) {
      for (const appliedPromotion of appliedPromotions) {
        try {
          await this.promotionsService.apply(user.tenantId, {
            promotionId: appliedPromotion.promotionId.toString(),
            orderId: savedOrder._id.toString(),
            customerId: customer._id.toString(),
            orderAmount: totalAmount,
            productItems: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price:
                detailedItems.find(
                  (di) => di.productId.toString() === item.productId,
                )?.unitPrice || 0,
            })),
          });
          this.logger.log(
            `Promotion usage tracked for "${appliedPromotion.name}" on order ${savedOrder.orderNumber}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to track promotion usage: ${error.message}`,
          );
        }
      }
    }

    // Emit order.created event for consumables automatic deduction
    this.eventEmitter.emit("order.created", {
      orderId: savedOrder._id.toString(),
      tenantId: user.tenantId,
      items: savedOrder.items.map((item) => ({
        productId: item.productId.toString(),
        quantity: item.quantityInBaseUnit ?? item.quantity,
      })),
      orderType: createOrderDto.deliveryMethod || "always",
      userId: user.id,
    });

    // OPTIMIZED: Parallelize payment creation instead of sequential loop
    if (payments && payments.length > 0) {
      await Promise.all(
        payments.map((p) => {
          const paymentDto: CreatePaymentDto = {
            paymentType: "sale",
            orderId: savedOrder._id.toString(),
            amount: p.amount,
            method: p.method,
            date: p.date.toISOString(),
            currency: p.method.includes("_usd") ? "USD" : "VES",
            reference: p.reference,
          };
          return this.paymentsService.create(paymentDto, user);
        }),
      );
    }

    // Ejecutar contabilidad de forma asíncrona (no bloquear la respuesta)
    setImmediate(async () => {
      try {
        await this.accountingService.createJournalEntryForSale(
          savedOrder,
          user.tenantId,
        );
        await this.accountingService.createJournalEntryForCOGS(
          savedOrder,
          user.tenantId,
        );
      } catch (accountingError) {
        this.logger.error(
          `Error en la contabilidad automática para la orden ${savedOrder.orderNumber}`,
          accountingError.stack,
        );
      }

      // Record transaction history if order is PAID (venta = pago)
      if (savedOrder.paymentStatus === "paid") {
        try {
          await this.transactionHistoryService.recordCustomerTransaction(
            savedOrder._id.toString(),
            user.tenantId,
          );
          this.logger.log(
            `Transaction history recorded for order ${savedOrder.orderNumber}`,
          );
        } catch (transactionError) {
          this.logger.error(
            `Error recording transaction history for order ${savedOrder.orderNumber}`,
            transactionError.stack,
          );
        }
      }
    });

    if (createOrderDto.autoReserve) {
      // IMPORTANTE: Usar quantityInBaseUnit para productos multi-unidad
      const reservationItems: { productSku: string; quantity: number }[] = [];
      const tenantProfile = await this.getTenantVerticalProfile(user.tenantId);
      const isFoodService = tenantProfile?.key === "food-service" || tenantProfile?.baseVertical === "FOOD_SERVICE";

      for (const item of savedOrder.items) {
        // Para Food Service, verificar si el producto tiene receta (BOM)
        // Si tiene receta, NO reservamos el producto terminado (se hará backflushing de ingredientes al pagar)
        if (isFoodService) {
          const hasBom = await this.bomModel.exists({
            productId: item.productId,
            isActive: true,
            tenantId: user.tenantId
          });

          if (hasBom) {
            this.logger.log(`Skipping inventory reservation for Manufactured Item (Recipe): ${item.productSku}`);
            continue;
          }
        }

        reservationItems.push({
          productSku: item.variantSku || item.productSku,
          // Si tiene unidad seleccionada, usar quantityInBaseUnit, sino usar quantity normal
          quantity: item.quantityInBaseUnit ?? item.quantity,
        });
      }

      if (reservationItems.length > 0) {
        await this.inventoryService.reserveInventory(
          { orderId: savedOrder._id.toString(), items: reservationItems },
          user,
          undefined,
        );
        savedOrder.inventoryReservation = {
          isReserved: true,
          reservedAt: new Date(),
        };
        await savedOrder.save();
      } else {
        this.logger.log(`No items require reservation for order ${savedOrder.orderNumber} (All items are Manufactured/Recipes or list is empty)`);
      }
    }


    // Send WhatsApp confirmation (async, don't block response)
    setImmediate(async () => {
      try {
        // Get customer phone number
        const customerPhone =
          customer.whatsappNumber ||
          customer.contacts?.find(
            (c) => c.type === "whatsapp" || c.type === "phone",
          )?.value;

        if (customerPhone) {
          await this.whapiService.sendOrderConfirmation(
            user.tenantId,
            customerPhone,
            {
              orderNumber: savedOrder.orderNumber,
              customerName: customer.name || savedOrder.customerName,
              totalAmount: savedOrder.totalAmount,
              items: savedOrder.items.map((item) => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              })),
              shippingMethod: createOrderDto.deliveryMethod,
              shippingAddress: createOrderDto.shippingAddress
                ? `${createOrderDto.shippingAddress.street || ""}, ${createOrderDto.shippingAddress.city || ""}, ${createOrderDto.shippingAddress.state || ""}`.trim()
                : undefined,
              notes: createOrderDto.notes,
            },
          );
        } else {
          this.logger.warn(
            `No WhatsApp/phone number found for customer ${customer._id} - skipping order confirmation`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to send WhatsApp order confirmation for order ${savedOrder.orderNumber}: ${error.message}`,
        );
        // Don't throw - notification failure shouldn't break order creation
      }
    });

    // Devolver la orden guardada directamente sin populate pesado
    return savedOrder.toObject();
  }

  /**
   * Crear orden desde el storefront (público, sin autenticación)
   * No reserva inventario ni procesa pagos, solo registra la orden.
   */
  async createPublicOrder(dto: {
    tenantId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    items: Array<{
      productId: string;
      variantId?: string;
      variantSku?: string;
      attributes?: Record<string, any>;
      quantity: number;
      unitPrice: number;
      selectedUnit?: string;
      conversionFactor?: number;
    }>;
    shippingMethod?: "pickup" | "delivery";
    shippingAddress?: any;
    notes?: string;
    reservationMinutes?: number;
  }): Promise<OrderDocument> {
    const tenantObjectId = new Types.ObjectId(dto.tenantId);
    const tenant = await this.tenantModel.findById(tenantObjectId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException("La orden debe tener al menos un producto");
    }

    // Buscar o crear cliente básico
    let customer = await this.customerModel.findOne({
      tenantId: tenantObjectId,
      $or: [
        { "contacts.value": dto.customerEmail },
        { "contacts.value": dto.customerPhone },
      ],
    });

    if (!customer) {
      customer = await new this.customerModel({
        customerNumber: `WEB-${Date.now()}`,
        name: dto.customerName,
        customerType: "individual",
        contacts: [
          dto.customerEmail && {
            type: "email",
            value: dto.customerEmail,
            isPrimary: true,
          },
          dto.customerPhone && {
            type: "phone",
            value: dto.customerPhone,
            isPrimary: !dto.customerEmail,
          },
        ].filter(Boolean),
        source: "storefront",
        tier: "bronce",
        tenantId: tenantObjectId,
        createdBy: tenantObjectId, // placeholder; no user context in público
        metrics: {
          totalOrders: 0,
          totalSpent: 0,
          totalSpentUSD: 0,
          averageOrderValue: 0,
          orderFrequency: 0,
          returnRate: 0,
          cancellationRate: 0,
          paymentDelayDays: 0,
          totalDeposits: 0,
          depositCount: 0,
        },
      }).save();
    } else if (!customer.tier) {
      await this.customerModel.findByIdAndUpdate(customer._id, {
        tier: "bronce",
      });
    }

    // Cargar productos para enriquecer items
    const products = await this.productModel
      .find({ _id: { $in: dto.items.map((i) => i.productId) } })
      .lean();

    // Reserva de inventario (con expiración)
    const orderId = new Types.ObjectId();
    const expirationMinutes = dto.reservationMinutes ?? 15;
    const reservationUser = { tenantId: dto.tenantId };

    await this.inventoryService.reserveInventory(
      {
        orderId: orderId.toString(),
        expirationMinutes,
        items: dto.items.map((item) => {
          const product = products.find(
            (p) => p._id.toString() === item.productId,
          );
          const variant = product?.variants?.find(
            (v) =>
              v._id?.toString() === item.variantId ||
              v.sku === item.variantSku ||
              false,
          );
          return {
            productSku:
              variant?.sku || product?.sku || item.variantSku || item.productId, // fallback para cumplir DTO
            quantity: item.quantity,
          };
        }),
      },
      reservationUser,
    );

    const orderItems: OrderItem[] = dto.items.map((item) => {
      const product = products.find((p) => p._id.toString() === item.productId);
      const variant = product?.variants?.find(
        (v) =>
          v._id?.toString() === item.variantId ||
          v.sku === item.variantSku ||
          false,
      );

      return {
        productId: new Types.ObjectId(item.productId),
        productSku: product?.sku || item.variantSku || "N/A",
        productName: product?.name || "Producto",
        variantId: variant?._id,
        variantSku: variant?.sku,
        attributes: item.attributes,
        attributeSummary: item.attributes
          ? Object.entries(item.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" | ")
          : undefined,
        quantity: item.quantity,
        selectedUnit: item.selectedUnit,
        conversionFactor: item.conversionFactor,
        quantityInBaseUnit: item.conversionFactor
          ? item.quantity * item.conversionFactor
          : undefined,
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice,
        costPrice: variant?.costPrice ?? 0,
        ivaAmount: 0,
        igtfAmount: 0,
        finalPrice: item.quantity * item.unitPrice,
        lots: [],
        modifiers: [],
        discountAmount: 0,
        discountPercentage: 0,
        status: "pending",
        addedAt: new Date(),
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.totalPrice, 0);
    const ivaTotal = 0;
    const igtfTotal = 0;

    // Calculate dynamic delivery cost using DeliveryService
    let shippingCost = 0;
    let deliveryDistance: number | undefined;
    let deliveryZone: string | undefined;

    if (dto.shippingMethod === "delivery" && dto.shippingAddress?.coordinates) {
      try {
        const deliveryCost = await this.deliveryService.calculateDeliveryCost({
          tenantId: dto.tenantId,
          method: "delivery",
          customerLocation: dto.shippingAddress.coordinates,
          orderAmount: subtotal,
        });
        shippingCost = deliveryCost.cost || 0;
        deliveryDistance = deliveryCost.distance;
        deliveryZone = deliveryCost.zone;
      } catch (error) {
        this.logger.warn(
          `Could not calculate delivery cost for order, using default: ${error.message}`,
        );
        shippingCost = 5; // Fallback to default if calculation fails
      }
    } else if (dto.shippingMethod === "delivery") {
      // Delivery without coordinates - use default
      shippingCost = 5;
    }

    const totalAmount = subtotal + ivaTotal + shippingCost;

    const orderNumber = await this.generatePublicOrderNumber();
    const expiresAt = new Date(Date.now() + expirationMinutes * 60_000);

    const order = new this.orderModel({
      _id: orderId,
      orderNumber,
      customerId: customer._id,
      customerName: dto.customerName,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      items: orderItems,
      subtotal,
      ivaTotal,
      igtfTotal,
      shippingCost,
      discountAmount: 0,
      totalAmount,
      paymentStatus: "pending",
      status: "pending",
      channel: "storefront",
      type: "retail",
      source: "storefront",
      sourceMetadata: {
        channel: "web",
        storefrontDomain: dto.customerEmail?.split("@")[1], // Placeholder, should come from frontend
        userAgent: undefined, // Should be passed from frontend
      },
      shipping:
        dto.shippingMethod || dto.shippingAddress
          ? {
            method: dto.shippingMethod || "pickup",
            address: dto.shippingAddress,
            cost: shippingCost,
            distance: deliveryDistance,
            notes: deliveryZone ? `Zona: ${deliveryZone}` : undefined,
          }
          : undefined,
      notes: dto.notes,
      inventoryReservation: {
        isReserved: true,
        reservationId: orderId.toString(),
        expiresAt,
      },
      taxInfo: { invoiceRequired: false },
      metrics: { totalMargin: 0, marginPercentage: 0 },
      createdBy: tenantObjectId, // sin usuario autenticado
      tenantId: dto.tenantId,
    });

    const saved = await order.save();

    // Actualizar métricas básicas y tier al registrar la orden (aunque pago esté pendiente)
    this.updateCustomerMetricsIncremental(customer._id, totalAmount).catch(
      (err) =>
        this.logger.warn(
          `No se pudieron actualizar métricas del cliente ${customer._id}: ${err.message}`,
        ),
    );

    // Send WhatsApp confirmation with payment instructions (async, don't block response)
    setImmediate(async () => {
      try {
        await this.whatsappOrderNotificationsService.sendOrderConfirmation(
          saved,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send WhatsApp order confirmation for public order ${saved.orderNumber}: ${error.message}`,
        );
        // Don't throw - notification failure shouldn't break order creation
      }
    });

    return saved;
  }

  private async generatePublicOrderNumber(): Promise<string> {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const random = Math.floor(Math.random() * 9999)
      .toString()
      .padStart(4, "0");
    return `ORD-${year}${month}${day}-${random}`;
  }

  async calculateTotals(calculationDto: OrderCalculationDto, user: any) {
    const {
      items,
      payments,
      shippingCost = 0,
      discountAmount = 0,
    } = calculationDto;
    const products = await this.productModel.find({
      _id: { $in: items.map((i) => i.productId) },
    });
    if (products.length !== items.length) {
      throw new BadRequestException(
        "Uno o más productos no fueron encontrados.",
      );
    }
    let subtotal = 0;
    let ivaTotal = 0;

    for (const itemDto of items) {
      const product = products.find(
        (p) => p._id.toString() === itemDto.productId,
      );
      if (!product) {
        throw new NotFoundException(
          `Producto con ID "${itemDto.productId}" no encontrado durante el cálculo.`,
        );
      }

      let originalUnitPrice: number;

      // ======== MULTI-UNIT LOGIC / GET ORIGINAL PRICE ========
      if (
        product.hasMultipleSellingUnits &&
        itemDto.selectedUnit &&
        product.sellingUnits?.length > 0
      ) {
        const sellingUnit = UnitConversionUtil.validateQuantityAndUnit(
          itemDto.quantity,
          itemDto.selectedUnit,
          product.sellingUnits,
        );
        originalUnitPrice = sellingUnit.pricePerUnit;
      } else {
        const variant = this.resolveVariant(product, itemDto);
        originalUnitPrice = variant?.basePrice ?? 0;
      }

      // ======== DISCOUNT CALCULATION ========
      // OPTIMIZED: Pass product object instead of ID to avoid redundant DB query
      const discountResult = await this.discountService.calculateBestDiscount(
        product, // Pass full product object (already loaded)
        itemDto.quantity,
        originalUnitPrice,
      );

      const finalUnitPrice = discountResult.discountedPrice;
      const totalPrice = UnitConversionUtil.calculateTotalPrice(
        itemDto.quantity,
        finalUnitPrice,
      );

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
      subtotal += totalPrice;
      ivaTotal += ivaAmount;
    }
    const foreignCurrencyPaymentAmount = (payments || [])
      .filter((p) => p.method.includes("_usd"))
      .reduce((sum, p) => sum + p.amount, 0);
    const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
    const totalAmount =
      subtotal +
      ivaTotal +
      igtfTotal +
      (shippingCost || 0) -
      (discountAmount || 0);
    return {
      subtotal,
      ivaTotal,
      igtfTotal,
      shippingCost: shippingCost || 0,
      discountAmount: discountAmount || 0,
      totalAmount,
    };
  }

  async findAll(query: OrderQueryDto, tenantId: string) {
    const { filter, sortOptions, page, limit } = this.buildOrderQuery(
      query,
      tenantId,
    );
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name")
        .populate("payments")
        .populate("assignedTo", "firstName lastName email")
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return { orders, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async getCustomerOrders(tenantId: string, customerEmail: string) {
    const orders = await this.orderModel
      .find({
        tenantId,
        customerEmail: customerEmail.toLowerCase(),
      })
      .sort({ createdAt: -1 })
      .limit(100)
      .select(
        "orderNumber customerName customerEmail customerPhone totalAmount status createdAt shippingMethod items",
      )
      .lean();

    return orders;
  }

  async exportOrders(query: OrderQueryDto, tenantId: string): Promise<string> {
    const { filter, sortOptions, limit } = this.buildOrderQuery(
      query,
      tenantId,
    );
    const effectiveLimit = Math.min(Math.max(limit, 1), 5000);

    const orders = await this.orderModel
      .find(filter)
      .sort(sortOptions)
      .limit(effectiveLimit)
      .populate("customerId", "name")
      .lean();

    const tenant = await this.tenantModel
      .findById(tenantId)
      .select("verticalProfile")
      .lean();
    const verticalProfile = getVerticalProfile(
      tenant?.verticalProfile?.key,
      tenant?.verticalProfile?.overrides,
    );
    const productAttributes = verticalProfile.attributeSchema.filter(
      (attr) => attr.scope === "product",
    );
    const variantAttributes = verticalProfile.attributeSchema.filter(
      (attr) => attr.scope === "variant",
    );

    const headers = [
      "OrderNumber",
      "Fecha",
      "Cliente",
      "Estado",
      "TotalUSD",
      "SKU",
      "Producto",
      "VarianteSKU",
      "Cantidad",
      "PrecioTotal",
    ]
      .concat(
        productAttributes.map(
          (attr) =>
            `Atributo Producto (${attr.key})${attr.label ? ` - ${attr.label}` : ""}`,
        ),
      )
      .concat(
        variantAttributes.map(
          (attr) =>
            `Atributo Variante (${attr.key})${attr.label ? ` - ${attr.label}` : ""}`,
        ),
      );

    const rows: string[][] = [];

    for (const order of orders) {
      const createdAt = order.createdAt
        ? new Date(order.createdAt).toISOString()
        : "";

      for (const item of order.items || []) {
        const attributes = item.attributes || {};
        const baseRow: (string | number)[] = [
          order.orderNumber || "",
          createdAt,
          order.customerName || "",
          order.status || "",
          order.totalAmount ?? 0,
          item.productSku || "",
          item.productName || "",
          item.variantSku || "",
          item.quantity ?? 0,
          item.totalPrice ?? 0,
        ];

        const productAttributeValues = productAttributes.map(
          (attr) => attributes?.[attr.key] ?? "",
        );
        const variantAttributeValues = variantAttributes.map(
          (attr) => attributes?.[attr.key] ?? "",
        );

        const row = baseRow
          .concat(productAttributeValues)
          .concat(variantAttributeValues)
          .map((value) =>
            value === null || value === undefined ? "" : String(value),
          );

        rows.push(row);
      }
    }

    const csvRows = [headers]
      .concat(rows)
      .map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
      )
      .join("\n");

    return `\uFEFF${csvRows}`;
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ _id: id, tenantId })
      .populate("payments")
      .populate("assignedTo", "firstName lastName email")
      .populate("items.productId", "name sku ivaApplicable") // Fix: Populate productId, not product
      .exec();
  }

  /**
   * Find order by order number (public method for tracking)
   */
  async findByOrderNumber(
    orderNumber: string,
    tenantId: string,
  ): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ orderNumber, tenantId })
      .select(
        "orderNumber status createdAt confirmedAt shippedAt deliveredAt cancelledAt totalAmount items.productName items.quantity items.unitPrice shipping customerName customerEmail customerPhone",
      )
      .exec();
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    user: any,
  ): Promise<OrderDocument | null> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException("Orden no encontrada");
    const previousStatus = order.status || "";
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      { ...updateOrderDto, updatedBy: user.id },
      { new: true },
    );

    const fulfillmentStatuses = ["shipped", "delivered"];
    const movedToFulfillment =
      updatedOrder &&
      fulfillmentStatuses.includes(updatedOrder.status || "") &&
      !fulfillmentStatuses.includes(previousStatus);

    if (updatedOrder && movedToFulfillment) {
      const hasOutMovements =
        await this.inventoryMovementsService.hasOutMovementsForOrder(
          updatedOrder._id.toString(),
          user.tenantId,
        );

      if (!hasOutMovements) {
        setImmediate(async () => {
          try {
            for (const item of updatedOrder.items || []) {
              const inv = await this.inventoryService.findByProductSku(
                item.productSku,
                user.tenantId,
              );
              if (!inv) {
                this.logger.warn(
                  `No inventory found for SKU ${item.productSku} when creating OUT movement for order ${updatedOrder.orderNumber} (status change)`,
                );
                continue;
              }
              await this.inventoryMovementsService.create(
                {
                  inventoryId: inv._id.toString(),
                  movementType: MovementType.OUT,
                  quantity: item.quantity,
                  unitCost: inv.averageCostPrice || 0,
                  reason: "Salida por orden enviada/entregada",
                  warehouseId: inv.warehouseId?.toString(),
                },
                user.tenantId,
                user.id,
                true,
                { orderId: updatedOrder._id.toString(), origin: "order-status" },
              );
            }
          } catch (err) {
            this.logger.error(
              `Failed to create OUT movements on status change for order ${updatedOrder.orderNumber}: ${err.message}`,
            );
          }
        });
      }
    }

    return updatedOrder;
  }

  async reconcileMissingOutMovements(
    user: any,
    options?: { statuses?: string[]; limit?: number },
  ): Promise<{
    ordersChecked: number;
    movementsCreated: number;
    skippedExistingOut: number;
    missingInventory: number;
    errors: number;
  }> {
    const targetStatuses = (options?.statuses?.length
      ? options.statuses
      : ["shipped", "delivered", "paid"]
    ).filter(Boolean);
    const limit = Math.min(options?.limit || 200, 1000);

    const orders = await this.orderModel
      .find({
        tenantId: user.tenantId,
        status: { $in: targetStatuses },
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean();

    let movementsCreated = 0;
    let skippedExistingOut = 0;
    let missingInventory = 0;
    let errors = 0;

    for (const order of orders) {
      try {
        const hasOut = await this.inventoryMovementsService.hasOutMovementsForOrder(
          order._id.toString(),
          user.tenantId,
        );
        if (hasOut) {
          skippedExistingOut += 1;
          continue;
        }

        for (const item of order.items || []) {
          const inv = await this.inventoryService.findByProductSku(
            item.productSku,
            user.tenantId,
          );
          if (!inv) {
            missingInventory += 1;
            continue;
          }

          await this.inventoryMovementsService.create(
            {
              inventoryId: inv._id.toString(),
              movementType: MovementType.OUT,
              quantity: item.quantity,
              unitCost: inv.averageCostPrice || 0,
              reason: "Salida por reconciliación de orden",
              warehouseId: inv.warehouseId?.toString(),
            },
            user.tenantId,
            user.id,
            true,
            { orderId: order._id.toString(), origin: "order-reconcile" },
          );
          movementsCreated += 1;
        }
      } catch (err) {
        this.logger.error(
          `Error reconciling OUT movements for order ${order.orderNumber}: ${err.message}`,
        );
        errors += 1;
      }
    }

    return {
      ordersChecked: orders.length,
      movementsCreated,
      skippedExistingOut,
      missingInventory,
      errors,
    };
  }

  async registerPayments(
    orderId: string,
    bulkRegisterPaymentsDto: BulkRegisterPaymentsDto,
    user: any,
  ): Promise<OrderDocument> {
    this.logger.log(`Registering payments for order ${orderId}`);
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }
    const existingOutMovements = await this.inventoryMovementsService.hasOutMovementsForOrder(
      order._id.toString(),
      user.tenantId,
    );

    // Doble escritura opcional a colección Payment (idempotencia ligera por referencia+method)
    const paymentIdsToAdd: Types.ObjectId[] = [];
    const createdPaymentDocs: any[] = [];

    await Promise.all(
      bulkRegisterPaymentsDto.payments.map(async (p, index) => {
        try {
          const idempotencyKey =
            p.idempotencyKey ||
            (p.reference ? `${orderId}-${p.reference}` : undefined);

          // Normalize Amounts
          let usdAmount = p.amount;
          let vesAmount = p.amountVes;
          const rate = p.exchangeRate || 1;
          const isVes = (p.currency === 'VES' || p.currency === 'Bs');

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

          // Reusar PaymentsService para centralizar lógica e idempotencia
          const paymentDto: any = {
            paymentType: "sale",
            orderId: orderId,
            date: p.date ? new Date(p.date).toISOString() : new Date().toISOString(),
            amount: usdAmount,
            amountVes: vesAmount,
            exchangeRate: rate,
            method: p.method,
            currency: p.currency || "USD",
            reference: p.reference || "",
            bankAccountId: p.bankAccountId,
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
          // Enlazar la referencia en la orden si no está
          paymentIdsToAdd.push(paymentDoc._id);
          createdPaymentDocs.push(paymentDoc);
        } catch (err) {
          this.logger.warn(
            `No se pudo crear Payment de colección para orden ${orderId}: ${err.message}`,
          );
        }
      }),
    );

    // Build payment records from created Payment documents (with IGTF calculated by backend)
    this.logger.log(`Created ${createdPaymentDocs.length} payment documents for order ${orderId}`);

    const newPaymentRecords = createdPaymentDocs.map((paymentDoc) => {
      const igtf = paymentDoc.fees?.igtf || 0;
      this.logger.log(`Payment ${paymentDoc._id}: method=${paymentDoc.method}, amount=${paymentDoc.amount}, IGTF=${igtf}`);

      return {
        method: paymentDoc.method,
        amount: paymentDoc.amount,
        amountVes: paymentDoc.amountVes,
        exchangeRate: paymentDoc.exchangeRate,
        currency: paymentDoc.currency || "USD",
        reference: paymentDoc.reference || "",
        date: paymentDoc.date,
        isConfirmed: paymentDoc.status === "confirmed",
        bankAccountId: paymentDoc.bankAccountId,
        confirmedAt: paymentDoc.confirmedAt,
        confirmedMethod: paymentDoc.status === "confirmed" ? paymentDoc.method : undefined,
        igtf: igtf,
      };
    });

    const mergedPaymentRecords = [
      ...(order.paymentRecords || []),
      ...newPaymentRecords,
    ];

    // Calcular paidAmount en USD y VES (incluyendo IGTF porque eso es lo que realmente pagó el cliente)
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

    // Actualizar paymentStatus
    const wasNotPaidBefore = order.paymentStatus !== "paid";

    // Calculate total IGTF from payment records
    const totalIgtf = mergedPaymentRecords.reduce((sum, record) => {
      return sum + (record.igtf || 0);
    }, 0);

    this.logger.log(`Total IGTF calculated for order ${orderId}: ${totalIgtf}`);

    // Update order's total amount to include IGTF
    const updatedTotalAmount = order.subtotal + order.ivaTotal + totalIgtf + (order.shippingCost || 0);

    this.logger.log(`Order ${orderId} - Updated totals: subtotal=${order.subtotal}, IVA=${order.ivaTotal}, IGTF=${totalIgtf}, total=${updatedTotalAmount}`);

    const newPaymentStatus =
      totalPaidUSD >= updatedTotalAmount - 0.01 // Add small tolerance for float precision
        ? "paid"
        : totalPaidUSD > 0
          ? "partial"
          : order.paymentStatus;

    // Removed manual bank account update loop to avoid double-counting (PaymentsService handles it)

    // Persistir cambios en la orden sin depender de versión del documento ya cargado
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

    // Si la orden se acaba de pagar completamente, deducir ingredientes de las recetas
    if (wasNotPaidBefore && newPaymentStatus === "paid") {
      this.logger.log(
        `Order ${order.orderNumber} fully paid. Triggering ingredient deduction...`,
      );
      // Ejecutar en background para no bloquear la respuesta
      setImmediate(async () => {
        try {
          await this.deductIngredientsFromSale(order, user);
        } catch (error) {
          this.logger.error(
            `Background ingredient deduction failed for order ${order.orderNumber}: ${error.message}`,
          );
        }
      });
    }

    const finalOrder = await this.findOne(orderId, user.tenantId);
    if (!finalOrder) {
      throw new NotFoundException(
        "Error al registrar el pago, no se pudo encontrar la orden final.",
      );
    }

    // OUT movements cuando la orden pasa a pagada
    if (wasNotPaidBefore && newPaymentStatus === "paid" && !existingOutMovements) {
      setImmediate(async () => {
        try {
          for (const item of order.items) {
            // Nota: usamos el inventario asociado por SKU. Si multi-warehouse está desactivado, se usará el default asignado en migración.
            const inv = await this.inventoryService.findByProductSku(
              item.productSku,
              user.tenantId,
            );
            if (!inv) {
              this.logger.warn(
                `No inventory found for SKU ${item.productSku} when creating OUT movement for order ${order.orderNumber}`,
              );
              continue;
            }
            await this.inventoryMovementsService.create(
              {
                inventoryId: inv._id.toString(),
                movementType: MovementType.OUT,
                quantity: item.quantity,
                unitCost: inv.averageCostPrice || 0,
                reason: "Salida por orden pagada",
                warehouseId: inv.warehouseId?.toString(),
              },
              user.tenantId,
              user.id,
              true,
              { orderId: order._id.toString(), origin: "order" },
            );
          }
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
    this.logger.log(`Confirming payment ${paymentIndex} for order ${orderId}`);
    const tenantId = user.tenantId;

    // 1. Fetch Order to validate existence and record
    let order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (!order.paymentRecords || !order.paymentRecords[paymentIndex]) {
      throw new NotFoundException("Pago no encontrado");
    }

    const paymentRecord = order.paymentRecords[paymentIndex];

    // Normalize Amounts for Payments Service (Expects amount in USD and amountVes in VES)
    let usdAmount = paymentRecord.amount;
    let vesAmount = paymentRecord.amountVes;
    const rate = paymentRecord.exchangeRate || 1;
    const isVes = (paymentRecord.currency === 'VES' || paymentRecord.currency === 'Bs');

    if (isVes) {
      // If it's VES, and amountVes is missing but amount exists, assume amount is the VES value
      if (!vesAmount && usdAmount) {
        vesAmount = usdAmount;
        usdAmount = vesAmount / (rate > 0 ? rate : 1);
      } else if (vesAmount && usdAmount === vesAmount) {
        // If both are equal and it's VES, assume they both hold VES value, so recalculate USD
        usdAmount = vesAmount / (rate > 0 ? rate : 1);
      }
    } else {
      // USD Case
      if (usdAmount && !vesAmount) {
        vesAmount = usdAmount * rate;
      }
    }

    this.logger.log(`Creating payment: USD=${usdAmount}, VES=${vesAmount}, Rate=${rate}, Currency=${paymentRecord.currency}`);

    // 2. Create the Real Payment Document via PaymentsService
    // This triggers Bank Transaction creation and Accounting Entry automatically.
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
        // Force status confirmed since we are confirming it
      },
      user,
    );

    // 3. Reload order to get updates made by PaymentsService (it updates 'payments' array)
    order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Order not found after payment creation");
    }

    // 4. Update the historical paymentRecord to mark it as processed/confirmed
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

  private resolveVariant(
    product: ProductDocument,
    itemDto: CreateOrderItemDto,
  ) {
    if (itemDto.variantId && product.variants?.length) {
      const variant = product.variants.find(
        (v: any) => v._id?.toString() === itemDto.variantId,
      );
      if (variant) {
        return variant;
      }
    }

    if (itemDto.variantSku && product.variants?.length) {
      const variant = product.variants.find(
        (v: any) => v.sku === itemDto.variantSku,
      );
      if (variant) {
        return variant;
      }
    }

    return product.variants?.[0];
  }

  private buildOrderItemAttributes(
    product: ProductDocument,
    variant: any,
    itemDto: CreateOrderItemDto,
  ): Record<string, any> {
    const attributes: Record<string, any> = {};

    if (product.attributes) {
      Object.assign(attributes, product.attributes);
    }

    if (variant?.attributes) {
      Object.assign(attributes, variant.attributes);
    }

    if (itemDto.attributes) {
      Object.assign(attributes, itemDto.attributes);
    }

    return attributes;
  }

  private buildAttributeSummary(
    attributes: Record<string, any>,
  ): string | undefined {
    const entries = Object.entries(attributes || {}).filter(
      ([, value]) =>
        value !== undefined && value !== null && `${value}`.trim().length > 0,
    );

    if (!entries.length) {
      return undefined;
    }

    return entries.map(([key, value]) => `${key}: ${value}`).join(" | ");
  }

  private async generateOrderNumber(_tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    const randomPart = now.getTime().toString().slice(-4);
    return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
  }

  // Nuevo método para actualizar métricas incrementalmente
  private async updateCustomerMetricsIncremental(
    customerId: Types.ObjectId,
    orderTotal: number,
  ) {
    try {
      // Actualizar contadores incrementalmente
      const updateResult = await this.customerModel.findByIdAndUpdate(
        customerId,
        {
          $inc: {
            "metrics.totalSpent": orderTotal,
            "metrics.totalOrders": 1,
          },
          $set: {
            "metrics.lastOrderDate": new Date(),
          },
        },
        { new: true },
      );

      if (updateResult) {
        // Recalcular tier basado en el nuevo totalSpent
        const newTier = this.calculateTierFromSpent(
          updateResult.metrics.totalSpent,
        );

        if (updateResult.tier !== newTier) {
          await this.customerModel.findByIdAndUpdate(customerId, {
            tier: newTier,
          });
          this.logger.log(
            `Customer ${customerId} tier updated: ${updateResult.tier} -> ${newTier}`,
          );
        }

        this.logger.log(
          `Customer metrics updated: ${customerId}, totalSpent: ${updateResult.metrics.totalSpent}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to update customer metrics for ${customerId}:`,
        error,
      );
      // No lanzar error para evitar que falle la creación de la orden
    }
  }

  private calculateTierFromSpent(totalSpent: number): string {
    if (totalSpent >= 10000) return "diamante";
    if (totalSpent >= 5000) return "oro";
    if (totalSpent >= 2000) return "plata";
    return "bronce"; // clientes nuevos o con bajo gasto caen en bronce
  }

  private buildOrderQuery(query: OrderQueryDto, tenantId: string) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerId,
      sortBy = "createdAt",
      sortOrder = "desc",
      itemAttributeKey,
      itemAttributeValue,
    } = query;

    const filter: any = { tenantId };
    const andConditions: any[] = [];

    if (status) filter.status = status;

    // NEW: Filter by fulfillment status (supports commma separated)
    if (query.fulfillmentStatus) {
      const statuses = query.fulfillmentStatus.split(',').map(s => s.trim());
      if (statuses.length > 0) {
        filter.fulfillmentStatus = { $in: statuses };
      }
    }

    // NEW: Filter by fulfillment type
    if (query.fulfillmentType) {
      filter.fulfillmentType = query.fulfillmentType;
    }

    if (customerId) filter.customerId = customerId;
    if (search) {
      const regex = new RegExp(this.escapeRegExp(search), "i");
      filter.$or = [{ orderNumber: regex }, { customerName: regex }];
    }

    if (itemAttributeKey && itemAttributeValue) {
      const attrRegex = new RegExp(
        this.escapeRegExp(itemAttributeValue.trim()),
        "i",
      );
      andConditions.push({
        items: {
          $elemMatch: {
            [`attributes.${itemAttributeKey}`]: attrRegex,
          },
        },
      });
    }

    if (andConditions.length) {
      filter.$and = andConditions;
    }

    const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    return {
      filter,
      sortOptions,
      page,
      limit,
    };
  }

  async updateFulfillmentStatus(
    id: string,
    status: string,
    user: any,
    notes?: string,
    trackingNumber?: string
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ _id: id, tenantId: user.tenantId });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const previousStatus = order.fulfillmentStatus;

    // Validate status transition (basic check)
    // Pending -> Picking -> Packed -> In Transit -> Delivered

    order.fulfillmentStatus = status;
    if (notes) order.deliveryNotes = notes;
    if (trackingNumber) order.trackingNumber = trackingNumber;

    if (status === 'shipped' || status === 'in_transit') {
      order.shippedAt = new Date();
    } else if (status === 'delivered') {
      (order as any).deliveredAt = new Date();
      order.fulfillmentDate = new Date();
    }

    await order.save();

    this.logger.log(`Order ${order.orderNumber} fulfillment status updated: ${previousStatus} -> ${status}`);

    this.eventEmitter.emit('order.fulfillment.updated', {
      order,
      previousStatus,
      newStatus: status,
      tenantId: user.tenantId, // Pass context
    });

    return order;
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Deduce ingredientes automáticamente del inventario cuando se vende un platillo con receta (BOM)
   * Solo se ejecuta si el tenant tiene habilitada la opción enableAutomaticIngredientDeduction
   *
   * @param order - Orden completada
   * @param user - Usuario que completó la orden
   */
  private async deductIngredientsFromSale(
    order: OrderDocument,
    user: any,
  ): Promise<void> {
    try {
      // 1. Verificar si el tenant tiene habilitada la deducción automática
      const tenant = await this.tenantModel.findById(user.tenantId);
      if (!tenant?.settings?.inventory?.enableAutomaticIngredientDeduction) {
        this.logger.debug(
          `Automatic ingredient deduction disabled for tenant ${user.tenantId}`,
        );
        return;
      }

      this.logger.log(
        `Deducting ingredients for order ${order.orderNumber} (${order._id})`,
      );

      // 2. Para cada item de la orden
      for (const item of order.items) {
        // Buscar BOM activo del producto
        const bom = await this.bomModel
          .findOne({
            productId: item.productId,
            isActive: true,
            tenantId: user.tenantId,
          })
          .lean();

        // Si no tiene receta, skip
        if (!bom) {
          this.logger.debug(
            `No active BOM found for product ${item.productSku} (${item.productId})`,
          );
          continue;
        }

        this.logger.log(
          `Found BOM ${bom._id} for product ${item.productSku}. Exploding recipe...`,
        );

        // 3. Explotar BOM para obtener lista flat de ingredientes
        const flatIngredients: Array<{
          productId: Types.ObjectId;
          sku: string;
          name: string;
          totalQuantity: number;
          unit: string;
        }> = [];

        // Procesar cada componente de la receta
        for (const component of bom.components || []) {
          // Calcular cantidad base del componente
          let componentQuantity = component.quantity * item.quantity;

          // NUEVO: Procesar modificadores que afectan este componente
          if (item.modifiers && item.modifiers.length > 0) {
            for (const appliedModifier of item.modifiers) {
              // Buscar el modificador con sus efectos de componentes
              const modifier = await this.modifierModel
                .findById(appliedModifier.modifierId)
                .lean();

              if (
                modifier?.componentEffects &&
                modifier.componentEffects.length > 0
              ) {
                // Verificar si este modificador afecta el componente actual
                const effect = modifier.componentEffects.find(
                  (ce: any) =>
                    ce.componentProductId.toString() ===
                    component.componentProductId.toString(),
                );

                if (effect) {
                  const modifierQty = appliedModifier.quantity || 1;

                  switch (effect.action) {
                    case "exclude":
                      // No deducir este ingrediente
                      componentQuantity = 0;
                      this.logger.log(
                        `Modifier "${modifier.name}" excluded component ${component.componentProductId} from order ${order.orderNumber}`,
                      );
                      break;

                    case "multiply":
                      // Multiplicar la cantidad (ej: "Extra Queso" x2)
                      const multiplier = effect.quantity || 1;
                      componentQuantity *= multiplier * modifierQty;
                      this.logger.log(
                        `Modifier "${modifier.name}" multiplied component ${component.componentProductId} by ${multiplier} (qty: ${modifierQty})`,
                      );
                      break;

                    case "add":
                      // Agregar cantidad adicional
                      const additionalQty =
                        (effect.quantity || 0) * modifierQty;
                      componentQuantity += additionalQty;
                      this.logger.log(
                        `Modifier "${modifier.name}" added ${additionalQty} to component ${component.componentProductId}`,
                      );
                      break;
                  }
                }
              }
            }
          }

          // Si el componente fue excluido, skip
          if (componentQuantity === 0) {
            continue;
          }

          // Aplicar scrap percentage
          const totalQuantity =
            componentQuantity * (1 + (component.scrapPercentage || 0) / 100);

          // Buscar información del producto componente
          const componentProduct = await this.productModel
            .findById(component.componentProductId)
            .lean();

          if (!componentProduct) {
            this.logger.warn(
              `Component product ${component.componentProductId} not found in BOM ${bom._id}`,
            );
            continue;
          }

          flatIngredients.push({
            productId: component.componentProductId,
            sku: componentProduct.sku,
            name: componentProduct.name,
            totalQuantity,
            unit: component.unit,
          });
        }

        // 4. Deducir cada ingrediente del inventario
        for (const ingredient of flatIngredients) {
          try {
            // Buscar el inventario del ingrediente
            const inventory = await this.inventoryService.findByProductSku(
              ingredient.sku,
              user.tenantId,
            );

            if (!inventory) {
              this.logger.warn(
                `Inventory not found for ingredient ${ingredient.sku} (${ingredient.name}). Skipping deduction.`,
              );
              continue;
            }

            // Calcular nueva cantidad
            const newQuantity =
              inventory.totalQuantity - ingredient.totalQuantity;

            // Ajustar inventario
            await this.inventoryService.adjustInventory(
              {
                inventoryId: inventory._id.toString(),
                newQuantity: Math.max(0, newQuantity), // No permitir cantidades negativas
                reason: `Consumo por venta - Orden ${order.orderNumber} - Platillo: ${item.productName}`,
              },
              user,
            );

            this.logger.log(
              `Deducted ${ingredient.totalQuantity} ${ingredient.unit} of ${ingredient.sku} (${ingredient.name}). New quantity: ${newQuantity}`,
            );
          } catch (error) {
            // Log error pero continuar con otros ingredientes
            this.logger.error(
              `Error deducting ingredient ${ingredient.sku} for order ${order.orderNumber}: ${error.message}`,
              error.stack,
            );
            // No lanzar error para no bloquear el proceso de venta
            // El tenant puede revisar el inventario manualmente
          }
        }
      }

      this.logger.log(
        `Ingredient deduction completed for order ${order.orderNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Error in deductIngredientsFromSale for order ${order._id}: ${error.message}`,
        error.stack,
      );
      // No lanzar error para no bloquear el flujo de venta
    }
  }

  /**
   * Complete order: Final step in OrderProcessingDrawer
   * Validates that order is fully paid and invoiced, then marks as completed
   */
  async completeOrder(id: string, user: any): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });

    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    // Validate order is fully paid
    if (order.paymentStatus !== 'paid') {
      throw new BadRequestException(
        'La orden debe estar completamente pagada antes de completarla'
      );
    }

    // Validate order has billing document (invoice)
    if (!order.billingDocumentId || order.billingDocumentType === 'none') {
      throw new BadRequestException(
        'La orden debe tener una factura emitida antes de completarla'
      );
    }

    // Fetch tenant settings for fulfillment strategy
    const tenant = await this.tenantModel.findById(user.tenantId);
    let strategy = tenant?.settings?.fulfillmentStrategy || 'logistics';

    // Handle Hybrid Strategy (Auto-detect)
    if (strategy === 'hybrid') {
      const method = order.shipping?.method?.toLowerCase();
      if (method === 'pickup' || method === 'retiro') {
        strategy = 'counter';
      } else if (method === 'delivery' || method === 'shipping' || method === 'envio') {
        strategy = 'logistics';
      } else {
        strategy = 'immediate'; // POS / Presencial default
      }
    }

    // Update order status based on strategy
    if (strategy === 'immediate') {
      // Supermarket/Retail: Done immediately
      order.status = 'completed';
      order.fulfillmentStatus = 'delivered';
      order.fulfillmentDate = new Date();
      (order as any).deliveredAt = new Date();
    } else if (strategy === 'counter') {
      // Counter/Pickup: Needs picking/packing immediately
      order.status = 'confirmed';
      order.fulfillmentStatus = 'picking';
    } else {
      // Logistics: Standard flow (Pending -> Picking...)
      order.status = 'confirmed';
      order.fulfillmentStatus = 'pending';
    }

    if (order.fulfillmentStatus === 'delivered') {
      order.fulfillmentDate = new Date();
      (order as any).deliveredAt = new Date();
    }


    await order.save();

    this.logger.log(
      `Order ${order.orderNumber} completed successfully by user ${user.id}. Strategy: ${strategy}`
    );

    // Initial fulfillment event
    this.eventEmitter.emit('order.fulfillment.updated', {
      order,
      previousStatus: 'pending', // Implicit previous status
      newStatus: order.fulfillmentStatus,
      tenantId: user.tenantId,
    });

    return order;
  }

  async cancelOrder(id: string, user: any): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (order.status === "cancelled") {
      return order;
    }

    order.status = "cancelled";
    (order as any).cancelledAt = new Date();
    await order.save();

    setImmediate(async () => {
      try {
        for (const item of order.items) {
          const inv =
            (await this.inventoryService.findByProductSku(
              item.productSku,
              user.tenantId,
            )) ||
            (await this.inventoryService.findByProductId(
              item.productId.toString(),
              user.tenantId,
            ));

          if (!inv) {
            this.logger.warn(
              `No inventory found for SKU ${item.productSku} when reversing cancellation on order ${order.orderNumber}`,
            );
            continue;
          }

          await this.inventoryMovementsService.create(
            {
              inventoryId: inv._id.toString(),
              movementType: MovementType.ADJUSTMENT,
              quantity: item.quantity,
              unitCost: inv.averageCostPrice || 0,
              reason: "Reverso por cancelación de orden",
              warehouseId: inv.warehouseId?.toString(),
            },
            user.tenantId,
            user.id,
            false,
            { orderId: order._id.toString(), origin: "order-cancel" },
          );
        }
      } catch (err) {
        this.logger.error(
          `Failed to reverse inventory for cancelled order ${order.orderNumber}: ${err.message}`,
        );
      }
    });

    return order;
  }

  async fixHistoricPayments(user: any) {
    const tenantId = user.tenantId;
    this.logger.log(`Starting historic payments migration for tenant ${tenantId}`);

    const orders = await this.orderModel.find({
      tenantId,
      "paymentRecords.isConfirmed": true,
      $or: [
        { payments: { $size: 0 } },
        { payments: { $exists: false } },
        { paidAmount: 0 }
      ]
    }).limit(500);

    let fixedCount = 0;
    const errors: any[] = [];

    for (const order of orders) {
      this.logger.log(`Processing historic order ${order.orderNumber}`);
      try {
        for (const record of order.paymentRecords || []) {
          if (!record.isConfirmed) continue;

          // Skip if looks like it has been processed (crude check)
          // But since we filtered for empty payments/paidAmount=0, we should process all confirmed records.

          // Normalize Amounts
          let usdAmount = record.amount;
          let vesAmount = record.amountVes;
          const rate = record.exchangeRate || 1;
          const isVes = (record.currency === 'VES' || record.currency === 'Bs');

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

          // Create Payment
          await this.paymentsService.create({
            paymentType: 'sale',
            orderId: order._id.toString(),
            amount: usdAmount,
            amountVes: vesAmount,
            currency: record.currency || 'USD',
            method: record.confirmedMethod || record.method || 'unknown',
            reference: record.reference || `MIG-${order.orderNumber}`,
            bankAccountId: record.bankAccountId?.toString(),
            exchangeRate: rate,
            date: (record.confirmedAt || record.date || new Date()).toISOString(),
            status: 'confirmed'
          }, user);

          fixedCount++;
        }
      } catch (e) {
        this.logger.error(`Failed to fix order ${order.orderNumber}: ${e.message}`);
        errors.push({ order: order.orderNumber, error: e.message });
      }
    }

    return {
      processed: orders.length,
      fixed: fixedCount,
      errors
    };
  }

  /**
   * Get sales analytics grouped by order source
   */
  async getAnalyticsBySource(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const matchQuery: any = { tenantId };

    if (startDate || endDate) {
      matchQuery.createdAt = {};
      if (startDate) {
        matchQuery.createdAt.$gte = startDate;
      }
      if (endDate) {
        matchQuery.createdAt.$lte = endDate;
      }
    }

    const analytics = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: "$source",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          source: "$_id",
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
      { $sort: { totalRevenue: -1 } },
    ]);

    const summary = await this.orderModel.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
    ]);

    return {
      bySource: analytics,
      summary: summary[0] || {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
      },
      dateRange: {
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
      },
    };
  }
}
