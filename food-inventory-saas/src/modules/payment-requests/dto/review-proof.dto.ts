import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { SanitizeText } from "../../../decorators/sanitize.decorator";
import type { PaymentRequestRejectReason } from "../schemas/payment-request.schema";

/**
 * Per-proof accept. The note is optional and surfaces in the audit trail.
 */
export class AcceptProofDto {
  @IsString()
  @SanitizeText()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}

/**
 * Per-proof reject with mandatory typology. Drives both the customer
 * portal re-entry experience and the WhatsApp message tone.
 */
export class RejectProofDto {
  @IsEnum([
    "info_mismatch",
    "proof_unclear",
    "partial",
    "awaiting_settlement",
    "rejected_final",
  ])
  reason: PaymentRequestRejectReason;

  @IsString()
  @SanitizeText()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
