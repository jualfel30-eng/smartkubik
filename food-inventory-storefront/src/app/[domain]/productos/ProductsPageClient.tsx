'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorefrontConfig, ProductsResponse } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { ProductsGrid } from '@/templates/ModernEcommerce/components/ProductsGrid';
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
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(currentSearch || '');
  const [selectedCategory, setSelectedCategory] = useState(currentCategory || '');
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const value = stored === 'dark';
      setIsDarkMode(value);
      document.documentElement.classList.toggle('dark', value);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDark);
    document.documentElement.classList.toggle('dark', prefersDark);
  }, []);

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
    const newCategory = updates.category !== undefined ? updates.category : selectedCategory;
    const newPage = updates.page || currentPage;

    if (newSearch) params.set('search', newSearch);
    if (newCategory) params.set('category', newCategory);
    if (newPage > 1) params.set('page', String(newPage));

    router.push(`/${config.domain}/productos?${params.toString()}`);
  };

  const goToPage = (page: number) => {
    updateFilters({ page });
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Productos
            </h1>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              {productsData.total} productos disponibles
            </p>
          </div>

          {/* Filters */}
          <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 mb-8`}>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Buscar productos..."
                  className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100 placeholder:text-gray-400'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                />
              </form>

              {/* Category Filter */}
              <div className="relative">
                <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] appearance-none ${
                    isDarkMode
                      ? 'bg-gray-800 border border-gray-700 text-gray-100'
                      : 'bg-white border border-gray-300 text-gray-900'
                  }`}
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
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
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
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
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
                className={`p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'
                }`}
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

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-4 py-2 rounded-lg border ${
                      currentPage === pageNum
                        ? 'bg-[var(--primary-color)] text-white border-[var(--primary-color)]'
                        : `${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`p-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${
                  isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'
                }`}
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
