import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PriceList, PriceListDocument } from '../../schemas/price-list.schema';
import {
  ProductPriceList,
  ProductPriceListDocument,
} from '../../schemas/product-price-list.schema';
import {
  CreatePriceListDto,
  UpdatePriceListDto,
  AssignProductToPriceListDto,
  BulkAssignProductsToPriceListDto,
} from '../../dto/price-list.dto';

@Injectable()
export class PriceListsService {
  private readonly logger = new Logger(PriceListsService.name);

  constructor(
    @InjectModel(PriceList.name)
    private priceListModel: Model<PriceListDocument>,
    @InjectModel(ProductPriceList.name)
    private productPriceListModel: Model<ProductPriceListDocument>,
  ) {}

  /**
   * Crea una nueva lista de precios
   */
  async create(
    dto: CreatePriceListDto,
    tenantId: string,
    userId: string,
    userName: string,
  ): Promise<PriceListDocument> {
    // Validar fechas
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    const priceList = new this.priceListModel({
      ...dto,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
      createdByName: userName,
    });

    const saved = await priceList.save();
    this.logger.log(`Price list created: ${saved.name} (${saved._id})`);
    return saved;
  }

  /**
   * Obtiene todas las listas de precios de un tenant
   */
  async findAll(tenantId: string, activeOnly = false): Promise<PriceListDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };
    if (activeOnly) {
      query.isActive = true;
    }

    return this.priceListModel.find(query).sort({ priority: -1, createdAt: -1 }).lean();
  }

  /**
   * Obtiene una lista de precios por ID
   */
  async findOne(id: string, tenantId: string): Promise<PriceListDocument> {
    const priceList = await this.priceListModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!priceList) {
      throw new NotFoundException('Lista de precios no encontrada');
    }

    return priceList;
  }

  /**
   * Actualiza una lista de precios
   */
  async update(
    id: string,
    dto: UpdatePriceListDto,
    tenantId: string,
  ): Promise<PriceListDocument> {
    // Validar fechas si se actualizan
    if (dto.startDate && dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    const updated = await this.priceListModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: dto },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException('Lista de precios no encontrada');
    }

    this.logger.log(`Price list updated: ${updated.name} (${id})`);
    return updated;
  }

  /**
   * Elimina una lista de precios y todas sus asignaciones
   */
  async remove(id: string, tenantId: string): Promise<void> {
    const priceList = await this.findOne(id, tenantId);

    // Eliminar todas las asignaciones de productos a esta lista
    await this.productPriceListModel.deleteMany({
      priceListId: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    // Eliminar la lista
    await this.priceListModel.deleteOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    this.logger.log(`Price list deleted: ${priceList.name} (${id})`);
  }

  /**
   * Asigna un producto a una lista de precios con precio personalizado
   */
  async assignProduct(
    dto: AssignProductToPriceListDto,
    tenantId: string,
    userId: string,
    userName: string,
  ): Promise<ProductPriceListDocument> {
    // Verificar que la lista existe
    await this.findOne(dto.priceListId, tenantId);

    // Verificar si ya existe una asignación
    const existing = await this.productPriceListModel.findOne({
      variantSku: dto.variantSku,
      priceListId: new Types.ObjectId(dto.priceListId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (existing) {
      // Actualizar existente
      existing.customPrice = dto.customPrice;
      existing.isActive = dto.isActive ?? existing.isActive;
      existing.notes = dto.notes ?? existing.notes;
      existing.validFrom = dto.validFrom ? new Date(dto.validFrom) : existing.validFrom;
      existing.validUntil = dto.validUntil ? new Date(dto.validUntil) : existing.validUntil;
      existing.lastUpdatedBy = new Types.ObjectId(userId);
      existing.lastUpdatedByName = userName;

      return existing.save();
    }

    // Crear nueva asignación
    const assignment = new this.productPriceListModel({
      productId: new Types.ObjectId(dto.productId),
      variantSku: dto.variantSku,
      priceListId: new Types.ObjectId(dto.priceListId),
      tenantId: new Types.ObjectId(tenantId),
      customPrice: dto.customPrice,
      isActive: dto.isActive ?? true,
      notes: dto.notes,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      lastUpdatedBy: new Types.ObjectId(userId),
      lastUpdatedByName: userName,
    });

    const saved = await assignment.save();
    this.logger.log(
      `Product ${dto.variantSku} assigned to price list ${dto.priceListId} with price ${dto.customPrice}`,
    );
    return saved;
  }

  /**
   * Asignación masiva de productos a una lista de precios
   */
  async bulkAssignProducts(
    dto: BulkAssignProductsToPriceListDto,
    tenantId: string,
    userId: string,
    userName: string,
  ): Promise<{ created: number; updated: number }> {
    await this.findOne(dto.priceListId, tenantId);

    let created = 0;
    let updated = 0;

    for (const product of dto.products) {
      const assignDto: AssignProductToPriceListDto = {
        productId: product.productId,
        variantSku: product.variantSku,
        priceListId: dto.priceListId,
        customPrice: product.customPrice,
        notes: product.notes,
      };

      const existing = await this.productPriceListModel.findOne({
        variantSku: product.variantSku,
        priceListId: new Types.ObjectId(dto.priceListId),
        tenantId: new Types.ObjectId(tenantId),
      });

      if (existing) {
        updated++;
      } else {
        created++;
      }

      await this.assignProduct(assignDto, tenantId, userId, userName);
    }

    this.logger.log(
      `Bulk assignment completed: ${created} created, ${updated} updated in price list ${dto.priceListId}`,
    );
    return { created, updated };
  }

  /**
   * Obtiene todos los productos asignados a una lista de precios
   */
  async getProductsInPriceList(
    priceListId: string,
    tenantId: string,
  ): Promise<ProductPriceListDocument[]> {
    return this.productPriceListModel
      .find({
        priceListId: new Types.ObjectId(priceListId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .sort({ variantSku: 1 })
      .lean();
  }

  /**
   * Obtiene todas las listas de precios de un producto específico
   */
  async getPriceListsForProduct(
    productId: string,
    variantSku: string,
    tenantId: string,
  ): Promise<any[]> {
    const assignments = await this.productPriceListModel
      .find({
        productId: new Types.ObjectId(productId),
        variantSku,
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .populate('priceListId')
      .lean();

    return assignments.map((a: any) => ({
      priceListId: a.priceListId._id,
      priceListName: a.priceListId.name,
      priceListType: a.priceListId.type,
      customPrice: a.customPrice,
      notes: a.notes,
      validFrom: a.validFrom,
      validUntil: a.validUntil,
    }));
  }

  /**
   * Elimina una asignación de producto a lista de precios
   */
  async removeProductFromPriceList(
    priceListId: string,
    variantSku: string,
    tenantId: string,
  ): Promise<void> {
    await this.productPriceListModel.deleteOne({
      priceListId: new Types.ObjectId(priceListId),
      variantSku,
      tenantId: new Types.ObjectId(tenantId),
    });

    this.logger.log(`Product ${variantSku} removed from price list ${priceListId}`);
  }

  /**
   * Obtiene el precio de un producto según lista de precios (con validación de fechas)
   */
  async getProductPrice(
    variantSku: string,
    priceListId: string,
    tenantId: string,
  ): Promise<number | null> {
    const now = new Date();

    const assignment = await this.productPriceListModel
      .findOne({
        variantSku,
        priceListId: new Types.ObjectId(priceListId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        $or: [
          { validFrom: { $exists: false } },
          { validFrom: { $lte: now } },
        ],
        $and: [
          {
            $or: [
              { validUntil: { $exists: false } },
              { validUntil: { $gte: now } },
            ],
          },
        ],
      })
      .lean();

    return assignment ? assignment.customPrice : null;
  }
}
