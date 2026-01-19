import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel, InjectConnection } from "@nestjs/mongoose";
import { Model, Types, Connection, ClientSession } from "mongoose";
import {
  BillOfMaterials,
  BillOfMaterialsDocument,
} from "../../schemas/bill-of-materials.schema";
import { Product, ProductDocument } from "../../schemas/product.schema";
import {
  CreateBillOfMaterialsDto,
  UpdateBillOfMaterialsDto,
  BillOfMaterialsQueryDto,
} from "../../dto/bill-of-materials.dto";
import { InventoryService } from "../inventory/inventory.service";

@Injectable()
export class BillOfMaterialsService {
  constructor(
    @InjectModel(BillOfMaterials.name)
    private readonly billOfMaterialsModel: Model<BillOfMaterialsDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly inventoryService: InventoryService,
  ) { }

  /**
   * Crear un BOM
   */
  async create(
    dto: CreateBillOfMaterialsDto,
    user: any,
    session?: ClientSession,
  ): Promise<BillOfMaterials> {
    // STEP 1: Convertir IDs INMEDIATAMENTE
    const productId = new Types.ObjectId(dto.productId);
    const tenantId = new Types.ObjectId(user.tenantId);
    const productVariantId = dto.productVariantId
      ? new Types.ObjectId(dto.productVariantId)
      : undefined;

    // STEP 2: Verificar duplicados
    const existing = await this.billOfMaterialsModel
      .findOne({ code: dto.code, tenantId })
      .lean()
      .exec();

    if (existing) {
      throw new BadRequestException(`BOM con código ${dto.code} ya existe`);
    }

    // STEP 3: Convertir IDs de componentes
    const components = dto.components.map((comp) => ({
      ...comp,
      componentProductId: new Types.ObjectId(comp.componentProductId),
      componentVariantId: comp.componentVariantId
        ? new Types.ObjectId(comp.componentVariantId)
        : undefined,
    }));

    // Convertir IDs de byproducts
    const byproducts = dto.byproducts?.map((bp) => ({
      ...bp,
      byproductProductId: new Types.ObjectId(bp.byproductProductId),
    }));

    // STEP 4: Crear documento
    const bom = new this.billOfMaterialsModel({
      ...dto,
      productId,
      productVariantId,
      components,
      byproducts,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return bom.save({ session });
  }

  /**
   * Listar BOMs con paginación
   */
  async findAll(query: BillOfMaterialsQueryDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, productId, isActive } = query;

    const filter: any = { tenantId };
    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }
    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    const [data, total] = await Promise.all([
      this.billOfMaterialsModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .populate("productId", "name sku")
        .populate("components.componentProductId", "name sku")
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.billOfMaterialsModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Obtener un BOM por ID
   */
  async findOne(id: string, user: any): Promise<BillOfMaterials> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const bom = await this.billOfMaterialsModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .populate("productId", "name sku")
      .populate("components.componentProductId", "name sku unitOfMeasure variants")
      .lean()
      .exec();

    if (!bom) {
      throw new NotFoundException("BOM no encontrado");
    }

    if (bom.components && bom.components.length > 0) {
      console.log("DEBUG BOM FETCH:", JSON.stringify(bom.components[0], null, 2));
    }
    return bom;
  }

  /**
   * Obtener BOMs por productId
   */
  async findByProduct(
    productId: string,
    user: any,
  ): Promise<BillOfMaterials[]> {
    const tenantId = new Types.ObjectId(user.tenantId);
    console.log(`Searching BOM for product: ${productId} with populate...`);
    return this.billOfMaterialsModel
      .find({
        productId: new Types.ObjectId(productId),
        tenantId,
        isActive: true,
      })
      .populate("components.componentProductId", "name sku unitOfMeasure")
      .lean()
      .exec();
  }

  /**
   * Actualizar un BOM
   */
  async update(
    id: string,
    dto: UpdateBillOfMaterialsDto,
    user: any,
    session?: ClientSession,
  ): Promise<BillOfMaterials> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Verificar que existe
    const existing = await this.billOfMaterialsModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .exec();

    if (!existing) {
      throw new NotFoundException("BOM no encontrado");
    }

    // Si se actualiza el código, verificar duplicados
    if (dto.code && dto.code !== existing.code) {
      const duplicate = await this.billOfMaterialsModel
        .findOne({ code: dto.code, tenantId })
        .lean()
        .exec();

      if (duplicate) {
        throw new BadRequestException(`BOM con código ${dto.code} ya existe`);
      }
    }

    // Convertir IDs de componentes si se actualizan
    const updateData: any = { ...dto };
    if (dto.components) {
      updateData.components = dto.components.map((comp) => ({
        ...comp,
        componentProductId: new Types.ObjectId(comp.componentProductId),
        componentVariantId: comp.componentVariantId
          ? new Types.ObjectId(comp.componentVariantId)
          : undefined,
      }));
    }

    if (dto.byproducts) {
      updateData.byproducts = dto.byproducts.map((bp) => ({
        ...bp,
        byproductProductId: new Types.ObjectId(bp.byproductProductId),
      }));
    }

    updateData.updatedBy = new Types.ObjectId(user._id);

    const updated = await this.billOfMaterialsModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updateData },
        { new: true, session },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("BOM no encontrado");
    }

