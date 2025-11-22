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
import { ReviewsService } from "./reviews.service";
import {
  CreateReviewDto,
  UpdateReviewDto,
  RespondToReviewDto,
  GetReviewsQueryDto,
} from "../../dto/review.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("reviews")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Permissions("restaurant_write")
  async create(@Body() createReviewDto: CreateReviewDto, @Req() req) {
    return this.reviewsService.create(
      req.user.tenantId,
      req.user.organizationId,
      createReviewDto,
    );
  }

  @Get()
  @Permissions("restaurant_read")
  async findAll(@Query() query: GetReviewsQueryDto, @Req() req) {
    return this.reviewsService.findAll(
      req.user.tenantId,
      req.user.organizationId,
      query,
    );
  }

  @Get("analytics")
  @Permissions("restaurant_read")
  async getAnalytics(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Req() req,
  ) {
    return this.reviewsService.getAnalytics(
      req.user.tenantId,
      req.user.organizationId,
      startDate,
      endDate,
    );
  }

  @Get("comparison")
  @Permissions("restaurant_read")
  async getComparison(
    @Query("currentStart") currentStart: string,
    @Query("currentEnd") currentEnd: string,
    @Query("previousStart") previousStart: string,
    @Query("previousEnd") previousEnd: string,
    @Req() req,
  ) {
    return this.reviewsService.getComparison(
      req.user.tenantId,
      req.user.organizationId,
      currentStart,
      currentEnd,
      previousStart,
      previousEnd,
    );
  }

  @Get(":id")
  @Permissions("restaurant_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.reviewsService.findOne(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
  }

  @Put(":id")
  @Permissions("restaurant_write")
  async update(
    @Param("id") id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.update(
      req.user.tenantId,
      req.user.organizationId,
      id,
      updateReviewDto,
    );
  }

  @Delete(":id")
  @Permissions("restaurant_write")
  async remove(@Param("id") id: string, @Req() req) {
    await this.reviewsService.remove(
      req.user.tenantId,
      req.user.organizationId,
      id,
    );
    return { message: "Review deleted successfully" };
  }

  @Post(":id/respond")
  @Permissions("restaurant_write")
  async respondToReview(
    @Param("id") id: string,
    @Body() respondDto: RespondToReviewDto,
    @Req() req,
  ) {
    return this.reviewsService.respondToReview(
      req.user.tenantId,
      req.user.organizationId,
      id,
      req.user.userId,
      respondDto,
    );
  }

  @Post(":id/flag")
  @Permissions("restaurant_write")
  async flagReview(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Req() req,
  ) {
    return this.reviewsService.flagReview(
      req.user.tenantId,
      req.user.organizationId,
      id,
      reason,
    );
  }
}
