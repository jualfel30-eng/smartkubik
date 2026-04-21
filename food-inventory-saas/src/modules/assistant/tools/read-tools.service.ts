import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../../../schemas/customer.schema";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import {
  TransferOrder,
  TransferOrderDocument,
} from "../../../schemas/transfer-order.schema";
import { Inventory, InventoryDocument } from "../../../schemas/inventory.schema";
import { Product, ProductDocument } from "../../../schemas/product.schema";

@Injectable()
export class ReadToolsService {
  private readonly logger = new Logger(ReadToolsService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    @InjectModel(TransferOrder.name)
    private readonly transferOrderModel: Model<TransferOrderDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async getCustomers(
    tenantId: string,
    args: { search?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 10, 20);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      };

      if (args.search) {
        const regex = new RegExp(this.escapeRegExp(args.search), "i");
        filter.$or = [
          { name: regex },
          { lastName: regex },
          { companyName: regex },
          { "taxInfo.taxId": regex },
          { whatsappNumber: regex },
        ];
      }

      const customers = await this.customerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "name lastName companyName customerNumber customerType taxInfo.taxId metrics.totalOrders metrics.totalSpent status whatsappNumber",
        )
        .lean();

      if (!customers.length) {
        return {
          ok: true,
          message: args.search
            ? `No se encontraron clientes con "${args.search}".`
            : "No hay clientes registrados.",
          customers: [],
        };
      }

      const formatted = customers.map((c: any) => ({
        nombre: [c.name, c.lastName].filter(Boolean).join(" "),
        empresa: c.companyName || "—",
        numero: c.customerNumber,
        tipo: c.customerType || "regular",
        rif: c.taxInfo?.taxId || "—",
        ordenes: c.metrics?.totalOrders || 0,
        totalGastado: c.metrics?.totalSpent
          ? `$${c.metrics.totalSpent.toFixed(2)}`
          : "$0.00",
        whatsapp: c.whatsappNumber || "—",
      }));

      return { ok: true, total: customers.length, customers: formatted };
    } catch (error) {
      this.logger.error(`get_customers failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error buscando clientes: ${(error as Error).message}`,
      };
    }
  }

  async getOrdersList(
    tenantId: string,
    args: { status?: string; dateFrom?: string; dateTo?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 15, 30);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
      };

      if (args.status && args.status !== "all") {
        filter.status = args.status;
      }

      if (args.dateFrom || args.dateTo) {
        filter.createdAt = {};
        if (args.dateFrom) filter.createdAt.$gte = new Date(args.dateFrom);
        if (args.dateTo) filter.createdAt.$lte = new Date(args.dateTo);
      }

      const orders = await this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "orderNumber status totalAmount paymentMethod deliveryMethod createdAt customer.name items",
        )
        .lean();

      if (!orders.length) {
        return { ok: true, message: "No se encontraron ordenes.", orders: [] };
      }

      const formatted = orders.map((o: any) => ({
        numero: o.orderNumber,
        estado: o.status,
        total: o.totalAmount ? `$${o.totalAmount.toFixed(2)}` : "$0.00",
        cliente: o.customer?.name || "—",
        items: o.items?.length || 0,
        pago: o.paymentMethod || "—",
        entrega: o.deliveryMethod || "—",
        fecha: new Date(o.createdAt).toLocaleDateString("es-VE"),
      }));

      return { ok: true, total: orders.length, orders: formatted };
    } catch (error) {
      this.logger.error(`get_orders_list failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error buscando ordenes: ${(error as Error).message}`,
      };
    }
  }

  async getTransferOrders(
    tenantId: string,
    args: { status?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 10, 20);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      };

      if (args.status && args.status !== "all") {
        filter.status = args.status;
      }

      const transfers = await this.transferOrderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "orderNumber status type items sourceWarehouseId destinationWarehouseId createdAt",
        )
        .lean();

      if (!transfers.length) {
        return {
          ok: true,
          message: "No se encontraron ordenes de transferencia.",
          transfers: [],
        };
      }

      const formatted = transfers.map((t: any) => ({
        numero: t.orderNumber,
        estado: t.status,
        tipo: t.type,
        items: t.items?.length || 0,
        fecha: new Date(t.createdAt).toLocaleDateString("es-VE"),
      }));

      return { ok: true, total: transfers.length, transfers: formatted };
    } catch (error) {
      this.logger.error(
        `get_transfer_orders failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error buscando transferencias: ${(error as Error).message}`,
      };
    }
  }

  async getDailySummary(tenantId: string): Promise<Record<string, any>> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tenantOid = new Types.ObjectId(tenantId);

      // Run queries in parallel
      const [ordersToday, inventoryAlerts, pendingPOs] = await Promise.all([
        // Today's orders
        this.orderModel
          .find({
            tenantId: tenantOid,
            createdAt: { $gte: today },
          })
          .select("totalAmount status")
          .lean(),

        // Inventory alerts (low stock)
        this.inventoryModel
          .find({
            tenantId: tenantOid,
            availableQuantity: { $lte: 5 },
            isActive: { $ne: false },
            isDeleted: { $ne: true },
          })
          .select("productName productSku availableQuantity")
          .limit(10)
          .lean(),

        // Products count for context
        this.productModel
          .countDocuments({
            tenantId: tenantOid,
            isActive: true,
          })
          .lean(),
      ]);

      const totalSales = ordersToday.reduce(
        (sum: number, o: any) => sum + (o.totalAmount || 0),
        0,
      );

      return {
        ok: true,
        resumen: {
          fecha: today.toLocaleDateString("es-VE"),
          ventas: {
            total: `$${totalSales.toFixed(2)}`,
            ordenes: ordersToday.length,
          },
          inventario: {
            productosActivos: pendingPOs,
            alertasStockBajo: inventoryAlerts.map((i: any) => ({
              producto: i.productName || i.productSku,
              stock: i.availableQuantity,
            })),
          },
        },
      };
    } catch (error) {
      this.logger.error(
        `get_daily_summary failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error generando resumen: ${(error as Error).message}`,
      };
    }
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
