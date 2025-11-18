'use client';

import { StorefrontConfig, Order } from '@/types';
import { Header } from '@/templates/ModernEcommerce/components/Header';
import { Footer } from '@/templates/ModernEcommerce/components/Footer';
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
  date?: Date;
  completed: boolean;
}

export function OrderTrackingClient({ config, order }: OrderTrackingClientProps) {
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
        date: order.confirmedAt, // Using confirmed date as processing start
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

    // Filter out shipped step if it's pickup
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
    if (order.status === 'delivered') return 'text-green-600';
    if (order.status === 'cancelled') return 'text-red-600';
    return 'text-orange-600';
  };

  const getStatusText = () => {
    if (order.status === 'delivered') return 'Entregado';
    if (order.status === 'cancelled') return 'Cancelado';
    if (order.status === 'shipped') return 'En Camino';
    if (order.status === 'processing') return 'En Preparación';
    if (order.status === 'confirmed') return 'Confirmado';
    return 'Pendiente';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header config={config} domain={config.domain} />

      <main className="flex-1 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Orden #{order.orderNumber}
                </h1>
                <p className={`text-lg font-semibold ${getStatusColor()}`}>
                  {getStatusText()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatPrice(order.totalAmount)}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Cliente</p>
                  <p className="font-medium text-gray-900">{order.customerName}</p>
                </div>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="font-medium text-gray-900">{order.customerEmail}</p>
                  </div>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <p className="font-medium text-gray-900">{order.customerPhone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Timeline */}
          {order.status !== 'cancelled' && (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Estado del Pedido</h2>

              <div className="relative">
                {/* Progress Line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200"
                     style={{
                       height: `${(steps.length - 1) * 80}px`
                     }}
                >
                  <div
                    className="bg-[var(--primary-color)] w-full transition-all duration-500"
                    style={{
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

                    return (
                      <div key={step.key} className="flex items-start gap-4 relative">
                        {/* Icon */}
                        <div className={`
                          relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white
                          ${isCompleted
                            ? 'bg-[var(--primary-color)] text-white'
                            : isActive
                              ? 'bg-white text-[var(--primary-color)] border-[var(--primary-color)]'
                              : 'bg-white text-gray-400 border-gray-300'
                          }
                        `}>
                          <Icon className="h-6 w-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 pt-1">
                          <h3 className={`
                            text-lg font-semibold mb-1
                            ${isCompleted ? 'text-gray-900' : isActive ? 'text-gray-900' : 'text-gray-400'}
                          `}>
                            {step.label}
                          </h3>
                          {step.date && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
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
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Circle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-900 mb-1">
                    Pedido Cancelado
                  </h3>
                  <p className="text-sm text-red-700">
                    Este pedido fue cancelado el {formatDate(order.cancelledAt)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Order Items */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Productos</h2>
            <div className="divide-y divide-gray-200">
              {order.items?.map((item, index) => (
                <div key={index} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{item.productName}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Cantidad: {item.quantity}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatPrice(item.unitPrice)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
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
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Información de Entrega
              </h2>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <Truck className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Método</p>
                    <p className="font-medium text-gray-900">
                      {order.shipping.method === 'pickup' ? 'Retiro en tienda' : 'Delivery'}
                    </p>
                  </div>
                </div>
                {order.shipping.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Dirección</p>
                      <p className="font-medium text-gray-900">
                        {order.shipping.address.street}, {order.shipping.address.city}
                      </p>
                    </div>
                  </div>
                )}
                {order.shipping.scheduledDate && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Fecha Programada</p>
                      <p className="font-medium text-gray-900">
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

      <Footer config={config} domain={config.domain} />
    </div>
  );
}
