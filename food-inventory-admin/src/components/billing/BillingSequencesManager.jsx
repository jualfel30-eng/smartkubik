import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { api } from '../../lib/api';

const BillingSequencesManager = () => {
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    scope: 'tenant',
    type: 'invoice',
    prefix: 'FAC-',
    startNumber: 1,
    channel: 'digital',
    isDefault: false,
  });

  useEffect(() => {
    loadSequences();
  }, []);

  const loadSequences = async () => {
    try {
      setLoading(true);
      const response = await api.get('/billing/sequences');
      setSequences(response || []);
    } catch (error) {
      console.error('Error loading sequences:', error);
      toast.error('Error al cargar las series');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.prefix) {
      toast.error('Complete todos los campos requeridos');
      return;
    }

    try {
      setLoading(true);
      await api.post('/billing/sequences', formData);
      toast.success('Serie creada exitosamente');
      setShowForm(false);
      setFormData({
        name: '',
        scope: 'tenant',
        type: 'invoice',
        prefix: 'FAC-',
        startNumber: 1,
        channel: 'digital',
        isDefault: false,
      });
      loadSequences();
    } catch (error) {
      console.error('Error creating sequence:', error);
      toast.error(error.response?.data?.message || 'Error al crear la serie');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentTypeLabel = (type) => {
    const labels = {
      invoice: 'Factura',
      credit_note: 'Nota de Crédito',
      debit_note: 'Nota de Débito',
      delivery_note: 'Nota de Entrega',
      quote: 'Cotización',
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Series de Facturación</h1>
          <p className="text-muted-foreground">
            Gestiona las series de numeración para tus documentos fiscales
          </p>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Serie
          </Button>
        )}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Nueva Serie</CardTitle>
            <CardDescription>
              Define una nueva serie de numeración para tus documentos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="name">Nombre de la Serie *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Facturas 2025"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type">Tipo de Documento *</Label>
                  <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">Factura</SelectItem>
                      <SelectItem value="credit_note">Nota de Crédito</SelectItem>
                      <SelectItem value="debit_note">Nota de Débito</SelectItem>
                      <SelectItem value="delivery_note">Nota de Entrega</SelectItem>
                      <SelectItem value="quote">Cotización</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="prefix">Prefijo *</Label>
                  <Input
                    id="prefix"
                    value={formData.prefix}
                    onChange={(e) => setFormData({ ...formData, prefix: e.target.value })}
                    placeholder="Ej: FAC-"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Los documentos se numerarán como: {formData.prefix}0001, {formData.prefix}0002...
                  </p>
                </div>
                <div>
                  <Label htmlFor="startNumber">Número Inicial</Label>
                  <Input
                    id="startNumber"
                    type="number"
                    min="1"
                    value={formData.startNumber}
                    onChange={(e) => setFormData({ ...formData, startNumber: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="isDefault" className="cursor-pointer">
                  Establecer como serie por defecto para este tipo de documento
                </Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({
                      name: '',
                      scope: 'tenant',
                      type: 'invoice',
                      prefix: 'FAC-',
                      startNumber: 1,
                      channel: 'digital',
                      isDefault: false,
                    });
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Series Existentes</CardTitle>
          <CardDescription>
            {sequences.length} serie(s) configurada(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : sequences.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay series configuradas</p>
              <p className="text-sm mt-2">Crea tu primera serie para comenzar a facturar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Prefijo</TableHead>
                  <TableHead>Siguiente Número</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Por Defecto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sequences.map((seq) => (
                  <TableRow key={seq._id}>
                    <TableCell className="font-medium">{seq.name}</TableCell>
                    <TableCell>{getDocumentTypeLabel(seq.type)}</TableCell>
                    <TableCell className="font-mono">{seq.prefix}</TableCell>
                    <TableCell className="font-mono">
                      {seq.prefix}{String(seq.currentNumber).padStart(4, '0')}
                    </TableCell>
                    <TableCell>
                      <Badge variant={seq.status === 'active' ? 'success' : 'secondary'}>
                        {seq.status === 'active' ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {seq.isDefault && <Badge variant="outline">Por defecto</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BillingSequencesManager;
