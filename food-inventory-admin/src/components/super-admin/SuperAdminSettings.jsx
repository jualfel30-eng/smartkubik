import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const WHAPI_TOKEN_KEY = 'WHAPI_MASTER_TOKEN';
const OPENAI_API_KEY = 'OPENAI_API_KEY';

const SuperAdminSettings = () => {
  const [whapiToken, setWhapiToken] = useState('');
  const [openAIApiKey, setOpenAIApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingWhapi, setSavingWhapi] = useState(false);
  const [savingOpenAI, setSavingOpenAI] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const [whapiRes, openAIRes] = await Promise.all([
          fetchApi(`/super-admin/settings/${WHAPI_TOKEN_KEY}`).catch(e => e),
          fetchApi(`/super-admin/settings/${OPENAI_API_KEY}`).catch(e => e)
        ]);

        if (whapiRes?.data?.value) {
          setWhapiToken(whapiRes.data.value);
        }
        if (openAIRes?.data?.value) {
          setOpenAIApiKey(openAIRes.data.value);
        }

      } catch (error) {
        console.error('Could not fetch existing settings.', error);
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

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">Integraciones</h1>
        <Card>
            <CardHeader>
                <CardTitle>Gestionar Integraciones</CardTitle>
                <CardDescription>Tokens y claves para servicios de terceros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="space-y-4">
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
                <div className="space-y-4">
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
            </CardContent>
        </Card>
    </div>
  );
};

export default SuperAdminSettings;
