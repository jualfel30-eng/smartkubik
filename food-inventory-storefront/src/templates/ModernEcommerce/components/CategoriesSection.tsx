import Link from 'next/link';
import {
  Package,
  Coffee,
  Beef,
  Salad,
  Wine,
  IceCream,
  Cookie,
  Apple,
  Pizza,
  Utensils,
  ShoppingBasket,
  Star,
  Sparkles,
  ChefHat,
} from 'lucide-react';

interface CategoriesSectionProps {
  categories: string[];
  domain: string;
}

// Category icon mapping with better food-related icons
const getCategoryIcon = (category: string): any => {
  const lowerCategory = category.toLowerCase();

  // Food categories
  if (lowerCategory.includes('bebida') || lowerCategory.includes('bebidas')) return Coffee;
  if (lowerCategory.includes('carne') || lowerCategory.includes('carnes')) return Beef;
  if (lowerCategory.includes('ensalada') || lowerCategory.includes('vegetal') || lowerCategory.includes('verdura')) return Salad;
  if (lowerCategory.includes('vino') || lowerCategory.includes('licor') || lowerCategory.includes('alcohol')) return Wine;
  if (lowerCategory.includes('postre') || lowerCategory.includes('dulce') || lowerCategory.includes('helado')) return IceCream;
  if (lowerCategory.includes('pan') || lowerCategory.includes('panade') || lowerCategory.includes('galleta')) return Cookie;
  if (lowerCategory.includes('fruta') || lowerCategory.includes('frutas')) return Apple;
  if (lowerCategory.includes('pizza')) return Pizza;
  if (lowerCategory.includes('plato') || lowerCategory.includes('entrada') || lowerCategory.includes('principal')) return Utensils;
  if (lowerCategory.includes('especial') || lowerCategory.includes('destacado')) return Star;
  if (lowerCategory.includes('nuevo') || lowerCategory.includes('nueva')) return Sparkles;
  if (lowerCategory.includes('chef') || lowerCategory.includes('gourmet')) return ChefHat;
  if (lowerCategory.includes('mercado') || lowerCategory.includes('abarrote')) return ShoppingBasket;

  // Default icon
  return Package;
};

// Category color mapping for more visual variety
const getCategoryColor = (index: number): string => {
  const colors = [
    'from-orange-400 to-orange-600',
    'from-green-400 to-green-600',
    'from-blue-400 to-blue-600',
    'from-purple-400 to-purple-600',
    'from-pink-400 to-pink-600',
    'from-yellow-400 to-yellow-600',
    'from-red-400 to-red-600',
    'from-indigo-400 to-indigo-600',
  ];
  return colors[index % colors.length];
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
            const Icon = getCategoryIcon(category);
            const gradientColor = getCategoryColor(index);

            return (
              <Link
                key={category}
                href={`/${domain}/productos?category=${encodeURIComponent(category)}`}
                className="group relative bg-white rounded-xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden"
              >
                {/* Gradient Background on Hover */}
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${gradientColor} opacity-0 group-hover:opacity-10 transition-opacity duration-300
                `} />

                <div className="relative flex flex-col items-center text-center space-y-3">
                  {/* Icon with gradient background */}
                  <div className={`
                    p-4 rounded-full bg-gradient-to-br ${gradientColor} text-white
                    shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-300
                  `}>
                    <Icon className="h-7 w-7" />
                  </div>

                  {/* Category Name */}
                  <h3 className="font-semibold text-gray-900 group-hover:text-[var(--primary-color)] transition-colors line-clamp-2">
                    {category}
                  </h3>

                  {/* Hover Arrow */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span className="text-sm text-[var(--primary-color)] font-medium">
                      Ver productos →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
