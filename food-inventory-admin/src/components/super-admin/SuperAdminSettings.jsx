import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const WHAPI_TOKEN_KEY = 'WHAPI_MASTER_TOKEN';
const OPENAI_API_KEY = 'OPENAI_API_KEY';
const PINECONE_API_KEY = 'PINECONE_API_KEY';
const PINECONE_ENVIRONMENT = 'PINECONE_ENVIRONMENT';
const REDIS_URL_KEY = 'REDIS_URL';

const FEATURE_FLAGS_INFO = {
  ENABLE_EMPLOYEE_PERFORMANCE: {
    name: 'Seguimiento de Empleados',
    description: 'Seguimiento de rendimiento de empleados',
    category: 'Performance',
  },
  ENABLE_BANK_MOVEMENTS: {
    name: 'Movimientos Bancarios',
    description: 'Registro y gestión de movimientos de cuentas bancarias',
    category: 'Banking',
  },
  ENABLE_BANK_RECONCILIATION: {
    name: 'Conciliación Bancaria',
    description: 'Herramientas de conciliación bancaria automática',
    category: 'Banking',
  },
  ENABLE_BANK_TRANSFERS: {
    name: 'Transferencias Bancarias',
    description: 'Gestión de transferencias entre cuentas',
    category: 'Banking',
  },
  ENABLE_DASHBOARD_CHARTS: {
    name: 'Gráficos de Dashboard',
    description: 'Visualizaciones y gráficos en el dashboard',
    category: 'Analytics',
  },
  ENABLE_ADVANCED_REPORTS: {
    name: 'Reportes Avanzados',
    description: 'Reportes personalizados y exportación de datos',
    category: 'Analytics',
  },
  ENABLE_PREDICTIVE_ANALYTICS: {
    name: 'Analítica Predictiva',
    description: 'Predicciones basadas en datos históricos',
    category: 'Analytics',
  },
  ENABLE_CUSTOMER_SEGMENTATION: {
    name: 'Segmentación de Clientes',
    description: 'Agrupación y análisis de clientes',
    category: 'CRM',
  },
  ENABLE_MULTI_TENANT_LOGIN: {
    name: 'Login Multi-Tenant',
    description: 'Permite login con múltiples organizaciones',
    category: 'Authentication',
  },
  ENABLE_SERVICE_BOOKING_PORTAL: {
    name: 'Portal de Reservas',
    description: 'Portal público para reservar servicios',
    category: 'Services',
  },
  ENABLE_APPOINTMENT_REMINDERS: {
    name: 'Recordatorios de Citas',
    description: 'Notificaciones automáticas de citas',
    category: 'Services',
  },
};

