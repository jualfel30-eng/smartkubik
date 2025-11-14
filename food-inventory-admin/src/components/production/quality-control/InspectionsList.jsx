import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Award, Plus, Eye, FileCheck } from 'lucide-react';
import { useQualityControl } from '@/hooks/useQualityControl';
import { InspectionDialog } from './InspectionDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export function InspectionsList() {
  const { inspections, loading, error, loadInspections, createInspection, recordInspectionResult } =
    useQualityControl();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [viewMode, setViewMode] = useState(false);

  useEffect(() => {
    loadInspections();
  }, [loadInspections]);

  const handleCreate = () => {
    setSelectedInspection(null);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleView = (inspection) => {
    setSelectedInspection(inspection);
    setViewMode(true);
    setDialogOpen(true);
  };

  const handleRecordResults = (inspection) => {
    setSelectedInspection(inspection);
    setViewMode(false);
    setDialogOpen(true);
  };

  const handleSave = async (inspectionData) => {
    try {
      if (selectedInspection && inspectionData.results) {
        // Registrar resultados de inspección existente
        await recordInspectionResult(selectedInspection._id, inspectionData.results);
      } else {
        // Crear nueva inspección
        await createInspection(inspectionData);
      }
      setDialogOpen(false);
      setSelectedInspection(null);
      setViewMode(false);
    } catch (err) {
      console.error('Error saving inspection:', err);
      alert('Error al guardar la inspección: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Pendiente', className: 'bg-yellow-500' },
      in_progress: { label: 'En Progreso', className: 'bg-blue-500' },
      completed: { label: 'Completada', className: 'bg-green-500' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-500' }
    };
    const config = statusConfig[status] || { label: status, className: 'bg-gray-500' };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getInspectionTypeBadge = (type) => {
    const typeLabels = {
      receiving: 'Recepción',
      in_process: 'En Proceso',
      final_inspection: 'Inspección Final'
    };
    return typeLabels[type] || type;
  };

  const getResultBadge = (overallResult) => {
    if (overallResult === undefined || overallResult === null) {
      return <Badge variant="outline">Sin Resultado</Badge>;
    }
    return overallResult ? (
      <Badge className="bg-green-500">Aprobado</Badge>
    ) : (
      <Badge className="bg-red-500">Rechazado</Badge>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: es });
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            <CardTitle>Inspecciones de Calidad</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Inspección
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
                  <TableHead>Número</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Inspector</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inspections.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No hay inspecciones
                    </TableCell>
                  </TableRow>
                ) : (
                  inspections.map((inspection) => (
                    <TableRow key={inspection._id}>
                      <TableCell className="font-medium">{inspection.inspectionNumber}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{inspection.productName}</div>
                          {inspection.productSku && (
                            <div className="text-sm text-muted-foreground">{inspection.productSku}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getInspectionTypeBadge(inspection.inspectionType)}</TableCell>
                      <TableCell>{inspection.lotNumber || '-'}</TableCell>
                      <TableCell className="text-sm">{formatDate(inspection.inspectionDate)}</TableCell>
                      <TableCell>
                        {inspection.inspectorName || inspection.inspector?.firstName || '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {getResultBadge(inspection.overallResult)}
                          {inspection.passedCheckpoints !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {inspection.passedCheckpoints}/{inspection.totalCheckpoints} checks
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(inspection.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleView(inspection)} title="Ver detalle">
                            <Eye className="h-4 w-4" />
                          </Button>
                          {inspection.status !== 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRecordResults(inspection)}
                              title="Registrar resultados"
                            >
                              <FileCheck className="h-4 w-4" />
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

      <InspectionDialog
        open={dialogOpen}
        inspection={selectedInspection}
        viewMode={viewMode}
        onClose={() => {
          setDialogOpen(false);
          setSelectedInspection(null);
          setViewMode(false);
        }}
        onSave={handleSave}
      />
    </>
  );
}
