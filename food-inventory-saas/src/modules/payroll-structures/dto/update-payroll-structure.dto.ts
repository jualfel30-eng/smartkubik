import { PartialType } from "@nestjs/mapped-types";
import { CreatePayrollStructureDto } from "./create-payroll-structure.dto";

export class UpdatePayrollStructureDto extends PartialType(
  CreatePayrollStructureDto,
) {}