const SuperAdminSettings = () => {
  const [whapiToken, setWhapiToken] = useState('');
  const [openAIApiKey, setOpenAIApiKey] = useState('');
  const [pineconeApiKey, setPineconeApiKey] = useState('');
  const [pineconeEnv, setPineconeEnv] = useState('');
  const [redisUrl, setRedisUrl] = useState('');
  const [featureFlags, setFeatureFlags] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingWhapi, setSavingWhapi] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [savingPinecone, setSavingPinecone] = useState(false);
  const [savingRedis, setSavingRedis] = useState(false);
  const [savingFeatureFlags, setSavingFeatureFlags] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [whapiRes, openAIRes, pineconeKeyRes, pineconeEnvRes, redisUrlRes, featureFlagsRes] = await Promise.all([
          fetchApi(`/super-admin/settings/${WHAPI_TOKEN_KEY}`),
          fetchApi(`/super-admin/settings/${OPENAI_API_KEY}`),
          fetchApi(`/super-admin/settings/${PINECONE_API_KEY}`),
          fetchApi(`/super-admin/settings/${PINECONE_ENVIRONMENT}`),
          fetchApi(`/super-admin/settings/${REDIS_URL_KEY}`),
          fetchApi('/super-admin/feature-flags'),
        ]);

        if (whapiRes?.data?.value) setWhapiToken(whapiRes.data.value);
        if (openAIRes?.data?.value) setOpenAIApiKey(openAIRes.data.value);
        if (pineconeKeyRes?.data?.value) setPineconeApiKey(pineconeKeyRes.data.value);
        if (pineconeEnvRes?.data?.value) setPineconeEnv(pineconeEnvRes.data.value);
        if (redisUrlRes?.data?.value) setRedisUrl(redisUrlRes.data.value);
        if (featureFlagsRes?.data) setFeatureFlags(featureFlagsRes.data);

      } catch (error) {
        console.error('Could not fetch existing settings.', error);
        toast.error('Error al cargar la configuración existente', { description: error.message });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveWhapi = async () => {
    setSavingWhapi(true);
    try {
      await fetchApi('/super-admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key: WHAPI_TOKEN_KEY, value: whapiToken }),
      });
      toast.success('Token de Whapi guardado exitosamente.');
    } catch (error) {
      toast.error('Error al guardar el token de Whapi', { description: error.message });
    } finally {
      setSavingWhapi(false);
    }
  };

  const handleSaveOpenAI = async () => {
    setSavingOpenAI(true);
    try {
      await fetchApi('/super-admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key: OPENAI_API_KEY, value: openAIApiKey }),
      });
      toast.success('Clave de API de OpenAI guardada exitosamente.');
    } catch (error) {
      toast.error('Error al guardar la clave de API de OpenAI', { description: error.message });
    } finally {
      setSavingOpenAI(false);
    }
  };

  const handleSavePinecone = async () => {
    setSavingPinecone(true);
    try {
      await Promise.all([
        fetchApi('/super-admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: PINECONE_API_KEY, value: pineconeApiKey }),
        }),
        fetchApi('/super-admin/settings', {
          method: 'POST',
          body: JSON.stringify({ key: PINECONE_ENVIRONMENT, value: pineconeEnv }),
        }),
      ]);
      toast.success('Configuración de Pinecone guardada exitosamente.');
    } catch (error) {
      toast.error('Error al guardar la configuración de Pinecone', { description: error.message });
    } finally {
      setSavingPinecone(false);
    }
  };

  const handleSaveRedis = async () => {
    setSavingRedis(true);
    try {
      await fetchApi('/super-admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key: REDIS_URL_KEY, value: redisUrl }),
      });
      toast.success('URL de Redis guardada exitosamente.');
    } catch (error) {
      toast.error('Error al guardar la URL de Redis', { description: error.message });
    } finally {
      setSavingRedis(false);
    }
  };

  const handleToggleFeatureFlag = (flagKey) => {
    setFeatureFlags(prev => ({
      ...prev,
      [flagKey]: !prev[flagKey]
    }));
  };

  const handleSaveFeatureFlags = async () => {
    setSavingFeatureFlags(true);
    try {
      await fetchApi('/super-admin/feature-flags', {
        method: 'POST',
        body: JSON.stringify({ flags: featureFlags }),
      });
      toast.success('Feature flags guardados exitosamente.', {
        description: 'Los cambios se aplicarán automáticamente en los próximos 5 minutos.',
      });
    } catch (error) {
      toast.error('Error al guardar los feature flags', { description: error.message });
    } finally {
      setSavingFeatureFlags(false);
    }
  };

  // Group feature flags by category
  const flagsByCategory = Object.entries(FEATURE_FLAGS_INFO).reduce((acc, [key, info]) => {
    if (!acc[info.category]) {
      acc[info.category] = [];
    }
    acc[info.category].push({ key, ...info });
    return acc;
  }, {});

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">Configuración de Super Admin</h1>

        {/* Feature Flags Card */}
        <Card>
            <CardHeader>
                <CardTitle>Feature Flags</CardTitle>
                <CardDescription>
                  Activa o desactiva funcionalidades del sistema. Los cambios requieren reiniciar el servidor.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {Object.entries(flagsByCategory).map(([category, flags]) => (
                  <div key={category} className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <Label className="text-lg font-semibold">{category}</Label>
                      <Badge variant="outline">
                        {flags.filter(f => featureFlags[f.key]).length} / {flags.length} activos
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {flags.map(({ key, name, description }) => (
                        <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">{name}</div>
                            <div className="text-sm text-muted-foreground">{description}</div>
                            <div className="text-xs text-muted-foreground mt-1 font-mono">{key}</div>
                          </div>
                          <Switch
                            checked={featureFlags[key] || false}
                            onCheckedChange={() => handleToggleFeatureFlag(key)}
                            disabled={loading}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                <Button
                  onClick={handleSaveFeatureFlags}
                  disabled={savingFeatureFlags || loading}
                  className="w-full"
                >
                  {savingFeatureFlags ? 'Guardando...' : 'Guardar Feature Flags'}
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  💡 Los cambios se aplicarán automáticamente en los próximos 5 minutos. El caché se actualiza periódicamente.
                </p>
            </CardContent>
        </Card>

        {/* Integrations Card */}
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Integraciones</CardTitle>
                <CardDescription>Tokens y claves para servicios de terceros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                {/* Redis Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="text-lg font-semibold">Redis / BullMQ</Label>
                    <div className="space-y-2">
                        <Label htmlFor="redis-url">URL de conexión Redis</Label>
                        <Input
                            id="redis-url"
                            type="password"
                            value={redisUrl}
                            onChange={(e) => setRedisUrl(e.target.value)}
                            placeholder="Ej: rediss://default:pass@host:port"
                            disabled={loading}
                        />
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Si dejas este campo vacío, se usará la configuración local por defecto (127.0.0.1:6379 o variables REDIS_HOST/PORT).
                    </p>
                    <Button onClick={handleSaveRedis} disabled={savingRedis || loading}>
                        {savingRedis ? 'Guardando...' : 'Guardar URL de Redis'}
                    </Button>
                </div>

                {/* Pinecone Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="text-lg font-semibold">Pinecone</Label>
                    <div className="space-y-2">
                        <Label htmlFor="pinecone-key">Clave de API de Pinecone</Label>
                        <Input
                            id="pinecone-key"
                            type="password"
                            value={pineconeApiKey}
                            onChange={(e) => setPineconeApiKey(e.target.value)}
                            placeholder="Pega aquí tu clave de API de Pinecone"
                            disabled={loading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="pinecone-env">Environment de Pinecone</Label>
                        <Input
                            id="pinecone-env"
                            value={pineconeEnv}
                            onChange={(e) => setPineconeEnv(e.target.value)}
                            placeholder="Ej: gcp-starter, us-west1-gcp"
                            disabled={loading}
                        />
                    </div>
                    <Button onClick={handleSavePinecone} disabled={savingPinecone || loading}>
                        {savingPinecone ? 'Guardando...' : 'Guardar Configuración Pinecone'}
                    </Button>
                </div>

                {/* OpenAI Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="text-lg font-semibold">OpenAI</Label>
                    <div className="space-y-2">
                        <Label htmlFor="openai-key">Clave de API de OpenAI</Label>
                        <Input
                            id="openai-key"
                            type="password"
                            value={openAIApiKey}
                            onChange={(e) => setOpenAIApiKey(e.target.value)}
                            placeholder="Pega aquí tu clave de API de OpenAI (sk-...)"
                            disabled={loading}
                        />
                    </div>
                    <Button onClick={handleSaveOpenAI} disabled={savingOpenAI || loading}>
                        {savingOpenAI ? 'Guardando...' : 'Guardar Clave OpenAI'}
                    </Button>
                </div>

                {/* Whapi Settings */}
                <div className="space-y-4 p-4 border rounded-lg">
                    <Label className="text-lg font-semibold">Whapi</Label>
                    <div className="space-y-2">
                        <Label htmlFor="whapi-token">Token Maestro de Whapi</Label>
                        <Input
                            id="whapi-token"
                            type="password"
                            value={whapiToken}
                            onChange={(e) => setWhapiToken(e.target.value)}
                            placeholder="Pega aquí el token de tu cuenta principal de Whapi"
                            disabled={loading}
                        />
                    </div>
                    <Button onClick={handleSaveWhapi} disabled={savingWhapi || loading}>
                        {savingWhapi ? 'Guardando...' : 'Guardar Token Whapi'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    </div>
  );
};

export default SuperAdminSettings;
