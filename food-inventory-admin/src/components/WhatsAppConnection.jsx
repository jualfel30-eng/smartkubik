import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Loader2, CheckCircle2, RefreshCw, Wifi, WifiOff, Trash2 } from 'lucide-react';

const POLL_INTERVAL = 5000; // 5 seconds

const WhatsAppConnection = () => {
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('loading'); // loading, not_created, awaiting_scan, connected, disconnected
  const [channelId, setChannelId] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [mode, setMode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    checkStatus();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll for status when awaiting scan
  useEffect(() => {
    if (status === 'awaiting_scan') {
      pollRef.current = setInterval(async () => {
        const newStatus = await fetchStatus();
        if (newStatus === 'connected') {
          clearInterval(pollRef.current);
          pollRef.current = null;
          toast.success('¡WhatsApp conectado exitosamente!');
        }
      }, POLL_INTERVAL);
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [status]);

  const fetchStatus = async () => {
    try {
      const response = await fetchApi('/whapi/channels/status');
      const data = response.data || response;
      setStatus(data.status || 'not_created');
      setChannelId(data.channelId || '');
      setPhoneNumber(data.phoneNumber || '');
      setMode(data.mode || '');
      return data.status;
    } catch {
      return status;
    }
  };

  const checkStatus = async () => {
    setStatus('loading');
    await fetchStatus();
  };

  const handleCreateChannel = async () => {
    setLoading(true);
    setQrCode('');
    try {
      const response = await fetchApi('/whapi/channels/create', { method: 'POST' });
      const data = response.data || response;

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setStatus('awaiting_scan');
        setChannelId(data.channelId || '');
        toast.success('Escanea el código QR con tu WhatsApp.');
      } else if (data.status === 'connected') {
        setStatus('connected');
        toast.info('Tu WhatsApp ya está conectado.');
      }
    } catch (error) {
      const msg = error?.message || error?.data?.message || 'Error al crear el canal';
      if (msg.includes('ya tiene un canal')) {
        toast.info(msg);
        await fetchStatus();
      } else {
        toast.error('Error al conectar WhatsApp', { description: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQr = async () => {
    setLoading(true);
    try {
      const response = await fetchApi('/whapi/channels/qr-code');
      const data = response.data || response;
      if (data.qrCode) {
        setQrCode(data.qrCode);
        toast.success('Código QR actualizado. Escanéalo con tu teléfono.');
      }
    } catch (error) {
      toast.error('Error al refrescar QR', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('¿Seguro que deseas desconectar tu WhatsApp? Perderás la conexión actual.')) return;
    setDeleting(true);
    try {
      await fetchApi('/whapi/channels', { method: 'DELETE' });
      setStatus('not_created');
      setQrCode('');
      setChannelId('');
      setPhoneNumber('');
      toast.success('WhatsApp desconectado.');
    } catch (error) {
      toast.error('Error al desconectar', { description: error.message });
    } finally {
      setDeleting(false);
    }
  };

  // ──── RENDER ────

  if (status === 'loading') {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Verificando estado...</span>
        </CardContent>
      </Card>
    );
  }

  if (status === 'connected') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-500" />
            WhatsApp Conectado
          </CardTitle>
          <CardDescription>
            Tu WhatsApp está conectado y listo para recibir mensajes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 space-y-2">
            {phoneNumber && (
              <p className="text-sm">
                <span className="text-muted-foreground">Teléfono:</span>{' '}
                <span className="font-medium">{phoneNumber}</span>
              </p>
            )}
            {channelId && (
              <p className="text-sm">
                <span className="text-muted-foreground">Canal:</span>{' '}
                <span className="font-mono text-xs">{channelId}</span>
              </p>
            )}
            {mode && (
              <p className="text-sm">
                <span className="text-muted-foreground">Modo:</span>{' '}
                <span className="font-medium capitalize">{mode}</span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkStatus}>
              <RefreshCw className="w-4 h-4 mr-1" /> Verificar estado
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDisconnect}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Desconectar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Status: not_created, awaiting_scan, disconnected
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <WifiOff className="w-5 h-5 text-muted-foreground" />
          Conexión de WhatsApp
        </CardTitle>
        <CardDescription>
          {status === 'not_created'
            ? 'Conecta tu WhatsApp para recibir y enviar mensajes a tus clientes.'
            : status === 'awaiting_scan'
              ? 'Escanea el código QR con tu WhatsApp (Ajustes > Dispositivos Vinculados).'
              : 'Tu WhatsApp se desconectó. Reconecta escaneando un nuevo QR.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center space-y-4">
        {/* QR Display */}
        <div className="w-64 h-64 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted">
          {loading && (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Generando código QR...</p>
            </div>
          )}
          {qrCode && !loading && (
            <img
              src={`data:image/png;base64,${qrCode}`}
              alt="WhatsApp QR Code"
              className="w-full h-full object-contain p-2"
            />
          )}
          {!qrCode && !loading && (
            <p className="text-muted-foreground text-center text-sm p-4">
              {status === 'not_created'
                ? 'Haz clic en "Conectar WhatsApp" para vincular tu número.'
                : 'Haz clic en "Refrescar QR" para generar un nuevo código.'}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap justify-center">
          {status === 'not_created' && (
            <Button onClick={handleCreateChannel} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" /> Creando canal...
                </>
              ) : (
                'Conectar WhatsApp'
              )}
            </Button>
          )}

          {(status === 'awaiting_scan' || status === 'disconnected') && (
            <>
              <Button onClick={handleRefreshQr} disabled={loading} variant="outline">
                <RefreshCw className="w-4 h-4 mr-1" />
                {loading ? 'Refrescando...' : 'Refrescar QR'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDisconnect}
                disabled={deleting}
              >
                <Trash2 className="w-4 h-4 mr-1" /> Eliminar canal
              </Button>
            </>
          )}
        </div>

        {status === 'awaiting_scan' && (
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            El código QR expira en unos minutos. Si no funciona, haz clic en "Refrescar QR".
            Verificamos automáticamente cada 5 segundos.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default WhatsAppConnection;
