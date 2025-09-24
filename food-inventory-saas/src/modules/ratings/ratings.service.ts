import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PurchaseOrderRating, PurchaseOrderRatingDocument } from '../../schemas/purchase-order-rating.schema';
import { CreateRatingDto } from '../../dto/rating.dto';

@Injectable()
export class RatingsService {
  private readonly logger = new Logger(RatingsService.name);

  constructor(
    @InjectModel(PurchaseOrderRating.name) private ratingModel: Model<PurchaseOrderRatingDocument>,
  ) {}

  async create(createRatingDto: CreateRatingDto, user: any): Promise<PurchaseOrderRatingDocument> {
    this.logger.log(`Creating rating for purchase order: ${createRatingDto.purchaseOrderId}`);

    const ratingData = {
      ...createRatingDto,
      createdBy: user.id,
      tenantId: user.tenantId,
    };

    const rating = new this.ratingModel(ratingData);
    return rating.save();
  }
}
