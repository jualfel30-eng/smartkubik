import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { BillingDocument } from "../../schemas/billing-document.schema";
import { DocumentSequence } from "../../schemas/document-sequence.schema";
import { Parser } from "json2csv";

@Injectable()
export class SalesBookService {
  constructor(
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocument>,
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequence>,
  ) {}

  /**
   * Genera estructura básica de libro de ventas por canal (borrador).
   * Incluye filtro por fecha y canal (digital vs machine_fiscal según serie).
   */
  async generate({
    tenantId,
    channel,
    from,
    to,
    format,
  }: {
    tenantId: string;
    channel?: "digital" | "machine_fiscal";
    from?: string;
    to?: string;
    format?: "json" | "csv";
  }) {
    const channelFilter = channel || "digital";
    const sequences = await this.sequenceModel
      .find({ tenantId, channel: channelFilter })
      .select("_id name channel")
      .lean();
    const sequenceIds = sequences.map((s) => s._id);

    const query: any = { tenantId, seriesId: { $in: sequenceIds } };
    if (from || to) {
      query.issueDate = {};
      if (from) query.issueDate.$gte = new Date(from);
      if (to) query.issueDate.$lte = new Date(to);
    }

    const docs = await this.billingModel
      .find(query)
      .select(
        "documentNumber controlNumber issueDate customer totals.grandTotal type status seriesId",
      )
      .lean();

    const data = docs.map((d) => ({
      documentNumber: d.documentNumber,
      controlNumber: d.controlNumber,
      issueDate: d.issueDate,
      customer: d.customer?.name,
      taxId: d.customer?.taxId,
      type: d.type,
      status: d.status,
      total: d.totals?.grandTotal,
      seriesId: d.seriesId,
    }));

    const totals = data.reduce(
      (acc, curr) => {
        acc.total = (acc.total || 0) + (curr.total || 0);
        acc.count = (acc.count || 0) + 1;
        if (curr.type) {
          acc.byType[curr.type] = (acc.byType[curr.type] || 0) + (curr.total || 0);
        }
        return acc;
      },
      { total: 0, count: 0, byType: {} as Record<string, number> },
    );

    if (format === "csv") {
      const parser = new Parser({
        fields: [
          "documentNumber",
          "controlNumber",
          "issueDate",
          "customer",
          "taxId",
          "type",
          "status",
          "total",
          "seriesId",
        ],
      });
      return {
        tenantId,
        channel: channelFilter,
        from,
        to,
        totalCount: data.length,
        totals,
        csv: parser.parse(data),
      };
    }

    if (format === "pdf") {
      return {
        tenantId,
        channel: channelFilter,
        from,
        to,
        totalCount: data.length,
        totals,
        pdf: "PDF export pendiente de implementación; use CSV por ahora",
      };
    }

    return {
      tenantId,
      channel: channelFilter,
      from,
      to,
      totalCount: data.length,
      data,
      totals,
    };
  }
}
