import { ArrayNotEmpty, IsArray, IsMongoId, IsOptional } from "class-validator";

export class BulkAssignPayrollStructureDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  employeeIds: string[];

  @IsOptional()
  @IsMongoId()
  payrollStructureId?: string;
}
