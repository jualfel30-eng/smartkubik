'use client';

import { Product, StorefrontConfig } from '@/types';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { FeaturedProducts } from './components/FeaturedProducts';
import { CategoriesSection } from './components/CategoriesSection';
import { NewsletterSection } from './components/NewsletterSection';
import { Footer } from './components/Footer';

interface ModernEcommerceTemplateProps {
  config: StorefrontConfig;
  featuredProducts: Product[];
  categories: string[];
  cartItemsCount?: number;
  onAddToCart?: (product: Product) => void;
}

export function ModernEcommerceTemplate({
  config,
  featuredProducts,
  categories,
  cartItemsCount = 0,
  onAddToCart,
}: ModernEcommerceTemplateProps) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <Header
        config={config}
        domain={config.domain}
        cartItemsCount={cartItemsCount}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <HeroSection domain={config.domain} storeName={config.seo.title} />

        {/* Featured Products */}
        <FeaturedProducts
          products={featuredProducts}
          domain={config.domain}
          onAddToCart={onAddToCart}
        />

        {/* Categories */}
        {categories.length > 0 && (
          <CategoriesSection categories={categories} domain={config.domain} />
        )}

        {/* Newsletter */}
        <NewsletterSection />
      </main>

      {/* Footer */}
      <Footer config={config} domain={config.domain} />
    </div>
  );
}
