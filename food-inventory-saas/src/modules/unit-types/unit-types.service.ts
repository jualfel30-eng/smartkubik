import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  UnitType,
  UnitTypeDocument,
  UnitCategory,
} from "../../schemas/unit-type.schema";
import {
  CreateUnitTypeDto,
  UpdateUnitTypeDto,
  UnitTypeQueryDto,
  ConvertUnitsDto,
  ConvertUnitsResponseDto,
} from "../../dto/unit-type.dto";

@Injectable()
export class UnitTypesService {
  private readonly logger = new Logger(UnitTypesService.name);

  constructor(
    @InjectModel(UnitType.name)
    private readonly unitTypeModel: Model<UnitTypeDocument>,
  ) {}

  /**
   * Create a new UnitType
   */
  async create(
    createDto: CreateUnitTypeDto,
    tenantId?: string,
    userId?: string,
  ): Promise<UnitTypeDocument> {
    // Check if a UnitType with the same name already exists
    const existing = await this.unitTypeModel
      .findOne({
        name: createDto.name,
        tenantId: tenantId ? new Types.ObjectId(tenantId) : null,
      })
      .lean();

    if (existing) {
      throw new ConflictException(
        `Ya existe un tipo de unidad con el nombre "${createDto.name}"`,
      );
    }

    // Validate that there's exactly one base unit
    const baseUnits = createDto.conversions.filter((c) => c.isBase);
    if (baseUnits.length === 0) {
      throw new BadRequestException(
        "Debe haber exactamente una unidad base (isBase: true)",
      );
    }
    if (baseUnits.length > 1) {
      throw new BadRequestException(
        "Solo puede haber una unidad base (isBase: true)",
      );
    }

    // Validate that base unit has factor = 1.0
    const baseUnit = baseUnits[0];
    if (baseUnit.factor !== 1.0) {
      throw new BadRequestException(
        "La unidad base debe tener factor de conversión 1.0",
      );
    }

    // Validate that baseUnit matches one of the conversions
    const baseUnitConversion = createDto.conversions.find(
      (c) => c.abbreviation === createDto.baseUnit.abbreviation,
    );
    if (!baseUnitConversion) {
      throw new BadRequestException(
        `La unidad base "${createDto.baseUnit.abbreviation}" debe estar incluida en las conversiones`,
      );
    }

    // Validate no duplicate abbreviations
    const abbreviations = createDto.conversions.map((c) => c.abbreviation);
    const uniqueAbbreviations = new Set(abbreviations);
    if (abbreviations.length !== uniqueAbbreviations.size) {
      throw new BadRequestException(
        "No puede haber abreviaciones duplicadas en las conversiones",
      );
    }

    const unitType = await this.unitTypeModel.create({
      ...createDto,
      tenantId: tenantId ? new Types.ObjectId(tenantId) : null,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isActive: true,
    });

    this.logger.log(`Created UnitType: ${unitType.name} (${unitType._id})`);

    return unitType;
  }

  /**
   * Find all UnitTypes with filters
   */
  async findAll(
    query: UnitTypeQueryDto,
    tenantId?: string,
  ): Promise<UnitTypeDocument[]> {
    const filter: any = {};

    // Category filter
    if (query.category) {
      filter.category = query.category;
    }

    // Active filter
    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    // System defined filter
    if (query.isSystemDefined !== undefined) {
      filter.isSystemDefined = query.isSystemDefined;
    }

    // Tenant filter: include global (null) and tenant-specific
    if (query.includeCustom !== false && tenantId) {
      filter.$or = [
        { tenantId: null }, // Global types
        { tenantId: new Types.ObjectId(tenantId) }, // Tenant-specific
      ];
    } else if (query.includeCustom === false) {
      filter.tenantId = null; // Only global types
    }

    // Search filter
    if (query.search) {
      filter.$or = filter.$or || [];
      const searchRegex = new RegExp(query.search, "i");
      filter.$or.push(
        { name: searchRegex },
        { description: searchRegex },
        { "conversions.unit": searchRegex },
        { "conversions.abbreviation": searchRegex },
      );
    }

    const unitTypes = await this.unitTypeModel
      .find(filter)
      .sort({ isSystemDefined: -1, name: 1 })
      .lean();

    return unitTypes as UnitTypeDocument[];
  }

