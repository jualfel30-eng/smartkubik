import {
  Injectable,
  Logger,
  NotFoundException,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CustomerTransactionHistory,
  CustomerTransactionHistoryDocument,
} from "../schemas/customer-transaction-history.schema";
import {
  SupplierTransactionHistory,
  SupplierTransactionHistoryDocument,
} from "../schemas/supplier-transaction-history.schema";
import { Order, OrderDocument } from "../schemas/order.schema";
import { Customer, CustomerDocument } from "../schemas/customer.schema";
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from "../schemas/purchase-order.schema";
import { ProductAffinityService } from "./product-affinity.service";

@Injectable()
export class TransactionHistoryService {
  private readonly logger = new Logger(TransactionHistoryService.name);

  constructor(
    @InjectModel(CustomerTransactionHistory.name)
    private customerTransactionModel: Model<CustomerTransactionHistoryDocument>,
    @InjectModel(SupplierTransactionHistory.name)
    private supplierTransactionModel: Model<SupplierTransactionHistoryDocument>,
    @InjectModel(Order.name)
    private orderModel: Model<OrderDocument>,
    @InjectModel(Customer.name)
    private customerModel: Model<CustomerDocument>,
    @InjectModel(PurchaseOrder.name)
    private purchaseOrderModel: Model<PurchaseOrderDocument>,
    @Inject(forwardRef(() => ProductAffinityService))
    private productAffinityService: ProductAffinityService,
  ) {}

  /**
   * Record a customer transaction from an order
   */
  async recordCustomerTransaction(
    orderId: string,
    tenantId: string,
  ): Promise<CustomerTransactionHistory | null> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .populate("items.productId");

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (!order.customerId) {
      this.logger.warn(
        `Order ${orderId} has no customer, skipping transaction record`,
      );
      return null;
    }

