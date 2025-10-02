import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsDateString,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

// Los tipos de cuenta deben coincidir con los del frontend
const ACCOUNT_TYPES = ["Ingreso", "Gasto", "Activo", "Pasivo", "Patrimonio"];

export class CreateChartOfAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ACCOUNT_TYPES)
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  description?: string;
}

// DTO for each line in the journal entry
export class CreateJournalLineDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @Min(0)
  debit: number;

  @IsNumber()
  @Min(0)
  credit: number;

  @IsString()
  @IsOptional()
  description?: string;
}

// DTO for creating a new journal entry
export class CreateJournalEntryDto {
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(2)
  @Type(() => CreateJournalLineDto)
  lines: CreateJournalLineDto[];
}
