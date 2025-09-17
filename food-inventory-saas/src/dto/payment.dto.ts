import { IsString, IsNotEmpty, IsNumber, Min, IsDateString, IsOptional } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @Min(0)
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

  // We might need more fields later, but this is a good start.
}
