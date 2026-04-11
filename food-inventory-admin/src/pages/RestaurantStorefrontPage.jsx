import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Globe, ShoppingBag, Settings2, Save, Loader2,
  Clock, CheckCircle2, ChefHat, PackageSearch, Truck, XCircle,
  RefreshCw, ExternalLink,
} from 'lucide-react';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

const STATUS_COLORS = {
  pending:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-200',
  preparing: 'bg-orange-100 text-orange-800 border-orange-200',
  ready:     'bg-purple-100 text-purple-800 border-purple-200',
  delivered: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_ICONS = {
  pending:   <Clock className="w-3.5 h-3.5" />,
  confirmed: <CheckCircle2 className="w-3.5 h-3.5" />,
  preparing: <ChefHat className="w-3.5 h-3.5" />,
  ready:     <PackageSearch className="w-3.5 h-3.5" />,
  delivered: <Truck className="w-3.5 h-3.5" />,
  cancelled: <XCircle className="w-3.5 h-3.5" />,
};

const NEXT_STATUS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['ready'],
  ready:     ['delivered'],
  delivered: [],
  cancelled: [],
};

const ALL_STATUSES = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];

// ─── Default config ───────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabled: false,
  restaurantName: '',
  tagline: '',
  logoUrl: '',
  heroVideoUrl: '',
  heroImageUrl: '',
  whatsappNumber: '',
  paymentInstructions: '',
  currency: 'USD',
  accentColor: '#FF4500',
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function RestaurantStorefrontPage() {
  const [activeTab, setActiveTab] = useState('config');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Storefront Restaurante
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Gestiona la configuración de tu menú en línea y los pedidos entrantes.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="config">
            <Settings2 className="w-4 h-4 mr-2" />
            Configuración
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="w-4 h-4 mr-2" />
            Pedidos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <ConfigTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-6">
          <OrdersTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Config Tab ───────────────────────────────────────────────────────────────
function ConfigTab() {
  const [form, setForm] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi('/restaurant-storefront/config')
      .then((data) => {
        const rc = data?.restaurantConfig || {};
        setForm({
          enabled:             rc.enabled             ?? false,
          restaurantName:      rc.restaurantName      ?? '',
          tagline:             rc.tagline             ?? '',
          logoUrl:             rc.logoUrl             ?? '',
          heroVideoUrl:        rc.heroVideoUrl        ?? '',
          heroImageUrl:        rc.heroImageUrl        ?? '',
          whatsappNumber:      rc.whatsappNumber      ?? '',
          paymentInstructions: rc.paymentInstructions ?? '',
          currency:            rc.currency            ?? 'USD',
          accentColor:         rc.accentColor         ?? '#FF4500',
        });
      })
      .catch(() => toast.error('Error cargando configuración del storefront'))
      .finally(() => setLoading(false));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/restaurant-storefront/config', {
        method: 'PUT',
        body: JSON.stringify({ restaurantConfig: form }),
      });
      toast.success('Configuración guardada exitosamente');
    } catch (err) {
      toast.error('Error al guardar', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(form.accentColor);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left column — main form */}
      <div className="lg:col-span-2 space-y-6">

        {/* Enable toggle */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Estado del Storefront</CardTitle>
                <CardDescription>Activa o desactiva el acceso público al menú en línea</CardDescription>
              </div>
              <Switch
                checked={form.enabled}
                onCheckedChange={(v) => set('enabled', v)}
              />
            </div>
          </CardHeader>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identidad del Restaurante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nombre del Restaurante *</Label>
                <Input value={form.restaurantName} onChange={(e) => set('restaurantName', e.target.value)} placeholder="Ej: La Parrilla de Juan" />
              </div>
              <div className="space-y-1.5">
                <Label>Tagline (opcional)</Label>
                <Input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="Tu sabor favorito, siempre fresco" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>URL del Logo</Label>
              <Input value={form.logoUrl} onChange={(e) => set('logoUrl', e.target.value)} placeholder="https://cdn.ejemplo.com/logo.png" />
            </div>
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imagen y Video de Portada</CardTitle>
            <CardDescription>El video tiene prioridad. Si no hay video, se usa la imagen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>URL Video Hero</Label>
              <Input value={form.heroVideoUrl} onChange={(e) => set('heroVideoUrl', e.target.value)} placeholder="https://cdn.ejemplo.com/hero.mp4" />
            </div>
            <div className="space-y-1.5">
              <Label>URL Imagen Hero (fallback)</Label>
              <Input value={form.heroImageUrl} onChange={(e) => set('heroImageUrl', e.target.value)} placeholder="https://cdn.ejemplo.com/hero.jpg" />
            </div>
          </CardContent>
        </Card>

        {/* Contact & Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contacto y Pagos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>WhatsApp para Pedidos *</Label>
                <Input value={form.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="584141234567" />
                <p className="text-xs text-gray-400">Con código de país, sin + (ej: 584141234567)</p>
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} placeholder="USD" maxLength={10} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Instrucciones de Pago *</Label>
              <Textarea
                rows={4}
                value={form.paymentInstructions}
                onChange={(e) => set('paymentInstructions', e.target.value)}
                placeholder={'Zelle: correo@ejemplo.com\nPago Móvil: 0414-0000000 / V-00000000 / Banco'}
                className="resize-none"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right column — visual preview + save */}
      <div className="space-y-6">
        {/* Color preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Color de Acento</CardTitle>
            <CardDescription>Define el color principal de botones y destacados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Input
                value={form.accentColor}
                onChange={(e) => set('accentColor', e.target.value)}
                placeholder="#FF4500"
                className="font-mono uppercase"
                maxLength={7}
              />
              {isValidHex && (
                <div
                  className="w-10 h-10 rounded-lg border border-gray-200 shrink-0 shadow-sm"
                  style={{ backgroundColor: form.accentColor }}
                />
              )}
            </div>
            {!isValidHex && form.accentColor && (
              <p className="text-xs text-red-500">Formato inválido. Usa Hex: #FF4500</p>
            )}
            {/* Quick presets */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Colores rápidos:</p>
              <div className="flex gap-2 flex-wrap">
                {['#FF4500', '#E63946', '#2563EB', '#16A34A', '#9333EA', '#F59E0B', '#0D9488'].map((c) => (
                  <button
                    key={c}
                    onClick={() => set('accentColor', c)}
                    className="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      borderColor: form.accentColor === c ? '#111' : 'transparent',
                    }}
                    title={c}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save + link */}
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar Cambios
            </Button>
            {form.enabled && form.restaurantName && (
              <p className="text-xs text-center text-gray-400 flex items-center justify-center gap-1">
                <Globe className="w-3.5 h-3.5" />
                Storefront activo y visible al público
              </p>
            )}
            {!form.enabled && (
              <p className="text-xs text-center text-amber-500">
                Storefront desactivado — no visible al público
              </p>
            )}
          </CardContent>
        </Card>

        {/* Preview mini */}
        {isValidHex && form.restaurantName && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Vista previa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl overflow-hidden border border-gray-100 shadow-sm text-sm font-sans">
                <div className="p-3 text-white font-bold text-base" style={{ backgroundColor: '#111' }}>
                  {form.restaurantName}<span style={{ color: form.accentColor }}>.</span>
                </div>
                <div className="p-3 bg-gray-950 text-gray-300 text-xs">
                  {form.tagline || 'Tu menú en línea'}
                </div>
                <div className="p-3 bg-gray-900 flex items-center justify-between">
                  <span className="text-xs text-gray-400">Ordenar Ahora</span>
                  <div
                    className="px-3 py-1 rounded-full text-xs font-bold text-white"
                    style={{ backgroundColor: form.accentColor }}
                  >
                    Ver Menú
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchApi('/restaurant-orders?limit=100');
      setOrders(res.data ?? []);
    } catch {
      toast.error('Error cargando pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const updateStatus = async (id, status) => {
    setUpdatingId(id);
    try {
      const updated = await fetchApi(`/restaurant-orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setOrders((prev) => prev.map((o) => (o._id === id ? updated : o)));
      if (selectedOrder?._id === id) setSelectedOrder(updated);
      toast.success(`Estado actualizado: ${STATUS_LABELS[status]}`);
    } catch {
      toast.error('Error actualizando estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const filtered = orders.filter((o) =>
    filter === 'active'
      ? !['delivered', 'cancelled'].includes(o.status)
      : filter === 'completed'
      ? ['delivered', 'cancelled'].includes(o.status)
      : o.status === filter,
  );

  const countByStatus = (s) => orders.filter((o) => o.status === s).length;
  const activeCount   = orders.filter((o) => !['delivered', 'cancelled'].includes(o.status)).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{orders.length} pedido(s) total</p>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="w-4 h-4 mr-1" /> Actualizar
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'active',    label: 'Activos',    count: activeCount },
          { key: 'completed', label: 'Completados', count: null },
          ...ALL_STATUSES.map((s) => ({ key: s, label: STATUS_LABELS[s], count: countByStatus(s) })),
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              filter === key
                ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
            }`}
          >
            {label}
            {count !== null && count > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Order list */}
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                No hay pedidos en este estado.
              </div>
            ) : (
              filtered.map((order) => (
                <button
                  key={order._id}
                  onClick={() => setSelectedOrder(order)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedOrder?._id === order._id
                      ? 'bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-600'
                      : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-900 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                      {order.orderRef}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_COLORS[order.status]}`}>
                      {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status]}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{order.customerName}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-xs text-gray-400">{order.items?.length} ítem(s)</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-white">${order.total?.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(order.createdAt).toLocaleString('es')}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Order detail */}
          {selectedOrder ? (
            <Card className="h-fit sticky top-6">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-mono">{selectedOrder.orderRef}</CardTitle>
                    <CardDescription>{selectedOrder.customerName} · {selectedOrder.customerPhone}</CardDescription>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_COLORS[selectedOrder.status]}`}>
                    {STATUS_ICONS[selectedOrder.status]} {STATUS_LABELS[selectedOrder.status]}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold text-gray-900 dark:text-white">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-mono text-gray-700 dark:text-gray-300">
                          ${item.final_price?.toFixed(2)}
                        </span>
                      </div>
                      {item.customizations?.length > 0 && (
                        <div className="mt-1 space-y-0.5">
                          {item.customizations.map((mod, j) => (
                            <p key={j} className="text-xs text-gray-500">
                              {mod.action === 'remove' ? '❌ Sin ' : '➕ '}{mod.name}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="flex justify-between font-bold text-gray-900 dark:text-white border-t pt-3">
                  <span>Total</span>
                  <span>${selectedOrder.total?.toFixed(2)}</span>
                </div>

                {/* Notes */}
                {selectedOrder.notes && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400 mb-1">Notas del cliente:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Status pipeline */}
                {NEXT_STATUS[selectedOrder.status]?.length > 0 && (
                  <div className="flex flex-wrap gap-2 border-t pt-3">
                    {NEXT_STATUS[selectedOrder.status].map((next) => (
                      <Button
                        key={next}
                        size="sm"
                        variant={next === 'cancelled' ? 'destructive' : 'default'}
                        disabled={updatingId === selectedOrder._id}
                        onClick={() => updateStatus(selectedOrder._id, next)}
                        className="flex items-center gap-1.5"
                      >
                        {updatingId === selectedOrder._id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : STATUS_ICONS[next]}
                        {STATUS_LABELS[next]}
                      </Button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="hidden lg:flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-gray-400 text-sm">
              Selecciona un pedido para ver el detalle
            </div>
          )}
        </div>
      )}
    </div>
  );
}
