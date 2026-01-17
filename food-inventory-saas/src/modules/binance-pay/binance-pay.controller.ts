import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { BinancePayService } from "./binance-pay.service";
import { CreateBinancePayOrderDto } from "./dto";
import {
  BinancePayStatus,
  BinancePayTransactionType,
} from "../../schemas/binance-pay-transaction.schema";

@ApiTags("Binance Pay")
@Controller("binance-pay")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class BinancePayController {
  constructor(private readonly binancePayService: BinancePayService) {}

  @Post("orders")
  @ApiOperation({ summary: "Crear una nueva orden de pago con Binance Pay" })
  @ApiResponse({
    status: 201,
    description: "Orden creada exitosamente",
  })
  @ApiResponse({
    status: 400,
    description: "Error en los datos de la orden",
  })
  async createOrder(
    @Request() req: any,
    @Body() createOrderDto: CreateBinancePayOrderDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    const transaction = await this.binancePayService.createOrder(
      tenantId,
      createOrderDto,
      userId,
    );

    return {
      success: true,
      data: {
        id: transaction._id,
        merchantTradeNo: transaction.merchantTradeNo,
        status: transaction.status,
        checkoutUrl: transaction.checkoutUrl,
        qrcodeLink: transaction.qrcodeLink,
        universalUrl: transaction.universalUrl,
        deeplink: transaction.deeplink,
        expireTime: transaction.expireTime,
        orderAmount: transaction.orderAmount,
        currency: transaction.currency,
      },
    };
  }

  @Get("orders")
  @ApiOperation({ summary: "Listar órdenes de pago" })
  @ApiQuery({ name: "status", required: false, enum: BinancePayStatus })
  @ApiQuery({ name: "transactionType", required: false, enum: BinancePayTransactionType })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async findAll(
    @Request() req: any,
    @Query("status") status?: BinancePayStatus,
    @Query("transactionType") transactionType?: BinancePayTransactionType,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const tenantId = req.user.tenantId;

    const result = await this.binancePayService.findAll(tenantId, {
      status,
      transactionType,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return {
      success: true,
      data: result.transactions,
      pagination: {
        total: result.total,
        page: result.page,
        totalPages: result.totalPages,
      },
    };
  }

  @Get("orders/:id")
  @ApiOperation({ summary: "Obtener una orden de pago por ID" })
  @ApiResponse({
    status: 200,
    description: "Orden encontrada",
  })
  @ApiResponse({
    status: 404,
    description: "Orden no encontrada",
  })
  async findById(@Request() req: any, @Param("id") id: string) {
    const tenantId = req.user.tenantId;
    const transaction = await this.binancePayService.findById(tenantId, id);

    return {
      success: true,
      data: transaction,
    };
  }

  @Get("orders/trade/:merchantTradeNo")
  @ApiOperation({ summary: "Obtener una orden por merchantTradeNo" })
  async findByMerchantTradeNo(
    @Request() req: any,
    @Param("merchantTradeNo") merchantTradeNo: string,
  ) {
    const tenantId = req.user.tenantId;
    const transaction = await this.binancePayService.findByMerchantTradeNo(
      tenantId,
      merchantTradeNo,
    );

    return {
      success: true,
      data: transaction,
    };
  }

  @Post("orders/:merchantTradeNo/sync")
  @ApiOperation({ summary: "Sincronizar estado de una orden con Binance Pay" })
  async syncOrderStatus(
    @Request() req: any,
    @Param("merchantTradeNo") merchantTradeNo: string,
  ) {
    const tenantId = req.user.tenantId;
    const transaction = await this.binancePayService.syncOrderStatus(
      tenantId,
      merchantTradeNo,
    );

    return {
      success: true,
      data: {
        id: transaction._id,
        merchantTradeNo: transaction.merchantTradeNo,
        status: transaction.status,
        transactionalId: transaction.transactionalId,
      },
    };
  }

  @Post("orders/:merchantTradeNo/refund")
  @ApiOperation({ summary: "Solicitar reembolso de una orden" })
  async requestRefund(
    @Request() req: any,
    @Param("merchantTradeNo") merchantTradeNo: string,
    @Body() body: { amount?: number; reason?: string },
  ) {
    const tenantId = req.user.tenantId;
    const transaction = await this.binancePayService.requestRefund(
      tenantId,
      merchantTradeNo,
      body.amount,
      body.reason,
    );

    return {
      success: true,
      data: {
        id: transaction._id,
        merchantTradeNo: transaction.merchantTradeNo,
        status: transaction.status,
        refundInfo: transaction.refundInfo,
      },
    };
  }

  @Get("summary")
  @ApiOperation({ summary: "Obtener resumen de transacciones" })
  async getSummary(@Request() req: any) {
    const tenantId = req.user.tenantId;
    const summary = await this.binancePayService.getSummary(tenantId);

    return {
      success: true,
      data: summary,
    };
  }
}
