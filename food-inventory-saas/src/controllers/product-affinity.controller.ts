import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { ProductAffinityService } from "../services/product-affinity.service";
import { UpdateAffinityScoresJob } from "../modules/product-affinity/update-affinity-scores.job";
import {
  ProductCustomerMatrixFiltersDto,
  CustomerProductMatrixFiltersDto,
  PurchaseAffinityQueryDto,
  TopCustomersQueryDto,
  TopProductsQueryDto,
} from "../dto/product-affinity.dto";

@Controller("product-affinity")
@UseGuards(JwtAuthGuard)
export class ProductAffinityController {
  constructor(
    private readonly productAffinityService: ProductAffinityService,
    private readonly updateAffinityScoresJob: UpdateAffinityScoresJob,
  ) {}

  /**
   * GET /product-affinity/product/:productId/customers
   * Get all customers who purchased a product (Customer Purchase Matrix)
   */
  @Get("product/:productId/customers")
  async getProductCustomerMatrix(
    @Param("productId") productId: string,
    @Query() filters: ProductCustomerMatrixFiltersDto,
    @Request() req: any,
  ) {
    const result = await this.productAffinityService.getProductCustomerMatrix(
      productId,
      req.user.tenantId,
      {
        minPurchaseCount: filters.minPurchaseCount,
        minTotalSpent: filters.minTotalSpent,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /product-affinity/customer/:customerId/products
   * Get all products purchased by a customer (Product Purchase Matrix)
   */
  @Get("customer/:customerId/products")
  async getCustomerProductMatrix(
    @Param("customerId") customerId: string,
    @Query() filters: CustomerProductMatrixFiltersDto,
    @Request() req: any,
  ) {
    const result = await this.productAffinityService.getCustomerProductMatrix(
      customerId,
      req.user.tenantId,
      {
        minPurchaseCount: filters.minPurchaseCount,
        category: filters.category,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /product-affinity/product/:productId/co-purchase
   * Get products frequently bought together with this product
   */
  @Get("product/:productId/co-purchase")
  async calculatePurchaseAffinity(
    @Param("productId") productId: string,
    @Query() query: PurchaseAffinityQueryDto,
    @Request() req: any,
  ) {
    const result = await this.productAffinityService.calculatePurchaseAffinity(
      productId,
      req.user.tenantId,
      {
        limit: query.limit,
        minAffinityScore: query.minAffinityScore,
        customerId: query.customerId,
      },
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /product-affinity/product/:productId/top-customers
   * Get top customers for a product
   */
  @Get("product/:productId/top-customers")
  async getTopCustomersForProduct(
    @Param("productId") productId: string,
    @Query() query: TopCustomersQueryDto,
    @Request() req: any,
  ) {
    const result = await this.productAffinityService.getTopCustomersForProduct(
      productId,
      req.user.tenantId,
      query.limit,
    );

    return {
      success: true,
      data: result,
    };
  }

  /**
   * GET /product-affinity/customer/:customerId/top-products
   * Get top products for a customer
   */
  @Get("customer/:customerId/top-products")
  async getTopProductsForCustomer(
    @Param("customerId") customerId: string,
    @Query() query: TopProductsQueryDto,
    @Request() req: any,
  ) {
    const result = await this.productAffinityService.getTopProductsForCustomer(
      customerId,
      req.user.tenantId,
      query.limit,
    );

    return {
      success: true,
      data: result,
    };
  }

  // ========================================================================
  // PHASE 2: CUSTOMER-PRODUCT AFFINITY CACHE ENDPOINTS
  // ========================================================================

  /**
   * GET /product-affinity/customer/:customerId/affinities
   * Get customer's product affinities (sorted by score)
   */
  @Get("customer/:customerId/affinities")
  async getCustomerProductAffinities(
    @Param("customerId") customerId: string,
    @Query("limit") limit?: number,
    @Query("minScore") minScore?: number,
    @Query("category") category?: string,
    @Query("segment") segment?: string,
    @Request() req?: any,
  ) {
    const affinities =
      await this.productAffinityService.getCustomerProductAffinities(
        customerId,
        req.user.tenantId,
        {
          limit: limit ? Number(limit) : 50,
          minScore: minScore ? Number(minScore) : undefined,
          category,
          segment,
        },
      );

    return {
      success: true,
      data: affinities,
      count: affinities.length,
    };
  }

  /**
   * GET /product-affinity/customer/:customerId/recommendations
   * Get predictive recommendations for a customer
   */
  @Get("customer/:customerId/recommendations")
  async getPredictiveRecommendations(
    @Param("customerId") customerId: string,
    @Query("limit") limit?: number,
    @Request() req?: any,
  ) {
    const recommendations =
      await this.productAffinityService.getPredictiveRecommendations(
        customerId,
        req.user.tenantId,
        limit ? Number(limit) : 10,
      );

    return {
      success: true,
      message: "Predictive recommendations based on purchase patterns",
      data: recommendations,
      count: recommendations.length,
    };
  }

  /**
   * GET /product-affinity/product/:productId/at-risk-customers
   * Get customers at risk for a product (haven't purchased in expected timeframe)
   */
  @Get("product/:productId/at-risk-customers")
  async getAtRiskCustomersForProduct(
    @Param("productId") productId: string,
    @Request() req: any,
  ) {
    const atRiskCustomers =
      await this.productAffinityService.getAtRiskCustomersForProduct(
        productId,
        req.user.tenantId,
      );

    return {
      success: true,
      message: "Customers who should have repurchased but haven't",
      data: atRiskCustomers,
      count: atRiskCustomers.length,
    };
  }

  /**
   * POST /product-affinity/recalculate
   * Manually trigger affinity scores recalculation for current tenant
   */
  @Post("recalculate")
  @HttpCode(HttpStatus.OK)
  async manualRecalculate(@Request() req: any) {
    const result = await this.updateAffinityScoresJob.manualUpdate(
      req.user.tenantId,
    );

    return {
      success: true,
      message: "Affinity scores recalculation completed",
      data: result,
    };
  }
}
