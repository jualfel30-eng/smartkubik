import React, { useState, useEffect, useCallback } from 'react';
import { fetchFixedAssets, createFixedAsset, updateFixedAsset, deleteFixedAsset } from '@/lib/api';
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PlusCircle, Pencil, Trash2 } from 'lucide-react';

const ASSET_TYPES = [
  { value: 'equipment', label: 'Equipo' },
  { value: 'vehicle', label: 'Vehículo' },
  { value: 'furniture', label: 'Mobiliario' },
  { value: 'building', label: 'Edificio' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'other', label: 'Otro' },
];

const DEPRECIATION_METHODS = [
  { value: 'straight_line', label: 'Línea Recta' },
  { value: 'declining_balance', label: 'Saldo Decreciente' },
];

const STATUS_LABELS = {
  active: 'Activo',
  disposed: 'Dado de baja',
  fully_depreciated: 'Depreciado',
};

const STATUS_COLORS = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  disposed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  fully_depreciated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

const fmt = (v) => v != null ? `$${Number(v).toLocaleString('es', { minimumFractionDigits: 2 })}` : '—';

function FixedAssetForm({ onSubmit, onCancel, initialData }) {
  const [form, setForm] = useState({
    name: '', description: '', assetType: '', acquisitionCost: '',
    acquisitionDate: '', usefulLifeMonths: '', residualValue: '',
    depreciationMethod: 'straight_line', status: 'active',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        assetType: initialData.assetType || '',
        acquisitionCost: initialData.acquisitionCost?.toString() || '',
        acquisitionDate: initialData.acquisitionDate ? initialData.acquisitionDate.slice(0, 10) : '',
        usefulLifeMonths: initialData.usefulLifeMonths?.toString() || '',
        residualValue: initialData.residualValue?.toString() || '',
        depreciationMethod: initialData.depreciationMethod || 'straight_line',
        status: initialData.status || 'active',
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || undefined,
      assetType: form.assetType,
      acquisitionCost: parseFloat(form.acquisitionCost),
      acquisitionDate: form.acquisitionDate,
      usefulLifeMonths: parseInt(form.usefulLifeMonths, 10),
      residualValue: form.residualValue ? parseFloat(form.residualValue) : 0,
      depreciationMethod: form.depreciationMethod,
    };
    if (initialData) data.status = form.status;
    onSubmit(data);
  };

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const setInput = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" value={form.name} onChange={setInput('name')} placeholder="Ej: Horno Industrial" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Tipo de Activo</Label>
          <Select value={form.assetType} onValueChange={set('assetType')} required>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Método Depreciación</Label>
          <Select value={form.depreciationMethod} onValueChange={set('depreciationMethod')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DEPRECIATION_METHODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Costo de Adquisición ($)</Label>
          <Input type="number" step="0.01" min="0" value={form.acquisitionCost} onChange={setInput('acquisitionCost')} required />
        </div>
        <div className="space-y-2">
          <Label>Fecha de Adquisición</Label>
          <Input type="date" value={form.acquisitionDate} onChange={setInput('acquisitionDate')} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Vida Útil (meses)</Label>
          <Input type="number" min="1" value={form.usefulLifeMonths} onChange={setInput('usefulLifeMonths')} required />
        </div>
        <div className="space-y-2">
          <Label>Valor Residual ($)</Label>
          <Input type="number" step="0.01" min="0" value={form.residualValue} onChange={setInput('residualValue')} placeholder="0" />
        </div>
      </div>
      {initialData && (
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={set('status')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activo</SelectItem>
              <SelectItem value="disposed">Dado de baja</SelectItem>
              <SelectItem value="fully_depreciated">Depreciado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Descripción</Label>
        <Input value={form.description} onChange={setInput('description')} placeholder="(Opcional)" />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

const FixedAssetsView = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const loadAssets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchFixedAssets();
      setAssets(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAssets(); }, [loadAssets]);

  const handleCreate = async (data) => {
    try {
      await createFixedAsset(data);
      setIsFormOpen(false);
      await loadAssets();
      toast.success('Activo fijo creado exitosamente.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateFixedAsset(editingAsset._id, data);
      setEditingAsset(null);
      await loadAssets();
      toast.success('Activo fijo actualizado.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este activo fijo?')) return;
    try {
      await deleteFixedAsset(id);
      await loadAssets();
      toast.success('Activo fijo eliminado.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const typeLabel = (v) => ASSET_TYPES.find((t) => t.value === v)?.label || v;
  const deprLabel = (v) => DEPRECIATION_METHODS.find((m) => m.value === v)?.label || v;

  if (loading && assets.length === 0) return <div>Cargando activos fijos...</div>;
  if (error) return <div>Error: {error}</div>;

  const totalCost = assets.reduce((s, a) => s + (a.acquisitionCost || 0), 0);
  const totalDepr = assets.reduce((s, a) => s + (a.accumulatedDepreciation || 0), 0);

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Total activos: <strong>{assets.length}</strong></span>
          <span className="text-muted-foreground">Costo total: <strong>{fmt(totalCost)}</strong></span>
          <span className="text-muted-foreground">Valor neto: <strong>{fmt(totalCost - totalDepr)}</strong></span>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white">
              <PlusCircle className="mr-2 h-5 w-5" /> Nuevo Activo Fijo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Activo Fijo</DialogTitle>
              <DialogDescription>Complete los datos del activo.</DialogDescription>
            </DialogHeader>
            <FixedAssetForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingAsset} onOpenChange={(o) => !o && setEditingAsset(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Activo Fijo</DialogTitle>
            <DialogDescription>Modifique los datos del activo.</DialogDescription>
          </DialogHeader>
          {editingAsset && (
            <FixedAssetForm initialData={editingAsset} onSubmit={handleUpdate} onCancel={() => setEditingAsset(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Activos Fijos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Costo</TableHead>
                <TableHead>Fecha Adq.</TableHead>
                <TableHead>Depreciación</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.length > 0 ? assets.map((a) => (
                <TableRow key={a._id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>{typeLabel(a.assetType)}</TableCell>
                  <TableCell className="text-right">{fmt(a.acquisitionCost)}</TableCell>
                  <TableCell>{a.acquisitionDate ? new Date(a.acquisitionDate).toLocaleDateString('es') : '—'}</TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">{deprLabel(a.depreciationMethod)}</span>
                    <br />
                    <span className="text-xs">{fmt(a.accumulatedDepreciation)} / {a.usefulLifeMonths}m</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[a.status] || ''} variant="outline">
                      {STATUS_LABELS[a.status] || a.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditingAsset(a)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(a._id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan="7" className="text-center">No se encontraron activos fijos.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default FixedAssetsView;
