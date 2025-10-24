// TypeScript types para el storefront

export interface StorefrontConfig {
  _id: string;
  tenantId: string | { _id: string; [key: string]: any };
  isActive: boolean;
  domain: string;
  theme: {
    primaryColor: string;
    secondaryColor: string;
    logo?: string;
    favicon?: string;
  };
  templateType: 'ecommerce' | 'services';
  customCSS?: string;
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
  shippingMethod?: 'pickup' | 'delivery' | 'envio_nacional';
  honeypot?: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  notes?: string;
  createdAt?: string;
}
