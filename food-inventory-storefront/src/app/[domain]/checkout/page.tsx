import { getStorefrontConfig } from '@/lib/api';
import { CheckoutPageClient } from './CheckoutPageClient';

interface CheckoutPageProps {
  params: Promise<{
    domain: string;
  }>;
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  return <CheckoutPageClient config={config} />;
}
