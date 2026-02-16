import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { Tenant, TenantDocument } from "@/schemas/tenant.schema";
import {
  ImportHandler,
  ImportFieldDefinition,
  ImportContext,
  ValidatedRow,
  PreValidationResult,
  ImportHandlerResult,
  RollbackResult,
} from "../interfaces/import-handler.interface";
import { normalizeString, sanitizeString } from "../utils/data-normalizer.util";
import { generateImportTemplate } from "../utils/template-generator.util";

/**
 * Category import handler.
 * Categories in SmartKubik are stored as string arrays on Product documents,
 * not as separate entities. This handler validates category/subcategory pairs
 * and optionally batch-updates existing products to standardize category names.
 */
@Injectable()
export class CategoryImportHandler implements ImportHandler {
  readonly entityType = "categories";
  readonly displayName = "Categorías";
  readonly description =
    "Importar y estandarizar categorías y subcategorías de productos. Las categorías se almacenan directamente en los productos.";
  private readonly logger = new Logger(CategoryImportHandler.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  getFieldDefinitions(): ImportFieldDefinition[] {
    return [
      {
        key: "category",
        label: "Categoría",
        labelEn: "Category",
        required: true,
        type: "string",
        aliases: ["categoria", "category", "categoría", "grupo", "group"],
      },
      {
        key: "subcategory",
        label: "Subcategoría",
        labelEn: "Subcategory",
        required: false,
        type: "string",
        aliases: ["subcategoria", "subcategory", "subcategoría", "sub_category", "subgrupo"],
      },
      {
        key: "oldCategoryName",
        label: "Nombre Anterior (para renombrar)",
        labelEn: "Old Category Name",
        required: false,
        type: "string",
        aliases: ["nombre_anterior", "old_name", "renombrar_de", "rename_from"],
      },
    ];
  }

  autoMapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const fields = this.getFieldDefinitions();
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

    for (const field of fields) {
      const allAliases = [field.key, ...field.aliases].map((a) => a.toLowerCase());
      const matchIndex = normalizedHeaders.findIndex((h) =>
        allAliases.some((alias) => h === alias || h.includes(alias)),
      );
      if (matchIndex !== -1) {
        mapping[headers[matchIndex]] = field.key;
      }
    }

    return mapping;
  }

  async validateRow(
    row: Record<string, any>,
    rowIndex: number,
    _context: ImportContext,
  ): Promise<ValidatedRow> {
    const errors: ValidatedRow["errors"] = [];
    const data: Record<string, any> = {};

    data.category = sanitizeString(row.category);
    data.subcategory = sanitizeString(row.subcategory);
    data.oldCategoryName = sanitizeString(row.oldCategoryName);

    if (!data.category) {
      errors.push({ field: "category", message: "La categoría es obligatoria", severity: "error" });
    }

    const hasErrors = errors.some((e) => e.severity === "error");
    return {
      rowIndex,
      data,
      errors,
      status: hasErrors ? "error" : "valid",
    };
  }

  async preValidateBatch(
    rows: Record<string, any>[],
    context: ImportContext,
  ): Promise<PreValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    const tenant = await this.tenantModel.findById(context.tenantId).lean();
    if (!tenant) {
      errors.push("Tenant no encontrado");
      return { canProceed: false, errors, warnings };
    }

    // Check for duplicate category names
    const categories = rows.map((r) => normalizeString(r.category)).filter(Boolean);
    const duplicates = categories.filter((c, i) => categories.indexOf(c) !== i);
    if (duplicates.length > 0) {
      warnings.push(`Categorías duplicadas: ${[...new Set(duplicates)].join(", ")}`);
    }

    return { canProceed: errors.length === 0, errors, warnings };
  }

  async executeBatch(
    validRows: ValidatedRow[],
    context: ImportContext,
  ): Promise<ImportHandlerResult> {
    const result: ImportHandlerResult = {
      created: 0, updated: 0, skipped: 0, failed: 0,
      errors: [], updateSnapshots: [],
    };

    const tenantId = new Types.ObjectId(context.tenantId);
    const importJobId = new Types.ObjectId(context.importJobId);

    for (const row of validRows) {
      try {
        const { data } = row;

        if (data.oldCategoryName && data.category) {
          // ── RENAME: Update existing products from oldCategoryName to new category ──
          const updateResult = await this.productModel.updateMany(
            {
              tenantId,
              category: data.oldCategoryName,
            },
            {
              $set: {
                "category.$[elem]": data.category,
                importJobId,
                importedAt: new Date(),
              },
            },
            {
              arrayFilters: [{ elem: data.oldCategoryName }],
            },
          );

          if (updateResult.modifiedCount > 0) {
            result.updated += updateResult.modifiedCount;
            result.updateSnapshots.push({
              recordId: `category:${data.oldCategoryName}`,
              previousValues: { category: data.oldCategoryName, newCategory: data.category },
            });
          } else {
            result.skipped++;
            result.errors.push({
              rowIndex: row.rowIndex,
              message: `No se encontraron productos con categoría "${data.oldCategoryName}"`,
            });
          }

          // Similarly handle subcategory rename
          if (data.subcategory && data.oldCategoryName) {
            await this.productModel.updateMany(
              { tenantId, subcategory: data.oldCategoryName },
              {
                $set: { "subcategory.$[elem]": data.subcategory },
              },
              { arrayFilters: [{ elem: data.oldCategoryName }] },
            );
          }
        } else {
          // ── VALIDATE: Just record the category as valid (no separate entity to create) ──
          // Categories are reference data; they exist implicitly when assigned to products.
          result.created++;
        }
      } catch (error) {
        this.logger.warn(`Error processing category row ${row.rowIndex}: ${error.message}`);
        result.failed++;
        result.errors.push({
          rowIndex: row.rowIndex,
          message: error.message || "Error al procesar categoría",
        });
        if (!context.options.skipErrors) break;
      }
    }

    return result;
  }

  async rollback(importJobId: string, tenantId: string): Promise<RollbackResult> {
    // Categories don't create separate documents;
    // rename rollbacks would need to be done from updateSnapshots by the service
    return { deleted: 0, restored: 0 };
  }

  async generateTemplate(): Promise<Buffer> {
    return generateImportTemplate({
      entityDisplayName: this.displayName,
      fields: this.getFieldDefinitions(),
      exampleRows: [
        { category: "Alimentos", subcategory: "Harinas", oldCategoryName: "" },
        { category: "Bebidas", subcategory: "Refrescos", oldCategoryName: "" },
        { category: "Bebidas", subcategory: "Licores", oldCategoryName: "" },
        { category: "Lácteos", subcategory: "", oldCategoryName: "Lacteos" },
      ],
    });
  }
}
