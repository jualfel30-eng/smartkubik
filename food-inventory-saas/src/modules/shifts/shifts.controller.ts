import { Controller, Post, Get, UseGuards, Req, Res } from "@nestjs/common";
import { ShiftsService } from "./shifts.service";
import { JwtAuthGuard } from "../../guards/jwt-auth.guard";
import { TenantGuard } from "../../guards/tenant.guard";
import { Response } from "express";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("shifts")
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) { }

  @Post("clock-in")
  async clockIn(@Req() req, @Res() res: Response) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.clockIn(userId, tenantId);
    return res.status(201).json({
      success: true,
      message: "Turno iniciado exitosamente",
      data: shift,
    });
  }

  @Post("clock-out")
  async clockOut(@Req() req, @Res() res: Response) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.clockOut(userId, tenantId);
    return res.status(200).json({
      success: true,
      message: "Turno finalizado exitosamente",
      data: shift,
    });
  }

  @Get("current")
  async getCurrentShift(@Req() req) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.getCurrentShift(userId, tenantId);
    return { success: true, data: shift };
  }

  @Post("schedule")
  async scheduleShift(@Req() req, @Res() res: Response) {
    const { tenantId } = req.user;
    const { userId, scheduledStart, scheduledEnd, notes, role } = req.body;

    // Simple validation
    if (!userId || !scheduledStart || !scheduledEnd) {
      return res.status(400).json({ success: false, message: "Faltan datos requeridos" });
    }

    const shift = await this.shiftsService.createScheduledShift(tenantId, {
      userId, // Keep for backward compat if schema has it
      employeeId: userId, // Map the incoming ID (which is employee profile ID) to employeeId
      scheduledStart: new Date(scheduledStart),
      scheduledEnd: new Date(scheduledEnd),
      notes,
      role
    });

    return res.status(201).json({
      success: true,
      message: "Turno programado exitosamente",
      data: shift,
    });
  }

  @Post("publish")
  async publishShifts(@Req() req, @Res() res: Response) {
    const { id: userId, tenantId } = req.user;
    const { shiftIds } = req.body;

    if (!shiftIds || !Array.isArray(shiftIds) || shiftIds.length === 0) {
      return res.status(400).json({ success: false, message: "No se proporcionaron IDs de turnos" });
    }

    await this.shiftsService.publishShifts(tenantId, shiftIds, userId);

    return res.status(200).json({
      success: true,
      message: "Turnos publicados exitosamente"
    });
  }

  @Get("roster")
  async getRoster(@Req() req) {
    const { tenantId } = req.user;
    const { start, end, userId } = req.query;

    if (!start || !end) {
      // Default to current month if not provided
      // But better to require them for calendar view
    }

    const shifts = await this.shiftsService.getRosteredShifts(
      tenantId,
      new Date(start),
      new Date(end),
      userId
    );

    return { success: true, data: shifts };
  }
}
