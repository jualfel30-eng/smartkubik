import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  ManufacturingOrder,
  ManufacturingOrderDocument,
} from "../../schemas/manufacturing-order.schema";
import { BillOfMaterialsService } from "./bill-of-materials.service";
import { InventoryService } from "../inventory/inventory.service";

/**
 * MRPService - Material Requirements Planning
 * Calcula requerimientos de materiales para producción
 * basado en órdenes de manufactura y disponibilidad de inventario
 */
@Injectable()
export class MRPService {
  constructor(
    @InjectModel(ManufacturingOrder.name)
    private readonly manufacturingOrderModel: Model<ManufacturingOrderDocument>,
    private readonly bomService: BillOfMaterialsService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Calcular requerimientos de materiales para una Manufacturing Order
   * Usa explosión de BOM + inventario actual para determinar qué falta
   */
  async calculateMaterialRequirements(orderId: string, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Cargar orden de manufactura
    const order = await this.manufacturingOrderModel
      .findOne({ _id: new Types.ObjectId(orderId), tenantId })
      .populate("productId", "name sku")
      .populate("productionVersionId")
      .lean()
      .exec();

    if (!order) {
      throw new NotFoundException("Manufacturing Order no encontrada");
    }

    // Obtener BOM de la versión de producción
    const productionVersion: any = order.productionVersionId;
    if (!productionVersion || !productionVersion.bomId) {
      throw new NotFoundException("BOM no encontrado para esta orden");
    }

    // Explotar BOM para obtener todos los materiales necesarios
    const explosion = await this.bomService.explodeBOM(
      productionVersion.bomId.toString(),
      order.quantityToProduce,
      user,
    );

    // Para cada material, verificar disponibilidad en inventario
    const requirements: Array<{
      productId: string;
      productName: string;
      sku: string;
      requiredQuantity: number;
      availableQuantity: number;
      shortageQuantity: number;
      unit: string;
      status: string;
      inventoryValue: number;
      estimatedCost: number;
    }> = [];
    for (const material of explosion.flatList) {
      // Buscar producto por SKU
      const inventory = await this.inventoryService.findByProductSku(
        material.sku,
        user.tenantId,
      );

      const available = inventory?.availableQuantity || 0;
      const required = material.totalQuantity;
      const shortage = Math.max(0, required - available);

      requirements.push({
        productId: material.productId,
        productName: material.productName,
        sku: material.sku,
        requiredQuantity: required,
        availableQuantity: available,
        shortageQuantity: shortage,
        unit: material.unit,
        status: shortage > 0 ? "shortage" : "available",
        inventoryValue: inventory?.averageCostPrice || 0,
        estimatedCost: (inventory?.averageCostPrice || 0) * shortage,
      });
    }

    // Calcular totales
    const totalRequired = requirements.reduce(
      (sum, r) => sum + r.requiredQuantity,
      0,
    );
    const totalAvailable = requirements.reduce(
      (sum, r) => sum + r.availableQuantity,
      0,
    );
    const totalShortage = requirements.reduce(
      (sum, r) => sum + r.shortageQuantity,
      0,
    );
    const totalEstimatedCost = requirements.reduce(
      (sum, r) => sum + r.estimatedCost,
      0,
    );

    const shortageCount = requirements.filter(
      (r) => r.status === "shortage",
    ).length;
    const allAvailable = shortageCount === 0;

    return {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      product: {
        id: (order.productId as any)._id.toString(),
        name: (order.productId as any).name,
        sku: (order.productId as any).sku,
      },
      quantityToProduce: order.quantityToProduce,
      requirements,
      summary: {
        totalRequired,
        totalAvailable,
        totalShortage,
        totalEstimatedCost,
        shortageCount,
        allAvailable,
        readyToManufacture: allAvailable,
      },
    };
  }

  /**
   * Calcular requerimientos agregados para múltiples órdenes
   * Útil para planificación de compras
   */
  async calculateAggregatedRequirements(
    orderIds: string[],
    user: any,
  ): Promise<{
    materials: Array<{
      productId: string;
      productName: string;
      sku: string;
      totalRequired: number;
      totalAvailable: number;
      totalShortage: number;
      unit: string;
      estimatedCost: number;
    }>;
    summary: {
      totalMaterials: number;
      totalShortage: number;
      totalEstimatedCost: number;
    };
  }> {
    const materialMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        totalRequired: number;
        totalAvailable: number;
        unit: string;
        inventoryValue: number;
      }
    >();

    // Procesar cada orden
    for (const orderId of orderIds) {
      const orderRequirements = await this.calculateMaterialRequirements(
        orderId,
        user,
      );

      // Agregar a la suma total
      for (const req of orderRequirements.requirements) {
        const key = req.productId;
        if (materialMap.has(key)) {
          const existing = materialMap.get(key)!;
          existing.totalRequired += req.requiredQuantity;
          // La disponibilidad es la misma para todos
        } else {
          materialMap.set(key, {
            productId: req.productId,
            productName: req.productName,
            sku: req.sku,
            totalRequired: req.requiredQuantity,
            totalAvailable: req.availableQuantity,
            unit: req.unit,
            inventoryValue: req.inventoryValue,
          });
        }
      }
    }

    // Convertir a array y calcular faltantes
    const materials = Array.from(materialMap.values()).map((m) => ({
      ...m,
      totalShortage: Math.max(0, m.totalRequired - m.totalAvailable),
      estimatedCost:
        m.inventoryValue * Math.max(0, m.totalRequired - m.totalAvailable),
    }));

    // Calcular totales
    const totalShortage = materials.reduce(
      (sum, m) => sum + m.totalShortage,
      0,
    );
    const totalEstimatedCost = materials.reduce(
      (sum, m) => sum + m.estimatedCost,
      0,
    );

    return {
      materials,
      summary: {
        totalMaterials: materials.length,
        totalShortage,
        totalEstimatedCost,
      },
    };
  }

