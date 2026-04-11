// ─── Configuración del restaurante (desde StorefrontConfig.restaurantConfig) ──
export interface RestaurantConfig {
  enabled: boolean;
  restaurantName?: string;
  tagline?: string;
  logoUrl?: string;
  heroVideoUrl?: string;
  heroImageUrl?: string;
  whatsappNumber?: string;
  paymentInstructions?: string;
  currency?: string;
  accentColor?: string;
  businessHours?: Array<{
    day: number;
    open: string;
    close: string;
    isOpen: boolean;
  }>;
}

// Respuesta completa del endpoint /public/storefront/by-tenant/:tenantId
export interface StorefrontConfig {
  _id: string;
  tenantId: string | { _id: string; name: string };
  domain?: string;
  isActive: boolean;
  name: string;
  templateType: string;
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logo?: string;
  };
  restaurantConfig?: RestaurantConfig;
}

// ─── Tipos del menú ────────────────────────────────────────────────────────────
export interface Category {
  _id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface Ingredient {
  _id: string;
  name: string;
  category?: string;
  extraPrice: number;
  isActive: boolean;
}

export interface DishIngredient {
  ingredientId: Ingredient | string;
  name?: string;        // Populado cuando ingredientId es objeto
  extraPrice?: number;
  isRemovable?: boolean;
  isDefault?: boolean;
  maxQuantity?: number;
}

export interface Dish {
  _id: string;
  categoryId?: Category | string | null;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  allowsCustomization: boolean;
  displayOrder: number;
  baseIngredients: DishIngredient[];
  availableExtras: DishIngredient[];
}

// Respuesta del endpoint /public/restaurant/:tenantId/menu
export interface MenuResponse {
  dishes: Dish[];
  categories: Category[];
}

// ─── Carrito ───────────────────────────────────────────────────────────────────
export type CustomizationAction = 'remove' | 'add';

export interface CartCustomization {
  ingredient_id: string;   // MongoDB _id del ingrediente
  name: string;
  action: CustomizationAction;
  price_delta: number;
  quantity: number;
}

export interface CartItemType {
  cart_item_id: string;    // UUID generado en cliente para distinguir el mismo plato con distintas mods
  dish_id: string;         // MongoDB _id del plato
  name: string;
  base_price: number;
  final_price: number;
  quantity: number;
  customizations: CartCustomization[];
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────
export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface Order {
  _id: string;
  orderRef: string;
  customerName: string;
  customerPhone: string;
  items: CartItemType[];
  subtotal: number;
  total: number;
  notes?: string;
  status: OrderStatus;
  whatsappSentAt?: string;
  createdAt: string;
}
