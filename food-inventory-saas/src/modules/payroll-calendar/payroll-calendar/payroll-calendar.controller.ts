import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Permissions } from "../../../decorators/permissions.decorator";
import { JwtAuthGuard } from "../../../guards/jwt-auth.guard";
import { TenantGuard } from "../../../guards/tenant.guard";
import { PayrollCalendarService } from "./payroll-calendar.service";
import {
  CreatePayrollCalendarDto,
  UpdatePayrollCalendarDto,
} from "../dto/create-payroll-calendar.dto";
import { GeneratePayrollCalendarDto } from "../dto/generate-payroll-calendar.dto";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("payroll-calendar")
export class PayrollCalendarController {
  constructor(private readonly calendarService: PayrollCalendarService) {}

  @Get()
  @Permissions("payroll_employees_read")
  list(@Req() req) {
    return this.calendarService.listCalendars(req.user.tenantId);
  }

  @Post()
  @Permissions("payroll_employees_write")
  create(@Req() req, @Body() body: CreatePayrollCalendarDto) {
    return this.calendarService.createCalendar(req.user.tenantId, body);
  }

  @Post("generate")
  @Permissions("payroll_employees_write")
  bulkGenerate(@Req() req, @Body() body: GeneratePayrollCalendarDto) {
    return this.calendarService.generateFutureCalendars(
      req.user.tenantId,
      body,
      req.user.id,
    );
  }

  @Patch(":id")
  @Permissions("payroll_employees_write")
  update(
    @Req() req,
    @Param("id") id: string,
    @Body() body: UpdatePayrollCalendarDto,
  ) {
    return this.calendarService.updateCalendar(req.user.tenantId, id, body);
  }

  @Patch(":id/close")
  @Permissions("payroll_employees_write")
  close(@Req() req, @Param("id") id: string) {
    return this.calendarService.closeCalendar(req.user.tenantId, id);
  }

  @Patch(":id/reopen")
  @Permissions("payroll_employees_write")
  reopen(@Req() req, @Param("id") id: string) {
    return this.calendarService.reopenCalendar(req.user.tenantId, id);
  }
}
