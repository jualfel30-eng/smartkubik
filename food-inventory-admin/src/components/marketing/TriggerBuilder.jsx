import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  ShoppingCart,
  Gift,
  Cake,
  Calendar,
  TrendingUp,
  Diamond,
  Target,
} from 'lucide-react';
import { getMarketingCampaigns } from '@/lib/api';

/**
 * TriggerBuilder - Component for creating/editing automated marketing triggers
 *
 * Allows configuration of:
 * - Event type (cart abandonment, birthday, inactivity, etc.)
 * - Trigger conditions
 * - Campaign to execute
 * - Execution settings (cooldown, max executions)
 */

const EVENT_TYPES = [
  {
    value: 'cart_abandoned',
    label: 'Carrito Abandonado',
    icon: ShoppingCart,
    color: 'text-orange-600',
    description: 'Cuando un cliente deja items en el carrito sin completar la compra',
  },
  {
    value: 'first_purchase',
    label: 'Primera Compra',
    icon: Gift,
    color: 'text-green-600',
    description: 'Cuando un cliente realiza su primera compra (bienvenida)',
  },
  {
    value: 'customer_birthday',
    label: 'Cumpleaños',
    icon: Cake,
    color: 'text-pink-600',
    description: 'En el cumpleaños del cliente',
  },
  {
    value: 'registration_anniversary',
    label: 'Aniversario de Registro',
    icon: Calendar,
    color: 'text-purple-600',
    description: 'En el aniversario de registro del cliente',
  },
  {
    value: 'inactivity',
    label: 'Inactividad',
    icon: TrendingUp,
    color: 'text-red-600',
    description: 'Cuando un cliente no compra por X días',
  },
  {
    value: 'tier_upgrade',
    label: 'Mejora de Tier',
    icon: Diamond,
    color: 'text-blue-600',
    description: 'Cuando un cliente sube de tier (bronce → plata → oro → diamante)',
  },
  {
    value: 'purchase_milestone',
    label: 'Hito de Compras',
    icon: Target,
    color: 'text-yellow-600',
    description: 'Cuando alcanza X compras o gasta $X',
  },
];

