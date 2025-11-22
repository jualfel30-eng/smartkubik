import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request as Req,
} from "@nestjs/common";
import { ReservationsService } from "./reservations.service";
import {
  CreateReservationDto,
  UpdateReservationDto,
  CheckAvailabilityDto,
  SeatReservationDto,
  CancelReservationDto,
  ReservationQueryDto,
  UpdateReservationSettingsDto,
} from "../../dto/reservation.dto";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { PermissionsGuard } from "../../guards/permissions.guard";
import { Permissions } from "../../decorators/permissions.decorator";

@Controller("reservations")
@UseGuards(JwtAuthGuard, TenantGuard, PermissionsGuard)
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  // ========== Settings ==========

  @Get("settings")
  @Permissions("restaurant_read")
  async getSettings(@Req() req) {
    return this.reservationsService.getSettings(req.user.tenantId);
  }

  @Put("settings")
  @Permissions("restaurant_write")
  async updateSettings(@Body() dto: UpdateReservationSettingsDto, @Req() req) {
    return this.reservationsService.updateSettings(dto, req.user.tenantId);
  }

  // ========== Availability ==========

  @Post("check-availability")
  async checkAvailability(@Body() dto: CheckAvailabilityDto, @Req() req) {
    return this.reservationsService.checkAvailability(dto, req.user.tenantId);
  }

  // ========== CRUD ==========

  @Post()
  @Permissions("restaurant_write")
  async create(@Body() dto: CreateReservationDto, @Req() req) {
    return this.reservationsService.create(dto, req.user.tenantId);
  }

  @Get()
  @Permissions("restaurant_read")
  async findAll(@Query() query: ReservationQueryDto, @Req() req) {
    return this.reservationsService.findAll(query, req.user.tenantId);
  }

  @Get("calendar")
  @Permissions("restaurant_read")
  async getCalendar(@Query("month") month: string, @Req() req) {
    return this.reservationsService.getCalendar(
      month || new Date().toISOString().substr(0, 7),
      req.user.tenantId,
    );
  }

  @Get(":id")
  @Permissions("restaurant_read")
  async findOne(@Param("id") id: string, @Req() req) {
    return this.reservationsService.findOne(id, req.user.tenantId);
  }

  @Put(":id")
  @Permissions("restaurant_write")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateReservationDto,
    @Req() req,
  ) {
    return this.reservationsService.update(id, dto, req.user.tenantId);
  }

  // ========== State Changes ==========

  @Patch(":id/confirm")
  @Permissions("restaurant_write")
  async confirm(@Param("id") id: string, @Req() req) {
    return this.reservationsService.confirm(id, req.user.tenantId);
  }

  @Patch(":id/seat")
  @Permissions("restaurant_write")
  async seat(
    @Param("id") id: string,
    @Body() dto: SeatReservationDto,
    @Req() req,
  ) {
    return this.reservationsService.seat(id, dto, req.user.tenantId);
  }

  @Delete(":id")
  @Permissions("restaurant_write")
  async cancel(
    @Param("id") id: string,
    @Body() dto: CancelReservationDto,
    @Req() req,
  ) {
    return this.reservationsService.cancel(id, dto, req.user.tenantId);
  }

  @Patch(":id/no-show")
  @Permissions("restaurant_write")
  async markNoShow(@Param("id") id: string, @Req() req) {
    return this.reservationsService.markNoShow(id, req.user.tenantId);
  }
}
