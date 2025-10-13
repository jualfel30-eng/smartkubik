import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const WHAPI_TOKEN_KEY = 'WHAPI_MASTER_TOKEN';

const SuperAdminSettings = () => {
  const [whapiToken, setWhapiToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        setLoading(true);
        const response = await fetchApi(`/super-admin/settings/${WHAPI_TOKEN_KEY}`);
        if (response.data && response.data.value) {
          setWhapiToken(response.data.value);
        }
      } catch (error) {
        // It's okay if it fails, it might not be set yet
        console.log('Could not fetch existing Whapi token.');
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetchApi('/super-admin/settings', {
        method: 'POST',
        body: JSON.stringify({ key: WHAPI_TOKEN_KEY, value: whapiToken }),
      });
      toast.success('Token de Whapi guardado exitosamente.');
    } catch (error) {
      toast.error('Error al guardar el token', { description: error.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold">Ajustes de Super Admin</h1>
        <Card>
            <CardHeader>
                <CardTitle>Configuración de Integraciones</CardTitle>
                <CardDescription>Tokens y claves para servicios de terceros.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="whapi-token">Token Maestro de Whapi</Label>
                    <Input
                        id="whapi-token"
                        type="password"
                        value={whapiToken}
                        onChange={(e) => setWhapiToken(e.target.value)}
                        placeholder="Pega aquí el token de tu cuenta principal de Whapi"
                    />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </CardContent>
        </Card>
    </div>
  );
};

export default SuperAdminSettings;
