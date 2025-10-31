import {
  BadRequestException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { DateTime } from "luxon";
import {
  ServicePackage,
  ServicePackageDocument,
} from "../../schemas/service-package.schema";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { Resource, ResourceDocument } from "../../schemas/resource.schema";
import { CreateServicePackageDto } from "./dto/create-service-package.dto";
import { UpdateServicePackageDto } from "./dto/update-service-package.dto";
import { PackageAvailabilityDto } from "./dto/package-availability.dto";
import { PackagePricingDto } from "./dto/package-pricing.dto";
import { AppointmentsService } from "../appointments/appointments.service";
import { LoyaltyService } from "../loyalty/loyalty.service";

type ResourceAssignmentMap = Map<string, { resourceId?: string; additionalResourceIds: string[] }>;

@Injectable()
export class ServicePackagesService {
  constructor(
    @InjectModel(ServicePackage.name)
    private readonly servicePackageModel: Model<ServicePackageDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: Model<ServiceDocument>,
    @InjectModel(Resource.name)
    private readonly resourceModel: Model<ResourceDocument>,
    private readonly appointmentsService: AppointmentsService,
    @Inject(forwardRef(() => LoyaltyService))
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(
    tenantId: string,
    createDto: CreateServicePackageDto,
  ): Promise<ServicePackageDocument> {
    await this.assertServicesExist(tenantId, createDto.items.map((i) => i.serviceId));

    const doc = new this.servicePackageModel({
      tenantId,
      ...createDto,
      dynamicPricingRules:
        createDto.dynamicPricingRules?.map((rule) => ({
          adjustmentType: rule.adjustmentType,
          value: rule.value,
          daysOfWeek: rule.daysOfWeek || [],
          season: rule.seasonStart && rule.seasonEnd
            ? { start: rule.seasonStart, end: rule.seasonEnd }
            : undefined,
          occupancyThreshold: rule.occupancyThreshold,
          channels: rule.channels || [],
          loyaltyTiers: rule.loyaltyTiers || [],
        })) || [],
    });

    return doc.save();
  }

  async findAll(tenantId: string): Promise<ServicePackageDocument[]> {
    return this.servicePackageModel
      .find({ tenantId })
      .sort({ isActive: -1, name: 1 })
      .lean();
  }

  async findActive(tenantId: string): Promise<ServicePackageDocument[]> {
    return this.servicePackageModel
      .find({ tenantId, isActive: true })
      .sort({ name: 1 })
      .lean();
  }

  async findOne(tenantId: string, id: string): Promise<ServicePackageDocument> {
    const candidateIds = Types.ObjectId.isValid(id)
      ? [id, new Types.ObjectId(id)]
      : [id];

    const servicePackage = await this.servicePackageModel
      .findOne({
        _id: { $in: candidateIds },
        tenantId,
      })
      .lean();

    if (!servicePackage) {
      throw new NotFoundException("Paquete no encontrado");
    }

    return servicePackage as any;
  }

  async update(
    tenantId: string,
    id: string,
    updateDto: UpdateServicePackageDto,
  ): Promise<ServicePackageDocument> {
    if (updateDto.items) {
      await this.assertServicesExist(tenantId, updateDto.items.map((i) => i.serviceId));
    }

    const updated = await this.servicePackageModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        {
          $set: {
            ...updateDto,
            dynamicPricingRules: updateDto.dynamicPricingRules?.map((rule) => ({
              adjustmentType: rule.adjustmentType,
              value: rule.value,
              daysOfWeek: rule.daysOfWeek || [],
              season:
                rule.seasonStart && rule.seasonEnd
                  ? { start: rule.seasonStart, end: rule.seasonEnd }
                  : undefined,
              occupancyThreshold: rule.occupancyThreshold,
              channels: rule.channels || [],
              loyaltyTiers: rule.loyaltyTiers || [],
            })),
          },
        },
        { new: true },
      )
      .lean();

    if (!updated) {
      throw new NotFoundException("Paquete no encontrado");
    }

    return updated as any;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    const result = await this.servicePackageModel.deleteOne({ _id: id, tenantId });
    if (!result.deletedCount) {
      throw new NotFoundException("Paquete no encontrado");
    }
  }

  async getAvailability(
    tenantId: string,
    packageId: string,
    payload: PackageAvailabilityDto,
  ) {
    const servicePackage = await this.findOne(tenantId, packageId);
    const resourceAssignments = this.buildAssignmentMap(payload.resourceAssignments);

    const start = DateTime.fromISO(payload.startTime, { zone: "utc" });
    if (!start.isValid) {
      throw new BadRequestException("Fecha de inicio inválida para el paquete");
    }

    await this.ensureLeadTimeRespected(servicePackage, start);

    const services = await this.serviceModel
      .find({
        _id: { $in: servicePackage.items.map((item) => item.serviceId) },
        tenantId,
        status: "active",
      })
      .lean();

    if (services.length !== servicePackage.items.length) {
      throw new BadRequestException(
        "Uno o más servicios del paquete no están disponibles o fueron dados de baja",
      );
    }

    const serviceMap = new Map<string, ServiceDocument>();
    services.forEach((service: any) => {
      serviceMap.set(service._id.toString(), service as ServiceDocument);
    });

    const validationResults = await Promise.all(
      servicePackage.items.map((item) =>
        this.validateItemAvailability({
          tenantId,
          item,
          packageStart: start,
          resourceAssignments,
          service: serviceMap.get(item.serviceId.toString())!,
        }),
      ),
    );

    const unavailable = validationResults.filter((result) => !result.available);

    return {
      packageId,
      startTime: payload.startTime,
      available: unavailable.length === 0,
      unavailable,
    };
  }

  async calculatePricing(
    tenantId: string,
    packageId: string,
    payload: PackagePricingDto,
  ) {
    const servicePackage = await this.findOne(tenantId, packageId);

    const services = await this.serviceModel
      .find({
        _id: { $in: servicePackage.items.map((item) => item.serviceId) },
        tenantId,
      })
      .lean();

    const base =
      typeof servicePackage.basePrice === "number"
        ? servicePackage.basePrice
        : services.reduce((total, service: any) => total + Number(service.price || 0), 0);

    const discountMultiplier = 1 - (servicePackage.baseDiscountPercentage || 0) / 100;
    let runningTotal = Math.max(base * discountMultiplier, 0);

    const context = {
      startTime: payload.startTime ? DateTime.fromISO(payload.startTime) : undefined,
      channel: payload.channel,
      occupancyRate: payload.occupancyRate,
      loyaltyTier: undefined as string | undefined,
    };

    if (payload.customerId) {
      context.loyaltyTier = await this.loyaltyService.resolveLoyaltyTier(
        tenantId,
        payload.customerId,
      );
    }

    for (const rule of servicePackage.dynamicPricingRules || []) {
      if (!this.ruleMatches(rule, context)) {
        continue;
      }

      if (rule.adjustmentType === "fixed") {
        runningTotal += rule.value;
      } else if (rule.adjustmentType === "percentage") {
        runningTotal += runningTotal * (rule.value / 100);
      }
    }

    const loyaltyAdjustments = await this.loyaltyService.applyPackageBenefits({
      tenantId,
      packageId,
      customerId: payload.customerId,
      currentPrice: runningTotal,
    });

    runningTotal = loyaltyAdjustments.finalPrice;

    return {
      packageId,
      basePrice: base,
      discountedPrice: Math.round((base * discountMultiplier + Number.EPSILON) * 100) / 100,
      dynamicPrice: runningTotal,
      loyalty: loyaltyAdjustments,
    };
  }

  private buildAssignmentMap(
    assignments: PackageAvailabilityDto["resourceAssignments"],
  ): ResourceAssignmentMap {
    const map: ResourceAssignmentMap = new Map();
    (assignments || []).forEach((assignment) => {
      map.set(assignment.serviceId, {
        resourceId: assignment.resourceId,
        additionalResourceIds: assignment.additionalResourceIds || [],
      });
    });
    return map;
  }

  private async validateItemAvailability(params: {
    tenantId: string;
    item: ServicePackage["items"][number];
    packageStart: DateTime;
    resourceAssignments: ResourceAssignmentMap;
    service: ServiceDocument;
  }) {
    const { tenantId, item, packageStart, resourceAssignments, service } = params;

    const assignment = resourceAssignments.get(item.serviceId.toString()) || {
      resourceId: undefined,
      additionalResourceIds: item.defaultAdditionalResourceIds?.map((id) => id.toString()) || [],
    };

    const start = packageStart.plus({ minutes: item.offsetMinutes || 0 });
    const duration = this.computeServiceDuration(service, item.quantity || 1);
    const end = start.plus({ minutes: duration });

    const resourceIds: string[] = [];
    if (assignment.resourceId) {
      resourceIds.push(assignment.resourceId);
    }
    if (assignment.additionalResourceIds?.length) {
      resourceIds.push(...assignment.additionalResourceIds);
    }

    if (resourceIds.length) {
      const resources = await this.resourceModel
        .find({ _id: { $in: resourceIds }, tenantId })
        .lean();
      if (resources.length !== resourceIds.length) {
        throw new BadRequestException(
          "Algunos recursos asignados al paquete no existen o pertenecen a otro tenant",
        );
      }
    }

    const conflict = await this.appointmentsService.checkConflict(
      tenantId,
      start.toJSDate(),
      end.toJSDate(),
      resourceIds,
      undefined,
      service.serviceType === "room" ? service.metadata?.defaultLocationId : undefined,
    );

    return {
      serviceId: item.serviceId.toString(),
      startTime: start.toISO(),
      endTime: end.toISO(),
      available: !conflict,
    };
  }

  private computeServiceDuration(service: ServiceDocument, quantity: number): number {
    const baseDuration = Number(service.duration || 0);
    const bufferBefore = Number(service.bufferTimeBefore || 0);
    const bufferAfter = Number(service.bufferTimeAfter || 0);
    return (baseDuration + bufferBefore + bufferAfter) * Math.max(quantity, 1);
  }

  private async assertServicesExist(tenantId: string, serviceIds: string[]): Promise<void> {
    if (!serviceIds?.length) {
      throw new BadRequestException("Un paquete debe incluir al menos un servicio");
    }

    const uniqueIds = Array.from(new Set(serviceIds.filter(Boolean)));
    const count = await this.serviceModel
      .countDocuments({
        tenantId,
        _id: { $in: uniqueIds },
        status: "active",
      })
      .exec();

    if (count !== uniqueIds.length) {
      throw new BadRequestException(
        "Todos los servicios incluidos deben existir y estar activos",
      );
    }
  }

  private ruleMatches(
    rule: ServicePackage["dynamicPricingRules"][number],
    context: {
      startTime?: DateTime;
      channel?: string;
      occupancyRate?: number;
      loyaltyTier?: string;
    },
  ): boolean {
    if (rule.daysOfWeek?.length && context.startTime) {
      const day = context.startTime.weekday % 7; // luxon Monday=1 ... Sunday=7
      if (!rule.daysOfWeek.includes(day)) {
        return false;
      }
    }

    if (rule.channels?.length && context.channel) {
      if (!rule.channels.includes(context.channel)) {
        return false;
      }
    }

    if (
      typeof rule.occupancyThreshold === "number" &&
      typeof context.occupancyRate === "number"
    ) {
      if (context.occupancyRate < rule.occupancyThreshold) {
        return false;
      }
    }

    if (rule.loyaltyTiers?.length && context.loyaltyTier) {
      if (!rule.loyaltyTiers.includes(context.loyaltyTier)) {
        return false;
      }
    }

    if (rule.season?.start && rule.season?.end && context.startTime) {
      const start = DateTime.fromISO(rule.season.start, { zone: "utc" });
      const end = DateTime.fromISO(rule.season.end, { zone: "utc" });
      if (start.isValid && end.isValid) {
        if (context.startTime < start || context.startTime > end) {
          return false;
        }
      }
    }

    return true;
  }

  private async ensureLeadTimeRespected(
    servicePackage: ServicePackage,
    start: DateTime,
  ): Promise<void> {
    if (!servicePackage.leadTimeMinutes) {
      return;
    }
    const now = DateTime.utc();
    const diffMinutes = start.diff(now, "minutes").minutes;
    if (diffMinutes < servicePackage.leadTimeMinutes) {
      throw new BadRequestException(
        `Los paquetes requieren una antelación mínima de ${servicePackage.leadTimeMinutes} minutos`,
      );
    }
  }
}
