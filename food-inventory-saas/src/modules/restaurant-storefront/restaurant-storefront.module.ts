import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Schemas
import { RestaurantCategory, RestaurantCategorySchema } from '../../schemas/restaurant-category.schema';
import { RestaurantIngredient, RestaurantIngredientSchema } from '../../schemas/restaurant-ingredient.schema';
import { RestaurantDish, RestaurantDishSchema } from '../../schemas/restaurant-dish.schema';
import { RestaurantOrder, RestaurantOrderSchema } from '../../schemas/restaurant-order.schema';
import { StorefrontConfig, StorefrontConfigSchema } from '../../schemas/storefront-config.schema';
import { Product, ProductSchema } from '../../schemas/product.schema';

// Services
import { RestaurantCategoriesService } from './services/restaurant-categories.service';
import { RestaurantIngredientsService } from './services/restaurant-ingredients.service';
import { RestaurantDishesService } from './services/restaurant-dishes.service';
import { RestaurantOrdersService } from './services/restaurant-orders.service';

// Controllers - Private (admin)
import { RestaurantDishesController } from './controllers/restaurant-dishes.controller';
import { RestaurantCategoriesController } from './controllers/restaurant-categories.controller';
import { RestaurantIngredientsController } from './controllers/restaurant-ingredients.controller';
import { RestaurantOrdersController } from './controllers/restaurant-orders.controller';

// Controllers - Config
import { RestaurantConfigController } from './controllers/restaurant-config.controller';
// Controllers - Public (storefront)
import { RestaurantDishesPublicController } from './controllers/restaurant-dishes-public.controller';
import { RestaurantOrdersPublicController } from './controllers/restaurant-orders-public.controller';
import { RestaurantConfigPublicController } from './controllers/restaurant-config-public.controller';

/**
 * Módulo Restaurant Storefront — Vertical de restaurantes para SmartKubik
 *
 * Endpoints públicos (para el storefront Next.js):
 *   GET  /public/restaurant/:tenantId/menu         → platos + categorías activos
 *   GET  /public/restaurant/:tenantId/dishes        → solo platos disponibles
 *   GET  /public/restaurant/:tenantId/dishes/:id    → detalle de plato
 *   POST /public/restaurant/:tenantId/orders        → crear pedido
 *   PATCH /public/restaurant/:tenantId/orders/:id/whatsapp-sent
 *
 * Endpoints privados (para el admin del ERP):
 *   CRUD /restaurant-dishes
 *   CRUD /restaurant-categories
 *   CRUD /restaurant-ingredients
 *   GET + PATCH status /restaurant-orders
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RestaurantCategory.name, schema: RestaurantCategorySchema },
      { name: RestaurantIngredient.name, schema: RestaurantIngredientSchema },
      { name: RestaurantDish.name, schema: RestaurantDishSchema },
      { name: RestaurantOrder.name, schema: RestaurantOrderSchema },
      { name: StorefrontConfig.name, schema: StorefrontConfigSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [
    // Config
    RestaurantConfigController,
    // Private
    RestaurantDishesController,
    RestaurantCategoriesController,
    RestaurantIngredientsController,
    RestaurantOrdersController,
    // Public
    RestaurantDishesPublicController,
    RestaurantOrdersPublicController,
    RestaurantConfigPublicController,
  ],
  providers: [
    RestaurantCategoriesService,
    RestaurantIngredientsService,
    RestaurantDishesService,
    RestaurantOrdersService,
  ],
  exports: [
    RestaurantCategoriesService,
    RestaurantIngredientsService,
    RestaurantDishesService,
    RestaurantOrdersService,
  ],
})
export class RestaurantStorefrontModule {}