  /**
   * Obtener requerimientos de materiales para un período de tiempo
   * Útil para planificación de producción a futuro
   */
  async getRequirementsByDateRange(startDate: Date, endDate: Date, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Buscar todas las órdenes en el rango de fechas
    const orders = (await this.manufacturingOrderModel
      .find({
        tenantId,
        status: { $in: ["draft", "confirmed", "in_progress"] },
        plannedStartDate: { $gte: startDate, $lte: endDate },
      })
      .select("_id orderNumber plannedStartDate")
      .lean()
      .exec()) as Array<{
      _id: Types.ObjectId;
      orderNumber: string;
      plannedStartDate?: Date;
    }>;

    const orderIds = orders.map((o) => o._id.toString());

    // Calcular requerimientos agregados
    const aggregated = await this.calculateAggregatedRequirements(
      orderIds,
      user,
    );

    return {
      period: {
        startDate,
        endDate,
      },
      ordersCount: orders.length,
      orders: orders.map((o) => ({
        id: o._id.toString(),
        orderNumber: o.orderNumber,
        plannedStartDate: o.plannedStartDate,
      })),
      ...aggregated,
    };
  }

  /**
   * Generar sugerencias de compra basadas en faltantes
   */
  async generatePurchaseSuggestions(orderIds: string[], user: any) {
    const aggregated = await this.calculateAggregatedRequirements(
      orderIds,
      user,
    );

    // Filtrar solo materiales con faltante
    const suggestions = aggregated.materials
      .filter((m) => m.totalShortage > 0)
      .map((m) => ({
        productId: m.productId,
        productName: m.productName,
        sku: m.sku,
        quantityToPurchase: m.totalShortage,
        unit: m.unit,
        estimatedCost: m.estimatedCost,
        priority: m.totalShortage > m.totalAvailable * 2 ? "high" : "normal",
      }))
      .sort((a, b) => b.estimatedCost - a.estimatedCost); // Ordenar por costo descendente

    return {
      suggestions,
      totalItems: suggestions.length,
      totalEstimatedCost: suggestions.reduce(
        (sum, s) => sum + s.estimatedCost,
        0,
      ),
    };
  }
}
