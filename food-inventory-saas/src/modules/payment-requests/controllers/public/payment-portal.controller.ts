import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Public } from "../../../../decorators/public.decorator";
import { PaymentTokenGuard } from "../../guards/payment-token.guard";
import { PaymentRequestsService } from "../../services/payment-requests.service";
import { SubmitProofDto } from "../../dto/submit-proof.dto";

/**
 * Public-portal surface consumed by the storefront (food-inventory-storefront)
 * under /pago/[token]. The PaymentTokenGuard verifies the JWT and attaches
 * the loaded PaymentRequest to `req.paymentRequest`.
 *
 * Routes are explicitly marked `@Public()` so TenantGuard / JwtAuthGuard
 * (applied globally elsewhere) do not bounce them.
 */
@ApiTags("Payment Portal (Public)")
@Controller("public/payment-portal")
@UseGuards(PaymentTokenGuard)
@Public()
export class PaymentPortalController {
  constructor(
    private readonly paymentRequestsService: PaymentRequestsService,
  ) {}

  @Get(":token")
  @ApiOperation({ summary: "Obtener información del portal de pago" })
  @ApiResponse({ status: 200, description: "Datos del portal" })
  async getPortal(@Req() req: any) {
    const info = await this.paymentRequestsService.buildPublicInfo(
      req.paymentRequest,
    );
    return { success: true, data: info };
  }

  /**
   * Customer-facing proof submission. Multipart form-data:
   * - `image` (file) — JPEG/PNG/WebP/HEIC, ≤10MB raw
   * - other DTO fields as form text
   *
   * Rate-limited to 5 submissions per token per hour at the IP-keyed
   * "long" throttler — defense in depth against spam.
   */
  @Post(":token/proofs")
  @Throttle({ long: { limit: 5, ttl: 3600000 } })
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype || !file.mimetype.match(/^image\//)) {
          cb(
            new BadRequestException(
              "Solo se permiten imágenes (JPG, PNG, WebP, HEIC)",
            ),
            false,
          );
        } else {
          cb(null, true);
        }
      },
    }),
  )
  @ApiOperation({ summary: "Enviar un comprobante de pago" })
  @ApiResponse({ status: 201, description: "Comprobante recibido" })
  async submitProof(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: SubmitProofDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException("Falta la imagen del comprobante");
    }
    const pr = await this.paymentRequestsService.submitProof(
      req.paymentRequest,
      dto,
      { buffer: file.buffer, mimetype: file.mimetype, size: file.size },
    );

    // Return the same shape the portal will need to render the success page —
    // status + masked proof id.
    return {
      success: true,
      data: {
        status: pr.status,
        proofId: pr.proofs[pr.proofs.length - 1]?._id?.toString(),
      },
    };
  }

  /**
   * Customer switches to a different payment method offered by the tenant.
   * Returns the freshly-rebuilt public info so the portal can swap the
   * displayed `selectedMethod` + `accountDetails` without a second GET.
   *
   * Throttled to 10 changes per hour — should be enough for the legit
   * "wait, my Banesco is short, let me try Pago Móvil" case but caps
   * scraping abuse.
   */
  @Post(":token/method-override")
  @Throttle({ long: { limit: 10, ttl: 3600000 } })
  @ApiOperation({ summary: "Cambiar el método de pago seleccionado" })
  @ApiResponse({ status: 200, description: "Método actualizado" })
  async overrideMethod(
    @Body() body: { methodId: string },
    @Req() req: any,
  ) {
    if (!body?.methodId || typeof body.methodId !== "string") {
      throw new BadRequestException("Falta el methodId");
    }
    const updated = await this.paymentRequestsService.overrideMethod(
      req.paymentRequest,
      body.methodId,
    );
    const info = await this.paymentRequestsService.buildPublicInfo(updated);
    return { success: true, data: info };
  }
}
