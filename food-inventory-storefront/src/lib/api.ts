import { StorefrontConfig, ProductsResponse, OrderData, Order } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Transforma un producto del backend al formato esperado por el frontend
 */
function transformProduct(product: any): any {
  const firstVariant = product.variants?.[0];
  const firstImage = firstVariant?.images?.[0];

  return {
    _id: product._id,
    name: product.name,
    description: product.description || '',
    sku: product.sku || firstVariant?.sku || '',
    category: product.category || 'Sin categoría',
    brand: product.brand || '',
    price: firstVariant?.basePrice || 0,
    imageUrl: firstImage || null,
    image: firstImage || null, // compatibility
    stock: firstVariant?.stock || 0,
    isActive: product.isActive,
    tenantId: product.tenantId,
  };
}

/**
 * Obtiene la configuración del storefront para un dominio específico
 */
export async function getStorefrontConfig(domain: string): Promise<StorefrontConfig> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/storefront/by-domain/${domain}`, {
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
    return data.data; // El backend devuelve { success: true, data: {...} }
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
      `${API_BASE}/api/v1/public/storefront/active-domains`,
      { next: { revalidate: 60 } }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch active domains');
    }

    const data = await response.json();
    return data.data; // El backend devuelve { success: true, data: [...] }
  } catch (error) {
    console.error('Error fetching active domains:', error);
    return [];
  }
}

/**
 * Obtiene productos con opciones de filtrado y paginación (endpoint público)
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

    const res = await fetch(`${API_BASE}/api/v1/public/products?${params}`, {
      next: {
        revalidate: 300, // Revalidar cada 5 minutos
        tags: [`products-${tenantId}`]
      }
    });

    if (!res.ok) {
      throw new Error(`Error al cargar productos: ${res.status}`);
    }

    const response = await res.json();

    // Transformar productos para que tengan el formato esperado
    const transformedProducts = response.data.map(transformProduct);

    return {
      data: transformedProducts,
      ...response.pagination
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
}

/**
 * Obtiene un producto específico por ID (endpoint público)
 */
export async function getProductById(productId: string, tenantId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/public/products/${productId}?tenantId=${tenantId}`, {
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

    const response = await res.json();
    return transformProduct(response.data);
  } catch (error) {
    console.error('Error fetching product:', error);
    throw error;
  }
}

/**
 * Obtiene las categorías únicas de productos de un tenant (endpoint público)
 */
export async function getCategories(tenantId: string): Promise<string[]> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/products/categories/list?tenantId=${tenantId}`,
      {
        next: {
          revalidate: 300,
          tags: [`categories-${tenantId}`]
        }
      }
    );

    if (!res.ok) {
      throw new Error('Failed to fetch categories');
    }

    const result = await res.json();
    return result.data; // Backend returns { success: true, data: [...] }
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
