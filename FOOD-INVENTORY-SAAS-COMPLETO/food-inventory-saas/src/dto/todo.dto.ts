
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { SanitizeString } from '../decorators/sanitize.decorator';

export class CreateTodoDto {
  @IsString()
  @IsNotEmpty()
  @SanitizeString()
  title: string;
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
}
