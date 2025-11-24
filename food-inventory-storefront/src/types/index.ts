// TypeScript types para el storefront

export interface StorefrontConfig {
  _id: string;
  tenantId: string | { _id: string; [key: string]: any };
  isActive: boolean;
  domain: string;
  name?: string;
  description?: string;
  theme: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
    favicon?: string;
  };
  templateType: 'ecommerce' | 'services';
  customCSS?: string;
  language?: string;
  seo: {
    title: string;
    description?: string;
    keywords: string[];
  };
  socialMedia: {
    facebook?: string;
    instagram?: string;
    whatsapp?: string;
  };
  contactInfo: {
    email?: string;
    phone?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      country?: string;
    };
  };
  externalLinks?: {
    reserveWithGoogle?: string;
    whatsapp?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  ingredients?: string;
  isActive: boolean;
  tenantId: string;
}

export interface ProductsResponse {
  data: Product[];
  total: number;
  page: number;
  limit: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderData {
  tenantId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  notes?: string;
}

export interface Order {
  _id: string;
  tenantId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceAddon {
  name: string;
  description?: string;
  price: number;
  duration?: number;
}

export interface BookingService {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  category: string;
  duration: number;
  serviceType: "room" | "spa" | "experience" | "concierge" | "general";
  price: number;
  color?: string;
  requiresResource: boolean;
  allowedResourceTypes: string[];
  bufferTimeBefore?: number;
  bufferTimeAfter?: number;
  maxSimultaneous: number;
  addons: ServiceAddon[];
  requiresDeposit: boolean;
  depositType: "fixed" | "percentage";
  depositAmount: number;
  minAdvanceBooking?: number;
  maxAdvanceBooking?: number;
  metadata?: Record<string, unknown>;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
}

export interface BookingCustomerPayload {
  firstName: string;
  lastName?: string;
  email: string;
  phone: string;
  preferredLanguage?: string;
}

export interface BookingGuestPayload {
  name: string;
  guestEmail?: string;
  guestPhone?: string;
  role?: string;
}

export interface BookingAddonPayload {
  name: string;
  price?: number;
  quantity?: number;
}

export interface CreateBookingPayload {
  tenantId: string;
  serviceId: string;
  startTime: string;
  locationId?: string;
  resourceId?: string;
  additionalResourceIds?: string[];
  notes?: string;
  partySize?: number;
  customer: BookingCustomerPayload;
  guests?: BookingGuestPayload[];
  addons?: BookingAddonPayload[];
  metadata?: Record<string, unknown>;
  acceptPolicies?: boolean;
}

export interface CreateBookingResponse {
  appointmentId: string;
  status: string;
  cancellationCode: string;
  startTime: string;
  endTime: string;
}

export interface CancelBookingPayload {
  tenantId: string;
  cancellationCode: string;
  reason?: string;
}

export interface CancelBookingResponse {
  appointmentId: string;
  previousStatus: string;
  newStatus: string;
  cancelledAt: string;
}

export interface BookingLookupPayload {
  tenantId: string;
  email: string;
  phone?: string;
  cancellationCode?: string;
  includePast?: boolean;
}

export interface BookingSummary {
  appointmentId: string;
  serviceId: string | null;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: string;
  cancellationCode?: string;
  locationName?: string;
  resourceName?: string;
  capacity: number;
  addons: BookingAddonPayload[];
  price: number;
  canModify: boolean;
}

export interface RescheduleBookingPayload {
  tenantId: string;
  newStartTime: string;
  cancellationCode: string;
  notes?: string;
}

export interface RescheduleBookingResponse {
  appointmentId: string;
  status: string;
  startTime: string;
  endTime: string;
}
