/**
 * Client for the public Payment Portal API exposed by food-inventory-saas.
 *
 * Endpoints (auth-less, gated by signed JWT token):
 *   GET  /api/v1/public/payment-portal/:token
 *   POST /api/v1/public/payment-portal/:token/proofs   (multipart)
 *
 * Uses `getApiBaseUrl()` (hostname-aware) so the same code routes to
 * localhost when running locally and to the production API otherwise —
 * without ever having to toggle `NEXT_PUBLIC_API_URL` between
 * environments. See `lib/api.ts` for the helper.
 */

import { getApiBaseUrl } from './api';

export type PaymentRequestStatus =
  | 'pending'
  | 'submitted'
  | 'confirmed'
  | 'info_mismatch'
  | 'proof_unclear'
  | 'partial'
  | 'awaiting_settlement'
  | 'rejected_final'
  | 'expired';

export type PaymentRequestEntityType = 'order' | 'appointment' | 'invoice';

export type PaymentProofMethod =
  | 'transfer'
  | 'pago_movil'
  | 'zelle'
  | 'cash'
  | 'card';

export interface PaymentPortalItemSnapshot {
  name?: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface PaymentPortalEntitySnapshot {
  items: PaymentPortalItemSnapshot[];
  subtotal: number;
  tax: number;
  total: number;
  customerName?: string;
  createdAt?: string;
}

export interface PaymentPortalSelectedMethod {
  type: PaymentProofMethod;
  label: string;
  methodId?: string;
  accountDetails: Record<string, string | number | undefined>;
}

/** Other methods the customer can switch to from the portal. Only
 *  populated when `allowMethodOverride: true`. Server filters this to
 *  portal-compatible methods (transfer / pago_movil / zelle). */
export type PaymentPortalAvailableMethod = PaymentPortalSelectedMethod;

/**
 * True when the chosen payment method settles in bolívares. Used both by
 * the data card ("Monto: X Bs" vs "Monto: $X") and by the proof submission
 * form (which currency to send to the backend).
 *
 *   - Any methodId ending in `_ves` → VES (transferencia_ves, pago_movil_ves)
 *   - Pago Móvil always settles in VES regardless of methodId
 *   - Everything else (transferencia_usd, zelle_usd) → USD
 */
export function settlesInVes(method: {
  type: PaymentProofMethod;
  methodId?: string;
}): boolean {
  if (method.methodId?.toLowerCase().endsWith('_ves')) return true;
  if (method.type === 'pago_movil') return true;
  return false;
}

export interface PaymentPortalDiagnostic {
  reason: string;
  note?: string;
  rejectedProofId?: string;
  rejectedAt?: string;
}

export interface PaymentPortalInfo {
  status: PaymentRequestStatus;
  expiresAt: string;
  amountDue: number;
  currency: 'USD' | 'VES';
  exchangeRateSnapshot?: number;
  allowPartialPayments: boolean;
  allowMethodOverride: boolean;
  entity: {
    type: PaymentRequestEntityType;
    snapshot: PaymentPortalEntitySnapshot;
  };
  selectedMethod: PaymentPortalSelectedMethod;
  availableMethods?: PaymentPortalAvailableMethod[];
  diagnostic: PaymentPortalDiagnostic | null;
  tenant: {
    name?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
    };
  };
}

export interface SubmitProofFields {
  amount: number;
  currency: 'USD' | 'VES';
  method: PaymentProofMethod;
  originBank: string;
  payerIdNumber: string;
  payerPhone: string;
  referenceNumber: string;
  replacesProofId?: string;
}

export interface SubmitProofResult {
  status: PaymentRequestStatus;
  proofId?: string;
}

/**
 * Distinguish "user error" (4xx, show in UI) from "transient" (5xx/network,
 * eligible for idempotent retry). The portal uses this to decide whether
 * to surface the error inline or expose a retry button.
 */
export class PaymentPortalError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly transient: boolean,
  ) {
    super(message);
    this.name = 'PaymentPortalError';
  }
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return (
      body?.message ||
      body?.error ||
      body?.errors?.[0]?.message ||
      `Error ${res.status}`
    );
  } catch {
    return `Error ${res.status}`;
  }
}

