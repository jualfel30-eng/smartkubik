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
 * OrderTicket Component - QUICK WIN #1 Enhanced
 * Ticket individual de orden en Kitchen Display System
 * Mejoras: Colores por urgencia, mejor información visual
 */
export default function OrderTicket({
  order,
  onUpdateItemStatus,
  onBump,
  onMarkUrgent,
  onCancel,
  elapsedTime,
  urgencyHighlight = 'border-gray-700',
  darkMode = true,
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (elapsed, estimated) => {
    if (elapsed < estimated * 60) return 'text-green-500';
    if (elapsed < estimated * 60 * 1.2) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getItemStatusBg = (status) => {
    switch (status) {
      case 'pending':
        return darkMode ? 'bg-gray-900/50 border-gray-700' : 'bg-white border-gray-200';
      case 'preparing':
        return darkMode ? 'bg-yellow-900/20 border-yellow-700/50' : 'bg-yellow-50 border-yellow-200';
      case 'ready':
        return darkMode ? 'bg-green-900/20 border-green-700/50' : 'bg-green-50 border-green-200';
      default:
        return darkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-100 border-gray-300';
    }
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
      className={`${darkMode ? 'bg-gray-800' : 'bg-white'} border-2 ${urgencyHighlight}`}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
              #{order.orderNumber}
              {order.isUrgent && (
                <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
              )}
            </CardTitle>
            <div className={`flex items-center gap-2 mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <Badge className={getStatusColor(order.status)}>
                {order.status.toUpperCase()}
              </Badge>
              <span>{order.orderType}</span>
            </div>
          </div>

          <button
            onClick={() => setShowActions(!showActions)}
            className={`${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Dropdown de acciones */}
        {showActions && (
          <div className={`absolute right-4 top-16 ${darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-300'} border rounded-lg shadow-xl z-10 min-w-[160px]`}>
            <button
              onClick={() => {
                onMarkUrgent(order._id, !order.isUrgent);
                setShowActions(false);
              }}
              className={`w-full text-left px-4 py-2 ${darkMode ? 'hover:bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-900'} text-sm`}
            >
              {order.isUrgent ? 'Quitar urgente' : 'Marcar urgente'}
            </button>
            <button
              onClick={() => {
                onCancel(order._id, 'Cancelado desde KDS');
                setShowActions(false);
              }}
              className={`w-full text-left px-4 py-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} text-sm text-red-500`}
            >
              Cancelar orden
            </button>
          </div>
        )}

        {/* Info adicional */}
        <div className="mt-3 space-y-1 text-sm">
          {order.tableNumber && (
            <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <MapPin className="w-4 h-4" />
              <span>Mesa {order.tableNumber}</span>
            </div>
          )}
          {order.customerName && (
            <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <User className="w-4 h-4" />
              <span>{order.customerName}</span>
            </div>
          )}
          {order.station && (
            <div className={`flex items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Utensils className="w-4 h-4" />
              <span>Estación: {order.station}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Timer principal */}
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-3 flex justify-between items-center`}>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-500" />
            <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tiempo transcurrido:</span>
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
        <div className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center`}>
          Estimado: {order.estimatedPrepTime} min
        </div>

        {/* Items */}
        <div className="space-y-2">
          {order.items.map((item) => (
            <div
              key={item.itemId}
              onClick={() => handleItemClick(item)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${getItemStatusBg(item.status)} ${item.status === 'pending' ? 'hover:border-blue-500' : item.status === 'preparing' ? 'hover:border-yellow-400' : ''
                }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`${darkMode ? 'border-gray-600 text-gray-200' : 'border-gray-400 text-gray-800'}`}>
                      {item.quantity}x
                    </Badge>
                    <span className={`font-semibold text-lg ${darkMode ? 'text-white' : 'text-gray-900'}`}>{item.productName}</span>
                  </div>

                  {/* Modifiers */}
                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className={`mt-1 ml-2 space-y-1`}>
                      {item.modifiers.map((mod, i) => (
                        <div key={i} className={`text-sm flex items-center gap-1 ${mod.startsWith('Sin:') ? 'text-red-400 font-medium' : (darkMode ? 'text-gray-300' : 'text-gray-600')}`}>
                          <span>•</span>
                          {mod}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Special Instructions */}
                  {item.specialInstructions && (
                    <div className="mt-2 ml-2 text-sm bg-orange-500/10 border border-orange-500/50 rounded p-1 inline-block text-orange-500 font-medium">
                      ⚠ {item.specialInstructions}
                    </div>
                  )}

                  {/* Item timer */}
                  {item.startedAt && (
                    <div className={`mt-2 ml-2 text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock className="w-3 h-3" />
                      {new Date(item.startedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {item.prepTime && (
                        <span className="font-mono">
                          ({Math.floor(item.prepTime / 60)}:
                          {(item.prepTime % 60).toString().padStart(2, '0')})
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <Badge
                    className={`${getStatusColor(item.status)} text-xs px-2 py-1 shadow-sm`}
                  >
                    {getStatusText(item.status)}
                  </Badge>
                  {item.status === 'ready' && (
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Notas */}
        {order.notes && (
          <div className={`${darkMode ? 'bg-gray-900' : 'bg-gray-100'} rounded-lg p-3 text-sm`}>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Notas:</span>
            <p className={`${darkMode ? 'text-white' : 'text-gray-900'} mt-1`}>{order.notes}</p>
          </div>
        )}

        {/* Bump Button */}
        <Button
          onClick={() => onBump(order._id)}
          disabled={!canBump()}
          className={`w-full font-bold ${canBump()
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : darkMode
              ? 'bg-gray-700 cursor-not-allowed text-gray-400'
              : 'bg-gray-300 cursor-not-allowed text-gray-500'
            }`}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {canBump() ? 'BUMP - Completar Orden' : 'Completar todos los items'}
        </Button>
      </CardContent>
    </Card>
  );
}
