import { notFound } from 'next/navigation';
import {
  PaymentPortalError,
  getPaymentPortalInfo,
} from '@/lib/payment-portal';
import PaymentPortalView from './_components/PaymentPortalView';

interface PaymentPortalPageProps {
  params: Promise<{ token: string }>;
}

/**
 * Server component — fetches portal info with the signed token in the URL.
 *
 * 401/403/404 all collapse to `notFound()` so we don't accidentally leak the
 * existence (or non-existence) of a PaymentRequest. 5xx propagates to the
 * Next.js error boundary, which gives the customer a generic retry UI.
 */
export default async function PaymentPortalPage({
  params,
}: PaymentPortalPageProps) {
  const { token } = await params;

  let info;
  try {
    info = await getPaymentPortalInfo(token);
  } catch (err) {
    if (err instanceof PaymentPortalError) {
      if (err.status === 401 || err.status === 403 || err.status === 404) {
        notFound();
      }
    }
    throw err;
  }

  return <PaymentPortalView info={info} token={token} />;
}
