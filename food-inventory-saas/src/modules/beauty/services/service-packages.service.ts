import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyPackage,
  BeautyPackageDocument,
} from '../../../schemas/beauty-package.schema';
import { CreateServicePackageDto } from '../../../dto/beauty/create-service-package.dto';
import { UpdateServicePackageDto } from '../../../dto/beauty/update-service-package.dto';

@Injectable()
export class BeautyPackagesService {
  constructor(
    @InjectModel(BeautyPackage.name)
    private packageModel: Model<BeautyPackageDocument>,
  ) {}

  async create(
    dto: CreateServicePackageDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyPackageDocument> {
    const pkg = await this.packageModel.create({
      ...dto,
      services: dto.services.map((id) => new Types.ObjectId(id)),
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
    });
    return pkg.populate('services', 'name duration price');
  }

  async findAll(
    tenantId: string,
    filters?: { isActive?: boolean },
  ): Promise<BeautyPackageDocument[]> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    };
    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }
    return this.packageModel
      .find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('services', 'name duration price category')
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<BeautyPackageDocument> {
    const pkg = await this.packageModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: { $ne: true },
      })
      .populate('services', 'name duration price category')
      .exec();
    if (!pkg) throw new NotFoundException('Paquete no encontrado');
    return pkg;
  }

  async update(
    id: string,
    dto: UpdateServicePackageDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyPackageDocument> {
    const update: any = { ...dto, updatedBy: new Types.ObjectId(userId) };
    if (dto.services) {
      update.services = dto.services.map((sid) => new Types.ObjectId(sid));
    }
    const pkg = await this.packageModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId), isDeleted: { $ne: true } },
        { $set: update },
        { new: true },
      )
      .populate('services', 'name duration price category')
      .exec();
    if (!pkg) throw new NotFoundException('Paquete no encontrado');
    return pkg;
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const result = await this.packageModel.updateOne(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: { isDeleted: true, isActive: false } },
    );
    if (result.matchedCount === 0) throw new NotFoundException('Paquete no encontrado');
  }
}
