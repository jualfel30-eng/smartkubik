import { Injectable, BadRequestException, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Inventory, InventoryDocument, InventoryMovement, InventoryMovementDocument } from "../../schemas/inventory.schema";
import { Warehouse, WarehouseDocument } from "../../schemas/warehouse.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import { CreateInventoryMovementDto, CreateTransferDto, InventoryMovementFilterDto, MovementType } from "../../dto/inventory-movement.dto";
import { InventoryAlertsService } from "./inventory-alerts.service";

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectModel(InventoryMovement.name)
    private readonly movementModel: Model<InventoryMovementDocument>,
    @InjectModel(Warehouse.name)
    private readonly warehouseModel: Model<WarehouseDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    private readonly inventoryAlertsService: InventoryAlertsService,
  ) { }

  private snapshotBalance(inv: InventoryDocument) {
    return {
      totalQuantity: inv.totalQuantity ?? 0,
      availableQuantity: inv.availableQuantity ?? 0,
      reservedQuantity: inv.reservedQuantity ?? 0,
      averageCostPrice: inv.averageCostPrice ?? 0,
    };
  }

  /**
   * Punto de paso único para registrar un movimiento de inventario.
   * Toma el snapshot del saldo ANTES, ejecuta la mutación del caller, guarda el
   * inventario y persiste el movimiento con balanceBefore + balanceAfter. Así
   * ningún movimiento puede quedar sin su saldo: queda auto-explicativo por
   * construcción. La mutación es del caller para no cambiar su matemática.
   */
  async recordMovement(
    inventory: InventoryDocument,
    mutate: (inv: InventoryDocument) => void,
    movementData: Record<string, any>,
    session?: ClientSession,
  ): Promise<InventoryMovementDocument> {
    const balanceBefore = this.snapshotBalance(inventory);
    mutate(inventory);
    await inventory.save({ session });
    const balanceAfter = this.snapshotBalance(inventory);
    const movement = new this.movementModel({
      ...movementData,
      inventoryId: inventory._id,
      balanceBefore,
      balanceAfter,
    });
    return movement.save({ session });
  }

  async create(
    dto: CreateInventoryMovementDto,
    tenantId: string,
    userId: string,
    enforceStock = true,
    options?: { orderId?: string; origin?: string },
  ): Promise<InventoryMovementDocument> {
    const inventory = await this.inventoryModel.findOne({
      _id: dto.inventoryId,
      tenantId: new Types.ObjectId(tenantId),
    });
    if (!inventory) {
      throw new NotFoundException("Inventario no encontrado");
    }

    if (inventory.isActive === false) {
      throw new BadRequestException("El inventario está inactivo.");
    }

    // Validar que el producto esté activo
    const product = await this.productModel.findOne({
      _id: inventory.productId,
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });
    if (!product) {
      throw new BadRequestException("Producto no encontrado o inactivo.");
    }
    if (product.isActive === false) {
      throw new BadRequestException("Producto inactivo.");
    }

    // Validar warehouse si se envía uno explícito
    if (dto.warehouseId) {
      const warehouse = await this.warehouseModel.findOne({
        _id: new Types.ObjectId(dto.warehouseId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      });
      if (!warehouse) {
        throw new BadRequestException("Warehouse no encontrado o inactivo.");
      }
      if (warehouse.isActive === false) {
        throw new BadRequestException("Warehouse inactivo.");
      }
    }

    const qtyChange =
      dto.movementType === MovementType.OUT
        ? -dto.quantity
        : dto.quantity;

    const previousAvailable = inventory.availableQuantity ?? 0;
    const newAvailable = previousAvailable + qtyChange;
    const newTotal = (inventory.totalQuantity ?? 0) + qtyChange;

    if (enforceStock && dto.movementType !== MovementType.IN && newAvailable < 0) {
      throw new BadRequestException("Stock insuficiente para registrar salida.");
    }

    const finalWarehouseId =
      dto.warehouseId && Types.ObjectId.isValid(dto.warehouseId)
        ? new Types.ObjectId(dto.warehouseId)
        : inventory.warehouseId;
    const binOid =
      dto.binLocationId && Types.ObjectId.isValid(dto.binLocationId)
        ? new Types.ObjectId(dto.binLocationId)
        : undefined;

    const savedMovement = await this.recordMovement(
      inventory,
      (inv) => {
        inv.availableQuantity = newAvailable;
        inv.totalQuantity = newTotal;
        inv.warehouseId = finalWarehouseId;
        if (binOid) inv.binLocationId = binOid;
      },
      {
        productId: inventory.productId,
        productSku: inventory.productSku,
        warehouseId: finalWarehouseId,
        binLocationId: binOid,
        movementType: dto.movementType,
        quantity: dto.quantity,
        unitCost: dto.unitCost,
        totalCost: dto.quantity * dto.unitCost,
        reference: dto.reference,
        orderId:
          options?.orderId && Types.ObjectId.isValid(options.orderId)
            ? new Types.ObjectId(options.orderId)
            : undefined,
        reason: dto.reason || options?.origin,
        createdBy: new Types.ObjectId(userId),
        tenantId: new Types.ObjectId(tenantId),
      },
    );

    // Evaluar alertas de stock bajo post-movimiento
    try {
      await this.inventoryAlertsService.evaluateForInventory(inventory, {
        id: userId,
        tenantId,
      });
    } catch (err) {
      // Logueamos pero no bloqueamos el flujo de movimientos
      // eslint-disable-next-line no-console
      console.warn(`No se pudo evaluar alertas para inventario ${inventory._id}: ${err.message}`);
    }

    return savedMovement;
  }

  async hasOutMovementsForOrder(orderId: string, tenantId: string): Promise<boolean> {
    if (!orderId) return false;
    const count = await this.movementModel.countDocuments({
      orderId: new Types.ObjectId(orderId),
      tenantId: new Types.ObjectId(tenantId),
      movementType: MovementType.OUT,
    });
    return count > 0;
  }

  async findAll(
    tenantId: string,
    filters: InventoryMovementFilterDto,
  ): Promise<{ data: InventoryMovementDocument[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters.movementType) query.movementType = filters.movementType;
    if (filters.productId) query.productId = new Types.ObjectId(filters.productId);
    if (filters.productSku) query.productSku = filters.productSku;
    if (filters.warehouseId) query.warehouseId = new Types.ObjectId(filters.warehouseId);

    // Filter by supplier: find inventory lot IDs belonging to this supplier
    if (filters.supplierId) {
      const supplierInventoryIds = await this.inventoryModel
        .find({ tenantId: new Types.ObjectId(tenantId), supplierId: new Types.ObjectId(filters.supplierId) })
        .distinct('_id')
        .lean();
      if (supplierInventoryIds.length === 0) {
        const empty = { page: 1, limit: filters.limit || 50, total: 0, totalPages: 1 };
        return { data: [], pagination: empty };
      }
      query.inventoryId = { $in: supplierInventoryIds };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const limit = Math.min(filters.limit || 50, 200);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.movementModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.movementModel.countDocuments(query),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    return { data, pagination: { page, limit, total, totalPages } };
  }

  async findDocuments(
    tenantId: string,
    filters: InventoryMovementFilterDto,
  ): Promise<{ data: any[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (filters.movementType) query.movementType = filters.movementType;
    if (filters.productId) query.productId = new Types.ObjectId(filters.productId);
    if (filters.productSku) query.productSku = filters.productSku;
    if (filters.warehouseId) query.warehouseId = new Types.ObjectId(filters.warehouseId);

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    const limit = Math.min(filters.limit || 50, 200);
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const skip = (page - 1) * limit;

    const pipeline: any[] = [
      { $match: query },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $ifNull: [
              "$orderId",
              {
                $ifNull: [
                  "$transferId",
                  {
                    $cond: [
                      { $ifNull: ["$reference", false] },
                      {
                        $concat: [
                          { $toString: "$reference" },
                          "-",
                          { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                        ]
                      },
                      "$_id"
                    ]
                  }
                ]
              }
            ]
          },
          batchId: {
            $first: {
              $ifNull: [
                "$orderId",
                { $ifNull: ["$transferId", "$reference"] }
              ]
            }
          },
          type: { $first: "$movementType" },
          reference: { $first: "$reference" },
          orderId: { $first: "$orderId" },
          supplierId: { $first: "$supplierId" },
          date: { $first: "$createdAt" },
          itemsSet: { $addToSet: "$productId" },
          totalQuantity: { $sum: "$quantity" },
          totalCost: { $sum: "$totalCost" },
          receivedBy: { $first: "$receivedBy" },
          notes: { $first: "$notes" },
          movements: { $push: "$$ROOT" }
        }
      },
      // NOTE: id fields (orderId, supplierId, productId, reference) live as
      // String in some tenants and ObjectId in others. Every lookup below
      // compares on $toString of both sides so it matches regardless of type.
      // See docs/wiki/patterns/objectid-vs-string.md.
      //
      // Resolve purchase order via orderId (linked movements).
      {
        $lookup: {
          from: "purchaseorders",
          let: { oid: { $toString: "$orderId" } },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$oid"] } } },
            { $project: { supplierName: 1, poNumber: 1, invoiceNumber: 1 } }
          ],
          as: "orderData"
        }
      },
      // Legacy/purchase movements store the PO _id in `reference` (not orderId).
      // Resolve the PO from `reference` so supplier + invoice/PO number show up
      // for historical purchases too. Non-PO refs (e.g. "TO-0047") simply yield
      // no match.
      {
        $lookup: {
          from: "purchaseorders",
          let: { ref: { $toString: "$reference" } },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$ref"] } } },
            { $project: { supplierName: 1, poNumber: 1, invoiceNumber: 1 } }
          ],
          as: "refOrderData"
        }
      },
      // Resolve user who made the movements
      {
        $lookup: {
          from: "users",
          localField: "movements.createdBy",
          foreignField: "_id",
          as: "usersData"
        }
      },
      // Resolve supplier directly (fallback for entries with supplierId but no PO)
      {
        $lookup: {
          from: "suppliers",
          let: { sid: { $toString: "$supplierId" } },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$sid"] } } },
            { $project: { name: 1 } }
          ],
          as: "supplierData"
        }
      },
      // Resolve products to enrich each movement with name + brand
      {
        $lookup: {
          from: "products",
          let: {
            pids: {
              $map: { input: "$movements", as: "m", in: { $toString: "$$m.productId" } }
            }
          },
          pipeline: [
            { $match: { $expr: { $in: [{ $toString: "$_id" }, "$$pids"] } } },
            { $project: { name: 1, brand: 1 } }
          ],
          as: "productsData"
        }
      },
      {
        $addFields: {
          itemsCount: { $size: "$itemsSet" },
          supplierName: {
            $ifNull: [
              { $arrayElemAt: ["$orderData.supplierName", 0] },
              { $arrayElemAt: ["$refOrderData.supplierName", 0] },
              { $arrayElemAt: ["$supplierData.name", 0] }
            ]
          },
          poNumber: {
            $ifNull: [
              { $arrayElemAt: ["$orderData.poNumber", 0] },
              { $arrayElemAt: ["$refOrderData.poNumber", 0] }
            ]
          },
          invoiceNumber: {
            $ifNull: [
              { $arrayElemAt: ["$orderData.invoiceNumber", 0] },
              { $arrayElemAt: ["$refOrderData.invoiceNumber", 0] }
            ]
          },
          creatorName: { $arrayElemAt: ["$usersData.name", 0] },
          // Attach product name + brand to each movement line
          movements: {
            $map: {
              input: "$movements",
              as: "m",
              in: {
                $mergeObjects: [
                  "$$m",
                  {
                    $let: {
                      vars: {
                        prod: {
                          $arrayElemAt: [
                            {
                              $filter: {
                                input: "$productsData",
                                as: "p",
                                cond: { $eq: [{ $toString: "$$p._id" }, { $toString: "$$m.productId" }] }
                              }
                            },
                            0
                          ]
                        }
                      },
                      in: {
                        productName: { $ifNull: ["$$prod.name", "$$m.productSku"] },
                        productBrand: { $ifNull: ["$$prod.brand", null] }
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          // Primary (bold) label for the document.
          documentReference: {
            $switch: {
              branches: [
                // Purchase with a physical invoice → that invoice number leads.
                {
                  case: { $ifNull: ["$invoiceNumber", false] },
                  then: { $concat: ["Factura ", { $toString: "$invoiceNumber" }] }
                },
                // Purchase without invoice → the purchase order number.
                {
                  case: { $ifNull: ["$poNumber", false] },
                  then: { $concat: ["Orden ", { $toString: "$poNumber" }] }
                },
                // Friendly reference already (e.g. "TO-0047") → keep as-is.
                {
                  case: {
                    $and: [
                      { $ifNull: ["$reference", false] },
                      {
                        $not: {
                          $regexMatch: {
                            input: { $toString: "$reference" },
                            regex: "^[a-f0-9]{24}$"
                          }
                        }
                      }
                    ]
                  },
                  then: "$reference"
                }
              ],
              // No PO/invoice, and either no reference or an opaque ObjectId → type label (+ suffix)
              default: {
                $let: {
                  vars: {
                    label: {
                      $switch: {
                        branches: [
                          { case: { $eq: ["$type", "IN"] }, then: "Entrada manual" },
                          { case: { $eq: ["$type", "OUT"] }, then: "Salida manual" },
                          { case: { $eq: ["$type", "ADJUSTMENT"] }, then: "Ajuste de inventario" },
                          { case: { $eq: ["$type", "TRANSFER"] }, then: "Traslado" }
                        ],
                        default: "Documento"
                      }
                    }
                  },
                  in: {
                    $cond: [
                      {
                        $regexMatch: {
                          input: { $toString: { $ifNull: ["$reference", ""] } },
                          regex: "^[a-f0-9]{24}$"
                        }
                      },
                      {
                        $concat: [
                          "$$label",
                          " #",
                          { $substrCP: [{ $toString: "$reference" }, 16, 8] }
                        ]
                      },
                      "$$label"
                    ]
                  }
                }
              }
            }
          },
          // Secondary (muted) line. For invoiced purchases, surface the PO number
          // beneath the invoice so both physical and internal refs are visible.
          documentSubLabel: {
            $cond: [
              {
                $and: [
                  { $ifNull: ["$invoiceNumber", false] },
                  { $ifNull: ["$poNumber", false] }
                ]
              },
              { $concat: ["Orden ", { $toString: "$poNumber" }] },
              null
            ]
          }
        }
      },
      {
        $project: {
          itemsSet: 0,
          orderData: 0,
          refOrderData: 0,
          usersData: 0,
          supplierData: 0,
          productsData: 0
        }
      },
      { $sort: { date: -1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ];

    const result = await this.movementModel.aggregate(pipeline).exec();

    const data = result[0].data || [];
    const total = result[0].metadata[0]?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return { data, pagination: { page, limit, total, totalPages } };
  }

  /**
   * Creates a warehouse-to-warehouse transfer.
   * This creates two linked movements: OUT from source and IN to destination.
   */
  async createTransfer(
    dto: CreateTransferDto,
    tenantId: string,
    userId: string,
  ): Promise<{ transferId: string; outMovement: InventoryMovementDocument; inMovement: InventoryMovementDocument }> {
    const tenantOid = new Types.ObjectId(tenantId);
    const userOid = new Types.ObjectId(userId);
    const productOid = new Types.ObjectId(dto.productId);
    const sourceWarehouseOid = new Types.ObjectId(dto.sourceWarehouseId);
    const destWarehouseOid = new Types.ObjectId(dto.destinationWarehouseId);

    // Validate source and destination are different
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new BadRequestException("El almacén origen y destino no pueden ser el mismo.");
    }

    // Validate source warehouse exists and is active
    const sourceWarehouse = await this.warehouseModel.findOne({
      _id: sourceWarehouseOid,
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId }, // Handle string tenantId
      ],
      isDeleted: { $ne: true },
    });

    // DEBUG: Check if warehouse exists at all (without tenant filter)
    if (!sourceWarehouse) {
      const anyWarehouse = await this.warehouseModel.findOne({ _id: sourceWarehouseOid });
    }

    if (!sourceWarehouse) {
      throw new NotFoundException("Almacén origen no encontrado.");
    }
    if (sourceWarehouse.isActive === false) {
      throw new BadRequestException("Almacén origen está inactivo.");
    }

    // Validate destination warehouse exists and is active
    const destWarehouse = await this.warehouseModel.findOne({
      _id: destWarehouseOid,
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId }, // Handle string tenantId
      ],
      isDeleted: { $ne: true },
    });
    if (!destWarehouse) {
      throw new NotFoundException("Almacén destino no encontrado.");
    }
    if (destWarehouse.isActive === false) {
      throw new BadRequestException("Almacén destino está inactivo.");
    }

    // Find source inventory (product in source warehouse)
    const sourceInventory = await this.inventoryModel.findOne({
      productId: productOid,
      warehouseId: sourceWarehouseOid,
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId }, // Handle string tenantId
      ],
    });

    // DEBUG: Check if inventory exists without tenant filter
    if (!sourceInventory) {
      const anyInventory = await this.inventoryModel.findOne({
        productId: productOid,
        warehouseId: sourceWarehouseOid,
      });
    }

    if (!sourceInventory) {
      throw new NotFoundException("No existe inventario del producto en el almacén origen.");
    }
    if (sourceInventory.isActive === false) {
      throw new BadRequestException("El inventario en almacén origen está inactivo.");
    }

    // Validate sufficient stock
    const availableStock = sourceInventory.availableQuantity ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Stock insuficiente. Disponible: ${availableStock}, Solicitado: ${dto.quantity}`,
      );
    }

    // Find or create destination inventory
    let destInventory = await this.inventoryModel.findOne({
      productId: productOid,
      warehouseId: destWarehouseOid,
      $or: [
        { tenantId: tenantOid },
        { tenantId: tenantId }, // Handle string tenantId
      ],
    });

    if (!destInventory) {
      // Create new inventory record for destination warehouse
      destInventory = new this.inventoryModel({
        productId: productOid,
        warehouseId: destWarehouseOid,
        productSku: sourceInventory.productSku,
        productName: sourceInventory.productName,
        variantId: sourceInventory.variantId,
        variantSku: sourceInventory.variantSku,
        totalQuantity: 0,
        availableQuantity: 0,
        reservedQuantity: 0,
        committedQuantity: 0,
        averageCostPrice: sourceInventory.averageCostPrice,
        lastCostPrice: sourceInventory.lastCostPrice,
        lots: [],
        attributes: sourceInventory.attributes,
        location: {
          warehouse: destWarehouse.name,
          zone: "",
          aisle: "",
          shelf: "",
          bin: "",
        },
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
        tenantId: tenantId, // Use string format to match existing records
      });
      await destInventory.save();
    }

    // Generate transfer ID to link movements
    const transferId = uuidv4();
    const unitCost = sourceInventory.averageCostPrice ?? 0;
    const reason = dto.reason || `Transferencia de ${sourceWarehouse.name} a ${destWarehouse.name}`;

    // Prepare bin location ObjectIds if provided
    const sourceBinOid = dto.sourceBinLocationId ? new Types.ObjectId(dto.sourceBinLocationId) : undefined;
    const destBinOid = dto.destinationBinLocationId ? new Types.ObjectId(dto.destinationBinLocationId) : undefined;

    // OUT movement from source (decrease stock) — saldo antes/después por construcción
    const savedOutMovement = await this.recordMovement(
      sourceInventory,
      (inv) => {
        inv.availableQuantity = (inv.availableQuantity ?? 0) - dto.quantity;
        inv.totalQuantity = (inv.totalQuantity ?? 0) - dto.quantity;
      },
      {
        productId: productOid,
        productSku: sourceInventory.productSku,
        warehouseId: sourceWarehouseOid,
        binLocationId: sourceBinOid,
        movementType: MovementType.TRANSFER,
        quantity: dto.quantity,
        unitCost,
        totalCost: dto.quantity * unitCost,
        reason,
        reference: dto.reference,
        transferId,
        sourceWarehouseId: sourceWarehouseOid,
        destinationWarehouseId: destWarehouseOid,
        sourceBinLocationId: sourceBinOid,
        destinationBinLocationId: destBinOid,
        createdBy: userOid,
        tenantId: tenantOid,
      },
    );

    // IN movement to destination (increase stock)
    const savedInMovement = await this.recordMovement(
      destInventory,
      (inv) => {
        inv.availableQuantity = (inv.availableQuantity ?? 0) + dto.quantity;
        inv.totalQuantity = (inv.totalQuantity ?? 0) + dto.quantity;
        if (destBinOid) inv.binLocationId = destBinOid;
      },
      {
        productId: productOid,
        productSku: destInventory.productSku,
        warehouseId: destWarehouseOid,
        binLocationId: destBinOid,
        movementType: MovementType.TRANSFER,
        quantity: dto.quantity,
        unitCost,
        totalCost: dto.quantity * unitCost,
        reason,
        reference: dto.reference,
        transferId,
        sourceWarehouseId: sourceWarehouseOid,
        destinationWarehouseId: destWarehouseOid,
        sourceBinLocationId: sourceBinOid,
        destinationBinLocationId: destBinOid,
        createdBy: userOid,
        tenantId: tenantOid,
      },
    );

    // Link the movements to each other
    savedOutMovement.linkedMovementId = savedInMovement._id;
    savedInMovement.linkedMovementId = savedOutMovement._id;
    await Promise.all([savedOutMovement.save(), savedInMovement.save()]);

    // Evaluate alerts for both inventories
    try {
      await Promise.all([
        this.inventoryAlertsService.evaluateForInventory(sourceInventory, { id: userId, tenantId }),
        this.inventoryAlertsService.evaluateForInventory(destInventory, { id: userId, tenantId }),
      ]);
    } catch (err) {
      console.warn(`No se pudo evaluar alertas post-transferencia: ${err.message}`);
    }

    return {
      transferId,
      outMovement: savedOutMovement,
      inMovement: savedInMovement,
    };
  }
}
