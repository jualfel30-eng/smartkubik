import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../../decorators/public.decorator";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { SuperAdminGuard } from "../super-admin/guards/super-admin.guard";
import { NewsletterService } from "./newsletter.service";

@ApiTags("newsletter")
@Controller("newsletter")
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  @Public()
  @Post("subscribe")
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Subscribe to the SmartKubik newsletter" })
  @ApiResponse({ status: 201, description: "Suscripción exitosa." })
  @ApiResponse({ status: 409, description: "Email ya suscrito." })
  @ApiResponse({ status: 429, description: "Demasiados intentos." })
  async subscribe(
    @Body() body: { email: string; source?: string; utmParams?: Record<string, string> },
  ) {
    return this.newsletterService.subscribe(
      body.email,
      body.source,
      body.utmParams,
    );
  }

  @Public()
  @Post("unsubscribe")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Unsubscribe from the newsletter" })
  @ApiResponse({ status: 200, description: "Desuscripción exitosa." })
  async unsubscribe(@Body() body: { email: string }) {
    return this.newsletterService.unsubscribe(body.email);
  }

  @Get("subscribers")
  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "[SUPER ADMIN] List newsletter subscribers" })
  @ApiResponse({ status: 200, description: "Lista de suscriptores." })
  async getSubscribers(
    @Query("page") page: number = 1,
    @Query("limit") limit: number = 50,
  ) {
    return this.newsletterService.getSubscribers(page, limit);
  }
}
