import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  QrCode,
  ExternalLink,
  Printer,
  Mail,
  AlertCircle,
  Shield,
  Clock,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { toast } from 'sonner';
import { api } from '../../lib/api';

const BillingDocumentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const [docResponse, evidenceResponse] = await Promise.all([
        api.get(`/billing/documents/${id}`),
        api.get(`/billing/documents/${id}/evidence`).catch(() => ({ data: null }))
      ]);

      setDocument(docResponse.data);
      setEvidence(evidenceResponse.data);
    } catch (error) {
      console.error('Error loading document:', error);
      toast.error('Error al cargar documento');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateXML = async () => {
    try {
      await api.post(`/billing/documents/${id}/generate-xml`);
      toast.success('XML generado correctamente');
      loadDocument();
    } catch (error) {
      console.error('Error generating XML:', error);
      toast.error(error.response?.data?.message || 'Error al generar XML');
    }
  };

  const handleDownloadXML = () => {
    window.open(`/api/billing/documents/${id}/seniat-xml`, '_blank');
    toast.success('Descargando XML...');
  };

  const handleValidateSENIAT = async () => {
    try {
      const response = await api.post(`/billing/documents/${id}/validate-seniat`);
      if (response.data.valid) {
        toast.success('Documento válido según SENIAT');
      } else {
        toast.error(`Errores de validación: ${response.data.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error validating:', error);
      toast.error('Error al validar con SENIAT');
    }
  };

  const handleIssue = async () => {
    try {
      await api.post(`/billing/documents/${id}/issue`);
      toast.success('Documento emitido correctamente');
      loadDocument();
    } catch (error) {
      console.error('Error issuing document:', error);
      toast.error(error.response?.data?.message || 'Error al emitir documento');
    }
  };

  const handleSendEmail = async () => {
    try {
      await api.post(`/billing/documents/${id}/send-email`);
      toast.success('Email enviado correctamente');
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Error al enviar email');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary', icon: Edit },
      validated: { label: 'Validado', variant: 'outline', icon: CheckCircle },
      sent_to_imprenta: { label: 'Enviando...', variant: 'default', icon: Clock },
      issued: { label: 'Emitido', variant: 'success', icon: CheckCircle },
      sent: { label: 'Enviado', variant: 'success', icon: Send },
      closed: { label: 'Cerrado', variant: 'default', icon: CheckCircle },
      archived: { label: 'Archivado', variant: 'secondary', icon: FileText },
      voided: { label: 'Anulado', variant: 'destructive', icon: XCircle },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary', icon: FileText };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getDocumentTypeLabel = (type) => {
    const types = {
      invoice: 'Factura',
      credit_note: 'Nota de Crédito',
      debit_note: 'Nota de Débito',
      delivery_note: 'Nota de Entrega',
      quote: 'Presupuesto',
    };
    return types[type] || type;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg text-muted-foreground">Documento no encontrado</p>
        <Button onClick={() => navigate('/billing')}>Volver al listado</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/billing')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold tracking-tight">
                {getDocumentTypeLabel(document.type)}
              </h1>
              {getStatusBadge(document.status)}
            </div>
            <p className="text-muted-foreground">
              {document.documentNumber ? `Nº ${document.documentNumber}` : 'Sin número asignado'}
              {document.controlNumber && ` • Control: ${document.controlNumber}`}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {document.status === 'draft' && (
            <Button onClick={handleIssue}>
              <Send className="mr-2 h-4 w-4" />
              Emitir
            </Button>
          )}

          {document.seniat?.xmlGenerated && (
            <>
              <Button variant="outline" onClick={handleDownloadXML}>
                <Download className="mr-2 h-4 w-4" />
                XML
              </Button>
              <Button variant="outline" onClick={() => setShowQR(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                QR
              </Button>
            </>
          )}

          {!document.seniat?.xmlGenerated && document.status !== 'draft' && (
            <Button variant="outline" onClick={handleGenerateXML}>
              <FileText className="mr-2 h-4 w-4" />
              Generar XML
            </Button>
          )}

          <Button variant="outline" onClick={handleSendEmail}>
            <Mail className="mr-2 h-4 w-4" />
            Enviar Email
          </Button>

          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Info */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información del Documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer */}
            <div>
              <h3 className="font-semibold mb-2">Cliente</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{document.customerData?.name}</p>
                <p className="text-muted-foreground">RIF: {document.customerData?.rif}</p>
                {document.customerData?.email && (
                  <p className="text-muted-foreground">Email: {document.customerData.email}</p>
                )}
                {document.customerData?.phone && (
                  <p className="text-muted-foreground">Tel: {document.customerData.phone}</p>
                )}
                {document.customerData?.address && (
                  <p className="text-muted-foreground">{document.customerData.address}</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Items */}
            <div>
              <h3 className="font-semibold mb-2">Items</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Cant.</TableHead>
                    <TableHead className="text-right">Precio Unit.</TableHead>
                    <TableHead className="text-right">IVA</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {document.items?.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${item.unitPrice?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        ${item.tax?.amount?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${((item.quantity * item.unitPrice) + (item.tax?.amount || 0)).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Totals */}
            <div className="border-t pt-4">
              <div className="space-y-2 max-w-sm ml-auto">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>${document.totals?.subtotal?.toFixed(2)}</span>
                </div>
                {document.totals?.discounts > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Descuentos:</span>
                    <span className="text-red-600">
                      -${document.totals.discounts.toFixed(2)}
                    </span>
                  </div>
                )}
                {document.totals?.taxes?.map((tax, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {tax.type} ({tax.rate}%):
                    </span>
                    <span>${tax.amount?.toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>
                    ${document.totals?.grandTotal?.toFixed(2)} {document.currency}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {document.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notas</h3>
                  <p className="text-sm text-muted-foreground">{document.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalles</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">Fecha emisión:</span>
                <p className="font-medium">
                  {document.issuedAt
                    ? new Date(document.issuedAt).toLocaleDateString('es-VE')
                    : '-'}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha creación:</span>
                <p className="font-medium">
                  {new Date(document.createdAt).toLocaleDateString('es-VE')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Método de pago:</span>
                <p className="font-medium capitalize">
                  {document.paymentMethod?.replace('_', ' ')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Moneda:</span>
                <p className="font-medium">{document.currency}</p>
              </div>
              {document.exchangeRate && (
                <div>
                  <span className="text-muted-foreground">Tasa de cambio:</span>
                  <p className="font-medium">{document.exchangeRate.toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* SENIAT Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4" />
                SENIAT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-muted-foreground">XML generado:</span>
                <p className="font-medium">
                  {document.seniat?.xmlGenerated ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Sí
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <XCircle className="h-4 w-4" />
                      No
                    </span>
                  )}
                </p>
              </div>

              {document.seniat?.transmissionDate && (
                <div>
                  <span className="text-muted-foreground">Fecha transmisión:</span>
                  <p className="font-medium">
                    {new Date(document.seniat.transmissionDate).toLocaleDateString('es-VE')}
                  </p>
                </div>
              )}

              {document.controlNumber && (
                <div>
                  <span className="text-muted-foreground">Control:</span>
                  <p className="font-mono text-xs">{document.controlNumber}</p>
                </div>
              )}

              {document.taxInfo?.verificationUrl && (
                <div>
                  <a
                    href={document.taxInfo.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    Verificar en SENIAT
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {!document.seniat?.xmlGenerated && document.status !== 'draft' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidateSENIAT}
                  className="w-full"
                >
                  <Shield className="mr-2 h-4 w-4" />
                  Validar SENIAT
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Evidence */}
          {evidence && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Evidencia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {evidence.imprenta?.controlNumber && (
                  <div>
                    <span className="text-muted-foreground">Control Imprenta:</span>
                    <p className="font-mono text-xs">{evidence.imprenta.controlNumber}</p>
                  </div>
                )}

                {evidence.imprenta?.provider && (
                  <div>
                    <span className="text-muted-foreground">Proveedor:</span>
                    <p className="font-medium">{evidence.imprenta.provider}</p>
                  </div>
                )}

                {evidence.xmlHash && (
                  <div>
                    <span className="text-muted-foreground">Hash XML:</span>
                    <p className="font-mono text-xs break-all">{evidence.xmlHash.slice(0, 32)}...</p>
                  </div>
                )}

                {evidence.verificationUrl && (
                  <div>
                    <a
                      href={evidence.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                    >
                      URL Verificación
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* QR Modal */}
      {showQR && document.seniat?.qrCode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Código QR - {document.documentNumber}</CardTitle>
              <CardDescription>
                Escanea con tu móvil para verificar en SENIAT
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <img
                src={document.seniat.qrCode}
                alt="QR Code"
                className="w-64 h-64 border-2 border-gray-200 rounded"
              />
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Control: <span className="font-mono">{document.controlNumber}</span>
                </p>
                {document.taxInfo?.verificationUrl && (
                  <a
                    href={document.taxInfo.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center justify-center gap-1 mt-2"
                  >
                    Verificar en SENIAT
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              <Button onClick={() => setShowQR(false)} variant="outline" className="w-full">
                Cerrar
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default BillingDocumentDetail;
