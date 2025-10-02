import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsEnum,
} from 'class-validator';

// Individual payment object as received from the frontend
export class PaymentDetailDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsDateString()
  @IsOptional()
  date?: string; // Date can be optional here, service will default to now()
}


// DTO for creating a single payment, used by the centralized PaymentsService
export class CreatePaymentDto {
  @IsEnum(['sale', 'payable'])
  @IsNotEmpty()
  paymentType: 'sale' | 'payable';

  @IsMongoId()
  @IsOptional() // One of orderId or payableId must be present
  orderId?: string;

  @IsMongoId()
  @IsOptional() // One of orderId or payableId must be present
  payableId?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  reference?: string;
}
