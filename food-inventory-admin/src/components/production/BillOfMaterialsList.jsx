import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Edit, Trash2, DollarSign, CheckCircle, Layers } from 'lucide-react';
import { useBillOfMaterials } from '@/hooks/useBillOfMaterials';
import { BillOfMaterialsDialog } from './BillOfMaterialsDialog';
import { BOMExplosionDialog } from './BOMExplosionDialog';

export function BillOfMaterialsList() {
  const { boms, loading, error, loadBoms, createBom, updateBom, deleteBom, calculateTotalCost, checkAvailability } =
    useBillOfMaterials();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBom, setSelectedBom] = useState(null);
  const [explosionDialogOpen, setExplosionDialogOpen] = useState(false);
  const [explosionBom, setExplosionBom] = useState(null);
  const [costs, setCosts] = useState({});
  const [availabilities, setAvailabilities] = useState({});

  useEffect(() => {
    loadBoms();
  }, [loadBoms]);

  const handleCreate = () => {
    setSelectedBom(null);
    setDialogOpen(true);
  };

  const handleEdit = (bom) => {
    setSelectedBom(bom);
    setDialogOpen(true);
  };

  const handleSave = async (bomData) => {
    try {
      if (selectedBom) {
        await updateBom(selectedBom._id, bomData);
      } else {
        await createBom(bomData);
      }
      setDialogOpen(false);
      setSelectedBom(null);
    } catch (err) {
      console.error('Error saving BOM:', err);
      alert('Error al guardar la receta: ' + err.message);
    }
  };

  const handleDelete = async (bomId) => {
    if (window.confirm('¿Estás seguro de eliminar esta receta?')) {
      try {
        await deleteBom(bomId);
      } catch (err) {
        console.error('Error deleting BOM:', err);
      }
    }
  };

  const handleCalculateCost = async (bomId) => {
    try {
      const result = await calculateTotalCost(bomId);
      setCosts((prev) => ({ ...prev, [bomId]: result.totalCost }));
    } catch (err) {
      console.error('Error calculating cost:', err);
    }
  };

  const handleCheckAvailability = async (bomId, quantity = 1) => {
    try {
      const result = await checkAvailability(bomId, quantity);
      setAvailabilities((prev) => ({ ...prev, [bomId]: result }));
    } catch (err) {
      console.error('Error checking availability:', err);
    }
  };

  const handleViewExplosion = (bom) => {
    setExplosionBom(bom);
    setExplosionDialogOpen(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            <CardTitle>Recetas</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Receta
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
                  <TableHead>Platillo</TableHead>
                  <TableHead>Versión</TableHead>
                  <TableHead>Ingredientes</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead>Fecha Efectiva</TableHead>
                  <TableHead>Costo Calculado</TableHead>
                  <TableHead>Disponibilidad</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {boms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay recetas creadas
                    </TableCell>
                  </TableRow>
                ) : (
                  boms.map((bom) => {
                    const cost = costs[bom._id];
                    const availability = availabilities[bom._id];

                    return (
                      <TableRow key={bom._id}>
                        <TableCell className="font-medium">
                          {bom.product?.name || bom.productId}
                          {bom.product?.sku && <div className="text-xs text-muted-foreground">{bom.product.sku}</div>}
                        </TableCell>
                        <TableCell>{bom.version}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{bom.components?.length || 0} ingredientes</Badge>
                        </TableCell>
                        <TableCell>
                          {bom.isActive ? (
                            <Badge className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activa
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactiva</Badge>
                          )}
                        </TableCell>
                        <TableCell>{formatDate(bom.effectiveDate)}</TableCell>
                        <TableCell>
                          {cost !== undefined ? (
                            <span className="font-medium">{formatCurrency(cost)}</span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCalculateCost(bom._id)}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Calcular
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {availability ? (
                            availability.allAvailable ? (
                              <Badge className="bg-green-500">Disponible</Badge>
                            ) : (
                              <Badge className="bg-red-500">
                                {availability.missing?.length || 0} faltantes
                              </Badge>
                            )
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCheckAvailability(bom._id, 1)}
                            >
                              Verificar
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewExplosion(bom)}
                              title="Ver explosión multinivel"
                            >
                              <Layers className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleEdit(bom)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => handleDelete(bom._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <BillOfMaterialsDialog
        open={dialogOpen}
        bom={selectedBom}
        onClose={() => {
          setDialogOpen(false);
          setSelectedBom(null);
        }}
        onSave={handleSave}
      />

      <BOMExplosionDialog
        open={explosionDialogOpen}
        bom={explosionBom}
        onClose={() => {
          setExplosionDialogOpen(false);
          setExplosionBom(null);
        }}
      />
    </>
  );
}
