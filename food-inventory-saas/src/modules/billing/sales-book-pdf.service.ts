import { Injectable } from "@nestjs/common";
import { BillingDocument } from "../../schemas/billing-document.schema";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { DocumentSequence } from "../../schemas/document-sequence.schema";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

@Injectable()
export class SalesBookPdfService {
  constructor(
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocument>,
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequence>,
  ) {}

  async generate({
    tenantId,
    channel,
    from,
    to,
  }: {
    tenantId: string;
    channel?: "digital" | "machine_fiscal";
    from?: string;
    to?: string;
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

    const rows = docs.map((d) => [
      d.documentNumber,
      d.controlNumber || "",
      d.issueDate ? new Date(d.issueDate).toLocaleDateString() : "",
      d.customer?.name || "",
      d.customer?.taxId || "",
      d.type,
      d.status,
      d.totals?.grandTotal || 0,
    ]);

    const doc = new jsPDF();
    doc.setFontSize(12);
    doc.text("Libro de Ventas", 14, 15);
    doc.setFontSize(9);
    doc.text(`Canal: ${channelFilter}`, 14, 22);
    if (from || to) {
      doc.text(
        `Rango: ${from || "-"} a ${to || "-"}`,
        14,
        27,
      );
    }

    autoTable(doc, {
      startY: 32,
      head: [
        [
          "Documento",
          "Control",
          "Fecha",
          "Cliente",
          "RIF",
          "Tipo",
          "Estado",
          "Total",
        ],
      ],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255] },
    });

    return doc.output("arraybuffer");
  }
}
