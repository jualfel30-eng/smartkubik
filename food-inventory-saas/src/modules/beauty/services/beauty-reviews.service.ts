import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BeautyReview,
  BeautyReviewDocument,
} from '../../../schemas/beauty-review.schema';
import { CreateReviewDto, ApproveReviewDto } from '../../../dto/beauty';

@Injectable()
export class BeautyReviewsService {
  constructor(
    @InjectModel(BeautyReview.name)
    private reviewModel: Model<BeautyReviewDocument>,
  ) {}

  async create(dto: CreateReviewDto): Promise<BeautyReviewDocument> {
    return this.reviewModel.create({
      tenantId: new Types.ObjectId(dto.tenantId),
      booking: dto.bookingId ? new Types.ObjectId(dto.bookingId) : undefined,
      client: {
        name: dto.clientName,
        phone: dto.clientPhone,
      },
      professional: dto.professionalId
        ? new Types.ObjectId(dto.professionalId)
        : undefined,
      rating: dto.rating,
      comment: dto.comment,
      isApproved: false, // Requiere moderación
    });
  }

  async findAll(
    tenantId: string,
    filters?: {
      isApproved?: boolean;
      professionalId?: string;
      minRating?: number;
    },
  ): Promise<BeautyReviewDocument[]> {
    const query: any = { tenantId: new Types.ObjectId(tenantId) };

    if (filters) {
      if (filters.isApproved !== undefined)
        query.isApproved = filters.isApproved;
      if (filters.professionalId)
        query.professional = new Types.ObjectId(filters.professionalId);
      if (filters.minRating) query.rating = { $gte: filters.minRating };
    }

    return this.reviewModel
      .find(query)
      .populate('professional', 'name role')
      .populate('booking', 'bookingNumber services')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(id: string, tenantId: string): Promise<BeautyReviewDocument> {
    const review = await this.reviewModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
      })
      .exec();

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async approve(
    id: string,
    dto: ApproveReviewDto,
    tenantId: string,
    userId: string,
  ): Promise<BeautyReviewDocument> {
    const review = await this.findOne(id, tenantId);

    review.isApproved = dto.isApproved;
    review.approvedBy = new Types.ObjectId(userId);
    review.approvedAt = new Date();

    if (!dto.isApproved && dto.rejectionReason) {
      review.rejectionReason = dto.rejectionReason;
    }

    return review.save();
  }

  async getAverageRating(
    tenantId: string,
    professionalId?: string,
  ): Promise<{ average: number; count: number }> {
    const query: any = {
      tenantId: new Types.ObjectId(tenantId),
      isApproved: true,
    };

    if (professionalId) {
      query.professional = new Types.ObjectId(professionalId);
    }

    const result = await this.reviewModel.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { average: 0, count: 0 };
    }

    return {
      average: Math.round(result[0].average * 10) / 10,
      count: result[0].count,
    };
  }
}
