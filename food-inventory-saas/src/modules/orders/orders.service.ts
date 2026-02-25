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
import { Table, TableDocument } from "../../schemas/table.schema";
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
import { CouponsService } from "../coupons/coupons.service";
import { PromotionsService } from "../promotions/promotions.service";
import { WhatsAppOrderNotificationsService } from "./whatsapp-order-notifications.service";
import { PriceListsService } from "../price-lists/price-lists.service";
import { OrderAnalyticsService } from "./services/order-analytics.service";
import { OrderFulfillmentService } from "./services/order-fulfillment.service";
import { OrderInventoryService } from "./services/order-inventory.service";
import { OrderPaymentsService } from "./services/order-payments.service";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    @InjectModel(BillOfMaterials.name)
    private bomModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Table.name)
    private tableModel: Model<TableDocument>,
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
    private readonly whatsappOrderNotificationsService: WhatsAppOrderNotificationsService,
    private readonly priceListsService: PriceListsService,
    private readonly orderAnalyticsService: OrderAnalyticsService,
    private readonly orderFulfillmentService: OrderFulfillmentService,
    private readonly orderInventoryService: OrderInventoryService,
    private readonly orderPaymentsService: OrderPaymentsService,
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
    return this.orderPaymentsService.getPaymentMethods(user);
  }

  async getTopSellingProducts(tenantId: string, limit: number = 5): Promise<any[]> {
    return this.orderAnalyticsService.getTopSellingProducts(tenantId, limit);
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    const { customerId, customerName, customerRif, taxType, items, payments, customerAddress, customerPhone } =
      createOrderDto;

    this.logger.log(`ORDERS SERVICE CREATE v2 START: ${JSON.stringify(createOrderDto)}`);

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

    // ======== PRICE LIST LOGIC ========
    // Determine which price list to use: order override > customer default > none
    let effectivePriceListId: string | null = null;
    if (createOrderDto.priceListId) {
      effectivePriceListId = createOrderDto.priceListId;
      // If savePriceListToCustomer is true, update customer's default price list
      if (createOrderDto.savePriceListToCustomer && customer) {
        await this.customerModel.findByIdAndUpdate(customer._id, {
          defaultPriceListId: createOrderDto.priceListId,
        });
        this.logger.log(`Updated customer ${customer._id} default price list to ${createOrderDto.priceListId}`);
      }
    } else if (customer.defaultPriceListId) {
      effectivePriceListId = customer.defaultPriceListId.toString();
      this.logger.log(`Using customer's default price list: ${effectivePriceListId}`);
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
      let priceListOverride: number | null = null;

      // ======== PRICE LIST OVERRIDE ========
      // If we have an effective price list, try to get custom price for this variant
      if (effectivePriceListId && variant?.sku) {
        try {
          const customPrice = await this.priceListsService.getProductPrice(
            variant.sku,
            effectivePriceListId,
            user.tenantId,
          );
          if (customPrice !== null && customPrice > 0) {
            priceListOverride = customPrice;
            this.logger.log(`Using price list price for ${variant.sku}: ${customPrice}`);
          }
        } catch (error) {
          this.logger.warn(`Could not get price list price for ${variant.sku}: ${error.message}`);
        }
      }

      // ======== MULTI-UNIT LOGIC / GET ORIGINAL PRICE ========
      if (priceListOverride !== null) {
        // Price list takes precedence over everything
        originalUnitPrice = priceListOverride;
        costPrice = variant?.costPrice ?? 0;
        selectedUnit = undefined;
      } else if (
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
        modifiers: itemDto.modifiers
          ? itemDto.modifiers.map((mod) => ({
            ...mod,
            modifierId: new Types.ObjectId(mod.modifierId),
          }))
          : [],
        specialInstructions: itemDto.specialInstructions,
        removedIngredients: itemDto.removedIngredients
          ? itemDto.removedIngredients.map((id) => new Types.ObjectId(id))
          : [],
        lots: [],
        addedAt: new Date(),
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
      // Default initialization ensuring address is saved
      shippingInfo = {
        method: createOrderDto.deliveryMethod,
        cost: createOrderDto.shippingCost || 0,
        address: createOrderDto.shippingAddress,
      };

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

        // Update with calculated values
        shippingInfo.cost = shippingCost;
        shippingInfo.distance = deliveryCostResult.distance;
        shippingInfo.estimatedDuration = deliveryCostResult.duration;

      } catch (error) {
        this.logger.warn(`Error calculating delivery cost: ${error.message}`);
        // Fallback: shippingInfo already has address and default cost
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

    // ============ IVA WITHHOLDING (Retención de IVA por Contribuyente Especial) ============
    let ivaWithholdingPercentage = 0;
    let ivaWithholdingAmount = 0;
    const customerIsSpecialTaxpayer = createOrderDto.customerIsSpecialTaxpayer || false;

    if (customerIsSpecialTaxpayer && ivaTotal > 0) {
      // El % de retención depende del tipo de contribuyente del TENANT (vendedor):
      // - Tenant Ordinario → retención fija del 75%
      // - Tenant Especial → usa la tasa configurada (75% o 100%) según su designación SENIAT
      const tenantTaxpayerType = tenant.taxInfo?.taxpayerType || 'ordinario';
      if (tenantTaxpayerType === 'especial') {
        ivaWithholdingPercentage = tenant.taxInfo?.specialTaxpayerWithholdingRate || 75;
      } else {
        ivaWithholdingPercentage = 75;
      }
      ivaWithholdingAmount = ivaTotal * (ivaWithholdingPercentage / 100);
      this.logger.log(
        `IVA Withholding: Customer is special taxpayer. Tenant type: ${tenantTaxpayerType}, Rate: ${ivaWithholdingPercentage}%, Withheld: ${ivaWithholdingAmount}`,
      );
    }

    const totalAmount =
      subtotal +
      ivaTotal +
      igtfTotal +
      shippingCost -
      (createOrderDto.discountAmount || 0) -
      totalMarketingDiscount;

    // Calcular totalAmountVes usando la tasa de cambio actual (según moneda del tenant)
    const tenantCurrency = tenant.settings?.currency?.primary || "USD";
    let totalAmountVes = 0;
    try {
      const rateData = await this.exchangeRateService.getRateForCurrency(tenantCurrency);
      totalAmountVes = totalAmount * rateData.rate;
      this.logger.log(
        `Calculated totalAmountVes: ${totalAmountVes} (${tenantCurrency} rate: ${rateData.rate})`,
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

      // CRITICAL: Mapping Cash Register Session
      cashSessionId: createOrderDto.cashSessionId ? new Types.ObjectId(createOrderDto.cashSessionId) : undefined,
      cashRegisterId: createOrderDto.cashRegisterId,
      // Persist customer data snapshots
      customerRif: createOrderDto.customerRif,
      taxType: createOrderDto.taxType,
      customerPhone: createOrderDto.customerPhone,
      customerAddress: createOrderDto.customerAddress,

      // IVA Withholding (Retención de IVA)
      customerIsSpecialTaxpayer,
      ivaWithholdingPercentage,
      ivaWithholdingAmount,
    };

    // LINK WAITER FROM TABLE IF APPLICABLE
    if (createOrderDto.tableId) {
      try {
        const table = await this.tableModel.findById(createOrderDto.tableId).select('assignedServerId').lean();
        if (table?.assignedServerId) {
          orderData.assignedWaiterId = table.assignedServerId;
          // Also copy to assignedTo if not explicitly set in DTO
          if (!createOrderDto.assignedTo) {
            orderData.assignedTo = table.assignedServerId;
          }
          this.logger.log(`Assigned waiter ${table.assignedServerId} from table ${createOrderDto.tableId} to order`);
        }
      } catch (err) {
        this.logger.warn(`Failed to fetch table waiter: ${err.message}`);
      }
    }

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
    // RESTAURANT: Update Table Status if applicable
    // ========================================
    if (createOrderDto.tableId) {
      try {
        await this.tableModel.findByIdAndUpdate(createOrderDto.tableId, {
          status: 'occupied',
          currentOrderId: savedOrder._id,
          seatedAt: new Date(), // Reset seated time or keep original? Usually reset on new order or seat.
          // Assuming seating happens before ordering, we might just want to link the order.
        });
        this.logger.log(`Table ${createOrderDto.tableId} linked to order ${savedOrder.orderNumber}`);
      } catch (tableError) {
        this.logger.error(`Failed to update table ${createOrderDto.tableId}: ${tableError.message}`);
      }
    }

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
      orderNumber: savedOrder.orderNumber,
      customerName: savedOrder.customerName,
      totalAmount: savedOrder.totalAmount,
      source: createOrderDto.channel || "pos",
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
            currency: p.method.includes("_usd") ? tenantCurrency : "VES",
            reference: p.reference,
          };
          return this.paymentsService.create(paymentDto, user);
        }),
      );
    }

    // Los asientos contables se generan SOLO desde la factura emitida
    // (billing.document.issued → BillingAccountingListener)
    // para evitar duplicidad y usar los montos VES ya calculados en la factura.

    // Record transaction history if order is PAID (venta = pago)
    if (savedOrder.paymentStatus === "paid") {
      setImmediate(async () => {
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
      });
    }

    this.logger.log(`AutoReserve Check: ${createOrderDto.autoReserve}`);

    if (createOrderDto.autoReserve) {
      // IMPORTANTE: Usar quantityInBaseUnit para productos multi-unidad
      const reservationItems: { productSku: string; quantity: number }[] = [];

      for (const item of savedOrder.items) {
        // Verificar si el producto tiene receta (BOM)
        // Usamos exists() que es más ligero
        const hasBom = await this.bomModel.exists({
          productId: new Types.ObjectId(item.productId),
          isActive: true,
          tenantId: new Types.ObjectId(user.tenantId)
        });

        if (hasBom) {
          // Es un producto "Made to Order".
          // NO reservamos el producto terminado (porque no existe en inventario).
          // La deducción de ingredientes ocurrirá al procesar el pago (Legacy Flow)
          // o se puede habilitar aquí si se desea deducción inmediata.

          this.logger.debug(`Skipping reservation for Recipe Product ${item.productSku} (Backflush pending payment)`);
          continue;
        }

        reservationItems.push({
          productSku: item.variantSku || item.productSku,
          quantity: item.quantityInBaseUnit ?? item.quantity, // Usar cantidad base si existe
        });
      }

      if (reservationItems.length > 0) {
        try {
          await this.inventoryService.reserveInventory(
            { orderId: savedOrder._id.toString(), items: reservationItems }, // Reverted to original API call structure
            user,
            undefined,
          );
          savedOrder.inventoryReservation = {
            isReserved: true,
            reservedAt: new Date(),
          };
          await savedOrder.save();
        } catch (error) {
          this.logger.warn(
            `Failed to auto-reserve inventory for order ${savedOrder.orderNumber}: ${error.message}`,
          );
        }
      } else {
        this.logger.log(`No items require reservation for order ${savedOrder.orderNumber} (All items are Manufactured/Recipes or list is empty)`);
      }
    }


    // Send WhatsApp confirmation (async, don't block response)
    setImmediate(async () => {
      try {
        await this.whatsappOrderNotificationsService.sendOrderConfirmation(
          savedOrder,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send WhatsApp order confirmation for order ${savedOrder.orderNumber}: ${error.message}`,
        );
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
        removedIngredients: [],
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
      customerRif: (dto as any).customerRif,
      taxType: (dto as any).taxType,
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
    return this.orderAnalyticsService.exportOrders(
      query,
      tenantId,
      this.buildOrderQuery.bind(this),
    );
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    return this.orderModel
      .findOne({ _id: id, tenantId })
      .populate("payments")
      .populate("customerId", "name taxInfo") // Populate customer to get RIF/TaxID
      .populate("assignedTo", "firstName lastName email")
      .populate({
        path: "assignedWaiterId",
        select: "firstName lastName customerId",
        populate: {
          path: "customerId",
          select: "_id name"
        }
      }) // Nested populate for tips section
      .populate("tableId", "tableNumber name") // Populate table info for frontend context
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

    // ========================================
    // SMART ITEM ARRAY MERGING FOR POS WORKFLOWS
    // ========================================
    let processedItems = order.items; // Default: keep existing items

    if (updateOrderDto.items && updateOrderDto.items.length > 0) {
      // Build a processed items array
      const newProcessedItems: any[] = [];

      for (const itemDto of updateOrderDto.items) {
        // Check if this item already exists (has _id from frontend)
        const existingItem = order.items.find(
          (oi: any) => oi._id && oi._id.toString() === (itemDto as any)._id
        );

        if (existingItem) {
          // UPDATE existing item (preserve metadata, update quantity/modifiers if changed)
          const existingItemObj: any = (existingItem as any).toObject ? (existingItem as any).toObject() : existingItem;
          newProcessedItems.push({
            ...existingItemObj,
            quantity: itemDto.quantity,
            modifiers: itemDto.modifiers || existingItemObj.modifiers,
            specialInstructions: itemDto.specialInstructions || existingItemObj.specialInstructions,
            removedIngredients: itemDto.removedIngredients || existingItemObj.removedIngredients,
            // Keep existing metadata
            _id: (existingItem as any)._id,
            status: (itemDto as any).status || existingItemObj.status,
            addedAt: (itemDto as any).addedAt || existingItemObj.addedAt,
          });
        } else {
          // NEW item - process it fully
          const product = await this.productModel
            .findById(itemDto.productId)
            .session(null);
          if (!product) {
            this.logger.warn(
              `Product ${itemDto.productId} not found for new item in order ${order.orderNumber}`
            );
            continue;
          }

          const variant = this.resolveVariant(product, itemDto);
          if (!variant) {
            this.logger.warn(
              `Variant not found for product ${product.sku} in order ${order.orderNumber}`
            );
            continue;
          }

          const attributes = this.buildOrderItemAttributes(product, variant, itemDto);
          const attributeSummary = this.buildAttributeSummary(attributes);

          // Calculate pricing for new item
          let unitPrice = variant.basePrice || 0;
          let conversionFactor = 1;
          let quantityInBaseUnit = itemDto.quantity;

          if (itemDto.selectedUnit && product.sellingUnits?.length > 0) {
            const selectedUnitDef = product.sellingUnits.find(
              (u) => u.abbreviation === itemDto.selectedUnit
            );
            if (selectedUnitDef) {
              unitPrice = selectedUnitDef.pricePerUnit || unitPrice;
              conversionFactor = selectedUnitDef.conversionFactor || 1;
              quantityInBaseUnit = itemDto.quantity * conversionFactor;
            }
          }

          const modifierAdjustment = (itemDto.modifiers || []).reduce(
            (sum, mod) => sum + (mod.priceAdjustment || 0) * (mod.quantity || 1),
            0
          );
          const finalUnitPrice = unitPrice + modifierAdjustment;
          const totalPrice = finalUnitPrice * itemDto.quantity;
          const ivaAmount = (itemDto.ivaApplicable ?? product.ivaApplicable)
            ? totalPrice * 0.16
            : 0;
          const igtfAmount = 0;
          const finalPrice = totalPrice + ivaAmount + igtfAmount;

          const inventoryRecord = await this.inventoryService.findByProductSku(
            variant.sku,
            user.tenantId
          );
          const costPrice = inventoryRecord?.averageCostPrice || 0;

          newProcessedItems.push({
            productId: new Types.ObjectId(itemDto.productId),
            productSku: variant.sku,
            productName: product.name,
            variantId: variant._id ? new Types.ObjectId(variant._id) : undefined,
            variantSku: variant.sku,
            attributes,
            attributeSummary,
            quantity: itemDto.quantity,
            selectedUnit: itemDto.selectedUnit,
            conversionFactor,
            quantityInBaseUnit,
            unitPrice,
            totalPrice,
            costPrice,
            modifiers: itemDto.modifiers || [],
            specialInstructions: itemDto.specialInstructions,
            removedIngredients: itemDto.removedIngredients?.map(
              (id) => new Types.ObjectId(id)
            ) || [],
            ivaAmount,
            igtfAmount,
            finalPrice,
            status: "sent_to_kitchen", // New items should be visible in kitchen
            addedAt: new Date(),
          });
        }
      }

      processedItems = newProcessedItems as any;
    }

    // ========================================
    // BUILD UPDATE PAYLOAD
    // ========================================
    const updatePayload: any = {
      ...updateOrderDto,
      items: processedItems,
      updatedBy: user.id,
    };

    // Ensure denormalized customer fields are preserved
    if (updateOrderDto.customerRif !== undefined) {
      updatePayload.customerRif = updateOrderDto.customerRif;
    }
    if (updateOrderDto.taxType !== undefined) {
      updatePayload.taxType = updateOrderDto.taxType;
    }
    if (updateOrderDto.customerPhone !== undefined) {
      updatePayload.customerPhone = updateOrderDto.customerPhone;
    }
    if (updateOrderDto.customerAddress !== undefined) {
      updatePayload.customerAddress = updateOrderDto.customerAddress;
    }

    const updatedOrder = await this.orderModel
      .findByIdAndUpdate(id, updatePayload, { new: true })
      .populate("customerId", "name taxInfo")
      .populate("items.productId", "name sku type");

    // POST-UPDATE INVENTORY MOVEMENTS (delegated to sub-service)
    const fulfillmentStatuses = ["shipped", "delivered"];
    const movedToFulfillment =
      updatedOrder &&
      fulfillmentStatuses.includes(updatedOrder.status || "") &&
      !fulfillmentStatuses.includes(previousStatus);

    if (updatedOrder && movedToFulfillment) {
      setImmediate(async () => {
        try {
          await this.orderInventoryService.createOutMovementsForStatusChange(
            updatedOrder,
            user,
          );
        } catch (err) {
          this.logger.error(
            `Failed to create OUT movements on status change for order ${updatedOrder.orderNumber}: ${err.message}`,
          );
        }
      });
    }

    // Emit update event (e.g. for Kitchen Display sync)
    if (updatedOrder) {
      this.eventEmitter.emit("order.updated", {
        orderId: updatedOrder._id,
        tenantId: user.tenantId,
        status: updatedOrder.status,
        items: updatedOrder.items,
      });
    }

    return updatedOrder;
  }

  async reconcileMissingOutMovements(
    user: any,
    options?: { statuses?: string[]; limit?: number },
  ) {
    return this.orderInventoryService.reconcileMissingOutMovements(user, options);
  }

  async registerPayments(
    orderId: string,
    bulkRegisterPaymentsDto: BulkRegisterPaymentsDto,
    user: any,
  ): Promise<OrderDocument> {
    return this.orderPaymentsService.registerPayments(
      orderId,
      bulkRegisterPaymentsDto,
      user,
      this.findOne.bind(this),
    );
  }


  async confirmPayment(
    orderId: string,
    paymentIndex: number,
    bankAccountId: string,
    confirmedMethod: string,
    user: any,
  ): Promise<OrderDocument> {
    return this.orderPaymentsService.confirmPayment(
      orderId,
      paymentIndex,
      bankAccountId,
      confirmedMethod,
      user,
    );
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
    return this.orderFulfillmentService.updateFulfillmentStatus(
      id,
      status,
      user,
      notes,
      trackingNumber,
    );
  }

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  async completeOrder(id: string, user: any): Promise<OrderDocument> {
    return this.orderFulfillmentService.completeOrder(id, user);
  }

  async cancelOrder(id: string, user: any): Promise<OrderDocument> {
    return this.orderFulfillmentService.cancelOrder(id, user);
  }

  async fixHistoricPayments(user: any) {
    return this.orderPaymentsService.fixHistoricPayments(user);
  }

  async getAnalyticsBySource(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.orderAnalyticsService.getAnalyticsBySource(tenantId, startDate, endDate);
  }
  async migrateDeliveryNotePaymentStatus(tenantId: string): Promise<{ updated: number; checked: number }> {
    return this.orderPaymentsService.migrateDeliveryNotePaymentStatus(tenantId);
  }
}
