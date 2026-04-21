import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "../../../schemas/product.schema";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../../schemas/bill-of-materials.schema";

@Injectable()
export class RecipeToolsService {
  private readonly logger = new Logger(RecipeToolsService.name);

  constructor(
    @InjectModel(BillOfMaterials.name)
    private readonly bomModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  // ─── 1. Create Recipe ─────────────────────────────────────────────
  async createRecipe(
    tenantId: string,
    args: {
      productName: string;
      name?: string;
      components: Array<{
        ingredientName: string;
        quantity: number;
        unit?: string;
      }>;
      yield?: number;
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const tid = new Types.ObjectId(tenantId);

      // Resolve the output product
      const outputProduct = await this.resolveProduct(
        tenantId,
        args.productName,
      );
      if (!outputProduct) {
        return {
          ok: false,
          message: `No se encontro el producto "${args.productName}". Verifica el nombre.`,
        };
      }

      // Resolve each ingredient/component
      const resolvedComponents: Array<{
        componentProductId: Types.ObjectId;
        quantity: number;
        unit: string;
        scrapPercentage: number;
      }> = [];

      for (const comp of args.components) {
        const ingredient = await this.resolveProduct(
          tenantId,
          comp.ingredientName,
        );
        if (!ingredient) {
          return {
            ok: false,
            message: `No se encontro el ingrediente "${comp.ingredientName}". Verifica el nombre.`,
          };
        }

        resolvedComponents.push({
          componentProductId: ingredient._id as Types.ObjectId,
          quantity: comp.quantity,
          unit: comp.unit || ingredient.variants?.[0]?.unit || "und",
          scrapPercentage: 0,
        });
      }

      // Generate BOM code
      const bomCount = await this.bomModel.countDocuments({ tenantId: tid });
      const code = `BOM-${String(bomCount + 1).padStart(3, "0")}`;

      const recipeName =
        args.name || `Receta: ${outputProduct.name}`;

      const bomData: any = {
        productId: outputProduct._id,
        code,
        name: recipeName,
        productionQuantity: args.yield || 1,
        productionUnit: outputProduct.variants?.[0]?.unit || "und",
        components: resolvedComponents,
        byproducts: [],
        bomType: "production",
        isActive: true,
        tenantId: tid,
        createdBy: user?._id
          ? new Types.ObjectId(user._id)
          : undefined,
      };

      const bom = await this.bomModel.create(bomData);

      return {
        ok: true,
        summary: `Receta creada: "${recipeName}" (${code}) — Producto: ${outputProduct.name}, ${resolvedComponents.length} ingrediente(s), Rinde: ${args.yield || 1}`,
        bomId: (bom._id as Types.ObjectId).toString(),
        code,
        name: recipeName,
        componentCount: resolvedComponents.length,
      };
    } catch (error) {
      this.logger.error(`createRecipe failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error creando receta: ${(error as Error).message}`,
      };
    }
  }

  // ─── 2. Get Recipes ───────────────────────────────────────────────
  async getRecipes(
    tenantId: string,
    args: { search?: string; limit?: number },
  ): Promise<Record<string, any>> {
    try {
      const limit = Math.min(args.limit || 10, 25);
      const filter: any = {
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      };

      if (args.search) {
        const regex = new RegExp(this.escapeRegExp(args.search), "i");
        filter.$or = [{ name: regex }, { code: regex }];
      }

      const recipes = await this.bomModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("code name productId components productionQuantity productionUnit")
        .lean();

      if (!recipes.length) {
        return {
          ok: true,
          message: args.search
            ? `No se encontraron recetas con "${args.search}".`
            : "No hay recetas registradas.",
          recipes: [],
        };
      }

      // Resolve product names for each recipe
      const productIds = recipes
        .map((r: any) => r.productId)
        .filter(Boolean);
      const products = await this.productModel
        .find({ _id: { $in: productIds } })
        .select("_id name")
        .lean();
      const productNameMap = new Map<string, string>();
      for (const p of products) {
        productNameMap.set(
          (p._id as Types.ObjectId).toString(),
          (p as any).name,
        );
      }

      // Estimate cost per recipe (sum component costs)
      const allComponentIds = new Set<string>();
      for (const recipe of recipes) {
        for (const comp of (recipe as any).components || []) {
          if (comp.componentProductId) {
            allComponentIds.add(comp.componentProductId.toString());
          }
        }
      }

      const componentProducts = await this.productModel
        .find({
          _id: {
            $in: Array.from(allComponentIds).map(
              (id) => new Types.ObjectId(id),
            ),
          },
        })
        .select("_id variants.costPrice")
        .lean();

      const costMap = new Map<string, number>();
      for (const cp of componentProducts) {
        costMap.set(
          (cp._id as Types.ObjectId).toString(),
          (cp as any).variants?.[0]?.costPrice || 0,
        );
      }

      const formatted = recipes.map((r: any) => {
        const estimatedCost = (r.components || []).reduce(
          (sum: number, c: any) => {
            const unitCost =
              costMap.get(c.componentProductId?.toString()) || 0;
            return sum + c.quantity * unitCost;
          },
          0,
        );

        return {
          codigo: r.code,
          nombre: r.name,
          producto:
            productNameMap.get(r.productId?.toString()) || "—",
          componentes: r.components?.length || 0,
          rinde: `${r.productionQuantity} ${r.productionUnit}`,
          costoEstimado: `$${estimatedCost.toFixed(2)}`,
        };
      });

      return {
        ok: true,
        total: recipes.length,
        recipes: formatted,
      };
    } catch (error) {
      this.logger.error(`getRecipes failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error consultando recetas: ${(error as Error).message}`,
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
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
