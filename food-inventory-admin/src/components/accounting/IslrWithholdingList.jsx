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
import { Textarea } from '@/components/ui/textarea';
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
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  BarChart3,
  FileText,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchIslrWithholdings,
  deleteIslrWithholding,
  postIslrWithholding,
  annulIslrWithholding,
  exportIslrToARC,
  getIslrSummary,
} from '../../lib/api';
import IslrWithholdingForm from './IslrWithholdingForm';
import { format } from 'date-fns';

const IslrWithholdingList = ({ suppliers }) => {
  const [withholdings, setWithholdings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingWithholding, setEditingWithholding] = useState(null);
  const [openAnnulDialog, setOpenAnnulDialog] = useState(false);
  const [annullingWithholding, setAnnullingWithholding] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');
  const [summary, setSummary] = useState(null);
  const [showSummary, setShowSummary] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    beneficiaryType: 'all',
    operationType: 'all',
    startDate: '',
    endDate: '',
    beneficiaryRif: '',
    exportedToARC: 'all',
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    loadWithholdings();
  }, [filters]);

  const loadWithholdings = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all')
      );
      const response = await fetchIslrWithholdings(cleanFilters);
      setWithholdings(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('Error al cargar retenciones ISLR');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForm = (withholding = null) => {
    setEditingWithholding(withholding);
    setOpenForm(true);
  };

  const handleCloseForm = () => {
    setOpenForm(false);
    setEditingWithholding(null);
  };

  const handlePost = async (id) => {
    if (!window.confirm('¿Contabilizar esta retención ISLR?')) return;

    try {
      await postIslrWithholding(id);
      toast.success('Retención ISLR contabilizada exitosamente');
      loadWithholdings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al contabilizar');
    }
  };

  const handleOpenAnnulDialog = (withholding) => {
    setAnnullingWithholding(withholding);
    setAnnulmentReason('');
    setOpenAnnulDialog(true);
  };

  const handleAnnul = async () => {
    if (!annulmentReason.trim()) {
      toast.error('Debe especificar una razón de anulación');
      return;
    }

    try {
      await annulIslrWithholding(annullingWithholding._id, { annulmentReason });
      toast.success('Retención ISLR anulada exitosamente');
      setOpenAnnulDialog(false);
      loadWithholdings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta retención ISLR?')) return;

    try {
      await deleteIslrWithholding(id);
      toast.success('Retención ISLR eliminada');
      loadWithholdings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleExportARC = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      await exportIslrToARC(month, year);
      toast.success('Archivo ARC ISLR descargado exitosamente');
    } catch (error) {
      toast.error('Error al exportar ARC ISLR');
    }
  };

  const handleShowSummary = async () => {
    try {
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const summaryData = await getIslrSummary(month, year);
      setSummary(summaryData);
      setShowSummary(true);
    } catch (error) {
      toast.error('Error al cargar resumen');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const getStatusVariant = (status) => {
    const variants = {
      draft: 'secondary',
      posted: 'default',
      annulled: 'destructive',
    };
    return variants[status] || 'outline';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Borrador',
      posted: 'Contabilizada',
      annulled: 'Anulada',
    };
    return labels[status] || status;
  };

  const getOperationTypeLabel = (operationType) => {
    const labels = {
      salarios: 'Salarios',
      honorarios_profesionales: 'Honorarios Profesionales',
      comisiones: 'Comisiones',
      intereses: 'Intereses',
      dividendos: 'Dividendos',
      arrendamiento: 'Arrendamiento',
      regalias: 'Regalías',
      servicio_transporte: 'Servicio de Transporte',
      otros_servicios: 'Otros Servicios',
    };
    return labels[operationType] || operationType;
  };

  const getBeneficiaryTypeLabel = (type) => {
    const labels = {
      supplier: 'Proveedor',
      employee: 'Empleado',
    };
    return labels[type] || type;
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Retenciones ISLR</h2>
          <p className="text-muted-foreground">Impuesto Sobre la Renta</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleShowSummary}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Resumen
          </Button>
          <Button variant="outline" onClick={handleExportARC}>
            <Download className="mr-2 h-4 w-4" />
            Exportar ARC
          </Button>
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Retención
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra las retenciones según tus necesidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="draft">Borradores</SelectItem>
                  <SelectItem value="posted">Contabilizadas</SelectItem>
                  <SelectItem value="annulled">Anuladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="beneficiaryType">Tipo Beneficiario</Label>
              <Select
                value={filters.beneficiaryType}
                onValueChange={(value) => handleFilterChange('beneficiaryType', value)}
              >
                <SelectTrigger id="beneficiaryType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="supplier">Proveedores</SelectItem>
                  <SelectItem value="employee">Empleados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="operationType">Tipo Operación</Label>
              <Select
                value={filters.operationType}
                onValueChange={(value) => handleFilterChange('operationType', value)}
              >
                <SelectTrigger id="operationType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="salarios">Salarios</SelectItem>
                  <SelectItem value="honorarios_profesionales">Honorarios</SelectItem>
                  <SelectItem value="comisiones">Comisiones</SelectItem>
                  <SelectItem value="intereses">Intereses</SelectItem>
                  <SelectItem value="dividendos">Dividendos</SelectItem>
                  <SelectItem value="arrendamiento">Arrendamiento</SelectItem>
                  <SelectItem value="regalias">Regalías</SelectItem>
                  <SelectItem value="servicio_transporte">Transporte</SelectItem>
                  <SelectItem value="otros_servicios">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="startDate">Desde</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="endDate">Hasta</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="exportedToARC">Exportado</Label>
              <Select
                value={filters.exportedToARC}
                onValueChange={(value) => handleFilterChange('exportedToARC', value)}
              >
                <SelectTrigger id="exportedToARC">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Beneficiario</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Operación</TableHead>
                <TableHead className="text-right">Base Imp.</TableHead>
                <TableHead>% Ret.</TableHead>
                <TableHead className="text-right">Retenido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>ARC</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withholdings.map((w) => (
                <TableRow key={w._id}>
                  <TableCell className="font-medium">{w.certificateNumber}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(w.withholdingDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{w.beneficiaryName}</div>
                      <div className="text-sm text-muted-foreground">{w.beneficiaryRif}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {getBeneficiaryTypeLabel(w.beneficiaryType)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {getOperationTypeLabel(w.operationType)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    Bs. {w.baseAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{w.withholdingPercentage}%</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">
                    Bs. {w.withholdingAmount.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(w.status)}>
                      {getStatusLabel(w.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {w.exportedToARC && <Badge>Exportado</Badge>}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {w.status === 'draft' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(w)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePost(w._id)}
                            title="Contabilizar"
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(w._id)}
                            title="Eliminar"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {w.status === 'posted' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenAnnulDialog(w)}
                            title="Anular"
                            className="text-destructive hover:text-destructive"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" title="Imprimir">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {withholdings.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                No hay retenciones ISLR registradas
              </p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                    className={filters.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= filters.page - 1 && page <= filters.page + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={filters.page === page}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (page === filters.page - 2 || page === filters.page + 2) {
                      return (
                        <PaginationItem key={page}>
                          <span className="px-4">...</span>
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}
                  <PaginationNext
                    onClick={() => handlePageChange(Math.min(totalPages, filters.page + 1))}
                    className={
                      filters.page === totalPages
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <IslrWithholdingForm
        open={openForm}
        onClose={handleCloseForm}
        onSuccess={loadWithholdings}
        editingWithholding={editingWithholding}
        suppliers={suppliers}
      />

      {/* Annul Dialog */}
      <Dialog open={openAnnulDialog} onOpenChange={setOpenAnnulDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Anular Retención ISLR</DialogTitle>
            <DialogDescription>
              Esta acción creará un asiento de reversión y marcará la retención como anulada
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta acción creará un asiento de reversión y marcará la retención como anulada.
            </AlertDescription>
          </Alert>
          <div className="grid gap-2 py-4">
            <Label htmlFor="annulmentReason">Razón de Anulación *</Label>
            <Textarea
              id="annulmentReason"
              value={annulmentReason}
              onChange={(e) => setAnnulmentReason(e.target.value)}
              placeholder="Explique por qué se anula esta retención..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenAnnulDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleAnnul}>
              Anular Retención
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de Retenciones ISLR</DialogTitle>
            <DialogDescription>Estadísticas del período actual</DialogDescription>
          </DialogHeader>
          {summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Total Retenciones
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{summary.totalWithholdings}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Monto Total Retenido
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Bs. {summary.totalAmount?.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Base Imponible Total
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      Bs. {summary.totalBaseAmount?.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* By Operation Type */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Por Tipo de Operación</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo de Operación</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byOperationType?.map((item) => (
                      <TableRow key={item.operationType}>
                        <TableCell>{getOperationTypeLabel(item.operationType)}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right font-mono">
                          Bs. {item.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* By Beneficiary */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Por Beneficiario (Top 10)</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RIF</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.byBeneficiary?.slice(0, 10).map((item) => (
                      <TableRow key={item.beneficiaryRif}>
                        <TableCell className="font-mono">{item.beneficiaryRif}</TableCell>
                        <TableCell>{item.beneficiaryName}</TableCell>
                        <TableCell className="text-right">{item.count}</TableCell>
                        <TableCell className="text-right font-mono">
                          Bs. {item.totalAmount.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default IslrWithholdingList;
