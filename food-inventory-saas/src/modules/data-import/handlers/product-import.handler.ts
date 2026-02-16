import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import { Inventory, InventoryDocument } from "@/schemas/inventory.schema";
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
import {
  normalizeAmount,
  normalizeBoolean,
  normalizeArray,
  normalizeString,
  normalizeNumber,
  sanitizeString,
} from "../utils/data-normalizer.util";
import { generateImportTemplate } from "../utils/template-generator.util";

@Injectable()
export class ProductImportHandler implements ImportHandler {
  readonly entityType = "products";
  readonly displayName = "Productos";
  readonly description =
    "Importar productos con variantes, precios, configuración fiscal e inventario inicial.";
  private readonly logger = new Logger(ProductImportHandler.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  getFieldDefinitions(): ImportFieldDefinition[] {
    return [
      {
        key: "sku",
        label: "SKU / Código",
        labelEn: "SKU",
        required: true,
        type: "string",
        aliases: ["sku", "codigo", "code", "referencia", "ref", "código", "reference"],
      },
      {
        key: "name",
        label: "Nombre del Producto",
        labelEn: "Product Name",
        required: true,
        type: "string",
        aliases: ["nombre", "name", "producto", "product", "descripcion_corta", "item"],
      },
      {
        key: "category",
        label: "Categoría",
        labelEn: "Category",
        required: true,
        type: "array",
        arraySeparator: ",",
        aliases: ["categoria", "category", "categories", "categoría", "categorías"],
      },
      {
        key: "subcategory",
        label: "Subcategoría",
        labelEn: "Subcategory",
        required: false,
        type: "array",
        arraySeparator: ",",
        aliases: ["subcategoria", "subcategory", "subcategoría", "sub_category"],
      },
      {
        key: "brand",
        label: "Marca",
        labelEn: "Brand",
        required: false,
        type: "string",
        defaultValue: "Sin marca",
        aliases: ["marca", "brand", "fabricante", "manufacturer"],
      },
      {
        key: "description",
        label: "Descripción",
        labelEn: "Description",
        required: false,
        type: "string",
        aliases: ["descripcion", "description", "descripción", "detalle"],
      },
      {
        key: "productType",
        label: "Tipo de Producto",
        labelEn: "Product Type",
        required: false,
        type: "enum",
        enumValues: ["SIMPLE", "CONSUMABLE", "SUPPLY", "RAW_MATERIAL"],
        defaultValue: "SIMPLE",
        aliases: ["tipo_producto", "product_type", "tipo", "type"],
      },
      {
        key: "isPerishable",
        label: "Es Perecedero",
        labelEn: "Is Perishable",
        required: false,
        type: "boolean",
        defaultValue: false,
        aliases: ["perecedero", "perishable", "es_perecedero", "caduca"],
      },
      {
        key: "taxCategory",
        label: "Categoría Fiscal",
        labelEn: "Tax Category",
        required: false,
        type: "string",
        defaultValue: "general",
        aliases: ["categoria_fiscal", "tax_category", "impuesto", "tax", "iva"],
      },
      {
        key: "ivaApplicable",
        label: "Aplica IVA",
        labelEn: "IVA Applicable",
        required: false,
        type: "boolean",
        defaultValue: true,
        aliases: ["aplica_iva", "iva_applicable", "gravado", "taxable"],
      },
      {
        key: "variantName",
        label: "Nombre Variante / Presentación",
        labelEn: "Variant Name",
        required: false,
        type: "string",
        defaultValue: "Principal",
        aliases: ["variante", "variant_name", "presentacion", "presentación", "variant"],
      },
      {
        key: "variantBarcode",
        label: "Código de Barras",
        labelEn: "Barcode",
        required: false,
        type: "string",
        aliases: ["codigo_barras", "barcode", "ean", "upc", "código_barras"],
      },
      {
        key: "variantUnit",
        label: "Unidad de Medida",
        labelEn: "Unit",
        required: false,
        type: "string",
        defaultValue: "und",
        aliases: ["unidad", "unit", "uom", "unidad_medida", "unit_of_measure"],
      },
      {
        key: "variantUnitSize",
        label: "Tamaño / Contenido",
        labelEn: "Unit Size",
        required: false,
        type: "number",
        defaultValue: 1,
        aliases: ["tamano_unidad", "unit_size", "contenido", "size", "tamaño"],
      },
      {
        key: "variantBasePrice",
        label: "Precio de Venta",
        labelEn: "Sale Price",
        required: true,
        type: "number",
        aliases: ["precio", "price", "precio_venta", "base_price", "sale_price", "pvp"],
      },
      {
        key: "variantCostPrice",
        label: "Precio de Costo",
        labelEn: "Cost Price",
        required: true,
        type: "number",
        aliases: ["costo", "cost", "precio_costo", "cost_price", "precio_compra"],
      },
      {
        key: "variantWholesalePrice",
        label: "Precio Mayorista",
        labelEn: "Wholesale Price",
        required: false,
        type: "number",
        aliases: ["precio_mayorista", "wholesale_price", "precio_mayor"],
      },
      {
        key: "initialStock",
        label: "Stock Inicial",
        labelEn: "Initial Stock",
        required: false,
        type: "number",
        defaultValue: 0,
        aliases: ["stock", "stock_inicial", "initial_stock", "existencia", "cantidad", "quantity"],
      },
      {
        key: "minimumStock",
        label: "Stock Mínimo",
        labelEn: "Minimum Stock",
        required: false,
        type: "number",
        aliases: ["stock_minimo", "min_stock", "minimum_stock", "stock_mínimo"],
      },
      {
        key: "reorderPoint",
        label: "Punto de Reorden",
        labelEn: "Reorder Point",
        required: false,
        type: "number",
        aliases: ["punto_reorden", "reorder_point", "reorder"],
      },
    ];
  }

  autoMapColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    const fields = this.getFieldDefinitions();
    const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());

