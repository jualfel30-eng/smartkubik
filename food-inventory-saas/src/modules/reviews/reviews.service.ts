import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Review, ReviewDocument } from "../../schemas/review.schema";
import {
  CreateReviewDto,
  UpdateReviewDto,
  RespondToReviewDto,
  GetReviewsQueryDto,
  ReviewAnalyticsResponse,
  ReviewComparisonResponse,
} from "../../dto/review.dto";

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async create(
    tenantId: string,
    organizationId: string | undefined,
    createReviewDto: CreateReviewDto,
  ): Promise<Review> {
    const review = new this.reviewModel({
      ...createReviewDto,
      tenantId: new Types.ObjectId(tenantId),
      organizationId: organizationId
        ? new Types.ObjectId(organizationId)
        : undefined,
    });

    // Auto-analyze sentiment on creation
    await this.analyzeSentiment(review);

    return review.save();
  }

  async findAll(
    tenantId: string,
    organizationId: string | undefined,
    query: GetReviewsQueryDto,
  ): Promise<{ data: any[]; total: number; page: number; totalPages: number }> {
    const {
      source,
      status,
      sentiment,
      minRating,
      maxRating,
      isResponded,
      isFlagged,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 20,
    } = query;

    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (source) filter.source = source;
    if (status) filter.status = status;
    if (sentiment) filter.sentiment = sentiment;
    if (minRating) filter.rating = { ...filter.rating, $gte: minRating };
    if (maxRating) filter.rating = { ...filter.rating, $lte: maxRating };
    if (isResponded !== undefined) filter.isResponded = isResponded;
    if (isFlagged !== undefined) filter.isFlagged = isFlagged;

    if (startDate || endDate) {
      filter.reviewDate = {};
      if (startDate) filter.reviewDate.$gte = new Date(startDate);
      if (endDate) filter.reviewDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { customerName: { $regex: search, $options: "i" } },
        { comment: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.reviewModel
        .find(filter)
        .sort({ reviewDate: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name email phone")
        .populate("respondedBy", "firstName lastName email")
        .lean()
        .exec(),
      this.reviewModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<any> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const review = await this.reviewModel
      .findOne(filter)
      .populate("customerId", "name email phone")
      .populate("respondedBy", "firstName lastName email")
      .lean()
      .exec();

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  async update(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<Review> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const review = await this.reviewModel
      .findOneAndUpdate(filter, updateReviewDto, { new: true })
      .exec();

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  async remove(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
  ): Promise<void> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const result = await this.reviewModel.deleteOne(filter).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException("Review not found");
    }
  }

  async respondToReview(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
    userId: string,
    respondDto: RespondToReviewDto,
  ): Promise<Review> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const review = await this.reviewModel
      .findOneAndUpdate(
        filter,
        {
          response: respondDto.response,
          responseDate: new Date(),
          respondedBy: new Types.ObjectId(userId),
          isResponded: true,
        },
        { new: true },
      )
      .exec();

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  async flagReview(
    tenantId: string,
    organizationId: string | undefined,
    id: string,
    reason: string,
  ): Promise<Review> {
    const filter: any = {
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    const review = await this.reviewModel
      .findOneAndUpdate(
        filter,
        {
          isFlagged: true,
          flagReason: reason,
          status: "flagged",
        },
        { new: true },
      )
      .exec();

    if (!review) {
      throw new NotFoundException("Review not found");
    }

    return review;
  }

  async getAnalytics(
    tenantId: string,
    organizationId: string | undefined,
    startDate?: string,
    endDate?: string,
  ): Promise<ReviewAnalyticsResponse> {
    const filter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      filter.organizationId = new Types.ObjectId(organizationId);
    }

    if (startDate || endDate) {
      filter.reviewDate = {};
      if (startDate) filter.reviewDate.$gte = new Date(startDate);
      if (endDate) filter.reviewDate.$lte = new Date(endDate);
    }

    // Overview
    const [
      totalReviews,
      avgRatingResult,
      ratingDistribution,
      sentimentDistribution,
      responseStats,
    ] = await Promise.all([
      this.reviewModel.countDocuments(filter).exec(),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: "$rating", count: { $sum: 1 } } },
      ]),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
      this.reviewModel.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalResponded: {
              $sum: { $cond: [{ $eq: ["$isResponded", true] }, 1, 0] },
            },
            avgResponseTime: {
              $avg: {
                $cond: [
                  { $eq: ["$isResponded", true] },
                  {
                    $divide: [
                      { $subtract: ["$responseDate", "$reviewDate"] },
                      3600000,
                    ],
                  }, // hours
                  null,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const averageRating = avgRatingResult[0]?.avgRating || 0;
    const ratingDist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    ratingDistribution.forEach((r) => {
      ratingDist[r._id] = r.count;
    });

    const sentimentDist = { positive: 0, neutral: 0, negative: 0 };
    sentimentDistribution.forEach((s) => {
      if (s._id) sentimentDist[s._id] = s.count;
    });

    const responseRate =
      totalReviews > 0
        ? (responseStats[0]?.totalResponded || 0) / totalReviews
        : 0;
    const averageResponseTime = responseStats[0]?.avgResponseTime || 0;

    // By Source
    const bySource = await this.reviewModel.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
          averageRating: { $avg: "$rating" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Trends (last 12 weeks)
    const trends = await this.getTrends(tenantId, organizationId, 12);

    // Top Topics
    const topTopics = await this.reviewModel.aggregate([
      { $match: filter },
      { $unwind: "$topics" },
      {
        $group: {
          _id: { topic: "$topics", sentiment: "$sentiment" },
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          topic: "$_id.topic",
          sentiment: "$_id.sentiment",
          count: 1,
          _id: 0,
        },
      },
    ]);

    // Recent Reviews
    const recentReviews = await this.reviewModel
      .find(filter)
      .sort({ reviewDate: -1 })
      .limit(10)
      .lean()
      .exec();

    // Needs Attention (negative reviews without response)
    const needsAttention = await this.reviewModel
      .find({
        ...filter,
        rating: { $lte: 3 },
        isResponded: false,
      })
      .sort({ reviewDate: -1 })
      .limit(10)
      .lean()
      .exec();

    return {
      overview: {
        totalReviews,
        averageRating,
        ratingDistribution: ratingDist,
        sentimentDistribution: sentimentDist,
        responseRate,
        averageResponseTime,
      },
      bySource: bySource.map((s) => ({
        source: s._id,
        count: s.count,
        averageRating: s.averageRating,
      })),
      trends,
      topTopics,
      recentReviews,
      needsAttention,
    };
  }

  async getComparison(
    tenantId: string,
    organizationId: string | undefined,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string,
  ): Promise<ReviewComparisonResponse> {
    const baseFilter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      baseFilter.organizationId = new Types.ObjectId(organizationId);
    }

    const [currentStats, previousStats] = await Promise.all([
      this.getPeriodStats(baseFilter, currentStart, currentEnd),
      this.getPeriodStats(baseFilter, previousStart, previousEnd),
    ]);

    const reviewsChange =
      currentStats.totalReviews - previousStats.totalReviews;
    const reviewsChangePercent =
      previousStats.totalReviews > 0
        ? (reviewsChange / previousStats.totalReviews) * 100
        : 0;

    const ratingChange =
      currentStats.averageRating - previousStats.averageRating;
    const ratingChangePercent =
      previousStats.averageRating > 0
        ? (ratingChange / previousStats.averageRating) * 100
        : 0;

    return {
      currentPeriod: currentStats,
      previousPeriod: previousStats,
      changes: {
        reviewsChange,
        reviewsChangePercent,
        ratingChange,
        ratingChangePercent,
      },
    };
  }

  private async getPeriodStats(
    baseFilter: any,
    startDate: string,
    endDate: string,
  ) {
    const filter = {
      ...baseFilter,
      reviewDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    };

    const [totalReviews, avgResult, sentimentDist] = await Promise.all([
      this.reviewModel.countDocuments(filter).exec(),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: null, avgRating: { $avg: "$rating" } } },
      ]),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: "$sentiment", count: { $sum: 1 } } },
      ]),
    ]);

    const sentiment = { positive: 0, neutral: 0, negative: 0 };
    sentimentDist.forEach((s) => {
      if (s._id) sentiment[s._id] = s.count;
    });

    return {
      totalReviews,
      averageRating: avgResult[0]?.avgRating || 0,
      sentiment,
    };
  }

  private async getTrends(
    tenantId: string,
    organizationId: string | undefined,
    weeks: number,
  ) {
    const baseFilter: any = { tenantId: new Types.ObjectId(tenantId) };
    if (organizationId) {
      baseFilter.organizationId = new Types.ObjectId(organizationId);
    }

    const trends = await this.reviewModel.aggregate([
      {
        $match: {
          ...baseFilter,
          reviewDate: {
            $gte: new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            week: { $week: "$reviewDate" },
            year: { $year: "$reviewDate" },
          },
          count: { $sum: 1 },
          averageRating: { $avg: "$rating" },
          positive: {
            $sum: { $cond: [{ $eq: ["$sentiment", "positive"] }, 1, 0] },
          },
          neutral: {
            $sum: { $cond: [{ $eq: ["$sentiment", "neutral"] }, 1, 0] },
          },
          negative: {
            $sum: { $cond: [{ $eq: ["$sentiment", "negative"] }, 1, 0] },
          },
        },
      },
      { $sort: { "_id.year": 1, "_id.week": 1 } },
      {
        $project: {
          period: {
            $concat: [
              { $toString: "$_id.year" },
              "-W",
              { $toString: "$_id.week" },
            ],
          },
          count: 1,
          averageRating: 1,
          sentiment: {
            positive: "$positive",
            neutral: "$neutral",
            negative: "$negative",
          },
          _id: 0,
        },
      },
    ]);

    return trends;
  }

  private async analyzeSentiment(review: ReviewDocument): Promise<void> {
    // Basic sentiment analysis based on rating and keywords
    // In production, you'd use a proper NLP service or AI model

    const comment = review.comment?.toLowerCase() || "";
    const rating = review.rating;

    // Sentiment based on rating
    let sentiment: string;
    if (rating >= 4) {
      sentiment = "positive";
    } else if (rating <= 2) {
      sentiment = "negative";
    } else {
      sentiment = "neutral";
    }

    // Keyword extraction (simple implementation)
    const positiveKeywords = [
      "excelente",
      "delicioso",
      "increíble",
      "maravilloso",
      "perfecto",
      "genial",
      "fantástico",
      "excepcional",
      "great",
      "excellent",
      "amazing",
      "wonderful",
      "perfect",
    ];
    const negativeKeywords = [
      "malo",
      "terrible",
      "horrible",
      "pésimo",
      "decepcionante",
      "sucio",
      "frío",
      "lento",
      "bad",
      "terrible",
      "horrible",
      "disappointing",
      "dirty",
      "cold",
      "slow",
    ];

    const topics: string[] = [];
    if (comment.includes("comida") || comment.includes("food"))
      topics.push("food");
    if (comment.includes("servicio") || comment.includes("service"))
      topics.push("service");
    if (comment.includes("ambiente") || comment.includes("ambiance"))
      topics.push("ambiance");
    if (comment.includes("precio") || comment.includes("value"))
      topics.push("value");

    // Adjust sentiment based on keywords
    const hasPositive = positiveKeywords.some((kw) => comment.includes(kw));
    const hasNegative = negativeKeywords.some((kw) => comment.includes(kw));

    if (hasPositive && !hasNegative) sentiment = "positive";
    if (hasNegative && !hasPositive) sentiment = "negative";

    review.sentiment = sentiment;
    review.sentimentScore = rating / 5; // Simple confidence score
    review.topics = topics.length > 0 ? topics : undefined;
  }
}
