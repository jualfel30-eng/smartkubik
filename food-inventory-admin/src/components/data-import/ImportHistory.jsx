import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Loader2, RotateCcw, Download, Trash2, ChevronLeft, ChevronRight, RefreshCw,
} from 'lucide-react';
import { useDataImport } from '@/hooks/use-data-import';

const STATUS_VARIANTS = {
  uploaded: 'secondary',
  parsed: 'secondary',
  validated: 'outline',
  processing: 'default',
  completed: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
  rolled_back: 'outline',
};

const STATUS_LABELS = {
  uploaded: 'Cargado',
  parsed: 'Parseado',
  validated: 'Validado',
  processing: 'Procesando',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  rolled_back: 'Revertido',
};

const ENTITY_LABELS = {
  products: 'Productos',
  customers: 'Clientes',
  suppliers: 'Proveedores',
  inventory: 'Inventario',
  categories: 'Categorías',
};

export default function ImportHistory() {
  const { history, loading, loadHistory, rollback, deleteJob, downloadErrors } = useDataImport();
  const [filters, setFilters] = useState({ entityType: 'all', status: 'all' });
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchHistory = useCallback(() => {
    const params = { page, limit: 15 };
    if (filters.entityType !== 'all') params.entityType = filters.entityType;
    if (filters.status !== 'all') params.status = filters.status;
    loadHistory(params);
  }, [page, filters, loadHistory]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const handleRollback = async (jobId) => {
    try {
      setActionLoading(`rollback-${jobId}`);
      await rollback(jobId);
      fetchHistory();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (jobId) => {
    try {
      setActionLoading(`delete-${jobId}`);
      await deleteJob(jobId);
      fetchHistory();
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadErrors = async (jobId) => {
    setActionLoading(`errors-${jobId}`);
    try {
      await downloadErrors(jobId);
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = history.pagination?.totalPages || 1;
  const jobs = history.data || [];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={filters.entityType} onValueChange={(v) => handleFilterChange('entityType', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Tipo de entidad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="products">Productos</SelectItem>
            <SelectItem value="customers">Clientes</SelectItem>
            <SelectItem value="suppliers">Proveedores</SelectItem>
            <SelectItem value="inventory">Inventario</SelectItem>
            <SelectItem value="categories">Categorías</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="completed">Completado</SelectItem>
            <SelectItem value="failed">Fallido</SelectItem>
            <SelectItem value="processing">Procesando</SelectItem>
            <SelectItem value="rolled_back">Revertido</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Archivo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Exitosos</TableHead>
                <TableHead className="text-right">Fallidos</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay importaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job) => (
                  <TableRow key={job._id}>
                    <TableCell>
                      <span className="font-medium text-sm truncate max-w-[200px] block">
                        {job.originalFileName || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{ENTITY_LABELS[job.entityType] || job.entityType}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[job.status] || 'secondary'}>
                        {STATUS_LABELS[job.status] || job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {job.totalRows || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-green-600">
                      {job.successfulRows || 0}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-red-600">
                      {job.failedRows || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {job.createdAt
                        ? new Date(job.createdAt).toLocaleDateString('es', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        {/* Download errors */}
                        {(job.failedRows || 0) > 0 && job.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadErrors(job._id)}
                            disabled={actionLoading === `errors-${job._id}`}
                            title="Descargar errores"
                          >
                            {actionLoading === `errors-${job._id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Download className="h-4 w-4" />
                            )}
                          </Button>
                        )}

                        {/* Rollback */}
                        {job.status === 'completed' && !job.isRolledBack && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                title="Revertir"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Revertir importación</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminarán {job.successfulRows || 0} registros creados y se
                                  restaurarán los actualizados. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRollback(job._id)}
                                  className="bg-destructive text-destructive-foreground"
                                >
                                  {actionLoading === `rollback-${job._id}` ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                  ) : null}
                                  Revertir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}

                        {/* Delete (only non-executed jobs) */}
                        {['uploaded', 'parsed', 'validated', 'failed', 'cancelled'].includes(job.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(job._id)}
                            disabled={actionLoading === `delete-${job._id}`}
                            title="Eliminar"
                          >
                            {actionLoading === `delete-${job._id}` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
