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
    loadStats();
  }, [filters]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getElectronicInvoiceStats(filters);
      setStats(data);
    } catch (error) {
      // Set default stats if endpoint doesn't exist yet (404)
      if (error.message && (error.message.includes('404') || error.message.includes('Cannot GET'))) {
        // Silently set default stats without logging errors
        setStats({
          totalInvoices: 0,
          totalAmount: 0,
          issuedInvoices: 0,
          withXmlGenerated: 0,
          totalTaxAmount: 0,
          byDocumentType: {},
        });
      } else {
        // Only log and show toast for non-404 errors
        console.error('Error loading stats:', error);
        toast.error('Error al cargar estadísticas');
      }
    } finally {
      setLoading(false);
    }
  };

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
          <CardTitle>Facturas Electrónicas</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4">
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Esta tabla mostrará las facturas electrónicas emitidas. Por ahora, utilice el módulo
              de facturación para ver documentos individuales.
            </AlertDescription>
          </Alert>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Control</TableHead>
                  <TableHead>XML</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">
                      No hay datos para mostrar. Las facturas emitidas aparecerán aquí.
                    </p>
                  </TableCell>
                </TableRow>
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
