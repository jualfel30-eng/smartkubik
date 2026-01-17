import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { NumberInput } from '@/components/ui/number-input.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Plus, Loader2, Pencil, Trash2, MapPin } from 'lucide-react';

const LOCATION_TYPES = [
  { value: 'picking', label: 'Picking' },
  { value: 'bulk', label: 'Bulk / Reserva' },
  { value: 'receiving', label: 'Recepción' },
  { value: 'shipping', label: 'Envío' },
  { value: 'quarantine', label: 'Cuarentena' },
];

const emptyForm = {
  warehouseId: '',
  code: '',
  zone: '',
  aisle: '',
  shelf: '',
  bin: '',
  description: '',
  locationType: 'picking',
  maxCapacity: '',
  isActive: true,
};

export default function BinLocationsPanel({ warehouses = [] }) {
  const [binLocations, setBinLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [filterWarehouseId, setFilterWarehouseId] = useState('all');

  const loadBinLocations = async () => {
    setLoading(true);
    try {
      const warehouseParam = filterWarehouseId && filterWarehouseId !== 'all' ? `?warehouseId=${filterWarehouseId}` : '';
      const response = await fetchApi(`/bin-locations${warehouseParam}`);
      setBinLocations(Array.isArray(response) ? response : response?.data || []);
    } catch (err) {
      console.error('Error loading bin locations', err);
      toast.error('No se pudieron cargar las ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBinLocations();
  }, [filterWarehouseId]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      warehouseId: filterWarehouseId !== 'all' ? filterWarehouseId : (warehouses[0]?._id || warehouses[0]?.id || ''),
    });
    setModalOpen(true);
  };

  const openEdit = (loc) => {
    setEditingId(loc._id || loc.id);
    setForm({
      warehouseId: loc.warehouseId || '',
      code: loc.code || '',
      zone: loc.zone || '',
      aisle: loc.aisle || '',
      shelf: loc.shelf || '',
      bin: loc.bin || '',
      description: loc.description || '',
      locationType: loc.locationType || 'picking',
      maxCapacity: loc.maxCapacity ?? '',
      isActive: loc.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.warehouseId) {
      toast.error('Código y almacén son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        warehouseId: form.warehouseId,
        code: form.code.trim(),
        zone: form.zone?.trim() || undefined,
        aisle: form.aisle?.trim() || undefined,
        shelf: form.shelf?.trim() || undefined,
        bin: form.bin?.trim() || undefined,
        description: form.description?.trim() || undefined,
        locationType: form.locationType,
        maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
        isActive: form.isActive,
      };

      if (editingId) {
        await fetchApi(`/bin-locations/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        toast.success('Ubicación actualizada');
      } else {
        await fetchApi('/bin-locations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        toast.success('Ubicación creada');
      }
      setModalOpen(false);
      await loadBinLocations();
    } catch (err) {
      console.error('Error saving bin location', err);
      toast.error(err?.message || 'Error guardando ubicación');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (loc) => {
    if (!confirm(`¿Eliminar ubicación "${loc.code}"?`)) return;
    setDeleting(true);
    try {
      await fetchApi(`/bin-locations/${loc._id || loc.id}`, {
        method: 'DELETE',
      });
      toast.success('Ubicación eliminada');
      await loadBinLocations();
    } catch (err) {
      console.error('Error deleting bin location', err);
      toast.error(err?.message || 'Error eliminando ubicación');
    } finally {
      setDeleting(false);
    }
  };

  const getWarehouseName = (warehouseId) => {
    const wh = warehouses.find((w) => (w._id || w.id) === warehouseId);
    return wh ? `${wh.code} · ${wh.name}` : '—';
  };

  const getLocationTypeLabel = (type) => {
    return LOCATION_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Ubicaciones (Bins)
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Define ubicaciones específicas dentro de cada almacén (zona, pasillo, estante, bin).
          </p>
        </div>
        <Button onClick={openCreate} disabled={saving || deleting || warehouses.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva ubicación
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {warehouses.length > 1 && (
          <div className="flex items-center gap-2">
            <Label>Filtrar por almacén:</Label>
            <Select value={filterWarehouseId} onValueChange={setFilterWarehouseId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {warehouses.map((wh) => (
                  <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                    {wh.code} · {wh.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <div className="flex items-center text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Cargando ubicaciones...
          </div>
        ) : warehouses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Primero debes crear al menos un almacén para poder agregar ubicaciones.
          </p>
        ) : binLocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay ubicaciones definidas.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Almacén</TableHead>
                <TableHead>Zona</TableHead>
                <TableHead>Pasillo</TableHead>
                <TableHead>Estante</TableHead>
                <TableHead>Bin</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {binLocations.map((loc) => (
                <TableRow key={loc._id || loc.id}>
                  <TableCell className="font-medium">{loc.code}</TableCell>
                  <TableCell>{getWarehouseName(loc.warehouseId)}</TableCell>
                  <TableCell>{loc.zone || '—'}</TableCell>
                  <TableCell>{loc.aisle || '—'}</TableCell>
                  <TableCell>{loc.shelf || '—'}</TableCell>
                  <TableCell>{loc.bin || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getLocationTypeLabel(loc.locationType)}</Badge>
                  </TableCell>
                  <TableCell>
                    {loc.isActive === false ? (
                      <Badge variant="destructive">Inactivo</Badge>
                    ) : (
                      <Badge variant="secondary">Activo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(loc)}>
                      <Pencil className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(loc)} disabled={deleting}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar ubicación' : 'Nueva ubicación'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bin-warehouse">Almacén *</Label>
                <Select
                  value={form.warehouseId}
                  onValueChange={(v) => setForm({ ...form, warehouseId: v })}
                  disabled={!!editingId}
                >
                  <SelectTrigger id="bin-warehouse">
                    <SelectValue placeholder="Selecciona almacén" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((wh) => (
                      <SelectItem key={wh._id || wh.id} value={wh._id || wh.id}>
                        {wh.code} · {wh.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin-code">Código *</Label>
                <Input
                  id="bin-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  placeholder="A-01-02-03"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-2">
                <Label htmlFor="bin-zone">Zona</Label>
                <Input
                  id="bin-zone"
                  value={form.zone}
                  onChange={(e) => setForm({ ...form, zone: e.target.value })}
                  placeholder="A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin-aisle">Pasillo</Label>
                <Input
                  id="bin-aisle"
                  value={form.aisle}
                  onChange={(e) => setForm({ ...form, aisle: e.target.value })}
                  placeholder="01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin-shelf">Estante</Label>
                <Input
                  id="bin-shelf"
                  value={form.shelf}
                  onChange={(e) => setForm({ ...form, shelf: e.target.value })}
                  placeholder="02"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin-bin">Bin</Label>
                <Input
                  id="bin-bin"
                  value={form.bin}
                  onChange={(e) => setForm({ ...form, bin: e.target.value })}
                  placeholder="03"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="bin-type">Tipo de ubicación</Label>
                <Select
                  value={form.locationType}
                  onValueChange={(v) => setForm({ ...form, locationType: v })}
                >
                  <SelectTrigger id="bin-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bin-capacity">Capacidad máx. (opcional)</Label>
                <NumberInput
                  id="bin-capacity"
                  min={0}
                  value={form.maxCapacity}
                  onValueChange={(val) => setForm({ ...form, maxCapacity: val })}
                  placeholder="Sin límite"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bin-desc">Descripción (opcional)</Label>
              <Input
                id="bin-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Descripción de la ubicación"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Activo</p>
                <p className="text-xs text-muted-foreground">Las ubicaciones inactivas no se pueden usar.</p>
              </div>
              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
              />
            </div>
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
