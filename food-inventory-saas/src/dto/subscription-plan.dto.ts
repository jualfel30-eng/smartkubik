import { Type } from "class-transformer";
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
} from "class-validator";

class SubscriptionPlanLimitsDto {
  @IsNumber()
  maxUsers: number;

  @IsNumber()
  maxProducts: number;

  @IsNumber()
  maxOrders: number;

  @IsNumber()
  maxStorage: number;
}

export class CreateSubscriptionPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  price: number;

  @ValidateNested()
  @Type(() => SubscriptionPlanLimitsDto)
  limits: SubscriptionPlanLimitsDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}

export class UpdateSubscriptionPlanDto extends CreateSubscriptionPlanDto {
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}
