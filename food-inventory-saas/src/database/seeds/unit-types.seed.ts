import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  UnitType,
  UnitTypeDocument,
  UnitCategory,
} from "../../schemas/unit-type.schema";

@Injectable()
export class UnitTypesSeed {
  private readonly logger = new Logger(UnitTypesSeed.name);

  constructor(
    @InjectModel(UnitType.name)
    private readonly unitTypeModel: Model<UnitTypeDocument>,
  ) {}

  async seed() {
    const count = await this.unitTypeModel.countDocuments({
      isSystemDefined: true,
    });

    if (count > 0) {
      this.logger.log(
        `System UnitTypes already seeded (${count} found). Skipping.`,
      );
      return;
    }

    this.logger.log("Seeding system UnitTypes...");

    const systemUnitTypes = [
      // PESO (WEIGHT)
      {
        name: "Peso",
        category: UnitCategory.WEIGHT,
        description: "Unidades de medida de peso",
        baseUnit: {
          name: "kilogramo",
          abbreviation: "kg",
        },
        conversions: [
          {
            unit: "kilogramo",
            abbreviation: "kg",
            pluralName: "kilogramos",
            factor: 1.0,
            isBase: true,
          },
          {
            unit: "gramo",
            abbreviation: "g",
            pluralName: "gramos",
            factor: 0.001,
            isBase: false,
          },
          {
            unit: "miligramo",
            abbreviation: "mg",
            pluralName: "miligramos",
            factor: 0.000001,
            isBase: false,
          },
          {
            unit: "tonelada",
            abbreviation: "ton",
            pluralName: "toneladas",
            factor: 1000.0,
            isBase: false,
          },
          {
            unit: "libra",
            abbreviation: "lb",
            pluralName: "libras",
            factor: 0.453592,
            isBase: false,
          },
          {
            unit: "onza",
            abbreviation: "oz",
            pluralName: "onzas",
            factor: 0.0283495,
            isBase: false,
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
      },

      // VOLUMEN (VOLUME)
      {
        name: "Volumen",
        category: UnitCategory.VOLUME,
        description: "Unidades de medida de volumen",
        baseUnit: {
          name: "litro",
          abbreviation: "L",
        },
        conversions: [
          {
            unit: "litro",
            abbreviation: "L",
            pluralName: "litros",
            factor: 1.0,
            isBase: true,
          },
          {
            unit: "mililitro",
            abbreviation: "ml",
            pluralName: "mililitros",
            factor: 0.001,
            isBase: false,
          },
          {
            unit: "centilitro",
            abbreviation: "cl",
            pluralName: "centilitros",
            factor: 0.01,
            isBase: false,
          },
          {
            unit: "galón",
            abbreviation: "gal",
            pluralName: "galones",
            factor: 3.78541,
            isBase: false,
          },
          {
            unit: "onza líquida",
            abbreviation: "fl oz",
            pluralName: "onzas líquidas",
            factor: 0.0295735,
            isBase: false,
          },
          {
            unit: "taza",
            abbreviation: "cup",
            pluralName: "tazas",
            factor: 0.236588,
            isBase: false,
          },
          {
            unit: "cucharada",
            abbreviation: "tbsp",
            pluralName: "cucharadas",
            factor: 0.0147868,
            isBase: false,
          },
          {
            unit: "cucharadita",
            abbreviation: "tsp",
            pluralName: "cucharaditas",
            factor: 0.00492892,
            isBase: false,
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
      },

      // LONGITUD (LENGTH)
      {
        name: "Longitud",
        category: UnitCategory.LENGTH,
        description: "Unidades de medida de longitud",
        baseUnit: {
          name: "metro",
          abbreviation: "m",
        },
        conversions: [
          {
            unit: "metro",
            abbreviation: "m",
            pluralName: "metros",
            factor: 1.0,
            isBase: true,
          },
          {
            unit: "centímetro",
            abbreviation: "cm",
            pluralName: "centímetros",
            factor: 0.01,
            isBase: false,
          },
          {
            unit: "milímetro",
            abbreviation: "mm",
            pluralName: "milímetros",
            factor: 0.001,
            isBase: false,
          },
          {
            unit: "kilómetro",
            abbreviation: "km",
            pluralName: "kilómetros",
            factor: 1000.0,
            isBase: false,
          },
          {
            unit: "pulgada",
            abbreviation: "in",
            pluralName: "pulgadas",
            factor: 0.0254,
            isBase: false,
          },
          {
            unit: "pie",
            abbreviation: "ft",
            pluralName: "pies",
            factor: 0.3048,
            isBase: false,
          },
          {
            unit: "yarda",
            abbreviation: "yd",
            pluralName: "yardas",
            factor: 0.9144,
            isBase: false,
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
      },

      // UNIDADES (UNIT)
      {
        name: "Unidades",
        category: UnitCategory.UNIT,
        description: "Unidades de medida por cantidad",
        baseUnit: {
          name: "unidad",
          abbreviation: "und",
        },
        conversions: [
          {
            unit: "unidad",
            abbreviation: "und",
            pluralName: "unidades",
            factor: 1.0,
            isBase: true,
          },
          {
            unit: "docena",
            abbreviation: "dz",
            pluralName: "docenas",
            factor: 12.0,
            isBase: false,
          },
          {
            unit: "par",
            abbreviation: "pr",
            pluralName: "pares",
            factor: 2.0,
            isBase: false,
          },
          {
            unit: "gruesa",
            abbreviation: "grs",
            pluralName: "gruesas",
            factor: 144.0,
            isBase: false,
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
        metadata: {
          note: "Para unidades de empaque personalizadas (cajas, paquetes, etc.), los usuarios deben crear configuraciones específicas en ProductConsumableConfig o ProductSupplyConfig",
        },
      },

      // TIEMPO (TIME)
      {
        name: "Tiempo",
        category: UnitCategory.TIME,
        description: "Unidades de medida de tiempo",
        baseUnit: {
          name: "hora",
          abbreviation: "hr",
        },
        conversions: [
          {
            unit: "hora",
            abbreviation: "hr",
            pluralName: "horas",
            factor: 1.0,
            isBase: true,
          },
          {
            unit: "minuto",
            abbreviation: "min",
            pluralName: "minutos",
            factor: 0.0166667,
            isBase: false,
          },
          {
            unit: "segundo",
            abbreviation: "seg",
            pluralName: "segundos",
            factor: 0.000277778,
            isBase: false,
          },
          {
            unit: "día",
            abbreviation: "día",
            pluralName: "días",
            factor: 24.0,
            isBase: false,
          },
          {
            unit: "semana",
            abbreviation: "sem",
            pluralName: "semanas",
            factor: 168.0,
            isBase: false,
          },
          {
            unit: "mes",
            abbreviation: "mes",
            pluralName: "meses",
            factor: 730.0, // 30.4167 days * 24 hours
            isBase: false,
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
      },

      // ÁREA (AREA)
      {
        name: "Área",
        category: UnitCategory.AREA,
        description: "Unidades de medida de área",
        baseUnit: {
          name: "metro cuadrado",
          abbreviation: "m²",
        },
        conversions: [
          {
            unit: "metro cuadrado",
            abbreviation: "m²",
            pluralName: "metros cuadrados",
            factor: 1.0,
            isBase: true,
            symbol: "m²",
          },
          {
            unit: "centímetro cuadrado",
            abbreviation: "cm²",
            pluralName: "centímetros cuadrados",
            factor: 0.0001,
            isBase: false,
            symbol: "cm²",
          },
          {
            unit: "kilómetro cuadrado",
            abbreviation: "km²",
            pluralName: "kilómetros cuadrados",
            factor: 1000000.0,
            isBase: false,
            symbol: "km²",
          },
          {
            unit: "pie cuadrado",
            abbreviation: "ft²",
            pluralName: "pies cuadrados",
            factor: 0.092903,
            isBase: false,
            symbol: "ft²",
          },
          {
            unit: "pulgada cuadrada",
            abbreviation: "in²",
            pluralName: "pulgadas cuadradas",
            factor: 0.00064516,
            isBase: false,
            symbol: "in²",
          },
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
      },

      // TEMPERATURA (TEMPERATURE)
      {
        name: "Temperatura",
        category: UnitCategory.TEMPERATURE,
        description: "Unidades de medida de temperatura",
        baseUnit: {
          name: "Celsius",
          abbreviation: "°C",
        },
        conversions: [
          {
            unit: "Celsius",
            abbreviation: "°C",
            pluralName: "grados Celsius",
            factor: 1.0,
            isBase: true,
            symbol: "°C",
          },
          // Note: Fahrenheit and Kelvin conversions are not linear
          // They require special formulas: F = C * 9/5 + 32, K = C + 273.15
          // For now, we only include Celsius as the base
          // Custom conversion logic should be implemented in the service for non-linear conversions
        ],
        isSystemDefined: true,
        tenantId: null,
        isActive: true,
        metadata: {
          note: "Las conversiones de temperatura (Fahrenheit, Kelvin) requieren fórmulas no lineales y deben implementarse con lógica personalizada",
        },
      },
    ];

    try {
      for (const unitType of systemUnitTypes) {
        const existing = await this.unitTypeModel.findOne({
          name: unitType.name,
          isSystemDefined: true,
        });

        if (!existing) {
          await this.unitTypeModel.create(unitType);
          this.logger.log(`✓ Created system UnitType: ${unitType.name}`);
        } else {
          this.logger.log(`→ System UnitType already exists: ${unitType.name}`);
        }
      }

      this.logger.log("✓ System UnitTypes seeding completed successfully");
    } catch (error) {
      this.logger.error("Error seeding system UnitTypes:", error);
      throw error;
    }
  }
}
