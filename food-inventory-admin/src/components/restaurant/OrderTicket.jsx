import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MoreVertical,
  User,
  MapPin,
  Utensils,
} from 'lucide-react';

/**
 * OrderTicket Component
 * Ticket individual de orden en Kitchen Display System
 * Muestra items, timers, y permite tracking granular
 */
export default function OrderTicket({
  order,
  onUpdateItemStatus,
  onBump,
  onMarkUrgent,
  onCancel,
  elapsedTime,
}) {
  const [showActions, setShowActions] = useState(false);
  const [currentElapsed, setCurrentElapsed] = useState(elapsedTime);

  // Timer local que incrementa cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-blue-500',
      preparing: 'bg-yellow-500',
      ready: 'bg-green-500',
      completed: 'bg-gray-400',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-300';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pendiente',
      preparing: 'Preparando',
      ready: 'Listo',
      served: 'Servido',
    };
    return texts[status] || status;
  };

  const getPriorityBorder = (priority) => {
    const borders = {
      normal: 'border-gray-700',
      urgent: 'border-orange-500',
      asap: 'border-red-500',
    };
    return borders[priority] || 'border-gray-700';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (elapsed, estimated) => {
    if (elapsed < estimated * 60) return 'text-green-400';
    if (elapsed < estimated * 60 * 1.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleItemClick = (item) => {
    const statusFlow = ['pending', 'preparing', 'ready'];
    const currentIndex = statusFlow.indexOf(item.status);
    const nextStatus = statusFlow[currentIndex + 1] || 'ready';

    onUpdateItemStatus(order._id, item.itemId, nextStatus);
  };

  const canBump = () => {
    return order.items.every((item) => item.status === 'ready');
  };

  return (
    <Card
      className={`bg-gray-800 border-2 ${getPriorityBorder(order.priority)} ${
        order.isUrgent ? 'shadow-lg shadow-red-500/50 animate-pulse' : ''
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              #{order.orderNumber}
              {order.isUrgent && (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              )}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
              <span>{order.orderType}</span>
            </div>
          </div>

          <button
            onClick={() => setShowActions(!showActions)}
            className="text-gray-400 hover:text-white"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown de acciones */}
        {showActions && (
          <div className="absolute right-4 top-16 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-10 min-w-[160px]">
            <button
              onClick={() => {
                onMarkUrgent(order._id, !order.isUrgent);
                setShowActions(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm"
            >
              {order.isUrgent ? 'Quitar urgente' : 'Marcar urgente'}
            </button>
            <button
              onClick={() => {
                onCancel(order._id, 'Cancelado desde KDS');
                setShowActions(false);
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm text-red-400"
            >
              Cancelar orden
            </button>
          </div>
        )}

        {/* Info adicional */}
        <div className="mt-3 space-y-1 text-sm">
          {order.tableNumber && (
            <div className="flex items-center gap-2 text-gray-300">
              <MapPin className="w-4 h-4" />
              <span>Mesa {order.tableNumber}</span>
            </div>
          )}
          {order.customerName && (
            <div className="flex items-center gap-2 text-gray-300">
              <User className="w-4 h-4" />
              <span>{order.customerName}</span>
            </div>
          )}
          {order.station && (
            <div className="flex items-center gap-2 text-gray-300">
              <Utensils className="w-4 h-4" />
              <span>Estación: {order.station}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Timer principal */}
        <div className="bg-gray-900 rounded-lg p-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-gray-400">Tiempo transcurrido:</span>
          </div>
          <span
            className={`text-2xl font-bold ${getTimerColor(
              currentElapsed,
              order.estimatedPrepTime
            )}`}
          >
            {formatTime(currentElapsed)}
          </span>
        </div>

        {/* Tiempo estimado */}
        <div className="text-xs text-gray-500 text-center">
          Estimado: {order.estimatedPrepTime} min
        </div>

        {/* Items */}
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div
              key={item.itemId}
              onClick={() => handleItemClick(item)}
              className={`
                p-3 rounded-lg border-2 cursor-pointer transition-all
                ${
                  item.status === 'pending'
                    ? 'bg-gray-900 border-gray-700 hover:border-blue-500'
                    : item.status === 'preparing'
                    ? 'bg-yellow-900/20 border-yellow-500 hover:border-yellow-400'
                    : item.status === 'ready'
                    ? 'bg-green-900/20 border-green-500'
                    : 'bg-gray-900 border-gray-700'
                }
              `}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">
                      {item.quantity}x
                    </span>
                    <span className="text-white">{item.productName}</span>
                  </div>

                  {/* Modifiers */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="mt-1 ml-6 text-sm text-gray-400">
                      {item.modifiers.map((mod, i) => (
                        <div key={i}>• {mod}</div>
                      ))}
                    </div>
                  )}

                  {/* Special Instructions */}
                  {item.specialInstructions && (
                    <div className="mt-1 ml-6 text-sm text-orange-400 italic">
                      ⚠ {item.specialInstructions}
                    </div>
                  )}

                  {/* Item timer */}
                  {item.startedAt && (
                    <div className="mt-1 ml-6 text-xs text-gray-500">
                      Iniciado:{' '}
                      {new Date(item.startedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.prepTime && (
                        <span className="ml-2">
                          (Tiempo: {Math.floor(item.prepTime / 60)}:
                          {(item.prepTime % 60).toString().padStart(2, '0')})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end">
                  <Badge
                    className={`${getStatusColor(item.status)} text-xs`}
                  >
                    {getStatusText(item.status)}
                  </Badge>
                  {item.status === 'ready' && (
                    <CheckCircle className="w-5 h-5 text-green-400 mt-1" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notas */}
        {order.notes && (
          <div className="bg-gray-900 rounded-lg p-3 text-sm">
            <span className="text-gray-400">Notas:</span>
            <p className="text-white mt-1">{order.notes}</p>
          </div>
        )}

        {/* Bump Button */}
        <Button
          onClick={() => onBump(order._id)}
          disabled={!canBump()}
          className={`w-full ${
            canBump()
              ? 'bg-green-600 hover:bg-green-700'
              : 'bg-gray-700 cursor-not-allowed'
          }`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {canBump() ? 'BUMP - Completar Orden' : 'Completar todos los items'}
        </Button>
      </CardContent>
    </Card>
  );
}
