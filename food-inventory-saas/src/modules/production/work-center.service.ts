import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types, ClientSession } from "mongoose";
import {
  WorkCenter,
  WorkCenterDocument,
} from "../../schemas/work-center.schema";
import {
  CreateWorkCenterDto,
  UpdateWorkCenterDto,
  WorkCenterQueryDto,
} from "../../dto/work-center.dto";

@Injectable()
export class WorkCenterService {
  constructor(
    @InjectModel(WorkCenter.name)
    private readonly workCenterModel: Model<WorkCenterDocument>,
  ) {}

  async create(
    dto: CreateWorkCenterDto,
    user: any,
    session?: ClientSession,
  ): Promise<WorkCenter> {
    const tenantId = new Types.ObjectId(user.tenantId);

    // Verificar duplicados
    const existing = await this.workCenterModel
      .findOne({ code: dto.code, tenantId })
      .lean()
      .exec();

    if (existing) {
      throw new BadRequestException(
        `Work Center con código ${dto.code} ya existe`,
      );
    }

    const workCenter = new this.workCenterModel({
      ...dto,
      tenantId,
      createdBy: new Types.ObjectId(user._id),
    });

    return workCenter.save({ session });
  }

  async findAll(query: WorkCenterQueryDto, user: any) {
    const tenantId = new Types.ObjectId(user.tenantId);
    const { page = 1, limit = 20, type, isActive } = query;

    const filter: any = { tenantId };
    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive;

    const [data, total] = await Promise.all([
      this.workCenterModel
        .find(filter)
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.workCenterModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: any): Promise<WorkCenter> {
    const tenantId = new Types.ObjectId(user.tenantId);
    const workCenter = await this.workCenterModel
      .findOne({ _id: new Types.ObjectId(id), tenantId })
      .lean()
      .exec();

    if (!workCenter) {
      throw new NotFoundException("Work Center no encontrado");
    }

    return workCenter;
  }

  async update(
    id: string,
    dto: UpdateWorkCenterDto,
    user: any,
    session?: ClientSession,
  ): Promise<WorkCenter> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const updateData: any = {
      ...dto,
      updatedBy: new Types.ObjectId(user._id),
    };

    const updated = await this.workCenterModel
      .findOneAndUpdate(
        { _id: new Types.ObjectId(id), tenantId },
        { $set: updateData },
        { new: true, session },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException("Work Center no encontrado");
    }

    return updated;
  }

  async delete(id: string, user: any, session?: ClientSession): Promise<void> {
    const tenantId = new Types.ObjectId(user.tenantId);

    const result = await this.workCenterModel
      .deleteOne({ _id: new Types.ObjectId(id), tenantId }, { session })
      .exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException("Work Center no encontrado");
    }
  }

  async calculateCostPerMinute(id: string, user: any): Promise<number> {
    const workCenter = await this.findOne(id, user);
    return workCenter.costPerHour / 60;
  }
}
