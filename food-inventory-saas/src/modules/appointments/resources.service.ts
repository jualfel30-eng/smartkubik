import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from '../../schemas/resource.schema';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
  ) {}

  async create(tenantId: string, createResourceDto: CreateResourceDto): Promise<Resource> {
    this.logger.log(`Creating resource for tenant: ${tenantId}`);

    const newResource = new this.resourceModel({
      ...createResourceDto,
      tenantId,
    });

    const saved = await newResource.save();
    this.logger.log(`Resource created successfully: ${saved._id}`);
    return saved;
  }

  async findAll(
    tenantId: string,
    filters?: { status?: string; type?: string },
  ): Promise<Resource[]> {
    const query: any = { tenantId };

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    return this.resourceModel.find(query).sort({ type: 1, name: 1 }).exec();
  }

  async findOne(tenantId: string, id: string): Promise<Resource> {
    const resource = await this.resourceModel.findOne({ _id: id, tenantId }).exec();

    if (!resource) {
      throw new NotFoundException(`Recurso con ID ${id} no encontrado`);
    }

    return resource;
  }

  async update(
    tenantId: string,
    id: string,
    updateResourceDto: UpdateResourceDto,
  ): Promise<Resource> {
    this.logger.log(`Updating resource ${id} for tenant: ${tenantId}`);

    const updated = await this.resourceModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: updateResourceDto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Recurso con ID ${id} no encontrado`);
    }

    this.logger.log(`Resource updated successfully: ${id}`);
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting resource ${id} for tenant: ${tenantId}`);

    const result = await this.resourceModel.deleteOne({ _id: id, tenantId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Recurso con ID ${id} no encontrado`);
    }

    this.logger.log(`Resource deleted successfully: ${id}`);
  }

  async getActiveResources(tenantId: string): Promise<Resource[]> {
    return this.resourceModel
      .find({ tenantId, status: 'active' })
      .sort({ type: 1, name: 1 })
      .exec();
  }

  async getResourcesByType(tenantId: string, type: string): Promise<Resource[]> {
    return this.resourceModel
      .find({ tenantId, type, status: 'active' })
      .sort({ name: 1 })
      .exec();
  }

  async getResourcesByService(tenantId: string, serviceId: string): Promise<Resource[]> {
    return this.resourceModel
      .find({
        tenantId,
        status: 'active',
        allowedServiceIds: serviceId,
      })
      .sort({ name: 1 })
      .exec();
  }

  async search(tenantId: string, searchTerm: string): Promise<Resource[]> {
    return this.resourceModel
      .find({
        tenantId,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { specializations: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .sort({ name: 1 })
      .exec();
  }

  /**
   * Check if resource is available on a specific date
   */
  async isAvailableOn(tenantId: string, resourceId: string, date: Date): Promise<boolean> {
    const resource = await this.findOne(tenantId, resourceId);

    // Check day of week
    const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
      date.getDay()
    ];
    const daySchedule = resource.schedule?.[dayOfWeek];

    if (!daySchedule || !daySchedule.available) {
      return false;
    }

    // Check unavailable dates
    if (resource.unavailableDates && resource.unavailableDates.length > 0) {
      const isUnavailable = resource.unavailableDates.some((unavailable) => {
        const start = new Date(unavailable.startDate);
        const end = new Date(unavailable.endDate);
        return date >= start && date <= end;
      });

      if (isUnavailable) {
        return false;
      }
    }

    return true;
  }
}
