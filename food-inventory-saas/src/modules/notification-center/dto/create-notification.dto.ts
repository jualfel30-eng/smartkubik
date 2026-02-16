import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsBoolean,
  IsMongoId,
} from "class-validator";
import {
  NotificationCategory,
  NotificationPriority,
} from "../../../schemas/notification.schema";

export class CreateNotificationDto {
  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsEnum(["sales", "inventory", "hr", "finance", "marketing", "system"])
  category: NotificationCategory;

  @IsString()
  type: string;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsEnum(["low", "medium", "high", "critical"])
  @IsOptional()
  priority?: NotificationPriority;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsString()
  @IsOptional()
  navigateTo?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  broadcast?: boolean;
}
