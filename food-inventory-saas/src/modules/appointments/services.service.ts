import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Service, ServiceDocument } from "../../schemas/service.schema";
import { CreateServiceDto, UpdateServiceDto } from "./dto/service.dto";

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async create(
    tenantId: string,
    createServiceDto: CreateServiceDto,
  ): Promise<Service> {
    this.logger.log(`Creating service for tenant: ${tenantId}`);

    const {
      requiresDeposit = false,
      depositType = "fixed",
      depositAmount = 0,
      minAdvanceBooking = 0,
      maxAdvanceBooking = 4320,
      serviceType = "general",
      addons,
      ...rest
    } = createServiceDto;

    if (maxAdvanceBooking < minAdvanceBooking) {
      throw new BadRequestException(
        "maxAdvanceBooking no puede ser menor que minAdvanceBooking",
      );
    }

    const newService = new this.serviceModel({
      ...rest,
      serviceType,
      addons: addons?.map((addon) => ({
        name: addon.name,
        description: addon.description,
        price: addon.price ?? 0,
        duration: addon.duration,
      })),
      requiresDeposit,
      depositType: requiresDeposit ? depositType : "fixed",
      depositAmount: requiresDeposit ? (depositAmount ?? 0) : 0,
      minAdvanceBooking,
      maxAdvanceBooking,
      tenantId,
    });

    const saved = await newService.save();
    this.logger.log(`Service created successfully: ${saved._id}`);
    return saved;
  }

  async findAll(
    tenantId: string,
    filters?: { status?: string; category?: string },
  ): Promise<Service[]> {
    const query: any = { tenantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    return this.serviceModel.find(query).sort({ category: 1, name: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<Service> {
    const service = await this.serviceModel
      .findOne({ _id: id, tenantId })
      .exec();

    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    return service;
  }

  async update(
    tenantId: string,
    id: string,
    updateServiceDto: UpdateServiceDto,
  ): Promise<Service> {
    this.logger.log(`Updating service ${id} for tenant: ${tenantId}`);

    const updatePayload: any = { ...updateServiceDto };

    if (
      updatePayload.minAdvanceBooking !== undefined ||
      updatePayload.maxAdvanceBooking !== undefined
    ) {
      const existing = await this.serviceModel
        .findOne({ _id: id, tenantId })
        .select("minAdvanceBooking maxAdvanceBooking")
        .lean();

      const minAdvance =
        updatePayload.minAdvanceBooking ?? existing?.minAdvanceBooking ?? 0;
      const maxAdvance =
        updatePayload.maxAdvanceBooking ?? existing?.maxAdvanceBooking ?? 4320;

      if (maxAdvance < minAdvance) {
        throw new BadRequestException(
          "maxAdvanceBooking no puede ser menor que minAdvanceBooking",
        );
      }

      updatePayload.minAdvanceBooking = minAdvance;
      updatePayload.maxAdvanceBooking = maxAdvance;
    }

    if (updatePayload.addons) {
      updatePayload.addons = updatePayload.addons.map((addon) => ({
        name: addon.name,
        description: addon.description,
        price: addon.price ?? 0,
        duration: addon.duration,
      }));
    }

    if (updatePayload.requiresDeposit === false) {
      updatePayload.depositType = "fixed";
      updatePayload.depositAmount = 0;
    }

    if (
      updatePayload.requiresDeposit === true &&
      updatePayload.depositType === undefined
    ) {
      updatePayload.depositType = "fixed";
    }

    const updated = await this.serviceModel
      .findOneAndUpdate(
        { _id: id, tenantId },
        { $set: updatePayload },
        { new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    this.logger.log(`Service updated successfully: ${id}`);
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting service ${id} for tenant: ${tenantId}`);

    const result = await this.serviceModel
      .deleteOne({ _id: id, tenantId })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    this.logger.log(`Service deleted successfully: ${id}`);
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const categories = await this.serviceModel
      .distinct("category", { tenantId })
      .exec();
    return categories.filter(Boolean).sort();
  }

  async getActiveServices(tenantId: string): Promise<Service[]> {
    return this.serviceModel
      .find({ tenantId, status: "active" })
      .sort({ category: 1, name: 1 })
      .exec();
  }

  async search(tenantId: string, searchTerm: string): Promise<Service[]> {
    return this.serviceModel
      .find({
        tenantId,
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { description: { $regex: searchTerm, $options: "i" } },
          { category: { $regex: searchTerm, $options: "i" } },
        ],
      })
      .sort({ name: 1 })
      .exec();
  }
}
