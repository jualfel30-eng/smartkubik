import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Supplier, SupplierDocument } from "@/schemas/supplier.schema";
import { Customer, CustomerDocument } from "@/schemas/customer.schema";
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
  normalizeBoolean,
  normalizeString,
  sanitizeString,
} from "../utils/data-normalizer.util";
import { generateImportTemplate } from "../utils/template-generator.util";

@Injectable()
export class SupplierImportHandler implements ImportHandler {
  readonly entityType = "suppliers";
  readonly displayName = "Proveedores";
  readonly description =
    "Importar proveedores con datos de contacto, información fiscal y condiciones de pago.";
  private readonly logger = new Logger(SupplierImportHandler.name);

  constructor(
    @InjectModel(Supplier.name) private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  getFieldDefinitions(): ImportFieldDefinition[] {
    return [
      {
        key: "name",
        label: "Nombre / Razón Social",
        labelEn: "Supplier Name",
        required: true,
        type: "string",
        aliases: ["nombre", "name", "razon_social", "razón_social", "proveedor", "supplier"],
      },
      {
        key: "supplierType",
        label: "Tipo de Proveedor",
        labelEn: "Supplier Type",
        required: false,
        type: "enum",
        enumValues: ["national", "international", "local"],
        defaultValue: "national",
        aliases: ["tipo_proveedor", "supplier_type", "tipo", "type"],
      },
      {
        key: "rif",
        label: "RIF / NIT / Tax ID",
        labelEn: "Tax ID",
        required: false,
        type: "string",
        aliases: ["rif", "cedula", "cédula", "tax_id", "nit", "ruc", "identificacion"],
      },
      {
        key: "contactName",
        label: "Nombre de Contacto",
        labelEn: "Contact Name",
        required: false,
        type: "string",
        aliases: ["contacto", "contact_name", "nombre_contacto", "contact"],
      },
      {
        key: "contactPhone",
        label: "Teléfono de Contacto",
        labelEn: "Contact Phone",
        required: false,
        type: "string",
        aliases: ["telefono", "phone", "teléfono", "contact_phone", "tel"],
      },
      {
        key: "contactEmail",
        label: "Correo de Contacto",
        labelEn: "Contact Email",
        required: false,
        type: "string",
        aliases: ["correo", "email", "contact_email", "correo_electronico"],
      },
      {
        key: "address",
        label: "Dirección",
        labelEn: "Address",
        required: false,
        type: "string",
        aliases: ["direccion", "dirección", "address", "domicilio"],
      },
      {
        key: "city",
        label: "Ciudad",
        labelEn: "City",
        required: false,
        type: "string",
        aliases: ["ciudad", "city", "localidad"],
      },
      {
        key: "state",
        label: "Estado / Provincia",
        labelEn: "State",
        required: false,
        type: "string",
        aliases: ["estado", "state", "provincia"],
      },
      {
        key: "paymentTerms",
        label: "Condición de Pago",
        labelEn: "Payment Terms",
        required: false,
        type: "string",
        defaultValue: "Contado",
        aliases: ["condicion_pago", "payment_terms", "forma_pago", "plazo"],
      },
      {
        key: "notes",
        label: "Notas",
        labelEn: "Notes",
        required: false,
        type: "string",
        aliases: ["notas", "notes", "observaciones"],
      },
      {
        key: "isActive",
        label: "Activo",
        labelEn: "Active",
        required: false,
        type: "boolean",
        defaultValue: true,
        aliases: ["activo", "active", "is_active"],
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
        case "string":
          value = sanitizeString(rawValue);
          break;
        case "boolean":
          value = normalizeBoolean(rawValue);
          if (value === null && field.defaultValue !== undefined) value = field.defaultValue;
          break;
        case "enum":
          value = normalizeString(rawValue).toLowerCase();
          if (value && field.enumValues && !field.enumValues.includes(value)) {
            errors.push({
              field: field.key,
              message: `Valor "${rawValue}" no válido. Permitidos: ${field.enumValues.join(", ")}`,
              severity: "error",
            });
          }
          break;
        default:
          value = normalizeString(rawValue);
      }

      if (field.required && !value) {
        errors.push({ field: field.key, message: `${field.label} es obligatorio`, severity: "error" });
      }

      data[field.key] = value;
    }

    // Check existing supplier by RIF for update mode
    let existingRecordId: string | undefined;
    if (context.options.updateExisting && data.rif) {
      const existing = await this.supplierModel
        .findOne({ "taxInfo.rif": data.rif, tenantId: String(context.tenantId) })
        .select("_id")
        .lean();
      if (existing) existingRecordId = existing._id.toString();
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

    const tenant = await this.tenantModel.findById(context.tenantId).lean();
    if (!tenant) {
      errors.push("Tenant no encontrado");
      return { canProceed: false, errors, warnings };
    }

    // Check duplicate RIFs within file
    const rifs = rows.map((r) => normalizeString(r.rif)).filter(Boolean);
    const duplicates = rifs.filter((r, i) => rifs.indexOf(r) !== i);
    if (duplicates.length > 0) {
      warnings.push(`RIF duplicados en el archivo: ${[...new Set(duplicates)].slice(0, 10).join(", ")}`);
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

    const tenantIdStr = String(context.tenantId);
    const tenantObjId = new Types.ObjectId(context.tenantId);
    const importJobId = new Types.ObjectId(context.importJobId);

    // Get next supplierNumber
    const supplierCount = await this.supplierModel.countDocuments({ tenantId: tenantIdStr });
    let nextNumber = supplierCount + 1;

    for (const row of validRows) {
      try {
        const { data, existingRecordId } = row;

        if (existingRecordId && context.options.updateExisting) {
          // ── UPDATE ──
          const existing = await this.supplierModel.findById(existingRecordId).lean();
          if (!existing) { result.skipped++; continue; }

          const snapshot: Record<string, any> = {};
          const updateFields: Record<string, any> = {};

          if (data.name) { snapshot.name = existing.name; updateFields.name = data.name; }
          if (data.supplierType) { snapshot.supplierType = existing.supplierType; updateFields.supplierType = data.supplierType; }
          if (data.contactName || data.contactPhone || data.contactEmail) {
            snapshot.contacts = existing.contacts;
            const contact: Record<string, any> = {
              name: data.contactName || existing.contacts?.[0]?.name || '',
              position: existing.contacts?.[0]?.position || 'Principal',
              isPrimary: true,
            };
            if (data.contactEmail) contact.email = data.contactEmail;
            if (data.contactPhone) contact.phone = data.contactPhone;
            updateFields.contacts = [contact];
          }
          if (data.rif) {
            snapshot.taxInfo = existing.taxInfo;
            updateFields.taxInfo = {
              ...(existing.taxInfo || {}),
              rif: data.rif,
              businessName: data.name || existing.taxInfo?.businessName || '',
            };
          }

          updateFields.importJobId = importJobId;
          updateFields.importedAt = new Date();

          await this.supplierModel.findByIdAndUpdate(existingRecordId, { $set: updateFields });
          result.updateSnapshots.push({ recordId: existingRecordId, previousValues: snapshot });
          result.updated++;
        } else {
          // ── CREATE ──
          // Check if RIF already exists
          if (data.rif) {
            const existsByRif = await this.supplierModel
              .findOne({ "taxInfo.rif": data.rif, tenantId: tenantIdStr })
              .select("_id")
              .lean();
            if (existsByRif && !context.options.updateExisting) {
              result.skipped++;
              result.errors.push({
                rowIndex: row.rowIndex,
                field: "rif",
                message: `El proveedor con RIF "${data.rif}" ya existe`,
              });
              continue;
            }
          }

          const supplierNumber = `PROV-${String(nextNumber).padStart(6, "0")}`;
          nextNumber++;

          // Create supplier
          const contacts: any[] = [];
          if (data.contactName || data.contactPhone || data.contactEmail) {
            contacts.push({
              name: data.contactName || data.name,
              position: 'Principal',
              email: data.contactEmail || '',
              phone: data.contactPhone || '',
              isPrimary: true,
            });
          }

          const supplier = new this.supplierModel({
            supplierNumber,
            name: data.name,
            supplierType: data.supplierType || "national",
            taxInfo: {
              rif: data.rif || "",
              businessName: data.name || "",
              isRetentionAgent: false,
            },
            contacts,
            address: data.address ? {
              street: data.address,
              city: data.city || "",
              state: data.state || "",
              country: "Venezuela",
            } : undefined,
            notes: data.notes || "",
            status: data.isActive === false ? "inactive" : "active",
            tenantId: tenantIdStr,
            createdBy: context.userId,
            importJobId,
            importedAt: new Date(),
          });

          const savedSupplier = await supplier.save();

          // Also create linked Customer with customerType "supplier"
          const existingCustomer = data.rif
            ? await this.customerModel.findOne({
                "taxInfo.taxId": data.rif,
                tenantId: tenantObjId,
              }).lean()
            : null;

          if (!existingCustomer) {
            const customerCount = await this.customerModel
              .countDocuments({ tenantId: tenantObjId, customerNumber: /^CLI-/ });
            const customerNumber = `CLI-${String(customerCount + 1).padStart(6, "0")}`;

            const customer = new this.customerModel({
              customerNumber,
              name: data.name,
              customerType: "supplier",
              email: data.contactEmail || "",
              phone: data.contactPhone || "",
              taxInfo: {
                taxId: data.rif || "",
                taxName: data.name || "",
              },
              isActive: data.isActive ?? true,
              loyaltyTier: "bronce",
              metrics: {
                totalPurchases: 0,
                totalSpent: 0,
                averageOrderValue: 0,
                lastPurchaseDate: null,
              },
              tenantId: tenantObjId,
              createdBy: new Types.ObjectId(context.userId),
              importJobId,
              importedAt: new Date(),
            });

            const savedCustomer = await customer.save();

            // Link supplier to customer
            await this.supplierModel.findByIdAndUpdate(savedSupplier._id, {
              $set: { customerId: savedCustomer._id },
            });
          }

          result.created++;
        }
      } catch (error) {
        this.logger.warn(`Error importing supplier row ${row.rowIndex}: ${error.message}`);
        result.failed++;
        result.errors.push({
          rowIndex: row.rowIndex,
          message: error.message || "Error desconocido al importar proveedor",
        });
        if (!context.options.skipErrors) break;
      }
    }

    return result;
  }

  async rollback(importJobId: string, tenantId: string): Promise<RollbackResult> {
    const importObjId = new Types.ObjectId(importJobId);

    // Delete suppliers
    const supplierResult = await this.supplierModel.deleteMany({
      importJobId: importObjId,
      tenantId: String(tenantId),
    });

    // Delete linked customers
    const customerResult = await this.customerModel.deleteMany({
      importJobId: importObjId,
      tenantId: new Types.ObjectId(tenantId),
    });

    return {
      deleted: supplierResult.deletedCount + customerResult.deletedCount,
      restored: 0,
    };
  }

  async generateTemplate(): Promise<Buffer> {
    return generateImportTemplate({
      entityDisplayName: this.displayName,
      fields: this.getFieldDefinitions(),
      exampleRows: [
        {
          name: "Distribuidora ABC C.A.",
          supplierType: "national",
          rif: "J-12345678-9",
          contactName: "María García",
          contactPhone: "+58 212 5551234",
          contactEmail: "ventas@abc.com",
          address: "Zona Industrial Sur, Galpón 5",
          city: "Valencia",
          state: "Carabobo",
          paymentTerms: "30 días",
          notes: "Proveedor principal de bebidas",
          isActive: "Si",
        },
      ],
    });
  }
}
