import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UnitConversion,
  UnitConversionDocument,
} from "../../schemas/unit-conversion.schema";
import {
  CreateUnitConversionDto,
  UpdateUnitConversionDto,
  UnitConversionQueryDto,
} from "../../dto/unit-conversion.dto";

@Injectable()
export class UnitConversionsService {
  constructor(
    @InjectModel(UnitConversion.name)
    private unitConversionModel: Model<UnitConversionDocument>,
  ) {}

  /**
   * Crear una nueva configuración de conversión de unidades
   */
  async create(
    dto: CreateUnitConversionDto,
    user: any,
  ): Promise<UnitConversionDocument> {
    // PASO 1: Convertir IDs a ObjectId INMEDIATAMENTE
    const productObjectId = new Types.ObjectId(dto.productId);
    const tenantObjectId = new Types.ObjectId(user.tenantId);

    // PASO 2: Verificar que no existe ya una configuración para este producto
    const existingConfig = await this.unitConversionModel
      .findOne({
        productId: productObjectId,
        tenantId: tenantObjectId,
      })
      .lean()
      .exec();

    if (existingConfig) {
      throw new BadRequestException(
        "Este producto ya tiene configuración de unidades",
      );
    }

    // PASO 3: Preparar datos con conversiones de tipo
    const data = {
      ...dto,
      productId: productObjectId,
      tenantId: tenantObjectId,
      conversions: dto.conversions || [], // Default a array vacío
      createdBy: user.id,
    };

    // PASO 4: Crear usando new + save
    const created = new this.unitConversionModel(data);
    return created.save();
  }

  /**
   * Listar configuraciones con paginación y filtros
   */
  async findAll(query: UnitConversionQueryDto, tenantId: string) {
    const { page = 1, limit = 20, productId, productSku, isActive } = query;

    // PASO 1: Construir filtro con conversión de IDs
    const filter: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
    };

    if (productId) {
      filter.productId = new Types.ObjectId(productId);
    }

    if (productSku) {
      filter.productSku = productSku;
    }

    if (isActive !== undefined) {
      filter.isActive = isActive;
    }

    // PASO 2: Calcular skip y limit
    const skip = (page - 1) * limit;

    // PASO 3: Query con lean() para lectura
    const [items, total] = await Promise.all([
      this.unitConversionModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.unitConversionModel.countDocuments(filter).exec(),
    ]);

    // PASO 4: Calcular paginación
    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  /**
   * Obtener una configuración por ID
   */
  async findOne(
    id: string,
    tenantId: string,
  ): Promise<UnitConversionDocument | null> {
    return this.unitConversionModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();
  }

  /**
   * Obtener configuración por ID de producto
   */
  async findByProductId(
    productId: string,
    tenantId: string,
  ): Promise<UnitConversionDocument | null> {
    return this.unitConversionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .lean()
      .exec();
  }

  /**
   * Actualizar una configuración
   */
  async update(
    id: string,
    dto: UpdateUnitConversionDto,
    user: any,
  ): Promise<UnitConversionDocument | null> {
    // PASO 1: Convertir IDs
    const idObjectId = new Types.ObjectId(id);
    const tenantObjectId = new Types.ObjectId(user.tenantId);

    // PASO 2: Preparar datos de actualización
    const updateData = {
      ...dto,
      updatedBy: user.id,
    };

    // PASO 3: Actualizar y retornar nuevo documento
    return this.unitConversionModel
      .findOneAndUpdate(
        {
          _id: idObjectId,
          tenantId: tenantObjectId,
        },
        updateData,
        { new: true },
      )
      .exec();
  }

  /**
   * Eliminar una configuración
   */
  async remove(id: string, tenantId: string): Promise<any> {
    const result = await this.unitConversionModel
      .deleteOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Configuración de unidades no encontrada");
    }

    return result;
  }

  /**
   * Convertir un valor de una unidad a otra
   */
  async convert(
    value: number,
    fromUnit: string,
    toUnit: string,
    productId: string,
    tenantId: string,
  ): Promise<number> {
    // CASO 1: Misma unidad, retornar valor sin cambios
    if (fromUnit === toUnit) {
      return value;
    }

    // PASO 1: Obtener configuración del producto
    const config = await this.unitConversionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .lean()
      .exec();

    if (!config) {
      throw new NotFoundException(
        "Configuración de unidades no encontrada para este producto",
      );
    }

    // PASO 2: Buscar reglas de conversión
    const fromRule = config.conversions.find(
      (c) => c.unit === fromUnit && c.isActive,
    );
    const toRule = config.conversions.find(
      (c) => c.unit === toUnit && c.isActive,
    );

    if (!fromRule || !toRule) {
      throw new BadRequestException(
        `No se puede convertir de ${fromUnit} a ${toUnit}`,
      );
    }

    // PASO 3: Convertir a unidad base primero, luego a unidad destino
    const valueInBase = value * fromRule.factor;
    const result = valueInBase / toRule.factor;

    return result;
  }

  /**
   * Convertir a unidad base
   */
  async convertToBase(
    value: number,
    fromUnit: string,
    productId: string,
    tenantId: string,
  ): Promise<number> {
    const config = await this.unitConversionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .lean()
      .exec();

    if (!config) {
      throw new NotFoundException(
        "Configuración de unidades no encontrada para este producto",
      );
    }

    // Si ya está en la unidad base, retornar
    if (fromUnit === config.baseUnit) {
      return value;
    }

    const fromRule = config.conversions.find(
      (c) => c.unit === fromUnit && c.isActive,
    );

    if (!fromRule) {
      throw new BadRequestException(
        `Unidad ${fromUnit} no encontrada en la configuración`,
      );
    }

    return value * fromRule.factor;
  }

  /**
   * Convertir desde unidad base a otra unidad
   */
  async convertFromBase(
    value: number,
    toUnit: string,
    productId: string,
    tenantId: string,
  ): Promise<number> {
    const config = await this.unitConversionModel
      .findOne({
        productId: new Types.ObjectId(productId),
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
      })
      .lean()
      .exec();

    if (!config) {
      throw new NotFoundException(
        "Configuración de unidades no encontrada para este producto",
      );
    }

    // Si es la unidad base, retornar
    if (toUnit === config.baseUnit) {
      return value;
    }

    const toRule = config.conversions.find(
      (c) => c.unit === toUnit && c.isActive,
    );

    if (!toRule) {
      throw new BadRequestException(
        `Unidad ${toUnit} no encontrada en la configuración`,
      );
    }

    return value / toRule.factor;
  }
}
