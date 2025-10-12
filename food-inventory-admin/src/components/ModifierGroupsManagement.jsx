import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { fetchApi } from '@/lib/api';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Layers, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle 
} from 'lucide-react';

const initialFormState = {
  _id: null,
  name: '',
  description: '',
  selectionType: 'single',
  minSelections: 0,
  maxSelections: '',
  required: true,
  available: true,
  selectedProducts: [],
  modifiers: [],
};

export default function ModifierGroupsManagement() {
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formState, setFormState] = useState(initialFormState);
  const [isEditMode, setIsEditMode] = useState(false);
  const originalModifiersRef = useRef([]);

  const loadModifierGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [groupsResponse, productsResponse] = await Promise.all([
        fetchApi('/modifier-groups'),
        fetchApi('/products'),
      ]);

      setGroups(groupsResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (err) {
      console.error('Error loading modifier groups:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadModifierGroups();
  }, [loadModifierGroups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter((group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groups, searchTerm]);

  const resetFormState = () => {
    setFormState(initialFormState);
    originalModifiersRef.current = [];
  };

  const handleOpenCreate = () => {
    resetFormState();
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = async (group) => {
    try {
      setIsEditMode(true);
      setIsSaving(true);
      const modifiersResponse = await fetchApi(`/modifiers/by-group/${group._id}`);

      setFormState({
        _id: group._id,
        name: group.name || '',
        description: group.description || '',
        selectionType: group.selectionType || 'single',
        minSelections: group.minSelections ?? 0,
        maxSelections: typeof group.maxSelections === 'number' ? group.maxSelections : '',
        required: group.required ?? false,
        available: group.available ?? true,
        selectedProducts: group.applicableProducts?.map(String) || [],
        modifiers: (modifiersResponse.data || []).map((modifier) => ({
          _id: modifier._id,
          name: modifier.name,
          description: modifier.description || '',
          priceAdjustment: modifier.priceAdjustment ?? 0,
        })),
      });

      originalModifiersRef.current = (modifiersResponse.data || []).map((modifier) => ({
        _id: modifier._id,
        name: modifier.name,
        description: modifier.description || '',
        priceAdjustment: modifier.priceAdjustment ?? 0,
      }));

      setIsDialogOpen(true);
    } catch (err) {
      console.error('Error loading group modifiers:', err);
      alert(`Error al cargar modificadores: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDialogClose = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setTimeout(resetFormState, 200);
  };

  const updateFormField = (field, value) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleModifierChange = (index, field, value) => {
    setFormState((prev) => {
      const modifiers = [...prev.modifiers];
      modifiers[index] = {
        ...modifiers[index],
        [field]: field === 'priceAdjustment' ? Number(value) : value,
      };
      return { ...prev, modifiers };
    });
  };

  const handleAddModifier = () => {
    setFormState((prev) => ({
      ...prev,
      modifiers: [
        ...prev.modifiers,
        { _id: null, name: '', description: '', priceAdjustment: 0 },
      ],
    }));
  };

  const handleRemoveModifier = (index) => {
    setFormState((prev) => ({
      ...prev,
      modifiers: prev.modifiers.filter((_, i) => i !== index),
    }));
  };

  const handleToggleProduct = (productId) => {
    setFormState((prev) => {
      const exists = prev.selectedProducts.includes(productId);
      return {
        ...prev,
        selectedProducts: exists
          ? prev.selectedProducts.filter((id) => id !== productId)
          : [...prev.selectedProducts, productId],
      };
    });
  };

  const persistGroup = async () => {
    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      selectionType: formState.selectionType,
      minSelections: Number(formState.minSelections) || 0,
      required: Boolean(formState.required),
      available: Boolean(formState.available),
    };

    if (formState.selectionType === 'multiple' && formState.maxSelections === '') {
      payload.maxSelections = undefined;
    } else if (formState.maxSelections !== '') {
      payload.maxSelections = Number(formState.maxSelections);
    } else if (formState.selectionType === 'single') {
      payload.maxSelections = 1;
    }

    if (!payload.name) {
      throw new Error('El nombre del grupo es obligatorio');
    }

    if (isEditMode && formState._id) {
      await fetchApi(`/modifier-groups/${formState._id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      return formState._id;
    }

    const response = await fetchApi('/modifier-groups', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return response.data?._id;
  };

  const persistModifierChanges = async (groupId) => {
    const originalModifiers = originalModifiersRef.current;
    const currentModifiers = formState.modifiers;

    const originalMap = new Map(originalModifiers.map((modifier) => [modifier._id, modifier]));
    const currentMap = new Map(currentModifiers.filter((modifier) => modifier._id).map((modifier) => [modifier._id, modifier]));

    const toCreate = currentModifiers.filter((modifier) => !modifier._id && modifier.name.trim());
    const toUpdate = currentModifiers.filter((modifier) => {
      if (!modifier._id) return false;
      const original = originalMap.get(modifier._id);
      if (!original) return false;
      return (
        original.name !== modifier.name ||
        (original.description || '') !== (modifier.description || '') ||
        Number(original.priceAdjustment) !== Number(modifier.priceAdjustment)
      );
    });
    const toDelete = originalModifiers.filter((modifier) => !currentMap.has(modifier._id));

    for (const modifier of toCreate) {
      await fetchApi('/modifiers', {
        method: 'POST',
        body: JSON.stringify({
          name: modifier.name.trim(),
          description: modifier.description?.trim() || undefined,
          priceAdjustment: Number(modifier.priceAdjustment) || 0,
          groupId,
        }),
      });
    }

    for (const modifier of toUpdate) {
      await fetchApi(`/modifiers/${modifier._id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: modifier.name.trim(),
          description: modifier.description?.trim() || undefined,
          priceAdjustment: Number(modifier.priceAdjustment) || 0,
        }),
      });
    }

    for (const modifier of toDelete) {
      await fetchApi(`/modifiers/${modifier._id}`, {
        method: 'DELETE',
      });
    }
  };

  const persistProductAssignments = async (groupId) => {
    await fetchApi('/modifier-groups/assign-products', {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        productIds: formState.selectedProducts,
      }),
    });
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const groupId = await persistGroup();
      if (!groupId) {
        throw new Error('No se pudo obtener el ID del grupo');
      }

      await persistModifierChanges(groupId);

      if (formState.selectedProducts.length > 0) {
        await persistProductAssignments(groupId);
      } else if (isEditMode) {
        await fetchApi('/modifier-groups/assign-products', {
          method: 'POST',
          body: JSON.stringify({ groupId, productIds: [] }),
        });
      }

      await loadModifierGroups();
      setIsDialogOpen(false);
      resetFormState();
    } catch (err) {
      console.error('Error saving modifier group:', err);
      alert(`Error al guardar el grupo: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este grupo de modificadores?')) return;
    try {
      await fetchApi(`/modifier-groups/${groupId}`, { method: 'DELETE' });
      await loadModifierGroups();
    } catch (err) {
      console.error('Error deleting modifier group:', err);
      alert(`No se pudo eliminar el grupo: ${err.message}`);
    }
  };

  const renderRequiredBadge = (group) => {
    if (group.required) {
      return (
        <Badge
          variant="secondary"
          className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200"
        >
          <CheckCircle className="mr-1 h-3 w-3" />
          Requerido
        </Badge>
      );
    }
    return (
      <Badge
        variant="secondary"
        className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-200"
      >
        <AlertTriangle className="mr-1 h-3 w-3" />
        Opcional
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-500 dark:text-orange-300" />
              Gestión de Grupos de Modificadores
            </CardTitle>
            <CardDescription>
              Crea y administra los grupos de modificadores disponibles para tus productos del restaurante.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadModifierGroups} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Grupo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <Input
              placeholder="Buscar grupo por nombre o descripción..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full sm:max-w-sm"
            />
            <div className="text-sm text-muted-foreground">
              {filteredGroups.length} grupos encontrados
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
              {error}
            </div>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Grupo</TableHead>
                  <TableHead>Selección</TableHead>
                  <TableHead>Requerido</TableHead>
                  <TableHead>Productos asignados</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGroups.map((group) => {
                  const assignedProducts = group.applicableProducts?.length || 0;
                  const modifierCount = group.modifiersCount ?? group.modifiers?.length ?? null;
                  return (
                    <TableRow key={group._id}>
                      <TableCell>
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {group.description || 'Sin descripción'}
                          </div>
                          {typeof modifierCount === 'number' && (
                            <div className="mt-1 text-xs text-muted-foreground">
                              {modifierCount} modificador{modifierCount === 1 ? '' : 'es'}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize">
                        {group.selectionType === 'single' ? 'Selección única' : 'Selección múltiple'}
                        <div className="text-xs text-muted-foreground">
                          Min: {group.minSelections ?? 0} | Max:{' '}
                          {group.maxSelections != null ? group.maxSelections : group.selectionType === 'single' ? 1 : 'Sin límite'}
                        </div>
                      </TableCell>
                      <TableCell>{renderRequiredBadge(group)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {assignedProducts} producto{assignedProducts === 1 ? '' : 's'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenEdit(group)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" onClick={() => handleDeleteGroup(group._id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

                {!loading && filteredGroups.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No se encontraron grupos de modificadores.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? 'Editar grupo de modificadores' : 'Crear grupo de modificadores'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group-name">Nombre</Label>
                <Input
                  id="group-name"
                  placeholder="Ej: Punto de Cocción"
                  value={formState.name}
                  onChange={(event) => updateFormField('name', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="selectionType">Tipo de selección</Label>
                <Select
                  value={formState.selectionType}
                  onValueChange={(value) => {
                    updateFormField('selectionType', value);
                    if (value === 'single') {
                      updateFormField('minSelections', 1);
                      updateFormField('maxSelections', 1);
                    }
                  }}
                >
                  <SelectTrigger id="selectionType">
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Selección única</SelectItem>
                    <SelectItem value="multiple">Selección múltiple</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minSelections">Mínimo requerido</Label>
                <Input
                  id="minSelections"
                  type="number"
                  min={0}
                  value={formState.minSelections}
                  onChange={(event) => updateFormField('minSelections', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxSelections">
                  Máximo permitido {formState.selectionType === 'multiple' ? '(vacío = ilimitado)' : ''}
                </Label>
                <Input
                  id="maxSelections"
                  type="number"
                  min={1}
                  value={formState.maxSelections}
                  onChange={(event) => updateFormField('maxSelections', event.target.value)}
                  disabled={formState.selectionType === 'single'}
                  placeholder={formState.selectionType === 'multiple' ? 'Ej: 3' : ''}
                />
              </div>

              <div className="space-y-2">
                <Label>Es requerido</Label>
                <Select
                  value={formState.required ? 'true' : 'false'}
                  onValueChange={(value) => updateFormField('required', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Sí</SelectItem>
                    <SelectItem value="false">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Disponible</Label>
                <Select
                  value={formState.available ? 'true' : 'false'}
                  onValueChange={(value) => updateFormField('available', value === 'true')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Activo</SelectItem>
                    <SelectItem value="false">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-2">
                <Label htmlFor="group-description">Descripción</Label>
                <Input
                  id="group-description"
                  placeholder="Describe cuándo se utiliza este grupo..."
                  value={formState.description}
                  onChange={(event) => updateFormField('description', event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Modificadores del grupo</h4>
                  <p className="text-sm text-muted-foreground">
                    Define las opciones que los usuarios podrán seleccionar dentro de este grupo.
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleAddModifier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Añadir modificador
                </Button>
              </div>

              {formState.modifiers.length === 0 && (
                <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No hay modificadores agregados. Usa el botón “Añadir modificador” para comenzar.
                </div>
              )}

              <div className="space-y-4">
                {formState.modifiers.map((modifier, index) => (
                  <div key={modifier._id ?? index} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Nombre</Label>
                            <Input
                              value={modifier.name}
                              onChange={(event) => handleModifierChange(index, 'name', event.target.value)}
                              placeholder="Ej: Extra Queso"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Ajuste de precio (USD)</Label>
                            <Input
                              type="number"
                              value={modifier.priceAdjustment}
                              onChange={(event) => handleModifierChange(index, 'priceAdjustment', event.target.value)}
                              step="0.1"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Descripción (opcional)</Label>
                          <Input
                            value={modifier.description}
                            onChange={(event) => handleModifierChange(index, 'description', event.target.value)}
                            placeholder="Notas adicionales sobre este modificador"
                          />
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="self-start text-red-500 hover:text-red-600"
                        onClick={() => handleRemoveModifier(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold">Asignar grupo a productos</h4>
              <p className="text-sm text-muted-foreground">
                Selecciona los productos que utilizarán este grupo de modificadores.
              </p>
              <div className="rounded-lg border">
                <ScrollArea className="h-48">
                  <div className="space-y-2 p-4">
                    {products.map((product) => (
                      <label
                        key={product._id}
                        className="flex cursor-pointer items-center justify-between rounded-md border p-3 hover:bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku} · {product.category}
                          </p>
                        </div>
                        <Checkbox
                          checked={formState.selectedProducts.includes(product._id)}
                          onCheckedChange={() => handleToggleProduct(product._id)}
                        />
                      </label>
                    ))}

                    {products.length === 0 && (
                      <div className="text-sm text-muted-foreground">
                        No hay productos disponibles para asignar.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={handleDialogClose} disabled={isSaving}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
