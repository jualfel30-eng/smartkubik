import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { ProductCampaignService } from "../services/product-campaign.service";
import {
  CreateProductCampaignDto,
  UpdateProductCampaignDto,
  CampaignFiltersDto,
  TrackPerformanceDto,
} from "../dto/product-campaign.dto";

@Controller("product-campaigns")
@UseGuards(JwtAuthGuard)
export class ProductCampaignController {
  constructor(
    private readonly productCampaignService: ProductCampaignService,
  ) {}

  /**
   * POST /product-campaigns
   * Create a new product campaign with auto-segmentation
   */
  @Post()
  async createCampaign(
    @Body() createDto: CreateProductCampaignDto,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.createCampaign(
      createDto as any,
      req.user.tenantId,
      req.user.userId,
    );

    return {
      success: true,
      data: campaign,
      message: `Campaign created with ${campaign.estimatedReach} target customers`,
    };
  }

  /**
   * GET /product-campaigns
   * Get all campaigns with optional filters
   */
  @Get()
  async getAllCampaigns(
    @Query() filters: CampaignFiltersDto,
    @Request() req,
  ) {
    const campaigns = await this.productCampaignService.getAllCampaigns(
      req.user.tenantId,
      filters,
    );

    return {
      success: true,
      data: campaigns,
      count: campaigns.length,
    };
  }

  /**
   * GET /product-campaigns/:id
   * Get campaign by ID
   */
  @Get(":id")
  async getCampaignById(@Param("id") id: string, @Request() req) {
    const campaign = await this.productCampaignService.getCampaignById(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
    };
  }

  /**
   * PUT /product-campaigns/:id
   * Update campaign
   */
  @Put(":id")
  async updateCampaign(
    @Param("id") id: string,
    @Body() updateDto: UpdateProductCampaignDto,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.updateCampaign(
      id,
      req.user.tenantId,
      updateDto as any,
    );

    return {
      success: true,
      data: campaign,
      message: "Campaign updated successfully",
    };
  }

  /**
   * DELETE /product-campaigns/:id
   * Delete campaign
   */
  @Delete(":id")
  async deleteCampaign(@Param("id") id: string, @Request() req) {
    await this.productCampaignService.deleteCampaign(id, req.user.tenantId);

    return {
      success: true,
      message: "Campaign deleted successfully",
    };
  }

  /**
   * POST /product-campaigns/:id/refresh-segment
   * Refresh target segment (recalculate from affinity matrix)
   */
  @Post(":id/refresh-segment")
  async refreshSegment(@Param("id") id: string, @Request() req) {
    await this.productCampaignService.updateTargetSegment(
      id,
      req.user.tenantId,
    );

    const campaign = await this.productCampaignService.getCampaignById(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
      message: `Segment refreshed: ${campaign.estimatedReach} target customers`,
    };
  }

  /**
   * POST /product-campaigns/:id/launch
   * Launch campaign (start sending)
   */
  @Post(":id/launch")
  async launchCampaign(@Param("id") id: string, @Request() req) {
    const campaign = await this.productCampaignService.launchCampaign(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
      message: `Campaign launched to ${campaign.estimatedReach} customers`,
    };
  }

  /**
   * POST /product-campaigns/:id/track
   * Track campaign performance metrics
   */
  @Post(":id/track")
  async trackPerformance(
    @Param("id") id: string,
    @Body() metrics: TrackPerformanceDto,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.trackPerformance(
      id,
      req.user.tenantId,
      metrics,
    );

    return {
      success: true,
      data: campaign,
      message: "Performance metrics updated",
    };
  }

  /**
   * GET /product-campaigns/:id/performance
   * Get campaign performance summary
   */
  @Get(":id/performance")
  async getPerformance(@Param("id") id: string, @Request() req) {
    const performance = await this.productCampaignService.getPerformanceSummary(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: performance,
    };
  }

  /**
   * GET /product-campaigns/:id/preview-segment
   * Preview target customers before creating campaign
   */
  @Get(":id/preview-segment")
  async previewSegment(@Param("id") id: string, @Request() req) {
    const campaign = await this.productCampaignService.getCampaignById(
      id,
      req.user.tenantId,
    );

    const targetCustomers =
      await this.productCampaignService.getTargetCustomersForCampaign(
        campaign as any,
        req.user.tenantId,
      );

    return {
      success: true,
      data: {
        totalCustomers: targetCustomers.length,
        customers: targetCustomers.slice(0, 10), // Preview first 10
        productTargeting: campaign.productTargeting,
        targetingLogic: campaign.targetingLogic,
      },
    };
  }

  // ========================================================================
  // PHASE 3: ADVANCED AUDIENCE INSIGHTS & TESTING
  // ========================================================================