export default function TriggerBuilder({ trigger, onChange, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    eventType: 'inactivity',
    campaignId: '',
    conditions: {},
    executionSettings: {
      maxExecutionsPerCustomer: 3,
      cooldownDays: 30,
      preferredChannel: 'email',
      sendImmediately: false,
      optimalTimeSend: true,
    },
    status: 'active',
    ...trigger,
  });

  const [campaigns, setCampaigns] = useState([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const response = await getMarketingCampaigns({ status: 'draft' });
      setCampaigns(response.data || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  const handleChange = (field, value) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    onChange?.(newData);
  };

  const handleConditionChange = (field, value) => {
    const newConditions = { ...formData.conditions, [field]: value };
    handleChange('conditions', newConditions);
  };

  const handleExecutionSettingChange = (field, value) => {
    const newSettings = { ...formData.executionSettings, [field]: value };
    handleChange('executionSettings', newSettings);
  };

  const selectedEventType = EVENT_TYPES.find((e) => e.value === formData.eventType);
  const Icon = selectedEventType?.icon || Zap;

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Información Básica</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="dark:text-gray-200">Nombre del Trigger</Label>
            <Input
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ej: Win-back 30 días"
              className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
          </div>

          <div>
            <Label className="dark:text-gray-200">Descripción (opcional)</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Describe el propósito de este trigger automático..."
              rows={2}
              className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Event Type Selection */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Tipo de Evento</CardTitle>
          <CardDescription className="dark:text-gray-400">
            ¿Qué comportamiento del cliente debe activar este trigger?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {EVENT_TYPES.map((eventType) => {
              const EventIcon = eventType.icon;
              const isSelected = formData.eventType === eventType.value;

              return (
                <button
                  key={eventType.value}
                  onClick={() => handleChange('eventType', eventType.value)}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    isSelected
                      ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <EventIcon className={`w-5 h-5 mt-0.5 ${eventType.color}`} />
                    <div className="flex-1">
                      <div className="font-medium dark:text-gray-100">
                        {eventType.label}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {eventType.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Conditions (Dynamic based on event type) */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <Icon className={`w-5 h-5 ${selectedEventType?.color}`} />
            Condiciones del Trigger
          </CardTitle>
          <CardDescription className="dark:text-gray-400">
            Configura cuándo y cómo se activa este trigger
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cart Abandoned Conditions */}
          {formData.eventType === 'cart_abandoned' && (
            <div>
              <Label className="dark:text-gray-200">Tiempo de Espera (minutos)</Label>
              <Input
                type="number"
                value={formData.conditions.abandonmentMinutes || 30}
                onChange={(e) => handleConditionChange('abandonmentMinutes', parseInt(e.target.value))}
                placeholder="30"
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Esperar X minutos antes de enviar el mensaje
              </p>
            </div>
          )}

          {/* Inactivity Conditions */}
          {formData.eventType === 'inactivity' && (
            <div>
              <Label className="dark:text-gray-200">Días de Inactividad</Label>
              <Input
                type="number"
                value={formData.conditions.inactiveDays || 30}
                onChange={(e) => handleConditionChange('inactiveDays', parseInt(e.target.value))}
                placeholder="30"
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cliente sin comprar por X días
              </p>
            </div>
          )}

          {/* Purchase Milestone Conditions */}
          {formData.eventType === 'purchase_milestone' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="dark:text-gray-200">Número de Compras</Label>
                <Input
                  type="number"
                  value={formData.conditions.milestoneCount || ''}
                  onChange={(e) => handleConditionChange('milestoneCount', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="10"
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
              <div>
                <Label className="dark:text-gray-200">Gasto Acumulado ($)</Label>
                <Input
                  type="number"
                  value={formData.conditions.milestoneAmount || ''}
                  onChange={(e) => handleConditionChange('milestoneAmount', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="1000"
                  className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
                />
              </div>
            </div>
          )}

          {/* Tier Upgrade Conditions */}
          {formData.eventType === 'tier_upgrade' && (
            <div>
              <Label className="dark:text-gray-200">Tiers Objetivo</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {['diamante', 'oro', 'plata', 'bronce'].map((tier) => {
                  const selected = formData.conditions.targetTiers?.includes(tier);
                  return (
                    <Badge
                      key={tier}
                      variant={selected ? 'default' : 'outline'}
                      className={`cursor-pointer ${selected ? 'bg-blue-600 dark:bg-blue-500' : 'dark:border-gray-600'}`}
                      onClick={() => {
                        const current = formData.conditions.targetTiers || [];
                        const updated = selected
                          ? current.filter((t) => t !== tier)
                          : [...current, tier];
                        handleConditionChange('targetTiers', updated);
                      }}
                    >
                      {tier.charAt(0).toUpperCase() + tier.slice(1)}
                    </Badge>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Activar cuando el cliente alcance estos tiers
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaign Selection */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Campaña a Ejecutar</CardTitle>
          <CardDescription className="dark:text-gray-400">
            ¿Qué campaña enviar cuando se active el trigger?
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={formData.campaignId}
            onValueChange={(value) => handleChange('campaignId', value)}
          >
            <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
              <SelectValue placeholder="Selecciona una campaña..." />
            </SelectTrigger>
            <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
              {loadingCampaigns ? (
                <SelectItem value="loading" disabled>
                  Cargando campañas...
                </SelectItem>
              ) : campaigns.length === 0 ? (
                <SelectItem value="empty" disabled>
                  No hay campañas disponibles
                </SelectItem>
              ) : (
                campaigns.map((campaign) => (
                  <SelectItem key={campaign._id} value={campaign._id} className="dark:text-gray-200">
                    {campaign.name} ({campaign.channel})
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Execution Settings */}
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="dark:text-gray-100">Configuración de Ejecución</CardTitle>
          <CardDescription className="dark:text-gray-400">
            Controla la frecuencia y forma de envío
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="dark:text-gray-200">Máximo de Ejecuciones por Cliente</Label>
              <Input
                type="number"
                value={formData.executionSettings.maxExecutionsPerCustomer}
                onChange={(e) => handleExecutionSettingChange('maxExecutionsPerCustomer', parseInt(e.target.value))}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Límite de veces que un cliente puede recibir este trigger
              </p>
            </div>

            <div>
              <Label className="dark:text-gray-200">Cooldown (días)</Label>
              <Input
                type="number"
                value={formData.executionSettings.cooldownDays}
                onChange={(e) => handleExecutionSettingChange('cooldownDays', parseInt(e.target.value))}
                className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Esperar X días antes de re-enviar al mismo cliente
              </p>
            </div>
          </div>

          <div>
            <Label className="dark:text-gray-200">Canal Preferido</Label>
            <Select
              value={formData.executionSettings.preferredChannel}
              onValueChange={(value) => handleExecutionSettingChange('preferredChannel', value)}
            >
              <SelectTrigger className="dark:bg-gray-900 dark:border-gray-600 dark:text-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                <SelectItem value="email" className="dark:text-gray-200">Email</SelectItem>
                <SelectItem value="sms" className="dark:text-gray-200">SMS</SelectItem>
                <SelectItem value="whatsapp" className="dark:text-gray-200">WhatsApp</SelectItem>
                <SelectItem value="push" className="dark:text-gray-200">Push Notification</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onCancel}
          variant="outline"
          className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Cancelar
        </Button>
        <Button
          onClick={() => onSave?.(formData)}
          className="flex-1 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          {trigger ? 'Actualizar Trigger' : 'Crear Trigger'}
        </Button>
      </div>
    </div>
  );
}
