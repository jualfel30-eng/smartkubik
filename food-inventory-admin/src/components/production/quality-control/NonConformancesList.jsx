import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertTriangle, Plus, Eye, Edit } from 'lucide-react';
import { useQualityControl } from '@/hooks/useQualityControl';
import { NonConformanceDialog } from './NonConformanceDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function NonConformancesList() {
  const { nonConformances, loading, error, loadNonConformances, createNonConformance, updateNonConformance } =
    useQualityControl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNC, setSelectedNC] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    loadNonConformances();
  }, [loadNonConformances]);

  const handleCreate = () => {
    setSelectedNC(null);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleView = (nc) => {
    setSelectedNC(nc);
    setViewMode(true);
    setDialogOpen(true);
  };

  const handleEdit = (nc) => {
    setSelectedNC(nc);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleSave = async (ncData) => {
    try {
      if (selectedNC) {
        await updateNonConformance(selectedNC._id, ncData);
      } else {
        await createNonConformance(ncData);
      }
      setDialogOpen(false);
      setSelectedNC(null);
      setViewMode(false);
    } catch (err) {
      console.error('Error saving non-conformance:', err);
      alert('Error al guardar la no conformidad: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      open: { label: 'Abierta', className: 'bg-red-500' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-500' },
      verification: { label: 'Verificación', className: 'bg-yellow-500' },
      closed: { label: 'Cerrada', className: 'bg-green-500' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-500' }
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getSeverityBadge = (severity) => {
    const severityConfig = {
      minor: { label: 'Menor', className: 'bg-yellow-500' },
      major: { label: 'Mayor', className: 'bg-orange-500' },
      critical: { label: 'Crítica', className: 'bg-red-500' }
    };
    const config = severityConfig[severity] || { label: severity, className: 'bg-gray-500' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getTypeBadge = (type) => {
    const typeLabels = {
      quality_defect: 'Defecto de Calidad',
      process_deviation: 'Desviación de Proceso',
      documentation: 'Documentación',
      other: 'Otro'
    };
    return typeLabels[type] || type;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: es });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            <CardTitle>No Conformidades</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva NC
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">Error: {error}</div>
          )}

          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número NC</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Fecha Límite</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonConformances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      No hay no conformidades
                    </TableCell>
                  </TableRow>
                ) : (
                  nonConformances.map((nc) => (
                    <TableRow key={nc._id}>
                      <TableCell className="font-medium">{nc.ncNumber}</TableCell>
                      <TableCell>{getTypeBadge(nc.type)}</TableCell>
                      <TableCell>{getSeverityBadge(nc.severity)}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={nc.description}>
                          {nc.description}
                        </div>
                      </TableCell>
                      <TableCell>
                        {nc.productName ? (
                          <div>
                            <div className="font-medium">{nc.productName}</div>
                            {nc.affectedQuantity && (
                              <div className="text-sm text-muted-foreground">
                                {nc.affectedQuantity} {nc.unit}
                              </div>
                            )}
                          </div>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                      <TableCell>{nc.lotNumber || '-'}</TableCell>
                      <TableCell>
                        {nc.responsibleUserName || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {nc.dueDate ? (
                          <div className={new Date(nc.dueDate) < new Date() && nc.status !== 'closed' ? 'text-red-600 font-semibold' : ''}>
                            {formatDate(nc.dueDate)}
                          </div>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(nc.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleView(nc)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {nc.status !== 'closed' && nc.status !== 'cancelled' && (
                            <Button size="sm" variant="outline" onClick={() => handleEdit(nc)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NonConformanceDialog
        open={dialogOpen}
        nonConformance={selectedNC}
        viewMode={viewMode}
        onClose={() => {
          setDialogOpen(false);
          setSelectedNC(null);
          setViewMode(false);
        }}
        onSave={handleSave}
      />
    </>
  );
}
