import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ImprentaFailure, ImprentaFailureDocument } from "../../schemas/imprenta-failure.schema";
import { ImprentaDigitalProvider } from "./imprenta-digital.provider";

@Injectable()
export class ImprentaFailureService {
  constructor(
    @InjectModel(ImprentaFailure.name)
    private failureModel: Model<ImprentaFailureDocument>,
    private readonly imprentaProvider: ImprentaDigitalProvider,
  ) {}

  async list(tenantId: string) {
    return this.failureModel
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
  }

  async retryMany(failureIds: string[], tenantId: string) {
    const failures = await this.failureModel.find({
      _id: { $in: failureIds },
      tenantId,
    });
    if (!failures.length) {
      throw new NotFoundException("No se encontraron fallos para reintentar");
    }
    const results = [];
    for (const failure of failures) {
      try {
        const resp = await this.imprentaProvider.requestControlNumber({
          ...(failure.request as any),
          tenantId,
        });
        results.push({ id: failure._id, ok: true, controlNumber: resp.controlNumber });
        // Audit reintento exitoso
        await this.failureModel.db
          .collection("billingauditlogs")
          .insertOne({
            documentId: failure.documentId,
            tenantId,
            event: "retry_success",
            payload: { controlNumber: resp.controlNumber, failureId: failure._id },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        await failure.deleteOne();
      } catch (err) {
        results.push({ id: failure._id, ok: false, error: err?.message });
        // Audit reintento fallido
        await this.failureModel.db
          .collection("billingauditlogs")
          .insertOne({
            documentId: failure.documentId,
            tenantId,
            event: "retry_failed",
            payload: { error: err?.message, failureId: failure._id },
            createdAt: new Date(),
            updatedAt: new Date(),
          });
      }
    }
    return results;
  }

  async delete(id: string, tenantId: string) {
    const failure = await this.failureModel.findOne({ _id: id, tenantId });
    if (!failure) {
      throw new NotFoundException("Fallo no encontrado");
    }
    await failure.deleteOne();
    return { deleted: true };
  }
}
