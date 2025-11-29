import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Search, Package, TrendingUp, UserX } from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { debounce } from 'lodash';

/**
 * ProductSelector - Component for Product Affinity Marketing (Phase 2)
 *
 * Allows marketers to target customers based on product purchase history:
 * - "Customers who purchased Product X"
 * - "Customers who purchased X but not in 30 days" (win-back)
 * - "Customers who never purchased Product Y" (cross-sell)
 *
 * @param {object} value - Current product filters { productIds, excludeProductIds, minPurchaseCount, maxDaysSinceLastProductPurchase }
 * @param {function} onChange - Callback when filters change
 */
export default function ProductSelector({ value = {}, onChange }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('purchased'); // 'purchased' | 'never-purchased'

  // Selected products for "purchased" mode
  const selectedProducts = value.productIds || [];
  const selectedProductsData = products.filter(p => selectedProducts.includes(p._id));

  // Selected products for "never purchased" mode (cross-sell)
  const excludedProducts = value.excludeProductIds || [];
  const excludedProductsData = products.filter(p => excludedProducts.includes(p._id));

  // Fetch products based on search query
  const fetchProducts = useMemo(
    () =>
      debounce(async (query) => {
        if (!query || query.length < 2) {
          setProducts([]);
          return;
        }

        setLoading(true);
        try {
          const response = await fetchApi(`/products?search=${encodeURIComponent(query)}&limit=20`);
          setProducts(response.data || []);
        } catch (error) {
          console.error('Error fetching products:', error);
          setProducts([]);
        } finally {
          setLoading(false);
        }
      }, 300),
    []
  );

  useEffect(() => {
    fetchProducts(searchQuery);
  }, [searchQuery, fetchProducts]);

  const handleModeChange = (newMode) => {
    setMode(newMode);

    // Clear filters when switching modes
    if (newMode === 'purchased') {
      onChange?.({
        ...value,
        excludeProductIds: undefined,
      });
    } else {
      onChange?.({
        ...value,
        productIds: undefined,
        minPurchaseCount: undefined,
        maxDaysSinceLastProductPurchase: undefined,
      });
    }
  };

  const handleAddProduct = (product) => {
    if (mode === 'purchased') {
      const newProductIds = [...selectedProducts, product._id];
      onChange?.({
        ...value,
        productIds: newProductIds,
      });
    } else {
      const newExcludedIds = [...excludedProducts, product._id];
      onChange?.({
        ...value,
        excludeProductIds: newExcludedIds,
      });
    }
    setSearchQuery('');
    setProducts([]);
  };

  const handleRemoveProduct = (productId) => {
    if (mode === 'purchased') {
      const newProductIds = selectedProducts.filter(id => id !== productId);
      onChange?.({
        ...value,
        productIds: newProductIds.length > 0 ? newProductIds : undefined,
      });
    } else {
      const newExcludedIds = excludedProducts.filter(id => id !== productId);
      onChange?.({
        ...value,
        excludeProductIds: newExcludedIds.length > 0 ? newExcludedIds : undefined,
      });
    }
  };

  const handleMinPurchaseCountChange = (e) => {
    const val = e.target.value;
    onChange?.({
      ...value,
      minPurchaseCount: val ? parseInt(val, 10) : undefined,
    });
  };

  const handleMaxDaysChange = (e) => {
    const val = e.target.value;
    onChange?.({
      ...value,
      maxDaysSinceLastProductPurchase: val ? parseInt(val, 10) : undefined,
    });
  };

  return (
    <Card className="dark:bg-gray-800 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 dark:text-gray-100">
          <Package className="w-5 h-5" />
          Filtro por Productos (Product Affinity)
        </CardTitle>
        <CardDescription className="dark:text-gray-400">
          Crea campañas basadas en el historial de compras de productos específicos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Selector */}
        <div className="space-y-2">
          <Label className="dark:text-gray-200">Tipo de Campaña</Label>
          <Select value={mode} onValueChange={handleModeChange}>
            <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              <SelectItem value="purchased" className="dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Clientes que compraron producto(s)</span>
                </div>
              </SelectItem>
              <SelectItem value="never-purchased" className="dark:text-gray-200">
                <div className="flex items-center gap-2">
                  <UserX className="w-4 h-4" />
                  <span>Clientes que NUNCA compraron (Cross-sell)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Product Search */}
        <div className="space-y-2">
          <Label className="dark:text-gray-200">
            {mode === 'purchased' ? 'Buscar Producto Comprado' : 'Buscar Producto NO Comprado'}
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar por nombre de producto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
          </div>

          {/* Product search results dropdown */}
          {searchQuery.length >= 2 && (
            <div className="border rounded-md max-h-48 overflow-y-auto dark:border-gray-600 dark:bg-gray-900">
              {loading ? (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">Buscando...</div>
              ) : products.length > 0 ? (
                <div className="divide-y dark:divide-gray-700">
                  {products.map((product) => {
                    const isAlreadySelected = mode === 'purchased'
                      ? selectedProducts.includes(product._id)
                      : excludedProducts.includes(product._id);

                    return (
                      <button
                        key={product._id}
                        onClick={() => !isAlreadySelected && handleAddProduct(product)}
                        disabled={isAlreadySelected}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                          isAlreadySelected ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium dark:text-gray-200">{product.name}</div>
                            {product.category && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {product.category}
                              </div>
                            )}
                          </div>
                          {product.price && (
                            <div className="text-sm font-medium dark:text-gray-300">
                              ${product.price}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 text-sm text-gray-500 dark:text-gray-400">
                  No se encontraron productos
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Products (Purchased Mode) */}
        {mode === 'purchased' && selectedProductsData.length > 0 && (
          <div className="space-y-2">
            <Label className="dark:text-gray-200">Productos Seleccionados</Label>
            <div className="flex flex-wrap gap-2">
              {selectedProductsData.map((product) => (
                <Badge
                  key={product._id}
                  variant="secondary"
                  className="flex items-center gap-1 dark:bg-blue-900 dark:text-blue-100"
                >
                  {product.name}
                  <button
                    onClick={() => handleRemoveProduct(product._id)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>

            {/* Additional filters for purchased mode */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="minPurchaseCount" className="dark:text-gray-200">
                  Mínimo de Compras
                </Label>
                <Input
                  id="minPurchaseCount"
                  type="number"
                  min="1"
                  placeholder="ej: 3"
                  value={value.minPurchaseCount || ''}
                  onChange={handleMinPurchaseCountChange}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clientes que compraron el producto al menos N veces
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxDays" className="dark:text-gray-200">
                  Días Sin Comprar (Win-back)
                </Label>
                <Input
                  id="maxDays"
                  type="number"
                  min="0"
                  placeholder="ej: 30"
                  value={value.maxDaysSinceLastProductPurchase || ''}
                  onChange={handleMaxDaysChange}
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Clientes que no compraron en los últimos N días
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Selected Products (Never Purchased Mode - Cross-sell) */}
        {mode === 'never-purchased' && excludedProductsData.length > 0 && (
          <div className="space-y-2">
            <Label className="dark:text-gray-200">Productos que NO han comprado</Label>
            <div className="flex flex-wrap gap-2">
              {excludedProductsData.map((product) => (
                <Badge
                  key={product._id}
                  variant="secondary"
                  className="flex items-center gap-1 dark:bg-orange-900 dark:text-orange-100"
                >
                  {product.name}
                  <button
                    onClick={() => handleRemoveProduct(product._id)}
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-orange-50 dark:bg-orange-900/20 p-3 rounded border border-orange-200 dark:border-orange-800">
              💡 <strong>Cross-sell:</strong> Clientes que nunca han probado estos productos.
              Perfectos para campañas de descubrimiento o introducción de nuevos productos.
            </p>
          </div>
        )}

        {/* Info when no products selected */}
        {selectedProductsData.length === 0 && excludedProductsData.length === 0 && (
          <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded border border-gray-200 dark:border-gray-700">
            <p className="font-medium mb-2">💡 Ejemplos de campañas por producto:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong>Win-back:</strong> "Clientes que compraron Hamburguesa Premium hace 30+ días"</li>
              <li><strong>Upsell:</strong> "Clientes diamante que compraron café 5+ veces"</li>
              <li><strong>Cross-sell:</strong> "Clientes que nunca probaron el postre especial"</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
