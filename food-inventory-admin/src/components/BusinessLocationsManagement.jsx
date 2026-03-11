import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import {
  getBusinessLocations,
  createBusinessLocation,
  updateBusinessLocation,
  deleteBusinessLocation,
  getBusinessLocationInventorySummary,
} from '@/lib/api';
import { useBusinessLocation } from '@/context/BusinessLocationContext';
import { Plus, Loader2, Pencil, Trash2, MapPin, Warehouse, Package, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const LOCATION_TYPES = [
  { value: 'warehouse', label: 'Almacen' },
  { value: 'point_of_sale', label: 'Punto de Venta' },
  { value: 'mixed', label: 'Mixto' },
];

const emptyForm = {
  name: '',
  code: '',
  type: 'mixed',
  phone: '',
  email: '',
  address: { street: '', city: '', state: '', country: '', zipCode: '' },
  isActive: true,
};

export default function BusinessLocationsManagement() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [inventorySummaries, setInventorySummaries] = useState({});
  const { refreshLocations } = useBusinessLocation();
  const navigate = useNavigate();

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await getBusinessLocations();
      const data = Array.isArray(response) ? response : response?.data || [];
      setLocations(data);
    } catch (err) {
      console.error('Error loading locations', err);
      toast.error('No se pudieron cargar las sedes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
  }, []);

  // Load inventory summaries for each location
  useEffect(() => {
    locations.forEach(async (loc) => {
      const id = loc._id || loc.id;
      if (inventorySummaries[id]) return;
      try {
        const summary = await getBusinessLocationInventorySummary(id);
        setInventorySummaries((prev) => ({ ...prev, [id]: summary }));
      } catch {
        // Non-critical — skip
      }
    });
  }, [locations]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (location) => {
    setEditingId(location._id || location.id);
    setForm({
      name: location.name || '',
      code: location.code || '',
      type: location.type || 'mixed',
      phone: location.phone || '',
      email: location.email || '',
      address: {
        street: location.address?.street || '',
        city: location.address?.city || '',
        state: location.address?.state || '',
        country: location.address?.country || '',
        zipCode: location.address?.zipCode || '',
      },
      isActive: location.isActive !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error('Nombre y codigo son obligatorios');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim().toUpperCase(),
        type: form.type,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address,
        isActive: form.isActive,
      };
      if (editingId) {
        await updateBusinessLocation(editingId, payload);
        toast.success('Sede actualizada');
      } else {
        await createBusinessLocation(payload);
        toast.success('Sede creada');
      }
      setModalOpen(false);
      await loadLocations();
      refreshLocations();
    } catch (err) {
      console.error('Error saving location', err);
      toast.error(err?.message || 'Error guardando sede');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (location) => {
    if (!confirm(`¿Eliminar sede "${location.name}"? Esta accion no se puede deshacer.`)) return;
    setDeleting(true);
    try {
      await deleteBusinessLocation(location._id || location.id);
      toast.success('Sede eliminada');
      await loadLocations();
      refreshLocations();
    } catch (err) {
      console.error('Error deleting location', err);
      toast.error(err?.message || 'Error eliminando sede');
    } finally {
      setDeleting(false);
    }
  };

  const getTypeBadge = (type) => {
    const config = {
      warehouse: { label: 'Almacen', variant: 'secondary' },
      point_of_sale: { label: 'Punto de Venta', variant: 'default' },
      mixed: { label: 'Mixto', variant: 'outline' },
    };
    const c = config[type] || config.mixed;
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gestion de Sedes</h1>
          <p className="text-sm text-muted-foreground">Administra las ubicaciones fisicas de tu negocio.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Sedes / Ubicaciones
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {locations.length} sede{locations.length !== 1 ? 's' : ''} registrada{locations.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={openCreate} disabled={saving || deleting}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva sede
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Cargando sedes...
            </div>
          ) : locations.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aun no hay sedes registradas.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codigo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Almacenes</TableHead>
                  <TableHead>Productos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => {
                  const id = loc._id || loc.id;
                  const summary = inventorySummaries[id];
                  return (
                    <TableRow key={id}>
                      <TableCell className="font-medium font-mono">{loc.code}</TableCell>
                      <TableCell>
                        <div>
                          <span className="font-medium">{loc.name}</span>
                          {loc.address?.city && (
                            <span className="text-xs text-muted-foreground ml-2">{loc.address.city}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getTypeBadge(loc.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Warehouse className="h-3 w-3 text-muted-foreground" />
                          <span>{loc.warehouseIds?.length || 0}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{summary?.totalProducts ?? '...'}</span>
                        </div>
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(loc)}
                          disabled={deleting}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar sede' : 'Nueva sede'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loc-code">Codigo</Label>
                <Input
                  id="loc-code"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="SEDE-001"
                />
              </div>
              <div>
                <Label htmlFor="loc-name">Nombre</Label>
                <Input
                  id="loc-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Sede Principal"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="loc-type">Tipo</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}
              >
                <SelectTrigger id="loc-type">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="loc-phone">Telefono</Label>
                <Input
                  id="loc-phone"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="loc-email">Email</Label>
                <Input
                  id="loc-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Direccion</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input
                  placeholder="Calle"
                  value={form.address.street}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: { ...f.address, street: e.target.value } }))
                  }
                />
                <Input
                  placeholder="Ciudad"
                  value={form.address.city}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))
                  }
                />
                <Input
                  placeholder="Estado"
                  value={form.address.state}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: { ...f.address, state: e.target.value } }))
                  }
                />
                <Input
                  placeholder="Codigo Postal"
                  value={form.address.zipCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, address: { ...f.address, zipCode: e.target.value } }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="loc-active"
                checked={form.isActive}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              />
              <Label htmlFor="loc-active">Activa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Guardar' : 'Crear sede'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
