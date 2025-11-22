import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  CampaignVariant,
  CampaignVariantDocument,
  VariantStatus,
} from "../../schemas/campaign-variant.schema";
import {
  MarketingCampaign,
  MarketingCampaignDocument,
} from "../../schemas/marketing-campaign.schema";
import {
  CreateABTestDto,
  UpdateVariantDto,
  DeclareWinnerDto,
} from "../../dto/ab-testing.dto";

/**
 * ABTestingService - Phase 5: A/B Testing
 *
 * Handles creation, management, and statistical analysis of campaign variants
 */
@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);

  constructor(
    @InjectModel(CampaignVariant.name)
    private variantModel: Model<CampaignVariantDocument>,
    @InjectModel(MarketingCampaign.name)
    private campaignModel: Model<MarketingCampaignDocument>,
  ) {}

  /**
   * Create an A/B test with multiple variants
   */
  async createABTest(
    dto: CreateABTestDto,
    tenantId: string,
  ): Promise<CampaignVariant[]> {
    const campaignObjectId = new Types.ObjectId(dto.campaignId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Verify campaign exists
    const campaign = await this.campaignModel.findOne({
      _id: campaignObjectId,
      tenantId: tenantObjectId,
    });

    if (!campaign) {
      throw new NotFoundException("Campaign not found");
    }

    // Validate traffic allocation sums to 100%
    const totalAllocation = dto.variants.reduce(
      (sum, v) => sum + v.trafficAllocation,
      0,
    );
    if (totalAllocation !== 100) {
      throw new BadRequestException(
        `Traffic allocation must sum to 100% (currently ${totalAllocation}%)`,
      );
    }

    // Delete existing variants for this campaign
    await this.variantModel.deleteMany({
      campaignId: campaignObjectId,
      tenantId: tenantObjectId,
    });

    // Create variants
    const variants = await Promise.all(
      dto.variants.map((variantDto) =>
        this.variantModel.create({
          tenantId: tenantObjectId,
          campaignId: campaignObjectId,
          name: variantDto.name,
          description: variantDto.description,
          subject: variantDto.subject,
          message: variantDto.message,
          media: variantDto.media,
          trafficAllocation: variantDto.trafficAllocation,
          status: VariantStatus.TESTING,
        }),
      ),
    );

    // Update campaign to mark it as A/B test
    await this.campaignModel.updateOne(
      { _id: campaignObjectId },
      {
        $set: {
          isABTest: true,
          abTestConfig: {
            minSampleSize: dto.minSampleSize || 1000,
            requiredConfidence: dto.requiredConfidence || 95,
            optimizationMetric: dto.optimizationMetric || "conversion_rate",
            autoPromoteWinner: dto.autoPromoteWinner !== false,
          },
        },
      },
    );

    this.logger.log(
      `Created A/B test for campaign ${dto.campaignId} with ${variants.length} variants`,
    );

    return variants.map((v) => v.toObject());
  }

  /**
   * Get all variants for a campaign
   */
  async getVariants(
    campaignId: string,
    tenantId: string,
  ): Promise<CampaignVariant[]> {
    const variants = await this.variantModel
      .find({
        campaignId: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .sort({ createdAt: 1 })
      .lean();

    return variants;
  }

  /**
   * Get a single variant
   */
  async getVariant(
    variantId: string,
    tenantId: string,
  ): Promise<CampaignVariant> {
    const variant = await this.variantModel
      .findOne({
        _id: new Types.ObjectId(variantId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    return variant;
  }

  /**
   * Update a variant
   */
  async updateVariant(
    variantId: string,
    dto: UpdateVariantDto,
    tenantId: string,
  ): Promise<CampaignVariant> {
    const variant = await this.variantModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(variantId),
          tenantId: new Types.ObjectId(tenantId),
        },
        { $set: dto },
        { new: true },
      )
      .lean();

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    this.logger.log(`Updated variant ${variantId}`);
    return variant;
  }

  /**
   * Delete a variant
   */
  async deleteVariant(variantId: string, tenantId: string): Promise<void> {
    const result = await this.variantModel.deleteOne({
      _id: new Types.ObjectId(variantId),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException("Variant not found");
    }

    this.logger.log(`Deleted variant ${variantId}`);
  }

  /**
   * Calculate performance metrics for all variants
   */
  async calculateVariantMetrics(
    campaignId: string,
    tenantId: string,
  ): Promise<any> {
    const variants = await this.getVariants(campaignId, tenantId);

    if (variants.length === 0) {
      return { variants: [], winner: null };
    }

    // Calculate rates for each variant
    const variantsWithMetrics: any[] = variants.map((variant) => {
      const openRate =
        variant.totalSent > 0
          ? (variant.totalOpened / variant.totalSent) * 100
          : 0;
      const clickRate =
        variant.totalOpened > 0
          ? (variant.totalClicked / variant.totalOpened) * 100
          : 0;
      const conversionRate =
        variant.totalSent > 0
          ? (variant.totalConverted / variant.totalSent) * 100
          : 0;

      return {
        ...variant,
        openRate,
        clickRate,
        conversionRate,
        revenuePerSend:
          variant.totalSent > 0 ? variant.revenue / variant.totalSent : 0,
      };
    });

    // Get campaign config
    const campaign: any = await this.campaignModel
      .findOne({
        _id: new Types.ObjectId(campaignId),
        tenantId: new Types.ObjectId(tenantId),
      })
      .lean();

    const optimizationMetric =
      campaign?.abTestConfig?.optimizationMetric || "conversion_rate";

    // Determine winner based on optimization metric
    let winner: any = null;
    let maxValue = -Infinity;

    for (const variant of variantsWithMetrics) {
      let value = 0;
      switch (optimizationMetric) {
        case "open_rate":
          value = variant.openRate;
          break;
        case "click_rate":
          value = variant.clickRate;
          break;
        case "conversion_rate":
          value = variant.conversionRate;
          break;
        case "revenue":
          value = variant.revenuePerSend;
          break;
      }

      if (value > maxValue) {
        maxValue = value;
        winner = variant;
      }
    }

    // Calculate statistical significance between winner and others
    if (winner && campaign?.abTestConfig) {
      const isSignificant = this.checkStatisticalSignificance(
        winner,
        variantsWithMetrics.filter(
          (v) => v._id?.toString?.() !== winner._id?.toString?.(),
        ),
        optimizationMetric,
        campaign.abTestConfig?.requiredConfidence || 95,
        campaign.abTestConfig?.minSampleSize || 1000,
      );

      winner.isStatisticallySignificant = isSignificant;
    }

    return {
      variants: variantsWithMetrics,
      winner: winner
        ? {
            ...winner,
            metric: optimizationMetric,
            metricValue: maxValue,
          }
        : null,
      optimizationMetric,
    };
  }

  /**
   * Check statistical significance using Z-test for proportions
   */
  private checkStatisticalSignificance(
    winner: any,
    losers: any[],
    metric: string,
    requiredConfidence: number,
    minSampleSize: number,
  ): boolean {
    // Check if winner has minimum sample size
    if (winner.totalSent < minSampleSize) {
      return false;
    }

    // For each loser, check if difference is statistically significant
    for (const loser of losers) {
      if (loser.totalSent < minSampleSize) {
        continue; // Skip if loser doesn't have enough data
      }

      // Get success rates based on metric
      let winnerRate = 0;
      let loserRate = 0;
      let winnerSuccesses = 0;
      let loserSuccesses = 0;

      switch (metric) {
        case "open_rate":
          winnerRate = winner.openRate / 100;
          loserRate = loser.openRate / 100;
          winnerSuccesses = winner.totalOpened;
          loserSuccesses = loser.totalOpened;
          break;
        case "click_rate":
          winnerRate = winner.clickRate / 100;
          loserRate = loser.clickRate / 100;
          winnerSuccesses = winner.totalClicked;
          loserSuccesses = loser.totalClicked;
          break;
        case "conversion_rate":
          winnerRate = winner.conversionRate / 100;
          loserRate = loser.conversionRate / 100;
          winnerSuccesses = winner.totalConverted;
          loserSuccesses = loser.totalConverted;
          break;
        default:
          // For revenue, we can't use Z-test easily, so just check if there's a 20% improvement
          return winner.revenuePerSend > loser.revenuePerSend * 1.2;
      }

      // Calculate pooled proportion
      const pooledProportion =
        (winnerSuccesses + loserSuccesses) /
        (winner.totalSent + loser.totalSent);

      // Calculate standard error
      const se = Math.sqrt(
        pooledProportion *
          (1 - pooledProportion) *
          (1 / winner.totalSent + 1 / loser.totalSent),
      );

      if (se === 0) {
        continue;
      }

      // Calculate Z-score
      const zScore = (winnerRate - loserRate) / se;

      // Z-score thresholds for confidence levels
      // 95% = 1.96, 90% = 1.645, 99% = 2.576
      const zThreshold =
        requiredConfidence >= 99
          ? 2.576
          : requiredConfidence >= 95
            ? 1.96
            : 1.645;

      // If any comparison is not significant, return false
      if (Math.abs(zScore) < zThreshold) {
        return false;
      }
    }

    return true; // All comparisons are significant
  }

  /**
   * Manually declare a winner
   */
  async declareWinner(
    dto: DeclareWinnerDto,
    tenantId: string,
  ): Promise<CampaignVariant> {
    const variantObjectId = new Types.ObjectId(dto.variantId);
    const tenantObjectId = new Types.ObjectId(tenantId);

    // Get the variant
    const variant = await this.variantModel.findOne({
      _id: variantObjectId,
      tenantId: tenantObjectId,
    });

    if (!variant) {
      throw new NotFoundException("Variant not found");
    }

    // Mark this variant as winner
    await this.variantModel.updateOne(
      { _id: variantObjectId },
      {
        $set: {
          status: VariantStatus.WINNER,
          declaredWinnerAt: new Date(),
          winnerReason: dto.reason || "Manually declared winner",
        },
      },
    );

    // Mark all other variants as losers
    await this.variantModel.updateMany(
      {
        campaignId: variant.campaignId,
        tenantId: tenantObjectId,
        _id: { $ne: variantObjectId },
      },
      {
        $set: {
          status: VariantStatus.LOSER,
        },
      },
    );

    this.logger.log(`Declared variant ${dto.variantId} as winner`);

    const updatedVariant = await this.variantModel
      .findOne({ _id: variantObjectId })
      .lean();

    return updatedVariant as any;
  }

  /**
   * Auto-select winner based on statistical significance
   */
  async autoSelectWinner(campaignId: string, tenantId: string): Promise<any> {
    const results = await this.calculateVariantMetrics(campaignId, tenantId);

    if (!results.winner) {
      return {
        success: false,
        message: "No clear winner yet",
      };
    }

    if (!results.winner.isStatisticallySignificant) {
      return {
        success: false,
        message: "Winner not statistically significant yet",
        winner: results.winner,
      };
    }

    // Declare winner
    await this.declareWinner(
      {
        variantId: results.winner._id.toString(),
        reason: `Auto-selected: Best ${results.optimizationMetric} (${results.winner.metricValue.toFixed(2)}%) with statistical significance`,
      },
      tenantId,
    );

    return {
      success: true,
      message: "Winner auto-selected",
      winner: results.winner,
    };
  }
}
