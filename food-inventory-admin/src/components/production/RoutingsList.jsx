import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitBranch, Plus, Edit, Trash2 } from 'lucide-react';
import { useRoutings } from '@/hooks/useRoutings';
import { RoutingDialog } from './RoutingDialog';

export function RoutingsList() {
  const { routings, loading, error, loadRoutings, createRouting, updateRouting, deleteRouting } = useRoutings();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRouting, setSelectedRouting] = useState(null);

  useEffect(() => {
    loadRoutings();
  }, [loadRoutings]);

  const handleCreate = () => {
    setSelectedRouting(null);
    setDialogOpen(true);
  };

  const handleEdit = (routing) => {
    setSelectedRouting(routing);
    setDialogOpen(true);
  };

  const handleSave = async (routingData) => {
    try {
      if (selectedRouting) {
        await updateRouting(selectedRouting._id, routingData);
      } else {
        await createRouting(routingData);
      }
      setDialogOpen(false);
      setSelectedRouting(null);
    } catch (err) {
      console.error('Error saving routing:', err);
      alert('Error al guardar la ruta de producción: ' + err.message);
    }
  };

  const handleDelete = async (routingId) => {
    if (window.confirm('¿Estás seguro de eliminar esta ruta de producción?')) {
      try {
        await deleteRouting(routingId);
      } catch (err) {
        console.error('Error deleting routing:', err);
      }
    }
  };

  const calculateTotalTime = (operations) => {
    if (!operations || operations.length === 0) return 0;
    return operations.reduce((total, op) => {
      return total + (op.setupTime || 0) + (op.cycleTime || 0);
    }, 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-6 w-6" />
            <CardTitle>Rutas de Producción (Routings)</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Ruta
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
                  <TableHead>Nombre</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Operaciones</TableHead>
                  <TableHead>Tiempo Total (min)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      No hay rutas de producción
                    </TableCell>
                  </TableRow>
                ) : (
                  routings.map((routing) => (
                    <TableRow key={routing._id}>
                      <TableCell className="font-medium">{routing.name}</TableCell>
                      <TableCell>
                        {routing.product?.name || routing.productId}
                        {routing.product?.sku && <div className="text-xs text-muted-foreground">{routing.product.sku}</div>}
                      </TableCell>
                      <TableCell>{routing.version}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{routing.operations?.length || 0} operaciones</Badge>
                      </TableCell>
                      <TableCell>{calculateTotalTime(routing.operations).toFixed(1)} min</TableCell>
                      <TableCell>
                        {routing.isActive ? (
                          <Badge className="bg-green-500">Activa</Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(routing)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(routing._id)}>
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

      <RoutingDialog
        open={dialogOpen}
        routing={selectedRouting}
        onClose={() => {
          setDialogOpen(false);
          setSelectedRouting(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
