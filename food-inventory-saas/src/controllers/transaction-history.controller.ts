import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  NotFoundException,
} from "@nestjs/common";
import { TransactionHistoryService } from "../services/transaction-history.service";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import {
  TransactionHistoryFiltersDto,
  ProductCustomersFiltersDto,
  TopProductsQueryDto,
} from "../dto/transaction-history.dto";

@Controller("transaction-history")
@UseGuards(JwtAuthGuard)
export class TransactionHistoryController {
  constructor(
    private readonly transactionHistoryService: TransactionHistoryService,
  ) {}

  /**
   * Get customer transaction history
   * GET /transaction-history/customer/:customerId
   */
  @Get("customer/:customerId")
  async getCustomerTransactionHistory(
    @Param("customerId") customerId: string,
    @Query() filters: TransactionHistoryFiltersDto,
    @Request() req: any,
  ) {
    const transactions =
      await this.transactionHistoryService.getCustomerTransactionHistory(
        customerId,
        req.user.tenantId,
        filters,
      );

    return {
      success: true,
      data: transactions,
      count: transactions.length,
    };
  }

  /**
   * Get supplier transaction history
   * GET /transaction-history/supplier/:supplierId
   */
  @Get("supplier/:supplierId")
  async getSupplierTransactionHistory(
    @Param("supplierId") supplierId: string,
    @Query() filters: TransactionHistoryFiltersDto,
    @Request() req: any,
  ) {
    const transactions =
      await this.transactionHistoryService.getSupplierTransactionHistory(
        supplierId,
        req.user.tenantId,
        filters,
      );

    return {
      success: true,
      data: transactions,
      count: transactions.length,
    };
  }

  /**
   * Get customer's purchase history for a specific product
   * GET /transaction-history/customer/:customerId/product/:productId
   */
  @Get("customer/:customerId/product/:productId")
  async getCustomerProductHistory(
    @Param("customerId") customerId: string,
    @Param("productId") productId: string,
    @Request() req: any,
  ) {
    const history =
      await this.transactionHistoryService.getCustomerProductHistory(
        customerId,
        productId,
        req.user.tenantId,
      );

    return {
      success: true,
      data: history,
    };
  }

  /**
   * Get all customers who purchased a specific product
   * CRITICAL for targeted marketing campaigns
   * GET /transaction-history/product/:productId/customers
   */
  @Get("product/:productId/customers")
  async getCustomersWhoPurchasedProduct(
    @Param("productId") productId: string,
    @Query() filters: ProductCustomersFiltersDto,
    @Request() req: any,
  ) {
    const customers =
      await this.transactionHistoryService.getCustomersWhoPurchasedProduct(
        productId,
        req.user.tenantId,
        filters,
      );

    return {
      success: true,
      data: customers,
      count: customers.length,
    };
  }

  /**
   * Get customer's purchase frequency for a product (days between purchases)
   * GET /transaction-history/customer/:customerId/frequency/:productId
   */
  @Get("customer/:customerId/frequency/:productId")
  async getCustomerPurchaseFrequency(
    @Param("customerId") customerId: string,
    @Param("productId") productId: string,
    @Request() req: any,
  ) {
    const frequency =
      await this.transactionHistoryService.getCustomerPurchaseFrequency(
        customerId,
        productId,
        req.user.tenantId,
      );

    return {
      success: true,
      data: {
        customerId,
        productId,
        averageDaysBetweenPurchases: frequency,
      },
    };
  }

  /**
   * Get customer's top purchased products
   * GET /transaction-history/customer/:customerId/top-products
   */
  @Get("customer/:customerId/top-products")
  async getTopProductsByCustomer(
    @Param("customerId") customerId: string,
    @Query() query: TopProductsQueryDto,
    @Request() req: any,
  ) {
    const topProducts =
      await this.transactionHistoryService.getTopProductsByCustomer(
        customerId,
        req.user.tenantId,
        query.limit || 10,
      );

    return {
      success: true,
      data: topProducts,
      count: topProducts.length,
    };
  }

  /**
   * Get customer transaction statistics
   * GET /transaction-history/customer/:customerId/stats
   */
  @Get("customer/:customerId/stats")
  async getCustomerTransactionStats(
    @Param("customerId") customerId: string,
    @Request() req: any,
  ) {
    const stats =
      await this.transactionHistoryService.getCustomerTransactionStats(
        customerId,
        req.user.tenantId,
      );

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get customer's average order value
   * GET /transaction-history/customer/:customerId/average-order-value
   */
  @Get("customer/:customerId/average-order-value")
  async getAverageOrderValue(
    @Param("customerId") customerId: string,
    @Request() req: any,
  ) {
    const avgValue = await this.transactionHistoryService.getAverageOrderValue(
      customerId,
      req.user.tenantId,
    );

    return {
      success: true,
      data: {
        customerId,
        averageOrderValue: avgValue,
      },
    };
  }

  /**
   * Manually record a customer transaction from an order
   * POST /transaction-history/record/customer/:orderId
   */
  @Post("record/customer/:orderId")
  @HttpCode(HttpStatus.CREATED)
  async recordCustomerTransaction(
    @Param("orderId") orderId: string,
    @Request() req: any,
  ) {
    const transaction =
      await this.transactionHistoryService.recordCustomerTransaction(
        orderId,
        req.user.tenantId,
      );

    if (!transaction) {
      throw new NotFoundException(
        "Order has no customer or transaction could not be created",
      );
    }

    return {
      success: true,
      message: "Customer transaction recorded successfully",
      data: transaction,
    };
  }

  /**
   * Manually record a supplier transaction from a purchase order
   * POST /transaction-history/record/supplier/:purchaseOrderId
   */
  @Post("record/supplier/:purchaseOrderId")
  @HttpCode(HttpStatus.CREATED)
  async recordSupplierTransaction(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Request() req: any,
  ) {
    const transaction =
      await this.transactionHistoryService.recordSupplierTransaction(
        purchaseOrderId,
        req.user.tenantId,
      );

    if (!transaction) {
      throw new NotFoundException(
        "Purchase order has no supplier or transaction could not be created",
      );
    }

    return {
      success: true,
      message: "Supplier transaction recorded successfully",
      data: transaction,
    };
  }
}