    // Check if transaction already exists
    const existing = await this.customerTransactionModel.findOne({
      orderId: order._id,
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existing) {
      this.logger.debug(`Transaction already exists for order ${orderId}`);
      return existing;
    }

    // Helper: Convert category to string (handle arrays)
    const getCategoryString = (category: any): string | undefined => {
      if (!category) return undefined;
      if (Array.isArray(category)) {
        return category.length > 0 ? String(category[0]) : undefined;
      }
      return String(category);
    };

    // Extract product items from order
    const items = order.items.map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      productCode: item.productSku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      category: getCategoryString(item.productId?.category),
      brand: item.productId?.brand,
      unit: item.selectedUnit,
      discount: item.discountAmount || 0,
      tax: 0,
    }));

    // Extract unique categories and product IDs
    const productCategories = [
      ...new Set(items.map((i) => i.category).filter(Boolean)),
    ];
    const productIds = items.map((i) => i.productId);

    // Determine payment method from payment records
    const primaryPaymentMethod =
      order.paymentRecords && order.paymentRecords.length > 0
        ? order.paymentRecords[0].method
        : "pending";

    // Create transaction record
    const transaction = await this.customerTransactionModel.create({
      customerId: order.customerId,
      orderId: order._id,
      orderNumber: order.orderNumber,
      orderDate: order.createdAt || new Date(),
      totalAmount: order.totalAmount,
      currency: "USD",
      subtotal: order.subtotal || 0,
      tax: order.ivaTotal || 0,
      discount: order.discountAmount || 0,
      status: order.status,
      paymentMethod: primaryPaymentMethod,
      isPaid: order.paymentStatus === "paid",
      items,
      productCategories,
      productIds,
      deliveryAddress: order.shipping?.address?.street,
      notes: order.shipping?.notes,
      tenantId: new Types.ObjectId(tenantId),
      metadata: {
        channel: order.channel,
        source: order.channel,
      },
    });

    this.logger.log(
      `Recorded transaction for order ${orderId}, customer ${order.customerId}`,
    );

    // Update product affinity matrix (async, non-blocking)
    try {
      await this.productAffinityService.updateAffinityFromTransaction(
        transaction._id.toString(),
        tenantId,
      );
      this.logger.log(
        `Product affinity matrix updated for transaction ${transaction._id}`,
      );
    } catch (affinityError) {
      this.logger.error(
        `Error updating affinity matrix for transaction ${transaction._id}:`,
        affinityError.stack,
      );
      // Don't throw - affinity update failure shouldn't block transaction creation
    }

    return transaction;
  }

  /**
   * Record a supplier transaction from a purchase order
   */
  async recordSupplierTransaction(
    purchaseOrderId: string,
    tenantId: string,
  ): Promise<SupplierTransactionHistory | null> {
    const purchaseOrder = await this.purchaseOrderModel
      .findOne({
        _id: new Types.ObjectId(purchaseOrderId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!purchaseOrder) {
      throw new NotFoundException("Purchase order not found");
    }

    if (!purchaseOrder.supplierId) {
      this.logger.warn(
        `Purchase order ${purchaseOrderId} has no supplier, skipping transaction record`,
      );
      return null;
    }

    // Check if transaction already exists
    const existing = await this.supplierTransactionModel.findOne({
      purchaseOrderId: purchaseOrder._id,
      tenantId: tenantId, // Keep as string
    });

    if (existing) {
      this.logger.debug(
        `Transaction already exists for purchase order ${purchaseOrderId}`,
      );
      return existing;
    }

    // Helper: Convert category to string (handle arrays)
    const getCategoryString = (category: any): string | undefined => {
      if (!category) return undefined;
      if (Array.isArray(category)) {
        return category.length > 0 ? String(category[0]) : undefined;
      }
      return String(category);
    };

    // Extract product items from purchase order
    const items = await Promise.all(
      purchaseOrder.items.map(async (item: any) => {
        // Populate product details if needed
        let productData: any = null;
        try {
          productData = await this.orderModel.db
            .collection("products")
            .findOne({ _id: item.productId });
        } catch (error) {
          this.logger.warn(
            `Could not populate product ${item.productId} for PO ${purchaseOrderId}`,
          );
        }

        return {
          productId: item.productId,
          productName: item.productName,
          productCode: item.productSku,
          quantity: item.quantity,
          unitCost: item.costPrice,
          totalCost: item.totalCost,
          category: getCategoryString(productData?.category),
          brand: productData?.brand,
          unit: item.selectedUnit,
          discount: 0,
          tax: 0,
        };
      }),
    );

    // Extract unique categories and product IDs
    const productCategories = [
      ...new Set(items.map((i) => i.category).filter(Boolean)),
    ];
    const productIds = items.map((i) => i.productId);

    // Determine payment method from payment terms
    const paymentMethod =
      purchaseOrder.paymentTerms?.paymentMethods?.[0] || "pending";

    // Determine if paid (only if status is 'completed' or explicitly marked)
    const isPaid =
      purchaseOrder.status === "completed" ||
      purchaseOrder.status === "received";

    // Create transaction record
    const transaction = await this.supplierTransactionModel.create({
      supplierId: purchaseOrder.supplierId,
      purchaseOrderId: purchaseOrder._id,
      purchaseOrderNumber: purchaseOrder.poNumber,
      orderDate: purchaseOrder.purchaseDate,
      deliveryDate: purchaseOrder.expectedDeliveryDate,
      totalAmount: purchaseOrder.totalAmount,
      currency: "USD",
      subtotal: purchaseOrder.totalAmount, // PO doesn't have separate subtotal
      tax: 0,
      discount: 0,
      status: purchaseOrder.status,
      paymentMethod: paymentMethod,
      isPaid: isPaid,
      paymentDueDate: purchaseOrder.paymentTerms?.paymentDueDate,
      items,
      productCategories,
      productIds,
      notes: purchaseOrder.notes,
      tenantId: tenantId, // Keep as string
      metadata: {
        requestedBy: purchaseOrder.createdBy?.toString(),
        approvedBy: purchaseOrder.approvedBy?.toString(),
      },
    });

    this.logger.log(
      `Recorded supplier transaction for PO ${purchaseOrderId}, supplier ${purchaseOrder.supplierId}`,
    );

    return transaction;
  }

  /**
   * Get customer transaction history
   */
  async getCustomerTransactionHistory(
    customerId: string,
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      minAmount?: number;
      maxAmount?: number;
      productId?: string;
      category?: string;
    },
  ): Promise<CustomerTransactionHistory[]> {
    const query: any = {
      customerId: new Types.ObjectId(customerId),
      tenantId: tenantId, // Keep as string - it's stored as string in DB
    };

    if (filters?.startDate || filters?.endDate) {
      query.orderDate = {};
      if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      query.totalAmount = {};
      if (filters.minAmount !== undefined)
        query.totalAmount.$gte = filters.minAmount;
      if (filters.maxAmount !== undefined)
        query.totalAmount.$lte = filters.maxAmount;
    }

    if (filters?.productId) {
      query.productIds = new Types.ObjectId(filters.productId);
    }

    if (filters?.category) {
      query.productCategories = filters.category;
    }

    const transactions = await this.customerTransactionModel
      .find(query)
      .sort({ orderDate: -1 })
      .lean();

    return transactions;
  }

  /**
   * Get supplier transaction history
   */
  async getSupplierTransactionHistory(
    supplierId: string,
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      status?: string;
      minAmount?: number;
      maxAmount?: number;
      productId?: string;
    },
  ): Promise<SupplierTransactionHistory[]> {
    const query: any = {
      supplierId: new Types.ObjectId(supplierId),
      tenantId: new Types.ObjectId(tenantId),
    };

    if (filters?.startDate || filters?.endDate) {
      query.orderDate = {};
      if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.minAmount !== undefined || filters?.maxAmount !== undefined) {
      query.totalAmount = {};
      if (filters.minAmount !== undefined)
        query.totalAmount.$gte = filters.minAmount;
      if (filters.maxAmount !== undefined)
        query.totalAmount.$lte = filters.maxAmount;
    }

    if (filters?.productId) {
      query.productIds = new Types.ObjectId(filters.productId);
    }

    const transactions = await this.supplierTransactionModel
      .find(query)
      .sort({ orderDate: -1 })
      .lean();

    return transactions;
  }

  /**
   * Get customer's purchase history for a specific product
   */
  async getCustomerProductHistory(
    customerId: string,
    productId: string,
    tenantId: string,
  ): Promise<any> {
    const transactions = await this.customerTransactionModel
      .find({
        customerId: new Types.ObjectId(customerId),
        productIds: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        status: "completed",
      })
      .sort({ orderDate: -1 })
      .lean();

    if (transactions.length === 0) {
      return {
        hasPurchased: false,
        purchaseCount: 0,
        totalQuantity: 0,
        totalSpent: 0,
        lastPurchaseDate: null,
        firstPurchaseDate: null,
        averageQuantity: 0,
        transactions: [],
      };
    }

    let totalQuantity = 0;
    let totalSpent = 0;

    const productTransactions = transactions.map((t) => {
      const productItem = t.items.find(
        (item) => item.productId.toString() === productId,
      );

      if (productItem) {
        totalQuantity += productItem.quantity;
        totalSpent += productItem.totalPrice;
      }

      return {
        orderDate: t.orderDate,
        orderNumber: t.orderNumber,
        quantity: productItem?.quantity || 0,
        unitPrice: productItem?.unitPrice || 0,
        totalPrice: productItem?.totalPrice || 0,
      };
    });

    return {
      hasPurchased: true,
      purchaseCount: transactions.length,
      totalQuantity,
      totalSpent,
      lastPurchaseDate: transactions[0].orderDate,
      firstPurchaseDate: transactions[transactions.length - 1].orderDate,
      averageQuantity: totalQuantity / transactions.length,
      transactions: productTransactions,
    };
  }

  /**
   * Get all customers who purchased a specific product
   */
  async getCustomersWhoPurchasedProduct(
    productId: string,
    tenantId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      minPurchaseCount?: number;
      minTotalSpent?: number;
    },
  ): Promise<any[]> {
    const query: any = {
      productIds: new Types.ObjectId(productId),
      tenantId: new Types.ObjectId(tenantId),
      status: "completed",
    };

    if (filters?.startDate || filters?.endDate) {
      query.orderDate = {};
      if (filters.startDate) query.orderDate.$gte = new Date(filters.startDate);
      if (filters.endDate) query.orderDate.$lte = new Date(filters.endDate);
    }

    const transactions = await this.customerTransactionModel.aggregate([
      { $match: query },
      { $unwind: "$items" },
      {
        $match: {
          "items.productId": new Types.ObjectId(productId),
        },
      },
      {
        $group: {
          _id: "$customerId",
          purchaseCount: { $sum: 1 },
          totalQuantity: { $sum: "$items.quantity" },
          totalSpent: { $sum: "$items.totalPrice" },
          lastPurchaseDate: { $max: "$orderDate" },
          firstPurchaseDate: { $min: "$orderDate" },
          averageUnitPrice: { $avg: "$items.unitPrice" },
        },
      },
      {
        $match: {
          ...(filters?.minPurchaseCount && {
            purchaseCount: { $gte: filters.minPurchaseCount },
          }),
          ...(filters?.minTotalSpent && {
            totalSpent: { $gte: filters.minTotalSpent },
          }),
        },
      },
      { $sort: { totalSpent: -1 } },
    ]);

    // Populate customer info
    const customerIds = transactions.map((t) => t._id);
    const customers = await this.customerModel
      .find({ _id: { $in: customerIds } })
      .select("name email phone tier")
      .lean();

    const customerMap = new Map(customers.map((c) => [c._id.toString(), c]));

    return transactions.map((t) => ({
      customer: customerMap.get(t._id.toString()),
      purchaseCount: t.purchaseCount,
      totalQuantity: t.totalQuantity,
      totalSpent: t.totalSpent,
      lastPurchaseDate: t.lastPurchaseDate,
      firstPurchaseDate: t.firstPurchaseDate,
      averageUnitPrice: t.averageUnitPrice,
      averageQuantityPerOrder: t.totalQuantity / t.purchaseCount,
    }));
  }

  /**
   * Get customer's purchase frequency for a product (days between purchases)
   */
  async getCustomerPurchaseFrequency(
    customerId: string,
    productId: string,
    tenantId: string,
  ): Promise<number> {
    const transactions = await this.customerTransactionModel
      .find({
        customerId: new Types.ObjectId(customerId),
        productIds: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        status: "completed",
      })
      .sort({ orderDate: 1 })
      .select("orderDate")
      .lean();

    if (transactions.length < 2) {
      return 0; // Not enough data
    }

    let totalDays = 0;
    for (let i = 1; i < transactions.length; i++) {
      const daysDiff =
        (transactions[i].orderDate.getTime() -
          transactions[i - 1].orderDate.getTime()) /
        (1000 * 60 * 60 * 24);
      totalDays += daysDiff;
    }

    return Math.round(totalDays / (transactions.length - 1));
  }

  /**
   * Get customer's average order value
   */
  async getAverageOrderValue(
    customerId: string,
    tenantId: string,
  ): Promise<number> {
    const result = await this.customerTransactionModel.aggregate([
      {
        $match: {
          customerId: new Types.ObjectId(customerId),
          tenantId: tenantId, // Keep as string
          isPaid: true, // Only count paid transactions
        },
      },
      {
        $group: {
          _id: null,
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]);

    return result[0]?.avgOrderValue || 0;
  }

  /**
   * Get customer's top purchased products
   */
  async getTopProductsByCustomer(
    customerId: string,
    tenantId: string,
    limit: number = 10,
  ): Promise<any[]> {
    const topProducts = await this.customerTransactionModel.aggregate([
      {
        $match: {
          customerId: new Types.ObjectId(customerId),
          tenantId: tenantId, // Keep as string
          isPaid: true, // Only count paid transactions
        },
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.productId",
          productName: { $first: "$items.productName" },
          category: { $first: "$items.category" },
          purchaseCount: { $sum: 1 },
          totalQuantity: { $sum: "$items.quantity" },
          totalSpent: { $sum: "$items.totalPrice" },
          averageUnitPrice: { $avg: "$items.unitPrice" },
          lastPurchaseDate: { $max: "$orderDate" },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: limit },
    ]);

    return topProducts;
  }

  /**
   * Get transaction statistics for a customer
   */
  async getCustomerTransactionStats(
    customerId: string,
    tenantId: string,
  ): Promise<any> {
    const stats = await this.customerTransactionModel.aggregate([
      {
        $match: {
          customerId: new Types.ObjectId(customerId),
          tenantId: tenantId, // Keep as string
          isPaid: true, // Only count paid transactions
        },
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalSpent: { $sum: "$totalAmount" },
          averageOrderValue: { $avg: "$totalAmount" },
          lastPurchaseDate: { $max: "$orderDate" },
          firstPurchaseDate: { $min: "$orderDate" },
        },
      },
    ]);

    return (
      stats[0] || {
        totalTransactions: 0,
        totalSpent: 0,
        averageOrderValue: 0,
        lastPurchaseDate: null,
        firstPurchaseDate: null,
      }
    );
  }
}
