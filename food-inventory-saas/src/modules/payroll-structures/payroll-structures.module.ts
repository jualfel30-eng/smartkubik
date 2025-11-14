import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  PayrollStructure,
  PayrollStructureSchema,
} from "../../schemas/payroll-structure.schema";
import { PayrollStructuresService } from "./payroll-structures.service";
import { PayrollStructuresController } from "./payroll-structures.controller";
import {
  PayrollRule,
  PayrollRuleSchema,
} from "../../schemas/payroll-rule.schema";
import {
  PayrollConcept,
  PayrollConceptSchema,
} from "../../schemas/payroll-concept.schema";
import {
  PayrollAuditLog,
  PayrollAuditLogSchema,
} from "../../schemas/payroll-audit-log.schema";
import { PayrollEngineService } from "./payroll.engine.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PayrollStructure.name, schema: PayrollStructureSchema },
      { name: PayrollRule.name, schema: PayrollRuleSchema },
      { name: PayrollConcept.name, schema: PayrollConceptSchema },
      { name: PayrollAuditLog.name, schema: PayrollAuditLogSchema },
    ]),
  ],
  providers: [PayrollStructuresService, PayrollEngineService],
  controllers: [PayrollStructuresController],
  exports: [PayrollStructuresService],
})
export class PayrollStructuresModule {}
