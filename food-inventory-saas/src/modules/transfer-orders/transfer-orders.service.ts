import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import {
  TransferOrder,
  TransferOrderDocument,
  TransferOrderStatus,
  TransferRequestType,
} from "../../schemas/transfer-order.schema";
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
  InventoryMovement,
  InventoryMovementDocument,
} from "../../schemas/inventory.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  CreateTransferOrderDto,
  CreateTransferRequestDto,
  UpdateTransferOrderDto,
  ApproveTransferOrderDto,
  ApproveRequestDto,
  RejectRequestDto,
  PrepareTransferOrderDto,
  ShipTransferOrderDto,
  ReceiveTransferOrderDto,
  ReportDiscrepancyDto,
  CancelTransferOrderDto,
  TransferOrderFilterDto,
} from "../../dto/transfer-order.dto";
import { OrganizationsService } from "../organizations/organizations.service";

@Injectable()
export class TransferOrdersService {
  constructor(
    @InjectModel(TransferOrder.name)
    private readonly transferOrderModel: Model<TransferOrderDocument>,
    @InjectModel(BusinessLocation.name)
    private readonly locationModel: Model<BusinessLocationDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(Tenant.name)
    private readonly tenantModel: Model<TenantDocument>,
    private readonly organizationsService: OrganizationsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────

  private async generateOrderNumber(tenantId: string): Promise<string> {
    const count = await this.transferOrderModel
      .countDocuments({ tenantId })
      .exec();
    return `TO-${String(count + 1).padStart(4, "0")}`;
  }

  private assertStatus(
    order: TransferOrderDocument,
    allowed: TransferOrderStatus[],
    action: string,
  ) {
    if (!allowed.includes(order.status as TransferOrderStatus)) {
      throw new BadRequestException(
        `No se puede ${action} una orden de transferencia con estado "${order.status}". Estados permitidos: ${allowed.join(", ")}`,
      );
    }
  }

  /**
   * Find order by ID — supports cross-tenant (matches tenantId OR destinationTenantId)
   */
  private async findOrderOrFail(
    id: string,
    tenantId: string,
  ): Promise<TransferOrderDocument> {
    const tenantOid = new Types.ObjectId(tenantId);
    const order = await this.transferOrderModel.findOne({
      _id: id,
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId },
        { destinationTenantId: tenantOid },
      ],
      isDeleted: false,
    });
    if (!order) {
      throw new NotFoundException("Orden de transferencia no encontrada.");
    }
    return order;
  }

  /**
   * Check if a transfer is cross-tenant
   */
  private isCrossTenant(order: TransferOrderDocument): boolean {
    return !!(
      order.destinationTenantId &&
      order.tenantId.toString() !== order.destinationTenantId.toString()
    );
  }

  /**
   * Get allowed state transitions based on current status and type
   */
  private getAllowedTransitions(
    currentStatus: TransferOrderStatus,
    type: string,
  ): TransferOrderStatus[] {
    const transitions = {
      push: {
        [TransferOrderStatus.DRAFT]: [
          TransferOrderStatus.PUSH_REQUESTED,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.PUSH_REQUESTED]: [
          TransferOrderStatus.PUSH_APPROVED,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.PUSH_APPROVED]: [
          TransferOrderStatus.IN_PREPARATION,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.IN_PREPARATION]: [
          TransferOrderStatus.IN_TRANSIT,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.IN_TRANSIT]: [
          TransferOrderStatus.RECEIVED,
          TransferOrderStatus.PARTIALLY_RECEIVED,
          TransferOrderStatus.DELIVERED,
        ],
        [TransferOrderStatus.DELIVERED]: [
          TransferOrderStatus.RECEIVED,
          TransferOrderStatus.PARTIALLY_RECEIVED,
        ],
        [TransferOrderStatus.PARTIALLY_RECEIVED]: [
          TransferOrderStatus.RECEIVED,
        ],
        [TransferOrderStatus.RECEIVED]: [],
        [TransferOrderStatus.CANCELLED]: [],
      },
      pull: {
        [TransferOrderStatus.DRAFT]: [
          TransferOrderStatus.PULL_REQUESTED,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.PULL_REQUESTED]: [
          TransferOrderStatus.PULL_APPROVED,
          TransferOrderStatus.PULL_REJECTED,
          TransferOrderStatus.CANCELLED,
        ],
        [TransferOrderStatus.PULL_APPROVED]: [
          TransferOrderStatus.IN_PREPARATION,
        ],
        [TransferOrderStatus.PULL_REJECTED]: [],
        [TransferOrderStatus.IN_PREPARATION]: [
          TransferOrderStatus.IN_TRANSIT,
        ],
        [TransferOrderStatus.IN_TRANSIT]: [
          TransferOrderStatus.RECEIVED,
          TransferOrderStatus.PARTIALLY_RECEIVED,
          TransferOrderStatus.DELIVERED,
        ],
        [TransferOrderStatus.DELIVERED]: [
          TransferOrderStatus.RECEIVED,
          TransferOrderStatus.PARTIALLY_RECEIVED,
        ],
        [TransferOrderStatus.PARTIALLY_RECEIVED]: [
          TransferOrderStatus.RECEIVED,
        ],
        [TransferOrderStatus.RECEIVED]: [],
        [TransferOrderStatus.CANCELLED]: [],
      },
    };

    return transitions[type]?.[currentStatus] || [];
  }

  /**
   * Validate workflow transition with tenant/user authorization
   */
  private validateWorkflowTransition(
    order: TransferOrderDocument,
    targetStatus: TransferOrderStatus,
    currentTenantId: string,
    action: string,
  ): void {
    const isSource =
      order.tenantId.toString() === currentTenantId ||
      order.sourceTenantId?.toString() === currentTenantId;
    const isDestination =
      order.destinationTenantId?.toString() === currentTenantId ||
      // For same-tenant transfers, if destinationTenantId is not set, consider current tenant as destination
      (!order.destinationTenantId && order.tenantId.toString() === currentTenantId);
    const isPush = order.type === "push";
    const isPull = order.type === "pull";

    // Validaciones específicas PUSH
    if (isPush) {
      if (
        targetStatus === TransferOrderStatus.PUSH_REQUESTED &&
        !isSource
      ) {
        throw new BadRequestException(
          "Solo la sede origen puede solicitar aprobación",
        );
      }
      if (
        targetStatus === TransferOrderStatus.PUSH_APPROVED &&
        !isSource
      ) {
        throw new BadRequestException("Solo la sede origen puede aprobar");
      }
    }

    // Validaciones específicas PULL
    if (isPull) {
      if (
        targetStatus === TransferOrderStatus.PULL_REQUESTED &&
        !isDestination
      ) {
        throw new BadRequestException(
          "Solo la sede destino puede enviar solicitud",
        );
      }
      if (
        [
          TransferOrderStatus.PULL_APPROVED,
          TransferOrderStatus.PULL_REJECTED,
        ].includes(targetStatus) &&
        !isSource
      ) {
        throw new BadRequestException(
          "Solo la sede origen puede aprobar/rechazar solicitudes",
        );
      }
    }

    // Validaciones compartidas
    if (
      [
        TransferOrderStatus.IN_PREPARATION,
        TransferOrderStatus.IN_TRANSIT,
      ].includes(targetStatus) &&
      !isSource
    ) {
      throw new BadRequestException("Solo la sede origen puede despachar");
    }
    if (
      [
        TransferOrderStatus.RECEIVED,
        TransferOrderStatus.PARTIALLY_RECEIVED,
      ].includes(targetStatus) &&
      !isDestination
    ) {
      throw new BadRequestException(
        "Solo la sede destino puede confirmar recepción",
      );
    }

    // Validar transiciones permitidas
    const allowedTransitions = this.getAllowedTransitions(
      order.status,
      order.type,
    );
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `No se puede ${action} una orden de transferencia desde estado "${order.status}" a "${targetStatus}". Transiciones permitidas: ${allowedTransitions.join(", ")}`,
      );
    }
  }

  // ─── CRUD ───────────────────────────────────────────────

  async findAll(tenantId: string, filters: TransferOrderFilterDto) {
    const tenantOid = new Types.ObjectId(tenantId);

    // Show transfers where this tenant is source OR destination
    const query: any = {
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId },
        { destinationTenantId: tenantOid },
      ],
      isDeleted: false,
    };

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.sourceLocationId)
      query.sourceLocationId = new Types.ObjectId(filters.sourceLocationId);
    if (filters.destinationLocationId)
      query.destinationLocationId = new Types.ObjectId(
        filters.destinationLocationId,
      );

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const limit = Math.min(filters.limit || 50, 200);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.transferOrderModel
        .find(query)
        .populate("sourceLocationId", "name code")
        .populate("destinationLocationId", "name code")
        .populate("sourceWarehouseId", "name code")
        .populate("destinationWarehouseId", "name code")
        .populate("sourceTenantId", "name")
        .populate("destinationTenantId", "name")
        .populate("requestedBy", "firstName lastName")
        .populate("createdBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transferOrderModel.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findById(id: string, tenantId: string) {
    const tenantOid = new Types.ObjectId(tenantId);
    const order = await this.transferOrderModel
      .findOne({
        _id: id,
        $or: [
          { tenantId: tenantOid },
          { tenantId: tenantId },
          { destinationTenantId: tenantOid },
        ],
        isDeleted: false,
      })
      .populate("sourceLocationId", "name code type")
      .populate("destinationLocationId", "name code type")
      .populate("sourceWarehouseId", "name code")
      .populate("destinationWarehouseId", "name code")
      .populate("sourceTenantId", "name")
      .populate("destinationTenantId", "name")
      .populate("requestedBy", "firstName lastName email")
      .populate("approvedBy", "firstName lastName email")
      .populate("shippedBy", "firstName lastName email")
      .populate("receivedBy", "firstName lastName email")
      .populate("cancelledBy", "firstName lastName email")
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (!order) {
      throw new NotFoundException("Orden de transferencia no encontrada.");
    }
    return order;
  }

  async create(
    dto: CreateTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const isCrossTenant =
      dto.destinationTenantId &&
      dto.destinationTenantId !== tenantId;

    // For cross-tenant: validate both tenants belong to the same family
    if (isCrossTenant) {
      const familyIds =
        await this.organizationsService.getFamilyTenantIds(tenantId);
      const destInFamily = familyIds.some(
        (fid) => fid.toString() === dto.destinationTenantId,
      );
      if (!destInFamily) {
        throw new BadRequestException(
          "El tenant destino no pertenece al mismo grupo de sedes.",
        );
      }
    }

    // Validate source warehouse exists in source tenant
    const sourceWarehouse = await this.warehouseModel
      .findOne({
        _id: dto.sourceWarehouseId,
        tenantId,
        isDeleted: { $ne: true },
      })
      .lean();
    if (!sourceWarehouse)
      throw new NotFoundException("Almacén origen no encontrado.");

    // Validate destination warehouse exists in destination tenant
    const destTenantId = isCrossTenant ? dto.destinationTenantId : tenantId;
    const destWarehouse = await this.warehouseModel
      .findOne({
        _id: dto.destinationWarehouseId,
        tenantId: destTenantId,
        isDeleted: { $ne: true },
      })
      .lean();
    if (!destWarehouse)
      throw new NotFoundException("Almacén destino no encontrado.");

    // Validate locations if provided (intra-tenant)
    if (dto.sourceLocationId && dto.destinationLocationId && !isCrossTenant) {
      if (dto.sourceLocationId === dto.destinationLocationId) {
        throw new BadRequestException(
          "La sede origen y destino no pueden ser la misma.",
        );
      }
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        "Debe incluir al menos un producto en la transferencia.",
      );
    }

    // Bulk-lookup product names/SKUs for items missing them
    const productIds = dto.items.map((i) => new Types.ObjectId(i.productId));
    const products = await this.productModel
      .find({ _id: { $in: productIds } }, { name: 1, sku: 1 })
      .lean();
    const productMap = new Map(
      products.map((p) => [p._id.toString(), p]),
    );

    const orderNumber = await this.generateOrderNumber(tenantId);
    const userOid = new Types.ObjectId(userId);

    const orderData: any = {
      orderNumber,
      status: TransferOrderStatus.DRAFT,
      type: dto.type || TransferRequestType.PUSH,
      sourceWarehouseId: new Types.ObjectId(dto.sourceWarehouseId),
      destinationWarehouseId: new Types.ObjectId(dto.destinationWarehouseId),
      sourceTenantId: new Types.ObjectId(tenantId),
      items: dto.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: new Types.ObjectId(item.productId),
          productSku: item.productSku || product?.sku,
          productName: item.productName || product?.name,
          variantId: item.variantId
            ? new Types.ObjectId(item.variantId)
            : undefined,
          variantSku: item.variantSku,
          requestedQuantity: item.requestedQuantity,
          unitCost: item.unitCost ?? 0,
          notes: item.notes,
          lotNumber: item.lotNumber,
        };
      }),
      notes: dto.notes,
      reference: dto.reference,
      tenantId,
      createdBy: userOid,
    };

    if (dto.sourceLocationId) {
      orderData.sourceLocationId = new Types.ObjectId(dto.sourceLocationId);
    }
    if (dto.destinationLocationId) {
      orderData.destinationLocationId = new Types.ObjectId(
        dto.destinationLocationId,
      );
    }
    if (isCrossTenant) {
      orderData.destinationTenantId = new Types.ObjectId(
        dto.destinationTenantId,
      );
    } else {
      orderData.destinationTenantId = new Types.ObjectId(tenantId);
    }

    const order = new this.transferOrderModel(orderData);
    return order.save();
  }

  async update(
    id: string,
    dto: UpdateTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(order, [TransferOrderStatus.DRAFT], "editar");

    if (dto.sourceLocationId && dto.destinationLocationId) {
      if (dto.sourceLocationId === dto.destinationLocationId) {
        throw new BadRequestException(
          "La sede origen y destino no pueden ser la misma.",
        );
      }
    }

    if (dto.items) {
      order.items = dto.items.map((item) => ({
        productId: new Types.ObjectId(item.productId),
        productSku: item.productSku,
        productName: item.productName,
        variantId: item.variantId
          ? new Types.ObjectId(item.variantId)
          : undefined,
        variantSku: item.variantSku,
        requestedQuantity: item.requestedQuantity,
        unitCost: item.unitCost ?? 0,
        notes: item.notes,
        lotNumber: item.lotNumber,
      })) as any;
    }

    if (dto.sourceLocationId)
      order.sourceLocationId = new Types.ObjectId(dto.sourceLocationId);
    if (dto.sourceWarehouseId)
      order.sourceWarehouseId = new Types.ObjectId(dto.sourceWarehouseId);
    if (dto.destinationLocationId)
      order.destinationLocationId = new Types.ObjectId(
        dto.destinationLocationId,
      );
    if (dto.destinationWarehouseId)
      order.destinationWarehouseId = new Types.ObjectId(
        dto.destinationWarehouseId,
      );
    if (dto.notes !== undefined) order.notes = dto.notes;
    if (dto.reference !== undefined) order.reference = dto.reference;

    order.updatedBy = new Types.ObjectId(userId);
    return order.save();
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(order, [TransferOrderStatus.DRAFT], "eliminar");

    order.isDeleted = true;
    await order.save();
  }

  // ─── State Transitions ─────────────────────────────────

  async request(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(order, [TransferOrderStatus.DRAFT], "solicitar");

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(
        "No se puede solicitar una transferencia sin productos.",
      );
    }

    // Determine target status based on type
    const targetStatus =
      order.type === TransferRequestType.PUSH
        ? TransferOrderStatus.PUSH_REQUESTED
        : TransferOrderStatus.PULL_REQUESTED;

    this.validateWorkflowTransition(order, targetStatus, tenantId, "solicitar");

    order.status = targetStatus;
    order.requestedBy = new Types.ObjectId(userId);
    order.requestedAt = new Date();
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  async approve(
    id: string,
    dto: ApproveTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [TransferOrderStatus.PUSH_REQUESTED],
      "aprobar",
    );

    const targetStatus = TransferOrderStatus.PUSH_APPROVED;
    this.validateWorkflowTransition(order, targetStatus, tenantId, "aprobar");

    // If items with adjusted quantities are provided, apply them
    if (dto.items && dto.items.length > 0) {
      for (const approveItem of dto.items) {
        const orderItem = order.items.find((i) => {
          const match = i.productId.toString() === approveItem.productId;
          if (approveItem.variantId) {
            return match && i.variantId?.toString() === approveItem.variantId;
          }
          return match;
        });
        if (orderItem) {
          orderItem.approvedQuantity = approveItem.approvedQuantity;
        }
      }
    } else {
      // Auto-approve all items at requested quantities
      for (const item of order.items) {
        item.approvedQuantity = item.requestedQuantity;
      }
    }

    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[Aprobación] ${dto.notes}`
        : `[Aprobación] ${dto.notes}`;
    }

    order.status = targetStatus;
    order.approvedBy = new Types.ObjectId(userId);
    order.approvedAt = new Date();
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  // ─── PULL Flow Methods ──────────────────────────────────

  /**
   * Create transfer request (PULL flow - destino solicita)
   */
  async createRequest(
    dto: CreateTransferRequestDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const isCrossTenant = dto.sourceTenantId && dto.sourceTenantId !== tenantId;

    // For cross-tenant: validate both tenants belong to the same family
    if (isCrossTenant) {
      const familyIds =
        await this.organizationsService.getFamilyTenantIds(tenantId);
      const sourceInFamily = familyIds.some(
        (fid) => fid.toString() === dto.sourceTenantId,
      );
      if (!sourceInFamily) {
        throw new BadRequestException(
          "El tenant origen no pertenece al mismo grupo de sedes.",
        );
      }
    }

    // Validate source warehouse exists in source tenant
    const sourceTenantId = isCrossTenant ? dto.sourceTenantId : tenantId;
    const sourceWarehouse = await this.warehouseModel
      .findOne({
        _id: dto.sourceWarehouseId,
        tenantId: sourceTenantId,
        isDeleted: { $ne: true },
      })
      .lean();
    if (!sourceWarehouse)
      throw new NotFoundException("Almacén origen no encontrado.");

    // Validate destination warehouse exists in current tenant (requester)
    const destWarehouse = await this.warehouseModel
      .findOne({
        _id: dto.destinationWarehouseId,
        tenantId,
        isDeleted: { $ne: true },
      })
      .lean();
    if (!destWarehouse)
      throw new NotFoundException("Almacén destino no encontrado.");

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        "Debe incluir al menos un producto en la solicitud.",
      );
    }

    // Bulk-lookup product names/SKUs
    const productIds = dto.items.map((i) => new Types.ObjectId(i.productId));
    const products = await this.productModel
      .find({ _id: { $in: productIds } }, { name: 1, sku: 1 })
      .lean();
    const productMap = new Map(
      products.map((p) => [p._id.toString(), p]),
    );

    const orderNumber = await this.generateOrderNumber(tenantId);
    const userOid = new Types.ObjectId(userId);

    const orderData: any = {
      orderNumber,
      status: TransferOrderStatus.DRAFT,
      type: TransferRequestType.PULL,
      sourceWarehouseId: new Types.ObjectId(dto.sourceWarehouseId),
      destinationWarehouseId: new Types.ObjectId(dto.destinationWarehouseId),
      sourceTenantId: new Types.ObjectId(sourceTenantId),
      destinationTenantId: new Types.ObjectId(tenantId),
      items: dto.items.map((item) => {
        const product = productMap.get(item.productId);
        return {
          productId: new Types.ObjectId(item.productId),
          productSku: item.productSku || product?.sku,
          productName: item.productName || product?.name,
          variantId: item.variantId
            ? new Types.ObjectId(item.variantId)
            : undefined,
          variantSku: item.variantSku,
          requestedQuantity: item.requestedQuantity,
          unitCost: item.unitCost ?? 0,
          notes: item.notes,
          lotNumber: item.lotNumber,
        };
      }),
      notes: dto.notes,
      reference: dto.reference,
      tenantId, // Request creator is the destination
      createdBy: userOid,
    };

    const order = new this.transferOrderModel(orderData);
    return order.save();
  }

  /**
   * Submit transfer request (DRAFT -> PULL_REQUESTED)
   */
  async submitRequest(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(order, [TransferOrderStatus.DRAFT], "enviar solicitud");

    if (order.type !== TransferRequestType.PULL) {
      throw new BadRequestException(
        "Solo las solicitudes de tipo PULL pueden ser enviadas.",
      );
    }

    if (!order.items || order.items.length === 0) {
      throw new BadRequestException(
        "No se puede enviar una solicitud sin productos.",
      );
    }

    const targetStatus = TransferOrderStatus.PULL_REQUESTED;
    this.validateWorkflowTransition(
      order,
      targetStatus,
      tenantId,
      "enviar solicitud",
    );

    order.status = targetStatus;
    order.requestedBy = new Types.ObjectId(userId);
    order.requestedAt = new Date();
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  /**
   * Approve transfer request (PULL_REQUESTED -> PULL_APPROVED)
   */
  async approveRequest(
    id: string,
    dto: ApproveRequestDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [TransferOrderStatus.PULL_REQUESTED],
      "aprobar solicitud",
    );

    const targetStatus = TransferOrderStatus.PULL_APPROVED;
    this.validateWorkflowTransition(
      order,
      targetStatus,
      tenantId,
      "aprobar solicitud",
    );

    // If items with adjusted quantities are provided, apply them
    if (dto.items && dto.items.length > 0) {
      for (const approveItem of dto.items) {
        const orderItem = order.items.find((i) => {
          const match = i.productId.toString() === approveItem.productId;
          if (approveItem.variantId) {
            return match && i.variantId?.toString() === approveItem.variantId;
          }
          return match;
        });
        if (orderItem) {
          orderItem.approvedQuantity = approveItem.approvedQuantity;
        }
      }
    } else {
      // Auto-approve all items at requested quantities
      for (const item of order.items) {
        item.approvedQuantity = item.requestedQuantity;
      }
    }

    if (dto.approvalNotes) {
      order.approvalNotes = dto.approvalNotes;
    }

    order.status = targetStatus;
    order.approvalReviewedBy = new Types.ObjectId(userId);
    order.approvalReviewedAt = new Date();
    order.approvalDecision = "approved";
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  /**
   * Reject transfer request (PULL_REQUESTED -> PULL_REJECTED)
   */
  async rejectRequest(
    id: string,
    dto: RejectRequestDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [TransferOrderStatus.PULL_REQUESTED],
      "rechazar solicitud",
    );

    const targetStatus = TransferOrderStatus.PULL_REJECTED;
    this.validateWorkflowTransition(
      order,
      targetStatus,
      tenantId,
      "rechazar solicitud",
    );

    order.status = targetStatus;
    order.approvalReviewedBy = new Types.ObjectId(userId);
    order.approvalReviewedAt = new Date();
    order.approvalDecision = "rejected";
    order.approvalNotes = dto.approvalNotes || dto.reason;
    order.cancellationReason = dto.reason;
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  /**
   * Mark as in preparation (PUSH_APPROVED/PULL_APPROVED -> IN_PREPARATION)
   */
  async markAsInPreparation(
    id: string,
    dto: PrepareTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [TransferOrderStatus.PUSH_APPROVED, TransferOrderStatus.PULL_APPROVED],
      "marcar como en preparación",
    );

    const targetStatus = TransferOrderStatus.IN_PREPARATION;
    this.validateWorkflowTransition(
      order,
      targetStatus,
      tenantId,
      "marcar como en preparación",
    );

    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[Preparación] ${dto.notes}`
        : `[Preparación] ${dto.notes}`;
    }

    order.status = targetStatus;
    order.inPreparationBy = new Types.ObjectId(userId);
    order.inPreparationAt = new Date();
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  async ship(
    id: string,
    dto: ShipTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);

    // Normalize legacy statuses from before push/pull refactor
    const legacyMap: Record<string, TransferOrderStatus> = {
      approved: TransferOrderStatus.PUSH_APPROVED,
      requested: TransferOrderStatus.PUSH_REQUESTED,
    };
    if (legacyMap[order.status as string]) {
      order.status = legacyMap[order.status as string];
      await order.save();
    }

    this.assertStatus(
      order,
      [
        TransferOrderStatus.PUSH_APPROVED,
        TransferOrderStatus.PULL_APPROVED,
        TransferOrderStatus.IN_PREPARATION,
      ],
      "despachar",
    );

    const targetStatus = TransferOrderStatus.IN_TRANSIT;
    this.validateWorkflowTransition(order, targetStatus, tenantId, "despachar");

    // Source tenant is always the order's tenantId (the creator for PUSH, source for PULL)
    const sourceTenantId = order.tenantId.toString();
    const sourceTenantOid = new Types.ObjectId(sourceTenantId);
    const userOid = new Types.ObjectId(userId);
    const transferId = uuidv4();

    // Determine shipped quantities
    for (const item of order.items) {
      const dtoItem = dto.items?.find((i) => {
        const match = i.productId === item.productId.toString();
        if (i.variantId) {
          return match && i.variantId === item.variantId?.toString();
        }
        return match;
      });

      item.shippedQuantity =
        dtoItem?.shippedQuantity ??
        item.approvedQuantity ??
        item.requestedQuantity;
    }

    // Validate stock and create OUT movements for each item
    for (const item of order.items) {
      const qty = item.shippedQuantity;
      if (!qty || qty <= 0) continue;

      // Convert to base units if a selling unit was selected
      const baseQty = item.conversionFactor ? qty * item.conversionFactor : qty;

      const sourceWarehouseOid = new Types.ObjectId(
        order.sourceWarehouseId.toString(),
      );

      // Try warehouse-specific first, then fallback to unassigned inventory
      // Handle productId type inconsistencies (ObjectId vs String)
      const productIdOid = new Types.ObjectId(item.productId.toString());
      let sourceInventory = await this.inventoryModel.findOne({
        productId: { $in: [item.productId, productIdOid, item.productId.toString()] },
        warehouseId: sourceWarehouseOid,
        tenantId: { $in: [sourceTenantId, sourceTenantOid] },
        isDeleted: { $ne: true },
      });

      if (!sourceInventory) {
        // Fallback: find inventory without warehouseId (pre-warehouse records)
        sourceInventory = await this.inventoryModel.findOne({
          productId: { $in: [item.productId, productIdOid, item.productId.toString()] },
          $or: [
            { warehouseId: null },
            { warehouseId: { $exists: false } },
          ],
          tenantId: { $in: [sourceTenantId, sourceTenantOid] },
          isDeleted: { $ne: true },
        });

        // Assign warehouse to the record for future consistency
        if (sourceInventory) {
          sourceInventory.warehouseId = sourceWarehouseOid;
        }
      }

      if (!sourceInventory) {
        throw new NotFoundException(
          `No existe inventario del producto ${item.productName || item.productSku || item.productId} en el almacén origen.`,
        );
      }

      const available = sourceInventory.availableQuantity ?? 0;
      if (available < baseQty) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.productName || item.productSku}. Disponible: ${available}, Solicitado: ${baseQty}${item.selectedUnit ? ` (${qty} ${item.selectedUnit})` : ''}`,
        );
      }

      // Decrement source inventory (always in base units)
      sourceInventory.availableQuantity = available - baseQty;
      sourceInventory.totalQuantity =
        (sourceInventory.totalQuantity ?? 0) - baseQty;
      await sourceInventory.save();

      // Create OUT movement
      const unitCost = item.unitCost || sourceInventory.averageCostPrice || 0;

      await this.movementModel.create({
        inventoryId: sourceInventory._id,
        productId: item.productId,
        productSku: item.productSku || sourceInventory.productSku,
        warehouseId: order.sourceWarehouseId,
        movementType: "TRANSFER",
        quantity: baseQty,
        unitCost,
        totalCost: baseQty * unitCost,
        reason: `Despacho transferencia ${order.orderNumber}${item.selectedUnit ? ` (${qty} ${item.selectedUnit})` : ''}`,
        reference: order.orderNumber,
        transferId,
        sourceWarehouseId: order.sourceWarehouseId,
        destinationWarehouseId: order.destinationWarehouseId,
        balanceAfter: {
          totalQuantity: sourceInventory.totalQuantity,
          availableQuantity: sourceInventory.availableQuantity,
          reservedQuantity: sourceInventory.reservedQuantity,
          averageCostPrice: sourceInventory.averageCostPrice,
        },
        createdBy: userOid,
        tenantId: sourceTenantOid,
      });
    }

    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[Despacho] ${dto.notes}`
        : `[Despacho] ${dto.notes}`;
    }

    // Save tracking info
    if (dto.trackingNumber) {
      order.trackingNumber = dto.trackingNumber;
    }
    if (dto.carrier) {
      order.carrier = dto.carrier;
    }
    if (dto.estimatedArrival) {
      order.estimatedArrival = new Date(dto.estimatedArrival);
    }

    order.status = targetStatus;
    order.shippedBy = userOid;
    order.shippedAt = new Date();
    order.updatedBy = userOid;

    return order.save();
  }

  async receive(
    id: string,
    dto: ReceiveTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [TransferOrderStatus.IN_TRANSIT, TransferOrderStatus.DELIVERED],
      "recibir",
    );

    // Validate that only destination can receive
    const targetStatus = TransferOrderStatus.RECEIVED; // Will be adjusted to PARTIALLY_RECEIVED if needed
    this.validateWorkflowTransition(order, targetStatus, tenantId, "recibir");

    const crossTenant = this.isCrossTenant(order);

    // Destination tenant: for cross-tenant use destinationTenantId, otherwise order's tenantId
    const destTenantId = crossTenant
      ? order.destinationTenantId!.toString()
      : order.tenantId.toString();
    const destTenantOid = new Types.ObjectId(destTenantId);

    // Source tenant for looking up OUT movements
    const sourceTenantId = order.tenantId.toString();
    const sourceTenantOid = new Types.ObjectId(sourceTenantId);

    const userOid = new Types.ObjectId(userId);

    // Find the transferId from the OUT movements created during ship
    const existingOutMovement = await this.movementModel
      .findOne({
        reference: order.orderNumber,
        sourceWarehouseId: order.sourceWarehouseId,
        tenantId: { $in: [sourceTenantId, sourceTenantOid] },
        movementType: "TRANSFER",
      })
      .lean();

    const transferId = existingOutMovement?.transferId || uuidv4();

    let allFullyReceived = true;

    for (const receiveItem of dto.items) {
      const orderItem = order.items.find((i) => {
        const match = i.productId.toString() === receiveItem.productId;
        if (receiveItem.variantId) {
          return match && i.variantId?.toString() === receiveItem.variantId;
        }
        return match;
      });

      if (!orderItem) {
        throw new BadRequestException(
          `Producto ${receiveItem.productId} no encontrado en la orden.`,
        );
      }

      const shipped = orderItem.shippedQuantity ?? 0;
      if (receiveItem.receivedQuantity > shipped) {
        throw new BadRequestException(
          `No se puede recibir más de lo despachado para ${orderItem.productName || orderItem.productSku}. Despachado: ${shipped}, Recibiendo: ${receiveItem.receivedQuantity}`,
        );
      }

      orderItem.receivedQuantity = receiveItem.receivedQuantity;

      if (receiveItem.receivedQuantity < shipped) {
        allFullyReceived = false;
      }

      if (receiveItem.receivedQuantity <= 0) continue;

      // For cross-tenant: find the matching product in dest tenant by SKU
      let destProductId = orderItem.productId;
      if (crossTenant && orderItem.productSku) {
        const destProduct = await this.productModel.findOne({
          tenantId: destTenantOid,
          sku: orderItem.productSku,
          isActive: true,
        }).lean();

        if (destProduct) {
          destProductId = destProduct._id as Types.ObjectId;
        }
        // If no matching product found, we'll use the source productId
        // (inventory will be created but product won't be browsable until synced)
      }

      // Find or create destination inventory
      let destInventory = await this.inventoryModel.findOne({
        productId: destProductId,
        warehouseId: order.destinationWarehouseId,
        tenantId: { $in: [destTenantId, destTenantOid] },
      });

      if (!destInventory) {
        // Get source inventory info for defaults
        const sourceInventory = await this.inventoryModel
          .findOne({
            productId: orderItem.productId,
            warehouseId: order.sourceWarehouseId,
            tenantId: { $in: [sourceTenantId, sourceTenantOid] },
          })
          .lean();

        destInventory = new this.inventoryModel({
          productId: destProductId,
          warehouseId: order.destinationWarehouseId,
          productSku: orderItem.productSku || sourceInventory?.productSku,
          productName: orderItem.productName || sourceInventory?.productName,
          variantId: orderItem.variantId,
          variantSku: orderItem.variantSku || sourceInventory?.variantSku,
          totalQuantity: 0,
          availableQuantity: 0,
          reservedQuantity: 0,
          committedQuantity: 0,
          averageCostPrice: sourceInventory?.averageCostPrice ?? 0,
          lastCostPrice: sourceInventory?.lastCostPrice ?? 0,
          lots: [],
          attributes: sourceInventory?.attributes,
          location: { warehouse: "", zone: "", aisle: "", shelf: "", bin: "" },
          alerts: {
            lowStock: false,
            nearExpiration: false,
            expired: false,
            overstock: false,
          },
          metrics: {
            turnoverRate: 0,
            daysOnHand: 0,
            averageDailySales: 0,
            seasonalityFactor: 1,
          },
          isActive: true,
          createdBy: userOid,
          tenantId: destTenantId,
        });
        await destInventory.save();
      }

      const qty = receiveItem.receivedQuantity;

      // Convert to base units if a selling unit was selected
      const baseQty = orderItem.conversionFactor ? qty * orderItem.conversionFactor : qty;

      // Increment destination inventory (always in base units)
      destInventory.availableQuantity =
        (destInventory.availableQuantity ?? 0) + baseQty;
      destInventory.totalQuantity = (destInventory.totalQuantity ?? 0) + baseQty;
      await destInventory.save();

      // Create IN movement (in destination tenant)
      const unitCost =
        orderItem.unitCost || destInventory.averageCostPrice || 0;

      await this.movementModel.create({
        inventoryId: destInventory._id,
        productId: destProductId,
        productSku: orderItem.productSku || destInventory.productSku,
        warehouseId: order.destinationWarehouseId,
        movementType: "TRANSFER",
        quantity: baseQty,
        unitCost,
        totalCost: baseQty * unitCost,
        reason: `Recepción transferencia ${order.orderNumber}${orderItem.selectedUnit ? ` (${qty} ${orderItem.selectedUnit})` : ''}`,
        reference: order.orderNumber,
        transferId,
        sourceWarehouseId: order.sourceWarehouseId,
        destinationWarehouseId: order.destinationWarehouseId,
        balanceAfter: {
          totalQuantity: destInventory.totalQuantity,
          availableQuantity: destInventory.availableQuantity,
          reservedQuantity: destInventory.reservedQuantity,
          averageCostPrice: destInventory.averageCostPrice,
        },
        createdBy: userOid,
        tenantId: destTenantOid,
      });
    }

    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[Recepción] ${dto.notes}`
        : `[Recepción] ${dto.notes}`;
    }

    if (dto.receiptNotes) {
      order.receiptNotes = dto.receiptNotes;
    }

    // Detect discrepancies (received < shipped)
    const discrepancies: any[] = [];
    for (const item of order.items) {
      const shipped = item.shippedQuantity ?? 0;
      const received = item.receivedQuantity ?? 0;
      if (received > 0 && received < shipped) {
        discrepancies.push({
          productId: item.productId,
          variantId: item.variantId,
          expectedQuantity: shipped,
          receivedQuantity: received,
          reason: `Faltante: ${shipped - received} unidades`,
        });
      }
    }

    if (discrepancies.length > 0) {
      order.hasDiscrepancies = true;
      order.discrepancies = discrepancies;
    }

    order.status = allFullyReceived
      ? TransferOrderStatus.RECEIVED
      : TransferOrderStatus.PARTIALLY_RECEIVED;
    order.receivedBy = userOid;
    order.receivedAt = new Date();
    order.updatedBy = userOid;

    return order.save();
  }

  /**
   * Report discrepancies in received items
   */
  async reportDiscrepancy(
    id: string,
    dto: ReportDiscrepancyDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [
        TransferOrderStatus.RECEIVED,
        TransferOrderStatus.PARTIALLY_RECEIVED,
      ],
      "reportar discrepancia",
    );

    // Validate that only destination can report discrepancies
    const isDestination =
      order.destinationTenantId?.toString() === tenantId;
    if (!isDestination) {
      throw new BadRequestException(
        "Solo la sede destino puede reportar discrepancias",
      );
    }

    if (dto.notes) {
      order.notes = order.notes
        ? `${order.notes}\n[Discrepancia] ${dto.notes}`
        : `[Discrepancia] ${dto.notes}`;
    }

    // Convert DTO to schema format (string IDs to ObjectIds)
    const newDiscrepancies = dto.discrepancies.map((d) => ({
      productId: new Types.ObjectId(d.productId),
      variantId: d.variantId ? new Types.ObjectId(d.variantId) : undefined,
      expectedQuantity: d.expectedQuantity,
      receivedQuantity: d.receivedQuantity,
      reason: d.reason,
      images: d.images || [],
    }));

    order.hasDiscrepancies = true;
    order.discrepancies = [
      ...(order.discrepancies || []),
      ...newDiscrepancies,
    ];
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  async cancel(
    id: string,
    dto: CancelTransferOrderDto,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);
    this.assertStatus(
      order,
      [
        TransferOrderStatus.DRAFT,
        TransferOrderStatus.PUSH_REQUESTED,
        TransferOrderStatus.PUSH_APPROVED,
        TransferOrderStatus.PULL_REQUESTED,
        TransferOrderStatus.PULL_APPROVED,
        TransferOrderStatus.IN_PREPARATION,
      ],
      "cancelar",
    );

    const targetStatus = TransferOrderStatus.CANCELLED;
    this.validateWorkflowTransition(order, targetStatus, tenantId, "cancelar");

    order.status = targetStatus;
    order.cancelledBy = new Types.ObjectId(userId);
    order.cancelledAt = new Date();
    order.cancellationReason = dto.reason;
    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }

  /**
   * Revert transfer order back to DRAFT status
   * Allows editing after request/approval if changes are needed
   */
  async revertToDraft(
    id: string,
    tenantId: string,
    userId: string,
  ): Promise<TransferOrderDocument> {
    const order = await this.findOrderOrFail(id, tenantId);

    // Only allow reverting from early stages (before dispatch)
    this.assertStatus(
      order,
      [
        TransferOrderStatus.PUSH_REQUESTED,
        TransferOrderStatus.PUSH_APPROVED,
        TransferOrderStatus.PULL_REQUESTED,
        TransferOrderStatus.PULL_APPROVED,
      ],
      "regresar a borrador",
    );

    // Clear approval-related fields
    order.status = TransferOrderStatus.DRAFT;
    order.approvedBy = undefined;
    order.approvedAt = undefined;
    order.requestedBy = undefined;
    order.requestedAt = undefined;
    order.approvalReviewedBy = undefined;
    order.approvalReviewedAt = undefined;
    order.approvalDecision = undefined;
    order.approvalNotes = undefined;

    // Clear approved quantities (revert to requested)
    for (const item of order.items) {
      item.approvedQuantity = undefined;
    }

    order.updatedBy = new Types.ObjectId(userId);

    return order.save();
  }
}
