import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
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
export class CustomerImportHandler implements ImportHandler {
  readonly entityType = "customers";
  readonly displayName = "Clientes";
  readonly description =
    "Importar clientes con datos de contacto, información fiscal y tipo de cliente.";
  private readonly logger = new Logger(CustomerImportHandler.name);

  constructor(
    @InjectModel(Customer.name) private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(Tenant.name) private readonly tenantModel: Model<TenantDocument>,
  ) {}

  getFieldDefinitions(): ImportFieldDefinition[] {
    return [
      {
        key: "name",
        label: "Nombre / Razón Social",
        labelEn: "Name",
        required: true,
        type: "string",
        aliases: ["nombre", "name", "razon_social", "razón_social", "cliente", "customer", "company"],
      },
      {
        key: "customerType",
        label: "Tipo de Cliente",
        labelEn: "Customer Type",
        required: false,
        type: "enum",
        enumValues: ["individual", "business", "government"],
        defaultValue: "individual",
        aliases: ["tipo_cliente", "customer_type", "tipo", "type"],
      },
      {
        key: "email",
        label: "Correo Electrónico",
        labelEn: "Email",
        required: false,
        type: "string",
        aliases: ["correo", "email", "email_principal", "correo_electronico", "e-mail"],
      },
      {
        key: "phone",
        label: "Teléfono",
        labelEn: "Phone",
        required: false,
        type: "string",
        aliases: ["telefono", "phone", "teléfono", "celular", "mobile", "tel"],
      },
      {
        key: "taxId",
        label: "RIF / Cédula / NIT",
        labelEn: "Tax ID",
        required: false,
        type: "string",
        aliases: ["rif", "cedula", "cédula", "tax_id", "nit", "ruc", "identificacion", "identificación", "dni"],
      },
      {
        key: "taxType",
        label: "Tipo de Identificación",
        labelEn: "Tax Type",
        required: false,
        type: "enum",
        enumValues: ["V", "E", "J", "G", "P", "C"],
        aliases: ["tipo_rif", "tax_type", "tipo_identificacion", "tipo_documento"],
      },
      {
        key: "companyName",
        label: "Empresa",
        labelEn: "Company Name",
        required: false,
        type: "string",
        aliases: ["empresa", "company_name", "compañia", "compañía", "company"],
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
        aliases: ["estado", "state", "provincia", "region", "región"],
      },
      {
        key: "notes",
        label: "Notas",
        labelEn: "Notes",
        required: false,
        type: "string",
        aliases: ["notas", "notes", "observaciones", "comentarios"],
      },
      {
        key: "isActive",
        label: "Activo",
        labelEn: "Active",
        required: false,
        type: "boolean",
        defaultValue: true,
        aliases: ["activo", "active", "is_active", "estado_activo"],
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
              message: `Valor "${rawValue}" no válido para ${field.label}. Valores permitidos: ${field.enumValues.join(", ")}`,
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

    // Validate email format
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: "email", message: "Formato de correo electrónico inválido", severity: "warning" });
    }

