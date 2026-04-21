import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Supplier, SupplierDocument } from "../../../schemas/supplier.schema";
import { Customer, CustomerDocument } from "../../../schemas/customer.schema";
import { SuppliersService } from "../../suppliers/suppliers.service";

@Injectable()
export class SupplierToolsService {
  private readonly logger = new Logger(SupplierToolsService.name);

  constructor(
    @InjectModel(Supplier.name)
    private readonly supplierModel: Model<SupplierDocument>,
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    private readonly suppliersService: SuppliersService,
  ) {}

  async createSupplier(
    tenantId: string,
    args: {
      name: string;
      rif?: string;
      contactName?: string;
      contactPhone?: string;
      contactEmail?: string;
      categories?: string[];
    },
    user?: any,
  ): Promise<Record<string, any>> {
    try {
      const createDto: any = {
        name: args.name,
        supplierType: "distributor",
        tenantId,
      };

      if (args.rif) {
        createDto.taxInfo = { rif: args.rif };
      }

      if (args.contactName || args.contactPhone || args.contactEmail) {
        createDto.contacts = [
          {
            name: args.contactName || args.name,
            phone: args.contactPhone,
            email: args.contactEmail,
            isPrimary: true,
          },
        ];
      }

      if (args.categories?.length) {
        createDto.categories = args.categories;
      }

      const userContext = user
        ? { tenantId, _id: user._id || user }
        : { tenantId, _id: new Types.ObjectId() };

      const supplier = await this.suppliersService.create(
        createDto,
        userContext,
      );

      return {
        ok: true,
        summary: `✅ Proveedor creado: ${supplier.name} (${supplier.supplierNumber})${args.rif ? ` — RIF: ${args.rif}` : ""}`,
        supplierId: supplier._id.toString(),
        supplierNumber: supplier.supplierNumber,
        name: supplier.name,
      };
    } catch (error) {
      this.logger.error(`create_supplier failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error creando proveedor: ${(error as Error).message}`,
      };
    }
  }

  async getSuppliers(
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
          { tradeName: regex },
          { "taxInfo.rif": regex },
          { categories: regex },
        ];
      }

      const suppliers = await this.supplierModel
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select("name supplierNumber tradeName taxInfo.rif categories status metrics.totalOrders metrics.lastOrderDate")
        .lean();

      if (!suppliers.length) {
        return {
          ok: true,
          message: args.search
            ? `No se encontraron proveedores con "${args.search}".`
            : "No hay proveedores registrados.",
          suppliers: [],
        };
      }

      const formatted = suppliers.map((s: any) => ({
        nombre: s.name,
        numero: s.supplierNumber,
        rif: s.taxInfo?.rif || "—",
        categorias: s.categories?.join(", ") || "—",
        estado: s.status || "active",
        ordenes: s.metrics?.totalOrders || 0,
        ultimaOrden: s.metrics?.lastOrderDate
          ? new Date(s.metrics.lastOrderDate).toLocaleDateString("es-VE")
          : "—",
      }));

      return {
        ok: true,
        total: suppliers.length,
        suppliers: formatted,
      };
    } catch (error) {
      this.logger.error(`get_suppliers failed: ${(error as Error).message}`);
      return {
        ok: false,
        message: `Error buscando proveedores: ${(error as Error).message}`,
      };
    }
  }

  async getSupplierDetails(
    tenantId: string,
    args: { supplierName: string },
  ): Promise<Record<string, any>> {
    try {
      const supplier = await this.resolveSupplier(tenantId, args.supplierName);
      if (!supplier) {
        return {
          ok: false,
          message: `No se encontro el proveedor "${args.supplierName}".`,
        };
      }

      return {
        ok: true,
        supplier: {
          nombre: supplier.name,
          numero: supplier.supplierNumber,
          rif: (supplier as any).taxInfo?.rif || "—",
          tipo: supplier.supplierType,
          categorias: supplier.categories?.join(", ") || "—",
          contactos: supplier.contacts?.map((c: any) => ({
            nombre: c.name,
            telefono: c.phone,
            email: c.email,
          })),
          metricas: {
            totalOrdenes: supplier.metrics?.totalOrders || 0,
            totalComprado: supplier.metrics?.totalPurchased || 0,
            promedioOrden: supplier.metrics?.averageOrderValue || 0,
            tasaEntregaATiempo: supplier.metrics?.onTimeDeliveryRate || 0,
          },
          estado: supplier.status,
        },
      };
    } catch (error) {
      this.logger.error(
        `get_supplier_details failed: ${(error as Error).message}`,
      );
      return {
        ok: false,
        message: `Error: ${(error as Error).message}`,
      };
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────
  private async resolveSupplier(
    tenantId: string,
    nameOrId: string,
  ): Promise<SupplierDocument | null> {
    if (Types.ObjectId.isValid(nameOrId)) {
      return this.supplierModel
        .findOne({
          _id: new Types.ObjectId(nameOrId),
          tenantId: new Types.ObjectId(tenantId),
        })
        .lean() as any;
    }
    return this.supplierModel
      .findOne({
        tenantId: new Types.ObjectId(tenantId),
        name: new RegExp(this.escapeRegExp(nameOrId), "i"),
        isDeleted: { $ne: true },
      })
      .lean() as any;
  }

  private escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
