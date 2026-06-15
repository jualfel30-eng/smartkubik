import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { TenantGuard } from "../../../guards/tenant.guard";
import { PermissionsGuard } from "../../../guards/permissions.guard";
import { Permissions } from "../../../decorators/permissions.decorator";
import { PaymentRequestsService } from "../services/payment-requests.service";
import { CreatePaymentRequestDto } from "../dto/create-payment-request.dto";
import { ListPaymentRequestsDto } from "../dto/list-payment-requests.dto";
import {
  AcceptProofDto,
  RejectProofDto,
} from "../dto/review-proof.dto";

/**
 * Tenant-side surface for PaymentRequest management. Every route requires
 * an authenticated user belonging to a valid tenant AND the
 * `payment_requests_review` permission (granted to admin + employee by
 * default; tenants can extend to other roles).
 */
@ApiTags("Payment Requests")
@ApiBearerAuth()
@Controller("payment-requests")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class PaymentRequestsController {
  constructor(
    private readonly paymentRequestsService: PaymentRequestsService,
  ) {}

  @Post()
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Crear PaymentRequest manualmente para una entidad existente" })
  @ApiResponse({ status: 201, description: "PaymentRequest creado" })
  async create(@Body() dto: CreatePaymentRequestDto, @Req() req: any) {
    const { paymentRequest, portalUrl } =
      await this.paymentRequestsService.create(req.user.tenantId, dto, {
        kind: "tenant",
        userId: req.user.id || req.user.userId,
      });

    return {
      success: true,
      data: {
        paymentRequest,
        portalUrl,
      },
    };
  }

  @Get("pending-count")
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Contador de comprobantes por revisar (badge)" })
  async pendingCount(@Req() req: any) {
    const count = await this.paymentRequestsService.pendingCountForTenant(
      req.user.tenantId,
    );
    return { success: true, data: { count } };
  }

  @Get()
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Listar PaymentRequests del tenant con filtros" })
  async list(@Query() query: ListPaymentRequestsDto, @Req() req: any) {
    const result = await this.paymentRequestsService.findForTenant(
      req.user.tenantId,
      query,
    );
    const base = await this.paymentRequestsService.getStorefrontBaseUrl(
      req.user.tenantId,
    );
    return {
      success: true,
      ...result,
      data: result.data.map((pr) =>
        this.paymentRequestsService.attachPortalUrl(pr, base),
      ),
    };
  }

  @Get(":id")
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Detalle de un PaymentRequest (incluye audit trail)" })
  async findOne(@Param("id") id: string, @Req() req: any) {
    const pr = await this.paymentRequestsService.findOneForTenant(
      req.user.tenantId,
      id,
    );
    const base = await this.paymentRequestsService.getStorefrontBaseUrl(
      req.user.tenantId,
    );
    return {
      success: true,
      data: this.paymentRequestsService.attachPortalUrl(pr, base),
    };
  }

  @Post(":id/proofs/:proofId/accept")
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Aceptar un comprobante específico" })
  async acceptProof(
    @Param("id") id: string,
    @Param("proofId") proofId: string,
    @Body() dto: AcceptProofDto,
    @Req() req: any,
  ) {
    const pr = await this.paymentRequestsService.acceptProof(
      req.user.tenantId,
      id,
      proofId,
      dto,
      { kind: "tenant", userId: req.user.id || req.user.userId },
    );
    return { success: true, data: pr };
  }

  @Post(":id/proofs/:proofId/reject")
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Pedir corrección de un comprobante con tipología" })
  async rejectProof(
    @Param("id") id: string,
    @Param("proofId") proofId: string,
    @Body() dto: RejectProofDto,
    @Req() req: any,
  ) {
    const pr = await this.paymentRequestsService.rejectProof(
      req.user.tenantId,
      id,
      proofId,
      dto,
      { kind: "tenant", userId: req.user.id || req.user.userId },
    );
    return { success: true, data: pr };
  }

  @Post(":id/confirm")
  @Permissions("payment_requests_review")
  @ApiOperation({
    summary: "Confirmar pago — genera Payment(s) y actualiza el entity",
  })
  async confirm(@Param("id") id: string, @Req() req: any) {
    const pr = await this.paymentRequestsService.confirm(
      req.user.tenantId,
      id,
      { kind: "tenant", userId: req.user.id || req.user.userId },
    );
    return { success: true, data: pr };
  }

  @Post(":id/awaiting-settlement")
  @Permissions("payment_requests_review")
  @ApiOperation({
    summary: "Mantener en espera mientras el banco acredita (silencioso al cliente)",
  })
  async markAwaitingSettlement(@Param("id") id: string, @Req() req: any) {
    const pr = await this.paymentRequestsService.markAwaitingSettlement(
      req.user.tenantId,
      id,
      { kind: "tenant", userId: req.user.id || req.user.userId },
    );
    return { success: true, data: pr };
  }

  @Post(":id/resend-link")
  @Permissions("payment_requests_review")
  @ApiOperation({ summary: "Reintentar entrega del link por WhatsApp" })
  async resendLink(
    @Param("id") id: string,
    @Body() body: { phone?: string },
    @Req() req: any,
  ) {
    const pr = await this.paymentRequestsService.resendDeliveryLink(
      req.user.tenantId,
      id,
      body?.phone,
      { kind: "tenant", userId: req.user.id || req.user.userId },
    );
    return { success: true, data: pr };
  }
}
