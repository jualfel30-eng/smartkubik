import {
    IsMongoId,
    IsString,
    IsNumber,
    Min,
    IsNotEmpty,
    IsBoolean,
    IsOptional,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AddSupplierToProductDto {
    @ApiProperty({ description: "ID del proveedor" })
    @IsMongoId()
    supplierId: string;

    @ApiProperty({ description: "SKU del proveedor" })
    @IsString()
    @IsNotEmpty()
    supplierSku: string;

    @ApiProperty({ description: "Precio de costo" })
    @IsNumber()
    @Min(0)
    costPrice: number;

    @ApiProperty({ description: "Tiempo de entrega en días", default: 1 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    leadTimeDays?: number;

    @ApiProperty({ description: "Cantidad mínima de pedido", default: 1 })
    @IsNumber()
    @Min(1)
    @IsOptional()
    minimumOrderQuantity?: number;

    @ApiPropertyOptional({
        description: "Es proveedor preferido",
        default: false,
    })
    @IsOptional()
    @IsBoolean()
    isPreferred?: boolean;
}
