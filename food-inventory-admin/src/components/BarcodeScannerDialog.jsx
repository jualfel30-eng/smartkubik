import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { AlertCircle, Camera, RefreshCw, Scan } from 'lucide-react';

/**
 * Reusable dialog that starts a ZXing camera reader and reports decoded barcodes.
 */
export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onDetected,
  title = 'Escanear código de barras',
  description = 'Apunta la cámara al código o usa un lector conectado.',
  autoClose = true,
}) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const controlsRef = useRef(null);
  const [error, setError] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [lastCode, setLastCode] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState('');

  const stopCamera = useCallback(() => {
    if (controlsRef.current?.stop) {
      controlsRef.current.stop();
    }
    controlsRef.current = null;
    if (readerRef.current && typeof readerRef.current.reset === 'function') {
      readerRef.current.reset();
    }
  }, []);

  const startCamera = useCallback(
    async (preferredDeviceId) => {
      if (!open || !videoRef.current) return;
      setIsStarting(true);
      setError('');

      try {
        if (!readerRef.current) {
          readerRef.current = new BrowserMultiFormatReader();
        }

        stopCamera();

        if (!window.isSecureContext) {
          setError('La cámara requiere HTTPS o localhost. Abre el sitio en https:// o usa localhost.');
          setIsStarting(false);
          return;
        }

        // Solicitar permiso anticipadamente para que el navegador revele los dispositivos
        try {
          const permissionStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          permissionStream.getTracks().forEach((t) => t.stop());
        } catch (permissionErr) {
          setError(
            'No se pudo acceder a la cámara. Revisa los permisos del navegador y que otra app no la esté usando.'
          );
          setIsStarting(false);
          console.error('Camera permission error', permissionErr);
          return;
        }

        const videoInputs = await BrowserMultiFormatReader.listVideoInputDevices();
        setDevices(videoInputs);
        const targetDeviceId = preferredDeviceId || deviceId || videoInputs?.[0]?.deviceId;

        if (!targetDeviceId) {
          setError('No se encontraron cámaras disponibles.');
          setIsStarting(false);
          return;
        }

        const controls = await readerRef.current.decodeFromVideoDevice(
          targetDeviceId,
          videoRef.current,
          (result, err, controls) => {
            if (result) {
              const text = result.getText();
              setLastCode(text);
              onDetected?.(text);
              if (autoClose) {
                controls?.stop();
                controlsRef.current = null;
                onOpenChange?.(false);
              }
            }
            if (err && err.message && !err.message.includes('NotFound')) {
              // Log non-fatal decode errors silently
              console.debug('Decode error', err.message);
            }
          }
        );

        controlsRef.current = controls;
        if (!deviceId && targetDeviceId) {
          setDeviceId(targetDeviceId);
        }
      } catch (err) {
        setError(
          err?.message ||
            'No se pudo acceder a la cámara. Verifica permisos, HTTPS y que no esté en uso por otra app.'
        );
      } finally {
        setIsStarting(false);
      }
    },
    [autoClose, deviceId, onDetected, onOpenChange, open, stopCamera]
  );

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
      setError('');
    }

    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      stopCamera();
    }
    onOpenChange?.(nextOpen);
  };

  const handleDeviceChange = (value) => {
    setDeviceId(value);
    startCamera(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-2">
            <video
              ref={videoRef}
              className="h-64 w-full rounded-md bg-black object-cover"
              muted
              autoPlay
              playsInline
            />
          </div>

          {devices.length > 1 && (
            <div className="space-y-2">
              <Label>Selecciona cámara</Label>
              <Select value={deviceId || devices[0]?.deviceId} onValueChange={handleDeviceChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Cámara" />
                </SelectTrigger>
                <SelectContent>
                  {devices.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.label || `Cámara ${device.deviceId.slice(0, 4)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {lastCode && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Último código detectado:
              <Badge variant="secondary" className="font-mono text-xs">
                {lastCode}
              </Badge>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCamera(deviceId)}
                disabled={isStarting}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Reintentar
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => startCamera(deviceId)}
                disabled={isStarting}
              >
                <Camera className="mr-2 h-4 w-4" />
                {isStarting ? 'Iniciando...' : 'Iniciar cámara'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              También puedes usar una pistola/lector USB: actúa como teclado y llenará el campo activo. Si ves "No se encontraron cámaras", revisa permisos del navegador y que estés en HTTPS/localhost.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
