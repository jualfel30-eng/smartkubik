import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { DeliveryService } from "./delivery.service";
import {
  CreateMessageDeliveryDto,
  UpdateDeliveryStatusDto,
  GetDeliveriesQueryDto,
  DeliveryStatsDto,
  RetryDeliveryDto,
  BulkSendDto,
} from "../../dto/message-delivery.dto";

/**
 * PHASE 7: EMAIL/SMS TEMPLATES & DELIVERY SYSTEM
 * DeliveryController - Endpoints para tracking y gestión de envíos
 */

@Controller("deliveries")
@UseGuards(JwtAuthGuard)
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * POST /deliveries
   * Queue a message for delivery
   */
  @Post()
  async queueMessage(
    @Body() createDto: CreateMessageDeliveryDto,
    @Request() req,
  ) {
    const delivery = await this.deliveryService.queueMessage(
      req.user.tenantId,
      createDto,
    );

    return {
      success: true,
      data: delivery,
      message: "Message queued for delivery",
    };
  }

  /**
   * POST /deliveries/bulk
   * Send messages in bulk with rate limiting
   */
  @Post("bulk")
  async bulkSend(@Body() bulkDto: BulkSendDto, @Request() req) {
    const result = await this.deliveryService.bulkSend(
      req.user.tenantId,
      bulkDto,
    );

    return {
      success: true,
      data: result,
      message: `Bulk send completed: ${result.queued} queued, ${result.failed} failed`,
    };
  }

  /**
   * GET /deliveries
   * Get all deliveries with filters
   */
  @Get()
  async findAll(@Query() query: GetDeliveriesQueryDto, @Request() req) {
    const result = await this.deliveryService.findAll(req.user.tenantId, query);

    return {
      success: true,
      data: result.deliveries,
      pagination: {
        total: result.total,
        page: query.page || 1,
        limit: query.limit || 50,
      },
    };
  }

  /**
   * GET /deliveries/:id
   * Get delivery by ID
   */
  @Get(":id")
  async findById(@Param("id") id: string, @Request() req) {
    const delivery = await this.deliveryService.findById(req.user.tenantId, id);

    return {
      success: true,
      data: delivery,
    };
  }

  /**
   * POST /deliveries/:id/retry
   * Retry a failed delivery
   */
  @Post(":id/retry")
  async retry(@Param("id") id: string, @Request() req) {
    const delivery = await this.deliveryService.retryDelivery(
      req.user.tenantId,
      id,
    );

    return {
      success: true,
      data: delivery,
      message: "Delivery retry initiated",
    };
  }

  /**
   * POST /deliveries/retry-batch
   * Retry multiple failed deliveries
   */
  @Post("retry-batch")
  async retryBatch(@Body() retryDto: RetryDeliveryDto, @Request() req) {
    const results: Array<{
      deliveryId: string;
      success: boolean;
      status?: string;
      error?: string;
    }> = [];

    for (const deliveryId of retryDto.deliveryIds) {
      try {
        const delivery = await this.deliveryService.retryDelivery(
          req.user.tenantId,
          deliveryId,
        );
        results.push({
          deliveryId,
          success: true,
          status: delivery.status,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({
          deliveryId,
          success: false,
          error: message,
        });
      }

      // Optional delay between retries
      if (retryDto.delaySeconds && retryDto.delaySeconds > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDto.delaySeconds! * 1000),
        );
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return {
      success: true,
      data: results,
      message: `Batch retry completed: ${successCount}/${results.length} succeeded`,
    };
  }

  /**
   * PUT /deliveries/:id/status
   * Update delivery status (webhook callback)
   */
  @Put(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() updateDto: UpdateDeliveryStatusDto,
    @Request() req,
  ) {
    const delivery = await this.deliveryService.updateStatus(
      req.user.tenantId,
      id,
      updateDto,
    );

    return {
      success: true,
      data: delivery,
      message: "Delivery status updated",
    };
  }

  /**
   * POST /deliveries/:id/track/open
   * Track email open event
   */
  @Post(":id/track/open")
  async trackOpen(@Param("id") id: string, @Request() req) {
    await this.deliveryService.trackOpen(req.user.tenantId, id);

    return {
      success: true,
      message: "Open event tracked",
    };
  }

  /**
   * POST /deliveries/:id/track/click
   * Track email click event
   */
  @Post(":id/track/click")
  async trackClick(
    @Param("id") id: string,
    @Body() body: { url: string },
    @Request() req,
  ) {
    await this.deliveryService.trackClick(req.user.tenantId, id, body.url);

    return {
      success: true,
      message: "Click event tracked",
    };
  }

  /**
   * GET /deliveries/stats
   * Get delivery statistics
   */
  @Get("stats/overview")
  async getStats(@Query() query: DeliveryStatsDto, @Request() req) {
    const stats = await this.deliveryService.getStats(
      req.user.tenantId,
      query.campaignId,
      query.channel,
      query.startDate,
      query.endDate,
    );

    return {
      success: true,
      data: stats,
    };
  }
}
