import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

import { fetchApi } from '@/lib/api';

const WhatsAppConnection = () => {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [activating, setActivating] = useState(false);

  const handleGenerateQrCode = async () => {
    setLoading(true);
    setQrCode('');
    setIsLinked(false);
    try {
      const response = await fetchApi('/chat/qr-code');
      if (response.data && response.data.qrCode) {
        setQrCode(response.data.qrCode);
        setIsLinked(true);
        toast.success('Código QR generado. Escanéalo con tu teléfono.');
      } else {
        throw new Error('La respuesta del servidor no contenía un código QR.');
      }
    } catch (error) {
      toast.error('Error al generar el código QR', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateWebhook = async () => {
    setActivating(true);
    try {
      await fetchApi('/chat/configure-webhook', { method: 'POST' });
      toast.success('¡Conexión completada! Ya puedes recibir mensajes.');
      setIsLinked(false); // Hide the button after success
    } catch (error) {
      toast.error('Error al activar el webhook', { description: error.message });
    } finally {
      setActivating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conexión de WhatsApp</CardTitle>
        <CardDescription>
          Paso 1: Genera un código QR y escanéalo con tu teléfono (Ajustes > Dispositivos Vinculados). Paso 2: Activa la conexión para empezar a recibir mensajes.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        <div className="w-64 h-64 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
          {loading && <p>Generando código...</p>}
          {qrCode && !loading && (
            <img src={`data:image/png;base64,${qrCode}`} alt="WhatsApp QR Code" className="w-full h-full" />
          )}
          {!qrCode && !loading && (
            <p className="text-muted-foreground text-center p-4">Haz clic en el botón para generar un nuevo código QR.</p>
          )}
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleGenerateQrCode} disabled={loading || activating}>
            {loading ? 'Generando...' : 'Paso 1: Generar QR'}
          </Button>
          {isLinked && (
            <Button onClick={handleActivateWebhook} disabled={activating}>
              {activating ? 'Activando...' : 'Paso 2: Activar Webhook'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default WhatsAppConnection;
