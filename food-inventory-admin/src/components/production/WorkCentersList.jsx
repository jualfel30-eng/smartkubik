import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Settings, Plus, Edit, Trash2 } from 'lucide-react';
import { useWorkCenters } from '@/hooks/useWorkCenters';
import { WorkCenterDialog } from './WorkCenterDialog';

export function WorkCentersList() {
  const { workCenters, loading, error, loadWorkCenters, createWorkCenter, updateWorkCenter, deleteWorkCenter } =
    useWorkCenters();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedWorkCenter, setSelectedWorkCenter] = useState(null);

  useEffect(() => {
    loadWorkCenters();
  }, [loadWorkCenters]);

  const handleCreate = () => {
    setSelectedWorkCenter(null);
    setDialogOpen(true);
  };

  const handleEdit = (workCenter) => {
    setSelectedWorkCenter(workCenter);
    setDialogOpen(true);
  };

  const handleSave = async (workCenterData) => {
    try {
      if (selectedWorkCenter) {
        await updateWorkCenter(selectedWorkCenter._id, workCenterData);
      } else {
        await createWorkCenter(workCenterData);
      }
      setDialogOpen(false);
      setSelectedWorkCenter(null);
    } catch (err) {
      console.error('Error saving work center:', err);
      alert('Error al guardar el centro de trabajo: ' + err.message);
    }
  };

  const handleDelete = async (workCenterId) => {
    if (window.confirm('¿Estás seguro de eliminar este centro de trabajo?')) {
      try {
        await deleteWorkCenter(workCenterId);
      } catch (err) {
        console.error('Error deleting work center:', err);
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <CardTitle>Centros de Trabajo</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Centro
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
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Costo/Hora</TableHead>
                  <TableHead>Eficiencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workCenters.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay centros de trabajo
                    </TableCell>
                  </TableRow>
                ) : (
                  workCenters.map((workCenter) => (
                    <TableRow key={workCenter._id}>
                      <TableCell className="font-medium">{workCenter.code}</TableCell>
                      <TableCell>{workCenter.name}</TableCell>
                      <TableCell className="capitalize">{workCenter.type}</TableCell>
                      <TableCell>
                        {workCenter.capacity} {workCenter.capacityUnit || 'unidades/hora'}
                      </TableCell>
                      <TableCell>{formatCurrency(workCenter.costPerHour)}</TableCell>
                      <TableCell>{workCenter.efficiencyPercentage || 100}%</TableCell>
                      <TableCell>
                        {workCenter.isActive ? (
                          <Badge className="bg-green-500">Activo</Badge>
                        ) : (
                          <Badge variant="outline">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(workCenter)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(workCenter._id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      <WorkCenterDialog
        open={dialogOpen}
        workCenter={selectedWorkCenter}
        onClose={() => {
          setDialogOpen(false);
          setSelectedWorkCenter(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
