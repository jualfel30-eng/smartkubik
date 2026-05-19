import {
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsDateString,
  IsArray,
  ValidateNested,
  IsString,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class AttendanceEntryDto {
  @IsMongoId()
  @IsNotEmpty()
  studentId: string;

  @IsString()
  @IsIn(["present", "absent", "late", "excused"])
  status: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAttendanceDto {
  @IsMongoId()
  @IsNotEmpty()
  classroomId: string;

  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @IsMongoId()
  @IsNotEmpty()
  teacherId: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries: AttendanceEntryDto[];
}