/**
 * Fetches the portal info for a given JWT token. Cached as `no-store` —
 * the status can change between visits (admin accepted/rejected a proof).
 */
export async function getPaymentPortalInfo(
  token: string,
): Promise<PaymentPortalInfo> {
  const apiBase = await getApiBaseUrl();
  const res = await fetch(
    `${apiBase}/api/v1/public/payment-portal/${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  );

  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new PaymentPortalError(
      message,
      res.status,
      res.status >= 500,
    );
  }

  const body = await res.json();
  return body.data as PaymentPortalInfo;
}

/**
 * Multipart upload of a proof. The browser sets the Content-Type with the
 * correct boundary automatically — DO NOT override it.
 *
 * `onProgress` reports a 0..1 fraction. We use XHR (not fetch) because the
 * Fetch API has no upload-progress events in browsers as of 2026.
 */
export async function submitPaymentProof(
  token: string,
  fields: SubmitProofFields,
  imageFile: File,
  onProgress?: (fraction: number) => void,
  signal?: AbortSignal,
): Promise<SubmitProofResult> {
  const apiBase = await getApiBaseUrl();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.set('image', imageFile, imageFile.name);
    formData.set('amount', String(fields.amount));
    formData.set('currency', fields.currency);
    formData.set('method', fields.method);
    formData.set('originBank', fields.originBank);
    formData.set('payerIdNumber', fields.payerIdNumber);
    formData.set('payerPhone', fields.payerPhone);
    formData.set('referenceNumber', fields.referenceNumber);
    if (fields.replacesProofId) {
      formData.set('replacesProofId', fields.replacesProofId);
    }

    xhr.open(
      'POST',
      `${apiBase}/api/v1/public/payment-portal/${encodeURIComponent(token)}/proofs`,
    );

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0) {
          onProgress(Math.min(1, e.loaded / e.total));
        }
      };
    }

    xhr.onload = () => {
      let body: { success?: boolean; data?: SubmitProofResult; message?: string } | null = null;
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        // ignore — handled below
      }

      if (xhr.status >= 200 && xhr.status < 300 && body?.data) {
        resolve(body.data);
        return;
      }

      const message =
        body?.message ||
        (xhr.status === 429
          ? 'Estás enviando comprobantes muy seguido. Espera unos minutos.'
          : xhr.status === 401
            ? 'Tu enlace expiró. Pide uno nuevo al negocio.'
            : xhr.status === 403
              ? 'Esta solicitud ya no acepta nuevos comprobantes.'
              : `Error ${xhr.status}`);

      reject(
        new PaymentPortalError(message, xhr.status, xhr.status >= 500 || xhr.status === 0),
      );
    };

    xhr.onerror = () => {
      reject(new PaymentPortalError('Sin conexión', 0, true));
    };
    xhr.ontimeout = () => {
      reject(new PaymentPortalError('Tiempo de espera agotado', 0, true));
    };

    if (signal) {
      const onAbort = () => {
        xhr.abort();
        reject(new PaymentPortalError('Envío cancelado', 0, false));
      };
      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener('abort', onAbort, { once: true });
    }

    xhr.send(formData);
  });
}

/**
 * Customer switches to a different payment method offered by the tenant.
 * Backend returns the freshly-rebuilt PaymentPortalInfo so we can update
 * the displayed `selectedMethod` + `accountDetails` without a second GET.
 *
 * Gated server-side by `allowMethodOverride` and rate-limited (10/h per
 * token + IP).
 */
export async function submitMethodOverride(
  token: string,
  methodId: string,
): Promise<PaymentPortalInfo> {
  const apiBase = await getApiBaseUrl();
  const res = await fetch(
    `${apiBase}/api/v1/public/payment-portal/${encodeURIComponent(token)}/method-override`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ methodId }),
    },
  );

  if (!res.ok) {
    const message = await readErrorMessage(res);
    throw new PaymentPortalError(message, res.status, res.status >= 500);
  }

  const body = await res.json();
  return body.data as PaymentPortalInfo;
}
