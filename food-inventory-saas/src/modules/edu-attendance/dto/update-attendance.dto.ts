import {
  IsOptional,
  IsMongoId,
  IsDateString,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { AttendanceEntryDto } from "./create-attendance.dto";

export class UpdateAttendanceDto {
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  @IsOptional()
  @IsMongoId()
  teacherId?: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttendanceEntryDto)
  entries?: AttendanceEntryDto[];
}
