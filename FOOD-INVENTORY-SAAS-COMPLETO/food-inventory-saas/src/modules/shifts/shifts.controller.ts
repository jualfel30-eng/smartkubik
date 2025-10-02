import { Controller, Post, Get, UseGuards, Req, Res } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { Response } from 'express';

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shiftsService: ShiftsService) {}

  @Post('clock-in')
  async clockIn(@Req() req, @Res() res: Response) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.clockIn(userId, tenantId);
    return res.status(201).json({ success: true, message: 'Turno iniciado exitosamente', data: shift });
  }

  @Post('clock-out')
  async clockOut(@Req() req, @Res() res: Response) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.clockOut(userId, tenantId);
    return res.status(200).json({ success: true, message: 'Turno finalizado exitosamente', data: shift });
  }

  @Get('current')
  async getCurrentShift(@Req() req) {
    const { id: userId, tenantId } = req.user;
    const shift = await this.shiftsService.getCurrentShift(userId, tenantId);
    return { success: true, data: shift };
  }
}
