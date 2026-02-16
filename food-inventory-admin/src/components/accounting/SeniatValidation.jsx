import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  QrCode,
  Download,
  Loader2,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  validateDocumentForSENIAT,
  generateSeniatXML,
  downloadSeniatXML,
} from '../../lib/api';

const SeniatValidation = ({ documentId, document: doc, onValidationComplete }) => {
  const [loading, setLoading] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [xmlData, setXmlData] = useState(null);

  useEffect(() => {
    if (doc?.seniat?.xmlGenerated) {
      setXmlGenerated(true);
      setXmlData({
        qrCode: doc.seniat.qrCode,
        verificationUrl: doc.seniat.verificationUrl,
        xmlHash: doc.seniat.xmlHash,
      });
    }
  }, [doc]);

  const handleValidate = async () => {
    setLoading(true);
    try {
      const result = await validateDocumentForSENIAT(documentId);
      setValidationResults(result);

      if (result.valid) {
        toast.success('Documento válido para SENIAT');
        if (onValidationComplete) {
          onValidationComplete(result);
        }
      } else {
        toast.error(`Validación fallida: ${result.errors.length} error(es)`);
      }
    } catch (error) {
      console.error('Error validating document:', error);
      toast.error('Error al validar documento');
      setValidationResults({
        valid: false,
        errors: [error.message || 'Error desconocido'],
        warnings: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXML = async () => {
    setLoading(true);
    try {
      const result = await generateSeniatXML(documentId);
      setXmlGenerated(true);
      setXmlData({
        qrCode: result.qrCode,
        verificationUrl: result.verificationUrl,
        xmlHash: result.xmlHash,
      });
      toast.success('XML SENIAT generado correctamente');
    } catch (error) {
      console.error('Error generating XML:', error);
      toast.error(error.message || 'Error al generar XML SENIAT');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      const blob = await downloadSeniatXML(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = `factura-${doc?.documentNumber || documentId}.xml`;
      window.document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('XML descargado correctamente');
    } catch (error) {
      console.error('Error downloading XML:', error);
      toast.error('Error al descargar XML');
    }
  };

  return (
    <div className="space-y-4">
      {/* Document Info */}
      {doc && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Documento:</span>{' '}
            <span className="font-semibold">{doc.documentNumber}</span>
          </div>
          <Badge variant={doc.status === 'issued' ? 'default' : 'secondary'}>
            {doc.status === 'draft'
              ? 'Borrador'
              : doc.status === 'issued'
                ? 'Emitida'
                : doc.status === 'sent'
                  ? 'Enviada'
                  : doc.status}
          </Badge>
          {doc.controlNumber && (
            <div>
              <span className="text-muted-foreground">Control:</span>{' '}
              <span className="font-mono text-xs">{doc.controlNumber}</span>
            </div>
          )}
        </div>
      )}

      <Separator />

      {/* Validate Button */}
      {!validationResults && (
        <Button onClick={handleValidate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Validando...
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Validar para SENIAT
            </>
          )}
        </Button>
      )}

      {/* Validation Results */}
      {validationResults && (
        <div className="space-y-3">
          <Alert variant={validationResults.valid ? 'default' : 'destructive'}>
            {validationResults.valid ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>
              {validationResults.valid
                ? 'Documento válido'
                : 'Errores de validación'}
            </AlertTitle>
            <AlertDescription>
              {validationResults.valid
                ? 'El documento cumple con los requisitos de facturación electrónica SENIAT.'
                : `Se encontraron ${validationResults.errors.length} error(es) que deben corregirse.`}
            </AlertDescription>
          </Alert>

          {/* Errors List */}
          {validationResults.errors?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-destructive">
                Errores ({validationResults.errors.length})
              </p>
              <ul className="space-y-1">
                {validationResults.errors.map((error, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings List */}
          {validationResults.warnings?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Advertencias ({validationResults.warnings.length})
              </p>
              <ul className="space-y-1">
                {validationResults.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={handleValidate} disabled={loading}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Validar nuevamente
            </Button>
            {validationResults.valid && !xmlGenerated && (
              <Button size="sm" onClick={handleGenerateXML} disabled={loading}>
                {loading ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-3.5 w-3.5" />
                )}
                Generar XML
              </Button>
            )}
          </div>
        </div>
      )}

      {/* XML Generated Section */}
      {xmlGenerated && xmlData && (
        <>
          <Separator />
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>XML SENIAT Generado</AlertTitle>
            <AlertDescription>
              El documento fiscal electrónico fue generado exitosamente.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadXML}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Descargar XML
            </Button>
          </div>

          {xmlData.xmlHash && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Hash SHA-256:</p>
              <p className="text-xs font-mono bg-muted p-2 rounded-md break-all">
                {xmlData.xmlHash}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SeniatValidation;
