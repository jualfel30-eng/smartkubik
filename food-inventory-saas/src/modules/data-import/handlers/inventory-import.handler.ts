import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Product, ProductDocument } from "@/schemas/product.schema";
import {
  Inventory,
  InventoryDocument,
  InventoryMovement,
  InventoryMovementDocument,
} from "@/schemas/inventory.schema";
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
  normalizeString,
  sanitizeString,
} from "../utils/data-normalizer.util";
import { generateImportTemplate } from "../utils/template-generator.util";

@Injectable()
export class InventoryImportHandler implements ImportHandler {
  readonly entityType = "inventory";
  readonly displayName = "Inventario";
  readonly description =
    "Ajustar cantidades de inventario por SKU de producto. Requiere que los productos ya existan.";
  private readonly logger = new Logger(InventoryImportHandler.name);

  constructor(
    @InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
    @InjectModel(Inventory.name) private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name) private readonly inventoryMovementModel: Model<InventoryMovementDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  getFieldDefinitions(): ImportFieldDefinition[] {
    return [
      {
        key: "productSku",
        label: "SKU del Producto",
        labelEn: "Product SKU",
        required: true,
        type: "string",
        aliases: ["sku", "codigo", "product_sku", "código", "referencia", "code"],
      },
      {
        key: "totalQuantity",
        label: "Cantidad Total",
        labelEn: "Total Quantity",
        required: true,
        type: "number",
        aliases: ["cantidad", "quantity", "stock", "existencia", "total_quantity", "qty"],
      },
      {
        key: "averageCostPrice",
        label: "Costo Promedio",
        labelEn: "Average Cost",
        required: false,
        type: "number",
        aliases: ["costo_promedio", "avg_cost", "cost", "average_cost", "costo"],
      },
      {
        key: "lastCostPrice",
        label: "Último Costo",
        labelEn: "Last Cost",
        required: false,
        type: "number",
        aliases: ["ultimo_costo", "last_cost", "último_costo", "costo_ultimo"],
      },
      {
        key: "warehouseName",
        label: "Almacén",
        labelEn: "Warehouse",
        required: false,
        type: "string",
        aliases: ["almacen", "almacén", "warehouse", "bodega", "deposito", "depósito"],
      },
      {
        key: "reason",
        label: "Motivo del Ajuste",
        labelEn: "Adjustment Reason",
        required: false,
        type: "string",
        defaultValue: "Importación de datos",
        aliases: ["motivo", "reason", "razon", "razón", "nota"],
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
    context: ImportContext,
  ): Promise<ValidatedRow> {
    const errors: ValidatedRow["errors"] = [];
    const data: Record<string, any> = {};
    const fields = this.getFieldDefinitions();

    for (const field of fields) {
      let rawValue = row[field.key];
      if ((rawValue === undefined || rawValue === null || rawValue === "") && field.defaultValue !== undefined) {
        rawValue = field.defaultValue;
      }

      let value: any;
      switch (field.type) {
        case "number":
          value = normalizeAmount(rawValue);
          break;
        case "string":
          value = sanitizeString(rawValue);
          break;
        default:
          value = normalizeString(rawValue);
      }

      if (field.required && (value === undefined || value === null || value === "")) {
        errors.push({ field: field.key, message: `${field.label} es obligatorio`, severity: "error" });
      }

      data[field.key] = value;
    }

    // Validate quantity is non-negative
    if (data.totalQuantity != null && data.totalQuantity < 0) {
      errors.push({ field: "totalQuantity", message: "La cantidad no puede ser negativa", severity: "error" });
    }

    // Verify product exists by SKU
    if (data.productSku) {
      const tenantFilter = {
        $in: [context.tenantId, new Types.ObjectId(context.tenantId)],
      };
      const product = await this.productModel
        .findOne({ sku: data.productSku, tenantId: tenantFilter })
        .select("_id name")
        .lean();

      if (!product) {
        errors.push({
          field: "productSku",
          message: `No se encontró producto con SKU "${data.productSku}"`,
          severity: "error",
        });
      } else {
        data._productId = product._id.toString();
        data._productName = product.name;
      }
    }

    // Check existing inventory for update
    let existingRecordId: string | undefined;
    if (data._productId) {
      const tenantFilter = {
        $in: [context.tenantId, new Types.ObjectId(context.tenantId)],
      };
      const existingInv = await this.inventoryModel
        .findOne({ productSku: data.productSku, tenantId: tenantFilter })
        .select("_id")
        .lean();
      if (existingInv) {
        existingRecordId = existingInv._id.toString();
      }
    }

    const hasErrors = errors.some((e) => e.severity === "error");
    return {
      rowIndex,
      data,
      errors,
      status: hasErrors ? "error" : "valid",
      existingRecordId,
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

    // Check duplicate SKUs within file
    const skus = rows.map((r) => normalizeString(r.productSku)).filter(Boolean);
    const duplicates = skus.filter((s, i) => skus.indexOf(s) !== i);
    if (duplicates.length > 0) {
      warnings.push(
        `SKUs duplicados en el archivo: ${[...new Set(duplicates)].slice(0, 10).join(", ")}. Solo se procesará la última fila de cada SKU.`,
      );
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

    const importJobId = new Types.ObjectId(context.importJobId);
    const tenantObjId = new Types.ObjectId(context.tenantId);

    for (const row of validRows) {
      try {
        const { data, existingRecordId } = row;

        if (!data._productId) {
          result.skipped++;
          continue;
        }

        const tenantFilter = {
          $in: [context.tenantId, tenantObjId],
        };

        if (existingRecordId) {
          // ── UPDATE existing inventory ──
          const existing = await this.inventoryModel.findById(existingRecordId).lean();
          if (!existing) { result.skipped++; continue; }

          const snapshot: Record<string, any> = {
            totalQuantity: existing.totalQuantity,
            availableQuantity: existing.availableQuantity,
            averageCostPrice: existing.averageCostPrice,
            lastCostPrice: existing.lastCostPrice,
          };

          const updateFields: Record<string, any> = {
            totalQuantity: data.totalQuantity,
            availableQuantity: data.totalQuantity - (existing.reservedQuantity || 0) - (existing.committedQuantity || 0),
            importJobId,
            importedAt: new Date(),
          };

          if (data.averageCostPrice) updateFields.averageCostPrice = data.averageCostPrice;
          if (data.lastCostPrice) updateFields.lastCostPrice = data.lastCostPrice;

          await this.inventoryModel.findByIdAndUpdate(existingRecordId, { $set: updateFields });

          // Create inventory movement for the adjustment
          const quantityDiff = data.totalQuantity - (existing.totalQuantity || 0);
          if (quantityDiff !== 0) {
            await new this.inventoryMovementModel({
              inventoryId: existing._id,
              productId: new Types.ObjectId(data._productId),
              productSku: data.productSku,
              productName: data._productName,
              type: quantityDiff > 0 ? "adjustment_in" : "adjustment_out",
              quantity: Math.abs(quantityDiff),
              reason: data.reason || "Importación de datos",
              previousQuantity: existing.totalQuantity,
              newQuantity: data.totalQuantity,
              tenantId: tenantObjId,
              createdBy: new Types.ObjectId(context.userId),
            }).save();
          }

          result.updateSnapshots.push({ recordId: existingRecordId, previousValues: snapshot });
          result.updated++;
        } else {
          // ── CREATE new inventory record ──
          const inventory = new this.inventoryModel({
            productId: new Types.ObjectId(data._productId),
            productSku: data.productSku,
            productName: data._productName,
            totalQuantity: data.totalQuantity,
            availableQuantity: data.totalQuantity,
            reservedQuantity: 0,
            committedQuantity: 0,
            averageCostPrice: data.averageCostPrice || 0,
            lastCostPrice: data.lastCostPrice || 0,
            isActive: true,
            tenantId: tenantObjId,
            createdBy: new Types.ObjectId(context.userId),
            importJobId,
            importedAt: new Date(),
          });

          await inventory.save();

          // Create initial inventory movement
          if (data.totalQuantity > 0) {
            await new this.inventoryMovementModel({
              inventoryId: inventory._id,
              productId: new Types.ObjectId(data._productId),
              productSku: data.productSku,
              productName: data._productName,
              type: "adjustment_in",
              quantity: data.totalQuantity,
              reason: data.reason || "Importación de datos - inventario inicial",
              previousQuantity: 0,
              newQuantity: data.totalQuantity,
              tenantId: tenantObjId,
              createdBy: new Types.ObjectId(context.userId),
            }).save();
          }

          result.created++;
        }
      } catch (error) {
        this.logger.warn(`Error importing inventory row ${row.rowIndex}: ${error.message}`);
        result.failed++;
        result.errors.push({
          rowIndex: row.rowIndex,
          message: error.message || "Error desconocido al ajustar inventario",
        });
        if (!context.options.skipErrors) break;
      }
    }

    return result;
  }

  async rollback(importJobId: string, tenantId: string): Promise<RollbackResult> {
    const importObjId = new Types.ObjectId(importJobId);
    const tenantObjId = new Types.ObjectId(tenantId);

    const result = await this.inventoryModel.deleteMany({
      importJobId: importObjId,
      tenantId: tenantObjId,
    });

    return { deleted: result.deletedCount, restored: 0 };
  }

  async generateTemplate(): Promise<Buffer> {
    return generateImportTemplate({
      entityDisplayName: this.displayName,
      fields: this.getFieldDefinitions(),
      exampleRows: [
        {
          productSku: "PROD-001",
          totalQuantity: 150,
          averageCostPrice: 2.10,
          lastCostPrice: 2.25,
          warehouseName: "Almacén Principal",
          reason: "Inventario inicial migración",
        },
        {
          productSku: "PROD-002",
          totalQuantity: 500,
          averageCostPrice: 1.80,
          lastCostPrice: 1.75,
          warehouseName: "Almacén Principal",
          reason: "Inventario inicial migración",
        },
      ],
    });
  }
}
