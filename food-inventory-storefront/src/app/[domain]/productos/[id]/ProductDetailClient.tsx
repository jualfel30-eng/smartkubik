'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig, Product } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { ProductCard } from '@/templates/ModernEcommerce/components/ProductCard';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { ShoppingCart, Minus, Plus, Package, Tag, Leaf } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

interface ProductDetailClientProps {
  config: StorefrontConfig;
  product: Product;
  relatedProducts: Product[];
}

export function ProductDetailClient({
  config,
  product,
  relatedProducts,
}: ProductDetailClientProps) {
  const { Header, Footer } = getTemplateComponents(config.templateType);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [addedToCart, setAddedToCart] = useState(false);
  const { openCart } = useCart();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [inputMode, setInputMode] = useState<'weight' | 'money'>('weight'); // Nuevo estado para el modo
  const [moneyAmount, setMoneyAmount] = useState(0); // Nuevo estado para cantidad de dinero

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
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

  // Inicializar unidad por defecto
  useEffect(() => {
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      const defaultUnit = product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0];
      setSelectedUnit(defaultUnit.abbreviation);
      // Establecer cantidad mínima si existe
      if (defaultUnit.minimumQuantity) {
        setQuantity(defaultUnit.minimumQuantity);
      }
    } else if (product.isSoldByWeight && product.unitOfMeasure) {
      // Si se vende por peso pero no tiene sellingUnits, usar unitOfMeasure
      setSelectedUnit(product.unitOfMeasure);
      setQuantity(0.01); // Cantidad mínima por defecto para peso
    }
  }, [product]);

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Buscar producto con misma unidad (un producto puede estar en el carrito con diferentes unidades)
    const existingIndex = cart.findIndex(
      (item: any) =>
        item.product._id === product._id &&
        (item.selectedUnit || 'default') === (selectedUnit || 'default')
    );

    // Calcular precio unitario basado en la unidad seleccionada
    let unitPrice = product.price;
    let conversionFactor = 1;

    if (selectedUnit && product.sellingUnits) {
      const unit = product.sellingUnits.find(u => u.abbreviation === selectedUnit);
      if (unit) {
        unitPrice = unit.pricePerUnit;
        conversionFactor = unit.conversionFactor;
      }
    }

    const cartItem = {
      product,
      quantity,
      selectedUnit: selectedUnit || undefined,
      conversionFactor: conversionFactor !== 1 ? conversionFactor : undefined,
      unitPrice: unitPrice !== product.price ? unitPrice : undefined,
    };

    if (existingIndex >= 0) {
      cart[existingIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    window.dispatchEvent(new Event('cartUpdated'));

    setAddedToCart(true);
    setTimeout(() => {
      setAddedToCart(false);
      openCart();
    }, 500);
  };

  const incrementQuantity = () => setQuantity((prev) => prev + 1);
  const decrementQuantity = () => setQuantity((prev) => Math.max(1, prev - 1));

  // Calcular precio total basado en el peso
  const calculateTotalPrice = () => {
    const unitPrice = product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.pricePerUnit || product.price;
    return quantity * unitPrice;
  };

  // Calcular peso basado en el dinero ingresado
  const calculateWeightFromMoney = (money: number) => {
    const unitPrice = product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.pricePerUnit || product.price;
    return money / unitPrice;
  };

  // Manejar cambio en modo de entrada (peso/dinero)
  const handleModeChange = (mode: 'weight' | 'money') => {
    setInputMode(mode);
    if (mode === 'money') {
      // Si cambia a "por dinero", calcular el dinero equivalente al peso actual
      setMoneyAmount(calculateTotalPrice());
    } else {
      // Si cambia a "por peso", calcular el peso equivalente al dinero actual
      if (moneyAmount > 0) {
        setQuantity(calculateWeightFromMoney(moneyAmount));
      }
    }
  };

  // Manejar cambio en cantidad de dinero
  const handleMoneyChange = (value: number) => {
    setMoneyAmount(value);
    if (value > 0) {
      const calculatedWeight = calculateWeightFromMoney(value);
      setQuantity(calculatedWeight);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-white text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className={`flex items-center space-x-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>
                <Link href={`/${config.domain}`} className={`${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                  Inicio
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href={`/${config.domain}/productos`} className={`${isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}`}>
                  Productos
                </Link>
              </li>
              <li>/</li>
              <li className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{product.name}</li>
            </ol>
          </nav>

          {/* Product Detail */}
          <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm overflow-hidden mb-12`}>
            <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Product Image */}
              <div className={`aspect-square rounded-lg overflow-hidden ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <Image
                  src={getImageUrl((product as any).imageUrl || (product as any).image)}
                  alt={product.name}
                  width={600}
                  height={600}
                  unoptimized
                  className="object-cover w-full h-full"
                  priority
                />
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                {/* Category & SKU */}
                <div className="flex items-center gap-4 mb-4">
                  {product.category && (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      <Tag className="h-4 w-4 mr-1" />
                      {product.category}
                    </span>
                  )}
                  <span className={`inline-flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <Package className="h-4 w-4 mr-1" />
                    SKU: {product.sku}
                  </span>
                </div>

                {/* Name */}
                <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.name}
                </h1>

                {/* Brand */}
                {product.brand && (
                  <p className={`text-lg mb-4 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Marca: <span className="font-medium">{product.brand}</span>
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatPrice(product.price)}
                  </p>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Descripción
                  </h2>
                  <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                    {product.description}
                  </p>
                </div>

                {/* Ingredients */}
                {product.ingredients && (
                  <div className="mb-8">
                    <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Leaf className="h-5 w-5 text-green-500" />
                      Ingredientes
                    </h2>
                    <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
                      {product.ingredients}
                    </p>
                  </div>
                )}

                {/* Unit Selector (solo si tiene sellingUnits) */}
                {product.sellingUnits && product.sellingUnits.length > 0 && (
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Unidad de Venta
                    </label>
                    <select
                      value={selectedUnit}
                      onChange={(e) => {
                        setSelectedUnit(e.target.value);
                        // Resetear cantidad al cambiar unidad
                        const unit = product.sellingUnits?.find(u => u.abbreviation === e.target.value);
                        if (unit?.minimumQuantity) {
                          setQuantity(unit.minimumQuantity);
                        } else {
                          setQuantity(1);
                        }
                      }}
                      className={`w-full px-4 py-2 border rounded-lg ${
                        isDarkMode
                          ? 'bg-gray-800 border-gray-700 text-gray-100'
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      {product.sellingUnits.map(unit => (
                        <option key={unit.abbreviation} value={unit.abbreviation}>
                          {unit.name} ({unit.abbreviation}) - {formatPrice(unit.pricePerUnit)}/{unit.abbreviation}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="mb-6">
                  {/* Si hay unidades de peso, mostrar opciones de peso/dinero */}
                  {product.isSoldByWeight ? (
                    <div className="space-y-4">
                      {/* Título y descripción */}
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          ¿Cómo deseas comprar?
                        </label>
                        <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Puedes indicar el peso deseado o la cantidad de dinero que quieres gastar
                        </p>
                      </div>

                      {/* Botones de modo */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleModeChange('weight')}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                            inputMode === 'weight'
                              ? 'bg-[var(--primary-color)] text-white'
                              : isDarkMode
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Por Peso ({selectedUnit || 'kg'})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('money')}
                          className={`flex-1 py-2 px-4 rounded-lg font-medium transition ${
                            inputMode === 'money'
                              ? 'bg-[var(--primary-color)] text-white'
                              : isDarkMode
                              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          Por Dinero ($)
                        </button>
                      </div>

                      {/* Input según el modo */}
                      {inputMode === 'weight' ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <input
                              type="number"
                              value={quantity}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > 0) {
                                  setQuantity(value);
                                  setMoneyAmount(value * (product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.pricePerUnit || product.price));
                                }
                              }}
                              min={product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.minimumQuantity || 0.01}
                              step={product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.incrementStep || 0.01}
                              className={`flex-1 px-4 py-3 border rounded-lg text-center text-lg font-semibold ${
                                isDarkMode
                                  ? 'bg-gray-800 border-gray-700 text-gray-100'
                                  : 'bg-white border-gray-300'
                              }`}
                              placeholder="0.00"
                            />
                            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              {selectedUnit || 'kg'}
                            </span>
                          </div>
                          {/* Mostrar precio total calculado */}
                          <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Total a pagar:{' '}
                            </span>
                            <span className="text-lg font-bold text-[var(--primary-color)]">
                              {formatPrice(calculateTotalPrice())}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <span className={`text-lg font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              $
                            </span>
                            <input
                              type="number"
                              value={moneyAmount}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > 0) {
                                  handleMoneyChange(value);
                                }
                              }}
                              min={0.01}
                              step={0.01}
                              className={`flex-1 px-4 py-3 border rounded-lg text-center text-lg font-semibold ${
                                isDarkMode
                                  ? 'bg-gray-800 border-gray-700 text-gray-100'
                                  : 'bg-white border-gray-300'
                              }`}
                              placeholder="0.00"
                            />
                          </div>
                          {/* Mostrar peso equivalente calculado */}
                          <div className={`text-center p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                              Recibirás aproximadamente:{' '}
                            </span>
                            <span className="text-lg font-bold text-[var(--primary-color)]">
                              {quantity.toFixed(2)} {selectedUnit || 'kg'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Cantidad
                      </label>
                      {/* Input tradicional con +/- para productos sin peso */}
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={decrementQuantity}
                          className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className={`text-xl font-semibold w-12 text-center ${isDarkMode ? 'text-white' : ''}`}>
                          {quantity}
                        </span>
                        <button
                          onClick={incrementQuantity}
                          className={`p-2 border rounded-lg ${isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50'}`}
                        >
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mostrar info de mínimo/incremento si aplica */}
                  {selectedUnit && product.sellingUnits && (
                    <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {(() => {
                        const unit = product.sellingUnits.find(u => u.abbreviation === selectedUnit);
                        if (!unit) return null;
                        const parts = [];
                        if (unit.minimumQuantity) parts.push(`Mínimo: ${unit.minimumQuantity}${unit.abbreviation}`);
                        if (unit.incrementStep) parts.push(`Incremento: ${unit.incrementStep}${unit.abbreviation}`);
                        return parts.length > 0 ? parts.join(' • ') : null;
                      })()}
                    </p>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  disabled={!product.isActive}
                  className="w-full flex items-center justify-center px-8 py-4 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {addedToCart ? '¡Agregado al carrito!' : 'Agregar al carrito'}
                </button>

                {!product.isActive && (
                  <p className="mt-4 text-red-600 text-center font-medium">
                    Producto no disponible
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              <h2 className={`text-2xl md:text-3xl font-bold mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Productos Relacionados
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((relatedProduct) => (
                  <ProductCard
                    key={relatedProduct._id}
                    product={relatedProduct}
                    domain={config.domain}
                    isDarkMode={isDarkMode}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
