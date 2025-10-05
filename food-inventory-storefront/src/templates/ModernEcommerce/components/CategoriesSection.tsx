import Link from 'next/link';
import { Package, Tag, Star, Grid } from 'lucide-react';

interface CategoriesSectionProps {
  categories: string[];
  domain: string;
}

const iconMap: Record<number, any> = {
  0: Package,
  1: Tag,
  2: Star,
  3: Grid,
};

export function CategoriesSection({ categories, domain }: CategoriesSectionProps) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Explora por Categoría
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Encuentra exactamente lo que buscas navegando por nuestras categorías
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category, index) => {
            const Icon = iconMap[index % 4] || Package;
            
            return (
              <Link
                key={category}
                href={`/${domain}/productos?category=${encodeURIComponent(category)}`}
                className="group relative bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="p-3 bg-gray-100 rounded-full group-hover:bg-[var(--primary-color)] group-hover:text-white transition-colors">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-[var(--primary-color)] transition-colors">
                    {category}
                  </h3>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
