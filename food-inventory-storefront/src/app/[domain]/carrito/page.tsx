import { getStorefrontConfig } from '@/lib/api';
import { CartPageClient } from './CartPageClient';

interface CartPageProps {
  params: Promise<{
    domain: string;
  }>;
}

export default async function CartPage({ params }: CartPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  return <CartPageClient config={config} />;
}
