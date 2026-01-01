import { getStorefrontConfig } from '@/lib/api';
import { CheckoutPageClientEnhanced } from './CheckoutPageClient.enhanced';

interface CheckoutPageProps {
  params: Promise<{
    domain: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  return <CheckoutPageClientEnhanced config={config} />;
}
