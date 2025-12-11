import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import {
  Plus,
  MoreVertical,
  Lock,
  LockOpen,
  RotateCcw,
  Trash2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchAccountingPeriods,
  createAccountingPeriod,
  closeAccountingPeriod,
  reopenAccountingPeriod,
  lockAccountingPeriod,
  unlockAccountingPeriod,
  deleteAccountingPeriod,
} from '../../lib/api';
import { format } from 'date-fns';

export default function AccountingPeriods() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    fiscalYear: new Date().getFullYear(),
    notes: '',
  });
  const [closingNotes, setClosingNotes] = useState('');

  useEffect(() => {
    loadPeriods();
  }, []);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await fetchAccountingPeriods();
      setPeriods(data);
    } catch (error) {
      console.error('Error loading periods:', error);
      toast.error('Error al cargar los períodos contables');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      fiscalYear: new Date().getFullYear(),
      notes: '',
    });
    setOpenDialog(true);
  };

  const handleCreatePeriod = async () => {
    try {
      await createAccountingPeriod(formData);
      toast.success('Período contable creado exitosamente');
      setOpenDialog(false);
      loadPeriods();
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error(error.message || 'Error al crear el período contable');
    }
  };

  const handleClosePeriod = async () => {
    if (!selectedPeriod) return;

    try {
      await closeAccountingPeriod(selectedPeriod._id, closingNotes);
      toast.success('Período contable cerrado exitosamente');
      setOpenCloseDialog(false);
      setClosingNotes('');
      setSelectedPeriod(null);
      loadPeriods();
    } catch (error) {
      console.error('Error closing period:', error);
      toast.error(error.message || 'Error al cerrar el período contable');
    }
  };

  const handleReopenPeriod = async () => {
    if (!selectedPeriod) return;

    try {
      await reopenAccountingPeriod(selectedPeriod._id);
      toast.success('Período contable reabierto exitosamente');
      setReopenDialogOpen(false);
      setSelectedPeriod(null);
      loadPeriods();
    } catch (error) {
      console.error('Error reopening period:', error);
      toast.error(error.message || 'Error al reabrir el período contable');
    }
  };

  const handleLockPeriod = async () => {
    if (!selectedPeriod) return;

    try {
      await lockAccountingPeriod(selectedPeriod._id);
      toast.success('Período contable bloqueado exitosamente');
      setLockDialogOpen(false);
      setSelectedPeriod(null);
      loadPeriods();
    } catch (error) {
      console.error('Error locking period:', error);
      toast.error(error.message || 'Error al bloquear el período contable');
    }
  };

  const handleUnlockPeriod = async () => {
    if (!selectedPeriod) return;

    try {
      await unlockAccountingPeriod(selectedPeriod._id);
      toast.success('Período contable desbloqueado exitosamente');
      setSelectedPeriod(null);
      loadPeriods();
    } catch (error) {
      console.error('Error unlocking period:', error);
      toast.error(error.message || 'Error al desbloquear el período contable');
    }
  };

  const handleDeletePeriod = async () => {
    if (!selectedPeriod) return;

    try {
      await deleteAccountingPeriod(selectedPeriod._id);
      toast.success('Período contable eliminado exitosamente');
      setDeleteDialogOpen(false);
      setSelectedPeriod(null);
      loadPeriods();
    } catch (error) {
      console.error('Error deleting period:', error);
      toast.error(error.message || 'Error al eliminar el período contable');
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: 'default', label: 'Abierto' },
      closed: { variant: 'secondary', label: 'Cerrado' },
      locked: { variant: 'destructive', label: 'Bloqueado' },
    };
    const config = variants[status] || { variant: 'outline', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '-';
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Períodos Contables</h2>
            <p className="text-muted-foreground">
              Gestiona los períodos contables y sus cierres
            </p>
          </div>
          <Button onClick={handleOpenDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Período
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Año Fiscal</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead className="text-right">Gastos</TableHead>
                    <TableHead className="text-right">Utilidad Neta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No hay períodos contables creados
                      </TableCell>
                    </TableRow>
                  ) : (
                    periods.map((period) => (
                      <TableRow key={period._id}>
                        <TableCell className="font-medium">{period.name}</TableCell>
                        <TableCell>{period.fiscalYear}</TableCell>
                        <TableCell>{formatDate(period.startDate)}</TableCell>
                        <TableCell>{formatDate(period.endDate)}</TableCell>
                        <TableCell>{getStatusBadge(period.status)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(period.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(period.totalExpenses)}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={period.netIncome >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {formatCurrency(period.netIncome)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {period.status === 'open' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPeriod(period);
                                    setOpenCloseDialog(true);
                                  }}
                                >
                                  Cerrar Período
                                </DropdownMenuItem>
                              )}
                              {period.status === 'closed' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPeriod(period);
                                      setReopenDialogOpen(true);
                                    }}
                                  >
                                    <RotateCcw className="mr-2 h-4 w-4" />
                                    Reabrir Período
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedPeriod(period);
                                      setLockDialogOpen(true);
                                    }}
                                  >
                                    <Lock className="mr-2 h-4 w-4" />
                                    Bloquear Período
                                  </DropdownMenuItem>
                                </>
                              )}
                              {period.status === 'locked' && (
                                <DropdownMenuItem onClick={() => {
                                  setSelectedPeriod(period);
                                  handleUnlockPeriod();
                                }}>
                                  <LockOpen className="mr-2 h-4 w-4" />
                                  Desbloquear Período
                                </DropdownMenuItem>
                              )}
                              {period.status === 'open' && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedPeriod(period);
                                    setDeleteDialogOpen(true);
                                  }}
                                  className="text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Eliminar Período
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Period Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Período Contable</DialogTitle>
            <DialogDescription>
              Crea un nuevo período contable para registrar transacciones
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Período *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ej: Enero 2024"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fiscalYear">Año Fiscal *</Label>
                <Input
                  id="fiscalYear"
                  type="number"
                  value={formData.fiscalYear}
                  onChange={(e) => setFormData({ ...formData, fiscalYear: parseInt(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Fecha Inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Fecha Fin *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notas</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Notas opcionales"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreatePeriod}>Crear Período</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Period Dialog */}
      <Dialog open={openCloseDialog} onOpenChange={setOpenCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Período Contable</DialogTitle>
            <DialogDescription>
              Al cerrar el período se calculará automáticamente la utilidad neta y se generará un asiento de cierre.
            </DialogDescription>
          </DialogHeader>
          {selectedPeriod && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
                <p className="text-sm">
                  <strong>Período:</strong> {selectedPeriod.name}
                </p>
                <p className="text-sm">
                  <strong>Fechas:</strong> {formatDate(selectedPeriod.startDate)} - {formatDate(selectedPeriod.endDate)}
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="closingNotes">Notas de Cierre (Opcional)</Label>
                <Input
                  id="closingNotes"
                  value={closingNotes}
                  onChange={(e) => setClosingNotes(e.target.value)}
                  placeholder="Observaciones sobre el cierre del período..."
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCloseDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleClosePeriod} variant="default">
              Cerrar Período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reopen Confirmation Dialog */}
      <AlertDialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Reabrir período contable?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará el asiento de cierre. ¿Está seguro de que desea continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopenPeriod}>Reabrir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Bloquear período contable?</AlertDialogTitle>
            <AlertDialogDescription>
              No se podrán hacer cambios hasta desbloquearlo. ¿Está seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleLockPeriod}>Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar período contable?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. ¿Está seguro?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePeriod} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
