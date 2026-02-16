import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsMongoId,
  IsEnum,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { SanitizeString, SanitizeText } from "../decorators/sanitize.decorator";

export type PaymentStatus =
  | "draft"
  | "pending_validation"
  | "confirmed"
  | "failed"
  | "reversed"
  | "refunded";

export type ReconciliationStatus = "pending" | "matched" | "manual" | "rejected";

// Individual payment object as received from the frontend
export class PaymentDetailDto {
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsDateString()
  @IsOptional()
  date?: string; // Date can be optional here, service will default to now()
}

export class PaymentAllocationDto {
  @IsMongoId()
  documentId: string;

  @IsString()
  @SanitizeString()
  documentType: string;

  @IsNumber()
  amount: number;
}

// DTO for creating a single payment, used by the centralized PaymentsService
export class CreatePaymentDto {
  @IsEnum(["sale", "payable"])
  @IsNotEmpty()
  paymentType: "sale" | "payable";

  @IsMongoId()
  @IsOptional() // One of orderId or payableId must be present
  orderId?: string;

  @IsMongoId()
  @IsOptional() // One of orderId or payableId must be present
  payableId?: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsNumber()
  @IsOptional()
  amountVes?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @SanitizeString()
  @IsNotEmpty()
  method: string;

  @IsString()
  @SanitizeString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @SanitizeString()
  @IsOptional()
  reference?: string;

  @IsMongoId()
  @IsOptional()
  bankAccountId?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @IsEnum([
    "draft",
    "pending_validation",
    "confirmed",
    "failed",
    "reversed",
    "refunded",
  ])
  @IsOptional()
  status?: PaymentStatus;

  @IsOptional()
  fees?: {
    igtf?: number;
    other?: number;
  };

  @IsOptional()
  @SanitizeText()
  @IsString()
  reason?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];

  @IsOptional()
  @IsEnum(["pending", "matched", "manual", "rejected"])
  reconciliationStatus?: ReconciliationStatus;

  @IsOptional()
  @IsString()
  @SanitizeString()
  statementRef?: string;

  @IsOptional()
  @IsString()
  @SanitizeText()
  reconciliationNote?: string;

  // === Cash Tender & Change Tracking ===
  @IsOptional()
  @IsNumber()
  amountTendered?: number; // Monto entregado por el cliente (solo para cash)

  @IsOptional()
  @IsNumber()
  changeGiven?: number; // Vuelto dado al cliente (solo para cash)

  @IsOptional()
  changeGivenBreakdown?: {
    usd: number;
    ves: number;
    vesMethod?: string;
  };

  @IsOptional()
  isLegacyPayment?: boolean; // Marca pagos anteriores a esta feature
}
