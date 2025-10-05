import { getStorefrontConfig } from '@/lib/api';
import { CartPageClient } from './CartPageClient';

interface CartPageProps {
  params: {
    domain: string;
  };
}

export default async function CartPage({ params }: CartPageProps) {
  const config = await getStorefrontConfig(params.domain);

  return <CartPageClient config={config} />;
}
