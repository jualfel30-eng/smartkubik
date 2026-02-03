import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Investment,
  InvestmentDocument,
} from "../../schemas/investment.schema";
import {
  CreateInvestmentDto,
  UpdateInvestmentDto,
} from "../../dto/investment.dto";

@Injectable()
export class InvestmentsService {
  constructor(
    @InjectModel(Investment.name)
    private readonly investmentModel: Model<InvestmentDocument>,
  ) {}

  async create(
    dto: CreateInvestmentDto,
    tenantId: string,
  ): Promise<InvestmentDocument> {
    const investment = new this.investmentModel({
      ...dto,
      tenantId,
    });
    return investment.save();
  }

  async findAll(tenantId: string): Promise<InvestmentDocument[]> {
    return this.investmentModel
      .find({ tenantId })
      .sort({ investmentDate: -1 })
      .lean()
      .exec();
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<InvestmentDocument> {
    const investment = await this.investmentModel
      .findOne({ _id: id, tenantId })
      .lean()
      .exec();
    if (!investment) {
      throw new NotFoundException("Inversión no encontrada");
    }
    return investment as InvestmentDocument;
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateInvestmentDto,
  ): Promise<InvestmentDocument> {
    const investment = await this.investmentModel
      .findOneAndUpdate({ _id: id, tenantId }, { $set: dto }, { new: true })
      .lean()
      .exec();
    if (!investment) {
      throw new NotFoundException("Inversión no encontrada");
    }
    return investment as InvestmentDocument;
  }

  async remove(id: string, tenantId: string): Promise<{ deleted: boolean }> {
    const result = await this.investmentModel
      .deleteOne({ _id: id, tenantId })
      .exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Inversión no encontrada");
    }
    return { deleted: true };
  }

  async getSummary(tenantId: string) {
    const investments = await this.investmentModel
      .find({ tenantId })
      .lean()
      .exec();

    const totalInvested = investments.reduce(
      (s, i) => s + (i.investedAmount || 0),
      0,
    );
    const totalExpectedReturn = investments.reduce(
      (s, i) => s + (i.expectedReturn || 0),
      0,
    );
    const totalActualReturn = investments.reduce(
      (s, i) => s + (i.actualReturn || 0),
      0,
    );
    const activeCount = investments.filter((i) => i.status === "active").length;

    return {
      totalInvestments: investments.length,
      activeCount,
      totalInvested,
      totalExpectedReturn,
      totalActualReturn,
      roi:
        totalInvested > 0
          ? ((totalActualReturn - totalInvested) / totalInvested) * 100
          : 0,
    };
  }
}
