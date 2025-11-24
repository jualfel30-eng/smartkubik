import {
  StorefrontConfig,
  ProductsResponse,
  OrderData,
  Order,
  BookingService,
  AvailabilitySlot,
  CreateBookingPayload,
  CreateBookingResponse,
  CancelBookingPayload,
  CancelBookingResponse,
  BookingLookupPayload,
  BookingSummary,
  RescheduleBookingPayload,
  RescheduleBookingResponse,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Transforma un producto del backend al formato esperado por el frontend
 */
function transformProduct(product: any): any {
  const firstVariant = product.variants?.[0];
  const firstImage =
    firstVariant?.images?.[0] ||
    product.images?.[0] ||
    product.image ||
    product.imageUrl;
  const stockFallback =
    firstVariant?.stock ??
    product.availableQuantity ??
    product.inventory?.availableQuantity ??
    product.stock ??
    0;
  const priceFallback =
    firstVariant?.basePrice ??
    product.price ??
    firstVariant?.price ??
    product.salePrice ??
    product.attributes?.price ??
    0;

  return {
    _id: product._id,
    name: product.name,
    description: product.description || '',
    sku: product.sku || firstVariant?.sku || '',
    category: product.category || 'Sin categoría',
    brand: product.brand || '',
    price: priceFallback,
    imageUrl: firstImage || null,
    image: firstImage || null, // compatibility
    ingredients: product.ingredients || product.attributes?.ingredients || '',
    stock: stockFallback,
    isActive: product.isActive,
    tenantId: product.tenantId,
  };
}

function transformService(service: any): BookingService {
  const tenantId =
    typeof service.tenantId === 'string'
      ? service.tenantId
      : service.tenantId?._id ||
        service.tenantId?.toString?.() ||
        '';

  return {
    _id: service._id,
    tenantId,
    name: service.name,
    description: service.description || '',
    category: service.category || 'General',
    duration: service.duration || 60,
    serviceType: (service.serviceType || 'general') as BookingService['serviceType'],
    price: service.price || 0,
    color: service.color || undefined,
    requiresResource: Boolean(service.requiresResource),
    allowedResourceTypes: service.allowedResourceTypes || [],
    bufferTimeBefore: service.bufferTimeBefore || 0,
    bufferTimeAfter: service.bufferTimeAfter || 0,
    maxSimultaneous: service.maxSimultaneous || 1,
    addons: (service.addons || []).map((addon: any) => ({
      name: addon.name,
      description: addon.description,
      price: addon.price || 0,
      duration: addon.duration,
    })),
    requiresDeposit: Boolean(service.requiresDeposit),
    depositType: service.depositType || 'fixed',
    depositAmount: service.depositAmount || 0,
    minAdvanceBooking: service.minAdvanceBooking,
    maxAdvanceBooking: service.maxAdvanceBooking,
    metadata: service.metadata || {},
  };
}

async function parseJsonError(res: Response): Promise<never> {
  let message = `Error ${res.status}`;
  try {
    const body = await res.json();
    message =
      body?.message ||
      body?.error ||
      body?.errors?.[0]?.message ||
      JSON.stringify(body);
  } catch (err) {
    console.error('Failed to parse error response', err);
  }
  throw new Error(message);
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
    productType?: string;
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

    if (options?.productType) {
      params.append('productType', options.productType);
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
 * Obtiene servicios disponibles para agendar (endpoint público)
 */
export async function getBookingServices(
  tenantId: string,
  options?: { category?: string }
): Promise<BookingService[]> {
  const params = new URLSearchParams({ tenantId });
  if (options?.category) {
    params.append('category', options.category);
  }

  const res = await fetch(`${API_BASE}/api/v1/public/services?${params.toString()}`, {
    next: {
      revalidate: 180,
      tags: [`services-${tenantId}`],
    },
  });

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return (body.data || []).map(transformService);
}

/**
 * Obtiene detalle de un servicio específico (endpoint público)
 */
export async function getBookingServiceById(
  tenantId: string,
  serviceId: string
): Promise<BookingService> {
  const res = await fetch(
    `${API_BASE}/api/v1/public/services/${serviceId}?tenantId=${tenantId}`,
    {
      next: {
        revalidate: 180,
        tags: [`service-${serviceId}`],
      },
    }
  );

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return transformService(body.data);
}

/**
 * Obtiene las categorías de servicios disponibles
 */
export async function getBookingServiceCategories(tenantId: string): Promise<string[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/public/services/categories?tenantId=${tenantId}`,
    {
      next: {
        revalidate: 300,
        tags: [`service-categories-${tenantId}`],
      },
    }
  );

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data || [];
}

/**
 * Consulta disponibilidad para un servicio dado (endpoint público)
 */
export async function getServiceAvailability(
  payload: {
    tenantId: string;
    serviceId: string;
    date: string;
    resourceId?: string;
    additionalResourceIds?: string[];
    capacity?: number;
  }
): Promise<AvailabilitySlot[]> {
  const res = await fetch(`${API_BASE}/api/v1/public/appointments/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: payload.tenantId,
      serviceId: payload.serviceId,
      resourceId: payload.resourceId,
      additionalResourceIds: payload.additionalResourceIds,
      date: payload.date,
      capacity: payload.capacity,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data || [];
}

/**
 * Crea una reserva pública
 */
export async function createBooking(
  booking: CreateBookingPayload
): Promise<CreateBookingResponse> {
  const res = await fetch(`${API_BASE}/api/v1/public/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(booking),
    cache: 'no-store',
  });

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data;
}

/**
 * Cancela una reserva pública
 */
export async function cancelBooking(
  appointmentId: string,
  payload: CancelBookingPayload
): Promise<CancelBookingResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/public/appointments/${appointmentId}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data;
}

export async function lookupBookings(
  payload: BookingLookupPayload
): Promise<BookingSummary[]> {
  const res = await fetch(`${API_BASE}/api/v1/public/appointments/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data || [];
}

export async function rescheduleBooking(
  appointmentId: string,
  payload: RescheduleBookingPayload
): Promise<RescheduleBookingResponse> {
  const res = await fetch(
    `${API_BASE}/api/v1/public/appointments/${appointmentId}/reschedule`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    }
  );

  if (!res.ok) {
    await parseJsonError(res);
  }

  const body = await res.json();
  return body.data;
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
    // Endpoint público para storefront
    const res = await fetch(`${API_BASE}/api/v1/public/orders`, {
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
    return data.data || data;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Rastrea una orden por su número (endpoint público)
 */
export async function trackOrder(orderNumber: string, tenantId: string): Promise<Order> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/orders/track/${orderNumber}?tenantId=${tenantId}`,
      {
        cache: 'no-store', // No cachear el tracking de órdenes
      }
    );

    if (!res.ok) {
      if (res.status === 404) {
        throw new Error('Orden no encontrada');
      }
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `Error al rastrear orden: ${res.status}`);
    }

    const data = await res.json();
    return data.data; // El backend devuelve { success: true, data: order }
  } catch (error) {
    console.error('Error tracking order:', error);
    throw error;
  }
}
