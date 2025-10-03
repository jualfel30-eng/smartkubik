
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString, IsArray, IsEnum } from 'class-validator';
import { SanitizeString } from '../decorators/sanitize.decorator';

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
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;
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
  @IsEnum(['low', 'medium', 'high'])
  priority?: string;

  @IsOptional()
  @IsString()
  relatedEventId?: string;
}