  /**
   * Find one UnitType by ID
   */
  async findOne(id: string): Promise<UnitTypeDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException("ID de tipo de unidad inválido");
    }

    const unitType = await this.unitTypeModel.findById(id).lean();

    if (!unitType) {
      throw new NotFoundException(`Tipo de unidad con ID ${id} no encontrado`);
    }

    return unitType as UnitTypeDocument;
  }

  /**
   * Find UnitType by name
   */
  async findByName(
    name: string,
    tenantId?: string,
  ): Promise<UnitTypeDocument | null> {
    const filter: any = { name };

    if (tenantId) {
      filter.$or = [
        { tenantId: null },
        { tenantId: new Types.ObjectId(tenantId) },
      ];
    } else {
      filter.tenantId = null;
    }

    const unitType = await this.unitTypeModel.findOne(filter).lean();

    return unitType as UnitTypeDocument | null;
  }

  /**
   * Update a UnitType
   */
  async update(
    id: string,
    updateDto: UpdateUnitTypeDto,
    userId?: string,
  ): Promise<UnitTypeDocument> {
    const existing = await this.unitTypeModel.findById(id);

    if (!existing) {
      throw new NotFoundException(`Tipo de unidad con ID ${id} no encontrado`);
    }

    // Prevent editing system-defined types
    if (existing.isSystemDefined) {
      throw new BadRequestException(
        "No se pueden editar tipos de unidad predefinidos del sistema",
      );
    }

    // If updating conversions, validate
    if (updateDto.conversions) {
      const baseUnits = updateDto.conversions.filter((c) => c.isBase);
      if (baseUnits.length !== 1) {
        throw new BadRequestException(
          "Debe haber exactamente una unidad base (isBase: true)",
        );
      }

      if (baseUnits[0].factor !== 1.0) {
        throw new BadRequestException(
          "La unidad base debe tener factor de conversión 1.0",
        );
      }

      // Validate no duplicate abbreviations
      const abbreviations = updateDto.conversions.map((c) => c.abbreviation);
      const uniqueAbbreviations = new Set(abbreviations);
      if (abbreviations.length !== uniqueAbbreviations.size) {
        throw new BadRequestException(
          "No puede haber abreviaciones duplicadas en las conversiones",
        );
      }
    }

    const updated = await this.unitTypeModel
      .findByIdAndUpdate(
        id,
        {
          ...updateDto,
          updatedBy: userId ? new Types.ObjectId(userId) : undefined,
        },
        { new: true },
      )
      .lean();

    this.logger.log(`Updated UnitType: ${updated!.name} (${id})`);

    return updated as UnitTypeDocument;
  }

  /**
   * Soft delete a UnitType
   */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.unitTypeModel.findById(id);

    if (!existing) {
      throw new NotFoundException(`Tipo de unidad con ID ${id} no encontrado`);
    }

    // Prevent deleting system-defined types
    if (existing.isSystemDefined) {
      throw new BadRequestException(
        "No se pueden eliminar tipos de unidad predefinidos del sistema",
      );
    }

    // TODO: Check if any products are using this UnitType before deleting
    // This should query Product, ProductConsumableConfig, and ProductSupplyConfig

    await this.unitTypeModel.findByIdAndUpdate(id, { isActive: false });

    this.logger.log(`Soft deleted UnitType: ${existing.name} (${id})`);

    return {
      success: true,
      message: `Tipo de unidad "${existing.name}" desactivado correctamente`,
    };
  }

  /**
   * Hard delete a UnitType (only for non-system types)
   */
  async hardDelete(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.unitTypeModel.findById(id);

    if (!existing) {
      throw new NotFoundException(`Tipo de unidad con ID ${id} no encontrado`);
    }

    if (existing.isSystemDefined) {
      throw new BadRequestException(
        "No se pueden eliminar tipos de unidad predefinidos del sistema",
      );
    }

    await this.unitTypeModel.findByIdAndDelete(id);

    this.logger.log(`Hard deleted UnitType: ${existing.name} (${id})`);

    return {
      success: true,
      message: `Tipo de unidad "${existing.name}" eliminado permanentemente`,
    };
  }

  /**
   * Convert between units of the same UnitType
   */
  async convertUnits(dto: ConvertUnitsDto): Promise<ConvertUnitsResponseDto> {
    const unitType = await this.findOne(dto.unitTypeId);

    const fromConversion = unitType.conversions.find(
      (c) => c.abbreviation === dto.fromUnit,
    );
    const toConversion = unitType.conversions.find(
      (c) => c.abbreviation === dto.toUnit,
    );

    if (!fromConversion) {
      throw new BadRequestException(
        `Unidad "${dto.fromUnit}" no encontrada en el tipo "${unitType.name}"`,
      );
    }

    if (!toConversion) {
      throw new BadRequestException(
        `Unidad "${dto.toUnit}" no encontrada en el tipo "${unitType.name}"`,
      );
    }

    // Convert to base unit, then to target unit
    const baseQuantity = dto.quantity * fromConversion.factor;
    const convertedQuantity = baseQuantity / toConversion.factor;

    // Round to 5 decimal places to avoid floating point errors
    const roundedQuantity = Math.round(convertedQuantity * 100000) / 100000;

    return {
      original: {
        quantity: dto.quantity,
        unit: dto.fromUnit,
      },
      converted: {
        quantity: roundedQuantity,
        unit: dto.toUnit,
      },
      factor: toConversion.factor / fromConversion.factor,
      unitTypeName: unitType.name,
    };
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<{ category: UnitCategory; count: number }[]> {
    const categories = await this.unitTypeModel.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0,
        },
      },
      { $sort: { category: 1 } },
    ]);

    return categories;
  }

  /**
   * Get conversion factor between two units in the same UnitType
   */
  async getConversionFactor(
    unitTypeId: string,
    fromUnit: string,
    toUnit: string,
  ): Promise<number> {
    const unitType = await this.findOne(unitTypeId);

    const fromConversion = unitType.conversions.find(
      (c) => c.abbreviation === fromUnit,
    );
    const toConversion = unitType.conversions.find(
      (c) => c.abbreviation === toUnit,
    );

    if (!fromConversion || !toConversion) {
      throw new BadRequestException(
        `Una de las unidades especificadas no existe en el tipo "${unitType.name}"`,
      );
    }

    return toConversion.factor / fromConversion.factor;
  }

  /**
   * Validate if a unit exists in a UnitType
   */
  async validateUnit(
    unitTypeId: string,
    unitAbbr: string,
  ): Promise<{ valid: boolean; unit?: any }> {
    const unitType = await this.findOne(unitTypeId);

    const conversion = unitType.conversions.find(
      (c) => c.abbreviation === unitAbbr,
    );

    if (!conversion) {
      return { valid: false };
    }

    return {
      valid: true,
      unit: conversion,
    };
  }
}
