// Base URL del backend SmartKubik (NestJS)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';


interface FetchOptions extends RequestInit {
  params?: Record<string, string>;
  token?: string;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, token, headers, ...customConfig } = options;

  let url = `${API_URL}${endpoint}`;
  if (params) {
    url += '?' + new URLSearchParams(params).toString();
  }

  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || 'API request failed');
  }

  return data;
}

// ─── Métodos base ───────────────────────────────────────────────────────────
export const api = {
  get: <T>(url: string, options?: FetchOptions) =>
    fetchApi<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body: unknown, options?: FetchOptions) =>
    fetchApi<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: <T>(url: string, body: unknown, options?: FetchOptions) =>
    fetchApi<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(url: string, body: unknown, options?: FetchOptions) =>
    fetchApi<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(url: string, options?: FetchOptions) =>
    fetchApi<T>(url, { ...options, method: 'DELETE' }),
};

// ─── Storefront config pública (tema, config restaurante) ─────────────────
export const storefrontApi = {
  /** Configuración completa del storefront por tenantId (incluye restaurantConfig) */
  getConfig: (tenantId: string) =>
    api.get<{ success: boolean; data: unknown }>(`/public/storefront/by-tenant/${tenantId}`),
};

// ─── API pública del restaurante (sin auth, requiere tenantId) ─────────────
export const restaurantApi = {
  /** Configuración pública del restaurante (accentColor, logoUrl, heroVideoUrl, etc.) */
  getConfig: (tenantId: string) =>
    api.get<{ accentColor?: string; restaurantName?: string; tagline?: string; logoUrl?: string; heroVideoUrl?: string; heroImageUrl?: string; currency?: string; whatsappNumber?: string; paymentInstructions?: string }>(`/public/restaurant/${tenantId}/config`),

  /** Menú completo: platos disponibles + categorías activas */
  getMenu: (tenantId: string) =>
    api.get(`/public/restaurant/${tenantId}/menu`),

  /** Solo platos (con filtros opcionales) */
  getDishes: (tenantId: string, params?: { categoryId?: string; search?: string }) =>
    api.get(`/public/restaurant/${tenantId}/dishes`, { params: params as Record<string, string> }),

  /** Detalle de un plato */
  getDish: (tenantId: string, dishId: string) =>
    api.get(`/public/restaurant/${tenantId}/dishes/${dishId}`),

  /** Crear pedido */
  createOrder: (tenantId: string, body: unknown) =>
    api.post(`/public/restaurant/${tenantId}/orders`, body),

  /** Marcar que el pedido fue enviado por WhatsApp */
  markWhatsAppSent: (tenantId: string, orderId: string) =>
    api.patch(`/public/restaurant/${tenantId}/orders/${orderId}/whatsapp-sent`, {}),
};

// ─── API privada del admin del restaurante (requiere JWT) ──────────────────
export const restaurantAdminApi = {
  // Platos
  getDishes: (token: string) =>
    api.get('/restaurant-dishes', { token }),
  createDish: (token: string, body: unknown) =>
    api.post('/restaurant-dishes', body, { token }),
  updateDish: (token: string, id: string, body: unknown) =>
    api.put(`/restaurant-dishes/${id}`, body, { token }),
  toggleDishAvailability: (token: string, id: string) =>
    api.patch(`/restaurant-dishes/${id}/toggle-availability`, {}, { token }),
  deleteDish: (token: string, id: string) =>
    api.delete(`/restaurant-dishes/${id}`, { token }),

  // Categorías
  getCategories: (token: string) =>
    api.get('/restaurant-categories', { token }),
  createCategory: (token: string, body: unknown) =>
    api.post('/restaurant-categories', body, { token }),
  updateCategory: (token: string, id: string, body: unknown) =>
    api.put(`/restaurant-categories/${id}`, body, { token }),
  deleteCategory: (token: string, id: string) =>
    api.delete(`/restaurant-categories/${id}`, { token }),

  // Ingredientes
  getIngredients: (token: string) =>
    api.get('/restaurant-ingredients', { token }),
  createIngredient: (token: string, body: unknown) =>
    api.post('/restaurant-ingredients', body, { token }),
  updateIngredient: (token: string, id: string, body: unknown) =>
    api.put(`/restaurant-ingredients/${id}`, body, { token }),
  deleteIngredient: (token: string, id: string) =>
    api.delete(`/restaurant-ingredients/${id}`, { token }),

  // Config del storefront (restaurantConfig)
  getStorefrontConfig: (token: string) =>
    api.get('/restaurant-storefront/config', { token }),
  updateStorefrontConfig: (token: string, restaurantConfig: Record<string, unknown>) =>
    api.put('/restaurant-storefront/config', { restaurantConfig }, { token }),

  // Pedidos
  getOrders: (token: string, params?: { status?: string; limit?: number; offset?: number }) =>
    api.get('/restaurant-orders', { token, params: params as Record<string, string> }),
  getOrder: (token: string, id: string) =>
    api.get(`/restaurant-orders/${id}`, { token }),
  updateOrderStatus: (token: string, id: string, status: string) =>
    api.patch(`/restaurant-orders/${id}/status`, { status }, { token }),
};
