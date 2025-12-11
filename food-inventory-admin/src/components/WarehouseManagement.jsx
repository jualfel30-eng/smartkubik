import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Plus, Loader2, Pencil, Trash2 } from 'lucide-react';

const emptyForm = { code: '', name: '', isDefault: false, isActive: true };

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const defaultWarehouseId = useMemo(
    () => warehouses.find((w) => w.isDefault)?.id || warehouses.find((w) => w.isDefault)?._id,
    [warehouses],
  );

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const response = await fetchApi('/warehouses');
      setWarehouses(response?.data || []);
    } catch (err) {
      console.error('Error loading warehouses', err);
      toast.error('No se pudieron cargar los almacenes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (warehouse) => {
    setEditingId(warehouse._id || warehouse.id);
    setForm({
      code: warehouse.code || '',
      name: warehouse.name || '',
      isDefault: Boolean(warehouse.isDefault),
      isActive: warehouse.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Código y nombre son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        isDefault: form.isDefault,
        isActive: form.isActive,
      };
      if (editingId) {
        await fetchApi(`/warehouses/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Almacén actualizado');
      } else {
        await fetchApi('/warehouses', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Almacén creado');
      }
      setModalOpen(false);
      await loadWarehouses();
    } catch (err) {
      console.error('Error saving warehouse', err);
      toast.error(err?.message || 'Error guardando almacén');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (warehouse) => {
    if (warehouse.isDefault) {
      toast.error('No se puede eliminar el almacén por defecto');
      return;
    }
    if (!confirm(`¿Eliminar almacén "${warehouse.name}"?`)) return;
    setDeleting(true);
    try {
      await fetchApi(`/warehouses/${warehouse._id || warehouse.id}`, {
        method: 'DELETE',
      });
      toast.success('Almacén eliminado');
      await loadWarehouses();
    } catch (err) {
      console.error('Error deleting warehouse', err);
      toast.error(err?.message || 'Error eliminando almacén');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Almacenes</CardTitle>
          <p className="text-sm text-muted-foreground">Define almacenes y marca el predeterminado.</p>
        </div>
        <Button onClick={openCreate} disabled={saving || deleting}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo almacén
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cargando almacenes...
          </div>
        ) : warehouses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay almacenes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouses.map((wh) => (
                <TableRow key={wh._id || wh.id}>
                  <TableCell className="font-medium">
                    {wh.code}
                    {wh.isDefault && (
                      <Badge variant="outline" className="ml-2">
                        Default
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{wh.name}</TableCell>
                  <TableCell>
                    {wh.isActive === false ? (
                      <Badge variant="destructive">Inactivo</Badge>
                    ) : (
                      <Badge variant="secondary">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(wh)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(wh)}
                      disabled={wh.isDefault || deleting}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar almacén' : 'Nuevo almacén'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="warehouse-code">Código</Label>
              <Input
                id="warehouse-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="GEN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warehouse-name">Nombre</Label>
              <Input
                id="warehouse-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="General"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Almacén por defecto</p>
                <p className="text-xs text-muted-foreground">Se usará cuando no se especifique almacén.</p>
              </div>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) => setForm({ ...form, isDefault: checked })}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Los inactivos no se podrán usar en movimientos.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
            {defaultWarehouseId && !form.isDefault && editingId === defaultWarehouseId && (
              <p className="text-xs text-muted-foreground">
                Debes elegir otro almacén como default antes de desmarcar este.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
