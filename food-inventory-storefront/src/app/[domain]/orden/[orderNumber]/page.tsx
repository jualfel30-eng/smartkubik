import { notFound } from 'next/navigation';
import { getStorefrontConfig, trackOrder } from '@/lib/api';
import { OrderTrackingClient } from './OrderTrackingClient';

export const revalidate = 0; // Always revalidate order tracking

interface OrderTrackingPageProps {
  params: Promise<{
    domain: string;
    orderNumber: string;
  }>;
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { domain, orderNumber } = await params;

  try {
    const config = await getStorefrontConfig(domain);

    // Extract tenantId as string
    const tenantId: string =
      typeof config.tenantId === 'string'
        ? config.tenantId
        : (config.tenantId._id as string);

    // Track the order
    const order = await trackOrder(orderNumber, tenantId);

    return <OrderTrackingClient config={config} order={order} />;
  } catch (error) {
    console.error('Error tracking order:', error);
    notFound();
  }
}
