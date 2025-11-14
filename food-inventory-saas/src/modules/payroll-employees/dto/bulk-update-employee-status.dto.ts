import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
} from "class-validator";

const ALLOWED_STATUSES = [
  "draft",
  "active",
  "onboarding",
  "suspended",
  "terminated",
] as const;

export class BulkUpdateEmployeeStatusDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  employeeIds: string[];

  @IsEnum(ALLOWED_STATUSES)
  status: (typeof ALLOWED_STATUSES)[number];
}
