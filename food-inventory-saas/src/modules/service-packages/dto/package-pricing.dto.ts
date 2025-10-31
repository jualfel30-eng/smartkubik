import { IsISO8601, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class PackagePricingDto {
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsNumber()
  occupancyRate?: number;

  @IsOptional()
  @IsString()
  customerId?: string;
}