    // Check if customer exists by taxId for update mode
    let existingRecordId: string | undefined;
    if (context.options.updateExisting && data.taxId) {
      const existing = await this.customerModel
        .findOne({
          "taxInfo.taxId": data.taxId,
          tenantId: new Types.ObjectId(context.tenantId),
        })
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

    // Check duplicate taxIds within the file
    const taxIds = rows.map((r) => normalizeString(r.taxId)).filter(Boolean);
    const duplicates = taxIds.filter((t, i) => taxIds.indexOf(t) !== i);
    if (duplicates.length > 0) {
      const unique = [...new Set(duplicates)];
      warnings.push(
        `RIF/Cédulas duplicados en el archivo: ${unique.slice(0, 10).join(", ")}`,
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

    const tenantId = new Types.ObjectId(context.tenantId);
    const importJobId = new Types.ObjectId(context.importJobId);

    // Get next customerNumber
    let lastCustomer = await this.customerModel
      .findOne({ tenantId, customerNumber: /^CLI-/ })
      .sort({ customerNumber: -1 })
      .select("customerNumber")
      .lean();

    let nextNumber = 1;
    if (lastCustomer?.customerNumber) {
      const match = lastCustomer.customerNumber.match(/CLI-(\d+)/);
      if (match) nextNumber = parseInt(match[1], 10) + 1;
    }

    for (const row of validRows) {
      try {
        const { data, existingRecordId } = row;

        if (existingRecordId && context.options.updateExisting) {
          // ── UPDATE ──
          const existing = await this.customerModel.findById(existingRecordId).lean();
          if (!existing) { result.skipped++; continue; }

          const snapshot: Record<string, any> = {};
          const updateFields: Record<string, any> = {};

          if (data.name) { snapshot.name = existing.name; updateFields.name = data.name; }
          if (data.companyName) { snapshot.companyName = existing.companyName; updateFields.companyName = data.companyName; }
          if (data.email || data.phone) {
            snapshot.contacts = existing.contacts;
            const contacts = [...(existing.contacts || [])];
            if (data.email) {
              const idx = contacts.findIndex((c) => c.type === 'email' && c.isPrimary);
              if (idx >= 0) contacts[idx] = { ...contacts[idx], value: data.email };
              else contacts.push({ type: 'email', value: data.email, isPrimary: true, isActive: true });
            }
            if (data.phone) {
              const idx = contacts.findIndex((c) => c.type === 'phone' && c.isPrimary);
              if (idx >= 0) contacts[idx] = { ...contacts[idx], value: data.phone };
              else contacts.push({ type: 'phone', value: data.phone, isPrimary: true, isActive: true });
            }
            updateFields.contacts = contacts;
          }
          if (data.customerType) { snapshot.customerType = existing.customerType; updateFields.customerType = data.customerType; }
          if (data.address || data.city || data.state) {
            snapshot.addresses = existing.addresses;
            const addr = {
              street: data.address || "",
              city: data.city || "",
              state: data.state || "",
              label: "Principal",
              isDefault: true,
            };
            updateFields.addresses = [addr];
          }
          if (data.taxId || data.taxType) {
            snapshot.taxInfo = existing.taxInfo;
            updateFields.taxInfo = {
              ...(existing.taxInfo || {}),
              ...(data.taxId ? { taxId: data.taxId } : {}),
              ...(data.taxType ? { taxType: data.taxType } : {}),
            };
          }

          updateFields.importJobId = importJobId;
          updateFields.importedAt = new Date();

          await this.customerModel.findByIdAndUpdate(existingRecordId, { $set: updateFields });
          result.updateSnapshots.push({ recordId: existingRecordId, previousValues: snapshot });
          result.updated++;
        } else {
          // ── CREATE ──
          // Check if taxId already exists
          if (data.taxId) {
            const existsByTax = await this.customerModel
              .findOne({ "taxInfo.taxId": data.taxId, tenantId })
              .select("_id")
              .lean();
            if (existsByTax && !context.options.updateExisting) {
              result.skipped++;
              result.errors.push({
                rowIndex: row.rowIndex,
                field: "taxId",
                message: `El cliente con RIF/Cédula "${data.taxId}" ya existe`,
              });
              continue;
            }
          }

          const customerNumber = `CLI-${String(nextNumber).padStart(6, "0")}`;
          nextNumber++;

          const contacts: any[] = [];
          if (data.email) contacts.push({ type: 'email', value: data.email, isPrimary: true, isActive: true });
          if (data.phone) contacts.push({ type: 'phone', value: data.phone, isPrimary: true, isActive: true });

          const customer = new this.customerModel({
            customerNumber,
            name: data.name,
            customerType: data.customerType || "individual",
            companyName: data.companyName || "",
            contacts,
            taxInfo: {
              taxId: data.taxId || "",
              taxType: data.taxType || "",
              taxName: data.name || "",
            },
            addresses: data.address
              ? [{
                  street: data.address,
                  city: data.city || "",
                  state: data.state || "",
                  label: "Principal",
                  isDefault: true,
                }]
              : [],
            notes: data.notes || "",
            isActive: data.isActive ?? true,
            loyaltyTier: "bronce",
            metrics: {
              totalPurchases: 0,
              totalSpent: 0,
              averageOrderValue: 0,
              lastPurchaseDate: null,
            },
            tenantId,
            createdBy: new Types.ObjectId(context.userId),
            importJobId,
            importedAt: new Date(),
          });

          await customer.save();
          result.created++;
        }
      } catch (error) {
        this.logger.warn(`Error importing customer row ${row.rowIndex}: ${error.message}`);
        result.failed++;
        result.errors.push({
          rowIndex: row.rowIndex,
          message: error.message || "Error desconocido al importar cliente",
        });
        if (!context.options.skipErrors) break;
      }
    }

    return result;
  }

  async rollback(importJobId: string, tenantId: string): Promise<RollbackResult> {
    const result = await this.customerModel.deleteMany({
      importJobId: new Types.ObjectId(importJobId),
      tenantId: new Types.ObjectId(tenantId),
    });

    return { deleted: result.deletedCount, restored: 0 };
  }

  async generateTemplate(): Promise<Buffer> {
    return generateImportTemplate({
      entityDisplayName: this.displayName,
      fields: this.getFieldDefinitions(),
      exampleRows: [
        {
          name: "Juan Pérez",
          customerType: "individual",
          email: "juan.perez@email.com",
          phone: "+58 412 1234567",
          taxId: "V-12345678",
          taxType: "V",
          companyName: "",
          address: "Av. Libertador, Torre Delta, Piso 5",
          city: "Caracas",
          state: "Distrito Capital",
          notes: "Cliente VIP",
          isActive: "Si",
        },
        {
          name: "Distribuidora El Sol C.A.",
          customerType: "business",
          email: "ventas@elsol.com",
          phone: "+58 212 5551234",
          taxId: "J-12345678-9",
          taxType: "J",
          companyName: "Distribuidora El Sol C.A.",
          address: "Zona Industrial, Galpón 12",
          city: "Valencia",
          state: "Carabobo",
          notes: "Pago a 30 días",
          isActive: "Si",
        },
      ],
    });
  }
}
