import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  OpportunityStageDefinition,
  OpportunityStageDefinitionDocument,
} from "../../schemas/opportunity-stage.schema";
import {
  CreateOpportunityStageDto,
  UpdateOpportunityStageDto,
} from "../../dto/opportunity-stage.dto";

@Injectable()
export class OpportunityStagesService {
  constructor(
    @InjectModel(OpportunityStageDefinition.name)
    private readonly stageModel: Model<OpportunityStageDefinitionDocument>,
  ) {}

  async findAll(tenantId: string) {
    return this.stageModel
      .find({ tenantId })
      .sort({ order: 1, probability: -1 })
      .lean();
  }

  async create(dto: CreateOpportunityStageDto, user: any) {
    const exists = await this.stageModel.exists({
      tenantId: user.tenantId,
      name: dto.name.trim(),
    });
    if (exists) {
      throw new HttpException(
        "La etapa ya existe",
        HttpStatus.BAD_REQUEST,
      );
    }
    const stage = new this.stageModel({
      ...dto,
      name: dto.name.trim(),
      tenantId: user.tenantId,
      createdBy: user.id,
    });
    return stage.save();
  }

  async update(id: string, dto: UpdateOpportunityStageDto, user: any) {
    const stage = await this.stageModel.findOne({
      _id: id,
      tenantId: user.tenantId,
    });
    if (!stage) {
      throw new HttpException("Etapa no encontrada", HttpStatus.NOT_FOUND);
    }
    Object.assign(stage, dto);
    return stage.save();
  }

  async remove(id: string, tenantId: string) {
    const result = await this.stageModel.deleteOne({ _id: id, tenantId });
    if (result.deletedCount === 0) {
      throw new HttpException("Etapa no encontrada", HttpStatus.NOT_FOUND);
    }
    return { success: true };
  }
}
