import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  EmployeeContract,
  EmployeeContractDocument,
} from "../../schemas/employee-contract.schema";

interface StructureActivatedEvent {
  tenantId: string;
  structureId: string;
  supersedesId?: string;
  version?: number;
}

@Injectable()
export class PayrollStructuresListener {
  private readonly logger = new Logger(PayrollStructuresListener.name);

  constructor(
    @InjectModel(EmployeeContract.name)
    private readonly contractModel: Model<EmployeeContractDocument>,
  ) {}

  @OnEvent("payroll.structure.activated")
  async handleStructureActivated(event: StructureActivatedEvent) {
    if (!event.supersedesId) {
      return;
    }
    if (!Types.ObjectId.isValid(event.structureId)) {
      this.logger.warn(
        `Evento de estructura activada ignorado: structureId inválido (${event.structureId})`,
      );
      return;
    }
    if (!Types.ObjectId.isValid(event.supersedesId)) {
      this.logger.warn(
        `Evento de estructura activada ignorado: supersedesId inválido (${event.supersedesId})`,
      );
      return;
    }
    const tenantId = Types.ObjectId.isValid(event.tenantId)
      ? new Types.ObjectId(event.tenantId)
      : null;
    if (!tenantId) {
      this.logger.warn(
        `Evento de estructura activada ignorado: tenantId inválido (${event.tenantId})`,
      );
      return;
    }
    const result = await this.contractModel.updateMany(
      {
        tenantId,
        payrollStructureId: new Types.ObjectId(event.supersedesId),
        status: { $in: ["active", "draft"] },
      },
      {
        $set: {
          payrollStructureId: new Types.ObjectId(event.structureId),
        },
        $push: {
          history: {
            action: "structure_auto_update",
            notes: `Migrado a la versión ${event.version || "n/a"}`,
            at: new Date(),
          },
        },
      },
    );
    if (result.modifiedCount > 0) {
      this.logger.log(
        `Actualizados ${result.modifiedCount} contratos al activar estructura ${event.structureId}`,
      );
    }
  }
}
