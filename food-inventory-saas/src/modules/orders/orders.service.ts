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
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  CreateOrderDto,
  UpdateOrderDto,
  OrderQueryDto,
  OrderCalculationDto,
  BulkRegisterPaymentsDto,
  RegisterPaymentDto,
} from "../../dto/order.dto";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";
import { PaymentsService } from "../payments/payments.service";
import { DeliveryService } from "../delivery/delivery.service";
import { CreatePaymentDto } from "../../dto/payment.dto";
import { UnitConversionUtil } from "../../utils/unit-conversion.util";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private tenantModel: Model<TenantDocument>,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
    private readonly paymentsService: PaymentsService,
    private readonly deliveryService: DeliveryService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async getPaymentMethods(user: any): Promise<any> {
    const tenant = await this.tenantModel.findById(user.tenantId);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    const baseMethods = [
      { id: 'efectivo_usd', name: 'Efectivo (USD)', igtfApplicable: true },
      { id: 'transferencia_usd', name: 'Transferencia (USD)', igtfApplicable: true },
      { id: 'zelle_usd', name: 'Zelle (USD)', igtfApplicable: true },
      { id: 'efectivo_ves', name: 'Efectivo (VES)', igtfApplicable: false },
      { id: 'transferencia_ves', name: 'Transferencia (VES)', igtfApplicable: false },
      { id: 'pago_movil_ves', name: 'Pago Móvil (VES)', igtfApplicable: false },
      { id: 'tarjeta_ves', name: 'Tarjeta (VES)', igtfApplicable: false },
      { id: 'pago_mixto', name: 'Pago Mixto', igtfApplicable: false },
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
      throw new BadRequestException("Límite de órdenes alcanzado o tenant no encontrado.");
    }

    let customer: CustomerDocument | null = null;
    if (customerId) {
      customer = await this.customerModel.findById(customerId).exec();
    } else if (customerRif && customerName) {
      customer = await this.customerModel.findOne({ "taxInfo.taxId": customerRif, tenantId: user.tenantId }).exec();
      if (!customer) {
        customer = await new this.customerModel({ name: customerName, customerType: 'individual', customerNumber: `CUST-${Date.now()}`, taxInfo: { taxId: customerRif, taxType, taxName: customerName }, createdBy: user.id, tenantId: user.tenantId }).save();
      }
    }

    if (!customer) {
        throw new BadRequestException("Se debe proporcionar un ID de cliente o los datos para crear uno nuevo.");
    }

    // Update customer location if provided in the order and customer doesn't have one or it's different
    if (createOrderDto.customerLocation && customer) {
      const shouldUpdateLocation = !customer.primaryLocation ||
        customer.primaryLocation.coordinates?.lat !== createOrderDto.customerLocation.coordinates?.lat ||
        customer.primaryLocation.coordinates?.lng !== createOrderDto.customerLocation.coordinates?.lng;

      if (shouldUpdateLocation) {
        await this.customerModel.findByIdAndUpdate(customer._id, {
          primaryLocation: createOrderDto.customerLocation
        });
        this.logger.log(`Updated customer ${customer._id} location from order`);
      }
    }

    const products = await this.productModel.find({ _id: { $in: items.map((i) => i.productId) } });
    const detailedItems: OrderItem[] = [];
    let subtotal = 0;
    let ivaTotal = 0;

    for (const itemDto of items) {
      const product = products.find((p) => p._id.toString() === itemDto.productId);
      if (!product) throw new NotFoundException(`Producto con ID "${itemDto.productId}" no encontrado.`);

      let unitPrice: number;
      let costPrice: number;
      let conversionFactor = 1;
      let quantityInBaseUnit = itemDto.quantity;
      let selectedUnit: string | undefined;

      // ======== MULTI-UNIT LOGIC ========
      // Si el producto tiene múltiples unidades de venta Y se seleccionó una unidad
      if (product.hasMultipleSellingUnits && itemDto.selectedUnit && product.sellingUnits?.length > 0) {
        this.logger.log(`Processing multi-unit product: ${product.name}, unit: ${itemDto.selectedUnit}`);

        // Validar y obtener la unidad de venta
        const sellingUnit = UnitConversionUtil.validateQuantityAndUnit(
          itemDto.quantity,
          itemDto.selectedUnit,
          product.sellingUnits,
        );

        // Usar precio y costo de la unidad seleccionada (NO del variant)
        unitPrice = sellingUnit.pricePerUnit;
        costPrice = sellingUnit.costPerUnit;
        conversionFactor = sellingUnit.conversionFactor;
        selectedUnit = sellingUnit.abbreviation;

        // Convertir cantidad a unidad base para descuento de inventario
        quantityInBaseUnit = UnitConversionUtil.convertToBaseUnit(
          itemDto.quantity,
          sellingUnit,
        );

        this.logger.log(
          `Multi-unit conversion: ${itemDto.quantity} ${selectedUnit} = ${quantityInBaseUnit} ${product.unitOfMeasure} (base unit)`
        );
      } else {
        // Lógica tradicional: usar precio de la variante
        const variant = product.variants?.[0];
        unitPrice = variant?.basePrice ?? 0;
        costPrice = variant?.costPrice ?? 0;
        selectedUnit = undefined;
      }

      // Calcular precio total con precisión decimal
      const totalPrice = UnitConversionUtil.calculateTotalPrice(
        itemDto.quantity,
        unitPrice,
      );

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;

      // Crear OrderItem con toda la información de unidades
      detailedItems.push({
        productId: product._id,
        productSku: product.sku,
        productName: product.name,
        quantity: itemDto.quantity,
        selectedUnit,
        conversionFactor: selectedUnit ? conversionFactor : undefined,
        quantityInBaseUnit: selectedUnit ? quantityInBaseUnit : undefined,
        unitPrice,
        costPrice,
        totalPrice,
        ivaAmount,
        igtfAmount: 0,
        finalPrice: 0,
        status: "pending",
      } as OrderItem);

      subtotal += totalPrice;
      ivaTotal += ivaAmount;
    }

    // Calculate delivery cost
    let shippingCost = createOrderDto.shippingCost || 0;
    let shippingInfo: any = undefined;

    if (createOrderDto.deliveryMethod && createOrderDto.deliveryMethod !== 'pickup') {
      try {
        const deliveryCostResult = await this.deliveryService.calculateDeliveryCost({
          tenantId: user.tenantId,
          method: createOrderDto.deliveryMethod as 'pickup' | 'delivery' | 'envio_nacional',
          customerLocation: customer.primaryLocation?.coordinates,
          destinationState: createOrderDto.shippingAddress?.state,
          destinationCity: createOrderDto.shippingAddress?.city,
          orderAmount: subtotal + ivaTotal,
        });

        shippingCost = deliveryCostResult.cost || 0;

        if (createOrderDto.deliveryMethod === 'delivery' || createOrderDto.deliveryMethod === 'envio_nacional') {
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
    } else if (createOrderDto.deliveryMethod === 'pickup') {
      shippingInfo = {
        method: 'pickup',
        cost: 0,
      };
    }

    const foreignCurrencyPaymentAmount = (payments || []).filter(p => p.method.includes('_usd')).reduce((sum, p) => sum + p.amount, 0);
    const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
    const totalAmount = subtotal + ivaTotal + igtfTotal + shippingCost - (createOrderDto.discountAmount || 0);

    const orderData: Partial<Order> = {
      orderNumber: await this.generateOrderNumber(user.tenantId),
      customerId: customer._id,
      customerName: customer.name,
      items: detailedItems,
      subtotal, ivaTotal, igtfTotal, totalAmount,
      shippingCost,
      shipping: shippingInfo,
      discountAmount: createOrderDto.discountAmount || 0,
      payments: [],
      paymentStatus: 'pending',
      notes: createOrderDto.notes,
      channel: createOrderDto.channel,
      status: "pending",
      inventoryReservation: { isReserved: false },
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();
    await this.tenantModel.findByIdAndUpdate(user.tenantId, { $inc: { 'usage.currentOrders': 1 } });

    if (payments && payments.length > 0) {
      for (const p of payments) {
        const paymentDto: CreatePaymentDto = {
          paymentType: 'sale',
          orderId: savedOrder._id.toString(),
          amount: p.amount,
          method: p.method,
          date: p.date.toISOString(),
          currency: p.method.includes('_usd') ? 'USD' : 'VES',
          reference: p.reference,
        };
        await this.paymentsService.create(paymentDto, user);
      }
    }

    // Ejecutar contabilidad de forma asíncrona (no bloquear la respuesta)
    setImmediate(async () => {
      try {
        await this.accountingService.createJournalEntryForSale(savedOrder, user.tenantId);
        await this.accountingService.createJournalEntryForCOGS(savedOrder, user.tenantId);
      } catch (accountingError) {
        this.logger.error(`Error en la contabilidad automática para la orden ${savedOrder.orderNumber}`, accountingError.stack);
      }
    });

    if (createOrderDto.autoReserve) {
      // IMPORTANTE: Usar quantityInBaseUnit para productos multi-unidad
      const reservationItems = savedOrder.items.map(item => ({
        productSku: item.productSku,
        // Si tiene unidad seleccionada, usar quantityInBaseUnit, sino usar quantity normal
        quantity: item.quantityInBaseUnit ?? item.quantity
      }));
      await this.inventoryService.reserveInventory({ orderId: savedOrder._id.toString(), items: reservationItems }, user, undefined);
      savedOrder.inventoryReservation = { isReserved: true, reservedAt: new Date() };
      await savedOrder.save();
    }

    // Devolver la orden guardada directamente sin populate pesado
    return savedOrder.toObject();
  }

  async calculateTotals(calculationDto: OrderCalculationDto, user: any) {
    const { items, payments, shippingCost = 0, discountAmount = 0 } = calculationDto;
    const products = await this.productModel.find({ _id: { $in: items.map((i) => i.productId) } });
    if (products.length !== items.length) {
      throw new BadRequestException("Uno o más productos no fueron encontrados.");
    }
    let subtotal = 0;
    let ivaTotal = 0;

    for (const itemDto of items) {
      const product = products.find((p) => p._id.toString() === itemDto.productId);
      if (!product) {
        throw new NotFoundException(`Producto con ID "${itemDto.productId}" no encontrado durante el cálculo.`);
      }

      let unitPrice: number;

      // ======== MULTI-UNIT LOGIC para cálculos ========
      if (product.hasMultipleSellingUnits && itemDto.selectedUnit && product.sellingUnits?.length > 0) {
        const sellingUnit = UnitConversionUtil.validateQuantityAndUnit(
          itemDto.quantity,
          itemDto.selectedUnit,
          product.sellingUnits,
        );
        unitPrice = sellingUnit.pricePerUnit;
      } else {
        const variant = product.variants?.[0];
        unitPrice = variant?.basePrice ?? 0;
      }

      const totalPrice = UnitConversionUtil.calculateTotalPrice(
        itemDto.quantity,
        unitPrice,
      );

      const ivaAmount = product.ivaApplicable ? totalPrice * 0.16 : 0;
      subtotal += totalPrice;
      ivaTotal += ivaAmount;
    }
    const foreignCurrencyPaymentAmount = (payments || []).filter(p => p.method.includes('_usd')).reduce((sum, p) => sum + p.amount, 0);
    const igtfTotal = foreignCurrencyPaymentAmount * 0.03;
    const totalAmount = subtotal + ivaTotal + igtfTotal + (shippingCost || 0) - (discountAmount || 0);
    return { subtotal, ivaTotal, igtfTotal, shippingCost: shippingCost || 0, discountAmount: discountAmount || 0, totalAmount };
  }

  async findAll(query: OrderQueryDto, tenantId: string) {
    const { page = 1, limit = 20, search, status, customerId, sortBy = "createdAt", sortOrder = "desc" } = query;
    const filter: any = { tenantId };
    if (status) filter.status = status;
    if (customerId) filter.customerId = customerId;
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
      ];
    }
    const sortOptions: any = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.orderModel.find(filter).sort(sortOptions).skip(skip).limit(limit).populate("customerId", "name").populate('payments').exec(),
      this.orderModel.countDocuments(filter),
    ]);
    return { orders, page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string): Promise<OrderDocument | null> {
    return this.orderModel.findOne({ _id: id, tenantId }).populate('payments').exec();
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, user: any): Promise<OrderDocument | null> {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException("Orden no encontrada");
    const updatedOrder = await this.orderModel.findByIdAndUpdate(id, { ...updateOrderDto, updatedBy: user.id }, { new: true });
    return updatedOrder;
  }

  async registerPayments(orderId: string, bulkRegisterPaymentsDto: BulkRegisterPaymentsDto, user: any): Promise<OrderDocument> {
    this.logger.log(`Registering payments for order ${orderId}`);
    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    for (const p of bulkRegisterPaymentsDto.payments) {
      const paymentDto: CreatePaymentDto = {
        paymentType: 'sale',
        orderId: orderId,
        amount: p.amount,
        method: p.method,
        date: p.date.toISOString(),
        currency: p.method.includes('_usd') ? 'USD' : 'VES',
        reference: p.reference,
      };
      await this.paymentsService.create(paymentDto, user);
    }

    const finalOrder = await this.findOne(orderId, user.tenantId);
    if (!finalOrder) {
        throw new NotFoundException('Error al registrar el pago, no se pudo encontrar la orden final.');
    }
    return finalOrder;
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
    orderTotal: number
  ) {
    try {
      // Actualizar contadores incrementalmente
      const updateResult = await this.customerModel.findByIdAndUpdate(
        customerId,
        {
          $inc: {
            'metrics.totalSpent': orderTotal,
            'metrics.totalOrders': 1
          },
          $set: {
            'metrics.lastOrderDate': new Date()
          }
        },
        { new: true }
      );

      if (updateResult) {
        // Recalcular tier basado en el nuevo totalSpent
        const newTier = this.calculateTierFromSpent(updateResult.metrics.totalSpent);
        
        if (updateResult.tier !== newTier) {
          await this.customerModel.findByIdAndUpdate(customerId, { tier: newTier });
          this.logger.log(`Customer ${customerId} tier updated: ${updateResult.tier} -> ${newTier}`);
        }

        this.logger.log(`Customer metrics updated: ${customerId}, totalSpent: ${updateResult.metrics.totalSpent}`);
      }

    } catch (error) {
      this.logger.error(`Failed to update customer metrics for ${customerId}:`, error);
      // No lanzar error para evitar que falle la creación de la orden
    }
  }

  private calculateTierFromSpent(totalSpent: number): string {
    if (totalSpent >= 10000) return 'diamante';
    if (totalSpent >= 5000) return 'oro';
    if (totalSpent >= 2000) return 'plata';
    if (totalSpent > 0) return 'bronce';
    return 'nuevo';
  }
}
