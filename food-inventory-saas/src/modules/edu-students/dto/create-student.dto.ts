import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsMongoId,
  ValidateNested,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GuardianDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsDateString()
  enrollmentDate: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  academicYear: string;

  @ApiProperty({ type: GuardianDto })
  @IsObject()
  @ValidateNested()
  @Type(() => GuardianDto)
  guardian: GuardianDto;

  @ApiPropertyOptional({ enum: ["enrolled", "active", "graduated", "withdrawn", "suspended"] })
  @IsOptional()
  @IsEnum(["enrolled", "active", "graduated", "withdrawn", "suspended"])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  classroomId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  guardianCustomerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional({ enum: ["full", "partial"] })
  @IsOptional()
  @IsEnum(["full", "partial"])
  scholarshipType?: string;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  scholarshipPct?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;
}
