import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { BillingController } from "./billing.controller";
import { BillingService } from "./billing.service";
import {
  BillingDocument,
  BillingDocumentSchema,
} from "../../schemas/billing-document.schema";
import {
  DocumentSequence,
  DocumentSequenceSchema,
} from "../../schemas/document-sequence.schema";
import {
  BillingEvidence,
  BillingEvidenceSchema,
} from "../../schemas/billing-evidence.schema";
import {
  BillingAuditLog,
  BillingAuditLogSchema,
} from "../../schemas/billing-audit-log.schema";
import {
  ImprentaCredential,
  ImprentaCredentialSchema,
} from "../../schemas/imprenta-credential.schema";
import {
  TaxSettings,
  TaxSettingsSchema,
} from "../../schemas/tax-settings.schema";
import { NumberingService } from "./numbering.service";
import { ImprentaDigitalProvider } from "./imprenta-digital.provider";
import { SalesBookService } from "./sales-book.service";
import {
  SequenceLock,
  SequenceLockSchema,
} from "../../schemas/sequence-lock.schema";
import {
  ImprentaFailure,
  ImprentaFailureSchema,
} from "../../schemas/imprenta-failure.schema";
import { RedisLockService } from "./redis-lock.service";
import { ImprentaFailureController } from "./imprenta-failure.controller";
import { ImprentaFailureService } from "./imprenta-failure.service";
import { SalesBookPdfService } from "./sales-book-pdf.service";
import { BillingEvidencesController } from "./billing-evidences.controller";
import { BillingEvidencesService } from "./billing-evidences.service";
import { BillingAuditController } from "./billing-audit.controller";
import { SeniatValidationService } from "./services/seniat-validation.service";
import { SeniatExportService } from "./services/seniat-export.service";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BillingDocument.name, schema: BillingDocumentSchema },
      { name: DocumentSequence.name, schema: DocumentSequenceSchema },
      { name: BillingEvidence.name, schema: BillingEvidenceSchema },
      { name: BillingAuditLog.name, schema: BillingAuditLogSchema },
      { name: ImprentaCredential.name, schema: ImprentaCredentialSchema },
      { name: TaxSettings.name, schema: TaxSettingsSchema },
      { name: SequenceLock.name, schema: SequenceLockSchema },
      { name: ImprentaFailure.name, schema: ImprentaFailureSchema },
    ]),
  ],
  controllers: [
    BillingController,
    ImprentaFailureController,
    BillingEvidencesController,
    BillingAuditController,
  ],
  providers: [
    BillingService,
    NumberingService,
    ImprentaDigitalProvider,
    SalesBookService,
    RedisLockService,
    ImprentaFailureService,
    SalesBookPdfService,
    BillingEvidencesService,
    SeniatValidationService,
    SeniatExportService,
  ],
  exports: [BillingService],
})
export class BillingModule {}
