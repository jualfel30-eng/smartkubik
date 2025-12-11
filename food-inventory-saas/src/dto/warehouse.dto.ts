import { IsBoolean, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateWarehouseDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(20)
  code: string;

  @IsOptional()
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    lat?: number;
    lng?: number;
  };

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class UpdateWarehouseDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  location?: CreateWarehouseDto["location"];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
