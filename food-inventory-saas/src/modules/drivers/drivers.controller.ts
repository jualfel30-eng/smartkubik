import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    UseGuards,
    Request,
    HttpException,
    HttpStatus,
    Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { TenantGuard } from '../../guards/tenant.guard';
import { DriversService } from './drivers.service';

@ApiTags('drivers')
@Controller('drivers')
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth()
export class DriversController {
    constructor(private readonly driversService: DriversService) { }

    @Get('pool')
    @ApiOperation({ summary: 'Obtener pool de órdenes disponibles para entrega' })
    async getDeliveryPool(@Request() req, @Query('limit') limit?: number) {
        try {
            // Logic: Orders with status 'packed' AND fulfillmentType 'delivery'|'delivery_local'
            // And NO driver assigned yet
            return await this.driversService.getPool(req.user, limit);
        } catch (error) {
            throw new HttpException(
                error.message || 'Error al obtener pool de entregas',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('orders/:id/claim')
    @ApiOperation({ summary: 'Reclamar (asignarse) una orden del pool' })
    async claimOrder(@Param('id') orderId: string, @Request() req) {
        console.log(`[DriversController] Claiming order ${orderId} by user ${req.user._id} (Tenant: ${req.user.tenantId})`);
        return await this.driversService.claimOrder(orderId, req.user);
    }

    @Get('orders/active')
    @ApiOperation({ summary: 'Obtener mis entregas activas (en curso)' })
    async getMyActiveDeliveries(@Request() req) {
        try {
            return await this.driversService.getActiveDeliveries(req.user);
        } catch (error) {
            throw new HttpException(
                error.message || 'Error al obtener entregas activas',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Get('orders/history')
    @ApiOperation({ summary: 'Obtener historial de mis entregas' })
    async getMyDeliveryHistory(@Request() req, @Query('limit') limit?: number) {
        try {
            return await this.driversService.getDeliveryHistory(req.user, limit);
        } catch (error) {
            throw new HttpException(
                error.message || 'Error al obtener historial',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    @Post('orders/:id/complete')
    @ApiOperation({ summary: 'Marcar orden como entregada (con prueba opcional)' })
    async completeDelivery(
        @Param('id') id: string,
        @Body() body: { notes?: string; proofPhoto?: string },
        @Request() req,
    ) {
        try {
            return await this.driversService.completeDelivery(
                id,
                req.user,
                body.notes,
                body.proofPhoto,
            );
        } catch (error) {
            throw new HttpException(
                error.message || 'Error al completar la entrega',
                HttpStatus.BAD_REQUEST,
            );
        }
    }

    @Patch('orders/:id/location')
    @ApiOperation({ summary: 'Actualizar ubicación del driver para una orden (tracking)' })
    async updateLocation(
        @Param('id') id: string,
        @Body() body: { lat: number; lng: number },
        @Request() req
    ) {
        // Placeholder for real-time tracking update
        return { success: true, message: "Location updated" };
    }
}
