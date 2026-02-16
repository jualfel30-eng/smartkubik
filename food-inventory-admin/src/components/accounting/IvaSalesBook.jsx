import React, { useState, useEffect } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  AlertTriangle,
  FileText,
  Download,
  Trash2,
  XCircle,
  Search,
  BookOpen,
  Filter,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchSalesBook,
  validateSalesBook,
  exportSalesBookToTXT,
  getSalesBookSummary,
  annulSalesBookEntry,
  deleteSalesBookEntry,
} from '../../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const IvaSalesBook = ({ customers }) => {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [openAnnulDialog, setOpenAnnulDialog] = useState(false);
  const [annullingEntry, setAnnullingEntry] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');
  const [summary, setSummary] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    customerId: 'all',
    isElectronic: 'all',
    page: 1,
    limit: 50,
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    loadEntries();
  }, [selectedMonth, selectedYear, filters]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const cleanFilters = {
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all')
        ),
      };

      // Fix for customerId filter
      if (filters.customerId === 'all') delete cleanFilters.customerId;

      const response = await fetchSalesBook(cleanFilters);
      setEntries(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('Error al cargar libro de ventas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      const result = await validateSalesBook(parseInt(selectedMonth), parseInt(selectedYear));

      if (result.valid) {
        toast.success('Libro de ventas validado correctamente');
        setValidationErrors([]);
      } else {
        toast.warning(`Se encontraron ${result.errors.length} errores`);
        setValidationErrors(result.errors);
      }
      setShowValidation(true);
    } catch (error) {
      toast.error('Error al validar libro');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTXT = async () => {
    try {
      setLoading(true);
      await exportSalesBookToTXT(parseInt(selectedMonth), parseInt(selectedYear));
      toast.success('Archivo TXT descargado exitosamente');
    } catch (error) {
      toast.error('Error al exportar TXT');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowSummary = async () => {
    try {
      setLoading(true);
      const summaryData = await getSalesBookSummary(parseInt(selectedMonth), parseInt(selectedYear));
      setSummary(summaryData);
      setOpenSummaryDialog(true);
    } catch (error) {
      toast.error('Error al obtener resumen');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnnulDialog = (entry) => {
    setAnnullingEntry(entry);
    setAnnulmentReason('');
    setOpenAnnulDialog(true);
  };

  const handleAnnul = async () => {
    if (!annulmentReason.trim()) {
      toast.error('Debe especificar una razón de anulación');
      return;
    }

    try {
      await annulSalesBookEntry(annullingEntry._id, { annulmentReason });
      toast.success('Factura anulada exitosamente');
      setOpenAnnulDialog(false);
      loadEntries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada del libro de ventas?')) return;

    try {
      await deleteSalesBookEntry(id);
      toast.success('Entrada eliminada');
      loadEntries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Confirmada</Badge>;
      case 'exported':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Exportada</Badge>;
      case 'annulled':
        return <Badge variant="destructive">Anulada</Badge>;
      default:
        return <Badge variant="secondary">Borrador</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Libro de Ventas
          </h2>
          <p className="text-muted-foreground">
            Registro y control de operaciones de venta con IVA (SENIAT)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleValidate} disabled={loading}>
            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
            Validar
          </Button>
          <Button variant="outline" onClick={handleShowSummary} disabled={loading}>
            <FileText className="mr-2 h-4 w-4 text-blue-600" />
            Resumen
          </Button>
          <Button onClick={handleExportTXT} disabled={loading}>
            <Download className="mr-2 h-4 w-4" />
            Exportar TXT
          </Button>
        </div>
      </div>

      {/* Filtros Principales */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros del Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Mes</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((month, index) => (
                    <SelectItem key={index + 1} value={(index + 1).toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Año</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(val) => handleFilterChange('status', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                  <SelectItem value="confirmed">Confirmadas</SelectItem>
                  <SelectItem value="exported">Exportadas</SelectItem>
                  <SelectItem value="annulled">Anuladas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select
                value={filters.customerId}
                onValueChange={(val) => handleFilterChange('customerId', val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {customers?.map((customer) => (
                    <SelectItem key={customer._id} value={customer._id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alertas de Validación */}
      {showValidation && validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errores de Validación Detectados</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2 space-y-1 text-sm">
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index}>{error}</li>
              ))}
              {validationErrors.length > 5 && (
                <li>... y {validationErrors.length - 5} errores más</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabla de Facturas */}
      <Card>
        <CardContent className="p-0">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente / RIF</TableHead>
                  <TableHead>Factura</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Base Imp.</TableHead>
                  <TableHead className="text-right">IVA</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                      No se encontraron facturas para este período.
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map((entry) => (
                    <TableRow key={entry._id} className={entry.status === 'annulled' ? 'bg-muted/50' : ''}>
                      <TableCell>
                        {format(new Date(entry.operationDate), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{entry.customerName}</div>
                        <div className="text-xs text-muted-foreground">{entry.customerRif}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-bold">{entry.invoiceNumber}</div>
                        <div className="text-xs text-muted-foreground">Ref: {entry.invoiceControlNumber || 'S/N'}</div>
                      </TableCell>
                      <TableCell>
                        {entry.isElectronic ? (
                          <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Electrónica</Badge>
                        ) : (
                          <Badge variant="outline">Física</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.baseAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <div className="flex flex-col items-end">
                          <span>{entry.ivaAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
                          <span className="text-[10px] text-muted-foreground">{entry.ivaRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold">
                        {entry.totalAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(entry.status)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {entry.status === 'confirmed' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenAnnulDialog(entry)}
                              title="Anular"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(entry.status === 'draft' || entry.status === 'confirmed') && !entry.exportedToSENIAT && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(entry._id)}
                              title="Eliminar"
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="p-4 border-t bg-muted/20 flex justify-between items-center text-sm text-muted-foreground">
            <div>Total: <strong>{total}</strong> facturas</div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={filters.page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                disabled={entries.length < filters.limit}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Anular */}
      <Dialog open={openAnnulDialog} onOpenChange={setOpenAnnulDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Factura</DialogTitle>
            <DialogDescription>
              Esta acción marcará la factura como anulada en el libro de ventas. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {annullingEntry && (
            <div className="p-3 bg-muted rounded-md text-sm space-y-1 mb-4">
              <div><strong>Factura:</strong> {annullingEntry.invoiceNumber}</div>
              <div><strong>Cliente:</strong> {annullingEntry.customerName}</div>
              <div><strong>Monto:</strong> Bs. {annullingEntry.totalAmount.toFixed(2)}</div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Razón de Anulación</Label>
            <Input
              placeholder="Explique el motivo..."
              value={annulmentReason}
              onChange={(e) => setAnnulmentReason(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAnnulDialog(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleAnnul}>Anular Factura</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Resumen */}
      <Dialog open={openSummaryDialog} onOpenChange={setOpenSummaryDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Resumen Libro de Ventas</DialogTitle>
            <DialogDescription>
              {monthNames[parseInt(selectedMonth) - 1]} {selectedYear}
            </DialogDescription>
          </DialogHeader>

          {summary && (
            <div className="grid gap-6 py-4">
              {/* Totales Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-primary/5 border-primary/20">
                  <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Facturas</CardTitle></CardHeader>
                  <CardContent className="p-4 pt-0 text-2xl font-bold">{summary.totalEntries}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Base Imponible</CardTitle></CardHeader>
                  <CardContent className="p-4 pt-0 text-lg font-bold">Bs. {summary.totalBaseAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total IVA</CardTitle></CardHeader>
                  <CardContent className="p-4 pt-0 text-lg font-bold text-primary">Bs. {summary.totalIvaAmount.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</CardContent>
                </Card>
                <Card>
                  <CardHeader className="p-4 pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Ventas</CardTitle></CardHeader>
                  <CardContent className="p-4 pt-0 text-lg font-bold">Bs. {summary.totalAmount?.toLocaleString('es-VE', { minimumFractionDigits: 2 }) || '0,00'}</CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Por Tasa de IVA */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Desglose por Tasa</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tasa</TableHead>
                          <TableHead className="text-right">Base</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.byIvaRate.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{item.ivaRate}%</TableCell>
                            <TableCell className="text-right">{item.totalBase.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right font-medium">{item.totalIva.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Top Clientes */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Top Clientes</h4>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-right">IVA</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summary.byCustomer.slice(0, 5).map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <div className="font-medium text-xs truncate max-w-[150px]">{item.customerName}</div>
                              <div className="text-[10px] text-muted-foreground">{item.customerRif}</div>
                            </TableCell>
                            <TableCell className="text-right text-xs">{item.totalIva.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setOpenSummaryDialog(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IvaSalesBook;
