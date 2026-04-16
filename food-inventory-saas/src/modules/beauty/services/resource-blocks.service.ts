import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ResourceBlock,
  ResourceBlockDocument,
} from '../../../schemas/resource-block.schema';
import { CreateResourceBlockDto } from '../../../dto/beauty/create-resource-block.dto';

@Injectable()
export class ResourceBlocksService {
  constructor(
    @InjectModel(ResourceBlock.name)
    private resourceBlockModel: Model<ResourceBlockDocument>,
  ) {}

  async create(
    dto: CreateResourceBlockDto,
    tenantId: string,
    userId?: string,
  ): Promise<ResourceBlockDocument> {
    const block = new this.resourceBlockModel({
      tenantId: new Types.ObjectId(tenantId),
      professionalId: new Types.ObjectId(dto.professionalId),
      date: new Date(dto.date),
      startTime: dto.startTime,
      endTime: dto.endTime,
      reason: dto.reason,
      notes: dto.notes,
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      isRecurring: dto.isRecurring || false,
      recurringDays: dto.recurringDays || [],
    });
    return block.save();
  }

  async findAll(
    tenantId: string,
    params: {
      professionalId?: string;
      startDate?: string;
      endDate?: string;
    } = {},
  ): Promise<ResourceBlockDocument[]> {
    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    };

    if (params.professionalId) {
      query.professionalId = new Types.ObjectId(params.professionalId);
    }

    if (params.startDate || params.endDate) {
      query.date = {};
      if (params.startDate) {
        query.date.$gte = new Date(params.startDate);
      }
      if (params.endDate) {
        const end = new Date(params.endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    return this.resourceBlockModel
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();
  }

  async softDelete(id: string, tenantId: string): Promise<void> {
    const block = await this.resourceBlockModel.findOne({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: { $ne: true },
    });

    if (!block) {
      throw new NotFoundException('Resource block not found');
    }

    block.isDeleted = true;
    await block.save();
  }

  /**
   * Returns blocks for a specific professional on a specific date,
   * plus any matching recurring blocks.
   * Used by the availability service.
   */
  async getBlocksForDate(
    tenantId: Types.ObjectId,
    professionalId: Types.ObjectId,
    date: Date,
  ): Promise<ResourceBlockDocument[]> {
    // getDay(): 0=Sunday,1=Monday,...  convert to 0=Monday...6=Sunday
    const rawDay = date.getDay(); // 0=Sun
    const dayOfWeek = rawDay === 0 ? 6 : rawDay - 1; // 0=Mon...6=Sun

    const blocks = await this.resourceBlockModel
      .find({
        tenantId,
        professionalId,
        isDeleted: { $ne: true },
        $or: [
          { date: date }, // one-off block on this exact date
          {
            isRecurring: true,
            recurringDays: dayOfWeek,
          },
        ],
      })
      .lean();

    return blocks;
  }
}
