import { useState, useEffect } from 'react';
import { useConfirm } from '@/hooks/use-confirm';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Plus, Edit, Trash2, List, Calendar } from 'lucide-react';
import { usePriceLists } from '@/hooks/usePriceLists';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const PRICE_LIST_TYPES = [
  { value: 'standard', label: 'Estándar', color: 'bg-info/10 text-blue-800' },
  { value: 'wholesale', label: 'Mayorista', color: 'bg-purple-100 text-purple-800' },
  { value: 'retail', label: 'Retail', color: 'bg-success/10 text-green-800' },
  { value: 'promotional', label: 'Promocional', color: 'bg-destructive/10 text-red-800' },
  { value: 'seasonal', label: 'Temporal', color: 'bg-warning/10 text-orange-800' },
  { value: 'custom', label: 'Personalizado', color: 'bg-gray-100 text-gray-800' },
];

const PRIORITY_LEVELS = [
  { value: 1, label: 'Muy Baja', description: 'Menor prioridad - se usa solo si no hay otras listas' },
  { value: 3, label: 'Baja', description: 'Prioridad baja - para precios de respaldo' },
  { value: 5, label: 'Normal', description: 'Prioridad estándar - para precios regulares' },
  { value: 7, label: 'Alta', description: 'Prioridad alta - para segmentos especiales' },
  { value: 9, label: 'Muy Alta', description: 'Prioridad muy alta - para clientes VIP' },
  { value: 10, label: 'Crítica', description: 'Máxima prioridad - sobrescribe todas las demás' },
];

/**
 * Componente principal para gestionar listas de precios
 */
export function PriceListsManager({ trigger }) {
  const [ConfirmDialog, confirm] = useConfirm();
  const {
    priceLists,
    loading,
    loadPriceLists,
    createPriceList,
    updatePriceList,
    deletePriceList,
  } = usePriceLists();

  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPriceList, setEditingPriceList] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'standard',
    isActive: true,
    priority: 5,
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (open) {
      loadPriceLists();
    }
  }, [open, loadPriceLists]);

  const handleCreate = () => {
    setEditingPriceList(null);
    setFormData({
      name: '',
      description: '',
      type: 'standard',
      isActive: true,
      priority: 5,
      startDate: '',
      endDate: '',
    });
    setDialogOpen(true);
  };

  const handleEdit = (priceList) => {
    setEditingPriceList(priceList);
    setFormData({
      name: priceList.name,
      description: priceList.description || '',
      type: priceList.type,
      isActive: priceList.isActive,
      priority: priceList.priority || 5,
      startDate: priceList.startDate ? format(new Date(priceList.startDate), 'yyyy-MM-dd') : '',
      endDate: priceList.endDate ? format(new Date(priceList.endDate), 'yyyy-MM-dd') : '',
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        startDate: formData.startDate || undefined,
        endDate: formData.endDate || undefined,
      };

      if (editingPriceList) {
        await updatePriceList(editingPriceList._id, data);
      } else {
        await createPriceList(data);
      }
      setDialogOpen(false);
      loadPriceLists();
    } catch (error) {
      console.error('Error saving price list:', error);
      alert(error.message || 'Error al guardar la lista de precios');
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: `¿Eliminar la lista "${name}"?`,
      description: 'Esto eliminará todos los precios personalizados asociados.',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deletePriceList(id);
    } catch (error) {
      console.error('Error deleting price list:', error);
      alert(error.message || 'Error al eliminar la lista de precios');
    }
  };

  const getTypeConfig = (type) => {
    return PRICE_LIST_TYPES.find((t) => t.value === type) || PRICE_LIST_TYPES[0];
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <List className="h-5 w-5" />
              Gestión de Listas de Precios
            </DialogTitle>
            <DialogDescription>
              Crea y administra diferentes listas de precios para segmentar tu catálogo
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button onClick={handleCreate} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Nueva Lista de Precios
            </Button>

            {loading && priceLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Cargando...</div>
            ) : priceLists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No hay listas de precios creadas
              </div>
            ) : (
              <div className="space-y-3">
                {priceLists.map((priceList) => {
                  const typeConfig = getTypeConfig(priceList.type);
                  return (
                    <Card key={priceList._id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{priceList.name}</h3>
                              <Badge className={typeConfig.color}>{typeConfig.label}</Badge>
                              {!priceList.isActive && (
                                <Badge variant="outline" className="text-xs">
                                  Inactiva
                                </Badge>
                              )}
                              {priceList.priority > 0 && (
                                <Badge variant="outline" className="text-xs">
                                  Prioridad: {priceList.priority}
                                </Badge>
                              )}
                            </div>
                            {priceList.description && (
                              <p className="text-sm text-muted-foreground">{priceList.description}</p>
                            )}
                            {(priceList.startDate || priceList.endDate) && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {priceList.startDate && (
                                  <span>
                                    Desde:{' '}
                                    {format(new Date(priceList.startDate), "d 'de' MMMM, yyyy", {
                                      locale: es,
                                    })}
                                  </span>
                                )}
                                {priceList.endDate && (
                                  <span>
                                    Hasta:{' '}
                                    {format(new Date(priceList.endDate), "d 'de' MMMM, yyyy", {
                                      locale: es,
                                    })}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(priceList)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(priceList._id, priceList.name)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para crear/editar lista */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingPriceList ? 'Editar Lista de Precios' : 'Nueva Lista de Precios'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Precio Mayorista"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción opcional"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Tipo *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_LIST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicio (opcional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha Fin (opcional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Nivel de Prioridad</Label>
              <Select
                value={formData.priority.toString()}
                onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value.toString()}>
                      {level.label} ({level.value})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs space-y-1">
                <p className="text-muted-foreground">
                  {PRIORITY_LEVELS.find(l => l.value === formData.priority)?.description}
                </p>
                <p className="text-muted-foreground bg-info-muted p-2 rounded">
                  💡 <strong>¿Qué significa?</strong> Cuando un producto está en varias listas, se usa el precio de la lista con mayor prioridad.
                  <br />
                  <strong>Ejemplo:</strong> "Black Friday" (Crítica) sobrescribe "Precio Mayorista" (Normal).
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Lista Activa</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {editingPriceList ? 'Guardar Cambios' : 'Crear Lista'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Trigger personalizable */}
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <List className="h-4 w-4 mr-2" />
          Gestionar Listas de Precios
        </Button>
      )}
      <ConfirmDialog />
    </>
  );
}
