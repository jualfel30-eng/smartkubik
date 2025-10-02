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
  const [config, setConfig] = useState({
    businessLocation: null,
    deliveryZones: [],
    nationalShippingRates: [],
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
      const data = await fetchApi('/delivery/rates');
      if (data) {
        setConfig({
          businessLocation: data.businessLocation || null,
          deliveryZones: data.deliveryZones || [],
          nationalShippingRates: data.nationalShippingRates || [],
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

  const addNationalRate = () => {
    setConfig({
      ...config,
      nationalShippingRates: [
        ...config.nationalShippingRates,
        {
          state: '',
          city: '',
          rate: 0,
          estimatedDays: 0,
          courierCompany: '',
          isActive: true,
        },
      ],
    });
  };

  const updateNationalRate = (index, field, value) => {
    const updatedRates = [...config.nationalShippingRates];
    updatedRates[index] = { ...updatedRates[index], [field]: value };
    setConfig({ ...config, nationalShippingRates: updatedRates });
  };

  const removeNationalRate = (index) => {
    setConfig({
      ...config,
      nationalShippingRates: config.nationalShippingRates.filter((_, i) => i !== index),
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
              <CardTitle>Tarifas de Envío Nacional</CardTitle>
              <CardDescription>Define tarifas fijas por estado o ciudad</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={addNationalRate} variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar Tarifa
              </Button>

              {config.nationalShippingRates.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                  No hay tarifas nacionales configuradas. Agrega una tarifa para empezar.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activo</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Tarifa ($)</TableHead>
                      <TableHead>Días Estimados</TableHead>
                      <TableHead>Courier</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {config.nationalShippingRates.map((rate, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Switch
                            checked={rate.isActive}
                            onCheckedChange={(checked) => updateNationalRate(index, 'isActive', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <select
                            value={rate.state}
                            onChange={(e) => updateNationalRate(index, 'state', e.target.value)}
                            className="w-full p-2 border rounded"
                          >
                            <option value="">Seleccionar...</option>
                            {venezuelaData.map((state) => (
                              <option key={state.estado} value={state.estado}>
                                {state.estado}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rate.city}
                            onChange={(e) => updateNationalRate(index, 'city', e.target.value)}
                            placeholder="Opcional"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={rate.rate}
                            onChange={(e) => updateNationalRate(index, 'rate', parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={rate.estimatedDays}
                            onChange={(e) =>
                              updateNationalRate(index, 'estimatedDays', parseInt(e.target.value) || 0)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={rate.courierCompany}
                            onChange={(e) => updateNationalRate(index, 'courierCompany', e.target.value)}
                            placeholder="Ej: MRW"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeNationalRate(index)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}