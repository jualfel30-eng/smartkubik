import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "@/guards/jwt-auth.guard";
import { TenantGuard } from "@/guards/tenant.guard";
import { PermissionsGuard } from "@/guards/permissions.guard";
import { Permissions } from "@/decorators/permissions.decorator";
import { ProductDedupService } from "./product-dedup.service";
import { ScanDuplicatesDto } from "./dto/scan-duplicates.dto";
import {
  MergeProductsDto,
  BulkMergeDto,
  ReverseMergeDto,
} from "./dto/merge-products.dto";
import {
  DuplicateGroupsFilterDto,
  MergeJobsFilterDto,
} from "./dto/dedup-filter.dto";

@Controller("product-dedup")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ProductDedupController {
  constructor(
    private readonly productDedupService: ProductDedupService,
  ) {}

  // ── Scan & Detection ──

  @Post("scan")
  @Permissions("products_dedup_write")
  async triggerScan(
    @Body() config: ScanDuplicatesDto,
    @Req() req,
  ) {
    return this.productDedupService.triggerScan(config, req.user);
  }

  @Get("scans")
  @Permissions("products_dedup_read")
  async getScans(@Req() req) {
    return this.productDedupService.getScans(req.user);
  }

  @Get("groups")
  @Permissions("products_dedup_read")
  async getGroups(
    @Query() filter: DuplicateGroupsFilterDto,
    @Req() req,
  ) {
    return this.productDedupService.getGroups(filter, req.user);
  }

  @Get("groups/:id")
  @Permissions("products_dedup_read")
  async getGroupById(@Param("id") id: string, @Req() req) {
    return this.productDedupService.getGroupById(id, req.user);
  }

  // ── Review & Merge ──

  @Patch("groups/:id/dismiss")
  @Permissions("products_dedup_write")
  async dismissGroup(@Param("id") id: string, @Req() req) {
    return this.productDedupService.dismissGroup(id, req.user);
  }

  @Post("groups/:id/merge")
  @Permissions("products_dedup_write")
  async mergeGroup(
    @Param("id") id: string,
    @Body() mergeDto: MergeProductsDto,
    @Req() req,
  ) {
    return this.productDedupService.mergeGroup(
      id,
      mergeDto,
      req.user,
    );
  }

  @Post("bulk-merge")
  @Permissions("products_dedup_admin")
  async bulkMerge(@Body() bulkDto: BulkMergeDto, @Req() req) {
    return this.productDedupService.bulkMerge(
      bulkDto.scanId,
      bulkDto.minConfidence,
      req.user,
    );
  }

  // ── History & Reversal ──

  @Get("merge-jobs")
  @Permissions("products_dedup_read")
  async getMergeJobs(
    @Query() filter: MergeJobsFilterDto,
    @Req() req,
  ) {
    return this.productDedupService.getMergeJobs(filter, req.user);
  }

  @Get("merge-jobs/:id")
  @Permissions("products_dedup_read")
  async getMergeJobById(@Param("id") id: string, @Req() req) {
    return this.productDedupService.getMergeJobById(id, req.user);
  }

  @Post("merge-jobs/:id/reverse")
  @Permissions("products_dedup_admin")
  async reverseMergeJob(
    @Param("id") id: string,
    @Body() reverseDto: ReverseMergeDto,
    @Req() req,
  ) {
    return this.productDedupService.reverseMergeJob(
      id,
      reverseDto,
      req.user,
    );
  }

  // ── Stats ──

  @Get("stats")
  @Permissions("products_dedup_read")
  async getStats(@Req() req) {
    return this.productDedupService.getStats(req.user);
  }
}
