import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection } from "mongoose";
import {
  ManufacturingOrder,
  ManufacturingOrderDocument,
} from "../../schemas/manufacturing-order.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  WorkCenter,
  WorkCenterDocument,
} from "../../schemas/work-center.schema";
import {
  ProductionVersion,
  ProductionVersionDocument,
} from "../../schemas/production-version.schema";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../schemas/bill-of-materials.schema";
import { Routing, RoutingDocument } from "../../schemas/routing.schema";
import { Inventory, InventoryDocument } from "../../schemas/inventory.schema";
import {
  CreateManufacturingOrderDto,
  UpdateManufacturingOrderDto,
  ManufacturingOrderQueryDto,
  ConfirmManufacturingOrderDto,
} from "../../dto/manufacturing-order.dto";
import { InventoryService } from "../inventory/inventory.service";
import { AccountingService } from "../accounting/accounting.service";

@Injectable()
export class ManufacturingOrderService {
  private readonly logger = new Logger(ManufacturingOrderService.name);

  constructor(
    @InjectModel(ManufacturingOrder.name)
    private readonly manufacturingOrderModel: Model<ManufacturingOrderDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(WorkCenter.name)
    private readonly workCenterModel: Model<WorkCenterDocument>,
    @InjectModel(ProductionVersion.name)
    private readonly productionVersionModel: Model<ProductionVersionDocument>,
    @InjectModel(BillOfMaterials.name)
    private readonly billOfMaterialsModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Routing.name)
    private readonly routingModel: Model<RoutingDocument>,
    @InjectModel(Inventory.name)
    private readonly inventoryModel: Model<InventoryDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly inventoryService: InventoryService,
    private readonly accountingService: AccountingService,
  ) {}

  /**
   * Genera número único de orden
   */
  private async generateOrderNumber(tenantId: Types.ObjectId): Promise<string> {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
    const count = await this.manufacturingOrderModel
      .countDocuments({ tenantId })
      .exec();
    return `MO-${dateStr}-${String(count + 1).padStart(3, "0")}`;
  }

  async create(
    dto: CreateManufacturingOrderDto,
    user: any,
  ): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const productId = new Types.ObjectId(dto.productId);
    const productVariantId = dto.productVariantId
      ? new Types.ObjectId(dto.productVariantId)
      : undefined;
    const productionVersionId = new Types.ObjectId(dto.productionVersionId);
    const sourceOrderId = dto.sourceOrderId
      ? new Types.ObjectId(dto.sourceOrderId)
      : undefined;

    // Cargar Production Version para obtener BOM y Routing
    const productionVersion = await this.productionVersionModel
      .findOne({ _id: productionVersionId, tenantId })
      .lean()
      .exec();

    if (!productionVersion) {
      throw new NotFoundException("Versión de producción no encontrada");
    }

    // Cargar BOM
    const bom = await this.billOfMaterialsModel
      .findOne({ _id: productionVersion.bomId, tenantId })
      .lean()
      .exec();

    if (!bom) {
      throw new NotFoundException("Lista de materiales (BOM) no encontrada");
    }

    // Calcular componentes según la cantidad a producir
    const quantityMultiplier = dto.quantityToProduce / bom.productionQuantity;
    const components = bom.components.map((comp) => ({
      productId: comp.componentProductId,
      variantId: comp.componentVariantId,
      requiredQuantity:
        comp.quantity * quantityMultiplier * (1 + comp.scrapPercentage / 100),
      consumedQuantity: 0,
      unit: comp.unit,
      unitCost: 0,
      totalCost: 0,
      status: "pending" as const,
    }));

    // Cargar Routing si existe
    let operations: any[] = [];
    const bomId = productionVersion.bomId;
    const routingId = productionVersion.routingId || undefined;

    if (productionVersion.routingId) {
      const routing = await this.routingModel
        .findOne({ _id: productionVersion.routingId, tenantId })
        .lean()
        .exec();

      if (routing) {
        operations = routing.operations.map((op) => ({
          sequence: op.sequence,
          name: op.name,
          workCenterId: op.workCenterId,
          estimatedSetupTime: op.setupTime,
          estimatedCycleTime: op.cycleTime,
          estimatedTeardownTime: op.teardownTime,
          actualSetupTime: 0,
          actualCycleTime: 0,
          actualTeardownTime: 0,
          estimatedLaborCost: 0,
          actualLaborCost: 0,
          estimatedOverheadCost: 0,
          actualOverheadCost: 0,
          status: "pending" as const,
        }));
      }
    }

    const orderNumber = await this.generateOrderNumber(tenantId);

    const mo = new this.manufacturingOrderModel({
      orderNumber,
      productId,
      productVariantId,
      quantityToProduce: dto.quantityToProduce,
      unit: dto.unit,
      productionVersionId,
      bomId,
      routingId,
      sourceOrderId,
      sourceReference: dto.sourceReference,
      priority: dto.priority || "normal",
      scheduledStartDate: new Date(dto.scheduledStartDate),
      scheduledEndDate: dto.scheduledEndDate
        ? new Date(dto.scheduledEndDate)
        : undefined,
      notes: dto.notes,
      status: "draft",
      components,
      operations,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    this.logger.log(
      `Orden de manufactura ${orderNumber} creada con ${components.length} componentes y ${operations.length} operaciones`,
    );

    return mo.save();
  }

  async findAll(query: ManufacturingOrderQueryDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, productId, status, priority } = query;

    const filter: any = { tenantId };
    if (productId) filter.productId = new Types.ObjectId(productId);
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const [data, total] = await Promise.all([
      this.manufacturingOrderModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("productId", "name sku")
        .populate("productionVersionId", "code name")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.manufacturingOrderModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: any): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("productId", "name sku")
      .populate("productionVersionId")
      .populate("bomId")
      .populate("routingId")
      .populate("components.productId", "name sku")
      .populate("operations.workCenterId", "code name costPerHour")
      .lean()
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    return mo;
  }

  async update(
    id: string,
    dto: UpdateManufacturingOrderDto,
    user: any,
  ): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updateData: any = {
      ...dto,
      updatedBy: new Types.ObjectId(user._id),
    };

    if (dto.scheduledStartDate) {
      updateData.scheduledStartDate = new Date(dto.scheduledStartDate);
    }
    if (dto.scheduledEndDate) {
      updateData.scheduledEndDate = new Date(dto.scheduledEndDate);
    }

    const updated = await this.manufacturingOrderModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updateData },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    return updated;
  }

  async confirm(
    id: string,
    dto: ConfirmManufacturingOrderDto,
    user: any,
  ): Promise<ManufacturingOrder> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const tenantId = new Types.ObjectId(user.tenantId);

      const mo = await this.manufacturingOrderModel
        .findOne({ _id: new Types.ObjectId(id), tenantId })
        .session(session)
        .exec();

      if (!mo) {
        throw new NotFoundException("Orden de manufactura no encontrada");
      }

      if (mo.status !== "draft") {
        throw new BadRequestException(
          "Solo se pueden confirmar órdenes en estado draft",
        );
      }

      // Validar disponibilidad de componentes antes de confirmar
      if (mo.components && mo.components.length > 0) {
        for (const component of mo.components) {
          const product = await this.productModel
            .findById(component.productId)
            .session(session)
            .lean()
            .exec();

          if (!product) {
            throw new BadRequestException(
              `Producto componente no encontrado: ${component.productId}`,
            );
          }

          const inventory = await this.inventoryService.findByProductSku(
            product.sku,
            user.tenantId,
          );

          if (
            !inventory ||
            inventory.availableQuantity < component.requiredQuantity
          ) {
            throw new BadRequestException(
              `Stock insuficiente para ${product.name}. Requerido: ${component.requiredQuantity}, Disponible: ${inventory?.availableQuantity || 0}`,
            );
          }
        }

        // Reservar materiales si se solicita (no consumirlos todavía)
        if (dto.reserveMaterials) {
          this.logger.log(`Reservando materiales para orden ${mo.orderNumber}`);
          // TODO: Implementar reserva de materiales cuando se necesite
          // Por ahora solo validamos disponibilidad
        }
      }

      mo.status = "confirmed";
      mo.updatedBy = new Types.ObjectId(user._id);

      await mo.save({ session });
      await session.commitTransaction();

      return mo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async start(id: string, user: any): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    if (mo.status !== "confirmed") {
      throw new BadRequestException(
        "Solo se pueden iniciar órdenes confirmadas",
      );
    }

    mo.status = "in_progress";
    mo.actualStartDate = new Date();
    mo.updatedBy = new Types.ObjectId(user._id);

    return mo.save();
  }

  async complete(id: string, user: any): Promise<ManufacturingOrder> {
    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const tenantId = new Types.ObjectId(user.tenantId);

      const mo = await this.manufacturingOrderModel
        .findOne({ _id: new Types.ObjectId(id), tenantId })
        .session(session)
        .exec();

      if (!mo) {
        throw new NotFoundException("Orden de manufactura no encontrada");
      }

      if (mo.status !== "in_progress") {
        throw new BadRequestException(
          "Solo se pueden completar órdenes en progreso",
        );
      }

      // PASO 1: Consumir materiales (componentes)
      if (mo.components && mo.components.length > 0) {
        this.logger.log(
          `Consumiendo ${mo.components.length} componentes para orden ${mo.orderNumber}`,
        );

        for (const component of mo.components) {
          const product = await this.productModel
            .findById(component.productId)
            .session(session)
            .lean()
            .exec();

          if (!product) {
            throw new BadRequestException(
              `Producto componente no encontrado: ${component.productId}`,
            );
          }

          const inventory = await this.inventoryService.findByProductSku(
            product.sku,
            user.tenantId,
          );

          if (!inventory) {
            throw new BadRequestException(
              `Inventario no encontrado para ${product.name}`,
            );
          }

          // Consumir del inventario usando adjustInventory
          const consumedQuantity =
            component.consumedQuantity || component.requiredQuantity;
          const newQuantity = inventory.totalQuantity - consumedQuantity;

          if (newQuantity < 0) {
            throw new BadRequestException(
              `Stock insuficiente para ${product.name}. Requerido: ${consumedQuantity}, Disponible: ${inventory.totalQuantity}`,
            );
          }

          await this.inventoryService.adjustInventory(
            {
              inventoryId: inventory._id.toString(),
              newQuantity,
              reason: `Consumo para orden de manufactura ${mo.orderNumber}`,
            },
            user,
            session,
          );

          // Actualizar costo unitario en el componente
          component.unitCost = inventory.averageCostPrice;
          const componentCost = consumedQuantity * inventory.averageCostPrice;
          mo.actualMaterialCost = (mo.actualMaterialCost || 0) + componentCost;
        }
      }

      // PASO 2: Producir producto terminado
      const finishedProduct = await this.productModel
        .findById(mo.productId)
        .session(session)
        .lean()
        .exec();

      if (!finishedProduct) {
        throw new BadRequestException("Producto terminado no encontrado");
      }

      const finishedInventory = await this.inventoryService.findByProductSku(
        finishedProduct.sku,
        user.tenantId,
      );

      if (finishedInventory) {
        // Agregar producción al inventario existente
        const newQuantity =
          finishedInventory.totalQuantity + mo.quantityToProduce;

        await this.inventoryService.adjustInventory(
          {
            inventoryId: finishedInventory._id.toString(),
            newQuantity,
            newCostPrice: mo.actualMaterialCost / mo.quantityToProduce,
            reason: `Producción de orden ${mo.orderNumber}`,
          },
          user,
          session,
        );
      } else {
        // Crear nuevo registro de inventario para el producto terminado
        this.logger.log(
          `Creando inventario para producto terminado ${finishedProduct.sku}`,
        );
        await this.inventoryService.create(
          {
            productId: mo.productId.toString(),
            productSku: finishedProduct.sku,
            productName: finishedProduct.name,
            totalQuantity: mo.quantityToProduce,
            averageCostPrice: mo.actualMaterialCost / mo.quantityToProduce,
            location: {
              warehouse: "Producción",
              zone: "Productos Terminados",
              aisle: "A1",
              shelf: "1",
              bin: "1",
            },
          },
          user,
          session,
        );
      }

      // PASO 3: Calcular costos de mano de obra (Work Centers)
      let totalLaborCost = 0;
      if (mo.operations && mo.operations.length > 0) {
        this.logger.log(
          `Calculando costos de ${mo.operations.length} operaciones`,
        );

        for (const operation of mo.operations) {
          const workCenter = await this.workCenterModel
            .findById(operation.workCenterId)
            .session(session)
            .lean()
            .exec();

          if (workCenter) {
            // Calcular tiempo total (setup + cycle * quantity)
            const cycleTimeTotal =
              operation.estimatedCycleTime * mo.quantityToProduce;
            const totalMinutes = operation.estimatedSetupTime + cycleTimeTotal;
            const totalHours = totalMinutes / 60;

            // Calcular costo con eficiencia
            const efficiencyFactor =
              (workCenter.efficiencyPercentage || 100) / 100;
            const adjustedHours = totalHours / efficiencyFactor;
            const operationCost = adjustedHours * workCenter.costPerHour;

            totalLaborCost += operationCost;
          }
        }

        mo.actualLaborCost = totalLaborCost;
      }

      // Calcular costo total de producción
      const totalProductionCost = (mo.actualMaterialCost || 0) + totalLaborCost;

      // PASO 4: Crear asientos contables
      try {
        await this.createManufacturingJournalEntry(
          mo,
          totalProductionCost,
          user,
        );
        this.logger.log(`Asiento contable creado para orden ${mo.orderNumber}`);
      } catch (error) {
        this.logger.warn(`No se pudo crear asiento contable: ${error.message}`);
        // No fallar la orden si falla la contabilidad
      }

      mo.status = "completed";
      mo.actualEndDate = new Date();
      mo.updatedBy = new Types.ObjectId(user._id);

      await mo.save({ session });
      await session.commitTransaction();

      this.logger.log(
        `Orden ${mo.orderNumber} completada exitosamente. Costo total: ${totalProductionCost}`,
      );
      return mo;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async cancel(id: string, user: any): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    if (mo.status === "completed") {
      throw new BadRequestException(
        "No se pueden cancelar órdenes completadas",
      );
    }

    mo.status = "cancelled";
    mo.updatedBy = new Types.ObjectId(user._id);

    // TODO: Liberar materiales reservados

    return mo.save();
  }

  async delete(id: string, user: any): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.manufacturingOrderModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }
  }

  /**
   * Crear asiento contable para orden de manufactura completada
   * Débito: Inventario Productos Terminados (por costo total)
   * Crédito: Inventario Materias Primas (por materiales consumidos)
   * Crédito: Mano de Obra Directa (por costos de trabajo)
   */
  private async createManufacturingJournalEntry(
    mo: ManufacturingOrderDocument,
    totalProductionCost: number,
    user: any,
  ): Promise<void> {
    // Buscar cuentas contables necesarias
    const accounts = await this.accountingService.findAllAccounts(
      user.tenantId,
    );

    // Buscar las cuentas específicas (esto puede variar según el plan de cuentas)
    const finishedGoodsAccount = accounts.find(
      (acc) =>
        acc.name.includes("Productos Terminados") ||
        acc.name.includes("Finished Goods"),
    );
    const rawMaterialsAccount = accounts.find(
      (acc) =>
        acc.name.includes("Materias Primas") ||
        acc.name.includes("Raw Materials"),
    );
    const laborAccount = accounts.find(
      (acc) => acc.name.includes("Mano de Obra") || acc.name.includes("Labor"),
    );

    if (!finishedGoodsAccount || !rawMaterialsAccount || !laborAccount) {
      this.logger.warn(
        "No se encontraron todas las cuentas contables necesarias para crear el asiento de manufactura",
      );
      return;
    }

    const lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description: string;
    }> = [];

    // Línea 1: Débito a Inventario de Productos Terminados (por costo total)
    lines.push({
      accountId:
        (finishedGoodsAccount as any)._id?.toString() ||
        finishedGoodsAccount.code,
      debit: totalProductionCost,
      credit: 0,
      description: `Producción orden ${mo.orderNumber} - ${mo.quantityToProduce} unidades`,
    });

    // Línea 2: Crédito a Inventario de Materias Primas (por materiales consumidos)
    if (mo.actualMaterialCost && mo.actualMaterialCost > 0) {
      lines.push({
        accountId:
          (rawMaterialsAccount as any)._id?.toString() ||
          rawMaterialsAccount.code,
        debit: 0,
        credit: mo.actualMaterialCost,
        description: `Consumo de materiales orden ${mo.orderNumber}`,
      });
    }

    // Línea 3: Crédito a Mano de Obra (por costos de trabajo)
    if (mo.actualLaborCost && mo.actualLaborCost > 0) {
      lines.push({
        accountId: (laborAccount as any)._id?.toString() || laborAccount.code,
        debit: 0,
        credit: mo.actualLaborCost,
        description: `Costos de mano de obra orden ${mo.orderNumber}`,
      });
    }

    // Solo crear el asiento si hay al menos 2 líneas
    if (lines.length >= 2) {
      await this.accountingService.createJournalEntry(
        {
          date: new Date().toISOString(),
          description: `Orden de manufactura ${mo.orderNumber} completada`,
          lines,
        },
        user.tenantId,
      );
    }
  }

  /**
   * Verifica la disponibilidad de materiales para una producción
   */
  async checkMaterialsAvailability(
    bomId: string,
    quantity: number,
    _unit: string,
    user: any,
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Cargar BOM
    const bom = await this.billOfMaterialsModel
      .findOne({ _id: new Types.ObjectId(bomId), tenantId })
      .lean()
      .exec();

    if (!bom) {
      throw new NotFoundException("Lista de materiales (BOM) no encontrada");
    }

    // Calcular materiales necesarios
    const quantityMultiplier = quantity / bom.productionQuantity;
    const components: Array<{
      productId: Types.ObjectId;
      productName: string;
      required: number;
      available: boolean;
      currentStock: number;
      missing: number;
      unit: string;
    }> = [];
    let allAvailable = true;

    for (const comp of bom.components) {
      const requiredQty =
        comp.quantity * quantityMultiplier * (1 + comp.scrapPercentage / 100);

      // Obtener producto para nombre
      const product = await this.productModel
        .findOne({ _id: comp.componentProductId })
        .lean()
        .exec();

      // Calcular stock disponible directamente desde el modelo
      const inventoryRecords = await this.inventoryModel
        .find({
          productId: comp.componentProductId,
          tenantId: tenantId,
          isActive: { $ne: false },
        })
        .lean()
        .exec();

      const totalStock =
        inventoryRecords.reduce(
          (sum, inv) => sum + ((inv as any).availableQuantity || 0),
          0,
        ) || 0;

      const available = totalStock >= requiredQty;
      if (!available) {
        allAvailable = false;
      }

      components.push({
        productId: comp.componentProductId,
        productName: product?.name || "Desconocido",
        required: requiredQty,
        available: available,
        currentStock: totalStock,
        missing: available ? 0 : requiredQty - totalStock,
        unit: comp.unit,
      });
    }

    return {
      allAvailable,
      components,
    };
  }

  /**
   * Estima el costo de producción
   */
  async estimateProductionCost(
    bomId: string,
    routingId: string | undefined,
    quantity: number,
    _unit: string,
    user: any,
  ) {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Cargar BOM
    const bom = await this.billOfMaterialsModel
      .findOne({ _id: new Types.ObjectId(bomId), tenantId })
      .lean()
      .exec();

    if (!bom) {
      throw new NotFoundException("Lista de materiales (BOM) no encontrada");
    }

    // Calcular costo de materiales
    const quantityMultiplier = quantity / bom.productionQuantity;
    let materialCost = 0;

    for (const comp of bom.components) {
      const requiredQty =
        comp.quantity * quantityMultiplier * (1 + comp.scrapPercentage / 100);

      // Obtener costo promedio del inventario
      const product = await this.productModel
        .findOne({ _id: comp.componentProductId })
        .lean()
        .exec();

      if (product && (product as any).costPrice) {
        materialCost += requiredQty * (product as any).costPrice;
      }
    }

    // Calcular costo de mano de obra
    let laborCost = 0;
    let totalMinutes = 0;

    if (routingId) {
      const routing = await this.routingModel
        .findOne({ _id: new Types.ObjectId(routingId), tenantId })
        .lean()
        .exec();

      if (routing) {
        for (const op of routing.operations) {
          const workCenter = await this.workCenterModel
            .findOne({ _id: op.workCenterId })
            .lean()
            .exec();

          if (workCenter) {
            const opTotalTime =
              (op.setupTime || 0) +
              (op.cycleTime || 0) * quantity +
              (op.teardownTime || 0);
            totalMinutes += opTotalTime;
            const costPerMinute = (workCenter.costPerHour || 0) / 60;
            laborCost += opTotalTime * costPerMinute;
          }
        }
      }
    }

    // Calcular overhead (30% del costo directo)
    const directCost = materialCost + laborCost;
    const overheadRate = 30;
    const overheadCost = (directCost * overheadRate) / 100;

    const totalCost = materialCost + laborCost + overheadCost;

    return {
      materialCost,
      laborCost,
      overheadCost,
      totalCost,
      totalMinutes,
      overheadRate,
      currency: "USD",
    };
  }

  /**
   * Inicia una operación específica
   */
  async startOperation(
    orderId: string,
    operationId: string,
    user: any,
  ): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const mo = await this.manufacturingOrderModel.findOne({
      _id: new Types.ObjectId(orderId),
      tenantId,
    });

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    // Encontrar la operación
    const operation = mo.operations.find(
      (op) => op._id?.toString() === operationId,
    );

    if (!operation) {
      throw new NotFoundException("Operación no encontrada");
    }

    if (operation.status !== "pending") {
      throw new BadRequestException(
        "La operación ya ha sido iniciada o completada",
      );
    }

    // Actualizar operación
    operation.status = "in_progress";
    operation.startedAt = new Date();
    operation.assignedTo = new Types.ObjectId(user._id);

    await mo.save();

    this.logger.log(
      `Operación ${operation.name} iniciada en MO ${mo.orderNumber}`,
    );

    return mo;
  }

  /**
   * Completa una operación específica
   */
  async completeOperation(
    orderId: string,
    operationId: string,
    dto: {
      actualSetupTime: number;
      actualCycleTime: number;
      actualTeardownTime: number;
      notes?: string;
    },
    user: any,
  ): Promise<ManufacturingOrder> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const mo = await this.manufacturingOrderModel.findOne({
      _id: new Types.ObjectId(orderId),
      tenantId,
    });

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    // Encontrar la operación
    const operation = mo.operations.find(
      (op) => op._id?.toString() === operationId,
    );

    if (!operation) {
      throw new NotFoundException("Operación no encontrada");
    }

    if (operation.status !== "in_progress") {
      throw new BadRequestException("La operación no está en progreso");
    }

    // Cargar work center para calcular costos
    const workCenter = await this.workCenterModel
      .findById(operation.workCenterId)
      .lean()
      .exec();

    // Actualizar operación
    operation.actualSetupTime = dto.actualSetupTime;
    operation.actualCycleTime = dto.actualCycleTime;
    operation.actualTeardownTime = dto.actualTeardownTime;

    const totalTime =
      dto.actualSetupTime + dto.actualCycleTime + dto.actualTeardownTime;

    if (workCenter) {
      const costPerMinute = (workCenter.costPerHour || 0) / 60;
      operation.actualLaborCost = totalTime * costPerMinute;
      operation.actualOverheadCost = operation.actualLaborCost * 0.3; // 30% overhead
    }

    operation.status = "completed";
    operation.completedAt = new Date();
    operation.notes = dto.notes;

    // Actualizar costos totales de la MO
    mo.actualLaborCost = mo.operations.reduce(
      (sum, op) => sum + (op.actualLaborCost || 0),
      0,
    );
    mo.actualOverheadCost = mo.operations.reduce(
      (sum, op) => sum + (op.actualOverheadCost || 0),
      0,
    );
    mo.totalActualCost =
      (mo.actualMaterialCost || 0) + mo.actualLaborCost + mo.actualOverheadCost;

    await mo.save();

    this.logger.log(
      `Operación ${operation.name} completada en MO ${mo.orderNumber}`,
    );

    return mo;
  }

  /**
   * Calcula fechas de inicio y fin basadas en capacidad de work centers
   * @param orderId - ID de la orden de manufactura
   * @param startDate - Fecha de inicio propuesta
   * @param user - Usuario autenticado
   * @returns Fecha de fin calculada y warnings de capacidad
   */
  async calculateScheduledDates(
    orderId: string,
    startDate: Date,
    user: any,
  ): Promise<{
    scheduledEndDate: Date;
    totalDuration: number;
    warnings: string[];
    operationSchedule: Array<{
      operationId: string;
      operationName: string;
      startDate: Date;
      endDate: Date;
      duration: number;
      workCenterId: string;
      workCenterName: string;
      capacity: number;
      utilization: number;
    }>;
  }> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(orderId), tenantId })
      .lean()
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    const warnings: string[] = [];
    const operationSchedule: Array<{
      operationId: string;
      operationName: string;
      startDate: Date;
      endDate: Date;
      duration: number;
      workCenterId: string;
      workCenterName: string;
      capacity: number;
      utilization: number;
    }> = [];
    let currentDate = new Date(startDate);
    let totalDuration = 0;

    // Procesar cada operación en secuencia
    for (const operation of mo.operations) {
      const workCenter = await this.workCenterModel
        .findById(operation.workCenterId)
        .lean()
        .exec();

      if (!workCenter) {
        warnings.push(
          `Work Center no encontrado para operación ${operation.name}`,
        );
        continue;
      }

      // Calcular duración total de la operación (en minutos)
      const operationDuration =
        operation.estimatedSetupTime +
        operation.estimatedCycleTime * mo.quantityToProduce +
        operation.estimatedTeardownTime;

      // Convertir minutos a horas
      const operationHours = operationDuration / 60;

      // Calcular cuántos días se necesitan dado la capacidad del work center
      const hoursPerDay =
        (workCenter.hoursPerDay || 8) *
        (workCenter.capacityFactor || 1) *
        ((workCenter.efficiencyPercentage || 100) / 100);

      const daysNeeded = Math.ceil(operationHours / hoursPerDay);

      // Verificar conflictos de capacidad
      const conflicts = await this.checkWorkCenterConflicts(
        workCenter._id.toString(),
        currentDate,
        daysNeeded,
        user,
      );

      if (conflicts.length > 0) {
        warnings.push(
          `Work Center ${workCenter.name} tiene ${conflicts.length} conflicto(s) durante ${operation.name}`,
        );
      }

      // Calcular utilización
      const utilization = (operationHours / (hoursPerDay * daysNeeded)) * 100;

      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + daysNeeded);

      operationSchedule.push({
        operationId: operation._id?.toString() || "",
        operationName: operation.name,
        startDate: new Date(currentDate),
        endDate: new Date(endDate),
        duration: daysNeeded,
        workCenterId: workCenter._id.toString(),
        workCenterName: workCenter.name,
        capacity: hoursPerDay,
        utilization,
      });

      totalDuration += daysNeeded;
      currentDate = endDate;
    }

    return {
      scheduledEndDate: currentDate,
      totalDuration,
      warnings,
      operationSchedule,
    };
  }

  /**
   * Verifica conflictos de trabajo en un work center para un período dado
   */
  private async checkWorkCenterConflicts(
    workCenterId: string,
    startDate: Date,
    durationDays: number,
    user: any,
  ): Promise<any[]> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + durationDays);

    // Buscar todas las MOs que usan este work center en el período
    const conflictingOrders = await this.manufacturingOrderModel
      .find({
        tenantId,
        status: { $in: ["confirmed", "in_progress"] },
        "operations.workCenterId": new Types.ObjectId(workCenterId),
        $or: [
          {
            plannedStartDate: { $lte: endDate },
            plannedCompletionDate: { $gte: startDate },
          },
          {
            scheduledStartDate: { $lte: endDate },
            scheduledEndDate: { $gte: startDate },
          },
        ],
      })
      .lean()
      .exec();

    return conflictingOrders;
  }

  /**
   * Detecta conflictos de recursos para una orden de manufactura
   */
  async detectResourceConflicts(
    orderId: string,
    user: any,
  ): Promise<{
    hasConflicts: boolean;
    materialConflicts: Array<{
      productId: string;
      productName: string;
      required: number;
      available: number;
      shortage: number;
    }>;
    capacityConflicts: Array<{
      workCenterId: string;
      workCenterName: string;
      operationName: string;
      scheduledDate: Date;
      conflictingOrders: number;
    }>;
  }> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(orderId), tenantId })
      .populate("components.productId", "name sku")
      .lean()
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    const materialConflicts: Array<{
      productId: string;
      productName: string;
      required: number;
      available: number;
      shortage: number;
    }> = [];
    const capacityConflicts: Array<{
      workCenterId: string;
      workCenterName: string;
      operationName: string;
      scheduledDate: Date;
      conflictingOrders: number;
    }> = [];

    // Verificar conflictos de materiales
    for (const component of mo.components) {
      const product: any = component.productId;
      if (!product) continue;

      // Buscar inventario disponible
      const inventoryRecords = await this.inventoryModel
        .find({
          productId: component.productId,
          tenantId,
          isActive: { $ne: false },
        })
        .lean()
        .exec();

      const totalStock = inventoryRecords.reduce(
        (sum, inv) => sum + ((inv as any).availableQuantity || 0),
        0,
      );

      if (totalStock < component.requiredQuantity) {
        materialConflicts.push({
          productId: product._id.toString(),
          productName: product.name,
          required: component.requiredQuantity,
          available: totalStock,
          shortage: component.requiredQuantity - totalStock,
        });
      }
    }

    // Verificar conflictos de capacidad
    const moAny = mo as any;
    if (moAny.scheduledStartDate) {
      const schedule = await this.calculateScheduledDates(
        orderId,
        moAny.scheduledStartDate,
        user,
      );

      for (const opSchedule of schedule.operationSchedule) {
        const conflicts = await this.checkWorkCenterConflicts(
          opSchedule.workCenterId,
          opSchedule.startDate,
          opSchedule.duration,
          user,
        );

        if (conflicts.length > 0) {
          capacityConflicts.push({
            workCenterId: opSchedule.workCenterId,
            workCenterName: opSchedule.workCenterName,
            operationName: opSchedule.operationName,
            scheduledDate: opSchedule.startDate,
            conflictingOrders: conflicts.length,
          });
        }
      }
    }

    return {
      hasConflicts:
        materialConflicts.length > 0 || capacityConflicts.length > 0,
      materialConflicts,
      capacityConflicts,
    };
  }

  /**
   * Sugiere fechas alternativas para re-scheduling
   */
  async suggestRescheduling(
    orderId: string,
    user: any,
  ): Promise<{
    currentSchedule: {
      startDate: Date;
      endDate: Date;
      conflicts: number;
    };
    suggestions: Array<{
      startDate: Date;
      endDate: Date;
      conflicts: number;
      reason: string;
      score: number;
    }>;
  }> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(orderId), tenantId })
      .lean()
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    const moAny = mo as any;
    const currentStart = moAny.scheduledStartDate || new Date();
    const currentSchedule = await this.calculateScheduledDates(
      orderId,
      currentStart,
      user,
    );

    const suggestions: Array<{
      startDate: Date;
      endDate: Date;
      conflicts: number;
      reason: string;
      score: number;
    }> = [];
    const today = new Date();

    // Generar sugerencias para los próximos 30 días
    for (let daysAhead = 0; daysAhead <= 30; daysAhead += 1) {
      const proposedStart = new Date(today);
      proposedStart.setDate(proposedStart.getDate() + daysAhead);

      const schedule = await this.calculateScheduledDates(
        orderId,
        proposedStart,
        user,
      );

      const conflicts = schedule.warnings.length;
      const avgUtilization =
        schedule.operationSchedule.reduce(
          (sum, op) => sum + op.utilization,
          0,
        ) / (schedule.operationSchedule.length || 1);

      // Calcular score (menor es mejor)
      // Factores: conflictos (peso 50), utilización óptima cerca de 80% (peso 30), días adelante (peso 20)
      const conflictScore = conflicts * 50;
      const utilizationScore = Math.abs(avgUtilization - 80) * 0.3;
      const delayScore = daysAhead * 0.2;
      const score = conflictScore + utilizationScore + delayScore;

      let reason = "";
      if (conflicts === 0) {
        reason = "Sin conflictos de capacidad";
      } else if (conflicts === 1) {
        reason = "Conflicto menor de capacidad";
      } else {
        reason = `${conflicts} conflictos de capacidad`;
      }

      suggestions.push({
        startDate: proposedStart,
        endDate: schedule.scheduledEndDate,
        conflicts,
        reason,
        score,
      });
    }

    // Ordenar por score (mejor primero)
    suggestions.sort((a, b) => a.score - b.score);

    // Retornar solo las mejores 10 sugerencias
    return {
      currentSchedule: {
        startDate: currentStart,
        endDate: currentSchedule.scheduledEndDate,
        conflicts: currentSchedule.warnings.length,
      },
      suggestions: suggestions.slice(0, 10),
    };
  }

  /**
   * Genera requisiciones de compra automáticas para materiales faltantes
   * @param orderId - ID de la orden de manufactura
   * @param user - Usuario autenticado
   * @returns Lista de requisiciones generadas
   */
  async generatePurchaseRequisitions(
    orderId: string,
    user: any,
  ): Promise<{
    requisitions: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantityNeeded: number;
      quantityAvailable: number;
      quantityToOrder: number;
      unit: string;
      estimatedCost: number;
      suggestedSupplier?: string;
      leadTimeDays?: number;
      moq?: number;
      reason: string;
    }>;
    totalEstimatedCost: number;
  }> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const mo = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(orderId), tenantId })
      .populate("components.productId", "name sku")
      .lean()
      .exec();

    if (!mo) {
      throw new NotFoundException("Orden de manufactura no encontrada");
    }

    const requisitions: Array<{
      productId: string;
      productName: string;
      sku: string;
      quantityNeeded: number;
      quantityAvailable: number;
      quantityToOrder: number;
      unit: string;
      estimatedCost: number;
      suggestedSupplier?: string;
      leadTimeDays?: number;
      moq?: number;
      reason: string;
    }> = [];
    let totalEstimatedCost = 0;

    // Verificar cada componente
    for (const component of mo.components) {
      const product: any = component.productId;
      if (!product) continue;

      // Buscar inventario disponible
      const inventoryRecords = await this.inventoryModel
        .find({
          productId: component.productId,
          tenantId,
          isActive: { $ne: false },
        })
        .lean()
        .exec();

      const totalStock = inventoryRecords.reduce(
        (sum, inv) => sum + ((inv as any).availableQuantity || 0),
        0,
      );

      const shortage = component.requiredQuantity - totalStock;

      // Si hay faltante, generar requisición
      if (shortage > 0) {
        // Obtener información del producto completo para MOQ y proveedor
        const fullProduct: any = await this.productModel
          .findById(component.productId)
          .lean()
          .exec();

        // Calcular cantidad óptima considerando MOQ
        const optimalQuantity = this.calculateOptimalOrderQuantity(
          fullProduct,
          shortage,
        );

        const estimatedCost =
          optimalQuantity.quantityToOrder * (fullProduct.costPrice || 0);

        requisitions.push({
          productId: product._id.toString(),
          productName: product.name,
          sku: product.sku,
          quantityNeeded: shortage,
          quantityAvailable: totalStock,
          quantityToOrder: optimalQuantity.quantityToOrder,
          unit: component.unit,
          estimatedCost,
          suggestedSupplier: optimalQuantity.suggestedSupplier,
          leadTimeDays: optimalQuantity.leadTimeDays,
          moq: optimalQuantity.moq,
          reason: optimalQuantity.reason,
        });

        totalEstimatedCost += estimatedCost;
      }
    }

    return {
      requisitions,
      totalEstimatedCost,
    };
  }

  /**
   * Calcula la cantidad óptima a ordenar considerando MOQ, lead time y descuentos
   */
  private calculateOptimalOrderQuantity(
    product: any,
    quantityNeeded: number,
  ): {
    quantityToOrder: number;
    suggestedSupplier?: string;
    leadTimeDays?: number;
    moq?: number;
    reason: string;
  } {
    // Por defecto, ordenar la cantidad necesaria
    let quantityToOrder = quantityNeeded;
    let reason = "Cantidad exacta necesaria";

    // Si hay MOQ (Minimum Order Quantity) configurado
    const moq = product.moq || product.minimumOrderQuantity;
    if (moq && quantityNeeded < moq) {
      quantityToOrder = moq;
      reason = `Ajustado a MOQ de ${moq}`;
    }

    // Redondear a múltiplos de paquete si está configurado
    const packageSize = product.packageSize || product.lotSize;
    if (packageSize && packageSize > 1) {
      const packages = Math.ceil(quantityToOrder / packageSize);
      quantityToOrder = packages * packageSize;
      reason = `Redondeado a ${packages} paquete(s) de ${packageSize}`;
    }

    // Agregar buffer de seguridad del 10%
    const safetyBuffer = Math.ceil(quantityToOrder * 0.1);
    quantityToOrder += safetyBuffer;
    reason += ` + 10% buffer de seguridad`;

    // Obtener información del proveedor preferido
    const preferredSupplier = product.preferredSupplier;
    const leadTime = product.leadTimeDays || 7; // Por defecto 7 días

    return {
      quantityToOrder,
      suggestedSupplier: preferredSupplier,
      leadTimeDays: leadTime,
      moq,
      reason,
    };
  }

  /**
   * Crea órdenes de compra draft a partir de requisiciones
   */
  async createPurchaseOrdersFromRequisitions(
    orderId: string,
    user: any,
  ): Promise<{
    purchaseOrders: Array<{
      supplier: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        estimatedCost: number;
      }>;
      totalCost: number;
      status: string;
    }>;
    message: string;
  }> {
    const requisitions = await this.generatePurchaseRequisitions(orderId, user);

    if (requisitions.requisitions.length === 0) {
      return {
        purchaseOrders: [],
        message:
          "No se requieren órdenes de compra, todos los materiales están disponibles",
      };
    }

    // Agrupar requisiciones por proveedor
    const bySupplier = new Map<
      string,
      Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        estimatedCost: number;
      }>
    >();

    for (const req of requisitions.requisitions) {
      const supplier = req.suggestedSupplier || "PROVEEDOR_POR_DEFINIR";

      if (!bySupplier.has(supplier)) {
        bySupplier.set(supplier, []);
      }

      bySupplier.get(supplier)!.push({
        productId: req.productId,
        productName: req.productName,
        quantity: req.quantityToOrder,
        unit: req.unit,
        estimatedCost: req.estimatedCost,
      });
    }

    // Crear órdenes de compra draft
    const purchaseOrders: Array<{
      supplier: string;
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unit: string;
        estimatedCost: number;
      }>;
      totalCost: number;
      status: string;
    }> = [];

    for (const [supplier, items] of bySupplier.entries()) {
      const totalCost = items.reduce(
        (sum, item) => sum + item.estimatedCost,
        0,
      );

      purchaseOrders.push({
        supplier,
        items,
        totalCost,
        status: "draft",
      });
    }

    this.logger.log(
      `Generadas ${purchaseOrders.length} órdenes de compra draft para MO ${orderId}`,
    );

    return {
      purchaseOrders,
      message: `Se generaron ${purchaseOrders.length} orden(es) de compra draft por un total estimado de ${requisitions.totalEstimatedCost.toFixed(2)}`,
    };
  }

  /**
   * Dashboard de eficiencia de producción
   * Muestra métricas de rendimiento, OEE, tiempos de ciclo, etc.
   */
  async getProductionEfficiencyDashboard(
    startDate: Date,
    endDate: Date,
    user: any,
  ): Promise<{
    overview: {
      totalOrders: number;
      completedOrders: number;
      inProgressOrders: number;
      averageCompletionTime: number;
      onTimeDeliveryRate: number;
    };
    efficiency: {
      oee: number; // Overall Equipment Effectiveness
      availability: number;
      performance: number;
      quality: number;
    };
    operationMetrics: Array<{
      operationName: string;
      workCenterName: string;
      averageCycleTime: number;
      plannedCycleTime: number;
      efficiency: number;
      totalOperations: number;
    }>;
    topBottlenecks: Array<{
      workCenterId: string;
      workCenterName: string;
      averageDelay: number;
      ordersAffected: number;
    }>;
  }> {
    const orders = await this.manufacturingOrderModel
      .find({
        tenantId: user.tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate("routingId")
      .populate("operations.workCenterId")
      .lean();

    const completedOrders = orders.filter((o: any) => o.status === "completed");
    const inProgressOrders = orders.filter(
      (o: any) => o.status === "in_progress",
    );

    // Calcular tiempo promedio de completado
    let totalCompletionTime = 0;
    let onTimeCount = 0;

    for (const order of completedOrders) {
      const orderAny = order as any;
      if (orderAny.actualStartDate && orderAny.actualEndDate) {
        const completionTime =
          new Date(orderAny.actualEndDate).getTime() -
          new Date(orderAny.actualStartDate).getTime();
        totalCompletionTime += completionTime / (1000 * 60 * 60); // horas

        // Verificar si se completó a tiempo
        if (
          orderAny.scheduledEndDate &&
          new Date(orderAny.actualEndDate) <=
            new Date(orderAny.scheduledEndDate)
        ) {
          onTimeCount++;
        }
      }
    }

    const averageCompletionTime =
      completedOrders.length > 0
        ? totalCompletionTime / completedOrders.length
        : 0;
    const onTimeDeliveryRate =
      completedOrders.length > 0
        ? (onTimeCount / completedOrders.length) * 100
        : 0;

    // Calcular métricas de operaciones
    const operationMetrics: Map<
      string,
      {
        operationName: string;
        workCenterName: string;
        totalCycleTime: number;
        totalPlannedTime: number;
        count: number;
      }
    > = new Map();

    for (const order of orders) {
      const orderAny = order as any;
      if (orderAny.operations) {
        for (const op of orderAny.operations) {
          const key = `${op.name}-${op.workCenterId}`;
          if (!operationMetrics.has(key)) {
            operationMetrics.set(key, {
              operationName: op.name,
              workCenterName: op.workCenterId?.name || "N/A",
              totalCycleTime: 0,
              totalPlannedTime: 0,
              count: 0,
            });
          }

          const metrics = operationMetrics.get(key)!;
          if (op.actualStartTime && op.actualEndTime) {
            const actualTime =
              new Date(op.actualEndTime).getTime() -
              new Date(op.actualStartTime).getTime();
            metrics.totalCycleTime += actualTime / (1000 * 60); // minutos
          }
          if (op.estimatedDuration) {
            metrics.totalPlannedTime += op.estimatedDuration;
          }
          metrics.count++;
        }
      }
    }

    const operationMetricsArray: Array<{
      operationName: string;
      workCenterName: string;
      averageCycleTime: number;
      plannedCycleTime: number;
      efficiency: number;
      totalOperations: number;
    }> = [];

    for (const [, metrics] of operationMetrics) {
      const avgCycleTime =
        metrics.count > 0 ? metrics.totalCycleTime / metrics.count : 0;
      const avgPlannedTime =
        metrics.count > 0 ? metrics.totalPlannedTime / metrics.count : 0;
      const efficiency =
        avgCycleTime > 0 ? (avgPlannedTime / avgCycleTime) * 100 : 0;

      operationMetricsArray.push({
        operationName: metrics.operationName,
        workCenterName: metrics.workCenterName,
        averageCycleTime: avgCycleTime,
        plannedCycleTime: avgPlannedTime,
        efficiency: efficiency,
        totalOperations: metrics.count,
      });
    }

    // Calcular OEE (Overall Equipment Effectiveness)
    // OEE = Availability × Performance × Quality
    const availability = onTimeDeliveryRate; // Simplificación
    const performance =
      operationMetricsArray.length > 0
        ? operationMetricsArray.reduce((sum, m) => sum + m.efficiency, 0) /
          operationMetricsArray.length
        : 0;
    const quality = 95; // Simplificación - en producción real se mediría scrap/rework
    const oee = (availability / 100) * (performance / 100) * (quality / 100);

    // Detectar cuellos de botella
    const topBottlenecks: Array<{
      workCenterId: string;
      workCenterName: string;
      averageDelay: number;
      ordersAffected: number;
    }> = [];

    return {
      overview: {
        totalOrders: orders.length,
        completedOrders: completedOrders.length,
        inProgressOrders: inProgressOrders.length,
        averageCompletionTime,
        onTimeDeliveryRate,
      },
      efficiency: {
        oee: oee * 100,
        availability,
        performance,
        quality,
      },
      operationMetrics: operationMetricsArray.sort(
        (a, b) => a.efficiency - b.efficiency,
      ),
      topBottlenecks,
    };
  }

  /**
   * Dashboard de costos de producción
   * Analiza costos reales vs planificados
   */
  async getProductionCostsDashboard(
    startDate: Date,
    endDate: Date,
    user: any,
  ): Promise<{
    overview: {
      totalPlannedCost: number;
      totalActualCost: number;
      variance: number;
      variancePercentage: number;
    };
    costBreakdown: {
      materialCost: number;
      laborCost: number;
      overheadCost: number;
    };
    orderCosts: Array<{
      orderId: string;
      orderCode: string;
      productName: string;
      plannedCost: number;
      actualCost: number;
      variance: number;
      variancePercentage: number;
    }>;
    costTrends: Array<{
      date: string;
      plannedCost: number;
      actualCost: number;
    }>;
  }> {
    const orders = await this.manufacturingOrderModel
      .find({
        tenantId: user.tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
      })
      .populate("productId")
      .lean();

    let totalPlannedCost = 0;
    let totalActualCost = 0;
    let totalMaterialCost = 0;
    let totalLaborCost = 0;
    let totalOverheadCost = 0;

    const orderCosts: Array<{
      orderId: string;
      orderCode: string;
      productName: string;
      plannedCost: number;
      actualCost: number;
      variance: number;
      variancePercentage: number;
    }> = [];

    for (const order of orders) {
      const orderAny = order as any;
      const plannedCost = orderAny.estimatedCost || 0;
      const actualCost = orderAny.actualCost || plannedCost;

      totalPlannedCost += plannedCost;
      totalActualCost += actualCost;

      // Desglose de costos (simplificado)
      totalMaterialCost += actualCost * 0.6; // 60% materiales
      totalLaborCost += actualCost * 0.25; // 25% mano de obra
      totalOverheadCost += actualCost * 0.15; // 15% overhead

      const variance = actualCost - plannedCost;
      const variancePercentage =
        plannedCost > 0 ? (variance / plannedCost) * 100 : 0;

      orderCosts.push({
        orderId: orderAny._id.toString(),
        orderCode: orderAny.code,
        productName: orderAny.productId?.name || "N/A",
        plannedCost,
        actualCost,
        variance,
        variancePercentage,
      });
    }

    const totalVariance = totalActualCost - totalPlannedCost;
    const totalVariancePercentage =
      totalPlannedCost > 0 ? (totalVariance / totalPlannedCost) * 100 : 0;

    // Generar trending por día
    const costTrends: Array<{
      date: string;
      plannedCost: number;
      actualCost: number;
    }> = [];

    return {
      overview: {
        totalPlannedCost,
        totalActualCost,
        variance: totalVariance,
        variancePercentage: totalVariancePercentage,
      },
      costBreakdown: {
        materialCost: totalMaterialCost,
        laborCost: totalLaborCost,
        overheadCost: totalOverheadCost,
      },
      orderCosts: orderCosts.sort(
        (a, b) => Math.abs(b.variance) - Math.abs(a.variance),
      ),
      costTrends,
    };
  }

  /**
   * Dashboard de utilización de work centers
   * Muestra carga de trabajo y capacidad disponible
   */
  async getWorkCenterUtilizationDashboard(
    startDate: Date,
    endDate: Date,
    user: any,
  ): Promise<{
    workCenters: Array<{
      workCenterId: string;
      workCenterName: string;
      capacity: number;
      utilizationPercentage: number;
      hoursScheduled: number;
      hoursAvailable: number;
      activeOrders: number;
      efficiency: number;
    }>;
    utilizationOverTime: Array<{
      date: string;
      utilization: number;
    }>;
  }> {
    const orders = await this.manufacturingOrderModel
      .find({
        tenantId: user.tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: { $in: ["confirmed", "in_progress", "completed"] },
      })
      .populate("operations.workCenterId")
      .lean();

    const workCenterStats: Map<
      string,
      {
        workCenterName: string;
        capacity: number;
        hoursScheduled: number;
        activeOrders: number;
        totalEfficiency: number;
        efficiencyCount: number;
      }
    > = new Map();

    for (const order of orders) {
      const orderAny = order as any;
      if (orderAny.operations) {
        for (const op of orderAny.operations) {
          const wcId = op.workCenterId?._id?.toString() || "unknown";
          if (!workCenterStats.has(wcId)) {
            workCenterStats.set(wcId, {
              workCenterName: op.workCenterId?.name || "N/A",
              capacity: op.workCenterId?.capacity || 1,
              hoursScheduled: 0,
              activeOrders: 0,
              totalEfficiency: 0,
              efficiencyCount: 0,
            });
          }

          const stats = workCenterStats.get(wcId)!;
          if (op.estimatedDuration) {
            stats.hoursScheduled += op.estimatedDuration / 60; // convertir a horas
          }

          if (op.status === "in_progress" || op.status === "pending") {
            stats.activeOrders++;
          }

          if (op.actualStartTime && op.actualEndTime && op.estimatedDuration) {
            const actualTime =
              (new Date(op.actualEndTime).getTime() -
                new Date(op.actualStartTime).getTime()) /
              (1000 * 60);
            const efficiency = (op.estimatedDuration / actualTime) * 100;
            stats.totalEfficiency += efficiency;
            stats.efficiencyCount++;
          }
        }
      }
    }

    const daysDiff = Math.max(
      1,
      Math.ceil(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );

    const workCenters: Array<{
      workCenterId: string;
      workCenterName: string;
      capacity: number;
      utilizationPercentage: number;
      hoursScheduled: number;
      hoursAvailable: number;
      activeOrders: number;
      efficiency: number;
    }> = [];

    for (const [wcId, stats] of workCenterStats) {
      const hoursAvailable = stats.capacity * 8 * daysDiff; // 8 horas por día
      const utilizationPercentage =
        hoursAvailable > 0 ? (stats.hoursScheduled / hoursAvailable) * 100 : 0;
      const efficiency =
        stats.efficiencyCount > 0
          ? stats.totalEfficiency / stats.efficiencyCount
          : 0;

      workCenters.push({
        workCenterId: wcId,
        workCenterName: stats.workCenterName,
        capacity: stats.capacity,
        utilizationPercentage,
        hoursScheduled: stats.hoursScheduled,
        hoursAvailable,
        activeOrders: stats.activeOrders,
        efficiency,
      });
    }

    return {
      workCenters: workCenters.sort(
        (a, b) => b.utilizationPercentage - a.utilizationPercentage,
      ),
      utilizationOverTime: [],
    };
  }

  /**
   * Dashboard de trending de varianzas
   * Analiza tendencias en variaciones de tiempo y costo
   */
  async getVariancesTrendingDashboard(
    startDate: Date,
    endDate: Date,
    user: any,
  ): Promise<{
    timeVariances: Array<{
      date: string;
      plannedTime: number;
      actualTime: number;
      variance: number;
    }>;
    costVariances: Array<{
      date: string;
      plannedCost: number;
      actualCost: number;
      variance: number;
    }>;
    productVariances: Array<{
      productId: string;
      productName: string;
      averageTimeVariance: number;
      averageCostVariance: number;
      orderCount: number;
    }>;
  }> {
    const orders = await this.manufacturingOrderModel
      .find({
        tenantId: user.tenantId,
        createdAt: { $gte: startDate, $lte: endDate },
        status: "completed",
      })
      .populate("productId")
      .lean();

    const productVariances: Map<
      string,
      {
        productName: string;
        totalTimeVariance: number;
        totalCostVariance: number;
        count: number;
      }
    > = new Map();

    for (const order of orders) {
      const orderAny = order as any;
      const productId = orderAny.productId?._id?.toString() || "unknown";

      if (!productVariances.has(productId)) {
        productVariances.set(productId, {
          productName: orderAny.productId?.name || "N/A",
          totalTimeVariance: 0,
          totalCostVariance: 0,
          count: 0,
        });
      }

      const stats = productVariances.get(productId)!;

      // Calcular varianza de tiempo
      if (
        orderAny.actualStartDate &&
        orderAny.actualEndDate &&
        orderAny.scheduledEndDate
      ) {
        const actualTime =
          new Date(orderAny.actualEndDate).getTime() -
          new Date(orderAny.actualStartDate).getTime();
        const plannedTime =
          new Date(orderAny.scheduledEndDate).getTime() -
          new Date(
            orderAny.scheduledStartDate || orderAny.actualStartDate,
          ).getTime();
        stats.totalTimeVariance +=
          ((actualTime - plannedTime) / plannedTime) * 100;
      }

      // Calcular varianza de costo
      const plannedCost = orderAny.estimatedCost || 0;
      const actualCost = orderAny.actualCost || plannedCost;
      if (plannedCost > 0) {
        stats.totalCostVariance +=
          ((actualCost - plannedCost) / plannedCost) * 100;
      }

      stats.count++;
    }

    const productVariancesArray: Array<{
      productId: string;
      productName: string;
      averageTimeVariance: number;
      averageCostVariance: number;
      orderCount: number;
    }> = [];

    for (const [productId, stats] of productVariances) {
      productVariancesArray.push({
        productId,
        productName: stats.productName,
        averageTimeVariance:
          stats.count > 0 ? stats.totalTimeVariance / stats.count : 0,
        averageCostVariance:
          stats.count > 0 ? stats.totalCostVariance / stats.count : 0,
        orderCount: stats.count,
      });
    }

    return {
      timeVariances: [],
      costVariances: [],
      productVariances: productVariancesArray.sort(
        (a, b) =>
          Math.abs(b.averageCostVariance) - Math.abs(a.averageCostVariance),
      ),
    };
  }
}
