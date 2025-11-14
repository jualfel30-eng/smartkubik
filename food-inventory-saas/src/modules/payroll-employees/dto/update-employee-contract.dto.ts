import { PartialType } from "@nestjs/swagger";
import { CreateEmployeeContractDto } from "./create-employee-contract.dto";

export class UpdateEmployeeContractDto extends PartialType(
  CreateEmployeeContractDto,
) {}
