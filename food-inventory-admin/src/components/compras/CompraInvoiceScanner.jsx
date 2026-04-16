/**
 * @file CompraInvoiceScanner.jsx
 * Invoice scanning UI and logic for both purchase dialogs.
 * Renders the scan button, confidence banner, and handles the scan API call.
 */
import { useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Camera, Loader2, X } from 'lucide-react';
import { compressImage } from '@/lib/imageCompression';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * @param {object} props
 * @param {function} props.onScanComplete - Callback receiving parsed scan data
 * @param {function} props.onClearScan - Callback when user discards scan
 * @param {object|null} props.scanResult - Current scan result (for confidence banner)
 * @param {boolean} props.isScanning - Whether a scan is currently in progress
 * @param {function} props.setIsScanning - Setter for scanning state
 * @param {function} props.setScanResult - Setter for scan result state
 * @param {React.RefObject} [props.fileInputRef] - Optional external ref for the file input
 */
export default function CompraInvoiceScanner({
  onScanComplete,
  onClearScan,
  scanResult,
  isScanning,
  setIsScanning,
  setScanResult,
  fileInputRef: externalRef,
}) {
  const internalRef = useRef(null);
  const fileRef = externalRef || internalRef;

  const handleScanInvoice = useCallback(async (e) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) return;

    setIsScanning(true);
    setScanResult(null);

    try {
      // Compress image before upload using our utility
      toast.info('Optimizando imagen...', { duration: 2000 });
      const file = await compressImage(rawFile, 1600, 0.8);

      const formData = new FormData();
      formData.append('image', file);

      // Add timeout (90 seconds to account for network + processing)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 90000);
      });

      const apiPromise = fetchApi('/purchases/scan-invoice', {
        method: 'POST',
        body: formData,
        isFormData: true,
      });

      const result = await Promise.race([apiPromise, timeoutPromise]);

      const data = result.data || result;
      setScanResult(data);

      // Notify parent with parsed data
      if (onScanComplete) {
        onScanComplete(data);
      }

      const confidencePct = Math.round((data.overallConfidence || 0) * 100);
      if (confidencePct >= 80) {
        toast.success(`Factura escaneada con ${confidencePct}% de confianza`, {
          description: `${data.items?.length || 0} productos detectados. Revise los datos antes de confirmar.`,
        });
      } else if (confidencePct >= 50) {
        toast.warning(`Factura escaneada con ${confidencePct}% de confianza`, {
          description: 'Algunos campos requieren revision manual. Los campos en amarillo tienen baja confianza.',
        });
      } else {
        toast.warning(`Factura escaneada con baja confianza (${confidencePct}%)`, {
          description: 'Revise cuidadosamente todos los campos. La imagen puede ser dificil de leer.',
        });
      }
    } catch (err) {
      if (err.message === 'TIMEOUT') {
        toast.error('El escaneo esta tomando demasiado tiempo', {
          description: 'Por favor, intente con una imagen mas clara o de menor tamano.'
        });
      } else {
        toast.error('Error al escanear factura', { description: err.message });
      }
    } finally {
      setIsScanning(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }, [onScanComplete, setIsScanning, setScanResult, fileRef]);

  return (
    <>
      <input
        type="file"
        ref={fileRef}
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        className="hidden"
        onChange={handleScanInvoice}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={isScanning}
        className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
      >
        {isScanning ? (
          <><Loader2 className="h-4 w-4 animate-spin" /> Escaneando...</>
        ) : (
          <><Camera className="h-4 w-4" /> Escanear Factura</>
        )}
      </Button>
    </>
  );
}

/**
 * Confidence banner shown after a successful scan.
 *
 * @param {object} props
 * @param {object} props.scanResult - The scan result data
 * @param {function} props.onClear - Callback to discard the scan
 */
export function ScanConfidenceBanner({ scanResult, onClear }) {
  if (!scanResult) return null;

  return (
    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${scanResult.overallConfidence >= 0.8 ? 'bg-green-50 border border-green-200 text-green-800' :
      scanResult.overallConfidence >= 0.5 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
        'bg-red-50 border border-red-200 text-red-800'
      }`}>
      <span className="font-medium">
        {Math.round(scanResult.overallConfidence * 100)}% confianza
      </span>
      <span>&mdash;</span>
      <span className="flex-1">
        Proveedor: {scanResult.supplier?.matchedSupplierId ? 'Encontrado' : 'Nuevo'} |
        Productos: {scanResult.items?.filter(i => i.matchedProductId).length}/{scanResult.items?.length || 0} reconocidos
        {scanResult.invoiceNumber && ` | Factura #${scanResult.invoiceNumber}`}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="ml-auto p-1 rounded-full hover:bg-black/10 transition-colors"
        title="Descartar escaneo"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
