'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { StorefrontConfig, Product } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
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
  const { Header, Footer, ProductCard } = getTemplateComponents(config.templateType);
  const isPremium = config.templateType === 'premium';
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState<string>('');
  const [addedToCart, setAddedToCart] = useState(false);
  const { openCart } = useCart();
  const [isDarkMode, setIsDarkMode] = useState(isPremium);
  const [inputMode, setInputMode] = useState<'weight' | 'money'>('weight');
  const [moneyAmount, setMoneyAmount] = useState(0);

  const primaryColor = config.theme?.primaryColor || '#6366f1';
  const secondaryColor = config.theme?.secondaryColor || '#ec4899';

  useEffect(() => {
    const stored = localStorage.getItem('storefront_theme');
    if (stored) {
      const val = stored === 'dark';
      setIsDarkMode(val);
      document.documentElement.classList.toggle('dark', val);
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

  useEffect(() => {
    if (product.sellingUnits && product.sellingUnits.length > 0) {
      const defaultUnit = product.sellingUnits.find(u => u.isDefault) || product.sellingUnits[0];
      setSelectedUnit(defaultUnit.abbreviation);
      if (defaultUnit.minimumQuantity) {
        setQuantity(defaultUnit.minimumQuantity);
      }
    } else if (product.isSoldByWeight && product.unitOfMeasure) {
      setSelectedUnit(product.unitOfMeasure);
      setQuantity(0.01);
    }
  }, [product]);

  const handleAddToCart = () => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingIndex = cart.findIndex(
      (item: any) =>
        item.product._id === product._id &&
        (item.selectedUnit || 'default') === (selectedUnit || 'default')
    );

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

  const calculateTotalPrice = () => {
    const unitPrice = product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.pricePerUnit || product.price;
    return quantity * unitPrice;
  };

  const calculateWeightFromMoney = (money: number) => {
    const unitPrice = product.sellingUnits?.find(u => u.abbreviation === selectedUnit)?.pricePerUnit || product.price;
    return money / unitPrice;
  };

  const handleModeChange = (mode: 'weight' | 'money') => {
    setInputMode(mode);
    if (mode === 'money') {
      setMoneyAmount(calculateTotalPrice());
    } else {
      if (moneyAmount > 0) {
        setQuantity(calculateWeightFromMoney(moneyAmount));
      }
    }
  };

  const handleMoneyChange = (value: number) => {
    setMoneyAmount(value);
    if (value > 0) {
      setQuantity(calculateWeightFromMoney(value));
    }
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
  const inputCls = isPremium
    ? (isDarkMode ? 'bg-white/5 border-white/10 text-gray-100' : 'bg-white border-gray-200 text-gray-900')
    : (isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100' : 'bg-white border-gray-300');
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const textSub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const imgBg = isPremium
    ? (isDarkMode ? 'bg-white/5' : 'bg-gray-100')
    : (isDarkMode ? 'bg-gray-800' : 'bg-gray-100');
  const calcBg = isPremium
    ? (isDarkMode ? 'bg-white/5 border border-white/10 rounded-xl' : 'bg-gray-50 rounded-xl')
    : (isDarkMode ? 'bg-gray-800' : 'bg-gray-50');
  const qtyBtnCls = isPremium
    ? (isDarkMode ? 'border-white/10 text-gray-200 hover:bg-white/5 rounded-xl' : 'border-gray-200 hover:bg-gray-50 rounded-xl')
    : (isDarkMode ? 'border-gray-700 text-gray-200 hover:bg-gray-800' : 'border-gray-300 hover:bg-gray-50');
  const modeBtnCls = (active: boolean) => active
    ? 'text-white shadow-lg'
    : (isDarkMode
      ? (isPremium ? 'bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10' : 'bg-gray-800 text-gray-300 hover:bg-gray-700')
      : 'bg-gray-100 text-gray-700 hover:bg-gray-200');

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${mainBg} ${isPremium ? 'pt-16' : ''}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Breadcrumb */}
          <nav className="mb-8 text-sm">
            <ol className={`flex items-center space-x-2 ${textMuted}`}>
              <li><Link href={`/${config.domain}`} className={isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}>Inicio</Link></li>
              <li>/</li>
              <li><Link href={`/${config.domain}/productos`} className={isDarkMode ? 'hover:text-white' : 'hover:text-gray-900'}>Productos</Link></li>
              <li>/</li>
              <li className={`${textMain} font-medium`}>{product.name}</li>
            </ol>
          </nav>

          {/* Product Detail */}
          <div className={`${cardBg} shadow-sm overflow-hidden mb-12`}>
            <div className="grid md:grid-cols-2 gap-8 p-6 md:p-8">
              {/* Product Image */}
              <div className={`aspect-square ${isPremium ? 'rounded-2xl' : 'rounded-lg'} overflow-hidden relative ${imgBg}`}>
                <Image
                  src={getImageUrl((product as any).imageUrl || (product as any).image)}
                  alt={product.name}
                  width={600}
                  height={600}
                  unoptimized
                  className="object-cover w-full h-full"
                  priority
                />
                {isPremium && isDarkMode && (
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a1a]/30 to-transparent" />
                )}
              </div>

              {/* Product Info */}
              <div className="flex flex-col">
                {/* Category & SKU */}
                <div className="flex items-center gap-4 mb-4">
                  {product.category && (
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium`}
                      style={isPremium ? { background: `${primaryColor}15`, color: primaryColor } : undefined}
                    >
                      <Tag className="h-4 w-4 mr-1" />
                      {product.category}
                    </span>
                  )}
                  <span className={`inline-flex items-center text-sm ${textSub}`}>
                    <Package className="h-4 w-4 mr-1" />
                    SKU: {product.sku}
                  </span>
                </div>

                {/* Name */}
                {isPremium && isDarkMode ? (
                  <h1
                    className="text-3xl md:text-4xl font-bold mb-4"
                    style={{
                      background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 80%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    {product.name}
                  </h1>
                ) : (
                  <h1 className={`text-3xl md:text-4xl font-bold mb-4 ${textMain}`}>{product.name}</h1>
                )}

                {/* Brand */}
                {product.brand && (
                  <p className={`text-lg mb-4 ${textMuted}`}>
                    Marca: <span className="font-medium">{product.brand}</span>
                  </p>
                )}

                {/* Price */}
                <div className="mb-6">
                  <p className="text-4xl font-bold" style={isPremium ? { color: primaryColor } : undefined}>
                    {!isPremium ? <span className={textMain}>{formatPrice(product.price)}</span> : formatPrice(product.price)}
                  </p>
                </div>

                {/* Description */}
                <div className="mb-8">
                  <h2 className={`text-lg font-semibold mb-2 ${textMain}`}>Descripción</h2>
                  <p className={`${textMuted} leading-relaxed`}>{product.description}</p>
                </div>

                {/* Ingredients */}
                {product.ingredients && (
                  <div className="mb-8">
                    <h2 className={`text-lg font-semibold mb-2 flex items-center gap-2 ${textMain}`}>
                      <Leaf className="h-5 w-5 text-green-500" />
                      Ingredientes
                    </h2>
                    <p className={`${textMuted} leading-relaxed`}>{product.ingredients}</p>
                  </div>
                )}

                {/* Unit Selector */}
                {product.sellingUnits && product.sellingUnits.length > 0 && (
                  <div className="mb-6">
                    <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                      Unidad de Venta
                    </label>
                    <select
                      value={selectedUnit}
                      onChange={(e) => {
                        setSelectedUnit(e.target.value);
                        const unit = product.sellingUnits?.find(u => u.abbreviation === e.target.value);
                        setQuantity(unit?.minimumQuantity || 1);
                      }}
                      className={`w-full px-4 py-2 border ${isPremium ? 'rounded-xl' : 'rounded-lg'} ${inputCls}`}
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
                  {product.isSoldByWeight ? (
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                          ¿Cómo deseas comprar?
                        </label>
                        <p className={`text-xs ${textSub}`}>
                          Puedes indicar el peso deseado o la cantidad de dinero que quieres gastar
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleModeChange('weight')}
                          className={`flex-1 py-2 px-4 ${isPremium ? 'rounded-xl' : 'rounded-lg'} font-medium transition ${modeBtnCls(inputMode === 'weight')}`}
                          style={inputMode === 'weight' ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : undefined}
                        >
                          Por Peso ({selectedUnit || 'kg'})
                        </button>
                        <button
                          type="button"
                          onClick={() => handleModeChange('money')}
                          className={`flex-1 py-2 px-4 ${isPremium ? 'rounded-xl' : 'rounded-lg'} font-medium transition ${modeBtnCls(inputMode === 'money')}`}
                          style={inputMode === 'money' ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : undefined}
                        >
                          Por Dinero ($)
                        </button>
                      </div>

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
                              className={`flex-1 px-4 py-3 border ${isPremium ? 'rounded-xl' : 'rounded-lg'} text-center text-lg font-semibold ${inputCls}`}
                              placeholder="0.00"
                            />
                            <span className={`text-sm font-medium ${textSub}`}>{selectedUnit || 'kg'}</span>
                          </div>
                          <div className={`text-center p-3 ${calcBg} rounded-lg`}>
                            <span className={`text-sm ${textSub}`}>Total a pagar: </span>
                            <span className="text-lg font-bold text-[var(--primary-color)]">{formatPrice(calculateTotalPrice())}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4">
                            <span className={`text-lg font-medium ${textSub}`}>$</span>
                            <input
                              type="number"
                              value={moneyAmount}
                              onChange={(e) => {
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > 0) handleMoneyChange(value);
                              }}
                              min={0.01}
                              step={0.01}
                              className={`flex-1 px-4 py-3 border ${isPremium ? 'rounded-xl' : 'rounded-lg'} text-center text-lg font-semibold ${inputCls}`}
                              placeholder="0.00"
                            />
                          </div>
                          <div className={`text-center p-3 ${calcBg} rounded-lg`}>
                            <span className={`text-sm ${textSub}`}>Recibirás aproximadamente: </span>
                            <span className="text-lg font-bold text-[var(--primary-color)]">{quantity.toFixed(2)} {selectedUnit || 'kg'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Cantidad</label>
                      <div className="flex items-center space-x-4">
                        <button onClick={decrementQuantity} className={`p-2 border ${qtyBtnCls}`}>
                          <Minus className="h-5 w-5" />
                        </button>
                        <span className={`text-xl font-semibold w-12 text-center ${textMain}`}>{quantity}</span>
                        <button onClick={incrementQuantity} className={`p-2 border ${qtyBtnCls}`}>
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedUnit && product.sellingUnits && (
                    <p className={`mt-2 text-sm ${textSub}`}>
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
                  className={`w-full flex items-center justify-center px-8 py-4 text-white font-semibold ${isPremium ? 'rounded-xl hover:shadow-xl' : 'rounded-lg'} hover:opacity-90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed`}
                  style={isPremium ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` } : { backgroundColor: 'var(--primary-color)' }}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  {addedToCart ? '¡Agregado al carrito!' : 'Agregar al carrito'}
                </button>

                {!product.isActive && (
                  <p className="mt-4 text-red-500 text-center font-medium">Producto no disponible</p>
                )}
              </div>
            </div>
          </div>

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <div>
              {isPremium && isDarkMode ? (
                <>
                  <h2
                    className="text-2xl md:text-3xl font-bold mb-2"
                    style={{
                      background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 80%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Productos Relacionados
                  </h2>
                  <div className="w-16 h-1 rounded-full mb-8" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
                </>
              ) : (
                <h2 className={`text-2xl md:text-3xl font-bold mb-8 ${textMain}`}>Productos Relacionados</h2>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedProducts.map((rp) => (
                  <ProductCard key={rp._id} product={rp} domain={config.domain} isDarkMode={isDarkMode} />
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
