import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model, Types } from "mongoose";
import {
  ChartOfAccounts,
  ChartOfAccountsDocument,
} from "../../schemas/chart-of-accounts.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { Tenant, TenantDocument } from "../../schemas/tenant.schema";
import {
  TipsDistributionRule,
  TipsDistributionRuleDocument,
} from "../../schemas/tips-distribution-rule.schema";
import { PAYROLL_SYSTEM_ACCOUNTS } from "../../config/payroll-system-accounts.config";

@Injectable()
export class SeedingService {
  private readonly logger = new Logger(SeedingService.name);

  constructor(
    @InjectModel(ChartOfAccounts.name)
    private chartOfAccountsModel: Model<ChartOfAccountsDocument>,
    @InjectModel(Service.name)
    private serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name)
    private resourceModel: Model<ResourceDocument>,
    @InjectModel(Tenant.name)
    private tenantModel: Model<TenantDocument>,
    @InjectModel(TipsDistributionRule.name)
    private tipsDistributionRuleModel: Model<TipsDistributionRuleDocument>,
  ) { }

  async seedChartOfAccounts(tenantId: string, session?: ClientSession) {
    this.logger.log(
      `Iniciando seeding del plan de cuentas para el tenant: ${tenantId}`,
    );

    const baseAccounts = [
      {
        code: "1101",
        name: "Efectivo y Equivalentes",
        type: "Activo",
        isSystemAccount: true,
      },
      {
        code: "1102",
        name: "Cuentas por Cobrar",
        type: "Activo",
        isSystemAccount: true,
      },
      {
        code: "1103",
        name: "Inventario",
        type: "Activo",
        isSystemAccount: true,
      },
      {
        code: "2101",
        name: "Cuentas por Pagar",
        type: "Pasivo",
        isSystemAccount: true,
      },
      {
        code: "2102",
        name: "Impuestos por Pagar",
        type: "Pasivo",
        isSystemAccount: true,
      },
      {
        code: "3101",
        name: "Capital Social",
        type: "Patrimonio",
        isSystemAccount: true,
      },
      {
        code: "3102",
        name: "Resultados Acumulados",
        type: "Patrimonio",
        isSystemAccount: true,
      },
      {
        code: "4101",
        name: "Ingresos por Ventas",
        type: "Ingreso",
        isSystemAccount: true,
      },
      {
        code: "4102",
        name: "Devoluciones en Ventas",
        type: "Ingreso",
        isSystemAccount: true,
      },
      {
        code: "5101",
        name: "Costo de Mercancía Vendida",
        type: "Gasto",
        isSystemAccount: true,
      },
      {
        code: "5201",
        name: "Gastos de Sueldos y Salarios",
        type: "Gasto",
        isSystemAccount: false,
      },
      {
        code: "5202",
        name: "Gasto de Alquiler",
        type: "Gasto",
        isSystemAccount: false,
      },
      {
        code: "5203",
        name: "Imprevistos",
        type: "Gasto",
        isSystemAccount: false,
      },
      {
        code: "5204",
        name: "Inversión",
        type: "Gasto",
        isSystemAccount: false,
      },
    ];
    const accountsToCreate = [...baseAccounts, ...PAYROLL_SYSTEM_ACCOUNTS];
    const uniqueAccountsMap = new Map<
      string,
      (typeof baseAccounts)[number] & { metadata?: Record<string, any> }
    >();

    for (const acc of accountsToCreate) {
      const existing = uniqueAccountsMap.get(acc.code);
      if (existing) {
        this.logger.warn(
          `Código de cuenta duplicado detectado durante el seeding (${acc.code}). Se conservará la primera definición y se fusionará la metadata.`,
        );
        uniqueAccountsMap.set(acc.code, {
          ...existing,
          metadata: { ...(existing.metadata || {}), ...(acc as any).metadata },
        });
      } else {
        uniqueAccountsMap.set(acc.code, acc);
      }
    }

    const uniqueAccounts = Array.from(uniqueAccountsMap.values());

    try {
      for (const acc of uniqueAccounts) {
        const account = new this.chartOfAccountsModel({
          ...acc,
          tenantId: tenantId,
          isEditable: !acc.isSystemAccount,
        });
        if (session) {
          await account.save({ session });
        } else {
          await account.save();
        }
      }
      this.logger.log(
        `Plan de cuentas creado exitosamente para el tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error durante el seeding del plan de cuentas para el tenant: ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async seedTipsDistributionRules(tenantId: string, session?: ClientSession) {
    this.logger.log(
      `Iniciando seeding de reglas de distribución de propinas para el tenant: ${tenantId}`,
    );

    try {
      // Verificar si ya existen reglas (evitar duplicados si se llama accidentalmente)
      const existingQuery = this.tipsDistributionRuleModel.exists({
        tenantId: new Types.ObjectId(tenantId),
      });

      if (session) {
        existingQuery.session(session);
      }

      const existing = await existingQuery;
      if (existing) {
        this.logger.log(
          `Las reglas de distribución de propinas ya existen para el tenant: ${tenantId}, omitiendo.`,
        );
        return;
      }

      const defaultRules = [
        {
          name: "Distribución Equitativa",
          type: "equal",
          isActive: true,
          rules: {
            includedRoles: ["waiter", "bartender", "busboy"],
            poolTips: true,
          },
        },
        {
          name: "Por Horas Trabajadas",
          type: "by-hours",
          isActive: false,
          rules: {
            hourlyWeight: 1.0,
            includedRoles: ["waiter", "bartender"],
            poolTips: true,
          },
        },
        {
          name: "Por Ventas Generadas",
          type: "by-sales",
          isActive: false,
          rules: {
            salesWeight: 1.0,
            includedRoles: ["waiter"],
            poolTips: false,
          },
        },
        {
          name: "Distribución Personalizada",
          type: "custom",
          isActive: false,
          rules: {
            customFormula: "// Escribe tu fórmula personalizada aquí",
            includedRoles: [],
            poolTips: false,
          },
        },
      ];

      for (const ruleData of defaultRules) {
        const rule = new this.tipsDistributionRuleModel({
          ...ruleData,
          tenantId: new Types.ObjectId(tenantId),
        });

        if (session) {
          await rule.save({ session });
        } else {
          await rule.save();
        }
      }

      this.logger.log(
        `4 reglas de distribución de propinas creadas exitosamente para el tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error durante el seeding de reglas de distribución de propinas para el tenant: ${tenantId}`,
        error.stack,
      );
      throw error;
    }
  }

  async seedCustomChartOfAccounts(tenantId: string, accountsToCreate: any[]) {
    this.logger.log(
      `Iniciando seeding de plan de cuentas personalizado para el tenant: ${tenantId}`,
    );

    try {
      for (const acc of accountsToCreate) {
        await this.chartOfAccountsModel.create({
          ...acc,
          tenantId: tenantId,
          isEditable: !acc.isSystemAccount,
        });
      }
      this.logger.log(
        `Plan de cuentas personalizado creado exitosamente para el tenant: ${tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error durante el seeding del plan de cuentas personalizado para el tenant: ${tenantId}`,
        error.stack,
      );
    }
  }

  async seedHospitalityDemoData(
    tenantId: string,
    session?: ClientSession,
  ): Promise<void> {
    this.logger.log(
      `Iniciando seeding de datos demo de hospitalidad para el tenant: ${tenantId}`,
    );

    const existingDemoQuery = this.serviceModel.exists({
      tenantId,
      "metadata.verticalPreset": "hospitality-demo",
    });

    if (session) {
      existingDemoQuery.session(session);
    }

    const existingDemo = await existingDemoQuery;
    if (existingDemo) {
      this.logger.log(
        `Datos demo de hospitalidad ya existen para el tenant: ${tenantId}, se omite recreación.`,
      );
      return;
    }

    const servicesBlueprint = [
      {
        key: "deluxe-room",
        name: "Habitación Deluxe King",
        category: "Habitaciones",
        duration: 1440,
        price: 220,
        color: "#2563EB",
        requiresResource: true,
        allowedResourceTypes: ["room"],
        bufferTimeBefore: 60,
        bufferTimeAfter: 120,
        maxSimultaneous: 1,
        metadata: {
          tags: ["room", "ocean-view"],
          defaultCheckin: "15:00",
          defaultCheckout: "12:00",
        },
      },
      {
        key: "family-suite",
        name: "Suite Familiar Vista al Mar",
        category: "Habitaciones",
        duration: 1440,
        price: 320,
        color: "#0EA5E9",
        requiresResource: true,
        allowedResourceTypes: ["room"],
        bufferTimeBefore: 90,
        bufferTimeAfter: 150,
        maxSimultaneous: 1,
        metadata: {
          tags: ["room", "family"],
          amenities: ["doble habitación", "cocina equipada", "terraza privada"],
        },
      },
      {
        key: "spa-massage",
        name: "Masaje Relajante 60 min",
        category: "Spa",
        duration: 60,
        price: 85,
        color: "#22C55E",
        requiresResource: true,
        allowedResourceTypes: ["person", "room"],
        bufferTimeBefore: 10,
        bufferTimeAfter: 20,
        maxSimultaneous: 1,
        metadata: {
          tags: ["spa", "wellness"],
          includes: ["aromaterapia", "bebida de bienvenida"],
        },
      },
      {
        key: "spa-facial",
        name: "Tratamiento Facial Premium",
        category: "Spa",
        duration: 75,
        price: 95,
        color: "#14B8A6",
        requiresResource: true,
        allowedResourceTypes: ["person", "room"],
        bufferTimeBefore: 10,
        bufferTimeAfter: 15,
        maxSimultaneous: 1,
        metadata: {
          tags: ["spa", "skin-care"],
          includes: ["diagnóstico digital", "serum personalizado"],
        },
      },
      {
        key: "city-gourmet-tour",
        name: "City Tour Gourmet Caracas",
        category: "Experiencias",
        duration: 180,
        price: 65,
        color: "#F97316",
        requiresResource: true,
        allowedResourceTypes: ["person", "equipment"],
        bufferTimeBefore: 15,
        bufferTimeAfter: 15,
        maxSimultaneous: 10,
        metadata: {
          tags: ["tour", "gastronomía"],
          meetingPoint: "Lobby principal",
        },
      },
      {
        key: "sunset-catamaran",
        name: "Sunset Catamarán VIP",
        category: "Experiencias",
        duration: 150,
        price: 180,
        color: "#FACC15",
        requiresResource: true,
        allowedResourceTypes: ["equipment", "person"],
        bufferTimeBefore: 30,
        bufferTimeAfter: 45,
        maxSimultaneous: 12,
        metadata: {
          tags: ["tour", "sunset"],
          includes: ["barra libre", "dj en vivo"],
        },
      },
    ];

    const services = await this.serviceModel.create(
      servicesBlueprint.map((service) => ({
        tenantId,
        name: service.name,
        description: "",
        category: service.category,
        duration: service.duration,
        price: service.price,
        cost: Math.round(service.price * 0.4),
        status: "active",
        color: service.color,
        requiresResource: service.requiresResource,
        allowedResourceTypes: service.allowedResourceTypes,
        bufferTimeBefore: service.bufferTimeBefore,
        bufferTimeAfter: service.bufferTimeAfter,
        maxSimultaneous: service.maxSimultaneous,
        metadata: {
          ...service.metadata,
          verticalPreset: "hospitality-demo",
          blueprintKey: service.key,
        },
      })),
      { session },
    );

    const serviceIdByKey: Record<string, string> = {};
    services.forEach((svc, index) => {
      const key = servicesBlueprint[index].key;
      serviceIdByKey[key] = svc._id.toString();
    });

    const alwaysOpenSchedule = {
      monday: { available: true, start: "00:00", end: "23:59" },
      tuesday: { available: true, start: "00:00", end: "23:59" },
      wednesday: { available: true, start: "00:00", end: "23:59" },
      thursday: { available: true, start: "00:00", end: "23:59" },
      friday: { available: true, start: "00:00", end: "23:59" },
      saturday: { available: true, start: "00:00", end: "23:59" },
      sunday: { available: true, start: "00:00", end: "23:59" },
    };

    const spaSchedule = {
      monday: { available: true, start: "09:00", end: "21:00" },
      tuesday: { available: true, start: "09:00", end: "21:00" },
      wednesday: { available: true, start: "09:00", end: "21:00" },
      thursday: { available: true, start: "09:00", end: "21:00" },
      friday: { available: true, start: "09:00", end: "22:00" },
      saturday: { available: true, start: "09:00", end: "22:00" },
      sunday: { available: true, start: "10:00", end: "18:00" },
    };

    const tourSchedule = {
      monday: { available: true, start: "08:00", end: "20:00" },
      tuesday: { available: true, start: "08:00", end: "20:00" },
      wednesday: { available: true, start: "08:00", end: "20:00" },
      thursday: { available: true, start: "08:00", end: "20:00" },
      friday: { available: true, start: "08:00", end: "22:00" },
      saturday: { available: true, start: "08:00", end: "22:00" },
      sunday: { available: true, start: "09:00", end: "19:00" },
    };

    const resourcesBlueprint = [
      {
        name: "Habitación Deluxe 101",
        type: "room",
        description: "King bed, vista al mar, amenidades premium",
        color: "#1D4ED8",
        capacity: 2,
        specializations: ["habitacion", "deluxe"],
        schedule: alwaysOpenSchedule,
        allowedServiceKeys: ["deluxe-room"],
      },
      {
        name: "Suite Familiar 201",
        type: "room",
        description: "Suite familiar con terraza privada y área lounge",
        color: "#0EA5E9",
        capacity: 4,
        specializations: ["habitacion", "suite"],
        schedule: alwaysOpenSchedule,
        allowedServiceKeys: ["family-suite"],
      },
      {
        name: "Sala Spa Yukiyu",
        type: "room",
        description: "Sala ambiental con cromo-terapia y música inmersiva",
        color: "#22C55E",
        capacity: 1,
        specializations: ["spa-room"],
        schedule: spaSchedule,
        allowedServiceKeys: ["spa-massage", "spa-facial"],
      },
      {
        name: "Terapeuta Andrea Rivas",
        type: "person",
        description: "Especialista en masajes de tejido profundo y faciales",
        color: "#2DD4BF",
        capacity: 1,
        specializations: ["masajes", "faciales"],
        schedule: spaSchedule,
        allowedServiceKeys: ["spa-massage", "spa-facial"],
      },
      {
        name: "Guía Luis González",
        type: "person",
        description: "Guía gastronómico con 10 años de experiencia",
        color: "#F97316",
        capacity: 10,
        specializations: ["tour-gastronomico", "experiencias"],
        schedule: tourSchedule,
        allowedServiceKeys: ["city-gourmet-tour"],
      },
      {
        name: "Catamarán Brisa Marina",
        type: "equipment",
        description: "Catamarán de lujo para experiencias sunset",
        color: "#FACC15",
        capacity: 12,
        specializations: ["catamaran", "sunset-tour"],
        schedule: tourSchedule,
        allowedServiceKeys: ["sunset-catamaran"],
      },
    ];

    await this.resourceModel.create(
      resourcesBlueprint.map((resource) => ({
        tenantId,
        name: resource.name,
        type: resource.type,
        description: resource.description,
        status: "active",
        color: resource.color,
        email: "",
        phone: "",
        capacity: resource.capacity,
        schedule: resource.schedule,
        specializations: resource.specializations,
        allowedServiceIds: resource.allowedServiceKeys
          .map((key) => serviceIdByKey[key])
          .filter(Boolean),
        metadata: {
          verticalPreset: "hospitality-demo",
        },
      })),
      { session },
    );

    const hospitalityPoliciesDefaults = {
      depositRequired: true,
      depositPercentage: 50,
      cancellationWindowHours: 24,
      noShowPenaltyType: "percentage" as const,
      noShowPenaltyValue: 100,
      manualNotes:
        "Validar depósitos contra estados de cuenta Mercantil y Banesco a las 10:00 y 16:00. Informar a operaciones cuando falten <12h para la reserva sin pago confirmado.",
    };

    await this.tenantModel.updateOne(
      { _id: new Types.ObjectId(tenantId) },
      {
        $set: {
          "settings.hospitalityPolicies": hospitalityPoliciesDefaults,
        },
      },
    );

    this.logger.log(
      `Datos demo de hospitalidad creados exitosamente para el tenant: ${tenantId}`,
    );
  }
}
