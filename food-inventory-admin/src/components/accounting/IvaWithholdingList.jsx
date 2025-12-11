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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
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
  X,
  FileDown,
  Printer,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchIvaWithholdings,
  deleteIvaWithholding,
  postIvaWithholding,
  annulIvaWithholding,
  exportIvaWithholdingsToARC,
} from '../../lib/api';
import IvaWithholdingForm from './IvaWithholdingForm';
import { format } from 'date-fns';

const IvaWithholdingList = ({ suppliers }) => {
  const [withholdings, setWithholdings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openForm, setOpenForm] = useState(false);
  const [editingWithholding, setEditingWithholding] = useState(null);
  const [openAnnulDialog, setOpenAnnulDialog] = useState(false);
  const [annullingWithholding, setAnnullingWithholding] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    startDate: '',
    endDate: '',
    supplierId: '',
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
      const response = await fetchIvaWithholdings(cleanFilters);
      setWithholdings(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('Error al cargar retenciones');
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
    if (!window.confirm('¿Contabilizar esta retención?')) return;

    try {
      await postIvaWithholding(id);
      toast.success('Retención contabilizada exitosamente');
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
      await annulIvaWithholding(annullingWithholding._id, { annulmentReason });
      toast.success('Retención anulada exitosamente');
      setOpenAnnulDialog(false);
      loadWithholdings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta retención?')) return;

    try {
      await deleteIvaWithholding(id);
      toast.success('Retención eliminada');
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

      await exportIvaWithholdingsToARC(month, year);
      toast.success('Archivo ARC descargado exitosamente');
    } catch (error) {
      toast.error('Error al exportar ARC');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const handlePageChange = (newPage) => {
    setFilters({ ...filters, page: newPage });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'secondary',
      posted: 'default',
      annulled: 'destructive',
    };
    return colors[status] || 'secondary';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Borrador',
      posted: 'Contabilizada',
      annulled: 'Anulada',
    };
    return labels[status] || status;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const totalPages = Math.ceil(total / filters.limit);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Retenciones de IVA</CardTitle>
            <CardDescription>
              Gestión de retenciones de Impuesto al Valor Agregado
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportARC}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar ARC
            </Button>
            <Button onClick={() => handleOpenForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Retención
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Estado</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
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
            <Label htmlFor="supplier">Proveedor</Label>
            <Select
              value={filters.supplierId}
              onValueChange={(value) => handleFilterChange('supplierId', value)}
            >
              <SelectTrigger id="supplier">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {suppliers?.map((supplier) => (
                  <SelectItem key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Certificado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Factura</TableHead>
                <TableHead className="text-right">Base Imp.</TableHead>
                <TableHead className="text-right">IVA</TableHead>
                <TableHead>% Ret.</TableHead>
                <TableHead className="text-right">Retenido</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withholdings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8">
                    <p className="text-muted-foreground">
                      No se encontraron retenciones
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                withholdings.map((w) => (
                  <TableRow key={w._id}>
                    <TableCell>
                      <div className="font-semibold">{w.certificateNumber}</div>
                    </TableCell>
                    <TableCell>
                      {format(new Date(w.withholdingDate), 'dd/MM/yyyy')}
                    </TableCell>
                    <TableCell>
                      <div>{w.supplierName}</div>
                      <div className="text-sm text-muted-foreground">
                        {w.supplierRif}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>{w.invoiceNumber}</div>
                      <div className="text-sm text-muted-foreground">
                        {w.invoiceControlNumber}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(w.baseAmount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(w.ivaAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{w.withholdingPercentage}%</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {formatCurrency(w.withholdingAmount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(w.status)}>
                        {getStatusLabel(w.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {w.status === 'draft' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenForm(w)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handlePost(w._id)}
                                  className="text-green-600 dark:text-green-400"
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Contabilizar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDelete(w._id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                            {w.status === 'posted' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleOpenAnnulDialog(w)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  Anular
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Imprimir
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => filters.page > 1 && handlePageChange(filters.page - 1)}
                  className={filters.page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    onClick={() => handlePageChange(page)}
                    isActive={filters.page === page}
                    className="cursor-pointer"
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext
                  onClick={() => filters.page < totalPages && handlePageChange(filters.page + 1)}
                  className={filters.page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>

      {/* Form Dialog */}
      <IvaWithholdingForm
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
            <DialogTitle>Anular Retención</DialogTitle>
            <DialogDescription>
              Esta acción creará un asiento de reversión y marcará la retención como
              anulada.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta acción no se puede deshacer. Se creará un asiento contable de reversión.
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
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
    </Card>
  );
};

export default IvaWithholdingList;
