import React, { useState, useEffect } from 'react';
import {
  FileText,
  FileCheck,
  FileMinus,
  FilePlus,
  FileQuestion,
  Download,
  Send,
  CheckCircle,
  AlertCircle,
  Clock,
  QrCode,
  ExternalLink,
  Eye,
  Wrench
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
import InvoiceDeliveryDialog from './InvoiceDeliveryDialog';

const BillingDashboard = () => {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  useEffect(() => {
    loadStats();
    loadDocuments();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await api.get('/billing/stats/electronic-invoices');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const loadDocuments = async (documentType = null) => {
    try {
      const params = new URLSearchParams();
      if (documentType && documentType !== 'all') {
        params.append('documentType', documentType);
      }

      const response = await api.get(`/billing/documents?${params.toString()}`);
      setDocuments(response || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      toast.error('Error al cargar documentos');
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    let docType = null;

    switch (value) {
      case 'invoices':
        docType = 'invoice';
        break;
      case 'credit-notes':
        docType = 'credit_note';
        break;
      case 'debit-notes':
        docType = 'debit_note';
        break;
      case 'delivery-notes':
        docType = 'delivery_note';
        break;
      default:
        docType = 'all';
    }

    loadDocuments(docType);
  };

  const getDocumentIcon = (type) => {
    const icons = {
      invoice: FileText,
      credit_note: FileMinus,
      debit_note: FilePlus,
      delivery_note: FileCheck,
      quote: FileQuestion,
    };
    const Icon = icons[type] || FileText;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { label: 'Borrador', variant: 'secondary' },
      validated: { label: 'Validado', variant: 'outline' },
      sent_to_imprenta: { label: 'Enviando...', variant: 'default' },
      issued: { label: 'Emitido', variant: 'success' },
      sent: { label: 'Enviado', variant: 'success' },
      closed: { label: 'Cerrado', variant: 'default' },
      archived: { label: 'Archivado', variant: 'secondary' },
    };

    const config = statusConfig[status] || { label: status, variant: 'secondary' };

    return (
      <Badge variant={config.variant}>
        {config.label}
      </Badge>
    );
  };

  const handleDownloadXml = (documentId) => {
    window.open(`/api/billing/documents/${documentId}/seniat-xml`, '_blank');
    toast.success('Descargando XML...');
  };

  const handleViewQR = async (documentId) => {
    try {
      const response = await api.get(`/billing/documents/${documentId}`);
      const qrCode = response.data.seniat?.qrCode || response.data.taxInfo?.qrCode;

      if (qrCode) {
        // Mostrar QR en modal (implementar modal)
        setSelectedDoc(response.data);
        toast.success('Código QR cargado');
      } else {
        toast.error('Este documento no tiene código QR');
      }
    } catch (error) {
      toast.error('Error al cargar código QR');
    }
  };

  const handleViewDeliverInvoice = (doc) => {
    setSelectedInvoice(doc);
    setShowDeliveryDialog(true);
  };

  const handleRepairInvoices = async () => {
    try {
      setLoading(true);
      const response = await api.post('/billing/repair-invoices');
      if (response.success) {
        toast.success(`Reparación completada. ${response.repaired} facturas corregidas.`);
        loadDocuments(); // Reload to show recovered data
        loadStats();
      } else {
        toast.warning('La reparación finalizó pero revisa los logs.');
      }
    } catch (error) {
      console.error('Error repairing invoices:', error);
      toast.error('Error al intentar reparar facturas');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Facturación Electrónica</h1>
          <p className="text-muted-foreground">
            Sistema de facturación electrónica SENIAT
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRepairInvoices} disabled={loading}>
            <Wrench className="mr-2 h-4 w-4" />
            Reparar Facturas
          </Button>
          <Button onClick={() => window.location.href = '/billing/create'}>
            <FileText className="mr-2 h-4 w-4" />
            Nueva Factura
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Documentos
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totals?.totalDocuments || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.period?.from} - {stats.period?.to}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Monto Total
              </CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.totals?.totalAmount?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                IVA: ${stats.totals?.totalIva?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0.00'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Facturas Emitidas
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.byStatus?.issued || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Borradores: {stats.byStatus?.draft || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Cumplimiento SENIAT
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.seniatCompliance?.complianceRate || 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                XML Generados: {stats.seniatCompliance?.xmlGenerated || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="invoices">Facturas</TabsTrigger>
          <TabsTrigger value="credit-notes">Notas de Crédito</TabsTrigger>
          <TabsTrigger value="debit-notes">Notas de Débito</TabsTrigger>
          <TabsTrigger value="delivery-notes">Notas de Entrega</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos Recientes</CardTitle>
              <CardDescription>
                Últimos documentos de facturación creados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents}
                onDownloadXml={handleDownloadXml}
                onViewQR={handleViewQR}
                onViewDeliver={handleViewDeliverInvoice}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Facturas</CardTitle>
              <CardDescription>
                Facturas de venta emitidas
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents}
                onDownloadXml={handleDownloadXml}
                onViewQR={handleViewQR}
                onViewDeliver={handleViewDeliverInvoice}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="credit-notes">
          <Card>
            <CardHeader>
              <CardTitle>Notas de Crédito</CardTitle>
              <CardDescription>
                Notas de crédito emitidas para devoluciones y ajustes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents}
                onDownloadXml={handleDownloadXml}
                onViewQR={handleViewQR}
                onViewDeliver={handleViewDeliverInvoice}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debit-notes">
          <Card>
            <CardHeader>
              <CardTitle>Notas de Débito</CardTitle>
              <CardDescription>
                Notas de débito emitidas para cargos adicionales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents}
                onDownloadXml={handleDownloadXml}
                onViewQR={handleViewQR}
                onViewDeliver={handleViewDeliverInvoice}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delivery-notes">
          <Card>
            <CardHeader>
              <CardTitle>Notas de Entrega</CardTitle>
              <CardDescription>
                Notas de entrega y guías de despacho
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents}
                onDownloadXml={handleDownloadXml}
                onViewQR={handleViewQR}
                onViewDeliver={handleViewDeliverInvoice}
                getDocumentIcon={getDocumentIcon}
                getStatusBadge={getStatusBadge}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* QR Modal */}
      {selectedDoc && selectedDoc.seniat?.qrCode && (
        <QRModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Invoice Delivery Dialog */}
      <InvoiceDeliveryDialog
        isOpen={showDeliveryDialog}
        onClose={() => setShowDeliveryDialog(false)}
        invoice={selectedInvoice}
        customerEmail={selectedInvoice?.customer?.email}
        customerPhone={selectedInvoice?.customer?.phone}
      />
    </div>
  );
};

const DocumentsTable = ({ documents, onDownloadXml, onViewQR, onViewDeliver, getDocumentIcon, getStatusBadge }) => {
  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="mx-auto h-12 w-12 mb-2 opacity-50" />
        <p>No hay documentos para mostrar</p>
        <p className="text-sm">Crea tu primera factura para comenzar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tipo</TableHead>
          <TableHead>Número</TableHead>
          <TableHead>Control</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc._id}>
            <TableCell>
              <div className="flex items-center gap-2">
                {getDocumentIcon(doc.type)}
                <span className="capitalize">{doc.type.replace('_', ' ')}</span>
              </div>
            </TableCell>
            <TableCell className="font-mono">{doc.documentNumber}</TableCell>
            <TableCell className="font-mono text-xs">
              {doc.controlNumber || '-'}
            </TableCell>
            <TableCell>{doc.customer?.name || '-'}</TableCell>
            <TableCell>{new Date(doc.createdAt).toLocaleDateString('es-VE')}</TableCell>
            <TableCell>${doc.totals?.grandTotal?.toFixed(2) || '0.00'}</TableCell>
            <TableCell>{getStatusBadge(doc.status)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                {/* Ver/Entregar Factura - Solo para facturas emitidas */}
                {doc.status === 'issued' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDeliver(doc)}
                    title="Ver y entregar factura"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                {doc.seniat?.xmlGenerated && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDownloadXml(doc._id)}
                    title="Descargar XML"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                {doc.seniat?.qrCode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewQR(doc._id)}
                    title="Ver código QR"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                )}
                {doc.taxInfo?.verificationUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.open(doc.taxInfo.verificationUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

const QRModal = ({ document, onClose }) => {
  return (
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
          <Button onClick={onClose} variant="outline" className="w-full">
            Cerrar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingDashboard;
