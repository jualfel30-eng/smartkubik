import {
  IsBoolean,
  IsEnum,
  IsMongoId,
  IsOptional,
  IsString,
} from "class-validator";
import { SanitizeString } from "../../../decorators/sanitize.decorator";
import type {
  PaymentRequestDeliveryChannel,
  PaymentRequestEntityType,
} from "../schemas/payment-request.schema";

/**
 * Tenant-side manual creation of a PaymentRequest for an existing entity
 * (Order / Appointment / Invoice). Snapshot, amount and selectedMethod are
 * resolved server-side from the referenced entity + TenantPaymentConfig —
 * the client only specifies the link and the chosen method id.
 */
export class CreatePaymentRequestDto {
  @IsEnum(["order", "appointment", "invoice"])
  entityType: PaymentRequestEntityType;

  @IsMongoId()
  entityId: string;

  /**
   * Method id from TenantPaymentConfig.paymentMethods[].methodId.
   * If omitted, the service picks the first active non-cash method.
   */
  @IsString()
  @SanitizeString()
  @IsOptional()
  methodId?: string;

  /**
   * Pre-validated WhatsApp phone (any reasonable VE format — the service
   * normalizes it). If omitted or invalid, the PaymentRequest is still
   * created with delivery.channel = "pending_manual".
   */
  @IsString()
  @SanitizeString()
  @IsOptional()
  deliveryPhone?: string;

  /**
   * Delivery preference. "whatsapp" attempts a Whapi send; "manual" creates
   * the PR without sending (admin will copy the link). Defaults to whatsapp
   * when deliveryPhone is provided, manual otherwise.
   */
  @IsEnum(["whatsapp", "manual"])
  @IsOptional()
  deliveryChannel?: Exclude<PaymentRequestDeliveryChannel, "pending_manual">;

  /**
   * Override the customer's ability to choose a different method on the
   * portal. Defaults to false when the entity already specifies a method
   * (e.g. storefront checkout), true otherwise.
   */
  @IsBoolean()
  @IsOptional()
  allowMethodOverride?: boolean;
}
