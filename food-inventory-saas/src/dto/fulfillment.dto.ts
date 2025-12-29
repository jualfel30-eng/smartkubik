import { IsString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFulfillmentDto {
    @ApiProperty({
        description: "Nuevo estado de fulfillment",
        enum: ["pending", "picking", "packed", "in_transit", "delivered", "cancelled"],
    })
    @IsString()
    @IsEnum(["pending", "picking", "packed", "in_transit", "delivered", "cancelled"])
    status: string;

    @ApiPropertyOptional({ description: "Número de tracking" })
    @IsOptional()
    @IsString()
    trackingNumber?: string;

    @ApiPropertyOptional({ description: "Notas de entrega" })
    @IsOptional()
    @IsString()
    deliveryNotes?: string;
}
