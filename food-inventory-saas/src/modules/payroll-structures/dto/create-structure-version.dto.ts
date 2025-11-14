import { PartialType } from "@nestjs/swagger";
import { CreatePayrollStructureDto } from "./create-payroll-structure.dto";
import { IsOptional, IsDateString } from "class-validator";

export class CreateStructureVersionDto extends PartialType(
  CreatePayrollStructureDto,
) {
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}
