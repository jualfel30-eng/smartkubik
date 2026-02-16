import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  Min,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { NotificationCategory } from "../../../schemas/notification.schema";

export class NotificationQueryDto {
  @IsEnum(["sales", "inventory", "hr", "finance", "marketing", "system"])
  @IsOptional()
  category?: NotificationCategory;

  @IsString()
  @IsOptional()
  type?: string;

  @Transform(({ value }) => value === "true")
  @IsBoolean()
  @IsOptional()
  isRead?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number = 50;

  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @IsEnum(["asc", "desc"])
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
