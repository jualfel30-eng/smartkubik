import type {
  PaymentRequestEntityType,
  PaymentRequestStatus,
} from "../schemas/payment-request.schema";

/**
 * Shape returned by GET /public/payment-portal/:token. Deliberately
 * minimal — no audit trail, no tenant internal flags, no other proofs
 * beyond what's needed to render the re-entry diagnostic.
 */
export interface PublicPaymentInfoDto {
  status: PaymentRequestStatus;
  expiresAt: string;
  amountDue: number;
  currency: "USD" | "VES";
  exchangeRateSnapshot?: number;
  allowPartialPayments: boolean;
  allowMethodOverride: boolean;

  entity: {
    type: PaymentRequestEntityType;
    snapshot: {
      items: Array<{
        name?: string;
        qty: number;
        unitPrice: number;
        total: number;
      }>;
      subtotal: number;
      tax: number;
      total: number;
      customerName?: string;
      createdAt?: string;
    };
  };

  selectedMethod: {
    type: string;
    label: string;
    methodId?: string;
    accountDetails: Record<string, any>;
  };

  /**
   * Other methods the customer can switch to. Only populated when
   * `allowMethodOverride: true`, otherwise undefined (saves bandwidth
   * for the common case). Cash methods are filtered out — there's no
   * "comprobante" to submit for cash, so it wouldn't fit the workflow.
   */
  availableMethods?: Array<{
    type: string;
    label: string;
    methodId?: string;
    accountDetails: Record<string, any>;
  }>;

  /**
   * On re-entry from a rejected state, the portal renders a diagnostic banner
   * using this info. `null` when the request is in a non-rejected state.
   */
  diagnostic: {
    reason: string;
    note?: string;
    rejectedProofId?: string;
    rejectedAt?: string;
  } | null;

  tenant: {
    name?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
    };
  };
}
