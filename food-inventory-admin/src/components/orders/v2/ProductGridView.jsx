import { useState, useMemo, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Category filter bar — horizontal scroll, searchable ─────────────────────
function CategoryFilterBar({ categories, selected, onSelect }) {
  const [catSearch, setCatSearch] = useState('');
  const [showCatSearch, setShowCatSearch] = useState(false);
  const scrollRef = useRef(null);

  // Sort: "all" first, then alphabetical but could be usage-based in future
  const visibleCategories = useMemo(() => {
    if (!catSearch) return categories;
    const q = catSearch.toLowerCase();
    return categories.filter(
      (c) => c === 'all' || c.toLowerCase().includes(q),
    );
  }, [categories, catSearch]);

  return (
    <div className="space-y-1.5">
      {/* Search toggle + horizontal scroll */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowCatSearch((v) => !v)}
          className={`shrink-0 h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
            showCatSearch
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent'
          }`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>

        <div
          ref={scrollRef}
          className="flex-1 flex gap-1.5 overflow-x-auto scrollbar-none py-0.5"
        >
          {visibleCategories.map((category) => (
            <Badge
              key={category}
              variant={selected === category ? 'default' : 'outline'}
              className="cursor-pointer whitespace-nowrap shrink-0 text-xs h-7 px-2.5"
              onClick={() => onSelect(category)}
            >
              {category === 'all' ? 'Todos' : category}
            </Badge>
          ))}
        </div>
      </div>

      {/* Category search input (toggleable) */}
      {showCatSearch && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Buscar categoría..."
            value={catSearch}
            onChange={(e) => setCatSearch(e.target.value)}
            className="h-8 pl-8 pr-8 text-xs"
          />
          {catSearch && (
            <button
              type="button"
              onClick={() => setCatSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
const ProductGridView = ({
  products = [],
  onProductSelect,
  gridColumns = 3,
  showImages = true,
  showDescription = false,
  enableCategoryFilter = true,
  inventoryMap = {},
  cartItems = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Build cart quantity map for badges
  const cartQtyMap = useMemo(() => {
    const map = {};
    cartItems.forEach((item) => {
      const id = String(item.productId || item._id);
      map[id] = (map[id] || 0) + (item.quantity || 1);
    });
    return map;
  }, [cartItems]);

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach((product) => {
      if (product.category && Array.isArray(product.category)) {
        product.category.forEach((cat) => cats.add(cat));
      }
    });
    return ['all', ...Array.from(cats).sort()];
  }, [products]);

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        searchTerm === '' ||
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        (product.category && product.category.includes(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const getProductImage = (product) => {
    if (product.variants && product.variants.length > 0) {
      const variantWithImage = product.variants.find(
        (v) => v.images && v.images.length > 0,
      );
      if (variantWithImage && variantWithImage.images[0]) {
        return variantWithImage.images[0];
      }
    }
    if (
      product.images &&
      Array.isArray(product.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }
    return null;
  };

  const getProductPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      const activeVariant = product.variants.find(
        (v) => v.isActive !== false,
      );
      if (activeVariant) {
        return activeVariant.basePrice || activeVariant.costPrice || 0;
      }
    }
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      const activeUnit = product.sellingUnits.find((u) => u.isActive);
      if (activeUnit) {
        return activeUnit.pricePerUnit || 0;
      }
    }
    return 0;
  };

  const getInventoryQuantity = (product) => {
    const productId = String(product._id);
    return inventoryMap[productId] || 0;
  };

  const hasStock = () => true;

  const gridColsClass =
    {
      2: 'grid-cols-2 md:grid-cols-2',
      3: 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3',
      4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
      6: 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6',
    }[gridColumns] || 'grid-cols-2 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div>
      {/* Search bar */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar productos por nombre, SKU o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Category filters — horizontal scroll + search */}
        {enableCategoryFilter && categories.length > 1 && (
          <CategoryFilterBar
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />
        )}
      </div>

      {/* Product grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se encontraron productos</p>
          {searchTerm && (
            <p className="text-sm text-muted-foreground mt-1">
              Intenta con otros términos de búsqueda
            </p>
          )}
        </div>
      ) : (
        <div className={`grid gap-2 md:gap-4 ${gridColsClass}`}>
          {filteredProducts.map((product) => {
            const imageUrl = getProductImage(product);
            const price = getProductPrice(product);
            const inStock = hasStock(product);
            const availableQty = getInventoryQuantity(product);
            const cartQty = cartQtyMap[String(product._id)] || 0;

            return (
              <Card
                key={product._id}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg border bg-background p-0 relative ${
                  !inStock ? 'opacity-60 cursor-not-allowed' : ''
                } ${cartQty > 0 ? 'ring-1 ring-primary/40' : ''}`}
                onClick={() => inStock && onProductSelect({ product })}
              >
                {/* Cart quantity badge */}
                {cartQty > 0 && (
                  <div className="absolute top-1.5 right-1.5 z-10 min-w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg px-1.5">
                    {cartQty}
                  </div>
                )}

                {/* Product image */}
                {showImages && (
                  <div className="relative aspect-square bg-muted flex items-center justify-center overflow-hidden rounded-t-lg border-b">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="flex items-center justify-center w-full h-full text-4xl md:text-6xl">
                              📦
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <span className="text-4xl md:text-6xl">📦</span>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">
                          SIN STOCK
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Product info */}
                <CardContent className="p-2.5">
                  <h3 className="font-semibold text-sm leading-tight mb-1.5 line-clamp-2">
                    {product.name}
                  </h3>

                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {product.sku && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1"
                      >
                        {product.sku}
                      </Badge>
                    )}
                    {product.brand && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1"
                      >
                        {product.brand}
                      </Badge>
                    )}
                  </div>

                  {showDescription && product.description && (
                    <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                      {product.description}
                    </p>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-primary">
                      ${price.toFixed(2)}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-4 px-1.5 bg-success/5 text-success border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                    >
                      Stock: {availableQty}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProductGridView;
