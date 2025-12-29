import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ProductListView = ({
  products = [],
  onProductSelect,
  inventoryMap = {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = searchTerm === '' ||
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.brand?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [products, searchTerm]);

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

  return (
    <div>
      {/* Barra de búsqueda */}
      <div className="mb-4">
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
      </div>

      {/* Grid compacto de productos - 3 columnas */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {filteredProducts.map((product) => {
            const price = getProductPrice(product);
            const availableQty = getInventoryQuantity(product);

            return (
              <Card
                key={product._id}
                onClick={() => onProductSelect({ product })}
                className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
              >
                <CardContent className="p-3">
                  {/* Nombre del producto */}
                  <h3 className="font-semibold text-sm leading-tight mb-2 line-clamp-2 min-h-[2.5rem]">
                    {product.name}
                  </h3>

                  {/* SKU y Marca */}
                  <div className="flex gap-1 flex-wrap mb-2">
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

                  {/* Precio y Stock */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-lg font-bold text-primary">
                      ${price.toFixed(2)}
                    </div>
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

export default ProductListView;
