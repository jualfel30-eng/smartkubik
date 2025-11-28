import { Injectable, Logger, NotFoundException, BadRequestException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { createHash } from "crypto";
import {
  BillingDocument,
  BillingDocumentDocument,
} from "../../schemas/billing-document.schema";
import {
  DocumentSequence,
  DocumentSequenceDocument,
} from "../../schemas/document-sequence.schema";
import { BillingEvidence } from "../../schemas/billing-evidence.schema";
import { BillingAuditLog } from "../../schemas/billing-audit-log.schema";
import {
  CreateBillingDocumentDto,
  IssueBillingDocumentDto,
} from "../../dto/billing.dto";
import { NumberingService } from "./numbering.service";
import { ImprentaDigitalProvider } from "./imprenta-digital.provider";

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(BillingDocument.name)
    private billingModel: Model<BillingDocumentDocument>,
    @InjectModel(DocumentSequence.name)
    private sequenceModel: Model<DocumentSequenceDocument>,
    @InjectModel(BillingEvidence.name)
    private evidenceModel: Model<BillingEvidence>,
    @InjectModel(BillingAuditLog.name)
    private auditModel: Model<BillingAuditLog>,
    private readonly numberingService: NumberingService,
    private readonly imprentaProvider: ImprentaDigitalProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getById(id: string, tenantId: string) {
    return this.billingModel.findOne({ _id: id, tenantId }).lean();
  }

  async create(dto: CreateBillingDocumentDto, tenantId: string) {
    const series = await this.sequenceModel.findOne({
      _id: dto.seriesId,
      tenantId,
    });
    if (!series) {
      throw new NotFoundException("Serie no encontrada");
    }
    const documentNumber = await this.numberingService.getNextNumber(
      series,
      tenantId,
    );
    let original: BillingDocumentDocument | null = null;
    if (
      (dto.type === "credit_note" || dto.type === "debit_note") &&
      !dto.originalDocumentId
    ) {
      throw new BadRequestException(
        "Notas requieren documento original referenciado",
      );
    }
    if (dto.originalDocumentId) {
      original = await this.billingModel.findOne({
        _id: dto.originalDocumentId,
        tenantId,
      });
      if (!original) {
        throw new NotFoundException("Documento original no encontrado");
      }
    }
    const billing = new this.billingModel({
      type: dto.type,
      seriesId: series._id,
      documentNumber,
      status: "draft",
      customer: {
        name: dto.customerName || original?.customer?.name,
        taxId: dto.customerTaxId || original?.customer?.taxId,
      },
      references: dto.originalDocumentId
        ? { originalDocumentId: dto.originalDocumentId }
        : undefined,
      tenantId,
    });
    await billing.save();
    await this.auditModel.create({
      documentId: billing._id,
      event: "created",
      tenantId,
    });
    return billing;
  }

  async issue(id: string, dto: IssueBillingDocumentDto, tenantId: string) {
    const doc = await this.billingModel.findOne({ _id: id, tenantId });
    if (!doc) {
      throw new NotFoundException("Documento no encontrado");
    }
    if (doc.status !== "draft" && doc.status !== "validated") {
      return doc;
    }
    await this.auditModel.create({
      documentId: doc._id,
      event: "sent_to_imprenta",
      payload: dto,
      tenantId,
    });

    const control = await this.imprentaProvider.requestControlNumber({
      documentId: doc._id.toString(),
      tenantId,
      seriesId: doc.seriesId.toString(),
      documentNumber: doc.documentNumber,
      type: doc.type,
    });

    doc.controlNumber = control.controlNumber;
    doc.status = "issued";
    doc.issueDate = new Date();
    await doc.save();

    const hashPayload = createHash("sha256")
      .update(
        JSON.stringify({
          id: doc._id.toString(),
          documentNumber: doc.documentNumber,
          controlNumber: control.controlNumber,
          totals: doc.totals,
          customer: doc.customer,
        }),
      )
      .digest("hex");

    const taxesSnapshot =
      (doc.totals?.taxes || []).map((t) => ({
        type: t.type,
        rate: t.rate,
        amount: t.amount,
        base:
          t.rate && t.rate > 0
            ? Number((t.amount / t.rate).toFixed(4))
            : undefined,
        currency: doc.totals?.currency,
      })) || [];

    await this.evidenceModel.create({
      documentId: doc._id,
      hash: control.hash || hashPayload,
      imprenta: {
        controlNumber: control.controlNumber,
        provider: control.provider,
        assignedAt: control.assignedAt,
        metadata: control.metadata,
      },
      totalsSnapshot: {
        ...doc.totals,
        taxes: taxesSnapshot,
      },
      imprentaRequest: {
        documentId: doc._id.toString(),
        seriesId: doc.seriesId.toString(),
        documentNumber: doc.documentNumber,
        type: doc.type,
      },
      imprentaResponse: control,
      verificationUrl: control.verificationUrl,
      tenantId,
    });

    await this.auditModel.create({
      documentId: doc._id,
      event: "issued",
      payload: { controlNumber: control.controlNumber },
      tenantId,
    });

    await this.auditModel.create({
      documentId: doc._id,
      event: "control_assigned",
      payload: {
        request: {
          documentNumber: doc.documentNumber,
          seriesId: doc.seriesId,
          type: doc.type,
        },
        response: control,
      },
      tenantId,
    });

    this.eventEmitter.emit("billing.document.issued", {
      documentId: doc._id.toString(),
      tenantId,
      seriesId: doc.seriesId.toString(),
      controlNumber: doc.controlNumber,
      type: doc.type,
    });

    return doc;
  }
}
