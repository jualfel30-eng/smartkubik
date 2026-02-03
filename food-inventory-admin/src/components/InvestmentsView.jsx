import React, { useState, useEffect, useCallback } from 'react';
import { fetchInvestments, createInvestment, updateInvestment, deleteInvestment } from '@/lib/api';
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

const CATEGORIES = [
  { value: 'marketing', label: 'Marketing' },
  { value: 'equipment', label: 'Equipo' },
  { value: 'technology', label: 'Tecnología' },
  { value: 'expansion', label: 'Expansión' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'training', label: 'Capacitación' },
  { value: 'other', label: 'Otro' },
];

const STATUS_LABELS = {
  active: 'Activa',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const fmt = (v) => v != null ? `$${Number(v).toLocaleString('es', { minimumFractionDigits: 2 })}` : '—';

function InvestmentForm({ onSubmit, onCancel, initialData }) {
  const [form, setForm] = useState({
    name: '', description: '', category: '', investedAmount: '',
    investmentDate: '', expectedReturnDate: '', expectedReturn: '',
    actualReturn: '', notes: '', status: 'active',
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        name: initialData.name || '',
        description: initialData.description || '',
        category: initialData.category || '',
        investedAmount: initialData.investedAmount?.toString() || '',
        investmentDate: initialData.investmentDate ? initialData.investmentDate.slice(0, 10) : '',
        expectedReturnDate: initialData.expectedReturnDate ? initialData.expectedReturnDate.slice(0, 10) : '',
        expectedReturn: initialData.expectedReturn?.toString() || '',
        actualReturn: initialData.actualReturn?.toString() || '',
        notes: initialData.notes || '',
        status: initialData.status || 'active',
      });
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      name: form.name,
      description: form.description || undefined,
      category: form.category,
      investedAmount: parseFloat(form.investedAmount),
      investmentDate: form.investmentDate,
      expectedReturnDate: form.expectedReturnDate || undefined,
      expectedReturn: form.expectedReturn ? parseFloat(form.expectedReturn) : 0,
      notes: form.notes || undefined,
    };
    if (initialData) {
      data.actualReturn = form.actualReturn ? parseFloat(form.actualReturn) : 0;
      data.status = form.status;
    }
    onSubmit(data);
  };

  const set = (k) => (v) => setForm((p) => ({ ...p, [k]: v }));
  const setInput = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input id="name" value={form.name} onChange={setInput('name')} placeholder="Ej: Campaña de Marketing Q1" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Categoría</Label>
          <Select value={form.category} onValueChange={set('category')} required>
            <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Monto Invertido ($)</Label>
          <Input type="number" step="0.01" min="0" value={form.investedAmount} onChange={setInput('investedAmount')} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Fecha de Inversión</Label>
          <Input type="date" value={form.investmentDate} onChange={setInput('investmentDate')} required />
        </div>
        <div className="space-y-2">
          <Label>Retorno Esperado (fecha)</Label>
          <Input type="date" value={form.expectedReturnDate} onChange={setInput('expectedReturnDate')} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Retorno Esperado ($)</Label>
          <Input type="number" step="0.01" min="0" value={form.expectedReturn} onChange={setInput('expectedReturn')} placeholder="0" />
        </div>
        {initialData && (
          <div className="space-y-2">
            <Label>Retorno Real ($)</Label>
            <Input type="number" step="0.01" value={form.actualReturn} onChange={setInput('actualReturn')} placeholder="0" />
          </div>
        )}
      </div>
      {initialData && (
        <div className="space-y-2">
          <Label>Estado</Label>
          <Select value={form.status} onValueChange={set('status')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Activa</SelectItem>
              <SelectItem value="completed">Completada</SelectItem>
              <SelectItem value="cancelled">Cancelada</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label>Notas</Label>
        <Input value={form.notes} onChange={setInput('notes')} placeholder="(Opcional)" />
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">Guardar</Button>
      </div>
    </form>
  );
}

const InvestmentsView = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadInvestments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetchInvestments();
      setInvestments(res.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInvestments(); }, [loadInvestments]);

  const handleCreate = async (data) => {
    try {
      await createInvestment(data);
      setIsFormOpen(false);
      await loadInvestments();
      toast.success('Inversión creada exitosamente.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleUpdate = async (data) => {
    try {
      await updateInvestment(editingItem._id, data);
      setEditingItem(null);
      await loadInvestments();
      toast.success('Inversión actualizada.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta inversión?')) return;
    try {
      await deleteInvestment(id);
      await loadInvestments();
      toast.success('Inversión eliminada.');
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    }
  };

  const catLabel = (v) => CATEGORIES.find((c) => c.value === v)?.label || v;

  if (loading && investments.length === 0) return <div>Cargando inversiones...</div>;
  if (error) return <div>Error: {error}</div>;

  const totalInvested = investments.reduce((s, i) => s + (i.investedAmount || 0), 0);
  const totalActual = investments.reduce((s, i) => s + (i.actualReturn || 0), 0);
  const roi = totalInvested > 0 ? ((totalActual - totalInvested) / totalInvested * 100).toFixed(1) : 0;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-4 text-sm">
          <span className="text-muted-foreground">Total inversiones: <strong>{investments.length}</strong></span>
          <span className="text-muted-foreground">Invertido: <strong>{fmt(totalInvested)}</strong></span>
          <span className="text-muted-foreground">Retorno real: <strong>{fmt(totalActual)}</strong></span>
          <span className="text-muted-foreground">ROI: <strong>{roi}%</strong></span>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white">
              <PlusCircle className="mr-2 h-5 w-5" /> Nueva Inversión
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nueva Inversión</DialogTitle>
              <DialogDescription>Complete los datos de la inversión.</DialogDescription>
            </DialogHeader>
            <InvestmentForm onSubmit={handleCreate} onCancel={() => setIsFormOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={!!editingItem} onOpenChange={(o) => !o && setEditingItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Inversión</DialogTitle>
            <DialogDescription>Modifique los datos de la inversión.</DialogDescription>
          </DialogHeader>
          {editingItem && (
            <InvestmentForm initialData={editingItem} onSubmit={handleUpdate} onCancel={() => setEditingItem(null)} />
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Inversiones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Invertido</TableHead>
                <TableHead className="text-right">Retorno Esp.</TableHead>
                <TableHead className="text-right">Retorno Real</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.length > 0 ? investments.map((inv) => {
                const invRoi = inv.investedAmount > 0
                  ? ((inv.actualReturn - inv.investedAmount) / inv.investedAmount * 100).toFixed(1)
                  : '0.0';
                return (
                  <TableRow key={inv._id}>
                    <TableCell className="font-medium">{inv.name}</TableCell>
                    <TableCell>{catLabel(inv.category)}</TableCell>
                    <TableCell className="text-right">{fmt(inv.investedAmount)}</TableCell>
                    <TableCell className="text-right">{fmt(inv.expectedReturn)}</TableCell>
                    <TableCell className="text-right">
                      {fmt(inv.actualReturn)}
                      <span className={`ml-1 text-xs ${Number(invRoi) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ({invRoi}%)
                      </span>
                    </TableCell>
                    <TableCell>{inv.investmentDate ? new Date(inv.investmentDate).toLocaleDateString('es') : '—'}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[inv.status] || ''} variant="outline">
                        {STATUS_LABELS[inv.status] || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button size="icon" variant="ghost" onClick={() => setEditingItem(inv)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(inv._id)}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan="8" className="text-center">No se encontraron inversiones.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default InvestmentsView;
