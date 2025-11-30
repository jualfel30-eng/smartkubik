import React, { useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { UnitConversionDialog } from './UnitConversionDialog';
import { useUnitConversions } from '../hooks/useUnitConversions';
import { toast } from 'sonner';
import { Settings2, Plus, Pencil, Trash2, ArrowRightLeft } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

/**
 * Componente para gestionar las conversiones de unidades de un producto
 */
export const UnitConversionManager = ({ product }) => {
  const {
    getConfigByProductId,
    createConfig,
    updateConfig,
    deleteConfig,
  } = useUnitConversions();

  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Cargar configuración del producto
  const loadConfig = useCallback(async () => {
    if (!product?._id) return;

    setLoading(true);
    try {
      const data = await getConfigByProductId(product._id);
      setConfig(data);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setLoading(false);
    }
  }, [getConfigByProductId, product?._id]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Guardar configuración (crear o actualizar)
  const handleSave = async (configData) => {
    if (config) {
      // Actualizar
      await updateConfig(config._id, configData);
    } else {
      // Crear
      await createConfig(configData);
    }
    await loadConfig();
  };

  // Eliminar configuración
  const handleDelete = async () => {
    if (!config) return;

    try {
      await deleteConfig(config._id);
      setConfig(null);
      setDeleteDialogOpen(false);
      toast.success('Configuración eliminada');
    } catch (error) {
      console.error('Error al eliminar configuración:', error);
      toast.error('Error al eliminar configuración');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return (
      <>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Unidades de Medida
            </CardTitle>
            <CardDescription>
              Este producto no tiene configuración de unidades
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Configurar Unidades
            </Button>
          </CardContent>
        </Card>

        <UnitConversionDialog
          isOpen={dialogOpen}
          onClose={() => setDialogOpen(false)}
          product={product}
          existingConfig={null}
          onSave={handleSave}
        />
      </>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Unidades de Medida
              </CardTitle>
              <Badge variant={config.isActive ? 'default' : 'secondary'}>
                {config.isActive ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Editar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Unidad Base */}
          <div>
            <h4 className="text-sm font-semibold mb-2">Unidad Base</h4>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {config.baseUnit} ({config.baseUnitAbbr})
              </Badge>
            </div>
          </div>

          {/* Reglas de Conversión */}
          {config.conversions && config.conversions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-2">Reglas de Conversión</h4>
              <div className="space-y-2">
                {config.conversions
                  .filter(c => c.isActive)
                  .map((conv, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">
                          {conv.unit} ({conv.abbreviation})
                        </Badge>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          1 {conv.unit} = {conv.factor} {config.baseUnit}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {conv.unitType === 'purchase' && 'Compra'}
                          {conv.unitType === 'stock' && 'Almacenamiento'}
                          {conv.unitType === 'consumption' && 'Consumo'}
                        </Badge>
                        {conv.isDefault && (
                          <Badge variant="default" className="text-xs">
                            Por defecto
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Unidades por Defecto */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Compra</p>
              <p className="text-sm font-medium">
                {config.defaultPurchaseUnit || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Almacenamiento</p>
              <p className="text-sm font-medium">
                {config.defaultStockUnit || '-'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Consumo</p>
              <p className="text-sm font-medium">
                {config.defaultConsumptionUnit || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de Edición */}
      <UnitConversionDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        product={product}
        existingConfig={config}
        onSave={handleSave}
      />

      {/* Diálogo de Confirmación de Eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar configuración?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará la configuración de
              unidades de medida para este producto.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
