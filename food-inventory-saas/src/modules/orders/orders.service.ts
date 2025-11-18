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
  RegisterPaymentDto,
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
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly paymentsService: PaymentsService,
    private readonly deliveryService: DeliveryService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly shiftsService: ShiftsService,
    private readonly discountService: DiscountService,
    private readonly eventEmitter: EventEmitter2,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getPaymentMethods(user: any): Promise<any> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new NotFoundException("Tenant not found");
    }
    const baseMethods = [
      { id: "efectivo_usd", name: "Efectivo (USD)", igtfApplicable: true },
      {
        id: "transferencia_usd",
        name: "Transferencia (USD)",
        igtfApplicable: true,
      },
      { id: "zelle_usd", name: "Zelle (USD)", igtfApplicable: true },
      { id: "efectivo_ves", name: "Efectivo (VES)", igtfApplicable: false },
      {
        id: "transferencia_ves",
        name: "Transferencia (VES)",
        igtfApplicable: false,
      },
      { id: "pago_movil_ves", name: "Pago Móvil (VES)", igtfApplicable: false },
      { id: "pos_ves", name: "Punto de Venta (VES)", igtfApplicable: false },
      { id: "tarjeta_ves", name: "Tarjeta (VES)", igtfApplicable: false },
      { id: "pago_mixto", name: "Pago Mixto", igtfApplicable: false },
    ];

    return { methods: baseMethods };
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    const { customerId, customerName, customerRif, taxType, items, payments } =
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
    } else if (customerRif && customerName) {
      customer = await this.customerModel
        .findOne({ "taxInfo.taxId": customerRif, tenantId: user.tenantId })
        .exec();
      if (!customer) {
        customer = await new this.customerModel({
          name: customerName,
          customerType: "individual",
          customerNumber: `CUST-${Date.now()}`,
          taxInfo: { taxId: customerRif, taxType, taxName: customerName },
          createdBy: user.id,
          tenantId: user.tenantId,
        }).save();
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

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;

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

    const foreignCurrencyPaymentAmount = (payments || [])
      .filter((p) => p.method.includes("_usd"))
      .reduce((sum, p) => sum + p.amount, 0);
    const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
    const totalAmount =
      subtotal +
      ivaTotal +
      igtfTotal +
      shippingCost -
      (createOrderDto.discountAmount || 0);

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
      payments: [],
      paymentStatus: "pending",
      notes: createOrderDto.notes,
      channel: createOrderDto.channel,
      status: "pending",
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
    });

    if (createOrderDto.autoReserve) {
      // IMPORTANTE: Usar quantityInBaseUnit para productos multi-unidad
      const reservationItems = savedOrder.items.map((item) => ({
        productSku: item.variantSku || item.productSku,
        // Si tiene unidad seleccionada, usar quantityInBaseUnit, sino usar quantity normal
        quantity: item.quantityInBaseUnit ?? item.quantity,
      }));
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
    }

    // Devolver la orden guardada directamente sin populate pesado
    return savedOrder.toObject();
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
    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      { ...updateOrderDto, updatedBy: user.id },
      { new: true },
    );
    return updatedOrder;
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

    // Guardar pagos en paymentRecords
    const newPaymentRecords = bulkRegisterPaymentsDto.payments.map((p) => ({
      method: p.method,
      amount: p.amount,
      amountVes: p.amountVes,
      exchangeRate: p.exchangeRate,
      currency: p.currency || "USD",
      reference: p.reference || "",
      date: new Date(p.date),
      isConfirmed: p.isConfirmed || false,
      bankAccountId: p.bankAccountId
        ? new Types.ObjectId(p.bankAccountId)
        : undefined,
      confirmedAt: p.isConfirmed ? new Date() : undefined,
      confirmedMethod: p.isConfirmed ? p.method : undefined,
    }));

    order.paymentRecords = [
      ...(order.paymentRecords || []),
      ...newPaymentRecords,
    ];

    // Calcular paidAmount en USD y VES
    const totalPaidUSD = order.paymentRecords.reduce(
      (sum, p) => sum + (p.amount || 0),
      0,
    );
    const totalPaidVES = order.paymentRecords.reduce(
      (sum, p) => sum + (p.amountVes || 0),
      0,
    );
    order.paidAmount = totalPaidUSD;
    order.paidAmountVes = totalPaidVES;

    // Actualizar paymentStatus
    if (totalPaidUSD >= order.totalAmount) {
      order.paymentStatus = "paid";
    } else if (totalPaidUSD > 0) {
      order.paymentStatus = "partial";
    }

    // Si el pago está confirmado, actualizar el balance de la cuenta bancaria
    for (const payment of bulkRegisterPaymentsDto.payments) {
      if (payment.isConfirmed && payment.bankAccountId) {
        const bankAccount = await this.bankAccountModel.findById(
          payment.bankAccountId,
        );
        if (bankAccount) {
          // Determinar el monto a sumar según la moneda de la cuenta
          const amountToAdd =
            bankAccount.currency === "VES"
              ? payment.amountVes || 0
              : payment.amount || 0;

          bankAccount.currentBalance += amountToAdd;
          await bankAccount.save();

          this.logger.log(
            `Updated bank account ${bankAccount._id} balance by ${amountToAdd} ${bankAccount.currency}`,
          );
        }
      }
    }

    await order.save();

    const finalOrder = await this.findOne(orderId, user.tenantId);
    if (!finalOrder) {
      throw new NotFoundException(
        "Error al registrar el pago, no se pudo encontrar la orden final.",
      );
    }
    return finalOrder;
  }

  async confirmPayment(
    orderId: string,
    paymentIndex: number,
    bankAccountId: string,
    confirmedMethod: string,
    tenantId: string,
  ): Promise<OrderDocument> {
    this.logger.log(`Confirming payment ${paymentIndex} for order ${orderId}`);
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException("Orden no encontrada");
    }

    if (!order.paymentRecords || !order.paymentRecords[paymentIndex]) {
      throw new NotFoundException("Pago no encontrado");
    }

    // Confirmar el pago
    order.paymentRecords[paymentIndex].isConfirmed = true;
    order.paymentRecords[paymentIndex].bankAccountId = new Types.ObjectId(
      bankAccountId,
    );
    order.paymentRecords[paymentIndex].confirmedMethod = confirmedMethod;
    order.paymentRecords[paymentIndex].confirmedAt = new Date();

    await order.save();

    // TODO: Crear transacción bancaria (deposit)
    // await this.bankTransactionsService.create(...)

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
    if (totalSpent > 0) return "bronce";
    return "nuevo";
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

  private escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