    for (const field of fields) {
      const allAliases = [field.key, ...field.aliases].map((a) =>
        a.toLowerCase(),
      );
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
    context: ImportContext,
  ): Promise<ValidatedRow> {
    const errors: ValidatedRow["errors"] = [];
    const data: Record<string, any> = {};

    const fields = this.getFieldDefinitions();
    for (const field of fields) {
      let rawValue = row[field.key];

      // Apply default if empty
      if ((rawValue === undefined || rawValue === null || rawValue === "") && field.defaultValue !== undefined) {
        rawValue = field.defaultValue;
      }

      // Normalize by type
      let value: any;
      switch (field.type) {
        case "string":
          value = sanitizeString(rawValue);
          break;
        case "number":
          value = normalizeAmount(rawValue);
          if (value === 0 && rawValue !== 0 && rawValue !== "0" && rawValue != null && rawValue !== "") {
            value = normalizeNumber(rawValue);
          }
          break;
        case "boolean":
          value = normalizeBoolean(rawValue);
          if (value === null && field.defaultValue !== undefined) value = field.defaultValue;
          break;
        case "date":
          // Not used in product fields currently
          value = rawValue;
          break;
        case "array":
          value = normalizeArray(rawValue, field.arraySeparator);
          break;
        case "enum":
          value = normalizeString(rawValue).toUpperCase();
          if (value && field.enumValues && !field.enumValues.includes(value)) {
            errors.push({
              field: field.key,
              message: `Valor "${rawValue}" no válido para ${field.label}. Valores permitidos: ${field.enumValues.join(", ")}`,
              severity: "error",
            });
          }
          break;
      }

      // Required field check
      if (field.required && (value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0))) {
        errors.push({
          field: field.key,
          message: `${field.label} es obligatorio`,
          severity: "error",
        });
      }

      // Custom validation
      if (field.validationFn) {
        const error = field.validationFn(value, row);
        if (error) {
          errors.push({ field: field.key, message: error, severity: "error" });
        }
      }

      data[field.key] = value;
    }

    // Business rule: prices must be positive
    if (data.variantBasePrice != null && data.variantBasePrice < 0) {
      errors.push({ field: "variantBasePrice", message: "El precio de venta debe ser positivo", severity: "error" });
    }
    if (data.variantCostPrice != null && data.variantCostPrice < 0) {
      errors.push({ field: "variantCostPrice", message: "El precio de costo debe ser positivo", severity: "error" });
    }

    // Check if product exists (for update mode)
    let existingRecordId: string | undefined;
    if (data.sku && context.options.updateExisting) {
      const existing = await this.productModel
        .findOne({ sku: data.sku, tenantId: new Types.ObjectId(context.tenantId) })
        .select("_id")
        .lean();
      if (existing) {
        existingRecordId = existing._id.toString();
      }
    }

    const hasErrors = errors.some((e) => e.severity === "error");
    const hasWarnings = errors.some((e) => e.severity === "warning");

