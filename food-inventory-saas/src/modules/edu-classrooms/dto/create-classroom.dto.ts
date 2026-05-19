import { IsString, IsNotEmpty, IsOptional, IsNumber, IsMongoId } from "class-validator";

export class CreateClassroomDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  grade: string;

  @IsString()
  @IsNotEmpty()
  section: string;

  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;

  @IsOptional()
  @IsMongoId()
  tutorId?: string;
}