    return updated;
  }

  /**
   * Eliminar un BOM
   */
  async delete(id: string, user: any, session?: ClientSession): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.billOfMaterialsModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId }, { session })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("BOM no encontrado");
    }
  }

  /**
   * Calcular costo total de materiales de un BOM
   */
  async calculateTotalMaterialCost(id: string, user: any): Promise<number> {
    const bom = await this.findOne(id, user);
    let totalCost = 0;

    // Calcular costo de cada componente
    for (const component of bom.components) {
      const product = await this.productModel
        .findById(component.componentProductId)
        .lean()
        .exec();

      if (!product) continue;

      let unitCost = 0;

      // 1. Intentar obtener costo promedio del inventario
      const inventory = await this.inventoryService.findByProductSku(
        product.sku,
        user.tenantId,
      );

      if (inventory && inventory.averageCostPrice > 0) {
        unitCost = inventory.averageCostPrice;
      }

      // 2. Si no hay costo en inventario, usar el costo base del producto/variante
      if (unitCost === 0 && product.variants && product.variants.length > 0) {
        // Si hay una variante específica seleccionada en el componente, deberíamos buscar esa
        // Pero por simplicidad ahora usamos la primera o la que coincida
        if (component.componentVariantId) {
          const variantIdStr = component.componentVariantId.toString();
          const variant = product.variants.find(v => v._id && v._id.toString() === variantIdStr);
          if (variant) unitCost = variant.costPrice;
        } else {
          // Usar la primera variante (producto simple o base)
          unitCost = product.variants[0].costPrice;
        }
      }

      totalCost += component.quantity * unitCost;
    }

    return totalCost;
  }

  /**
   * Verificar disponibilidad de componentes
   */
  async checkComponentsAvailability(
    id: string,
    quantityToProduce: number,
    user: any,
  ): Promise<{
    allAvailable: boolean;
    missing: Array<{
      sku: string;
      name: string;
      required: number;
      available: number;
    }>;
  }> {
    const bom = await this.findOne(id, user);
    const missing: Array<{
      sku: string;
      name: string;
      required: number;
      available: number;
    }> = [];

    // Verificar cada componente
    for (const component of bom.components) {
      const product = await this.productModel
        .findById(component.componentProductId)
        .lean()
        .exec();

      if (!product) {
        missing.push({
          sku: "UNKNOWN",
          name: "Producto no encontrado",
          required: component.quantity * quantityToProduce,
          available: 0,
        });
        continue;
      }

      // Buscar inventario
      const inventory = await this.inventoryService.findByProductSku(
        product.sku,
        user.tenantId,
      );

      // Calcular cantidad requerida (incluyendo scrap)
      const scrapFactor = 1 + component.scrapPercentage / 100;
      const requiredQuantity =
        component.quantity * quantityToProduce * scrapFactor;

      if (!inventory || inventory.availableQuantity < requiredQuantity) {
        missing.push({
          sku: product.sku,
          name: product.name,
          required: requiredQuantity,
          available: inventory?.availableQuantity || 0,
        });
      }
    }

    return {
      allAvailable: missing.length === 0,
      missing,
    };
  }

  /**
   * Explosión recursiva de BOM multinivel
   * Calcula todos los materiales necesarios atravesando la jerarquía completa
   *
   * @param id - ID del BOM a explotar
   * @param quantityToProduce - Cantidad a producir del producto final
   * @param user - Usuario autenticado
   * @returns Array de materiales con cantidades totales requeridas por nivel
   */
  async explodeBOM(
    id: string,
    quantityToProduce: number,
    user: any,
  ): Promise<{
    levels: Array<{
      level: number;
      items: Array<{
        productId: string;
        productName: string;
        sku: string;
        quantity: number;
        unit: string;
        scrapPercentage: number;
        isPhantom: boolean; // Si es un sub-ensamble
        hasBOM: boolean;
      }>;
    }>;
    flatList: Array<{
      productId: string;
      productName: string;
      sku: string;
      totalQuantity: number;
      unit: string;
    }>;
  }> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const visited = new Set<string>(); // Para detectar dependencias circulares
    const levels: Map<number, any[]> = new Map();
    const materialTotals: Map<
      string,
      {
        productId: string;
        productName: string;
        sku: string;
        totalQuantity: number;
        unit: string;
      }
    > = new Map();

    // Función recursiva interna
    const explodeRecursive = async (
      bomId: string,
      quantity: number,
      level: number,
      path: string[],
    ): Promise<void> => {
      // Detectar dependencias circulares
      if (visited.has(bomId)) {
        throw new BadRequestException(
          `Dependencia circular detectada en BOM: ${path.join(" -> ")} -> ${bomId}`,
        );
      }

      visited.add(bomId);

      // Cargar el BOM
      const bom = await this.billOfMaterialsModel
        .findOne({ _id: new Types.ObjectId(bomId), tenantId })
        .populate("components.componentProductId", "name sku")
        .lean()
        .exec();

      if (!bom) {
        visited.delete(bomId);
        return;
      }

      // Inicializar nivel si no existe
      if (!levels.has(level)) {
        levels.set(level, []);
      }

      // Procesar cada componente
      for (const component of bom.components) {
        const product: any = component.componentProductId;
        if (!product) continue;

        // Calcular cantidad requerida (incluyendo scrap)
        const scrapFactor = 1 + component.scrapPercentage / 100;
        const requiredQuantity = component.quantity * quantity * scrapFactor;

        // Verificar si este componente tiene su propio BOM (es un sub-ensamble)
        const componentBOM = await this.billOfMaterialsModel
          .findOne({
            productId: product._id,
            tenantId,
            isActive: true,
          })
          .lean()
          .exec();

        const hasBOM = !!componentBOM;

        // Agregar al nivel actual
        levels.get(level)!.push({
          productId: product._id.toString(),
          productName: product.name,
          sku: product.sku,
          quantity: requiredQuantity,
          unit: component.unit,
          scrapPercentage: component.scrapPercentage,
          isPhantom: hasBOM,
          hasBOM,
        });

        // Si tiene BOM, explotar recursivamente
        if (hasBOM) {
          await explodeRecursive(
            componentBOM._id.toString(),
            requiredQuantity,
            level + 1,
            [...path, product.name],
          );
        } else {
          // Es un material base, agregar al total
          const key = product._id.toString();
          if (materialTotals.has(key)) {
            const existing = materialTotals.get(key)!;
            existing.totalQuantity += requiredQuantity;
          } else {
            materialTotals.set(key, {
              productId: product._id.toString(),
              productName: product.name,
              sku: product.sku,
              totalQuantity: requiredQuantity,
              unit: component.unit,
            });
          }
        }
      }

      visited.delete(bomId);
    };

    // Iniciar explosión desde el nivel 0
    await explodeRecursive(id, quantityToProduce, 0, []);

    // Convertir Map a Array ordenado por nivel
    const levelsArray = Array.from(levels.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([level, items]) => ({ level, items }));

    // Convertir Map de totales a Array
    const flatList = Array.from(materialTotals.values());

    return {
      levels: levelsArray,
      flatList,
    };
  }

  /**
   * Obtener estructura jerárquica de BOM para visualización en árbol
   *
   * @param id - ID del BOM
   * @param user - Usuario autenticado
   * @returns Estructura de árbol con componentes anidados
   */
  async getBOMStructure(id: string, user: any): Promise<any> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const visited = new Set<string>();

    const buildTree = async (
      bomId: string,
      quantity: number,
      level: number,
    ): Promise<any> => {
      // Detectar dependencias circulares
      if (visited.has(bomId)) {
        return {
          error: "Circular dependency detected",
          bomId,
        };
      }

      visited.add(bomId);

      // Cargar BOM
      const bom = await this.billOfMaterialsModel
        .findOne({ _id: new Types.ObjectId(bomId), tenantId })
        .populate("productId", "name sku")
        .populate("components.componentProductId", "name sku")
        .lean()
        .exec();

      if (!bom) {
        visited.delete(bomId);
        return null;
      }

      const product: any = bom.productId;

      // Construir nodo
      const node: any = {
        bomId: bom._id.toString(),
        productId: product._id.toString(),
        productName: product.name,
        sku: product.sku,
        quantity: bom.productionQuantity,
        level,
        children: [],
      };

      // Procesar componentes
      for (const component of bom.components) {
        const compProduct: any = component.componentProductId;
        if (!compProduct) continue;

        // Verificar si tiene BOM
        const componentBOM = await this.billOfMaterialsModel
          .findOne({
            productId: compProduct._id,
            tenantId,
            isActive: true,
          })
          .lean()
          .exec();

        if (componentBOM) {
          // Recursivamente construir sub-árbol
          const childNode = await buildTree(
            componentBOM._id.toString(),
            component.quantity,
            level + 1,
          );
          if (childNode) {
            node.children.push({
              ...childNode,
              requiredQuantity: component.quantity,
              unit: component.unit,
              scrapPercentage: component.scrapPercentage,
            });
          }
        } else {
          // Es un material base
          node.children.push({
            productId: compProduct._id.toString(),
            productName: compProduct.name,
            sku: compProduct.sku,
            quantity: component.quantity,
            unit: component.unit,
            scrapPercentage: component.scrapPercentage,
            level: level + 1,
            isLeaf: true,
          });
        }
      }

      visited.delete(bomId);
      return node;
    };

    return buildTree(id, 1, 0);
  }
}
