import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductGridView = ({
  products = [],
  onProductSelect,
  gridColumns = 3,
  showImages = true,
  showDescription = false,
  enableCategoryFilter = true,
  inventoryMap = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Extraer categorías únicas
  const categories = useMemo(() => {
    const cats = new Set();
    products.forEach(product => {
      if (product.category && Array.isArray(product.category)) {
        product.category.forEach(cat => cats.add(cat));
      }
    });
    return ['all', ...Array.from(cats)];
  }, [products]);

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchTerm === '' ||
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = selectedCategory === 'all' ||
        (product.category && product.category.includes(selectedCategory));

      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  // Obtener la primera imagen del producto o variante
  const getProductImage = (product) => {
    // Primero intentar obtener de las variantes
    if (product.variants && product.variants.length > 0) {
      const variantWithImage = product.variants.find(v => v.images && v.images.length > 0);
      if (variantWithImage && variantWithImage.images[0]) {
        return variantWithImage.images[0];
      }
    }

    // Fallback: intentar con el campo images directo del producto (si existe)
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0];
    }

    return null;
  };

  // Obtener precio del producto
  const getProductPrice = (product) => {
    if (product.variants && product.variants.length > 0) {
      const activeVariant = product.variants.find(v => v.isActive !== false);
      if (activeVariant) {
        return activeVariant.basePrice || activeVariant.costPrice || 0;
      }
    }
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      const activeUnit = product.sellingUnits.find(u => u.isActive);
      if (activeUnit) {
        return activeUnit.pricePerUnit || 0;
      }
    }
    return 0;
  };

  // Obtener cantidad disponible en inventario
  const getInventoryQuantity = (product) => {
    const productId = String(product._id);
    return inventoryMap[productId] || 0;
  };

  const hasStock = () => {
    // Si el producto está en la lista, significa que tiene stock disponible
    // porque NewOrderFormV2 ya filtra solo productos con inventario disponible
    return true;
  };

  const gridColsClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
    6: 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6',
  }[gridColumns] || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <div>
      {/* Barra de búsqueda */}
      <div className="mb-4 space-y-3">
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

        {/* Filtros de categoría */}
        {enableCategoryFilter && categories.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'Todas' : category}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Grid de productos */}
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
        <div className={`grid gap-4 ${gridColsClass}`}>
          {filteredProducts.map((product) => {
            const imageUrl = getProductImage(product);
            const price = getProductPrice(product);
            const inStock = hasStock(product);
            const availableQty = getInventoryQuantity(product);

            return (
              <Card
                key={product._id}
                className={`overflow-hidden cursor-pointer transition-all hover:shadow-lg border bg-background p-0 ${
                  !inStock ? 'opacity-60 cursor-not-allowed' : ''
                }`}
                onClick={() => inStock && onProductSelect({ product })}
              >
                {/* Imagen del producto - 70% sin borde superior */}
                {showImages && (
                  <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden rounded-t-lg border-b">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = `
                            <div class="flex items-center justify-center w-full h-full text-6xl">
                              📦
                            </div>
                          `;
                        }}
                      />
                    ) : (
                      <span className="text-6xl">📦</span>
                    )}
                    {!inStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">SIN STOCK</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Información del producto - 30% compacto */}
                <CardContent className="p-2.5">
                  {/* Nombre del producto - más compacto */}
                  <h3 className="font-semibold text-sm leading-tight mb-1.5 line-clamp-2">
                    {product.name}
                  </h3>

                  {/* SKU y marca - más pequeños */}
                  <div className="flex gap-1 flex-wrap mb-1.5">
                    {product.sku && (
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {product.sku}
                      </Badge>
                    )}
                    {product.brand && (
                      <Badge variant="secondary" className="text-[10px] h-4 px-1">
                        {product.brand}
                      </Badge>
                    )}
                  </div>

                  {/* Descripción (opcional) - solo si está habilitada */}
                  {showDescription && product.description && (
                    <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                      {product.description}
                    </p>
                  )}

                  {/* Precio y stock - destacado */}
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-primary">
                      ${price.toFixed(2)}
                    </span>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5 bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
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
