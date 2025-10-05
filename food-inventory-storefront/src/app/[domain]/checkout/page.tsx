import { getStorefrontConfig } from '@/lib/api';
import { CheckoutPageClient } from './CheckoutPageClient';

interface CheckoutPageProps {
  params: {
    domain: string;
  };
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const config = await getStorefrontConfig(params.domain);

  return <CheckoutPageClient config={config} />;
}
