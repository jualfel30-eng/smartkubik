import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const WHAPI_TOKEN_KEY = 'WHAPI_MASTER_TOKEN';
const OPENAI_API_KEY = 'OPENAI_API_KEY';
const PINECONE_API_KEY = 'PINECONE_API_KEY';
const PINECONE_ENVIRONMENT = 'PINECONE_ENVIRONMENT';
const REDIS_URL_KEY = 'REDIS_URL';

const SuperAdminSettings = () => {
  const [whapiToken, setWhapiToken] = useState('');
  const [openAIApiKey, setOpenAIApiKey] = useState('');
  const [pineconeApiKey, setPineconeApiKey] = useState('');
  const [pineconeEnv, setPineconeEnv] = useState('');
  const [redisUrl, setRedisUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWhapi, setSavingWhapi] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);
  const [savingPinecone, setSavingPinecone] = useState(false);
  const [savingRedis, setSavingRedis] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [whapiRes, openAIRes, pineconeKeyRes, pineconeEnvRes, redisUrlRes] = await Promise.all([
          fetchApi(`/super-admin/settings/${WHAPI_TOKEN_KEY}`),
          fetchApi(`/super-admin/settings/${OPENAI_API_KEY}`),
          fetchApi(`/super-admin/settings/${PINECONE_API_KEY}`),
          fetchApi(`/super-admin/settings/${PINECONE_ENVIRONMENT}`),
          fetchApi(`/super-admin/settings/${REDIS_URL_KEY}`),
        ]);

        if (whapiRes?.data?.value) setWhapiToken(whapiRes.data.value);
        if (openAIRes?.data?.value) setOpenAIApiKey(openAIRes.data.value);
        if (pineconeKeyRes?.data?.value) setPineconeApiKey(pineconeKeyRes.data.value);
        if (pineconeEnvRes?.data?.value) setPineconeEnv(pineconeEnvRes.data.value);
        if (redisUrlRes?.data?.value) setRedisUrl(redisUrlRes.data.value);

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

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">Integraciones</h1>
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
