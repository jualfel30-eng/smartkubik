import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';

export function NotificationSettings({ settings, onSettingChange }) {
    const prefs = settings?.notifications || {
        customerOrderUpdates: true,
        enabledChannels: ['email'],
        notifyOnPicking: true,
        notifyOnShipped: true,
        notifyOnDelivered: true,
    };

    const updatePref = (key, value) => {
        onSettingChange({
            ...prefs,
            [key]: value,
        });
    };

    const updateChannel = (channel, checked) => {
        const currentChannels = prefs.enabledChannels || [];
        let newChannels;
        if (checked) {
            newChannels = [...currentChannels, channel];
        } else {
            newChannels = currentChannels.filter((c) => c !== channel);
        }
        updatePref('enabledChannels', newChannels);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Notificaciones al Cliente</CardTitle>
                <CardDescription>
                    Configura qué notificaciones reciben tus clientes sobre el estado de su pedido.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-base">Habilitar Notificaciones de Estado</Label>
                        <p className="text-sm text-muted-foreground">
                            Enviar actualizaciones automáticas cuando cambia el estado de la orden.
                        </p>
                    </div>
                    <Switch
                        checked={prefs.customerOrderUpdates}
                        onCheckedChange={(c) => updatePref('customerOrderUpdates', c)}
                    />
                </div>

                {prefs.customerOrderUpdates && (
                    <div className="pl-4 border-l-2 border-slate-100 space-y-4">
                        <div className="space-y-3">
                            <Label>Canales Habilitados</Label>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="chan_email"
                                    checked={prefs.enabledChannels?.includes('email')}
                                    onCheckedChange={(c) => updateChannel('email', c)}
                                />
                                <Label htmlFor="chan_email" className="font-normal">
                                    Email
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="chan_whatsapp"
                                    checked={prefs.enabledChannels?.includes('whatsapp')}
                                    onCheckedChange={(c) => updateChannel('whatsapp', c)}
                                    disabled // Future phase
                                />
                                <Label htmlFor="chan_whatsapp" className="font-normal text-muted-foreground">
                                    WhatsApp (Próximamente)
                                </Label>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4 border-t">
                            <Label>Eventos</Label>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="evt_picking" className="font-normal">
                                    Al iniciar preparación (Picking)
                                </Label>
                                <Switch
                                    id="evt_picking"
                                    checked={prefs.notifyOnPicking}
                                    onCheckedChange={(c) => updatePref('notifyOnPicking', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="evt_shipped" className="font-normal">
                                    Al enviar / En camino (In Transit)
                                </Label>
                                <Switch
                                    id="evt_shipped"
                                    checked={prefs.notifyOnShipped}
                                    onCheckedChange={(c) => updatePref('notifyOnShipped', c)}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label htmlFor="evt_delivered" className="font-normal">
                                    Al entregar (Delivered)
                                </Label>
                                <Switch
                                    id="evt_delivered"
                                    checked={prefs.notifyOnDelivered}
                                    onCheckedChange={(c) => updatePref('notifyOnDelivered', c)}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
