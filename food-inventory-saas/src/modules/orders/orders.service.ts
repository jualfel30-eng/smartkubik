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
      { id: 'cash_usd', name: 'Efectivo (USD)', igtfApplicable: false },
      { id: 'cash_ves', name: 'Efectivo (VES)', igtfApplicable: false },
      { id: 'zelle', name: 'Zelle', igtfApplicable: false },
      { id: 'bank_transfer_usd', name: 'Transferencia (USD)', igtfApplicable: false },
      { id: 'bank_transfer_ves', name: 'Transferencia (VES)', igtfApplicable: true },
      { id: 'paypal', name: 'PayPal', igtfApplicable: false },
    ];

    return { methods: baseMethods };
  }

  async create(
    createOrderDto: CreateOrderDto,
    user: any,
  ): Promise<OrderDocument> {
    const { customerId, customerName, customerRif, taxType, items } =
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
          `Cliente con ID "${customerId}" no encontrado.`,
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
      const [products, tenant] = await Promise.all([
        this.productModel.find({ _id: { $in: items.map((i) => i.productId) } }),
        this.tenantModel.findById(user.tenantId),
      ]);

      if (!tenant) {
        throw new BadRequestException("Información de tenant no encontrada.");
      }

      const paymentMethodsResponse =
        await this.getPaymentMethods(user);
      const selectedPaymentMethod = paymentMethodsResponse.methods.find(
        (m) => m.id === createOrderDto.paymentMethod,
      );
      const appliesIgtf = selectedPaymentMethod
        ? selectedPaymentMethod.igtfApplicable
        : false;

      const detailedItems: OrderItem[] = [];
      let subtotal = 0;
      let ivaTotal = 0;
      let igtfTotal = 0;

      for (const itemDto of items) {
        const product = products.find(
          (p) => p._id.toString() === itemDto.productId,
        );
        if (!product) {
          throw new NotFoundException(
            `Producto con ID "${itemDto.productId}" no encontrado.`,
          );
        }
        const variant = product.variants?.[0];
        const unitPrice = variant?.basePrice ?? 0;
        const costPrice = variant?.costPrice ?? 0;
        const totalPrice = unitPrice * itemDto.quantity;
        const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
        const igtfAmount =
          appliesIgtf && !product.igtfExempt ? totalPrice * 0.03 : 0;
        const finalPrice = totalPrice + ivaAmount + igtfAmount;

        detailedItems.push({
          productId: product._id,
          productSku: product.sku,
          productName: product.name,
          quantity: itemDto.quantity,
          unitPrice,
          costPrice,
          totalPrice,
          ivaAmount,
          igtfAmount,
          finalPrice,
          status: "pending",
        } as OrderItem);

        subtotal += totalPrice;
        ivaTotal += ivaAmount;
        igtfTotal += igtfAmount;
      }

      const shippingCost = createOrderDto.shippingCost || 0;
      const discountAmount = createOrderDto.discountAmount || 0;
      const totalAmount =
        subtotal + ivaTotal + igtfTotal + shippingCost - discountAmount;

      const orderNumber = await this.generateOrderNumber(user.tenantId);

      const orderData: any = {
        orderNumber,
        customerId: customer._id, // Use the ID of the found or created customer
        customerName: customer.name,
        items: detailedItems,
        subtotal,
        ivaTotal,
        igtfTotal,
        shippingCost,
        discountAmount,
        totalAmount,
        notes: createOrderDto.notes,
        channel: createOrderDto.channel,
        status: "pending",
        paymentStatus: "pending",
        inventoryReservation: { isReserved: false },
        createdBy: user.id,
        tenantId: user.tenantId,
      };

      if (createOrderDto.shippingAddress) {
        orderData.shipping = {
          method: "delivery", // Default to 'delivery' if an address is provided
          address: {
            street: createOrderDto.shippingAddress.street,
            city: createOrderDto.shippingAddress.city,
            state: createOrderDto.shippingAddress.state,
            zipCode: createOrderDto.shippingAddress.zipCode || "",
            country: "Venezuela",
          },
          cost: shippingCost, // Use the shippingCost from the DTO
        };
      }

      const order = new this.orderModel(orderData);
      const savedOrder = await order.save();

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
        // Defensive check
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
      paymentMethod,
      shippingCost = 0,
      discountAmount = 0,
    } = calculationDto;

    const [products, tenant] = await Promise.all([
      this.productModel.find({ _id: { $in: items.map((i) => i.productId) } }),
      this.tenantModel.findById(user.tenantId), // Cargar el tenant completo
    ]);

    if (!tenant) {
      throw new BadRequestException("Información de tenant no encontrada.");
    }

    if (products.length !== items.length) {
      throw new BadRequestException(
        "Uno o más productos no fueron encontrados.",
      );
    }

    const paymentMethodsResponse =
      await this.getPaymentMethods(user);
    const selectedPaymentMethod = paymentMethodsResponse.methods.find(
      (m) => m.id === paymentMethod,
    );
    const appliesIgtf = selectedPaymentMethod
      ? selectedPaymentMethod.igtfApplicable
      : false;

    let subtotal = 0;
    let ivaTotal = 0;
    let igtfTotal = 0;

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
      const totalPrice = unitPrice * itemDto.quantity;

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
      const igtfAmount =
        appliesIgtf && !product.igtfExempt ? totalPrice * 0.03 : 0;

      subtotal += totalPrice;
      ivaTotal += ivaAmount;
      igtfTotal += igtfAmount;
    }

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
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (status) filter.status = status;
    if (customerId) filter.customerId = new Types.ObjectId(customerId);
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
}
