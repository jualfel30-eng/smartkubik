import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsHexColor,
  IsMongoId,
} from "class-validator";
import { Types } from "mongoose";

export class CreateCalendarDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  allowedUsers?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsEnum(["sales", "production", "hr", "finance", "general", "custom"])
  category?: string;

  @IsOptional()
  @IsBoolean()
  syncWithGoogle?: boolean;
}

export class UpdateCalendarDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedRoles?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  allowedUsers?: string[];

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(["sales", "production", "hr", "finance", "general", "custom"])
  category?: string;

  @IsOptional()
  @IsBoolean()
  syncWithGoogle?: boolean;
}

export class CalendarResponseDto {
  id: string;
  name: string;
  description?: string;
  color: string;
  allowedRoles: string[];
  allowedUsers: Types.ObjectId[];
  isDefault: boolean;
  isActive: boolean;
  category: string;
  googleSync?: {
    enabled: boolean;
    calendarId?: string;
    lastSyncAt?: Date;
    syncStatus?: string;
  };
  visibility: {
    public: boolean;
    shareWithTenant: boolean;
  };
  eventCount?: number;
  canEdit?: boolean;
  canDelete?: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export class SyncCalendarToGoogleDto {
  @IsMongoId()
  calendarId: string;

  @IsOptional()
  @IsBoolean()
  forceSync?: boolean;
}
