import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Send,
  CheckCircle,
  Clock,
  Filter,
  Plus,
  Eye,
  RefreshCw,
  Calendar,
  DollarSign,
  FileCheck,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FileDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { getApiBaseUrl, getAuthToken } from '../../lib/api';
import WithholdingIvaForm from './WithholdingIvaForm';
import WithholdingIslrForm from './WithholdingIslrForm';

const WithholdingManagement = () => {
  const [retentions, setRetentions] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({
    totalIva: 0,
    totalIslr: 0,
    countIva: 0,
    countIslr: 0,
    countDraft: 0,
    countIssued: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    beneficiaryTaxId: '',
    page: 1,
    limit: 20
  });

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createType, setCreateType] = useState(null);
  const [selectedRetention, setSelectedRetention] = useState(null);
  const [showAnnulDialog, setShowAnnulDialog] = useState(false);
  const [annullingRetention, setAnnullingRetention] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');

  useEffect(() => {
    loadRetentions();
    calculateStats();
  }, [activeTab, filters]);

  const loadRetentions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (activeTab !== 'all') {
        params.append('type', activeTab);
      }

      // Aplicar filtros
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.append(key, value);
        }
      });

      const response = await api.get(`/withholding?${params.toString()}`);

      // Si el backend retorna { data: [], total: 0 }
      if (response.data) {
        setRetentions(response.data || []);
        setTotal(response.total || 0);
      } else {
        // Si retorna directamente el array
        setRetentions(response || []);
        setTotal(response?.length || 0);
      }
    } catch (error) {
      console.error('Error loading retentions:', error);
      toast.error('Error al cargar retenciones');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = async () => {
    try {
      const response = await api.get('/withholding/stats');
      setStats(response || stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const handleIssueRetention = async (id) => {
    try {
      toast.loading('Emitiendo retención a HKA Factory...');
      await api.post(`/withholding/${id}/issue`, {
        fiscalInfo: {
          period: new Date().toISOString().slice(0, 7),
          declarationNumber: `DEC-${Date.now()}`
        }
      });

      toast.success('Retención emitida exitosamente');
      loadRetentions();
      calculateStats();
    } catch (error) {
      console.error('Error issuing retention:', error);
      toast.error(error.message || 'Error al emitir retención');
    }
  };

  const handleDownloadPdf = async (id, documentNumber) => {
    try {
      toast.loading('Generando PDF...');
      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/withholding/${id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al descargar PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('PDF descargado correctamente');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Error al descargar PDF');
    }
  };

  const handleOpenAnnulDialog = (retention) => {
    setAnnullingRetention(retention);
    setAnnulmentReason('');
    setShowAnnulDialog(true);
  };

  const handleAnnulRetention = async () => {
    if (!annulmentReason.trim()) {
      toast.error('Debe especificar una razón de anulación');
      return;
    }

    try {
      toast.loading('Anulando retención...');
      await api.post(`/withholding/${annullingRetention._id}/cancel`, {
        reason: annulmentReason
      });

      toast.success('Retención anulada exitosamente');
      setShowAnnulDialog(false);
      setAnnullingRetention(null);
      setAnnulmentReason('');
      loadRetentions();
      calculateStats();
    } catch (error) {
      console.error('Error annulling retention:', error);
      toast.error(error.message || 'Error al anular retención');
    }
  };

  const handleExportARC = async () => {
    try {
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      toast.loading('Generando archivo ARC...');

      const response = await fetch(
        `${getApiBaseUrl()}/api/v1/withholding/reports/islr/${year}/txt`,
        {
          headers: {
            Authorization: `Bearer ${getAuthToken()}`,
          },
        }
      );

      if (!response.ok) throw new Error('Error al exportar ARC');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ARC-ISLR-${year}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Archivo ARC descargado exitosamente');
    } catch (error) {
      console.error('Error exporting ARC:', error);
      toast.error('Error al exportar archivo ARC');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { variant: 'secondary', icon: Clock, label: 'Borrador' },
      issued: { variant: 'default', icon: CheckCircle, label: 'Emitida' },
      cancelled: { variant: 'destructive', icon: AlertCircle, label: 'Anulada' }
    };

    const config = statusConfig[status] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    return type === 'iva' ? (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        IVA
      </Badge>
    ) : (
      <Badge variant="outline" className="bg-success/5 text-success border-green-200">
        ISLR
      </Badge>
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('es-VE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleCreateNew = (type) => {
    setCreateType(type);
    setShowCreateDialog(true);
  };

  const handleCloseDialog = () => {
    setShowCreateDialog(false);
    setCreateType(null);
    loadRetentions();
    calculateStats();
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Retenciones Fiscales</h1>
          <p className="text-muted-foreground">
            Gestión de retenciones IVA e ISLR
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportARC}
          >
            <FileDown className="h-4 w-4 mr-2" />
            Exportar ARC
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              loadRetentions();
              calculateStats();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={() => handleCreateNew('iva')}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Retención IVA
          </Button>
          <Button onClick={() => handleCreateNew('islr')} variant="secondary">
            <Plus className="h-4 w-4 mr-2" />
            Nueva Retención ISLR
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total IVA Retenido
            </CardTitle>
            <DollarSign className="h-4 w-4 text-info" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-info">
              {formatCurrency(stats.totalIva)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.countIva} retenciones IVA
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total ISLR Retenido
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {formatCurrency(stats.totalIslr)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.countIslr} retenciones ISLR
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Borradores
            </CardTitle>
            <Clock className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.countDraft}
            </div>
            <p className="text-xs text-muted-foreground">
              Pendientes de emitir
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Emitidas
            </CardTitle>
            <FileCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.countIssued}
            </div>
            <p className="text-xs text-muted-foreground">
              Con número de control
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros Avanzados</CardTitle>
          <CardDescription>Filtra las retenciones según tus necesidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="status-filter">Estado</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger id="status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="issued">Emitida</SelectItem>
                  <SelectItem value="cancelled">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start-date">Fecha Desde</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">Fecha Hasta</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="beneficiary-rif">RIF Beneficiario</Label>
              <Input
                id="beneficiary-rif"
                type="text"
                placeholder="J-123456789"
                value={filters.beneficiaryTaxId}
                onChange={(e) => handleFilterChange('beneficiaryTaxId', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Listado de Retenciones</CardTitle>
              <CardDescription>
                {total} retenciones encontradas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="iva">IVA</TabsTrigger>
              <TabsTrigger value="islr">ISLR</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">Cargando retenciones...</p>
                </div>
              ) : retentions.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="mt-2 text-muted-foreground">
                    No hay retenciones registradas
                  </p>
                  <Button
                    className="mt-4"
                    variant="outline"
                    onClick={() => handleCreateNew(activeTab === 'all' ? 'iva' : activeTab)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primera Retención
                  </Button>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Documento</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Beneficiario</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead className="text-right">Monto Retenido</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Nro. Control</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {retentions.map((retention) => (
                        <TableRow key={retention._id}>
                          <TableCell className="font-medium">
                            {retention.documentNumber}
                          </TableCell>
                          <TableCell>
                            {getTypeBadge(retention.type)}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {retention.beneficiary.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {retention.beneficiary.taxId}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {formatDate(retention.operationDate)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(
                              retention.type === 'iva'
                                ? retention.ivaRetention?.retentionAmount
                                : retention.islrRetention?.retentionAmount
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(retention.status)}
                          </TableCell>
                          <TableCell>
                            {retention.controlNumber ? (
                              <span className="font-mono text-sm font-medium text-success">
                                {retention.controlNumber}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {retention.status === 'draft' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleIssueRetention(retention._id)}
                                >
                                  <Send className="h-3 w-3 mr-1" />
                                  Emitir
                                </Button>
                              )}
                              {retention.status === 'issued' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleDownloadPdf(retention._id, retention.documentNumber)}
                                  >
                                    <Download className="h-3 w-3 mr-1" />
                                    PDF
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleOpenAnnulDialog(retention)}
                                  >
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Anular
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedRetention(retention)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <p className="text-sm text-muted-foreground">
                        Página {filters.page} de {totalPages} ({total} retenciones)
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(filters.page - 1)}
                          disabled={filters.page === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Anterior
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(filters.page + 1)}
                          disabled={filters.page === totalPages}
                        >
                          Siguiente
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Nueva Retención {createType === 'iva' ? 'IVA' : 'ISLR'}
            </DialogTitle>
            <DialogDescription>
              {createType === 'iva'
                ? 'Crear comprobante de retención de IVA'
                : 'Crear comprobante de retención de ISLR'}
            </DialogDescription>
          </DialogHeader>
          {createType === 'iva' ? (
            <WithholdingIvaForm onSuccess={handleCloseDialog} onCancel={handleCloseDialog} />
          ) : createType === 'islr' ? (
            <WithholdingIslrForm onSuccess={handleCloseDialog} onCancel={handleCloseDialog} />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Annul Dialog */}
      <Dialog open={showAnnulDialog} onOpenChange={setShowAnnulDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Retención</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. La retención será marcada como anulada.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {annullingRetention && (
              <div className="bg-muted p-4 rounded-md">
                <p className="font-medium">{annullingRetention.documentNumber}</p>
                <p className="text-sm text-muted-foreground">
                  {annullingRetention.beneficiary.name}
                </p>
                <p className="text-sm text-muted-foreground">
                  Nro. Control: {annullingRetention.controlNumber}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="annulment-reason">Razón de Anulación *</Label>
              <Textarea
                id="annulment-reason"
                value={annulmentReason}
                onChange={(e) => setAnnulmentReason(e.target.value)}
                placeholder="Describa el motivo de la anulación..."
                rows={4}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Esta razón quedará registrada en el sistema
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAnnulDialog(false);
                setAnnullingRetention(null);
                setAnnulmentReason('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnnulRetention}
              disabled={!annulmentReason.trim()}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Anular Retención
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedRetention && (
        <Dialog open={!!selectedRetention} onOpenChange={() => setSelectedRetention(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Detalle de Retención</DialogTitle>
              <DialogDescription>
                {selectedRetention.documentNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Tipo
                  </label>
                  <div className="mt-1">
                    {getTypeBadge(selectedRetention.type)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Estado
                  </label>
                  <div className="mt-1">
                    {getStatusBadge(selectedRetention.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Número de Control
                  </label>
                  <div className="mt-1 font-mono font-medium">
                    {selectedRetention.controlNumber || 'Sin asignar'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Fecha de Operación
                  </label>
                  <div className="mt-1">
                    {formatDate(selectedRetention.operationDate)}
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Beneficiario</h4>
                <div className="space-y-1">
                  <p><strong>Nombre:</strong> {selectedRetention.beneficiary.name}</p>
                  <p><strong>RIF/Cédula:</strong> {selectedRetention.beneficiary.taxId}</p>
                  {selectedRetention.beneficiary.email && (
                    <p><strong>Email:</strong> {selectedRetention.beneficiary.email}</p>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">
                  Detalles {selectedRetention.type === 'iva' ? 'IVA' : 'ISLR'}
                </h4>
                {selectedRetention.type === 'iva' ? (
                  <div className="space-y-1">
                    <p><strong>Base Imponible:</strong> {formatCurrency(selectedRetention.ivaRetention.baseAmount)}</p>
                    <p><strong>IVA ({selectedRetention.ivaRetention.taxRate}%):</strong> {formatCurrency(selectedRetention.ivaRetention.taxAmount)}</p>
                    <p><strong>Porcentaje Retención:</strong> {selectedRetention.ivaRetention.retentionPercentage}%</p>
                    <p className="text-lg font-bold text-success">
                      <strong>Monto Retenido:</strong> {formatCurrency(selectedRetention.ivaRetention.retentionAmount)}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p><strong>Concepto:</strong> {selectedRetention.islrRetention.conceptCode} - {selectedRetention.islrRetention.conceptDescription}</p>
                    <p><strong>Base Imponible:</strong> {formatCurrency(selectedRetention.islrRetention.baseAmount)}</p>
                    <p><strong>Porcentaje Retención:</strong> {selectedRetention.islrRetention.retentionPercentage}%</p>
                    {selectedRetention.islrRetention.sustraendo > 0 && (
                      <p><strong>Sustraendo:</strong> {formatCurrency(selectedRetention.islrRetention.sustraendo)}</p>
                    )}
                    <p className="text-lg font-bold text-success">
                      <strong>Monto Retenido:</strong> {formatCurrency(selectedRetention.islrRetention.retentionAmount)}
                    </p>
                  </div>
                )}
              </div>

              {selectedRetention.metadata?.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">Notas</h4>
                  <p className="text-sm">{selectedRetention.metadata.notes}</p>
                </div>
              )}

              {selectedRetention.status === 'cancelled' && selectedRetention.metadata?.cancellationReason && (
                <div className="border-t pt-4 bg-destructive/5 p-4 rounded-md">
                  <h4 className="font-semibold mb-2 text-red-900">Razón de Anulación</h4>
                  <p className="text-sm text-red-800">{selectedRetention.metadata.cancellationReason}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default WithholdingManagement;
