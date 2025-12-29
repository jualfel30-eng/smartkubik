import { useState } from 'react';
import { useCalendars } from '@/hooks/use-calendars';
import { CalendarDialog } from './CalendarDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Calendar,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  Eye,
  Globe,
  Lock,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { toast } from 'sonner';

export function CalendarManagement() {
  const {
    calendars,
    loading,
    createCalendar,
    updateCalendar,
    deleteCalendar,
    syncCalendarWithGoogle,
    setupBidirectionalSync,
    syncFromGoogle,
    refetch,
  } = useCalendars();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [calendarToDelete, setCalendarToDelete] = useState(null);

  const handleCreateOrUpdate = async (calendarData) => {
    try {
      if (selectedCalendar) {
        await updateCalendar(selectedCalendar.id, calendarData);
      } else {
        await createCalendar(calendarData);
      }
      setDialogOpen(false);
      setSelectedCalendar(null);
    } catch (error) {
      console.error('Error saving calendar:', error);
    }
  };

  const handleEdit = (calendar) => {
    setSelectedCalendar(calendar);
    setDialogOpen(true);
  };

  const handleDeleteClick = (calendar) => {
    setCalendarToDelete(calendar);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (calendarToDelete) {
      try {
        await deleteCalendar(calendarToDelete.id);
        setDeleteDialogOpen(false);
        setCalendarToDelete(null);
      } catch (error) {
        console.error('Error deleting calendar:', error);
      }
    }
  };

  const handleSyncWithGoogle = async (calendar) => {
    try {
      await syncCalendarWithGoogle(calendar.id);
    } catch (error) {
      console.error('Error syncing calendar:', error);
    }
  };

  const getCategoryBadge = (category) => {
    const categories = {
      general: { label: 'General', variant: 'default' },
      sales: { label: 'Ventas', variant: 'destructive' },
      production: { label: 'Producción', variant: 'secondary' },
      hr: { label: 'RRHH', variant: 'outline' },
      finance: { label: 'Finanzas', variant: 'default' },
      custom: { label: 'Personalizado', variant: 'secondary' },
    };
    const cat = categories[category] || categories.general;
    return <Badge variant={cat.variant}>{cat.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Calendarios</h2>
          <p className="text-muted-foreground">
            Administra los calendarios de tu organización con permisos por roles
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refetch} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button onClick={() => {
            setSelectedCalendar(null);
            setDialogOpen(true);
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Calendario
          </Button>
        </div>
      </div>

      {/* Lista de calendarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {calendars.map((calendar) => (
          <Card key={calendar.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: calendar.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">{calendar.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      {calendar.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          Por defecto
                        </Badge>
                      )}
                      {getCategoryBadge(calendar.category)}
                    </CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Descripción */}
              {calendar.description && (
                <p className="text-sm text-gray-600 line-clamp-2">
                  {calendar.description}
                </p>
              )}

              {/* Estadísticas */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{calendar.eventCount || 0} eventos</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4" />
                  <span>{calendar.allowedRoles?.length || 0} roles</span>
                </div>
              </div>

              {/* Visibilidad */}
              <div className="flex items-center gap-2 text-sm">
                {calendar.visibility?.public ? (
                  <>
                    <Globe className="w-4 h-4 text-green-600" />
                    <span className="text-green-600">Público</span>
                  </>
                ) : calendar.visibility?.shareWithTenant ? (
                  <>
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-600">Compartido</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-600">Privado</span>
                  </>
                )}
              </div>

              {/* Google Sync Status */}
              {calendar.googleSync?.enabled ? (
                <div className="flex items-center gap-2 text-sm">
                  <Cloud className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">
                    {calendar.googleSync.syncStatus === 'active'
                      ? 'Sincronizado con Google'
                      : 'Error de sincronización'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <CloudOff className="w-4 h-4" />
                  <span>No sincronizado</span>
                </div>
              )}

              {/* Acciones */}
              <div className="flex flex-col gap-2 pt-2 border-t">
                <div className="flex gap-2">
                  {calendar.canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(calendar)}
                      className="flex-1"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Editar
                    </Button>
                  )}

                  {!calendar.googleSync?.enabled && calendar.canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSyncWithGoogle(calendar)}
                      className="flex-1"
                    >
                      <Cloud className="w-4 h-4 mr-1" />
                      Sincronizar
                    </Button>
                  )}

                  {calendar.canDelete && !calendar.isDefault && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(calendar)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                {/* Sincronización bidireccional (solo si ya está sincronizado) */}
                {calendar.googleSync?.enabled && calendar.canEdit && (
                  <div className="flex flex-col gap-1 pt-1 border-t">
                    {!calendar.googleSync?.watchChannel && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={async () => {
                          try {
                            await setupBidirectionalSync(calendar.id);
                          } catch (error) {
                            // El error ya se muestra en el hook
                          }
                        }}
                        className="w-full text-xs"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Activar Sync Bidireccional
                      </Button>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        try {
                          await syncFromGoogle(calendar.id);
                        } catch (error) {
                          // El error ya se muestra en el hook
                        }
                      }}
                      className="w-full text-xs"
                    >
                      <Cloud className="w-3 h-3 mr-1" />
                      Importar desde Google
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty state */}
      {calendars.length === 0 && !loading && (
        <Card className="p-12">
          <div className="text-center space-y-4">
            <Calendar className="w-16 h-16 mx-auto text-gray-400" />
            <div>
              <h3 className="text-lg font-semibold">No hay calendarios</h3>
              <p className="text-sm text-gray-600 mt-2">
                Crea tu primer calendario para organizar tus eventos
              </p>
            </div>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Crear Primer Calendario
            </Button>
          </div>
        </Card>
      )}

      {/* Diálogo de crear/editar */}
      <CalendarDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        calendar={selectedCalendar}
        onSave={handleCreateOrUpdate}
      />

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el calendario "{calendarToDelete?.name}" y
              todos sus eventos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
