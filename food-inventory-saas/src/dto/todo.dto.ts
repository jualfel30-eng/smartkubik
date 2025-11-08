import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsArray,
  IsEnum,
} from "class-validator";
import { SanitizeString } from "../decorators/sanitize.decorator";
import { Transform } from "class-transformer";

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  title: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(["low", "medium", "high"])
  priority?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  appointmentId?: string;
}

export class UpdateTodoDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(["low", "medium", "high"])
  priority?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  @SanitizeString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  relatedEventId?: string;
}

export class TodoFilterDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      const flattened = value
        .flatMap((item) =>
          typeof item === "string" ? item.split(",") : [item],
        )
        .map((tag) => String(tag).trim())
        .filter(Boolean);
      return flattened.length ? Array.from(new Set(flattened)) : undefined;
    }
    if (typeof value === "string") {
      const tags = value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);
      return tags.length ? Array.from(new Set(tags)) : undefined;
    }
    return undefined;
  })
  tags?: string[];

  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "string") {
      const lowered = value.toLowerCase();
      if (lowered === "true" || lowered === "1") {
        return true;
      }
      if (lowered === "false" || lowered === "0") {
        return false;
      }
    }
    return undefined;
  })
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  appointmentId?: string;
}
