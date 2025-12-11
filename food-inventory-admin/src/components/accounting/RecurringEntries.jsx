import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Combobox } from '@/components/ui/combobox';
import {
  Plus,
  MoreVertical,
  PlayCircle,
  Trash2,
  Loader2,
  CalendarClock,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  fetchRecurringEntries,
  fetchChartOfAccounts,
  createRecurringEntry,
  executeRecurringEntry,
  toggleRecurringEntryActive,
  deleteRecurringEntry,
} from '../../lib/api';
import { format } from 'date-fns';

const RecurringEntries = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    frequency: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    dayOfMonth: 1,
    dayOfWeek: 1,
    lines: [
      { accountCode: '', description: '', debit: 0, credit: 0 },
      { accountCode: '', description: '', debit: 0, credit: 0 },
    ],
    notes: '',
    isActive: true,
  });

  useEffect(() => {
    loadEntries();
    loadAccounts();
  }, []);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const data = await fetchRecurringEntries();
      setEntries(data);
    } catch (error) {
      console.error('Error loading recurring entries:', error);
      toast.error('Error al cargar los asientos recurrentes');
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await fetchChartOfAccounts();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setAccounts(list);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Error al cargar el catálogo de cuentas');
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      dayOfMonth: 1,
      dayOfWeek: 1,
      lines: [
        { accountCode: '', description: '', debit: 0, credit: 0 },
        { accountCode: '', description: '', debit: 0, credit: 0 },
      ],
      notes: '',
      isActive: true,
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setFormData((prev) => ({ ...prev, lines: newLines }));
  };

  const handleAddLine = () => {
    setFormData((prev) => ({
      ...prev,
      lines: [...prev.lines, { accountCode: '', description: '', debit: 0, credit: 0 }],
    }));
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 2) {
      toast.warning('Debe haber al menos 2 líneas en el asiento');
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, lines: newLines }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.description) {
      toast.error('Debe completar el nombre y descripción');
      return false;
    }

    if (formData.lines.length < 2) {
      toast.error('Debe haber al menos 2 líneas en el asiento');
      return false;
    }

    for (const line of formData.lines) {
      if (!line.accountCode) {
        toast.error('Todas las líneas deben tener una cuenta seleccionada');
        return false;
      }
    }

    const totalDebits = formData.lines.reduce((sum, line) => sum + Number(line.debit), 0);
    const totalCredits = formData.lines.reduce((sum, line) => sum + Number(line.credit), 0);

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
      toast.error('El total de débitos debe ser igual al total de créditos');
      return false;
    }

    return true;
  };

  const handleCreateEntry = async () => {
    if (!validateForm()) return;

    try {
      const payload = {
        ...formData,
        lines: formData.lines.map((line) => {
          const account = accounts.find((acc) => acc.code === line.accountCode);
          return {
            accountId: account?._id,
            description: line.description,
            debit: Number(line.debit),
            credit: Number(line.credit),
          };
        }),
      };

      await createRecurringEntry(payload);
      toast.success('Asiento recurrente creado exitosamente');
      handleCloseDialog();
      loadEntries();
    } catch (error) {
      console.error('Error creating recurring entry:', error);
      toast.error(error.message || 'Error al crear el asiento recurrente');
    }
  };

  const handleExecuteEntry = async (entryId) => {
    try {
      await executeRecurringEntry(entryId);
      toast.success('Asiento recurrente ejecutado exitosamente');
      loadEntries();
    } catch (error) {
      console.error('Error executing entry:', error);
      toast.error(error.message || 'Error al ejecutar el asiento recurrente');
    }
  };

  const handleToggleActive = async (entry) => {
    try {
      await toggleRecurringEntryActive(entry._id);
      toast.success(
        `Asiento ${entry.isActive ? 'desactivado' : 'activado'} exitosamente`,
      );
      loadEntries();
    } catch (error) {
      console.error('Error toggling entry:', error);
      toast.error(error.message || 'Error al cambiar el estado del asiento');
    }
  };

  const handleDeleteEntry = async (entryId) => {
    try {
      await deleteRecurringEntry(entryId);
      toast.success('Asiento recurrente eliminado exitosamente');
      loadEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast.error(error.message || 'Error al eliminar el asiento recurrente');
    }
  };

  const getFrequencyLabel = (frequency) => {
    const labels = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      yearly: 'Anual',
    };
    return labels[frequency] || frequency;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  const totalDebits = formData.lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
  const totalCredits = formData.lines.reduce((sum, line) => sum + Number(line.credit || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  // Prepare account options for Combobox
  const accountOptions = accounts.map((acc) => ({
    value: acc.code,
    label: `${acc.code} - ${acc.name}`,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Asientos Recurrentes</h2>
          <p className="text-muted-foreground">
            Gestiona asientos contables que se repiten periódicamente
          </p>
        </div>
        <Button onClick={handleOpenDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Asiento Recurrente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Asientos Recurrentes</CardTitle>
          <CardDescription>
            Asientos que se ejecutan automáticamente según la frecuencia configurada
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
              <p className="mt-4 text-muted-foreground">Cargando asientos recurrentes...</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Inicio</TableHead>
                  <TableHead>Próxima Ejecución</TableHead>
                  <TableHead>Ejecutado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry._id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{entry.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getFrequencyLabel(entry.frequency)}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(entry.startDate)}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDate(entry.nextExecutionDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.executionCount} veces</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={entry.isActive ? 'default' : 'outline'}>
                        {entry.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleExecuteEntry(entry._id)}>
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Ejecutar Ahora
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(entry)}>
                            {entry.isActive ? 'Desactivar' : 'Activar'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              if (
                                window.confirm(
                                  '¿Está seguro de que desea eliminar este asiento recurrente?',
                                )
                              ) {
                                handleDeleteEntry(entry._id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}

                {entries.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/50" />
                      <p className="mt-4 text-muted-foreground">
                        No hay asientos recurrentes creados
                      </p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo Asiento Recurrente</DialogTitle>
            <DialogDescription>
              Configure el asiento contable que se ejecutará automáticamente
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Basic Info */}
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre del Asiento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleFormChange('name', e.target.value)}
                placeholder="ej: Depreciación Mensual"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleFormChange('description', e.target.value)}
                placeholder="Descripción que aparecerá en el asiento contable"
              />
            </div>

            {/* Frequency Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="frequency">Frecuencia *</Label>
                <Select value={formData.frequency} onValueChange={(value) => handleFormChange('frequency', value)}>
                  <SelectTrigger id="frequency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="startDate">Fecha Inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleFormChange('startDate', e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="endDate">Fecha Fin (Opcional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleFormChange('endDate', e.target.value)}
                />
              </div>
            </div>

            {/* Day of Month/Week */}
            {formData.frequency === 'monthly' && (
              <div className="grid gap-2">
                <Label htmlFor="dayOfMonth">Día del Mes (1-28)</Label>
                <Input
                  id="dayOfMonth"
                  type="number"
                  min={1}
                  max={28}
                  value={formData.dayOfMonth}
                  onChange={(e) => handleFormChange('dayOfMonth', parseInt(e.target.value))}
                />
                <p className="text-sm text-muted-foreground">
                  Día del mes en que se ejecutará el asiento
                </p>
              </div>
            )}

            {formData.frequency === 'weekly' && (
              <div className="grid gap-2">
                <Label htmlFor="dayOfWeek">Día de la Semana</Label>
                <Select value={String(formData.dayOfWeek)} onValueChange={(value) => handleFormChange('dayOfWeek', parseInt(value))}>
                  <SelectTrigger id="dayOfWeek">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Domingo</SelectItem>
                    <SelectItem value="1">Lunes</SelectItem>
                    <SelectItem value="2">Martes</SelectItem>
                    <SelectItem value="3">Miércoles</SelectItem>
                    <SelectItem value="4">Jueves</SelectItem>
                    <SelectItem value="5">Viernes</SelectItem>
                    <SelectItem value="6">Sábado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Lines */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Líneas del Asiento</Label>
              {formData.lines.map((line, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <Label htmlFor={`account-${index}`} className="text-xs">
                        Cuenta *
                      </Label>
                      <Combobox
                        options={accountOptions}
                        value={line.accountCode}
                        onChange={(value) => handleLineChange(index, 'accountCode', value)}
                        placeholder="Seleccionar cuenta..."
                        searchPlaceholder="Buscar cuenta..."
                        emptyPlaceholder="No se encontraron cuentas"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <Label htmlFor={`desc-${index}`} className="text-xs">
                        Descripción
                      </Label>
                      <Input
                        id={`desc-${index}`}
                        value={line.description}
                        onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                        placeholder="Detalle"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`debit-${index}`} className="text-xs">
                        Débito
                      </Label>
                      <Input
                        id={`debit-${index}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.debit}
                        onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label htmlFor={`credit-${index}`} className="text-xs">
                        Crédito
                      </Label>
                      <Input
                        id={`credit-${index}`}
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.credit}
                        onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLine(index)}
                      disabled={formData.lines.length <= 2}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={handleAddLine} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Línea
              </Button>
            </div>

            {/* Totals */}
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Débitos:</span>
                <span className="font-mono">Bs. {totalDebits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium">Total Créditos:</span>
                <span className="font-mono">Bs. {totalCredits.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm pt-2 border-t">
                <span className="font-semibold">Estado:</span>
                <span className={isBalanced ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-destructive font-semibold'}>
                  {isBalanced ? '✓ Balanceado' : '⚠ No balanceado'}
                </span>
              </div>
            </div>

            {/* Active Switch */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleFormChange('isActive', checked)}
              />
              <Label htmlFor="isActive">Activar inmediatamente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleCreateEntry} disabled={!isBalanced}>
              Crear Asiento Recurrente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecurringEntries;