  /**
   * GET /product-campaigns/:id/insights
   * Get detailed audience insights for campaign (PHASE 3)
   * Includes segment distribution, engagement levels, estimated conversion, etc.
   */
  @Get(":id/insights")
  async getAudienceInsights(@Param("id") id: string, @Request() req) {
    const insights = await this.productCampaignService.calculateAudienceInsights(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Audience insights calculated from CustomerProductAffinity cache",
      data: insights,
    };
  }

  /**
   * POST /product-campaigns/test-audience
   * Test audience criteria without creating a campaign (PHASE 3)
   * Allows users to preview the audience before committing to a campaign
   */
  @Post("test-audience")
  async testAudienceCriteria(@Body() body: any, @Request() req) {
    const { productTargeting, targetingLogic } = body;

    if (!productTargeting || productTargeting.length === 0) {
      return {
        success: false,
        message: "Product targeting criteria required",
      };
    }

    const result = await this.productCampaignService.testAudienceCriteria(
      productTargeting,
      targetingLogic || "ANY",
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Audience criteria tested successfully",
      data: result,
    };
  }

  // ========================================================================
  // PHASE 4: A/B TESTING & CAMPAIGN OPTIMIZATION ENDPOINTS
  // ========================================================================

  /**
   * POST /product-campaigns/ab-test
   * Create an A/B test campaign with multiple variants
   */
  @Post("ab-test")
  async createAbTestCampaign(@Body() createDto: any, @Request() req) {
    const campaign = await this.productCampaignService.createAbTestCampaign(
      createDto,
      req.user.tenantId,
      req.user.userId,
    );

    return {
      success: true,
      data: campaign,
      message: `A/B test campaign created with ${campaign.variants.length} variants and ${campaign.estimatedReach} target customers`,
    };
  }

  /**
   * POST /product-campaigns/:id/variants
   * Add a new variant to an existing A/B test campaign
   */
  @Post(":id/variants")
  async addVariant(
    @Param("id") id: string,
    @Body() variantDto: any,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.addVariant(
      id,
      req.user.tenantId,
      variantDto,
    );

    return {
      success: true,
      data: campaign,
      message: `Variant "${variantDto.variantName}" added successfully`,
    };
  }

  /**
   * PUT /product-campaigns/:id/variants/:variantName
   * Update an existing variant
   */
  @Put(":id/variants/:variantName")
  async updateVariant(
    @Param("id") id: string,
    @Param("variantName") variantName: string,
    @Body() updateDto: any,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.updateVariant(
      id,
      variantName,
      req.user.tenantId,
      updateDto,
    );

    return {
      success: true,
      data: campaign,
      message: `Variant "${variantName}" updated successfully`,
    };
  }

  /**
   * DELETE /product-campaigns/:id/variants/:variantName
   * Remove a variant from an A/B test campaign
   */
  @Delete(":id/variants/:variantName")
  async removeVariant(
    @Param("id") id: string,
    @Param("variantName") variantName: string,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.removeVariant(
      id,
      variantName,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
      message: `Variant "${variantName}" removed successfully`,
    };
  }

  /**
   * POST /product-campaigns/:id/launch-ab-test
   * Launch an A/B test campaign
   */
  @Post(":id/launch-ab-test")
  async launchAbTestCampaign(@Param("id") id: string, @Request() req) {
    const campaign = await this.productCampaignService.launchAbTestCampaign(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
      message: `A/B test campaign launched with ${campaign.variants.length} variants to ${campaign.estimatedReach} customers`,
    };
  }

  /**
   * POST /product-campaigns/:id/variants/:variantName/track
   * Track performance metrics for a specific variant
   */
  @Post(":id/variants/:variantName/track")
  async trackVariantPerformance(
    @Param("id") id: string,
    @Param("variantName") variantName: string,
    @Body() metrics: any,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.trackVariantPerformance(
      id,
      variantName,
      req.user.tenantId,
      metrics,
    );

    return {
      success: true,
      data: campaign,
      message: `Variant "${variantName}" performance updated`,
    };
  }

  /**
   * POST /product-campaigns/:id/select-winner/:variantName
   * Manually select a winner for an A/B test
   */
  @Post(":id/select-winner/:variantName")
  async selectWinner(
    @Param("id") id: string,
    @Param("variantName") variantName: string,
    @Request() req,
  ) {
    const campaign = await this.productCampaignService.selectWinner(
      id,
      variantName,
      req.user.tenantId,
    );

    return {
      success: true,
      data: campaign,
      message: `Variant "${variantName}" selected as winner`,
    };
  }

  /**
   * GET /product-campaigns/:id/ab-test-results
   * Get A/B test results comparison
   */
  @Get(":id/ab-test-results")
  async getAbTestResults(@Param("id") id: string, @Request() req) {
    const results = await this.productCampaignService.getAbTestResults(
      id,
      req.user.tenantId,
    );

    return {
      success: true,
      data: results,
    };
  }
}
