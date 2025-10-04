import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Service, ServiceDocument } from '../../schemas/service.schema';
import { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    @InjectModel(Service.name) private serviceModel: Model<ServiceDocument>,
  ) {}

  async create(tenantId: string, createServiceDto: CreateServiceDto): Promise<Service> {
    this.logger.log(`Creating service for tenant: ${tenantId}`);

    const newService = new this.serviceModel({
      ...createServiceDto,
      tenantId,
    });

    const saved = await newService.save();
    this.logger.log(`Service created successfully: ${saved._id}`);
    return saved;
  }

  async findAll(tenantId: string, filters?: { status?: string; category?: string }): Promise<Service[]> {
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
    const service = await this.serviceModel.findOne({ _id: id, tenantId }).exec();

    if (!service) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    return service;
  }

  async update(tenantId: string, id: string, updateServiceDto: UpdateServiceDto): Promise<Service> {
    this.logger.log(`Updating service ${id} for tenant: ${tenantId}`);

    const updated = await this.serviceModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: updateServiceDto }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    this.logger.log(`Service updated successfully: ${id}`);
    return updated;
  }

  async remove(tenantId: string, id: string): Promise<void> {
    this.logger.log(`Deleting service ${id} for tenant: ${tenantId}`);

    const result = await this.serviceModel.deleteOne({ _id: id, tenantId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Servicio con ID ${id} no encontrado`);
    }

    this.logger.log(`Service deleted successfully: ${id}`);
  }

  async getCategories(tenantId: string): Promise<string[]> {
    const categories = await this.serviceModel.distinct('category', { tenantId }).exec();
    return categories.filter(Boolean).sort();
  }

  async getActiveServices(tenantId: string): Promise<Service[]> {
    return this.serviceModel.find({ tenantId, status: 'active' }).sort({ category: 1, name: 1 }).exec();
  }

  async search(tenantId: string, searchTerm: string): Promise<Service[]> {
    return this.serviceModel
      .find({
        tenantId,
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { category: { $regex: searchTerm, $options: 'i' } },
        ],
      })
      .sort({ name: 1 })
      .exec();
  }
}
