import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  BusinessLocation,
  BusinessLocationDocument,
} from "../../schemas/business-location.schema";
import {
  Warehouse,
  WarehouseDocument,
} from "../../schemas/warehouse.schema";
import {
  Inventory,
  InventoryDocument,
} from "../../schemas/inventory.schema";
import {
  CreateBusinessLocationDto,
  UpdateBusinessLocationDto,
  BusinessLocationFilterDto,
} from "../../dto/business-location.dto";

@Injectable()
export class BusinessLocationsService {
  constructor(
    @InjectModel(BusinessLocation.name)
    private readonly locationModel: Model<BusinessLocationDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
  ) {}

  async findAll(
    tenantId: string,
    filters?: BusinessLocationFilterDto,
  ) {
    const query: any = { tenantId, isDeleted: false };

    if (filters?.type) {
      query.type = filters.type;
    }
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive === "true";
    }

    return this.locationModel
      .find(query)
      .populate("warehouseIds", "name code isActive isDefault")
      .populate("manager", "firstName lastName email")
      .sort({ createdAt: -1 })
      .lean();
  }

  async findById(id: string, tenantId: string) {
    const location = await this.locationModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .populate("warehouseIds", "name code isActive isDefault location")
      .populate("manager", "firstName lastName email")
      .lean();

    if (!location) {
      throw new NotFoundException("Sede no encontrada.");
    }

    return location;
  }

  async create(
    dto: CreateBusinessLocationDto,
    tenantId: string,
    userId?: string,
  ): Promise<BusinessLocationDocument> {
    const code = dto.code?.trim().toUpperCase();
    if (!code) {
      throw new BadRequestException("El código es requerido.");
    }

    // Validate code uniqueness per tenant
    const exists = await this.locationModel
      .findOne({ tenantId, code, isDeleted: false })
      .lean();

    if (exists) {
      throw new BadRequestException(
        `Ya existe una sede con código ${code} en este tenant.`,
      );
    }

    const userOid = userId ? new Types.ObjectId(userId) : undefined;

    // Create a linked warehouse automatically
    const warehouse = new this.warehouseModel({
      name: dto.name,
      code: code,
      location: dto.address
        ? {
            address: dto.address.street,
            city: dto.address.city,
            state: dto.address.state,
            country: dto.address.country,
            lat: dto.address.coordinates?.lat,
            lng: dto.address.coordinates?.lng,
          }
        : undefined,
      tenantId,
      isActive: dto.isActive ?? true,
      isDefault: false,
      isDeleted: false,
      createdBy: userOid,
    });

    const savedWarehouse = await warehouse.save();

    // Create the business location
    const location = new this.locationModel({
      name: dto.name,
      code,
      type: dto.type,
      address: dto.address,
      phone: dto.phone,
      email: dto.email,
      manager: dto.manager ? new Types.ObjectId(dto.manager) : undefined,
      warehouseIds: [savedWarehouse._id],
      isActive: dto.isActive ?? true,
      isDeleted: false,
      tenantId,
      createdBy: userOid,
    });

    const savedLocation = await location.save();

    // Link warehouse back to location
    savedWarehouse.locationId = savedLocation._id as Types.ObjectId;
    await savedWarehouse.save();

    return savedLocation;
  }

  async update(
    id: string,
    dto: UpdateBusinessLocationDto,
    tenantId: string,
    userId?: string,
  ): Promise<BusinessLocationDocument> {
    const location = await this.locationModel.findOne({
      _id: id,
      tenantId,
      isDeleted: false,
    });

    if (!location) {
      throw new NotFoundException("Sede no encontrada.");
    }

    Object.assign(location, dto, {
      updatedBy: userId ? new Types.ObjectId(userId) : location.updatedBy,
    });

    return location.save();
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const location = await this.locationModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .lean();

    if (!location) {
      throw new NotFoundException("Sede no encontrada.");
    }

    // Check if any warehouse in this location has active inventory
    if (location.warehouseIds && location.warehouseIds.length > 0) {
      const activeInventory = await this.inventoryModel
        .findOne({
          tenantId,
          warehouseId: { $in: location.warehouseIds },
          totalQuantity: { $gt: 0 },
          isActive: true,
        })
        .lean();

      if (activeInventory) {
        throw new BadRequestException(
          "No se puede eliminar una sede con inventario activo. Transfiera todo el stock antes de eliminar.",
        );
      }
    }

    await this.locationModel.findByIdAndUpdate(id, {
      $set: { isDeleted: true, isActive: false },
    });
  }

  async getInventorySummary(id: string, tenantId: string) {
    const location = await this.locationModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .lean();

    if (!location) {
      throw new NotFoundException("Sede no encontrada.");
    }

    if (!location.warehouseIds || location.warehouseIds.length === 0) {
      return {
        locationId: id,
        locationName: location.name,
        totalProducts: 0,
        totalQuantity: 0,
        totalValue: 0,
        lowStockProducts: 0,
        warehouses: [],
      };
    }

    const pipeline = [
      {
        $match: {
          tenantId,
          warehouseId: { $in: location.warehouseIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          totalQuantity: { $sum: "$totalQuantity" },
          totalValue: {
            $sum: { $multiply: ["$totalQuantity", "$averageCostPrice"] },
          },
          lowStockProducts: {
            $sum: { $cond: ["$alerts.lowStock", 1, 0] },
          },
        },
      },
    ];

    const result = await this.inventoryModel.aggregate(pipeline).exec();
    const summary = result[0] || {
      totalProducts: 0,
      totalQuantity: 0,
      totalValue: 0,
      lowStockProducts: 0,
    };

    return {
      locationId: id,
      locationName: location.name,
      totalProducts: summary.totalProducts,
      totalQuantity: summary.totalQuantity,
      totalValue: Math.round(summary.totalValue * 100) / 100,
      lowStockProducts: summary.lowStockProducts,
    };
  }
}
