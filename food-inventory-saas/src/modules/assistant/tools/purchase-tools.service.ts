import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Supplier,
  SupplierDocument,
} from "../../../schemas/supplier.schema";
import { Product, ProductDocument } from "../../../schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
} from "../../../schemas/inventory.schema";
import {
  PurchaseOrder,
  PurchaseOrderDocument,
} from "../../../schemas/purchase-order.schema";
import { Order, OrderDocument } from "../../../schemas/order.schema";
import { PurchasesService } from "../../purchases/purchases.service";

@Injectable()
export class PurchaseToolsService {
  private readonly logger = new Logger(PurchaseToolsService.name);

  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(PurchaseOrder.name)
    private readonly purchaseOrderModel: Model<PurchaseOrderDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
    private readonly purchasesService: PurchasesService,
  ) {}

  // ─── 1. Create Purchase Order ─────────────────────────────────────
  async createPurchaseOrder(
    tenantId: string,
    args: {
      supplierName: string;
      items: Array<{
        productName: string;
        quantity: number;
        costPrice?: number;
      }>;
      notes?: string;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      // Resolve supplier
      const supplier = await this.resolveSupplier(tenantId, args.supplierName);
      if (!supplier) {
        return {
          ok: false,
          message: `No se encontro el proveedor "${args.supplierName}". Verifica el nombre e intenta de nuevo.`,
        };
      }

      // Resolve each product item
      const resolvedItems: Array<{
        productId: string;
        productName: string;
        productSku: string;
        quantity: number;
        costPrice: number;
      }> = [];

      for (const item of args.items) {
        const product = await this.resolveProduct(tenantId, item.productName);
        if (!product) {
          return {
            ok: false,
            message: `No se encontro el producto "${item.productName}". Verifica el nombre.`,
          };
        }

        const costPrice =
          item.costPrice ??
          product.variants?.[0]?.costPrice ??
          0;

        resolvedItems.push({
          productId: (product._id as Types.ObjectId).toString(),
          productName: product.name,
          productSku: product.sku,
          quantity: item.quantity,
          costPrice,
        });
      }

      // Build DTO for PurchasesService.create()
      const subtotal = resolvedItems.reduce(
        (sum, i) => sum + i.quantity * i.costPrice,
        0,
      );

      const dto: any = {
        supplierId: (supplier._id as Types.ObjectId).toString(),
        purchaseDate: new Date().toISOString(),
        items: resolvedItems.map((i) => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku,
          quantity: i.quantity,
          costPrice: i.costPrice,
        })),
        subtotal,
        totalAmount: subtotal,
        ivaTotal: 0,
        igtfTotal: 0,
        notes: args.notes || "Creada por asistente IA",
        paymentTerms: {
          isCredit: false,
          creditDays: 0,
          paymentMethods: ["efectivo"],
          expectedCurrency: "USD",
          requiresAdvancePayment: false,
        },
      };

      const userContext = user
        ? { tenantId, _id: user._id || user }
        : { tenantId, _id: new Types.ObjectId() };

      const po = await this.purchasesService.create(dto, userContext);

      return {
        ok: true,
        summary: `Orden de compra creada: ${po.poNumber} — Proveedor: ${po.supplierName}, ${resolvedItems.length} producto(s), Total: $${po.totalAmount.toFixed(2)}`,
        poNumber: po.poNumber,
        totalAmount: po.totalAmount,
        itemCount: resolvedItems.length,
      };
    } catch (error) {
      this.logger.error(
        `createPurchaseOrder failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error creando orden de compra: ${(error as Error).message}`,
      };
    }
  }

  // ─── 2. Get Purchase Orders ───────────────────────────────────────
  async getPurchaseOrders(
    tenantId: string,
    args: { status?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 10, 25);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
      };

      if (args.status) {
        filter.status = args.status;
      }

      const orders = await this.purchaseOrderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select(
          "poNumber supplierName purchaseDate status subtotal totalAmount items",
        )
        .lean();

      if (!orders.length) {
        return {
          ok: true,
          message: args.status
            ? `No hay ordenes de compra con estado "${args.status}".`
            : "No hay ordenes de compra registradas.",
          orders: [],
        };
      }

      const formatted = orders.map((po: any) => ({
        poNumber: po.poNumber,
        proveedor: po.supplierName,
        fecha: new Date(po.purchaseDate).toLocaleDateString("es-VE"),
        estado: po.status,
        items: po.items?.length || 0,
        total: `$${(po.totalAmount || 0).toFixed(2)}`,
      }));

      return {
        ok: true,
        total: orders.length,
        orders: formatted,
      };
    } catch (error) {
      this.logger.error(
        `getPurchaseOrders failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error consultando ordenes de compra: ${(error as Error).message}`,
      };
    }
  }

  // ─── 3. Generate Purchase Proposal (Intelligence) ─────────────────
  async generatePurchaseProposal(
    tenantId: string,
  ): Promise<Record<string, any>> {
    try {
      const tid = new Types.ObjectId(tenantId);

      // 1. Get all products with inventory
      const inventories = await this.inventoryModel
        .find({ tenantId: tid, isActive: true })
        .select(
          "productId productName productSku availableQuantity averageCostPrice",
        )
        .lean();

      if (!inventories.length) {
        return {
          ok: true,
          message:
            "No hay inventario registrado. Primero debes recibir productos.",
          proposals: [],
        };
      }

      // 2. Calculate daily consumption from orders in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentOrders = await this.orderModel
        .find({
          tenantId,
          createdAt: { $gte: thirtyDaysAgo },
          status: { $nin: ["cancelled", "draft"] },
        })
        .select("items.productId items.quantity")
        .lean();

      // Accumulate total consumed per productId
      const consumptionMap = new Map<
        string,
        { totalQty: number; orderCount: number }
      >();

      for (const order of recentOrders) {
        for (const item of (order as any).items || []) {
          const pid = item.productId?.toString();
          if (!pid) continue;
          const existing = consumptionMap.get(pid) || {
            totalQty: 0,
            orderCount: 0,
          };
          existing.totalQty += item.quantity || 0;
          existing.orderCount += 1;
          consumptionMap.set(pid, existing);
        }
      }

      // 3. Calculate days-until-stockout & filter products at risk
      const atRiskProducts: Array<{
        productId: string;
        productName: string;
        productSku: string;
        availableQuantity: number;
        dailyConsumption: number;
        daysUntilStockout: number;
        averageCostPrice: number;
      }> = [];

      for (const inv of inventories) {
        const pid = (inv as any).productId?.toString();
        const consumption = consumptionMap.get(pid);
        const dailyConsumption = consumption
          ? consumption.totalQty / 30
          : 0;

        const daysUntilStockout =
          dailyConsumption > 0
            ? (inv as any).availableQuantity / dailyConsumption
            : Infinity;

        // Include if stockout < 14 days or already out of stock
        if (daysUntilStockout < 14 || (inv as any).availableQuantity <= 0) {
          atRiskProducts.push({
            productId: pid,
            productName: (inv as any).productName,
            productSku: (inv as any).productSku,
            availableQuantity: (inv as any).availableQuantity,
            dailyConsumption: Math.round(dailyConsumption * 100) / 100,
            daysUntilStockout:
              daysUntilStockout === Infinity
                ? -1
                : Math.round(daysUntilStockout),
            averageCostPrice: (inv as any).averageCostPrice || 0,
          });
        }
      }

      if (!atRiskProducts.length) {
        return {
          ok: true,
          message:
            "Todos los productos tienen stock suficiente para al menos 14 dias. No se requiere reposicion urgente.",
          proposals: [],
        };
      }

      // 4. Get product supplier mappings for at-risk products
      const productIds = atRiskProducts.map(
        (p) => new Types.ObjectId(p.productId),
      );
      const products = await this.productModel
        .find({
          _id: { $in: productIds },
          tenantId: tid,
        })
        .select("_id name suppliers")
        .lean();

      const productSupplierMap = new Map<
        string,
        { supplierId: string; supplierName: string }
      >();
      for (const prod of products) {
        const preferred = (prod as any).suppliers?.find(
          (s: any) => s.isPreferred,
        );
        if (preferred) {
          productSupplierMap.set((prod._id as Types.ObjectId).toString(), {
            supplierId: preferred.supplierId?.toString(),
            supplierName: preferred.supplierName,
          });
        }
      }

      // 5. Group at-risk products by preferred supplier
      const supplierGroups = new Map<
        string,
        {
          supplierName: string;
          items: Array<{
            productName: string;
            currentStock: number;
            dailyConsumption: number;
            suggestedQuantity: number;
            estimatedCost: number;
          }>;
        }
      >();

      for (const risk of atRiskProducts) {
        const supplierInfo = productSupplierMap.get(risk.productId);
        const supplierKey = supplierInfo?.supplierId || "sin_proveedor";
        const supplierName =
          supplierInfo?.supplierName || "Sin proveedor asignado";

        if (!supplierGroups.has(supplierKey)) {
          supplierGroups.set(supplierKey, {
            supplierName,
            items: [],
          });
        }

        // Suggest enough for 30 days minus current stock
        const neededFor30Days = risk.dailyConsumption * 30;
        const suggestedQuantity = Math.max(
          Math.ceil(neededFor30Days - risk.availableQuantity),
          1,
        );
        const estimatedCost = suggestedQuantity * risk.averageCostPrice;

        supplierGroups.get(supplierKey)!.items.push({
          productName: risk.productName,
          currentStock: risk.availableQuantity,
          dailyConsumption: risk.dailyConsumption,
          suggestedQuantity,
          estimatedCost: Math.round(estimatedCost * 100) / 100,
        });
      }

      // 6. Format result
      const proposals = Array.from(supplierGroups.entries()).map(
        ([, group]) => ({
          supplierName: group.supplierName,
          items: group.items,
          estimatedTotal: Math.round(
            group.items.reduce((sum, i) => sum + i.estimatedCost, 0) * 100,
          ) / 100,
        }),
      );

      const grandTotal = proposals.reduce(
        (sum, p) => sum + p.estimatedTotal,
        0,
      );

      return {
        ok: true,
        summary: `Propuesta de compra: ${atRiskProducts.length} producto(s) en riesgo de desabastecimiento, agrupados en ${proposals.length} proveedor(es). Costo estimado total: $${grandTotal.toFixed(2)}`,
        productosEnRiesgo: atRiskProducts.length,
        proposals,
        grandTotal: Math.round(grandTotal * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `generatePurchaseProposal failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error generando propuesta de compra: ${(error as Error).message}`,
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  private async resolveSupplier(
    tenantId: string,
    nameOrId: string,
  ): Promise<SupplierDocument | null> {
    if (Types.ObjectId.isValid(nameOrId)) {
      const byId = await this.supplierModel
        .findOne({
          _id: new Types.ObjectId(nameOrId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: { $ne: true },
        })
        .lean();
      if (byId) return byId as any;
    }

    // Fuzzy name match: try exact first, then partial
    const escaped = this.escapeRegExp(nameOrId);
    const exact = await this.supplierModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(`^${escaped}$`, "i"),
        isDeleted: { $ne: true },
      })
      .lean();
    if (exact) return exact as any;

    return this.supplierModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(escaped, "i"),
        isDeleted: { $ne: true },
      })
      .lean() as any;
  }

  private async resolveProduct(
    tenantId: string,
    nameOrId: string,
  ): Promise<ProductDocument | null> {
    if (Types.ObjectId.isValid(nameOrId)) {
      const byId = await this.productModel
        .findOne({
          _id: new Types.ObjectId(nameOrId),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: { $ne: true },
        })
        .lean();
      if (byId) return byId as any;
    }

    // Fuzzy name match: exact first, then partial
    const escaped = this.escapeRegExp(nameOrId);
    const exact = await this.productModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(`^${escaped}$`, "i"),
        isDeleted: { $ne: true },
      })
      .lean();
    if (exact) return exact as any;

    return this.productModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(escaped, "i"),
        isDeleted: { $ne: true },
      })
      .lean() as any;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
