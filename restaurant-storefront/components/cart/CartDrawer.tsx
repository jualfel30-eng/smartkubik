'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useCartStore } from '@/lib/cart-store';
import { restaurantApi } from '@/lib/api';
import { useRestaurant } from '@/lib/restaurant-context';
import { formatWhatsAppMessage, generateWhatsAppLink } from '@/lib/whatsapp';
import { Order } from '@/types';

export default function CartDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();
  const { config, tenantId } = useRestaurant();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-cart', handleOpen);
    return () => window.removeEventListener('open-cart', handleOpen);
  }, []);

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      setFormError('Por favor ingresa tu nombre y número de WhatsApp');
      return;
    }
    if (customerPhone.trim().length < 8) {
      setFormError('Revisa el formato de tu número');
      return;
    }
    if (!tenantId) {
      setFormError('Error de configuración del restaurante. Intenta recargar la página.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      // 1. Crear pedido en el backend
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        items: items.map(item => ({
          dishId: item.dish_id,
          dishName: item.name,
          dishPrice: item.base_price,
          quantity: item.quantity,
          subtotal: item.final_price * item.quantity,
          customization: item.customizations.length > 0 ? {
            removedIngredients: item.customizations
              .filter(c => c.action === 'remove')
              .map(c => c.ingredient_id),
            addedExtras: item.customizations
              .filter(c => c.action === 'add')
              .map(c => ({
                ingredientId: c.ingredient_id,
                quantity: c.quantity,
                extraPrice: c.price_delta,
              })),
          } : undefined,
        })),
        subtotal: total,
        total: total,
      };

      const serverOrder = await restaurantApi.createOrder(tenantId, orderPayload) as Order;

      // 2. Formatear mensaje de WhatsApp
      if (!config) throw new Error('Configuración del restaurante no disponible');

      const message = formatWhatsAppMessage({
        orderRef: serverOrder.orderRef,
        customerName: serverOrder.customerName,
        items: serverOrder.items,
        total: serverOrder.total,
      }, config);

      // 3. Generar link y redirigir
      const whatsappNumber = config.whatsappNumber || '';
      if (!whatsappNumber) throw new Error('Número de WhatsApp no configurado');

      const link = generateWhatsAppLink(whatsappNumber, message);

      // Marcar como enviado (fire and forget)
      restaurantApi.markWhatsAppSent(tenantId, serverOrder._id).catch(() => {});

      clearCart();
      setIsOpen(false);
      window.location.href = link;

    } catch (error) {
      const err = error as Error;
      setFormError(err.message || 'Ocurrió un error procesando tu orden');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currency = config?.currency || 'USD';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full md:w-[450px] bg-surface flex flex-col shadow-2xl z-[110] border-l border-white/10"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <ShoppingBag className="w-5 h-5 text-accent" />
                <h2 className="font-display font-bold text-xl text-white">Tu Pedido</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-muted hover:text-white transition-colors bg-white/5 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
              {items.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted">
                  <ShoppingBag className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">Tu carrito está vacío</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {items.map((item) => (
                    <div key={item.cart_item_id} className="flex flex-col gap-3 pb-6 border-b border-white/5 last:border-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-bold text-foreground text-lg">{item.name}</h4>
                          <span className="text-accent font-semibold">${item.final_price.toFixed(2)}</span>
                        </div>
                        <button
                          onClick={() => removeItem(item.cart_item_id)}
                          className="p-1.5 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors mt-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {item.customizations.length > 0 && (
                        <div className="space-y-1 text-sm bg-[#1a1a1a] p-3 rounded-xl border border-white/5">
                          {item.customizations.map((mod, idx) => (
                            <div key={idx} className="flex justify-between text-muted">
                              <span>
                                {mod.action === 'remove' ? '❌ Sin ' : `➕ Extra `}
                                {mod.quantity > 1 ? `${mod.quantity}x ` : ''}{mod.name}
                              </span>
                              {mod.price_delta > 0 && <span>+${mod.price_delta.toFixed(2)}</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-4 bg-white/5 rounded-full p-1 border border-white/10 w-fit">
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                          className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                          className="p-1.5 text-white hover:bg-white/10 rounded-full transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkout */}
            {items.length > 0 && (
              <div className="p-6 bg-[#0c0c0c] border-t border-white/10 shrink-0">
                <div className="mb-6 space-y-3">
                  <div className="flex justify-between text-muted text-sm">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)} {currency}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold text-xl pt-3 border-t border-white/5">
                    <span>Total</span>
                    <span className="text-accent">${total.toFixed(2)} {currency}</span>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <input
                    type="text"
                    placeholder="Tu nombre completo"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                  />
                  <input
                    type="tel"
                    placeholder="Número de WhatsApp"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:outline-none focus:border-accent transition-colors"
                  />
                  {formError && (
                    <p className="text-red-400 text-sm px-1">{formError}</p>
                  )}
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-accent text-white font-bold flex items-center justify-center gap-2 transition-all hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_-5px_rgba(255,69,0,0.4)]"
                >
                  {isSubmitting ? (
                    'Procesando...'
                  ) : (
                    <>
                      <span>Enviar Pedido por WhatsApp</span>
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.878-.788-1.472-1.761-1.645-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
