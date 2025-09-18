import { IsString, IsNotEmpty, IsNumber, Min, IsDateString, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

// Represents a single payment in a potentially mixed-payment transaction
export class PaymentLineDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsOptional()
  reference?: string;
}

// The DTO to create payments for an order. It can be one or multiple payments.
export class CreatePaymentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => PaymentLineDto)
  payments: PaymentLineDto[];
}