import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingEvidence } from "../../schemas/billing-evidence.schema";

@Injectable()
export class BillingEvidencesService {
  constructor(
    @InjectModel(BillingEvidence.name)
    private evidenceModel: Model<BillingEvidence>,
  ) {}

  async list(tenantId: string, documentId?: string) {
    const query: any = { tenantId };
    if (documentId) {
      query.documentId = documentId;
    }
    return this.evidenceModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
  }
}
