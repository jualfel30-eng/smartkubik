import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog.jsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog.jsx';
import { Save, FolderOpen, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { useSavedViews } from '@/hooks/use-saved-views';

/**
 * Component for managing saved analytics views (Phase 3)
 * Allows saving, loading, and deleting custom metric configurations
 */
export function SavedViewsManager({
  selectedMetrics,
  selectedYears,
  selectedMonths,
  onLoadView,
}) {
  const { views, templates, loading, createView, deleteView } = useSavedViews();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState('');
  const [newViewDescription, setNewViewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;

    setSaving(true);
    const result = await createView({
      name: newViewName.trim(),
      description: newViewDescription.trim() || undefined,
      metricIds: selectedMetrics,
      periodConfig: {
        years: [...selectedYears],
        months: [...selectedMonths],
      },
    });

    setSaving(false);

    if (result.success) {
      setNewViewName('');
      setNewViewDescription('');
      setSaveDialogOpen(false);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  const handleLoadView = (view) => {
    if (onLoadView) {
      onLoadView({
        metrics: view.metricIds || [],
        years: view.periodConfig?.years || [new Date().getFullYear()],
        months: view.periodConfig?.months || [new Date().getMonth()],
      });
      setLoadDialogOpen(false);
    }
  };

  const handleDeleteView = async (id) => {
    const result = await deleteView(id);
    if (!result.success) {
      alert(`Error: ${result.error}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Save Current View */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedMetrics.length === 0}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar Vista
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar Vista Personalizada</DialogTitle>
            <DialogDescription>
              Guarda la configuración actual de métricas y período para acceso rápido.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre</label>
              <Input
                placeholder="Ej: Análisis Mensual Restaurante"
                value={newViewName}
                onChange={(e) => setNewViewName(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Descripción (opcional)</label>
              <Input
                placeholder="Ej: Vista para reportes mensuales del área de cocina"
                value={newViewDescription}
                onChange={(e) => setNewViewDescription(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="p-3 bg-muted rounded-md text-sm">
              <p className="font-medium mb-1">Vista incluirá:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• {selectedMetrics.length} métricas seleccionadas</li>
                <li>• {selectedYears.size} año(s)</li>
                <li>• {selectedMonths.size} mes(es)</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={!newViewName.trim() || saving}
            >
              {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Load View */}
      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderOpen className="h-3.5 w-3.5" />
            Cargar Vista
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Vistas Guardadas y Templates</DialogTitle>
            <DialogDescription>
              Carga una vista guardada o usa un template pre-configurado.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Templates Section */}
            {templates.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h4 className="text-sm font-semibold">Templates</h4>
                </div>
                <div className="space-y-2">
                  {templates.map((template) => (
                    <Card
                      key={template._id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleLoadView(template)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{template.name}</p>
                            {template.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {template.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {template.metricIds?.length || 0} métricas
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Saved Views Section */}
            {views.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Mis Vistas</h4>
                <div className="space-y-2">
                  {views.map((view) => (
                    <Card key={view._id} className="hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => handleLoadView(view)}
                          >
                            <p className="font-medium text-sm">{view.name}</p>
                            {view.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {view.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {view.metricIds?.length || 0} métricas •{' '}
                              {view.periodConfig?.years?.length || 0} año(s) •{' '}
                              {view.periodConfig?.months?.length || 0} mes(es)
                            </p>
                          </div>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar vista?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. La vista "{view.name}" será eliminada permanentemente.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteView(view._id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && views.length === 0 && templates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay vistas guardadas aún</p>
                <p className="text-xs mt-1">
                  Selecciona métricas y guarda tu primera vista personalizada
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLoadDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
