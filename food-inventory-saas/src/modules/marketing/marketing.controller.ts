import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { MarketingService } from "./marketing.service";
import {
  CreateMarketingCampaignDto,
  UpdateMarketingCampaignDto,
  GetMarketingCampaignsQueryDto,
} from "../../dto/marketing-campaign.dto";
import {
  CampaignAnalyticsFilterDto,
  CohortAnalysisDto,
  FunnelAnalysisDto,
  AttributionReportDto,
} from "../../dto/campaign-analytics.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";
import { AudienceFilterDto } from "../../dto/audience-filter.dto";

@Controller("marketing/campaigns")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Post()
  @Permissions("marketing_write")
  async create(
    @Body() createCampaignDto: CreateMarketingCampaignDto,
    @Req() req,
  ) {
    return this.marketingService.create(
      req.user.tenantId,
      req.user.organizationId,
      req.user.userId,
      createCampaignDto,
    );
  }

  @Get()
  @Permissions("marketing_read")
  async findAll(@Query() query: GetMarketingCampaignsQueryDto, @Req() req) {
    return this.marketingService.findAll(
      req.user.tenantId,
      req.user.organizationId,
      query,
    );
  }

  @Get("analytics")
  @Permissions("marketing_read")
  async getAnalytics(@Req() req) {
    return this.marketingService.getAnalytics(
      req.user.tenantId,
      req.user.organizationId,
    );
  }

  @Get(":id")
  @Permissions("marketing_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.marketingService.findOne(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
  }

  @Put(":id")
  @Permissions("marketing_write")
  async update(
    @Param("id") id: string,
    @Body() updateCampaignDto: UpdateMarketingCampaignDto,
    @Req() req,
  ) {
    return this.marketingService.update(
      req.user.tenantId,
      req.user.organizationId,
      id,
      updateCampaignDto,
    );
  }

  @Delete(":id")
  @Permissions("marketing_write")
  async remove(@Param("id") id: string, @Req() req) {
    await this.marketingService.remove(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
    return { message: "Campaign deleted successfully" };
  }

  @Post(":id/launch")
  @Permissions("marketing_write")
  async launch(@Param("id") id: string, @Req() req) {
    return this.marketingService.launch(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
  }

  @Post(":id/pause")
  @Permissions("marketing_write")
  async pause(@Param("id") id: string, @Req() req) {
    return this.marketingService.pause(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
  }

  @Post("audience/filter")
  @Permissions("marketing_read")
  async filterAudience(@Body() filters: AudienceFilterDto, @Req() req) {
    return this.marketingService.filterAudience(
      req.user.tenantId,
      req.user.organizationId,
      filters,
    );
  }

  @Post("audience/estimate")
  @Permissions("marketing_read")
  async estimateReach(@Body() body: { targetSegment: any }, @Req() req) {
    const count = await this.marketingService.calculateEstimatedReach(
      req.user.tenantId,
      req.user.organizationId,
      body.targetSegment,
    );
    return { estimatedReach: count };
  }

  // ==================== Phase 4: Advanced Analytics Endpoints ====================

  @Get("analytics/performance-over-time")
  @Permissions("marketing_read")
  async getPerformanceOverTime(
    @Query() filters: CampaignAnalyticsFilterDto,
    @Req() req,
  ) {
    const data = await this.marketingService.getCampaignPerformanceOverTime(
      req.user.tenantId,
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        campaignIds: filters.campaignIds,
        channel: filters.channel,
        granularity: filters.granularity,
      },
    );
    return {
      success: true,
      data,
    };
  }

  @Get("analytics/conversion-funnel")
  @Permissions("marketing_read")
  async getConversionFunnel(@Query() filters: FunnelAnalysisDto, @Req() req) {
    const data = await this.marketingService.getConversionFunnel(
      req.user.tenantId,
      filters.campaignId,
      filters.startDate,
      filters.endDate,
    );
    return {
      success: true,
      data,
    };
  }

  @Get("analytics/cohort-analysis")
  @Permissions("marketing_read")
  async getCohortAnalysis(@Query() filters: CohortAnalysisDto, @Req() req) {
    const data = await this.marketingService.getCohortAnalysis(
      req.user.tenantId,
      {
        startDate: filters.startDate,
        endDate: filters.endDate,
        segmentBy: filters.segmentBy,
        metric: filters.metric,
      },
    );
    return {
      success: true,
      data,
    };
  }

  @Get("analytics/revenue-attribution")
  @Permissions("marketing_read")
  async getRevenueAttribution(
    @Query() filters: AttributionReportDto,
    @Req() req,
  ) {
    const data = await this.marketingService.getRevenueAttribution(
      req.user.tenantId,
      filters.startDate,
      filters.endDate,
      filters.attributionModel,
    );
    return {
      success: true,
      data,
    };
  }

  @Get("analytics/compare-periods")
  @Permissions("marketing_read")
  async comparePerformancePeriods(
    @Query("currentStart") currentStart: string,
    @Query("currentEnd") currentEnd: string,
    @Query("previousStart") previousStart: string,
    @Query("previousEnd") previousEnd: string,
    @Req() req,
  ) {
    const data = await this.marketingService.comparePerformancePeriods(
      req.user.tenantId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    );
    return {
      success: true,
      data,
    };
  }
}
