import { PartialType } from "@nestjs/mapped-types";
import { CreatePayrollRuleDto } from "./create-payroll-rule.dto";

export class UpdatePayrollRuleDto extends PartialType(CreatePayrollRuleDto) {}
