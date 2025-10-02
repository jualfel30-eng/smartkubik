import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsEnum, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// This DTO can be re-used from payables or defined here if it needs to be different
class RecurringPayableLineDto {
    @IsString()
    description: string;

    @IsNumber()
    amount: number;

    @IsString()
    accountId: string;
}

export class CreateRecurringPayableDto {
    @ApiProperty()
    @IsString()
    templateName: string;

    @ApiProperty()
    @IsEnum(['monthly', 'quarterly', 'yearly'])
    frequency: string;

    @ApiProperty()
    @IsDateString()
    startDate: Date;

    @ApiProperty()
    @IsEnum(['service_payment', 'utility_bill', 'other'])
    type: string;

    @ApiProperty()
    @IsString()
    payeeName: string;

    @ApiProperty()
    @IsEnum(['supplier', 'employee', 'custom'])
    payeeType: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ type: [RecurringPayableLineDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RecurringPayableLineDto)
    lines: RecurringPayableLineDto[];

    @ApiProperty()
    @IsOptional()
    @IsString()
    supplierId?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    newSupplierName?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    newSupplierRif?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    newSupplierContactName?: string;

    @ApiProperty()
    @IsOptional()
    @IsString()
    newSupplierContactPhone?: string;
}

export class UpdateRecurringPayableDto {
    @ApiProperty()
    @IsOptional()
    @IsString()
    templateName?: string;

    @ApiProperty()
    @IsOptional()
    @IsEnum(['monthly', 'quarterly', 'yearly'])
    frequency?: string;

    @ApiProperty()
    @IsOptional()
    @IsDateString()
    startDate?: Date;

    // Add other fields that can be updated
}
