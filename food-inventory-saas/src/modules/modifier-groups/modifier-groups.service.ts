import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { ModifierGroup } from "../../schemas/modifier-group.schema";
import { Modifier } from "../../schemas/modifier.schema";
import {
  CreateModifierGroupDto,
  UpdateModifierGroupDto,
  AssignGroupToProductsDto,
} from "../../dto/modifier-group.dto";
import { CreateModifierDto, UpdateModifierDto } from "../../dto/modifier.dto";

@Injectable()
export class ModifierGroupsService {
  private readonly logger = new Logger(ModifierGroupsService.name);

  constructor(
    @InjectModel(ModifierGroup.name)
    private modifierGroupModel: Model<ModifierGroup>,
    @InjectModel(Modifier.name)
    private modifierModel: Model<Modifier>,
  ) {}

  /**
   * Crear un nuevo grupo de modificadores
   */
  async createGroup(
    dto: CreateModifierGroupDto,
    tenantId: string,
  ): Promise<ModifierGroup> {
    this.logger.log(
      `Creating modifier group: ${dto.name} for tenant: ${tenantId}`,
    );

    // Validar que minSelections <= maxSelections
    if (
      dto.maxSelections &&
      dto.minSelections &&
      dto.minSelections > dto.maxSelections
    ) {
      throw new BadRequestException(
        "minSelections cannot be greater than maxSelections",
      );
    }

    const group = new this.modifierGroupModel({
      ...dto,
      tenantId,
      isDeleted: false,
    });

    return group.save();
  }

  /**
   * Listar todos los grupos de modificadores
   */
  async findAllGroups(tenantId: string): Promise<ModifierGroup[]> {
    return this.modifierGroupModel
      .find({ tenantId, isDeleted: false })
      .populate("applicableProducts", "name sku category isActive")  // OPTIMIZED: Only load needed fields
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()  // OPTIMIZED: Faster read-only operation
      .exec();
  }

  /**
   * Obtener un grupo por ID
   */
  async findGroupById(id: string, tenantId: string): Promise<ModifierGroup> {
    const group = await this.modifierGroupModel
      .findOne({ _id: id, tenantId, isDeleted: false })
      .populate("applicableProducts", "name sku category isActive")  // OPTIMIZED: Only load needed fields
      .lean()  // OPTIMIZED: Faster read-only operation
      .exec();

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    return group;
  }

  /**
   * Obtener grupos aplicables a un producto específico
   */
  async findGroupsByProduct(
    productId: string,
    tenantId: string,
  ): Promise<ModifierGroup[]> {
    const productObjectId = new Types.ObjectId(productId);

    // OPTIMIZED: Single query for all groups
    const groups = await this.modifierGroupModel
      .find({
        tenantId,
        isDeleted: false,
        available: true,
        applicableProducts: productObjectId,
      })
      .sort({ sortOrder: 1 })
      .lean()  // Faster read-only
      .exec();

    if (groups.length === 0) {
      return [];
    }

    // OPTIMIZED: Single batch query for ALL modifiers instead of N queries
    const groupIds = groups.map(g => g._id);
    const allModifiers = await this.modifierModel
      .find({
        tenantId,
        groupId: { $in: groupIds },
        isDeleted: false,
        available: true,
      })
      .sort({ sortOrder: 1 })
      .lean()  // Faster read-only
      .exec();

    // Group modifiers by groupId in memory (O(n) operation, much faster than N queries)
    const modifiersByGroup = new Map();
    allModifiers.forEach(modifier => {
      const groupId = modifier.groupId.toString();
      if (!modifiersByGroup.has(groupId)) {
        modifiersByGroup.set(groupId, []);
      }
      modifiersByGroup.get(groupId).push(modifier);
    });

    // Attach modifiers to their groups
    const groupsWithModifiers = groups.map(group => ({
      ...group,
      modifiers: modifiersByGroup.get(group._id.toString()) || [],
    }));

    return groupsWithModifiers as any;
  }

  /**
   * Actualizar un grupo
   */
  async updateGroup(
    id: string,
    dto: UpdateModifierGroupDto,
    tenantId: string,
  ): Promise<ModifierGroup> {
    // Validar minSelections vs maxSelections
    if (
      dto.maxSelections &&
      dto.minSelections &&
      dto.minSelections > dto.maxSelections
    ) {
      throw new BadRequestException(
        "minSelections cannot be greater than maxSelections",
      );
    }

    const group = await this.modifierGroupModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    this.logger.log(`Updated modifier group: ${id}`);
    return group;
  }

