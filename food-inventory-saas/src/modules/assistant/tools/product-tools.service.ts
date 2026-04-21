import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../../../schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
} from "../../../schemas/inventory.schema";
import { ProductsService } from "../../products/products.service";

@Injectable()
export class ProductToolsService {
  private readonly logger = new Logger(ProductToolsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async createProduct(
    tenantId: string,
    args: {
      name: string;
      sku?: string;
      price: number;
      cost?: number;
      category?: string;
      unit?: string;
      brand?: string;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const createDto: any = {
        name: args.name,
        tenantId,
        variants: [
          {
            name: "Default",
            basePrice: args.price,
            costPrice: args.cost ?? 0,
          },
        ],
        category: args.category ? [args.category] : ["General"],
        unitOfMeasure: args.unit || "unidad",
        brand: args.brand || "Sin marca",
      };

      if (args.sku) {
        createDto.sku = args.sku;
      }

      const userContext = user
        ? { tenantId, _id: user._id || user }
        : { tenantId, _id: new Types.ObjectId() };

      const product = await this.productsService.create(
        createDto,
        userContext,
      );

      return {
        ok: true,
        summary: `Producto creado: ${product.name} (${product.sku}) — Precio: ${args.price}${args.cost ? `, Costo: ${args.cost}` : ""}`,
        productId: product._id.toString(),
        sku: product.sku,
        name: product.name,
      };
    } catch (error) {
      this.logger.error(`create_product failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error creando producto: ${(error as Error).message}`,
      };
    }
  }

  async getProductsList(
    tenantId: string,
    args: { search?: string; category?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 10, 20);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      };

      if (args.search) {
        const regex = new RegExp(this.escapeRegExp(args.search), "i");
        filter.$or = [
          { name: regex },
          { sku: regex },
          { brand: regex },
        ];
      }

      if (args.category) {
        filter.category = new RegExp(this.escapeRegExp(args.category), "i");
      }

      const products = await this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("name sku brand category unitOfMeasure variants isActive")
        .lean();

      if (!products.length) {
        return {
          ok: true,
          message: args.search
            ? `No se encontraron productos con "${args.search}".`
            : "No hay productos registrados.",
          products: [],
        };
      }

      // Fetch inventory for these products
      const productIds = products.map((p: any) => p._id);
      const inventories = await this.inventoryModel
        .find({
          tenantId: new Types.ObjectId(tenantId),
          productId: { $in: productIds },
          isDeleted: { $ne: true },
        })
        .select("productId totalQuantity availableQuantity averageCostPrice")
        .lean();

      const inventoryMap = new Map<string, any>();
      for (const inv of inventories) {
        const key = inv.productId?.toString();
        if (key) {
          const existing = inventoryMap.get(key);
          if (existing) {
            existing.totalQuantity += inv.totalQuantity || 0;
            existing.availableQuantity += inv.availableQuantity || 0;
          } else {
            inventoryMap.set(key, {
              totalQuantity: inv.totalQuantity || 0,
              availableQuantity: inv.availableQuantity || 0,
              averageCostPrice: inv.averageCostPrice || 0,
            });
          }
        }
      }

      const formatted = products.map((p: any) => {
        const inv = inventoryMap.get(p._id.toString());
        const defaultVariant = p.variants?.[0];
        return {
          nombre: p.name,
          sku: p.sku,
          precio: defaultVariant?.basePrice ?? 0,
          costo: defaultVariant?.costPrice ?? 0,
          stock: inv?.availableQuantity ?? 0,
          categoria: p.category?.join(", ") || "—",
          marca: p.brand || "—",
        };
      });

      return {
        ok: true,
        total: products.length,
        products: formatted,
      };
    } catch (error) {
      this.logger.error(
        `get_products_list failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error buscando productos: ${(error as Error).message}`,
      };
    }
  }

  async updateProduct(
    tenantId: string,
    args: {
      productName: string;
      newPrice?: number;
      newCost?: number;
      newName?: string;
      newCategory?: string;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const product = await this.resolveProduct(tenantId, args.productName);
      if (!product) {
        return {
          ok: false,
          message: `No se encontro el producto "${args.productName}".`,
        };
      }

      const updateDto: any = {};
      const changes: string[] = [];

      if (args.newName) {
        updateDto.name = args.newName;
        changes.push(`nombre: "${args.newName}"`);
      }

      if (args.newCategory) {
        updateDto.category = [args.newCategory];
        changes.push(`categoria: "${args.newCategory}"`);
      }

      // Update variant pricing
      if (args.newPrice !== undefined || args.newCost !== undefined) {
        const variants = (product as any).variants || [];
        if (variants.length > 0) {
          const updatedVariants = variants.map((v: any, index: number) => {
            if (index === 0) {
              const updated = { ...v };
              if (args.newPrice !== undefined) {
                updated.basePrice = args.newPrice;
                changes.push(`precio: ${args.newPrice}`);
              }
              if (args.newCost !== undefined) {
                updated.costPrice = args.newCost;
                changes.push(`costo: ${args.newCost}`);
              }
              return updated;
            }
            return v;
          });
          updateDto.variants = updatedVariants;
        }
      }

      if (Object.keys(updateDto).length === 0) {
        return {
          ok: false,
          message: "No se proporcionaron cambios para actualizar.",
        };
      }

      const userContext = user
        ? { tenantId, _id: user._id || user }
        : { tenantId, _id: new Types.ObjectId() };

      await this.productsService.update(
        product._id.toString(),
        updateDto,
        userContext,
      );

      return {
        ok: true,
        summary: `Producto "${product.name}" actualizado: ${changes.join(", ")}`,
      };
    } catch (error) {
      this.logger.error(`update_product failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error actualizando producto: ${(error as Error).message}`,
      };
    }
  }

  async getProductDetails(
    tenantId: string,
    args: { productName: string },
  ): Promise<Record<string, any>> {
    try {
      const product = await this.resolveProduct(tenantId, args.productName);
      if (!product) {
        return {
          ok: false,
          message: `No se encontro el producto "${args.productName}".`,
        };
      }

      // Get inventory info
      const inventory = await this.inventoryModel
        .find({
          tenantId: new Types.ObjectId(tenantId),
          productId: {
            $in: [
              product._id,
              new Types.ObjectId(product._id.toString()),
              product._id.toString(),
            ],
          },
          isDeleted: { $ne: true },
        })
        .lean();

      const totalStock = inventory.reduce(
        (sum, inv) => sum + (inv.availableQuantity || 0),
        0,
      );
      const avgCost = inventory.length
        ? inventory.reduce(
            (sum, inv) => sum + (inv.averageCostPrice || 0),
            0,
          ) / inventory.length
        : 0;

      const p = product as any;
      const defaultVariant = p.variants?.[0];

      return {
        ok: true,
        product: {
          nombre: p.name,
          sku: p.sku,
          marca: p.brand || "—",
          categorias: p.category?.join(", ") || "—",
          unidad: p.unitOfMeasure || "unidad",
          activo: p.isActive,
          variantes: p.variants?.map((v: any) => ({
            nombre: v.name,
            sku: v.sku,
            precio: v.basePrice,
            costo: v.costPrice,
            activo: v.isActive,
          })),
          precioBase: defaultVariant?.basePrice ?? 0,
          costoBase: defaultVariant?.costPrice ?? 0,
          inventario: {
            stockDisponible: totalStock,
            costoPromedio: Math.round(avgCost * 100) / 100,
            almacenes: inventory.map((inv: any) => ({
              warehouseId: inv.warehouseId?.toString() || "—",
              cantidad: inv.availableQuantity || 0,
              costoPromedio: inv.averageCostPrice || 0,
            })),
          },
          proveedores: p.suppliers?.map((s: any) => ({
            nombre: s.supplierName,
            sku: s.supplierSku,
            costo: s.costPrice,
            tiempoEntrega: s.leadTimeDays,
            preferido: s.isPreferred,
          })) || [],
          perecedero: p.isPerishable,
          vidaUtil: p.shelfLifeDays
            ? `${p.shelfLifeDays} ${p.shelfLifeUnit || "dias"}`
            : "—",
          iva: p.ivaRate != null ? `${p.ivaRate}%` : "—",
        },
      };
    } catch (error) {
      this.logger.error(
        `get_product_details failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error: ${(error as Error).message}`,
      };
    }
  }

  // --- Helpers ---------------------------------------------------------------
  private async resolveProduct(
    tenantId: string,
    nameOrSku: string,
  ): Promise<ProductDocument | null> {
    // Try ObjectId first
    if (Types.ObjectId.isValid(nameOrSku)) {
      const byId = await this.productModel
        .findOne({
          _id: new Types.ObjectId(nameOrSku),
          tenantId: new Types.ObjectId(tenantId),
        })
        .lean();
      if (byId) return byId as any;
    }

    // Try exact SKU match
    const bySku = await this.productModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        sku: nameOrSku,
        isActive: true,
      })
      .lean();
    if (bySku) return bySku as any;

    // Fuzzy name match
    return this.productModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(this.escapeRegExp(nameOrSku), "i"),
        isActive: true,
      })
      .lean() as any;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
