import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  FileText,
  QrCode,
  Download,
  RefreshCw,
  Eye,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getElectronicInvoiceStats,
  listBillingDocuments,
  validateDocumentForSENIAT,
  generateSeniatXML,
  downloadSeniatXML,
} from '../../lib/api';
import SeniatValidation from './SeniatValidation';

const ElectronicInvoicesManager = () => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filters, setFilters] = useState({
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    status: 'all',
    documentType: 'all',
  });

  // Dialogs
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState(null);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, docsData] = await Promise.allSettled([
        getElectronicInvoiceStats(filters),
        listBillingDocuments(filters),
      ]);

      if (statsData.status === 'fulfilled') {
        setStats(statsData.value);
      } else {
        const err = statsData.reason;
        if (err?.message?.includes('404') || err?.message?.includes('Cannot GET')) {
          setStats({
            totalInvoices: 0,
            totalAmount: 0,
            issuedInvoices: 0,
            withXmlGenerated: 0,
            totalTaxAmount: 0,
            byDocumentType: {},
          });
        }
      }

      if (docsData.status === 'fulfilled') {
        setInvoices(Array.isArray(docsData.value) ? docsData.value : []);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = loadData;

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleValidate = (doc) => {
    setSelectedDocument(doc);
    setValidationDialogOpen(true);
  };

  const handleGenerateXML = async (documentId) => {
    try {
      const result = await generateSeniatXML(documentId);
      toast.success('XML generado correctamente');
      loadStats();
    } catch (error) {
      console.error('Error generating XML:', error);
      toast.error(error.message || 'Error al generar XML');
    }
  };

  const handleDownloadXML = async (documentId, documentNumber) => {
    try {
      const blob = await downloadSeniatXML(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${documentNumber}.xml`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('XML descargado correctamente');
    } catch (error) {
      console.error('Error downloading XML:', error);
      toast.error('Error al descargar XML');
    }
  };

  const handleShowQR = (invoice) => {
    if (invoice.seniat?.qrCode) {
      setQrData({
        qrCode: invoice.seniat.qrCode,
        verificationUrl: invoice.seniat.verificationUrl,
        documentNumber: invoice.documentNumber,
      });
      setQrDialogOpen(true);
    } else {
      toast.warning('Este documento no tiene código QR generado');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'secondary',
      issued: 'default',
      sent: 'outline',
      validated: 'default',
    };
    return colors[status] || 'secondary';
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      invoice: 'Facturas',
      credit_note: 'Notas de Crédito',
      debit_note: 'Notas de Débito',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Facturas Electrónicas SENIAT</h2>
          <p className="text-muted-foreground">
            Gestión de facturación electrónica según normativa SENIAT
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Facturas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
              <p className="text-sm text-muted-foreground">
                {formatCurrency(stats.totalAmount)}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Emitidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.issuedInvoices}
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.totalInvoices > 0
                  ? `${((stats.issuedInvoices / stats.totalInvoices) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Con XML Generado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.withXmlGenerated}
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.issuedInvoices > 0
                  ? `${((stats.withXmlGenerated / stats.issuedInvoices) * 100).toFixed(1)}%`
                  : '0%'}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-amber-50 dark:bg-amber-950/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                IVA Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(stats.totalTaxAmount)}
              </div>
              <p className="text-sm text-muted-foreground">Impuestos recaudados</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona el rango de fechas y tipo de documento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="issued">Emitidas</SelectItem>
                  <SelectItem value="sent">Enviadas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="documentType">Tipo</Label>
              <Select
                value={filters.documentType}
                onValueChange={(value) => handleFilterChange('documentType', value)}
              >
                <SelectTrigger id="documentType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="invoice">Factura</SelectItem>
                  <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                  <SelectItem value="debit_note">Nota de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={loadStats} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Actualizar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics by Type */}
      {stats && stats.byDocumentType && Object.keys(stats.byDocumentType).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen por Tipo de Documento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(stats.byDocumentType).map(([type, data]) => (
                <div key={type} className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {getDocumentTypeLabel(type)}
                  </p>
                  <p className="text-xl font-bold">{data.count}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(data.amount)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Table */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Facturas Electrónicas</CardTitle>
          <CardDescription>
            {invoices.length > 0
              ? `${invoices.length} documento(s) encontrado(s)`
              : 'No hay documentos en el rango seleccionado'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto USD</TableHead>
                  <TableHead className="text-right">Monto Bs.</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        No hay facturas en el rango de fechas seleccionado.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => {
                    const docTypeLabels = {
                      invoice: 'Factura',
                      credit_note: 'N. Crédito',
                      debit_note: 'N. Débito',
                      delivery_note: 'N. Entrega',
                      quote: 'Cotización',
                    };
                    return (
                      <TableRow key={inv._id}>
                        <TableCell className="font-medium">
                          {inv.documentNumber}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {docTypeLabels[inv.type] || inv.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>{inv.customer?.name || '—'}</div>
                          {inv.customer?.taxId && (
                            <div className="text-xs text-muted-foreground">
                              {inv.customer.taxId}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {inv.issueDate
                            ? new Date(inv.issueDate).toLocaleDateString('es-VE')
                            : inv.createdAt
                              ? new Date(inv.createdAt).toLocaleDateString('es-VE')
                              : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {inv.totals?.grandTotal != null
                            ? `$${inv.totals.grandTotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {inv.totalsVes?.grandTotal != null
                            ? `Bs. ${inv.totalsVes.grandTotal.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {inv.controlNumber ? (
                            <span className="text-xs font-mono">{inv.controlNumber}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Sin control</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(inv.status)}>
                            {inv.status === 'draft'
                              ? 'Borrador'
                              : inv.status === 'issued'
                                ? 'Emitida'
                                : inv.status === 'sent'
                                  ? 'Enviada'
                                  : inv.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Validar SENIAT"
                              onClick={() => handleValidate(inv)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {inv.seniat?.xmlGenerated ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Descargar XML"
                                onClick={() => handleDownloadXML(inv._id, inv.documentNumber)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            ) : (
                              inv.status === 'issued' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Generar XML"
                                  onClick={() => handleGenerateXML(inv._id)}
                                >
                                  <FileSpreadsheet className="h-4 w-4" />
                                </Button>
                              )
                            )}
                            {inv.seniat?.qrCode && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Ver QR"
                                onClick={() => handleShowQR(inv)}
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Validation Dialog */}
      <Dialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Validación SENIAT</DialogTitle>
            <DialogDescription>
              Valida el documento según las normas de SENIAT
            </DialogDescription>
          </DialogHeader>
          {selectedDocument && (
            <SeniatValidation
              documentId={selectedDocument._id}
              document={selectedDocument}
              onValidationComplete={(result) => {
                if (result.valid) {
                  loadStats();
                }
              }}
            />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidationDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Código QR - {qrData?.documentNumber}</DialogTitle>
            <DialogDescription>
              Código QR para verificación de documento
            </DialogDescription>
          </DialogHeader>
          {qrData && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img
                src={qrData.qrCode}
                alt="QR Code"
                className="max-w-full h-auto rounded-lg"
              />
              {qrData.verificationUrl && (
                <div className="w-full text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    URL de Verificación:
                  </p>
                  <div className="bg-muted p-3 rounded-md break-all text-sm">
                    {qrData.verificationUrl}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setQrDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ElectronicInvoicesManager;
