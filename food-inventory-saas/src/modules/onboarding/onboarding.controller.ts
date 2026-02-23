import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../decorators/public.decorator";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import {
  CreateTenantWithAdminDto,
  ConfirmTenantDto,
  SubscribeDto,
} from "./dto/onboarding.dto";
import { OnboardingService } from "./onboarding.service";

@ApiTags("onboarding")
@Controller("onboarding")
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Public()
  @Post("register")
  @Throttle({ short: { limit: 2, ttl: 60000 } }) // 2 registros de tenant por minuto
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Registrar un nuevo tenant y su administrador" })
  @ApiResponse({
    status: 201,
    description: "Tenant y administrador creados exitosamente.",
  })
  @ApiResponse({ status: 400, description: "Datos inválidos." })
  @ApiResponse({
    status: 429,
    description: "Demasiados intentos. Intente más tarde",
  })
  async register(@Body() createTenantDto: CreateTenantWithAdminDto) {
    return this.onboardingService.createTenantAndAdmin(createTenantDto);
  }

  @Public()
  @Post("confirm")
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Confirmar un tenant con el código enviado por correo",
  })
  @ApiResponse({ status: 200, description: "Tenant confirmado exitosamente." })
  @ApiResponse({ status: 400, description: "Código inválido o expirado." })
  async confirm(@Body() confirmTenantDto: ConfirmTenantDto) {
    return this.onboardingService.confirmTenant(confirmTenantDto);
  }

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Upgrade de trial a plan pago (o cambio de plan)",
  })
  @ApiResponse({
    status: 200,
    description: "Suscripción activada exitosamente.",
  })
  @ApiResponse({ status: 400, description: "Plan inválido." })
  async subscribe(@Body() subscribeDto: SubscribeDto, @Request() req) {
    const tenantId = req.user.tenantId;
    return this.onboardingService.subscribeToPlan(tenantId, subscribeDto);
  }
}
