import { getStorefrontConfig } from '@/lib/api';
import { OrderSearchClient } from './OrderSearchClient';

export const revalidate = 60;

interface OrderSearchPageProps {
  params: Promise<{ domain: string }>;
}

export default async function OrderSearchPage({ params }: OrderSearchPageProps) {
  const { domain } = await params;
  const config = await getStorefrontConfig(domain);

  return <OrderSearchClient config={config} />;
}
