import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import { Order, OrderDocument, OrderItem } from "../../schemas/order.schema";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema"; // Importar Tenant
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderCalculationDto,
  BulkRegisterPaymentsDto,
} from "../../dto/order.dto";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service"; // Import AccountingService

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>, // Inyectar TenantModel
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService, // Inject AccountingService
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getPaymentMethods(user: any): Promise<any> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    // This is a temporary solution to fix the dependency issue.
    // In the future, this should be configurable per tenant.
    const baseMethods = [
      { id: 'efectivo_usd', name: 'Efectivo (USD)', igtfApplicable: true },
      { id: 'transferencia_usd', name: 'Transferencia (USD)', igtfApplicable: true },
      { id: 'zelle_usd', name: 'Zelle (USD)', igtfApplicable: true },
      { id: 'efectivo_ves', name: 'Efectivo (VES)', igtfApplicable: false },
      { id: 'transferencia_ves', name: 'Transferencia (VES)', igtfApplicable: false },
      { id: 'pago_movil_ves', name: 'Pago Móvil (VES)', igtfApplicable: false },
      { id: 'tarjeta_ves', name: 'Tarjeta (VES)', igtfApplicable: false },
      { id: 'pago_mixto', name: 'Pago Mixto', igtfApplicable: false }, // La lógica de IGTF para mixto es más compleja y se maneja en el frontend
    ];

    return { methods: baseMethods };
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new BadRequestException("Tenant no encontrado");
    }

    if (tenant.usage.currentOrders >= tenant.limits.maxOrders) {
      throw new BadRequestException("Límite de órdenes alcanzado para su plan de suscripción.");
    }

    const { customerId, customerName, customerRif, taxType, items, payments } =
      createOrderDto;
    this.logger.log(
      `Initiating order creation with customerId: ${customerId} or customerRif: ${customerRif}`,
    );

    let customer: CustomerDocument | null;

    // Phase 1: Find or Create Customer
    if (customerId) {
      customer = await this.customerModel.findById(customerId).exec();
      if (!customer) {
        throw new NotFoundException(
          `Cliente con ID \"${customerId}\" no encontrado.`,
        );
      }
      this.logger.log(`Found existing customer by ID: ${customer._id}`);
    } else if (customerRif && customerName) {
      customer = await this.customerModel
        .findOne({ "taxInfo.taxId": customerRif, tenantId: user.tenantId })
        .exec();

      if (!customer) {
        this.logger.log(
          `Customer with RIF ${customerRif} not found. Creating new customer.`,
        );

        const customerNumber = `CUST-${Date.now()}`;

        customer = new this.customerModel({
          name: customerName,
          customerNumber,
          customerType: "individual", // Defaulting to individual
          taxInfo: {
            taxId: customerRif,
            taxType: taxType,
            taxName: customerName,
          },
          createdBy: user.id,
          tenantId: user.tenantId,
          metrics: {
            totalOrders: 0,
            totalSpent: 0,
            totalSpentUSD: 0,
            averageOrderValue: 0,
            orderFrequency: 0,
            lifetimeValue: 0,
            returnRate: 0,
            cancellationRate: 0,
            paymentDelayDays: 0,
          },
        });
        await customer.save();
        this.logger.log(`New customer created with ID: ${customer._id}`);
      } else {
        this.logger.log(`Found existing customer by RIF: ${customer._id}`);
      }
    } else {
      throw new BadRequestException(
        "Se debe proporcionar un ID de cliente existente o los datos para crear uno nuevo (nombre, RIF y tipo de RIF).",
      );
    }

    // Phase 2: Process Order Items and Calculate Totals
    this.logger.log(`Processing order items for customer: ${customer._id}`);
    try {
      const products = await this.productModel.find({ _id: { $in: items.map((i) => i.productId) } });

      const detailedItems: OrderItem[] = [];
      let subtotal = 0;
      let ivaTotal = 0;

      for (const itemDto of items) {
        const product = products.find(
          (p) => p._id.toString() === itemDto.productId,
        );
        if (!product) {
          throw new NotFoundException(
            `Producto con ID \"${itemDto.productId}\" no encontrado.`,
          );
        }
        const variant = product.variants?.[0];
        const unitPrice = variant?.basePrice ?? 0;
        const costPrice = variant?.costPrice ?? 0;

        // NEW LOGIC
        let totalPrice;
        if (product.isSoldByWeight) {
          // For products sold by weight, quantity is the weight.
          // unitPrice is the price per unitOfMeasure (e.g., per kg)
          totalPrice = unitPrice * itemDto.quantity;
        } else {
          // For products sold by unit, quantity must be an integer.
          if (!Number.isInteger(itemDto.quantity)) {
            throw new BadRequestException(
              `La cantidad para el producto \"${product.name}\" debe ser un número entero.`
            );
          }
          totalPrice = unitPrice * itemDto.quantity;
        }

        const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
        
        detailedItems.push({
          productId: product._id,
          productSku: product.sku,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice,
          costPrice,
          totalPrice,
          ivaAmount,
          igtfAmount: 0, // Will be calculated later
          finalPrice: 0, // Will be calculated later
          status: "pending",
        } as OrderItem);

        subtotal += totalPrice;
        ivaTotal += ivaAmount;
      }

      const foreignCurrencyPaymentAmount = (payments || [])
        .filter(p => p.method.includes('_usd'))
        .reduce((sum, p) => sum + p.amount, 0);

      const igtfTotal = foreignCurrencyPaymentAmount * 0.03;

      const shippingCost = createOrderDto.shippingCost || 0;
      const discountAmount = createOrderDto.discountAmount || 0;
      const totalAmount =
        subtotal + ivaTotal + igtfTotal + shippingCost - discountAmount;

      const orderNumber = await this.generateOrderNumber(user.tenantId);

      const newPayments = (payments || []).map(p => ({
        ...p,
        currency: p.method.includes('_usd') ? 'USD' : 'VES',
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: user.id,
      }));

      const paidAmount = newPayments.reduce((sum, p) => sum + p.amount, 0);
      let paymentStatus = 'pending';
      if (paidAmount >= totalAmount) {
        paymentStatus = 'paid';
      } else if (paidAmount > 0) {
        paymentStatus = 'partial';
      }

      const orderData: any = {
        orderNumber,
        customerId: customer._id,
        customerName: customer.name,
        items: detailedItems, // igtfAmount and finalPrice will be updated later if needed
        subtotal,
        ivaTotal,
        igtfTotal,
        shippingCost,
        discountAmount,
        totalAmount,
        payments: newPayments,
        paymentStatus,
        notes: createOrderDto.notes,
        channel: createOrderDto.channel,
        status: "pending",
        inventoryReservation: { isReserved: false },
        createdBy: user.id,
        tenantId: user.tenantId,
      };

      if (createOrderDto.shippingAddress) {
        orderData.shipping = {
          method: "delivery",
          address: {
            street: createOrderDto.shippingAddress.street,
            city: createOrderDto.shippingAddress.city,
            state: createOrderDto.shippingAddress.state,
            zipCode: createOrderDto.shippingAddress.zipCode || "",
            country: "Venezuela",
          },
          cost: shippingCost,
        };
      }

      const order = new this.orderModel(orderData);
      const savedOrder = await order.save();

      await this.tenantModel.findByIdAndUpdate(user.tenantId, { $inc: { 'usage.currentOrders': 1 } });

      // --- Automatic Journal Entry Creation ---
      try {
        this.logger.log(
          `Attempting to create journal entry for order ${savedOrder.orderNumber}`,
        );
        await this.accountingService.createJournalEntryForSale(
          savedOrder,
          user.tenantId,
        );
      } catch (accountingError) {
        this.logger.error(
          `Failed to create journal entry for order ${savedOrder.orderNumber}. The sale was processed correctly, but accounting needs review.`,
          accountingError.stack,
        );
      }

      // --- Automatic COGS Journal Entry ---
      try {
        this.logger.log(
          `Attempting to create COGS journal entry for order ${savedOrder.orderNumber}`,
        );
        await this.accountingService.createJournalEntryForCOGS(
          savedOrder,
          user.tenantId,
        );
      } catch (cogsError) {
        this.logger.error(
          `Failed to create COGS journal entry for order ${savedOrder.orderNumber}. The sale was processed correctly, but accounting needs review.`,
          cogsError.stack,
        );
      }
      // --- End of Automatic Journal Entry Creation ---

      const customerUpdate = {
        $inc: {
          "metrics.totalSpent": savedOrder.totalAmount,
          "metrics.totalOrders": 1,
        },
        $set: { "metrics.lastOrderDate": new Date() },
      };
      if (!customer.metrics?.firstOrderDate) {
        customerUpdate.$set["metrics.firstOrderDate"] = new Date();
      }
      await this.customerModel.findByIdAndUpdate(customer._id, customerUpdate);
      this.logger.log(
        `Customer ${customer._id} metrics updated atomically after new order.`,
      );

      if (createOrderDto.autoReserve) {
        this.logger.log(
          `Reserving inventory for order: ${savedOrder.orderNumber}`,
        );
        const reservationItems = savedOrder.items.map((item) => ({
          productSku: item.productSku,
          quantity: item.quantity,
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

      this.logger.log(`Order created successfully with number: ${orderNumber}`);
      return savedOrder;
    } catch (error) {
      this.logger.error(
        `Failed to create order: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Error al crear la orden: ${error.message}`,
      );
    }
  }

  async calculateTotals(calculationDto: OrderCalculationDto, user: any) {
    const {
      items,
      payments,
      shippingCost = 0,
      discountAmount = 0,
    } = calculationDto;

    const products = await this.productModel.find({ _id: { $in: items.map((i) => i.productId) } });

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

      const variant = product.variants?.[0];
      const unitPrice = variant?.basePrice ?? 0;
      
      // NEW LOGIC
      let totalPrice;
      if (product.isSoldByWeight) {
        // For products sold by weight, quantity is the weight.
        // unitPrice is the price per unitOfMeasure (e.g., per kg)
        totalPrice = unitPrice * itemDto.quantity;
      } else {
        // For products sold by unit, quantity must be an integer.
        if (!Number.isInteger(itemDto.quantity)) {
          throw new BadRequestException(
            `La cantidad para el producto "${product.name}" debe ser un número entero.`
          );
        }
        totalPrice = unitPrice * itemDto.quantity;
      }

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;

      subtotal += totalPrice;
      ivaTotal += ivaAmount;
    }

    const foreignCurrencyPaymentAmount = (payments || [])
      .filter(p => p.method.includes('_usd'))
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
    const {
      page = 1,
      limit = 20,
      search,
      status,
      customerId,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name")
        .exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return { orders, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ _id: id, tenantId }).exec();
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    user: any,
  ): Promise<OrderDocument | null> {
    this.logger.log(
      `Updating order ${id} with status ${updateOrderDto.status}`,
    );
    try {
      const order = await this.orderModel.findById(id);
      if (!order) {
        throw new NotFoundException("Orden no encontrada");
      }
      const oldStatus = order.status;
      const newStatus = updateOrderDto.status;

      if (newStatus && newStatus !== oldStatus) {
        if (
          (newStatus === "delivered" || newStatus === "confirmed") &&
          oldStatus !== "delivered" &&
          oldStatus !== "confirmed"
        ) {
          this.logger.log(`Order ${id} confirmed. Committing inventory.`);
          await this.inventoryService.commitInventory(order, user, undefined);
        }

        if (
          (newStatus === "cancelled" || newStatus === "refunded") &&
          oldStatus !== "cancelled" &&
          oldStatus !== "refunded"
        ) {
          this.logger.log(`Releasing inventory for cancelled order ${id}`);
          await this.inventoryService.releaseInventory(
            { orderId: id },
            user,
            undefined,
          );

          this.logger.log(`Order ${id} cancelled. Reverting customer metrics.`);
          const customer = await this.customerModel.findById(order.customerId);
          if (customer) {
            await this.customerModel.findByIdAndUpdate(customer._id, {
              $inc: {
                "metrics.totalSpent": -order.totalAmount,
                "metrics.totalOrders": -1,
              },
            });
            this.logger.log(
              `Customer ${customer._id} metrics reverted atomically due to cancellation.`,
            );
          } else {
            this.logger.warn(
              `Customer ${order.customerId} not found for order ${id}. Cannot update metrics on cancellation.`,
            );
          }

          await this.tenantModel.findByIdAndUpdate(order.tenantId, { $inc: { 'usage.currentOrders': -1 } });
        }
      }
      const updateData = { ...updateOrderDto, updatedBy: user.id };
      const updatedOrder = await this.orderModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true },
      );
      return updatedOrder;
    } catch (error) {
      this.logger.error(`Failed to update order ${id}: ${error.message}`);
      throw new BadRequestException(
        `Error al actualizar la orden: ${error.message}`,
      );
    }
  }

  private calculateCustomerTier(totalSpent: number): string {
    if (totalSpent >= 10000) return "diamante";
    if (totalSpent >= 5000) return "oro";
    if (totalSpent >= 2000) return "plata";
    if (totalSpent > 0) return "bronce";
    return "bronce";
  }

  private async generateOrderNumber(_tenantId: string): Promise<string> {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const day = now.getDate().toString().padStart(2, "0");
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");

    // Get the last 4 digits of the timestamp for some randomness
    const randomPart = now.getTime().toString().slice(-4);

    return `ORD-${year}${month}${day}-${hours}${minutes}${seconds}-${randomPart}`;
  }

  async registerPayments(
    orderId: string,
    bulkRegisterPaymentsDto: BulkRegisterPaymentsDto,
    user: any,
  ): Promise<OrderDocument> {
    this.logger.log(`Registering payments for order ${orderId}`);
    const order = await this.orderModel.findOne({ _id: orderId, tenantId: user.tenantId });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const newPayments = bulkRegisterPaymentsDto.payments.map(p => {
      const currency = p.method.includes('_usd') ? 'USD' : 'VES';
      return {
        ...p,
        currency,
        status: 'confirmed',
        confirmedAt: new Date(),
        confirmedBy: user.id,
      };
    });

    order.payments.push(...newPayments);

    const paidAmount = order.payments
      .filter(p => p.status === 'confirmed')
      .reduce((sum, p) => sum + p.amount, 0);

    if (paidAmount >= order.totalAmount) {
      order.paymentStatus = 'paid';
    } else if (paidAmount > 0) {
      order.paymentStatus = 'partial';
    }

    return order.save();
  }
}
