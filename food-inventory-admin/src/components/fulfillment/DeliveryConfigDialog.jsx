import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

export function DeliveryConfigDialog({ open, onOpenChange, onConfigChange }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({
        enablePickup: true,
        enableDelivery: true,
        enableNationalShipping: false,
        enablePosOrders: false // New setting for In-Store orders
    });

    useEffect(() => {
        if (open) {
            loadConfiguration();
        }
    }, [open]);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            const data = await fetchApi('/delivery/rates');
            if (data?.settings) {
                setConfig({
                    enablePickup: data.settings.enablePickup ?? true,
                    enableDelivery: data.settings.enableDelivery ?? true,
                    enableNationalShipping: data.settings.enableNationalShipping ?? false,
                    enablePosOrders: data.settings.enablePosOrders ?? false,
                    // Preserve other settings we don't edit here but need to send back
                    ...data.settings
                });
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
            toast.error('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            // We only send the settings object to the /delivery/rates endpoint
            // The endpoint expects the full config structure typically, so we might need to fetch full first or partial update
            // Assuming the backend handles partial updates or we re-use the structure from load

            // Re-fetch current full state to be safe before saving, or just send what we have if backend matches
            // For safety, let's assume we need to send the structure expected by DeliverySettings

            const currentData = await fetchApi('/delivery/rates');
            const updatedConfig = {
                ...currentData,
                settings: {
                    ...currentData.settings,
                    enablePickup: config.enablePickup,
                    enableDelivery: config.enableDelivery,
                    enableNationalShipping: config.enableNationalShipping,
                    enablePosOrders: config.enablePosOrders
                }
            };

            await fetchApi('/delivery/rates', {
                method: 'POST',
                body: JSON.stringify(updatedConfig),
            });

            toast.success('Configuración guardada');
            onConfigChange?.(config); // Notify parent to refresh filters
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving configuration:', error);
            toast.error('Error al guardar la configuración');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Configuración de Entregas</DialogTitle>
                    <DialogDescription>
                        Selecciona los métodos de entrega activos para tu negocio.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">Cargando...</div>
                ) : (
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="pickup" className="flex flex-col space-y-1">
                                <span>Pickup (Retiro)</span>
                                <span className="font-normal text-xs text-muted-foreground">Clientes retiran en tienda</span>
                            </Label>
                            <Switch
                                id="pickup"
                                checked={config.enablePickup}
                                onCheckedChange={(c) => setConfig(prev => ({ ...prev, enablePickup: c }))}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="delivery" className="flex flex-col space-y-1">
                                <span>Delivery Local</span>
                                <span className="font-normal text-xs text-muted-foreground">Despacho en la ciudad</span>
                            </Label>
                            <Switch
                                id="delivery"
                                checked={config.enableDelivery}
                                onCheckedChange={(c) => setConfig(prev => ({ ...prev, enableDelivery: c }))}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2">
                            <Label htmlFor="national" className="flex flex-col space-y-1">
                                <span>Envíos Nacionales</span>
                                <span className="font-normal text-xs text-muted-foreground">Envíos por courier (MRW, Zoom, etc)</span>
                            </Label>
                            <Switch
                                id="national"
                                checked={config.enableNationalShipping}
                                onCheckedChange={(c) => setConfig(prev => ({ ...prev, enableNationalShipping: c }))}
                            />
                        </div>

                        <div className="flex items-center justify-between space-x-2 border-t pt-4">
                            <Label htmlFor="pos" className="flex flex-col space-y-1">
                                <span>Ventas en Tienda (POS)</span>
                                <span className="font-normal text-xs text-muted-foreground">Mostrar órdenes creadas en caja</span>
                            </Label>
                            <Switch
                                id="pos"
                                checked={config.enablePosOrders}
                                onCheckedChange={(c) => setConfig(prev => ({ ...prev, enablePosOrders: c }))}
                            />
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || loading}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