    return {
      rowIndex,
      data,
      errors,
      status: hasErrors ? "error" : hasWarnings ? "warning" : "valid",
      existingRecordId,
    };
  }

  async preValidateBatch(
    rows: Record<string, any>[],
    context: ImportContext,
  ): Promise<PreValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check tenant product limits
    const tenant = await this.tenantModel.findById(context.tenantId).lean();
    if (!tenant) {
      errors.push("Tenant no encontrado");
      return { canProceed: false, errors, warnings };
    }

    const newProductCount = context.options.updateExisting
      ? rows.length // Worst case: all are new
      : rows.length;
    const existingCount = tenant.usage?.currentProducts || 0;
    const maxProducts = tenant.limits?.maxProducts || Infinity;

    if (existingCount + newProductCount > maxProducts) {
      errors.push(
        `Esta importación podría exceder el límite de productos (${maxProducts}). Actualmente tiene ${existingCount} productos y está intentando importar ${newProductCount}.`,
      );
    }

    // Check for duplicate SKUs within the file
    const skus = rows.map((r) => normalizeString(r.sku)).filter(Boolean);
    const duplicates = skus.filter((s, i) => skus.indexOf(s) !== i);
    if (duplicates.length > 0) {
      const unique = [...new Set(duplicates)];
      warnings.push(
        `SKUs duplicados en el archivo: ${unique.slice(0, 10).join(", ")}${unique.length > 10 ? ` y ${unique.length - 10} más` : ""}`,
      );
    }

    return {
      canProceed: errors.length === 0,
      errors,
      warnings,
    };
  }

  async executeBatch(
    validRows: ValidatedRow[],
    context: ImportContext,
  ): Promise<ImportHandlerResult> {
    const result: ImportHandlerResult = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [],
      updateSnapshots: [],
    };

    const tenantId = new Types.ObjectId(context.tenantId);
    const importJobId = new Types.ObjectId(context.importJobId);

    for (const row of validRows) {
      try {
        const { data, existingRecordId } = row;

        if (existingRecordId && context.options.updateExisting) {
          // ── UPDATE existing product ──
          const existing = await this.productModel.findById(existingRecordId).lean();
          if (!existing) {
            result.skipped++;
            continue;
          }

          // Snapshot previous values for rollback
          const snapshot: Record<string, any> = {};
          const updateFields: Record<string, any> = {};

          if (data.name) { snapshot.name = existing.name; updateFields.name = data.name; }
          if (data.brand) { snapshot.brand = existing.brand; updateFields.brand = data.brand; }
          if (data.category?.length) { snapshot.category = existing.category; updateFields.category = data.category; }
          if (data.subcategory?.length) { snapshot.subcategory = existing.subcategory; updateFields.subcategory = data.subcategory; }
          if (data.description) { snapshot.description = existing.description; updateFields.description = data.description; }
          if (data.productType) { snapshot.productType = existing.productType; updateFields.productType = data.productType; }
          if (data.isPerishable !== undefined) { snapshot.isPerishable = existing.isPerishable; updateFields.isPerishable = data.isPerishable; }
          if (data.taxCategory) { snapshot.taxCategory = existing.taxCategory; updateFields.taxCategory = data.taxCategory; }
          if (data.ivaApplicable !== undefined) { snapshot.ivaApplicable = existing.ivaApplicable; updateFields.ivaApplicable = data.ivaApplicable; }

          // Update variant pricing if present
          if (existing.variants?.length && (data.variantBasePrice || data.variantCostPrice)) {
            snapshot.variants = existing.variants;
            const updatedVariants = [...existing.variants];
            updatedVariants[0] = {
              ...updatedVariants[0],
              ...(data.variantBasePrice ? { basePrice: data.variantBasePrice } : {}),
              ...(data.variantCostPrice ? { costPrice: data.variantCostPrice } : {}),
              ...(data.variantWholesalePrice ? { wholesalePrice: data.variantWholesalePrice } : {}),
            };
            updateFields.variants = updatedVariants;
          }

          updateFields.importJobId = importJobId;
          updateFields.importedAt = new Date();

          await this.productModel.findByIdAndUpdate(existingRecordId, { $set: updateFields });

          result.updateSnapshots.push({
            recordId: existingRecordId,
            previousValues: snapshot,
          });
          result.updated++;
        } else {
          // ── CREATE new product ──
          // Check if SKU already exists
          const existingBySku = await this.productModel
            .findOne({ sku: data.sku, tenantId })
            .select("_id")
            .lean();

          if (existingBySku) {
            if (!context.options.updateExisting) {
              result.skipped++;
              result.errors.push({
                rowIndex: row.rowIndex,
                field: "sku",
                message: `El producto con SKU "${data.sku}" ya existe`,
              });
              continue;
            }
          }

          const variantSku = `${data.sku}-01`;
          const product = new this.productModel({
            sku: data.sku,
            name: data.name,
            category: data.category || [],
            subcategory: data.subcategory || [],
            brand: data.brand || "Sin marca",
            description: data.description || "",
            productType: data.productType || "SIMPLE",
            isPerishable: data.isPerishable ?? false,
            taxCategory: data.taxCategory || "general",
            ivaApplicable: data.ivaApplicable ?? true,
            inventoryConfig: {
              minimumStock: data.minimumStock || 0,
              reorderPoint: data.reorderPoint || 0,
            },
            variants: [
              {
                name: data.variantName || "Principal",
                sku: variantSku,
                barcode: data.variantBarcode || "",
                unit: data.variantUnit || "und",
                unitSize: data.variantUnitSize || 1,
                basePrice: data.variantBasePrice || 0,
                costPrice: data.variantCostPrice || 0,
                wholesalePrice: data.variantWholesalePrice || 0,
                isActive: true,
              },
            ],
            isActive: true,
            tenantId,
            createdBy: new Types.ObjectId(context.userId),
            importJobId,
            importedAt: new Date(),
          });

          const savedProduct = await product.save();

          // Create initial inventory record
          const initialStock = data.initialStock || 0;
          const inventory = new this.inventoryModel({
            productId: savedProduct._id,
            productSku: data.sku,
            productName: data.name,
            totalQuantity: initialStock,
            availableQuantity: initialStock,
            reservedQuantity: 0,
            committedQuantity: 0,
            averageCostPrice: data.variantCostPrice || 0,
            lastCostPrice: data.variantCostPrice || 0,
            isActive: true,
            tenantId,
            createdBy: new Types.ObjectId(context.userId),
            importJobId,
            importedAt: new Date(),
          });

          await inventory.save();

          // Update tenant usage
          await this.tenantModel.findByIdAndUpdate(context.tenantId, {
            $inc: { "usage.currentProducts": 1 },
          });

          result.created++;
        }
      } catch (error) {
        this.logger.warn(
          `Error importing product row ${row.rowIndex}: ${error.message}`,
        );
        result.failed++;
        result.errors.push({
          rowIndex: row.rowIndex,
          message: error.message || "Error desconocido al importar producto",
        });
        if (!context.options.skipErrors) break;
      }
    }

    return result;
  }

  async rollback(importJobId: string, tenantId: string): Promise<RollbackResult> {
    const importObjId = new Types.ObjectId(importJobId);
    const tenantObjId = new Types.ObjectId(tenantId);

    // Delete created products
    const productResult = await this.productModel.deleteMany({
      importJobId: importObjId,
      tenantId: tenantObjId,
    });

    // Delete associated inventory
    await this.inventoryModel.deleteMany({
      importJobId: importObjId,
      tenantId: tenantObjId,
    });

    // Decrement tenant usage
    if (productResult.deletedCount > 0) {
      await this.tenantModel.findByIdAndUpdate(tenantId, {
        $inc: { "usage.currentProducts": -productResult.deletedCount },
      });
    }

    return {
      deleted: productResult.deletedCount,
      restored: 0, // Update snapshots handled by DataImportService
    };
  }

  async generateTemplate(): Promise<Buffer> {
    return generateImportTemplate({
      entityDisplayName: this.displayName,
      fields: this.getFieldDefinitions(),
      exampleRows: [
        {
          sku: "PROD-001",
          name: "Harina PAN 1kg",
          category: "Alimentos",
          subcategory: "Harinas",
          brand: "PAN",
          description: "Harina de maíz precocida",
          productType: "SIMPLE",
          isPerishable: "No",
          taxCategory: "general",
          ivaApplicable: "Si",
          variantName: "1 Kilogramo",
          variantBarcode: "7591234567890",
          variantUnit: "kg",
          variantUnitSize: 1,
          variantBasePrice: 3.50,
          variantCostPrice: 2.10,
          variantWholesalePrice: 2.80,
          initialStock: 100,
          minimumStock: 10,
          reorderPoint: 20,
        },
        {
          sku: "PROD-002",
          name: "Coca-Cola 2L",
          category: "Bebidas",
          subcategory: "Refrescos",
          brand: "Coca-Cola",
          description: "Refresco de cola 2 litros",
          productType: "SIMPLE",
          isPerishable: "Si",
          taxCategory: "general",
          ivaApplicable: "Si",
          variantName: "2 Litros",
          variantBarcode: "7591234567891",
          variantUnit: "und",
          variantUnitSize: 1,
          variantBasePrice: 2.50,
          variantCostPrice: 1.80,
          variantWholesalePrice: 2.00,
          initialStock: 200,
          minimumStock: 20,
          reorderPoint: 50,
        },
      ],
    });
  }
}
