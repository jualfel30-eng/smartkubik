import Hero from '@/components/layout/Hero';
import DishCard from '@/components/menu/DishCard';
import { restaurantApi } from '@/lib/api';
import { resolveTenantId } from '@/lib/tenant';
import { Dish, MenuResponse, RestaurantConfig } from '@/types';

export const revalidate = 60;

export default async function HomePage() {
  const tenantId = await resolveTenantId();

  let config: RestaurantConfig | null = null;
  let featuredDishes: Dish[] = [];

  if (tenantId) {
    try {
      const [configData, menuRes] = await Promise.all([
        restaurantApi.getConfig(tenantId),
        restaurantApi.getMenu(tenantId) as Promise<MenuResponse>,
      ]);
      config = configData as RestaurantConfig;
      featuredDishes = (menuRes.dishes ?? []).slice(0, 4);
    } catch (error) {
      console.error('Error cargando homepage:', error);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Hero
        restaurantName={config?.restaurantName || "Restaurante"}
        tagline={config?.tagline}
        videoUrl={config?.heroVideoUrl || undefined}
        imageUrl={config?.heroImageUrl || undefined}
      />
      {featuredDishes.length > 0 && (
        <section className="py-24 container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center text-center mb-16">
            <span className="text-accent font-bold tracking-widest text-sm uppercase mb-3 border border-accent/20 px-3 py-1 rounded-full bg-accent/10">
              Sugerencias del Chef
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-white">
              Platillos Destacados
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {featuredDishes.map((dish) => (
              <DishCard key={dish._id} dish={dish} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
