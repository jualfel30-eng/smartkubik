'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorefrontConfig, ProductsResponse } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductsPageClientProps {
  config: StorefrontConfig;
  productsData: ProductsResponse;
  categories: string[];
  currentPage: number;
  currentCategory?: string;
  currentSearch?: string;
}

export function ProductsPageClient({
  config,
  productsData,
  categories,
  currentPage,
  currentCategory,
  currentSearch,
}: ProductsPageClientProps) {
  const { Header, Footer, ProductsGrid } = getTemplateComponents(config.templateType);
  const isPremium = config.templateType === 'premium';
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || '');
  const [isDarkMode, setIsDarkMode] = useState(isPremium);

  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const value = stored === 'dark';
      setIsDarkMode(value);
      document.documentElement.classList.toggle('dark', value);
      return;
    }
    if (isPremium) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      document.documentElement.classList.toggle('dark', prefersDark);
    }
  }, [isPremium]);

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('storefront_theme', next ? 'dark' : 'light');
  };

  const totalPages = Math.ceil(productsData.total / 20);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ search: searchInput, page: 1 });
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    updateFilters({ category: category || undefined, page: 1 });
  };

  const updateFilters = (updates: Record<string, any>) => {
    const params = new URLSearchParams();

    const newSearch = updates.search !== undefined ? updates.search : currentSearch;
    const newCategory = updates.category !== undefined ? updates.category : currentCategory;
    const newPage = updates.page || currentPage;

    if (newSearch) params.set('search', newSearch);
    if (newCategory) params.set('category', newCategory);
    if (newPage > 1) params.set('page', String(newPage));

    router.push(`/${config.domain}/productos?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    updateFilters({ page });
  };

  // Theme-aware class helpers
  const pageBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-white');
  const mainBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-gray-50');
  const cardBg = isPremium
    ? (isDarkMode ? 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl' : 'bg-white rounded-2xl shadow-sm border border-gray-100')
    : (isDarkMode ? 'bg-gray-900 border border-gray-800 rounded-lg' : 'bg-white rounded-lg');
  const inputBg = isPremium
    ? (isDarkMode ? 'bg-white/5 border-white/10 text-gray-100 placeholder:text-gray-500' : 'bg-white border-gray-200 text-gray-900')
    : (isDarkMode ? 'bg-gray-800 border border-gray-700 text-gray-100 placeholder:text-gray-400' : 'bg-white border border-gray-300 text-gray-900');
  const tagBg = isPremium
    ? (isDarkMode ? 'bg-white/5 text-gray-200 border border-white/10' : 'bg-gray-100 text-gray-700')
    : (isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700');
  const paginationBtn = isPremium
    ? (isDarkMode ? 'border-white/10 text-gray-200 hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')
    : (isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50');
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const iconMuted = isDarkMode ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${mainBg} ${isPremium ? 'pt-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            {isPremium ? (
              <>
                <h1
                  className="text-3xl md:text-4xl font-bold mb-2"
                  style={{
                    background: isDarkMode ? `linear-gradient(135deg, #fff 0%, ${primaryColor} 50%, ${secondaryColor} 100%)` : undefined,
                    WebkitBackgroundClip: isDarkMode ? 'text' : undefined,
                    WebkitTextFillColor: isDarkMode ? 'transparent' : undefined,
                    backgroundClip: isDarkMode ? 'text' : undefined,
                    color: isDarkMode ? undefined : '#111',
                  }}
                >
                  Productos
                </h1>
                <div className="w-16 h-1 rounded-full mt-3 mb-2" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
              </>
            ) : (
              <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${textMain}`}>
                Productos
              </h1>
            )}
            <p className={textMuted}>
              {productsData.total} productos disponibles
            </p>
          </div>

          {/* Filters */}
          <div className={`${cardBg} shadow-sm p-6 mb-8`}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${iconMuted}`} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar productos..."
                  className={`w-full pl-10 pr-4 py-3 ${isPremium ? 'rounded-xl border' : 'rounded-lg border'} focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${inputBg}`}
                />
              </form>

              {/* Category Filter */}
              <div className="relative">
                <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${iconMuted}`} />
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 ${isPremium ? 'rounded-xl border' : 'rounded-lg border'} focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] appearance-none ${inputBg}`}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active Filters */}
            {(currentSearch || currentCategory) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {currentSearch && (
                  <span className={`inline-flex items-center px-3 py-1 ${isPremium ? 'rounded-full' : 'rounded-full'} text-sm ${tagBg}`}>
                    Búsqueda: {currentSearch}
                    <button
                      onClick={() => {
                        setSearchInput('');
                        updateFilters({ search: undefined });
                      }}
                      className={`ml-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      ×
                    </button>
                  </span>
                )}
                {currentCategory && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${tagBg}`}>
                    Categoría: {currentCategory}
                    <button
                      onClick={() => handleCategoryChange('')}
                      className={`ml-2 ${isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      ×
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Products Grid */}
          <ProductsGrid products={productsData.data} domain={config.domain} isDarkMode={isDarkMode} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center items-center space-x-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`p-2 ${isPremium ? 'rounded-xl' : 'rounded-lg'} border disabled:opacity-50 disabled:cursor-not-allowed ${paginationBtn}`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                const isActive = currentPage === pageNum;

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-4 py-2 ${isPremium ? 'rounded-xl' : 'rounded-lg'} border ${
                      isActive
                        ? isPremium
                          ? 'text-white border-transparent shadow-lg'
                          : 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                        : paginationBtn
                    }`}
                    style={isActive && isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : undefined}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 ${isPremium ? 'rounded-xl' : 'rounded-lg'} border disabled:opacity-50 disabled:cursor-not-allowed ${paginationBtn}`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
