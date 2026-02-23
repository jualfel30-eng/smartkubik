import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  SocialLink,
  SocialLinkDocument,
} from "../../schemas/social-link.schema";

@Injectable()
export class SocialLinksService {
  private readonly logger = new Logger(SocialLinksService.name);

  constructor(
    @InjectModel(SocialLink.name)
    private readonly socialLinkModel: Model<SocialLinkDocument>,
  ) {}

  async getLinks(tenantId: string | null): Promise<SocialLinkDocument[]> {
    return this.socialLinkModel
      .find({ tenantId, active: true })
      .sort({ order: 1 })
      .exec();
  }

  async getManageLinks(tenantId: string | null): Promise<SocialLinkDocument[]> {
    return this.socialLinkModel
      .find({ tenantId })
      .sort({ order: 1 })
      .exec();
  }

  async createLink(
    tenantId: string | null,
    dto: Partial<SocialLink>,
  ): Promise<SocialLinkDocument> {
    const maxOrder = await this.socialLinkModel
      .findOne({ tenantId })
      .sort({ order: -1 })
      .select("order")
      .lean();

    const link = new this.socialLinkModel({
      ...dto,
      tenantId,
      order: (maxOrder?.order ?? -1) + 1,
    });

    this.logger.log(
      `Created social link "${dto.label}" for tenantId=${tenantId}`,
    );
    return link.save();
  }

  async updateLink(
    linkId: string,
    dto: Partial<SocialLink>,
  ): Promise<SocialLinkDocument> {
    const link = await this.socialLinkModel
      .findByIdAndUpdate(linkId, { $set: dto }, { new: true })
      .exec();

    if (!link) {
      throw new NotFoundException(`Social link ${linkId} not found`);
    }
    return link;
  }

  async deleteLink(linkId: string): Promise<void> {
    const result = await this.socialLinkModel.deleteOne({ _id: linkId }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Social link ${linkId} not found`);
    }
  }

  async reorderLinks(
    tenantId: string | null,
    orderedIds: string[],
  ): Promise<void> {
    const ops = orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, tenantId },
        update: { $set: { order: index } },
      },
    }));

    if (ops.length > 0) {
      await this.socialLinkModel.bulkWrite(ops);
    }
  }
}
