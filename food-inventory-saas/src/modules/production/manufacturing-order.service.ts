import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection, ClientSession } from "mongoose";
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
}
