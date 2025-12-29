import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function BillingSettings({ settings, onSettingChange }) {
    const preferences = settings.billingPreferences || {
        defaultDeliveryMethod: 'none',
        autoPrintCopies: 1,
        enabledMethods: ['print', 'email', 'whatsapp'],
        printers: { receiptPrinterIp: '' }
    };

    const handleChange = (field, value) => {
        onSettingChange({
            ...preferences,
            [field]: value
        });
    };

    const toggleMethod = (method) => {
        const currentMethods = preferences.enabledMethods || [];
        let newMethods;
        if (currentMethods.includes(method)) {
            newMethods = currentMethods.filter(m => m !== method);
        } else {
            newMethods = [...currentMethods, method];
        }
        handleChange('enabledMethods', newMethods);
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Automatización de Entrega</CardTitle>
                    <CardDescription>
                        Configura qué debe suceder automáticamente después de emitir una factura.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label>Método de Entrega Predeterminado</Label>
                        <Select
                            value={preferences.defaultDeliveryMethod || 'none'}
                            onValueChange={(val) => handleChange('defaultDeliveryMethod', val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Seleccionar acción automática" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Ninguna (Manual)</SelectItem>
                                <SelectItem value="print">Imprimir Recibo</SelectItem>
                                <SelectItem value="email">Enviar por Email</SelectItem>
                                {/* WhatsApp auto-send implies opening the link, might be annoying if blocked popups */}
                                <SelectItem value="whatsapp">Abrir WhatsApp</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            Esta acción se ejecutará automáticamente apenas se genere la factura en el punto de venta.
                        </p>
                    </div>

                    {preferences.defaultDeliveryMethod === 'print' && (
                        <div className="space-y-2">
                            <Label>Copias a Imprimir (Auto)</Label>
                            <Input
                                type="number"
                                min="1"
                                max="5"
                                value={preferences.autoPrintCopies || 1}
                                onChange={(e) => handleChange('autoPrintCopies', parseInt(e.target.value) || 1)}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Métodos Habilitados</CardTitle>
                    <CardDescription>
                        Selecciona qué opciones mostrar a los cajeros en la pantalla de confirmación.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <div>
                            <Label>Imprimir</Label>
                            <p className="text-sm text-muted-foreground">Mostrar botón de impresión</p>
                        </div>
                        <Switch
                            checked={preferences.enabledMethods?.includes('print')}
                            onCheckedChange={() => toggleMethod('print')}
                        />
                    </div>

                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <div>
                            <Label>Email</Label>
                            <p className="text-sm text-muted-foreground">Permitir envío por correo</p>
                        </div>
                        <Switch
                            checked={preferences.enabledMethods?.includes('email')}
                            onCheckedChange={() => toggleMethod('email')}
                        />
                    </div>

                    <div className="flex items-center justify-between border p-3 rounded-lg">
                        <div>
                            <Label>WhatsApp</Label>
                            <p className="text-sm text-muted-foreground">Permitir envío por WhatsApp</p>
                        </div>
                        <Switch
                            checked={preferences.enabledMethods?.includes('whatsapp')}
                            onCheckedChange={() => toggleMethod('whatsapp')}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración de Impresora (Opcional)</CardTitle>
                    <CardDescription>
                        Para impresión directa térmica (si aplica).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        <Label>IP de Impresora de Recibos</Label>
                        <Input
                            placeholder="Ej: 192.168.1.200"
                            value={preferences.printers?.receiptPrinterIp || ''}
                            onChange={(e) => {
                                const updatedPrinters = { ...preferences.printers, receiptPrinterIp: e.target.value };
                                handleChange('printers', updatedPrinters);
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
