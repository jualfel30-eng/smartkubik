'use client';

import { useState, useEffect } from 'react';
import { StorefrontConfig, Order } from '@/types';
import { getTemplateComponents } from '@/lib/getTemplateComponents';
import { formatPrice } from '@/lib/utils';
import {
  CheckCircle2,
  Circle,
  Package,
  Truck,
  MapPin,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  ShoppingBag
} from 'lucide-react';

interface OrderTrackingClientProps {
  config: StorefrontConfig;
  order: Order;
}

interface StatusStep {
  key: string;
  label: string;
  icon: any;
  date?: Date | string;
  completed: boolean;
}

export function OrderTrackingClient({ config, order }: OrderTrackingClientProps) {
  const { Header, Footer } = getTemplateComponents(config.templateType);
  const isPremium = config.templateType === 'premium';
  const [isDarkMode, setIsDarkMode] = useState(isPremium);

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

  // Build status timeline based on order status
  const getStatusSteps = (): StatusStep[] => {
    const steps: StatusStep[] = [
      {
        key: 'created',
        label: 'Pedido Recibido',
        icon: ShoppingBag,
        date: order.createdAt,
        completed: true,
      },
      {
        key: 'confirmed',
        label: 'Pedido Confirmado',
        icon: CheckCircle2,
        date: order.confirmedAt,
        completed: !!order.confirmedAt,
      },
      {
        key: 'processing',
        label: 'En Preparación',
        icon: Package,
        date: order.confirmedAt,
        completed: order.status === 'processing' || order.status === 'shipped' || order.status === 'delivered',
      },
      {
        key: 'shipped',
        label: 'En Camino',
        icon: Truck,
        date: order.shippedAt,
        completed: !!order.shippedAt || order.status === 'delivered',
      },
      {
        key: 'delivered',
        label: 'Entregado',
        icon: MapPin,
        date: order.deliveredAt,
        completed: !!order.deliveredAt,
      },
    ];

    if (order.shipping?.method === 'pickup') {
      return steps.filter(step => step.key !== 'shipped');
    }

    return steps;
  };

  const steps = getStatusSteps();
  const currentStepIndex = steps.findIndex(step => !step.completed);

  const formatDate = (dateString?: Date | string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = () => {
    if (order.status === 'delivered') return 'text-green-500';
    if (order.status === 'cancelled') return 'text-red-500';
    return isPremium ? `text-[${primaryColor}]` : 'text-orange-600';
  };

  const getStatusText = () => {
    if (order.status === 'delivered') return 'Entregado';
    if (order.status === 'cancelled') return 'Cancelado';
    if (order.status === 'shipped') return 'En Camino';
    if (order.status === 'processing') return 'En Preparación';
    if (order.status === 'confirmed') return 'Confirmado';
    return 'Pendiente';
  };

  // Theme-aware classes
  const pageBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-white');
  const mainBg = isPremium
    ? (isDarkMode ? 'bg-[#0a0a1a]' : 'bg-gray-50')
    : (isDarkMode ? 'bg-gray-950' : 'bg-gray-50');
  const cardBg = isPremium
    ? (isDarkMode ? 'bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl' : 'bg-white rounded-2xl shadow-sm border border-gray-100')
    : (isDarkMode ? 'bg-gray-900 border border-gray-800 rounded-lg' : 'bg-white rounded-lg shadow-sm');
  const textMain = isDarkMode ? 'text-white' : 'text-gray-900';
  const textMuted = isDarkMode ? 'text-gray-300' : 'text-gray-600';
  const textSub = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const borderCls = isDarkMode ? (isPremium ? 'border-white/10' : 'border-gray-800') : 'border-gray-200';
  const iconMuted = isDarkMode ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={`min-h-screen flex flex-col ${pageBg} ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
      <Header config={config} domain={config.domain} isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      <main className={`flex-1 ${mainBg} ${isPremium ? 'pt-16' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className={`${cardBg} p-6 mb-6`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                {isPremium && isDarkMode ? (
                  <h1
                    className="text-3xl font-bold mb-2"
                    style={{
                      background: `linear-gradient(135deg, #fff 0%, ${primaryColor} 50%, ${secondaryColor} 100%)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Orden #{order.orderNumber}
                  </h1>
                ) : (
                  <h1 className={`text-3xl font-bold mb-2 ${textMain}`}>
                    Orden #{order.orderNumber}
                  </h1>
                )}
                <p className={`text-lg font-semibold`} style={isPremium && order.status !== 'cancelled' ? { color: primaryColor } : undefined}>
                  <span className={order.status === 'cancelled' ? 'text-red-500' : order.status === 'delivered' ? 'text-green-500' : (isPremium ? '' : getStatusColor())}>
                    {getStatusText()}
                  </span>
                </p>
              </div>
              <div className="text-right">
                <p className={`text-sm ${textMuted} mb-1`}>Total</p>
                <p className="text-2xl font-bold" style={isPremium ? { color: primaryColor } : undefined}>
                  {isPremium ? formatPrice(order.totalAmount) : <span className={textMain}>{formatPrice(order.totalAmount)}</span>}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t ${borderCls}`}>
              <div className="flex items-center gap-2">
                <User className={`h-5 w-5 ${iconMuted}`} />
                <div>
                  <p className={`text-xs ${textSub}`}>Cliente</p>
                  <p className={`font-medium ${textMain}`}>{order.customerName}</p>
                </div>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className={`h-5 w-5 ${iconMuted}`} />
                  <div>
                    <p className={`text-xs ${textSub}`}>Email</p>
                    <p className={`font-medium ${textMain}`}>{order.customerEmail}</p>
                  </div>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className={`h-5 w-5 ${iconMuted}`} />
                  <div>
                    <p className={`text-xs ${textSub}`}>Teléfono</p>
                    <p className={`font-medium ${textMain}`}>{order.customerPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {order.status !== 'cancelled' && (
            <div className={`${cardBg} p-6 mb-6`}>
              <h2 className={`text-xl font-bold mb-6 ${textMain}`}>Estado del Pedido</h2>

              <div className="relative">
                {/* Progress Line */}
                <div className={`absolute left-6 top-0 bottom-0 w-0.5 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}
                     style={{
                       height: `${(steps.length - 1) * 80}px`
                     }}
                >
                  <div
                    className="w-full transition-all duration-500"
                    style={{
                      background: isPremium ? `linear-gradient(180deg, ${primaryColor}, ${secondaryColor})` : 'var(--primary-color)',
                      height: currentStepIndex === -1
                        ? '100%'
                        : `${((currentStepIndex) / (steps.length - 1)) * 100}%`
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="space-y-8 relative">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStepIndex;
                    const isCompleted = step.completed;

                    const stepIconCls = `relative z-10 flex items-center justify-center w-12 h-12 ${isPremium ? 'rounded-xl' : 'rounded-full'} border-4 ${isDarkMode ? (isPremium ? 'border-[#0a0a1a]' : 'border-gray-950') : 'border-white'} ${
                      isCompleted
                        ? 'text-white'
                        : isActive
                          ? (isDarkMode ? 'bg-transparent text-white' : 'bg-white')
                          : (isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-white text-gray-400')
                    }`;
                    const stepIconStyle = isCompleted
                      ? isPremium
                        ? { background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }
                        : { backgroundColor: 'var(--primary-color)' }
                      : undefined;

                    return (
                      <div key={step.key} className="flex items-start gap-4 relative">
                        {/* Icon */}
                        <div className={stepIconCls} style={stepIconStyle}>
                          <Icon className="h-6 w-6" style={isActive && isPremium ? { color: primaryColor } : undefined} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <h3 className={`text-lg font-semibold mb-1 ${
                            isCompleted ? textMain : isActive ? textMain : textSub
                          }`}>
                            {step.label}
                          </h3>
                          {step.date && (
                            <div className={`flex items-center gap-1 text-sm ${textSub}`}>
                              <Clock className="h-4 w-4" />
                              <span>{formatDate(step.date)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Cancelled Status */}
          {order.status === 'cancelled' && order.cancelledAt && (
            <div className={`${isPremium ? (isDarkMode ? 'bg-red-500/10 border border-red-400/20 rounded-2xl' : 'bg-red-50 border border-red-200 rounded-2xl') : (isDarkMode ? 'bg-red-900/30 border border-red-800 rounded-lg' : 'bg-red-50 border border-red-200 rounded-lg')} p-6 mb-6`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Circle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h3 className={`text-lg font-semibold mb-1 ${isDarkMode ? 'text-red-300' : 'text-red-900'}`}>
                    Pedido Cancelado
                  </h3>
                  <p className={`text-sm ${isDarkMode ? 'text-red-200' : 'text-red-700'}`}>
                    Este pedido fue cancelado el {formatDate(order.cancelledAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className={`${cardBg} p-6 mb-6`}>
            <h2 className={`text-xl font-bold mb-4 ${textMain}`}>Productos</h2>
            <div className={`divide-y ${isDarkMode ? (isPremium ? 'divide-white/10' : 'divide-gray-800') : 'divide-gray-200'}`}>
              {order.items?.map((item, index) => (
                <div key={index} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className={`font-medium ${textMain}`}>{item.productName}</h3>
                      <p className={`text-sm mt-1 ${textSub}`}>
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium" style={isPremium ? { color: primaryColor } : undefined}>
                        {isPremium ? formatPrice(item.unitPrice) : <span className={textMain}>{formatPrice(item.unitPrice)}</span>}
                      </p>
                      <p className={`text-sm mt-1 ${textSub}`}>
                        Total: {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shipping && (
            <div className={`${cardBg} p-6`}>
              <h2 className={`text-xl font-bold mb-4 ${textMain}`}>
                Información de Entrega
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Truck className={`h-5 w-5 mt-0.5 ${iconMuted}`} />
                  <div>
                    <p className={`text-sm ${textSub}`}>Método</p>
                    <p className={`font-medium ${textMain}`}>
                      {order.shipping.method === 'pickup' ? 'Retiro en tienda' : 'Delivery'}
                    </p>
                  </div>
                </div>
                {order.shipping.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className={`h-5 w-5 mt-0.5 ${iconMuted}`} />
                    <div>
                      <p className={`text-sm ${textSub}`}>Dirección</p>
                      <p className={`font-medium ${textMain}`}>
                        {order.shipping.address.street}, {order.shipping.address.city}
                      </p>
                    </div>
                  </div>
                )}
                {order.shipping.scheduledDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className={`h-5 w-5 mt-0.5 ${iconMuted}`} />
                    <div>
                      <p className={`text-sm ${textSub}`}>Fecha Programada</p>
                      <p className={`font-medium ${textMain}`}>
                        {formatDate(order.shipping.scheduledDate)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer config={config} domain={config.domain} isDarkMode={isDarkMode} />
    </div>
  );
}
