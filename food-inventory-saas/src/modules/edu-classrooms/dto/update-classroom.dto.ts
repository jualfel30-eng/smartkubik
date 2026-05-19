import { IsString, IsOptional, IsNumber, IsMongoId } from "class-validator";

export class UpdateClassroomDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  grade?: string;

  @IsOptional()
  @IsString()
  section?: string;

  @IsOptional()
  @IsString()
  academicYear?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsMongoId()
  tutorId?: string;
}
