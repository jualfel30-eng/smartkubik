import { fetchApi } from './api';

/**
 * Wrappers around the Payment Requests API exposed by food-inventory-saas.
 * All endpoints are tenant-authenticated and require the
 * `payment_requests_review` permission (granted to admin + employee by
 * default; tenants may extend to custom roles).
 *
 * The backend returns `{ success, data, ... }` envelopes — we unwrap and
 * return just the meaningful payload so call sites stay terse.
 */

const BASE = '/payment-requests';

/**
 * Manual creation — typically used by RequestPaymentModal for non-storefront
 * orders. Storefront orders auto-issue via the backend listener.
 */
export async function createPaymentRequest({
  entityType = 'order',
  entityId,
  methodId,
  deliveryPhone,
  deliveryChannel,
  allowMethodOverride,
}) {
  const res = await fetchApi(BASE, {
    method: 'POST',
    body: JSON.stringify({
      entityType,
      entityId,
      methodId,
      deliveryPhone,
      deliveryChannel,
      allowMethodOverride,
    }),
  });
  return res?.data; // { paymentRequest, portalUrl }
}

/**
 * List with pagination + filters. The badge / sheet uses `status=submitted`.
 */
export async function listPaymentRequests({
  status,
  entityType,
  page = 1,
  limit = 20,
} = {}) {
  const qs = new URLSearchParams();
  if (status) qs.set('status', status);
  if (entityType) qs.set('entityType', entityType);
  qs.set('page', String(page));
  qs.set('limit', String(limit));
  const res = await fetchApi(`${BASE}?${qs.toString()}`);
  return {
    data: res?.data || [],
    total: res?.total ?? 0,
    page: res?.page ?? page,
    limit: res?.limit ?? limit,
    totalPages: res?.totalPages ?? 1,
  };
}

export async function getPaymentRequest(id) {
  const res = await fetchApi(`${BASE}/${id}`);
  return res?.data;
}

/**
 * Badge counter — `submitted` PRs the tenant hasn't acted on yet.
 * Cheap query, safe to poll every 30s as a Socket.IO fallback.
 */
export async function getPendingCount() {
  const res = await fetchApi(`${BASE}/pending-count`);
  return res?.data?.count ?? 0;
}

export async function acceptProof(paymentRequestId, proofId, { note } = {}) {
  const res = await fetchApi(
    `${BASE}/${paymentRequestId}/proofs/${proofId}/accept`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );
  return res?.data;
}

export async function rejectProof(paymentRequestId, proofId, { reason, note }) {
  if (!reason) {
    throw new Error('rejectProof requires a reason');
  }
  const res = await fetchApi(
    `${BASE}/${paymentRequestId}/proofs/${proofId}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ reason, note }),
    },
  );
  return res?.data;
}

export async function confirmPaymentRequest(paymentRequestId) {
  const res = await fetchApi(`${BASE}/${paymentRequestId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return res?.data;
}

export async function markAwaitingSettlement(paymentRequestId) {
  const res = await fetchApi(
    `${BASE}/${paymentRequestId}/awaiting-settlement`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
  return res?.data;
}

export async function resendPaymentLink(paymentRequestId, { phone } = {}) {
  const res = await fetchApi(`${BASE}/${paymentRequestId}/resend-link`, {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
  return res?.data;
}
