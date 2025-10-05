import { Product, StorefrontConfig } from '@/types';

export interface TemplateProps {
  config: StorefrontConfig;
  featuredProducts: Product[];
  categories: string[];
  cartItemsCount?: number;
  onAddToCart?: (product: Product) => void;
}

export interface HeaderProps {
  config: StorefrontConfig;
  domain: string;
  cartItemsCount?: number;
}

export interface FooterProps {
  config: StorefrontConfig;
  domain: string;
}

export interface ProductCardProps {
  product: Product;
  domain: string;
  onAddToCart?: (product: Product) => void;
}

export interface ProductsGridProps {
  products: Product[];
  domain: string;
  onAddToCart?: (product: Product) => void;
}
