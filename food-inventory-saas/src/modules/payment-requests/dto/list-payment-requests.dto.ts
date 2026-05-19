import { IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";
import { Transform } from "class-transformer";
import {
  PAYMENT_REQUEST_STATUSES,
  PaymentRequestEntityType,
  PaymentRequestStatus,
} from "../schemas/payment-request.schema";

export class ListPaymentRequestsDto {
  @IsEnum(PAYMENT_REQUEST_STATUSES)
  @IsOptional()
  status?: PaymentRequestStatus;

  @IsEnum(["order", "appointment", "invoice"])
  @IsOptional()
  entityType?: PaymentRequestEntityType;

  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Transform(({ value }) => (value === undefined ? value : Number(value)))
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number;
}
