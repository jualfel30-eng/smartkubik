import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, Plus, Edit, Trash2, Star } from 'lucide-react';
import { useProductionVersions } from '@/hooks/useProductionVersions';
import { ProductionVersionDialog } from './ProductionVersionDialog';

export function ProductionVersionsList() {
  const {
    productionVersions,
    loading,
    error,
    loadProductionVersions,
    createProductionVersion,
    updateProductionVersion,
    deleteProductionVersion,
  } = useProductionVersions();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);

  useEffect(() => {
    loadProductionVersions();
  }, [loadProductionVersions]);

  const handleCreate = () => {
    setSelectedVersion(null);
    setDialogOpen(true);
  };

  const handleEdit = (version) => {
    setSelectedVersion(version);
    setDialogOpen(true);
  };

  const handleSave = async (versionData) => {
    try {
      if (selectedVersion) {
        await updateProductionVersion(selectedVersion._id, versionData);
      } else {
        await createProductionVersion(versionData);
      }
      setDialogOpen(false);
      setSelectedVersion(null);
    } catch (err) {
      console.error('Error saving production version:', err);
      alert('Error al guardar la versión de producción: ' + err.message);
    }
  };

  const handleDelete = async (versionId) => {
    if (window.confirm('¿Estás seguro de eliminar esta versión de producción?')) {
      try {
        await deleteProductionVersion(versionId);
      } catch (err) {
        console.error('Error deleting production version:', err);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6" />
            <CardTitle>Versiones de Producción</CardTitle>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Versión
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
                  <TableHead>BOM</TableHead>
                  <TableHead>Routing</TableHead>
                  <TableHead>Predeterminada</TableHead>
                  <TableHead>Fecha Efectiva</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productionVersions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No hay versiones de producción
                    </TableCell>
                  </TableRow>
                ) : (
                  productionVersions.map((version) => (
                    <TableRow key={version._id}>
                      <TableCell className="font-medium">
                        {version.versionName}
                        {version.isDefault && <Star className="inline h-4 w-4 ml-2 text-yellow-500 fill-current" />}
                      </TableCell>
                      <TableCell>
                        {version.product?.name || version.productId}
                        {version.product?.sku && <div className="text-xs text-muted-foreground">{version.product.sku}</div>}
                      </TableCell>
                      <TableCell>
                        {version.bom?.version || '-'}
                      </TableCell>
                      <TableCell>
                        {version.routing?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {version.isDefault ? (
                          <Badge className="bg-yellow-500">
                            <Star className="h-3 w-3 mr-1" />
                            Predeterminada
                          </Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDate(version.effectiveDate)}</TableCell>
                      <TableCell>
                        {version.isActive ? (
                          <Badge className="bg-green-500">Activa</Badge>
                        ) : (
                          <Badge variant="outline">Inactiva</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(version)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleDelete(version._id)}>
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

      <ProductionVersionDialog
        open={dialogOpen}
        version={selectedVersion}
        onClose={() => {
          setDialogOpen(false);
          setSelectedVersion(null);
        }}
        onSave={handleSave}
      />
    </>
  );
}
