'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { StorefrontConfig, CartItem, OrderData } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { createOrder, getPaymentMethods, calculateDeliveryCost } from '@/lib/api';
import { CheckCircle, Loader, User, MapPin, CreditCard, Truck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface CheckoutPageClientProps {
  config: StorefrontConfig;
}

interface PaymentMethod {
  methodId: string;
  name: string;
  currency?: string;
  instructions?: string;
  igtfApplicable?: boolean;
}

export function CheckoutPageClientEnhanced({ config }: CheckoutPageClientProps) {
  const router = useRouter();
  const { customer, isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tenantIdOverride, setTenantIdOverride] = useState<string | null>(null);

  // Payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Delivery state
  const [deliveryCost, setDeliveryCost] = useState(0);
  const [calculatingDelivery, setCalculatingDelivery] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    shippingMethod: 'pickup' as 'pickup' | 'delivery',
    selectedPaymentMethod: '',
    notes: '',
  });

  const [locationData, setLocationData] = useState<{ lat: number; lng: number } | null>(null);
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

  // Pre-fill form with authenticated user data
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

  // Load payment methods
  useEffect(() => {
    const loadPaymentMethods = async () => {
      setLoadingPaymentMethods(true);
      try {
        const rawTenant = tenantIdOverride ?? (
          typeof config.tenantId === 'string'
            ? config.tenantId
            : (config.tenantId as any)?._id ?? (config as any)?.tenantId?.id
        );
        const tenantId = String(rawTenant || '').trim();

        if (tenantId) {
          const methods = await getPaymentMethods(tenantId);
          setPaymentMethods(methods);
          if (methods.length > 0) {
            setFormData(prev => ({ ...prev, selectedPaymentMethod: methods[0].methodId }));
          }
        }
      } catch (error) {
        console.error('Error loading payment methods:', error);
      } finally {
        setLoadingPaymentMethods(false);
      }
    };

    loadPaymentMethods();
  }, [config.tenantId, tenantIdOverride]);

  // Theme handling
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

  const calculateSubtotal = () => {
    return cartItems.reduce((sum, item) => {
      const price = item.unitPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + deliveryCost;
  };

  // Get user location for delivery calculation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setCalculatingDelivery(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocationData({ lat: latitude, lng: longitude });

        // Calculate delivery cost
        try {
          const rawTenant = tenantIdOverride ?? (
            typeof config.tenantId === 'string'
              ? config.tenantId
              : (config.tenantId as any)?._id ?? (config as any)?.tenantId?.id
          );
          const tenantId = String(rawTenant || '').trim();

          if (tenantId) {
            const result = await calculateDeliveryCost(
              tenantId,
              { lat: latitude, lng: longitude },
              calculateSubtotal()
            );
            setDeliveryCost(result.cost);
            setDeliveryInfo(result);
          }
        } catch (error) {
          console.error('Error calculating delivery:', error);
          alert('No pudimos calcular el costo de delivery. Usando tarifa estándar.');
          setDeliveryCost(5);
        } finally {
          setCalculatingDelivery(false);
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('No pudimos obtener tu ubicación. Por favor, ingresa tu dirección manualmente.');
        setCalculatingDelivery(false);
      }
    );
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
    if (formData.shippingMethod === 'delivery' && !formData.customerAddress.trim()) {
      newErrors.customerAddress = 'La dirección es requerida para delivery';
    }
    if (!formData.selectedPaymentMethod) {
      newErrors.selectedPaymentMethod = 'Selecciona un método de pago';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const rawTenant = tenantIdOverride ?? (
        typeof config.tenantId === 'string'
          ? config.tenantId
          : (config.tenantId as any)?._id ?? (config as any)?.tenantId?.id
      );
      const tenantId = String(rawTenant || '').trim();

      if (!tenantId) {
        throw new Error('No se encontró el tenantId en la configuración del storefront');
      }

      const orderData: OrderData = {
        tenantId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        shippingMethod: formData.shippingMethod,
        shippingAddress: formData.shippingMethod === 'delivery' ? {
          street: formData.customerAddress,
          city: '', // Should be captured in form
          state: '',
          country: '',
          coordinates: locationData || undefined,
        } : undefined,
        selectedPaymentMethod: formData.selectedPaymentMethod,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'tenantId') {
      setTenantIdOverride(value);
    }

    if (name === 'shippingMethod') {
      setFormData((prev) => ({ ...prev, [name]: value as 'pickup' | 'delivery' }));
      if (value === 'pickup') {
        setDeliveryCost(0);
        setLocationData(null);
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const generateWhatsAppLink = () => {
    const phone = config.whatsappIntegration?.businessPhone || config.contactInfo.phone;
    const message = `Hola! Acabo de completar mi orden #${orderNumber}. ¿Podrían confirmarla?`;
    return `https://wa.me/${(phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
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
    const whatsappLink = generateWhatsAppLink();

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
              <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>
                Tu orden <span className="font-semibold">#{orderNumber}</span> ha sido recibida exitosamente.
              </p>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} mb-6`}>
                En breve recibirás un mensaje por WhatsApp con los detalles de pago y seguimiento.
              </p>

              {config.whatsappIntegration?.enabled && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full mb-3 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition"
                >
                  📱 Confirmar por WhatsApp
                </a>
              )}

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
          <div className="mb-8">
            <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Finalizar Compra
            </h1>
            <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
              Completa tus datos para confirmar la orden
            </p>
          </div>

          {!isAuthenticated && (
            <div className={`mb-6 ${isDarkMode ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'} rounded-lg p-4`}>
              <div className="flex items-start gap-3">
                <User className={`w-5 h-5 mt-0.5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <div className="flex-1">
                  <h3 className={`font-semibold mb-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-900'}`}>
                    ¿Ya tienes una cuenta?
                  </h3>
                  <p className={`text-sm mb-3 ${isDarkMode ? 'text-blue-200' : 'text-blue-700'}`}>
                    Inicia sesión para completar tu compra más rápido
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
              <div className="lg:col-span-2 space-y-6">
                {/* Customer Information */}
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Información de Contacto
                  </h2>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerName ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerName && <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Email *
                      </label>
                      <input
                        type="email"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerEmail ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerEmail && <p className="mt-1 text-sm text-red-400">{errors.customerEmail}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Teléfono / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="+58 412 1234567"
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerPhone ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                          }`}
                      />
                      {errors.customerPhone && <p className="mt-1 text-sm text-red-400">{errors.customerPhone}</p>}
                    </div>
                  </div>
                </div>

                {/* Shipping Method */}
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <Truck className="inline w-6 h-6 mr-2" />
                    Método de Entrega
                  </h2>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <label className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${formData.shippingMethod === 'pickup'
                        ? 'border-[var(--primary-color)] bg-blue-50 dark:bg-blue-900/20'
                        : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                        }`}>
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="pickup"
                          checked={formData.shippingMethod === 'pickup'}
                          onChange={handleInputChange}
                          className="w-5 h-5"
                        />
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Retiro en tienda (Gratis)</span>
                      </label>

                      <label className={`flex-1 flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${formData.shippingMethod === 'delivery'
                        ? 'border-[var(--primary-color)] bg-blue-50 dark:bg-blue-900/20'
                        : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                        }`}>
                        <input
                          type="radio"
                          name="shippingMethod"
                          value="delivery"
                          checked={formData.shippingMethod === 'delivery'}
                          onChange={handleInputChange}
                          className="w-5 h-5"
                        />
                        <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>Delivery</span>
                      </label>
                    </div>

                    {formData.shippingMethod === 'delivery' && (
                      <div className="space-y-4">
                        <div>
                          <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                            Dirección de entrega *
                          </label>
                          <input
                            type="text"
                            name="customerAddress"
                            value={formData.customerAddress}
                            onChange={handleInputChange}
                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${errors.customerAddress ? 'border-red-500' : isDarkMode ? 'border-gray-700 bg-gray-800 text-gray-100' : 'border-gray-300'
                              }`}
                          />
                          {errors.customerAddress && <p className="mt-1 text-sm text-red-400">{errors.customerAddress}</p>}
                        </div>

                        <button
                          type="button"
                          onClick={handleGetLocation}
                          disabled={calculatingDelivery}
                          className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                          {calculatingDelivery ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin" />
                              Calculando...
                            </>
                          ) : (
                            <>
                              <MapPin className="w-4 h-4" />
                              Obtener mi ubicación y calcular envío
                            </>
                          )}
                        </button>

                        {deliveryInfo && (
                          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {deliveryInfo.freeDelivery ? (
                                <span className="font-semibold text-green-600">¡Envío Gratis!</span>
                              ) : (
                                <>
                                  Costo de envío: <span className="font-semibold">${deliveryCost.toFixed(2)}</span>
                                  {deliveryInfo.distance && ` (${deliveryInfo.distance.toFixed(1)} km)`}
                                  {deliveryInfo.zone && ` - ${deliveryInfo.zone}`}
                                </>
                              )}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method */}
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    <CreditCard className="inline w-6 h-6 mr-2" />
                    Método de Pago
                  </h2>
                  {loadingPaymentMethods ? (
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cargando métodos de pago...</p>
                  ) : paymentMethods.length === 0 ? (
                    <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No hay métodos de pago configurados</p>
                  ) : (
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <label
                          key={method.methodId}
                          className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition ${formData.selectedPaymentMethod === method.methodId
                            ? 'border-[var(--primary-color)] bg-blue-50 dark:bg-blue-900/20'
                            : isDarkMode ? 'border-gray-700' : 'border-gray-300'
                            }`}
                        >
                          <input
                            type="radio"
                            name="selectedPaymentMethod"
                            value={method.methodId}
                            checked={formData.selectedPaymentMethod === method.methodId}
                            onChange={handleInputChange}
                            className="w-5 h-5 mt-0.5"
                          />
                          <div className="flex-1">
                            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {method.name}
                            </p>
                            {method.instructions && (
                              <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {method.instructions}
                              </p>
                            )}
                          </div>
                        </label>
                      ))}
                      {errors.selectedPaymentMethod && (
                        <p className="text-sm text-red-400">{errors.selectedPaymentMethod}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6`}>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Notas adicionales (opcional)
                  </label>
                  <textarea
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

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className={`${isDarkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white'} rounded-lg shadow-sm p-6 sticky top-24`}>
                  <h2 className={`text-xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Resumen de Orden
                  </h2>

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

                  <div className="border-t pt-4 space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Subtotal</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(calculateSubtotal())}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Envío</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                        {deliveryCost === 0 ? 'Gratis' : formatPrice(deliveryCost)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t">
                      <span className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>Total</span>
                      <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>{formatPrice(calculateTotal())}</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || loadingPaymentMethods}
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
