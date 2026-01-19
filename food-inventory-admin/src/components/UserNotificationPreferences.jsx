import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';
import { useAuth } from '../hooks/use-auth';
import { toast } from 'sonner';
import {
    ShoppingCart,
    Package,
    Users,
    DollarSign,
    Megaphone,
    AlertTriangle,
    Bell,
    Mail,
    MessageSquare,
    Volume2,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.smartkubik.com/api/v1';

const CATEGORIES = [
    {
        key: 'sales',
        label: 'Ventas',
        description: 'Nuevas órdenes, confirmaciones, entregas',
        icon: ShoppingCart,
        color: 'text-blue-600',
    },
    {
        key: 'inventory',
        label: 'Inventario',
        description: 'Stock bajo, productos por vencer, recepciones',
        icon: Package,
        color: 'text-amber-600',
    },
    {
        key: 'hr',
        label: 'RRHH',
        description: 'Nuevos empleados, nóminas pendientes y completadas',
        icon: Users,
        color: 'text-purple-600',
    },
    {
        key: 'finance',
        label: 'Finanzas',
        description: 'Cuentas por pagar, saldo bajo, facturación',
        icon: DollarSign,
        color: 'text-green-600',
    },
    {
        key: 'marketing',
        label: 'Marketing',
        description: 'Campañas iniciadas, respuestas de clientes',
        icon: Megaphone,
        color: 'text-pink-600',
    },
    {
        key: 'system',
        label: 'Sistema',
        description: 'Alertas del sistema y mantenimiento',
        icon: AlertTriangle,
        color: 'text-red-600',
    },
];

const DEFAULT_PREFERENCES = {
    enabled: true,
    categories: {
        sales: { inApp: true, email: true, whatsapp: false },
        inventory: { inApp: true, email: true, whatsapp: false },
        hr: { inApp: true, email: false, whatsapp: false },
        finance: { inApp: true, email: true, whatsapp: false },
        marketing: { inApp: true, email: false, whatsapp: false },
        system: { inApp: true, email: false, whatsapp: false },
    },
    soundEnabled: true,
};

export function UserNotificationPreferences() {
    const { token } = useAuth();
    const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchPreferences();
    }, [token]);

    const fetchPreferences = async () => {
        if (!token) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/notification-center/preferences`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setPreferences({ ...DEFAULT_PREFERENCES, ...data });
            }
        } catch (error) {
            console.error('Error fetching notification preferences:', error);
        } finally {
            setLoading(false);
        }
    };

    const savePreferences = async () => {
        if (!token) return;

        setSaving(true);
        try {
            const response = await fetch(`${API_URL}/notification-center/preferences`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(preferences),
            });

            if (response.ok) {
                toast.success('Preferencias guardadas correctamente');
            } else {
                toast.error('Error al guardar las preferencias');
            }
        } catch (error) {
            console.error('Error saving notification preferences:', error);
            toast.error('Error al guardar las preferencias');
        } finally {
            setSaving(false);
        }
    };

    const updateEnabled = (enabled) => {
        setPreferences((prev) => ({ ...prev, enabled }));
    };

    const updateSoundEnabled = (soundEnabled) => {
        setPreferences((prev) => ({ ...prev, soundEnabled }));
    };

    const updateCategoryChannel = (category, channel, value) => {
        setPreferences((prev) => ({
            ...prev,
            categories: {
                ...prev.categories,
                [category]: {
                    ...prev.categories[category],
                    [channel]: value,
                },
            },
        }));
    };

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-72 mt-2" />
                </CardHeader>
                <CardContent className="space-y-4">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Preferencias de Notificaciones
                    </CardTitle>
                    <CardDescription>
                        Configura qué notificaciones deseas recibir y por qué canales.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Master toggle */}
                    <div className="flex items-center justify-between pb-4 border-b">
                        <div>
                            <Label className="text-base font-medium">Activar Notificaciones</Label>
                            <p className="text-sm text-muted-foreground">
                                Recibe notificaciones sobre eventos importantes en tu negocio.
                            </p>
                        </div>
                        <Switch
                            checked={preferences.enabled}
                            onCheckedChange={updateEnabled}
                        />
                    </div>

                    {/* Sound toggle */}
                    <div className="flex items-center justify-between pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <Volume2 className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <Label className="text-base font-medium">Sonido de Notificaciones</Label>
                                <p className="text-sm text-muted-foreground">
                                    Reproducir un sonido al recibir notificaciones importantes.
                                </p>
                            </div>
                        </div>
                        <Switch
                            checked={preferences.soundEnabled}
                            onCheckedChange={updateSoundEnabled}
                            disabled={!preferences.enabled}
                        />
                    </div>

                    {/* Categories */}
                    {preferences.enabled && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-base font-medium">Notificaciones por Categoría</Label>
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Bell className="h-3 w-3" /> In-App
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Mail className="h-3 w-3" /> Email
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <MessageSquare className="h-3 w-3" /> WhatsApp
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {CATEGORIES.map((category) => {
                                    const Icon = category.icon;
                                    const catPrefs = preferences.categories[category.key] || {
                                        inApp: true,
                                        email: false,
                                        whatsapp: false,
                                    };

                                    return (
                                        <div
                                            key={category.key}
                                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-full bg-muted ${category.color}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{category.label}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {category.description}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Switch
                                                    checked={catPrefs.inApp}
                                                    onCheckedChange={(v) =>
                                                        updateCategoryChannel(category.key, 'inApp', v)
                                                    }
                                                    aria-label={`In-App para ${category.label}`}
                                                />
                                                <Switch
                                                    checked={catPrefs.email}
                                                    onCheckedChange={(v) =>
                                                        updateCategoryChannel(category.key, 'email', v)
                                                    }
                                                    aria-label={`Email para ${category.label}`}
                                                />
                                                <Switch
                                                    checked={catPrefs.whatsapp}
                                                    onCheckedChange={(v) =>
                                                        updateCategoryChannel(category.key, 'whatsapp', v)
                                                    }
                                                    aria-label={`WhatsApp para ${category.label}`}
                                                    disabled // WhatsApp requires additional setup
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={savePreferences} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Preferencias'}
                </Button>
            </div>
        </div>
    );
}

export default UserNotificationPreferences;
