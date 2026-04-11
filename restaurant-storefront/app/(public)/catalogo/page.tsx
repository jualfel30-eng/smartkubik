import { restaurantApi } from '@/lib/api';
import { resolveTenantId } from '@/lib/tenant';
import { Dish, Category, MenuResponse } from '@/types';
import MenuGrid from '@/components/menu/MenuGrid';

export const revalidate = 10;

export default async function MenuPage() {
  const tenantId = await resolveTenantId();

  let dishes: Dish[] = [];
  let categories: Category[] = [];

  if (tenantId) {
    try {
      const menu = await restaurantApi.getMenu(tenantId) as MenuResponse;
      dishes = menu.dishes ?? [];
      categories = menu.categories ?? [];
    } catch (error) {
      console.error('Error cargando menú:', error);
    }
  }

  return (
    <div className="pt-20">
      <div className="container mx-auto px-4 md:px-6 py-12">
        <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl text-white mb-4 tracking-tight">
          NUESTRO <span className="text-accent italic font-medium">MENÚ</span>
        </h1>
        <p className="text-muted max-w-2xl text-lg">
          Personaliza tus platillos a tu gusto. Lo preparamos exactamente como lo ordenes.
        </p>
      </div>
      <MenuGrid initialDishes={dishes} initialCategories={categories} />
    </div>
  );
}
