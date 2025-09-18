import { IsString, IsNotEmpty, IsNumber, IsDateString, IsOptional, IsMongoId } from 'class-validator';

export class CreatePaymentDto {
  @IsMongoId()
  @IsNotEmpty()
  payableId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  referenceNumber?: string;
}