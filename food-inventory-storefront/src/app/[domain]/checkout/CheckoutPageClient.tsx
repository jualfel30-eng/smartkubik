'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { StorefrontConfig, CartItem, OrderData } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
import { formatPrice, getImageUrl } from '@/lib/utils';
import { createOrder } from '@/lib/api';
import { CheckCircle, Loader } from 'lucide-react';

interface CheckoutPageClientProps {
  config: StorefrontConfig;
}

export function CheckoutPageClient({ config }: CheckoutPageClientProps) {
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load cart from localStorage
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
      router.push(`/${config.domain}/carrito`);
      return;
    }
    setCartItems(cart);
    setLoading(false);
  }, [config.domain, router]);

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'El nombre es requerido';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Email inválido';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'El teléfono es requerido';
    }

    if (!formData.customerAddress.trim()) {
      newErrors.customerAddress = 'La dirección es requerida';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const orderData: OrderData = {
        tenantId: config.tenantId,
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        items: cartItems.map((item) => ({
          productId: item.product._id,
          quantity: item.quantity,
          price: item.product.price,
        })),
        total: calculateTotal(),
        notes: formData.notes || undefined,
      };

      const order = await createOrder(orderData);

      // Clear cart
      localStorage.removeItem('cart');

      // Show success
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
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header config={config} domain={config.domain} />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-gray-600">Cargando...</p>
        </main>
        <Footer config={config} domain={config.domain} />
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header config={config} domain={config.domain} />
        <main className="flex-1 bg-gray-50 flex items-center justify-center py-12">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                ¡Orden Confirmada!
              </h1>
              <p className="text-gray-600 mb-6">
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
        <Footer config={config} domain={config.domain} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header config={config} domain={config.domain} cartItemsCount={cartItems.length} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
              Finalizar Compra
            </h1>
            <p className="text-gray-600">
              Completa tus datos para confirmar la orden
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Customer Information Form */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Información de Contacto
                  </h2>

                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre completo *
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${
                          errors.customerName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.customerName && (
                        <p className="mt-1 text-sm text-red-600">{errors.customerName}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="customerEmail"
                        name="customerEmail"
                        value={formData.customerEmail}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${
                          errors.customerEmail ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.customerEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.customerEmail}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono *
                      </label>
                      <input
                        type="tel"
                        id="customerPhone"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${
                          errors.customerPhone ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.customerPhone && (
                        <p className="mt-1 text-sm text-red-600">{errors.customerPhone}</p>
                      )}
                    </div>

                    {/* Address */}
                    <div>
                      <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700 mb-1">
                        Dirección de entrega *
                      </label>
                      <input
                        type="text"
                        id="customerAddress"
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] ${
                          errors.customerAddress ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.customerAddress && (
                        <p className="mt-1 text-sm text-red-600">{errors.customerAddress}</p>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notas adicionales (opcional)
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
                        placeholder="Instrucciones especiales, referencias, etc."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-gray-900 mb-6">
                    Resumen de Orden
                  </h2>

                  {/* Cart Items */}
                  <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.product._id} className="flex gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0">
                          <Image
                            src={getImageUrl(item.product.imageUrl)}
                            alt={item.product.name}
                            width={64}
                            height={64}
                            className="object-cover w-full h-full"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate">
                            {item.product.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Cantidad: {item.quantity}
                          </p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatPrice(item.product.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total */}
                  <div className="border-t pt-4 mb-6">
                    <div className="flex justify-between text-lg font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatPrice(calculateTotal())}</span>
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

      <Footer config={config} domain={config.domain} />
    </div>
  );
}
