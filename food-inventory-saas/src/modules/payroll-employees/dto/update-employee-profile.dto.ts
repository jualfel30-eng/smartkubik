import { PartialType } from "@nestjs/swagger";
import { CreateEmployeeProfileDto } from "./create-employee-profile.dto";

export class UpdateEmployeeProfileDto extends PartialType(
  CreateEmployeeProfileDto,
) {}
