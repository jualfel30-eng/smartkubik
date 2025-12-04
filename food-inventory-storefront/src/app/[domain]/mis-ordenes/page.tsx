import { OrderHistoryClient } from './OrderHistoryClient';

export const dynamic = 'force-dynamic';

interface OrderHistoryPageProps {
  params: Promise<{ domain: string }>;
}

export default async function OrderHistoryPage({ params }: OrderHistoryPageProps) {
  const { domain } = await params;

  return <OrderHistoryClient domain={domain} />;
}
