import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import { RestaurantProvider } from '@/lib/restaurant-context';
import { restaurantApi } from '@/lib/api';
import { resolveTenantId } from '@/lib/tenant';
import { RestaurantConfig } from '@/types';

async function getConfig(): Promise<{ config: RestaurantConfig | null; tenantId: string }> {
  const tenantId = await resolveTenantId();
  if (!tenantId) return { config: null, tenantId };
  try {
    const data = await restaurantApi.getConfig(tenantId);
    return { config: data as RestaurantConfig, tenantId };
  } catch {
    return { config: null, tenantId };
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { config, tenantId } = await getConfig();

  return (
    <RestaurantProvider config={config} tenantId={tenantId}>
      <div className="relative flex min-h-screen flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CartDrawer />
      </div>
    </RestaurantProvider>
  );
}
