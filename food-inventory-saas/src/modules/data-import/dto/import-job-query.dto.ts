import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  IMPORT_ENTITY_TYPES,
  IMPORT_JOB_STATUSES,
  ImportEntityType,
  ImportJobStatus,
} from "../schemas/import-job.schema";

export class ImportJobQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(IMPORT_ENTITY_TYPES, {
    message: `El tipo de entidad debe ser uno de: ${IMPORT_ENTITY_TYPES.join(", ")}`,
  })
  entityType?: ImportEntityType;

  @IsOptional()
  @IsEnum(IMPORT_JOB_STATUSES, {
    message: `El estado debe ser uno de: ${IMPORT_JOB_STATUSES.join(", ")}`,
  })
  status?: ImportJobStatus;

  @IsOptional()
  @IsDateString({}, { message: "dateFrom debe ser una fecha válida (ISO 8601)" })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: "dateTo debe ser una fecha válida (ISO 8601)" })
  dateTo?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = "createdAt";

  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc" = "desc";
}
