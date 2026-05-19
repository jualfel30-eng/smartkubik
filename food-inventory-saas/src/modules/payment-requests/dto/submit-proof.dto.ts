import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { SanitizeString } from "../../../decorators/sanitize.decorator";
import type { PaymentProofMethod } from "../schemas/payment-request.schema";

/**
 * Body of POST /public/payment-portal/:token/proofs.
 *
 * The image itself rides as a multipart `image` field handled by
 * FileInterceptor — not part of this DTO. The numeric fields arrive as
 * strings (multipart form-data), so we coerce via Transform.
 */
export class SubmitProofDto {
  @Transform(({ value }) =>
    value === undefined || value === null || value === ""
      ? value
      : Number(value),
  )
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(["USD", "VES"])
  currency: "USD" | "VES";

  @IsEnum(["transfer", "pago_movil", "zelle", "cash", "card"])
  method: PaymentProofMethod;

  @IsString()
  @SanitizeString()
  @MaxLength(80)
  originBank: string;

  @IsString()
  @SanitizeString()
  @MaxLength(40)
  payerIdNumber: string;

  @IsString()
  @SanitizeString()
  @MaxLength(40)
  payerPhone: string;

  @IsString()
  @SanitizeString()
  @MinLength(6)
  @MaxLength(40)
  referenceNumber: string;

  /**
   * Re-submission detection: when the customer returns from a rejected
   * state, the client echoes the proof._id being corrected. The service
   * appends a new proof entry rather than mutating the rejected one, and
   * uses this hint for the audit trail.
   */
  @IsString()
  @IsOptional()
  replacesProofId?: string;
}
