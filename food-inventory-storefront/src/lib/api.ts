import { StorefrontConfig, ProductsResponse, OrderData, Order } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Obtiene la configuración del storefront para un dominio específico
 */
export async function getStorefrontConfig(domain: string): Promise<StorefrontConfig> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/storefront/preview/${domain}`, {
      next: {
        revalidate: 60, // Revalidar cada 60 segundos
        tags: [`storefront-${domain}`]
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Tienda no encontrada');
      }
      throw new Error(`Error al cargar configuración: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching storefront config:', error);
    throw error;
  }
}

/**
 * Obtiene la lista de dominios activos
 */
export async function getActiveDomains(): Promise<string[]> {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/storefront/active-domains`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch active domains');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching active domains:', error);
    return [];
  }
}

/**
 * Obtiene productos con opciones de filtrado y paginación
 */
export async function getProducts(
  tenantId: string,
  options?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
  }
): Promise<ProductsResponse> {
  try {
    const params = new URLSearchParams({
      tenantId,
      page: String(options?.page || 1),
      limit: String(options?.limit || 20),
    });

    if (options?.category) {
      params.append('category', options.category);
    }

    if (options?.search) {
      params.append('search', options.search);
    }

    const res = await fetch(`${API_BASE}/api/v1/products?${params}`, {
      next: {
        revalidate: 300, // Revalidar cada 5 minutos
        tags: [`products-${tenantId}`]
      }
    });

    if (!res.ok) {
      throw new Error(`Error al cargar productos: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Obtiene un producto específico por ID
 */
export async function getProductById(productId: string, tenantId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/products/${productId}?tenantId=${tenantId}`, {
      next: {
        revalidate: 300,
        tags: [`product-${productId}`]
      }
    });

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Producto no encontrado');
      }
      throw new Error(`Error al cargar producto: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Obtiene las categorías únicas de productos de un tenant
 */
export async function getCategories(tenantId: string): Promise<string[]> {
  try {
    // Obtener todos los productos y extraer categorías únicas
    const { data: products } = await getProducts(tenantId, { limit: 1000 });
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    return categories;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Crea una nueva orden
 */
export async function createOrder(orderData: OrderData): Promise<Order> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderData),
      cache: 'no-store', // No cachear las órdenes
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Error al crear orden: ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}
