'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig, CartItem, OrderData } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { createOrder } from '@/lib/api';
import { CheckCircle, Loader, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CheckoutPageClientProps {
  config: StorefrontConfig;
}

export function CheckoutPageClient({ config }: CheckoutPageClientProps) {
  const router = useRouter();
  const { customer, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tenantIdOverride, setTenantIdOverride] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
      router.push(`/${config.domain}/carrito`);
      return;
    }
    setCartItems(cart);
    setLoading(false);
  }, [config.domain, router]);

  // Pre-llenar formulario con datos del usuario autenticado
  useEffect(() => {
    if (isAuthenticated && customer) {
      setFormData(prev => ({
        ...prev,
        customerName: customer.name || prev.customerName,
        customerEmail: customer.email || prev.customerEmail,
        customerPhone: customer.phone || prev.customerPhone,
        customerAddress: customer.addresses?.find(a => a.isDefault)?.street || prev.customerAddress,
      }));
    }
  }, [isAuthenticated, customer]);

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

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.unitPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.customerName.trim()) newErrors.customerName = 'El nombre es requerido';
    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email inválido';
    }
    if (!formData.customerPhone.trim()) newErrors.customerPhone = 'El teléfono es requerido';
    if (!formData.customerAddress.trim()) newErrors.customerAddress = 'La dirección es requerida';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const rawTenant =
        tenantIdOverride ??
        (typeof config.tenantId === 'string'
          ? config.tenantId
          : (config.tenantId as any)?._id ?? (config as any)?.tenantId?.id);

      const tenantId = String(rawTenant || '').trim();

      if (!tenantId) {
        throw new Error('No se encontró el tenantId en la configuración del storefront');
      }
      const orderData: OrderData = {
        tenantId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice || item.product.price,
          selectedUnit: item.selectedUnit,
          conversionFactor: item.conversionFactor,
        })),
        total: calculateTotal(),
        notes: formData.notes || undefined,
      };
      const order = await createOrder(orderData);
      localStorage.removeItem('cart');
      setOrderNumber(order.orderNumber || order._id);
      setOrderComplete(true);
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Ocurrió un error al procesar tu orden. Por favor, intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'tenantId') {
      setTenantIdOverride(value);
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : ''}`}>
        <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        <main className="flex-1 flex items-center justify-center">
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Cargando...</p>
        </main>
        <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : ''}`}>
        <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />
        <main className={`flex-1 flex items-center justify-center py-12 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
          <div className="max-w-md w-full mx-4">
            <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-8 text-center`}>
              <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-6 ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'}`}>
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                ¡Orden Confirmada!
              </h1>
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
                Tu orden #{orderNumber} ha sido recibida exitosamente.
                Te contactaremos pronto para confirmar los detalles.
              </p>
              <button
                onClick={() => router.push(`/${config.domain}`)}
                className="w-full px-6 py-3 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </main>
        <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-950 text-gray-100' : ''}`}>
      <Header
        config={config}
        domain={config.domain}
        cartItemsCount={cartItems.length}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />

      <main className={`flex-1 ${isDarkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Finalizar Compra
            </h1>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Completa tus datos para confirmar la orden
            </p>
          </div>

          {/* Auth suggestion banner for non-authenticated users */}
          {!isAuthenticated && (
            <div className={`mb-6 ${isDarkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'} rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <User className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    ¿Ya tienes una cuenta?
                  </h3>
                  <p className={`text-sm mb-3 ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    Inicia sesión para completar tu compra más rápido con tus datos guardados
                  </p>
                  <div className="flex gap-3">
                    <Link
                      href={`/${config.domain}/login?redirect=checkout`}
                      className="text-sm font-medium text-[var(--primary-color)] hover:opacity-80"
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href={`/${config.domain}/registro?redirect=checkout`}
                      className="text-sm font-medium text-[var(--primary-color)] hover:opacity-80"
                    >
                      Crear Cuenta
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Customer Information Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      Información de Contacto
                    </h2>
                    {isAuthenticated && (
                      <span className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'} flex items-center gap-1`}>
                        <User className="w-4 h-4" />
                        Conectado como {customer?.name}
                      </span>
                    )}
                  </div>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="customerName" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerName ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerName && (
                        <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="customerEmail" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Email *
                      </label>
                      <input
                        type="email"
                        id="customerEmail"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerEmail ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerEmail && (
                        <p className="mt-1 text-sm text-red-400">{errors.customerEmail}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="customerPhone" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        id="customerPhone"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerPhone ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerPhone && (
                        <p className="mt-1 text-sm text-red-400">{errors.customerPhone}</p>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="customerAddress" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Dirección de entrega *
                      </label>
                      <input
                        type="text"
                        id="customerAddress"
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerAddress ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerAddress && (
                        <p className="mt-1 text-sm text-red-400">{errors.customerAddress}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Notas adicionales (opcional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                        placeholder="Instrucciones especiales, referencias, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 sticky top-24`}>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Resumen de Orden
                  </h2>

                  {/* Cart Items */}
                  <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.product._id} className="flex gap-3">
                        <div className={`w-16 h-16 rounded overflow-hidden flex-shrink-0 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                          <Image
                            src={getImageUrl((item.product as any).image || (item.product as any).imageUrl || (item.product as any).images?.[0])}
                            alt={item.product.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-medium truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item.product.name}
                          </h3>
                          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Cantidad: {item.quantity}
                          </p>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold">
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>Total</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-4 bg-[var(--primary-color)] text-white font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {submitting ? (
                      <>
                        <Loader className="h-5 w-5 mr-2 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Confirmar Orden'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
