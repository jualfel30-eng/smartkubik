import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Clock,
  ChefHat,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Filter,
  Volume2,
  VolumeX,
  Settings,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { fetchApi } from '@/lib/api';
import OrderTicket from './OrderTicket';

/**
 * Kitchen Display System (KDS) - QUICK WIN #1
 * Pantalla principal de cocina con tracking de órdenes en tiempo real
 * Mejoras: Alertas sonoras, tema oscuro, colores por urgencia
 */
export default function KitchenDisplay() {
  const { theme } = useTheme();
  // Detectar si el modo oscuro está activo globalmente
  const isGlobalDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: null, // null = todas activas
    station: null,
    priority: null,
    isUrgent: null,
  });
  const [settings, setSettings] = useState({
    soundEnabled: true,
    darkMode: isGlobalDark, // Inicializar con el tema global
    autoRefresh: true,
    urgentAlertInterval: 30, // segundos
  });
  const [showSettings, setShowSettings] = useState(false);
  const audioContextRef = useRef(null);
  const lastAlertTimeRef = useRef(Date.now());

  // Sincronizar con cambios de tema global
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setSettings(prev => ({ ...prev, darkMode: isDark }));
  }, [theme]);

  // Función para reproducir sonido de alerta
  const playAlertSound = useCallback((type = 'new') => {
    if (!settings.soundEnabled) return;

    try {
      // Crear contexto de audio si no existe
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configurar tono según tipo
      if (type === 'urgent') {
        oscillator.frequency.value = 880; // A5 - tono alto y urgente
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.1);

        // Repetir 3 veces para urgentes
        setTimeout(() => {
          const osc2 = audioContext.createOscillator();
          const gain2 = audioContext.createGain();
          osc2.connect(gain2);
          gain2.connect(audioContext.destination);
          osc2.frequency.value = 880;
          gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
          osc2.start();
          osc2.stop(audioContext.currentTime + 0.1);
        }, 200);
      } else {
        oscillator.frequency.value = 440; // A4 - tono normal
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      }
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }, [settings.soundEnabled]);

  // Detectar nuevas órdenes y reproducir alerta
  useEffect(() => {
    if (orders.length > 0 && settings.soundEnabled) {
      const urgentOrders = orders.filter(o => o.isUrgent);
      const now = Date.now();

      // Alerta para órdenes urgentes cada X segundos
      if (urgentOrders.length > 0 &&
        now - lastAlertTimeRef.current > settings.urgentAlertInterval * 1000) {
        playAlertSound('urgent');
        lastAlertTimeRef.current = now;
      }
    }
  }, [orders, settings.soundEnabled, settings.urgentAlertInterval, playAlertSound]);

  const loadOrders = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.station) params.append('station', filters.station);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.isUrgent !== null) params.append('isUrgent', filters.isUrgent);

      const query = params.toString();
      const result = await fetchApi(`/kitchen-display/active${query ? `?${query}` : ''}`);
      setOrders(result?.data || result || []);
    } catch (error) {
      console.error('Error loading kitchen orders:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStats = useCallback(async () => {
    try {
      const result = await fetchApi('/kitchen-display/stats');
      setStats(result?.data || result || null);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  // Auto-refresh cada 10 segundos
  useEffect(() => {
    loadOrders();
    loadStats();

    if (!settings.autoRefresh) return;

    const interval = setInterval(() => {
      loadOrders();
      loadStats();
    }, 10000);

    return () => clearInterval(interval);
  }, [filters, settings.autoRefresh, loadOrders, loadStats]);

  const handleUpdateItemStatus = async (kitchenOrderId, itemId, status) => {
    try {
      await fetchApi('/kitchen-display/item-status', {
        method: 'PATCH',
        body: JSON.stringify({
          kitchenOrderId,
          itemId,
          status,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const handleBumpOrder = async (kitchenOrderId) => {
    try {
      await fetchApi('/kitchen-display/bump', {
        method: 'POST',
        body: JSON.stringify({ kitchenOrderId }),
      });
      loadOrders();
      loadStats();
    } catch (error) {
      console.error('Error bumping order:', error);
    }
  };

  const handleMarkUrgent = async (kitchenOrderId, isUrgent) => {
    try {
      await fetchApi('/kitchen-display/urgent', {
        method: 'PATCH',
        body: JSON.stringify({
          kitchenOrderId,
          isUrgent,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error marking urgent:', error);
    }
  };

  const handleCancelOrder = async (kitchenOrderId, reason) => {
    try {
      await fetchApi('/kitchen-display/cancel', {
        method: 'POST',
        body: JSON.stringify({
          kitchenOrderId,
          reason,
        }),
      });
      loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
    }
  };

  const getUrgencyHighlight = (order) => {
    const elapsed = calculateElapsedTime(order.receivedAt);
    const estimatedSeconds = order.estimatedPrepTime * 60;

    if (order.isUrgent || elapsed > estimatedSeconds * 1.5) {
      return 'border-red-500 shadow-lg shadow-red-500/50 animate-pulse';
    } else if (elapsed > estimatedSeconds * 1.2) {
      return 'border-orange-500 shadow-md shadow-orange-500/30';
    } else if (elapsed > estimatedSeconds) {
      return 'border-yellow-500 shadow-sm shadow-yellow-500/20';
    }
    return 'border-gray-700';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateElapsedTime = (receivedAt) => {
    const now = new Date();
    const received = new Date(receivedAt);
    const elapsed = Math.floor((now - received) / 1000);
    return elapsed;
  };

  // Separar órdenes por status
  const preparingOrders = orders.filter((o) => o.status === 'preparing');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${settings.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} p-4 transition-colors duration-200`}>
      {/* Header con estadísticas */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-3">
            <ChefHat className="w-8 h-8 text-orange-400" />
            <h1 className="text-3xl font-bold">Kitchen Display System</h1>
            {orders.filter(o => o.isUrgent).length > 0 && (
              <div className="flex items-center gap-2 bg-red-500/20 border border-red-500 rounded-lg px-3 py-1 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <span className="text-red-500 font-bold">
                  {orders.filter(o => o.isUrgent).length} Urgente(s)
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowSettings(!showSettings)}
              variant="outline"
              className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}
            >
              <Settings className="w-4 h-4 mr-2" />
              Configuración
            </Button>
            <Button
              onClick={loadOrders}
              variant="outline"
              className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card className={`mb-4 ${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="sound"
                    checked={settings.soundEnabled}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, soundEnabled: checked })
                    }
                  />
                  <Label htmlFor="sound" className="flex items-center gap-2">
                    {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                    Sonido
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dark-mode"
                    checked={settings.darkMode}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, darkMode: checked })
                    }
                  />
                  <Label htmlFor="dark-mode">Modo Oscuro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-refresh"
                    checked={settings.autoRefresh}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, autoRefresh: checked })
                    }
                  />
                  <Label htmlFor="auto-refresh">Auto-actualizar</Label>
                </div>
                <div className={`text-sm ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Alerta cada {settings.urgentAlertInterval}s
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <Card className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-400">
                    {stats.totalOrders}
                  </p>
                  <p className={`text-sm mt-1 ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Órdenes Hoy
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-500">
                    {preparingOrders.length}
                  </p>
                  <p className={`text-sm mt-1 ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    En Preparación
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {readyOrders.length}
                  </p>
                  <p className={`text-sm mt-1 ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Listas
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-500">
                    {stats.avgWaitTime ? formatTime(stats.avgWaitTime) : '0:00'}
                  </p>
                  <p className={`text-sm mt-1 ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Tiempo Promedio
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros rápidos */}
        <div className="mt-4 flex gap-2 flex-wrap">
          <Button
            onClick={() => setFilters({ ...filters, status: null })}
            variant={filters.status === null ? 'default' : 'outline'}
            size="sm"
            className={settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}
          >
            Todas
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'new' })}
            variant={filters.status === 'new' ? 'default' : 'outline'}
            size="sm"
            className={`${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${filters.status === 'new' ? 'bg-blue-500 hover:bg-blue-600' : ''
              }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
            Nuevas
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'preparing' })}
            variant={filters.status === 'preparing' ? 'default' : 'outline'}
            size="sm"
            className={`${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${filters.status === 'preparing' ? 'bg-yellow-500 hover:bg-yellow-600' : ''
              }`}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2" />
            En Preparación
          </Button>
          <Button
            onClick={() => setFilters({ ...filters, status: 'ready' })}
            variant={filters.status === 'ready' ? 'default' : 'outline'}
            size="sm"
            className={`${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${filters.status === 'ready' ? 'bg-green-500 hover:bg-green-600' : ''
              }`}
          >
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2" />
            Listas
          </Button>
          <Button
            onClick={() =>
              setFilters({ ...filters, isUrgent: filters.isUrgent ? null : true })
            }
            variant={filters.isUrgent ? 'default' : 'outline'}
            size="sm"
            className={`${settings.darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'} ${filters.isUrgent ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''
              }`}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Urgentes ({orders.filter(o => o.isUrgent).length})
          </Button>
        </div>
      </div>

      {/* Grid de órdenes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {orders.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <ChefHat className={`w-16 h-16 mx-auto mb-4 ${settings.darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={`text-lg ${settings.darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No hay órdenes activas en cocina
            </p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderTicket
              key={order._id}
              order={order}
              onUpdateItemStatus={handleUpdateItemStatus}
              onBump={handleBumpOrder}
              onMarkUrgent={handleMarkUrgent}
              onCancel={handleCancelOrder}
              elapsedTime={calculateElapsedTime(order.receivedAt)}
              urgencyHighlight={getUrgencyHighlight(order)}
              darkMode={settings.darkMode}
            />
          ))
        )}
      </div>
    </div>
  );
}
