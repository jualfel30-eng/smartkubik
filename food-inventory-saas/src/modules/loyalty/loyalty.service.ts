import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Customer, CustomerDocument } from "../../schemas/customer.schema";
import {
  ServicePackage,
  ServicePackageDocument,
} from "../../schemas/service-package.schema";

interface ApplyPackageBenefitsInput {
  tenantId: string;
  packageId: string;
  customerId?: string;
  currentPrice: number;
}

@Injectable()
export class LoyaltyService {
  private readonly logger = new Logger(LoyaltyService.name);

  constructor(
    @InjectModel(Customer.name)
    private readonly customerModel: Model<CustomerDocument>,
    @InjectModel(ServicePackage.name)
    private readonly packageModel: Model<ServicePackageDocument>,
  ) {}

  async resolveLoyaltyTier(tenantId: string, customerId?: string): Promise<string | undefined> {
    if (!customerId) {
      return undefined;
    }

    const customer = await this.customerModel
      .findOne({
        _id: new Types.ObjectId(customerId),
        tenantId,
      })
      .lean();

    if (!customer) {
      return undefined;
    }

    return customer.loyalty?.tier || customer.tier;
  }

  async applyPackageBenefits(
    input: ApplyPackageBenefitsInput,
  ): Promise<{
    finalPrice: number;
    appliedBenefits: Array<Record<string, any>>;
    tier?: string;
    rewardCreditsEarned: number;
  }> {
    const { tenantId, packageId, customerId, currentPrice } = input;
    const appliedBenefits: Array<Record<string, any>> = [];

    let finalPrice = currentPrice;
    let tier: string | undefined;

    const servicePackage = await this.packageModel
      .findOne({ _id: packageId, tenantId })
      .lean();

    if (customerId) {
      const customer = await this.customerModel
        .findOne({ _id: new Types.ObjectId(customerId), tenantId })
        .lean();

      if (customer) {
        tier = customer.loyalty?.tier || customer.tier || "bronce";
        const discountPercentage = this.resolveDiscountPercentage(
          tier,
          servicePackage?.metadata,
        );

        if (discountPercentage > 0) {
          const amount = finalPrice * (discountPercentage / 100);
          finalPrice -= amount;
          appliedBenefits.push({
            type: "tier-discount",
            tier,
            percentage: discountPercentage,
            amount: Math.round((amount + Number.EPSILON) * 100) / 100,
          });
        }

        const complimentaryAddons = servicePackage?.metadata?.loyalty?.complimentaryAddons?.filter(
          (addon: any) => !addon.tiers?.length || addon.tiers.includes(tier!),
        );

        if (complimentaryAddons?.length) {
          appliedBenefits.push({
            type: "complimentary-addons",
            addons: complimentaryAddons.map((addon: any) => addon.name || addon.id),
          });
        }

        await this.customerModel.updateOne(
          { _id: customer._id },
          {
            $set: {
              loyalty: {
                ...(customer.loyalty || {}),
                tier,
                lastUpgradeAt: customer.loyalty?.tier !== tier ? new Date() : customer.loyalty?.lastUpgradeAt,
              },
            },
            $inc: {
              loyaltyScore: Math.max(currentPrice / 50, 1),
            },
          },
        );
      }
    }

    const rewardCreditsEarned = Math.round((currentPrice / 25) * 100) / 100;
    if (rewardCreditsEarned > 0 && customerId) {
      appliedBenefits.push({
        type: "reward-credit",
        amount: rewardCreditsEarned,
      });
    }

    finalPrice = Math.max(Math.round((finalPrice + Number.EPSILON) * 100) / 100, 0);

    return {
      finalPrice,
      appliedBenefits,
      tier,
      rewardCreditsEarned,
    };
  }

  async syncTierFromScore(options: {
    tenantId: string;
    customerId: string;
    loyaltyScore: number;
  }): Promise<void> {
    const { tenantId, customerId, loyaltyScore } = options;

    const tier = this.scoreToTier(loyaltyScore);

    await this.customerModel.updateOne(
      { _id: new Types.ObjectId(customerId), tenantId },
      {
        $set: {
          loyaltyScore,
          "loyalty.tier": tier,
        },
      },
      { upsert: false },
    );
  }

  private scoreToTier(score: number): string {
    if (score >= 85) {
      return "diamante";
    }
    if (score >= 70) {
      return "oro";
    }
    if (score >= 55) {
      return "plata";
    }
    if (score >= 35) {
      return "bronce";
    }
    return "explorador";
  }

  private resolveDiscountPercentage(
    tier: string,
    metadata?: Record<string, any>,
  ): number {
    const overrides = metadata?.loyalty?.tierDiscounts || {};
    const normalizedTier = tier?.toLowerCase();
    if (overrides[normalizedTier] !== undefined) {
      return Number(overrides[normalizedTier]) || 0;
    }

    switch (normalizedTier) {
      case "diamante":
        return 18;
      case "oro":
        return 12;
      case "plata":
        return 7;
      case "bronce":
        return 3;
      default:
        return 0;
    }
  }
}
