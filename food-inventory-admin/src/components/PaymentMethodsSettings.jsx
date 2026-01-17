import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const BASE_PAYMENT_METHODS = [
    { id: "efectivo_usd", name: "Efectivo (USD)", igtfApplicable: true },
    { id: "transferencia_usd", name: "Transferencia (USD)", igtfApplicable: true },
    { id: "zelle_usd", name: "Zelle (USD)", igtfApplicable: true },
    { id: "efectivo_ves", name: "Efectivo (VES)", igtfApplicable: false },
    { id: "transferencia_ves", name: "Transferencia (VES)", igtfApplicable: false },
    { id: "pago_movil_ves", name: "Pago Móvil (VES)", igtfApplicable: false },
    { id: "pos_ves", name: "Punto de Venta (VES)", igtfApplicable: false },
    { id: "tarjeta_ves", name: "Tarjeta (VES)", igtfApplicable: false },
    { id: "pago_mixto", name: "Pago Mixto", igtfApplicable: false },
];

const METHOD_FIELDS = {
    'pago_movil_ves': [
        { key: 'bank', label: 'Banco', placeholder: 'Ej: Banesco' },
        { key: 'phoneNumber', label: 'Teléfono', placeholder: 'Ej: 0414-1234567' },
        { key: 'cid', label: 'Cédula / RIF', placeholder: 'Ej: J-12345678' }
    ],
    'zelle_usd': [
        { key: 'email', label: 'Correo Zelle', placeholder: 'correo@ejemplo.com' },
        { key: 'accountName', label: 'Nombre del Titular', placeholder: 'Nombre Completo' }
    ],
    'transferencia_ves': [
        { key: 'bank', label: 'Banco', placeholder: 'Ej: Mercantil' },
        { key: 'accountNumber', label: 'Número de Cuenta', placeholder: '0105...' },
        { key: 'accountName', label: 'Titular', placeholder: 'Nombre del titular' },
        { key: 'cid', label: 'Cédula / RIF', placeholder: 'V-123456 / J-123456' },
        { key: 'email', label: 'Email Confirmación (Opcional)', placeholder: 'pagos@empresa.com' }
    ],
    'transferencia_usd': [
        { key: 'bank', label: 'Banco', placeholder: 'Ej: Banesco Panamá' },
        { key: 'accountNumber', label: 'Número de Cuenta / IBAN', placeholder: '...' },
        { key: 'accountName', label: 'Titular', placeholder: 'Nombre del titular' },
        { key: 'email', label: 'Email Confirmación (Opcional)', placeholder: 'pagos@empresa.com' }
    ]
};

export function PaymentMethodsSettings() {
    const [methods, setMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const response = await fetchApi('/tenant/settings');
            const tenantSettings = response.data?.settings?.paymentMethods || [];

            // Merge with base methods
            const merged = BASE_PAYMENT_METHODS.map(base => {
                const existing = tenantSettings.find(m => m.id === base.id);
                // Ensure details object exists
                const defaultDetails = {
                    bank: '', accountNumber: '', accountName: '', cid: '', phoneNumber: '', email: ''
                };

                if (existing) {
                    return {
                        ...base,
                        ...existing,
                        details: { ...defaultDetails, ...(existing.details || {}) }
                    };
                }
                return {
                    ...base,
                    enabled: false,
                    instructions: '',
                    details: defaultDetails
                };
            });

            setMethods(merged);
        } catch (error) {
            console.error('Error loading payment settings:', error);
            toast.error('Error al cargar métodos de pago');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = (id) => {
        setMethods(prev => prev.map(m =>
            m.id === id ? { ...m, enabled: !m.enabled } : m
        ));
    };

    const handleInstructionChange = (id, value) => {
        setMethods(prev => prev.map(m =>
            m.id === id ? { ...m, instructions: value } : m
        ));
    };

    const handleDetailChange = (id, fieldKey, value) => {
        setMethods(prev => prev.map(m => {
            if (m.id !== id) return m;
            return {
                ...m,
                details: {
                    ...m.details,
                    [fieldKey]: value
                }
            };
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            const payload = {
                settings: {
                    paymentMethods: methods.map(m => ({
                        id: m.id,
                        name: m.name,
                        enabled: m.enabled,
                        igtfApplicable: m.igtfApplicable,
                        instructions: m.instructions || '',
                        details: m.details // Send the structured details
                    }))
                }
            };

            await fetchApi('/tenant/settings', {
                method: 'PUT',
                body: JSON.stringify(payload)
            });

            toast.success('Información de pago guardada');

        } catch (error) {
            console.error('Error saving payment settings:', error);
            toast.error('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div>Cargando configuración...</div>;

    return (
        <Card className="mt-6">
            <CardHeader>
                <CardTitle>Métodos de Pago Aceptados</CardTitle>
                <CardDescription>
                    Configura los datos necesarios para que tus clientes puedan realizarte pagos.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4">
                    {methods.map((method) => {
                        const specificFields = METHOD_FIELDS[method.id];

                        return (
                            <div key={method.id} className="flex flex-col border p-4 rounded-lg space-y-4 bg-card hover:bg-accent/5 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label className="text-base font-medium">{method.name}</Label>
                                        <p className="text-xs text-muted-foreground">
                                            {method.igtfApplicable ? 'Aplica IGTF' : 'Moneda local'}
                                        </p>
                                    </div>
                                    <Switch
                                        checked={method.enabled}
                                        onCheckedChange={() => handleToggle(method.id)}
                                    />
                                </div>

                                {method.enabled && (
                                    <div className="animate-in fade-in slide-in-from-top-1 duration-200 space-y-4 pl-1">

                                        {/* Render Specific Fields if defined */}
                                        {specificFields ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {specificFields.map(field => (
                                                    <div key={field.key} className="space-y-1.5">
                                                        <Label className="text-xs font-medium text-muted-foreground">
                                                            {field.label}
                                                        </Label>
                                                        <Input
                                                            value={method.details?.[field.key] || ''}
                                                            onChange={(e) => handleDetailChange(method.id, field.key, e.target.value)}
                                                            placeholder={field.placeholder}
                                                            className="h-9 bg-background"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : null}

                                        {/* Generic Instructions Field (Always visible as fallback or extra info) */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium text-muted-foreground">
                                                Instrucciones Adicionales / Notas
                                            </Label>
                                            <Textarea
                                                placeholder="Ej: Reportar pago al WhatsApp..."
                                                value={method.instructions || ''}
                                                onChange={(e) => handleInstructionChange(method.id, e.target.value)}
                                                className="min-h-[60px] bg-background resize-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end pt-4 sticky bottom-0 bg-background/80 backdrop-blur-sm p-4 border-t z-10">
                    <Button onClick={handleSave} disabled={saving} size="lg">
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
