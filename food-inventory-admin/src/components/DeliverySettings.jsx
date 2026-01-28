import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Trash2, Save, MapPin } from 'lucide-react';
import { LocationPicker } from './ui/LocationPicker';
import { fetchApi } from '@/lib/api';
import { venezuelaData } from '@/lib/venezuela-data';

export function DeliverySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providers, setProviders] = useState([]);
  const [config, setConfig] = useState({
    businessLocation: null,
    deliveryZones: [],
    nationalShippingRates: [],
    shipping: {
      enabled: true,
      activeProviders: [],
      defaultProvider: null,
    },
    settings: {
      enablePickup: true,
      enableDelivery: true,
      enableNationalShipping: true,
      freeDeliveryThreshold: 0,
      maxDeliveryDistance: 50,
    },
  });

  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      setLoading(true);
      const [data, providersData] = await Promise.all([
        fetchApi('/delivery/rates'),
        fetchApi('/shipping-providers'),
      ]);

      if (providersData) {
        setProviders(providersData);
      }

      if (data) {
        setConfig({
          businessLocation: data.businessLocation || null,
          deliveryZones: data.deliveryZones || [],
          nationalShippingRates: data.nationalShippingRates || [],
          shipping: {
            enabled: data.shipping?.enabled ?? true,
            activeProviders: data.shipping?.activeProviders || [],
            defaultProvider: data.shipping?.defaultProvider || null,
          },
          settings: {
            enablePickup: data.settings?.enablePickup ?? true,
            enableDelivery: data.settings?.enableDelivery ?? true,
            enableNationalShipping: data.settings?.enableNationalShipping ?? true,
            freeDeliveryThreshold: data.settings?.freeDeliveryThreshold || 0,
            maxDeliveryDistance: data.settings?.maxDeliveryDistance || 50,
          },
        });
      }
    } catch (error) {
      console.error('Error loading delivery configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchApi('/delivery/rates', {
        method: 'POST',
        body: JSON.stringify(config),
      });
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error saving delivery configuration:', error);
      alert('Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const addDeliveryZone = () => {
    setConfig({
      ...config,
      deliveryZones: [
        ...config.deliveryZones,
        {
          name: '',
          description: '',
          baseRate: 0,
          ratePerKm: 0,
          minDistance: 0,
          maxDistance: 0,
          minOrderAmount: 0,
          isActive: true,
        },
      ],
    });
  };

  const updateDeliveryZone = (index, field, value) => {
    const updatedZones = [...config.deliveryZones];
    updatedZones[index] = { ...updatedZones[index], [field]: value };
    setConfig({ ...config, deliveryZones: updatedZones });
  };

  const removeDeliveryZone = (index) => {
    setConfig({
      ...config,
      deliveryZones: config.deliveryZones.filter((_, i) => i !== index),
    });
  };

  const toggleProvider = (providerCode) => {
    const currentProviders = config.shipping.activeProviders;
    let newProviders;

    if (currentProviders.includes(providerCode)) {
      newProviders = currentProviders.filter((p) => p !== providerCode);
    } else {
      newProviders = [...currentProviders, providerCode];
    }

    setConfig({
      ...config,
      shipping: {
        ...config.shipping,
        activeProviders: newProviders,
      },
    });
  };

  if (loading) {
    return <div className="p-8">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Configuración de Delivery</h2>
          <p className="text-gray-500">Configura las tarifas y zonas de entrega</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar Configuración'}
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Ubicación del Negocio</TabsTrigger>
          <TabsTrigger value="zones">Zonas de Delivery</TabsTrigger>
          <TabsTrigger value="national">Envío Nacional</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Configuración General</CardTitle>
              <CardDescription>Ajustes generales del sistema de delivery</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enablePickup">Habilitar Pickup (Retiro en tienda)</Label>
                    <p className="text-sm text-gray-500">Permitir que los clientes retiren sus pedidos</p>
                  </div>
                  <Switch
                    id="enablePickup"
                    checked={config.settings.enablePickup}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, enablePickup: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableDelivery">Habilitar Delivery (Entrega local)</Label>
                    <p className="text-sm text-gray-500">Permitir entregas locales con cálculo automático</p>
                  </div>
                  <Switch
                    id="enableDelivery"
                    checked={config.settings.enableDelivery}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, enableDelivery: checked },
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="enableNationalShipping">Habilitar Envío Nacional</Label>
                    <p className="text-sm text-gray-500">Permitir envíos a nivel nacional</p>
                  </div>
                  <Switch
                    id="enableNationalShipping"
                    checked={config.settings.enableNationalShipping}
                    onCheckedChange={(checked) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, enableNationalShipping: checked },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="freeDeliveryThreshold">Umbral de Envío Gratis ($)</Label>
                  <Input
                    id="freeDeliveryThreshold"
                    type="number"
                    min="0"
                    step="0.01"
                    value={config.settings.freeDeliveryThreshold}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, freeDeliveryThreshold: parseFloat(e.target.value) || 0 },
                      })
                    }
                  />
                  <p className="text-sm text-gray-500">Monto mínimo para envío gratis (0 = deshabilitado)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxDeliveryDistance">Distancia Máxima de Delivery (km)</Label>
                  <Input
                    id="maxDeliveryDistance"
                    type="number"
                    min="1"
                    value={config.settings.maxDeliveryDistance}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        settings: { ...config.settings, maxDeliveryDistance: parseInt(e.target.value) || 50 },
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Ubicación del Negocio</CardTitle>
              <CardDescription>
                Esta ubicación se usará como punto de partida para calcular distancias de delivery
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LocationPicker
                value={config.businessLocation}
                onChange={(location) => setConfig({ ...config, businessLocation: location })}
                label="Ubicación del Negocio"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zones">
          <Card>
            <CardHeader>
              <CardTitle>Zonas de Delivery Local</CardTitle>
              <CardDescription>
                Define zonas con tarifas basadas en distancia. El sistema elegirá la zona que corresponda.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={addDeliveryZone} variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Zona
              </Button>

              {config.deliveryZones.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  No hay zonas configuradas. Agrega una zona para empezar.
                </div>
              ) : (
                <div className="space-y-4">
                  {config.deliveryZones.map((zone, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="pt-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={zone.isActive}
                                onCheckedChange={(checked) => updateDeliveryZone(index, 'isActive', checked)}
                              />
                              <Label className="text-sm text-gray-500">
                                {zone.isActive ? 'Activa' : 'Inactiva'}
                              </Label>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeDeliveryZone(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Nombre de la Zona</Label>
                              <Input
                                value={zone.name}
                                onChange={(e) => updateDeliveryZone(index, 'name', e.target.value)}
                                placeholder="Ej: Zona Centro"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Descripción</Label>
                              <Input
                                value={zone.description}
                                onChange={(e) => updateDeliveryZone(index, 'description', e.target.value)}
                                placeholder="Opcional"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Tarifa Base ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={zone.baseRate}
                                onChange={(e) => updateDeliveryZone(index, 'baseRate', parseFloat(e.target.value) || 0)}
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Tarifa por Km ($)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={zone.ratePerKm}
                                onChange={(e) =>
                                  updateDeliveryZone(index, 'ratePerKm', parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Distancia Mínima (km)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={zone.minDistance}
                                onChange={(e) =>
                                  updateDeliveryZone(index, 'minDistance', parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Distancia Máxima (km)</Label>
                              <Input
                                type="number"
                                min="0"
                                step="0.1"
                                value={zone.maxDistance}
                                onChange={(e) =>
                                  updateDeliveryZone(index, 'maxDistance', parseFloat(e.target.value) || 0)
                                }
                              />
                            </div>
                          </div>

                          <div className="p-3 bg-blue-50 dark:bg-blue-950 dark:text-blue-100 rounded text-sm">
                            <strong>Cálculo:</strong> Costo = ${zone.baseRate.toFixed(2)} + (Distancia × $
                            {zone.ratePerKm.toFixed(2)}/km)
                            <br />
                            <strong>Ejemplo:</strong> Para 5 km = ${(zone.baseRate + 5 * zone.ratePerKm).toFixed(2)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="national">
          <Card>
            <CardHeader>
              <CardTitle>Integraciones de Envío Nacional</CardTitle>
              <CardDescription>
                Activa los proveedores de envío que deseas utilizar. Las tarifas se calcularán
                automáticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
                <div>
                  <h3 className="font-medium">Habilitar Envíos Nacionales</h3>
                  <p className="text-sm text-gray-500">
                    Activar el sistema de cálculo de envíos nacionales
                  </p>
                </div>
                <Switch
                  checked={config.shipping.enabled}
                  onCheckedChange={(checked) =>
                    setConfig({
                      ...config,
                      shipping: { ...config.shipping, enabled: checked },
                    })
                  }
                />
              </div>

              {providers.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  Cargando proveedores de envío...
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {providers.map((provider) => (
                    <div
                      key={provider.code}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {provider.logoUrl ? (
                          <div className="w-12 h-12 rounded-full bg-white p-2 flex items-center justify-center border border-gray-100 shadow-sm overflow-hidden">
                            <img
                              src={provider.logoUrl}
                              alt={provider.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                            {provider.name.substring(0, 2)}
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{provider.name}</h4>
                          <p className="text-xs text-gray-500">{provider.code}</p>
                        </div>
                      </div>
                      <Switch
                        checked={config.shipping.activeProviders.includes(provider.code)}
                        onCheckedChange={() => toggleProvider(provider.code)}
                        disabled={!config.shipping.enabled}
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}