  /**
   * Eliminar un grupo (soft delete)
   */
  async deleteGroup(id: string, tenantId: string): Promise<void> {
    const group = await this.modifierGroupModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true },
      )
      .exec();

    if (!group) {
      throw new NotFoundException(`Modifier group with ID ${id} not found`);
    }

    // También eliminar todos los modificadores del grupo
    await this.modifierModel
      .updateMany(
        { groupId: id, tenantId, isDeleted: false },
        { $set: { isDeleted: true } },
      )
      .exec();

    this.logger.log(`Deleted modifier group and its modifiers: ${id}`);
  }

  /**
   * Asignar grupo a productos
   */
  async assignGroupToProducts(
    dto: AssignGroupToProductsDto,
    tenantId: string,
  ): Promise<ModifierGroup> {
    const { groupId, productIds } = dto;

    const group = await this.modifierGroupModel
      .findOneAndUpdate(
        { _id: groupId, tenantId, isDeleted: false },
        {
          $addToSet: {
            applicableProducts: {
              $each: productIds.map((id) => new Types.ObjectId(id)),
            },
          },
        },
        { new: true },
      )
      .exec();

    if (!group) {
      throw new NotFoundException(
        `Modifier group with ID ${groupId} not found`,
      );
    }

    this.logger.log(
      `Assigned group ${groupId} to ${productIds.length} products`,
    );
    return group;
  }

  /**
   * Remover grupo de productos
   */
  async removeGroupFromProducts(
    groupId: string,
    productIds: string[],
    tenantId: string,
  ): Promise<ModifierGroup> {
    const group = await this.modifierGroupModel
      .findOneAndUpdate(
        { _id: groupId, tenantId, isDeleted: false },
        {
          $pullAll: {
            applicableProducts: productIds.map((id) => new Types.ObjectId(id)),
          },
        },
        { new: true },
      )
      .exec();

    if (!group) {
      throw new NotFoundException(
        `Modifier group with ID ${groupId} not found`,
      );
    }

    return group;
  }

  // ========================================
  // MÉTODOS PARA MODIFIERS INDIVIDUALES
  // ========================================

  /**
   * Crear un modificador dentro de un grupo
   */
  async createModifier(
    dto: CreateModifierDto,
    tenantId: string,
  ): Promise<Modifier> {
    // Verificar que el grupo existe
    const group = await this.findGroupById(dto.groupId, tenantId);

    if (!group) {
      throw new BadRequestException(
        `Modifier group with ID ${dto.groupId} not found`,
      );
    }

    this.logger.log(`Creating modifier: ${dto.name} in group: ${dto.groupId}`);

    const modifier = new this.modifierModel({
      ...dto,
      tenantId,
      isDeleted: false,
    });

    return modifier.save();
  }

  /**
   * Listar todos los modificadores de un grupo
   */
  async findModifiersByGroup(
    groupId: string,
    tenantId: string,
  ): Promise<Modifier[]> {
    return this.modifierModel
      .find({ groupId, tenantId, isDeleted: false })
      .sort({ sortOrder: 1, createdAt: 1 })
      .exec();
  }

  /**
   * Actualizar un modificador
   */
  async updateModifier(
    id: string,
    dto: UpdateModifierDto,
    tenantId: string,
  ): Promise<Modifier> {
    const modifier = await this.modifierModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: dto },
        { new: true },
      )
      .exec();

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    this.logger.log(`Updated modifier: ${id}`);
    return modifier;
  }

  /**
   * Eliminar un modificador (soft delete)
   */
  async deleteModifier(id: string, tenantId: string): Promise<void> {
    const modifier = await this.modifierModel
      .findOneAndUpdate(
        { _id: id, tenantId, isDeleted: false },
        { $set: { isDeleted: true } },
        { new: true },
      )
      .exec();

    if (!modifier) {
      throw new NotFoundException(`Modifier with ID ${id} not found`);
    }

    this.logger.log(`Deleted modifier: ${id}`);
  }
}
