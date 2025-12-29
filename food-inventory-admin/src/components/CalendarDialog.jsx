import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

const CALENDAR_CATEGORIES = [
  { value: 'general', label: 'General', color: '#3B82F6' },
  { value: 'sales', label: 'Ventas', color: '#FF6B6B' },
  { value: 'production', label: 'Producción', color: '#4ECDC4' },
  { value: 'hr', label: 'Recursos Humanos', color: '#95E1D3' },
  { value: 'finance', label: 'Finanzas', color: '#F38181' },
  { value: 'custom', label: 'Personalizado', color: '#9333EA' },
];

const PRESET_COLORS = [
  '#3B82F6', // Azul
  '#FF6B6B', // Rojo
  '#4ECDC4', // Cyan
  '#95E1D3', // Verde claro
  '#F38181', // Rosa
  '#9333EA', // Púrpura
  '#10B981', // Verde
  '#F59E0B', // Ámbar
  '#EF4444', // Rojo brillante
  '#8B5CF6', // Violeta
];

const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'sales_manager', label: 'Gerente de Ventas' },
  { value: 'sales_rep', label: 'Representante de Ventas' },
  { value: 'production_manager', label: 'Gerente de Producción' },
  { value: 'inventory_manager', label: 'Gerente de Inventario' },
  { value: 'accountant', label: 'Contador' },
  { value: 'cashier', label: 'Cajero' },
];

export function CalendarDialog({ open, onOpenChange, calendar, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general',
    color: '#3B82F6',
    allowedRoles: [],
    visibility: {
      public: false,
      shareWithTenant: true,
    },
    syncWithGoogle: false,
  });

  const [roleInput, setRoleInput] = useState('');

  useEffect(() => {
    if (calendar) {
      setFormData({
        name: calendar.name || '',
        description: calendar.description || '',
        category: calendar.category || 'general',
        color: calendar.color || '#3B82F6',
        allowedRoles: calendar.allowedRoles || [],
        visibility: calendar.visibility || {
          public: false,
          shareWithTenant: true,
        },
        syncWithGoogle: false,
      });
    } else {
      // Reset for new calendar
      setFormData({
        name: '',
        description: '',
        category: 'general',
        color: '#3B82F6',
        allowedRoles: [],
        visibility: {
          public: false,
          shareWithTenant: true,
        },
        syncWithGoogle: false,
      });
    }
  }, [calendar, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave(formData);
    onOpenChange(false);
  };

  const handleCategoryChange = (category) => {
    const categoryData = CALENDAR_CATEGORIES.find(c => c.value === category);
    setFormData(prev => ({
      ...prev,
      category,
      color: categoryData?.color || prev.color,
    }));
  };

  const addRole = (role) => {
    if (role && !formData.allowedRoles.includes(role)) {
      setFormData(prev => ({
        ...prev,
        allowedRoles: [...prev.allowedRoles, role],
      }));
      setRoleInput('');
    }
  };

  const removeRole = (role) => {
    setFormData(prev => ({
      ...prev,
      allowedRoles: prev.allowedRoles.filter(r => r !== role),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {calendar ? 'Editar Calendario' : 'Nuevo Calendario'}
          </DialogTitle>
          <DialogDescription>
            {calendar
              ? 'Modifica las propiedades del calendario'
              : 'Crea un nuevo calendario para organizar tus eventos'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre del Calendario *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Calendario de Ventas"
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe el propósito de este calendario"
                rows={3}
              />
            </div>
          </div>

          {/* Categoría */}
          <div>
            <Label>Categoría</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
              {CALENDAR_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.category === cat.value
                      ? 'border-primary bg-primary/10'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium">{cat.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <Label>Color del Calendario</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-10 h-10 rounded-full border-2 transition-all ${
                    formData.color === color
                      ? 'border-gray-900 scale-110'
                      : 'border-gray-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Permisos por roles */}
          <div>
            <Label>Roles con Acceso</Label>
            <p className="text-sm text-gray-500 mb-2">
              Selecciona los roles que pueden ver este calendario
            </p>

            <div className="space-y-2">
              <select
                value={roleInput}
                onChange={(e) => {
                  addRole(e.target.value);
                }}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Seleccionar rol...</option>
                {AVAILABLE_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              {formData.allowedRoles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.allowedRoles.map((role) => {
                    const roleData = AVAILABLE_ROLES.find(r => r.value === role);
                    return (
                      <Badge key={role} variant="secondary" className="flex items-center gap-1">
                        {roleData?.label || role}
                        <X
                          className="w-3 h-3 cursor-pointer hover:text-red-500"
                          onClick={() => removeRole(role)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Visibilidad */}
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <Label>Configuración de Visibilidad</Label>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Público</p>
                <p className="text-xs text-gray-500">
                  Visible para todos los usuarios del tenant
                </p>
              </div>
              <Switch
                checked={formData.visibility.public}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    visibility: { ...prev.visibility, public: checked },
                  }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Compartir con Tenant</p>
                <p className="text-xs text-gray-500">
                  Compartir con todos en la organización
                </p>
              </div>
              <Switch
                checked={formData.visibility.shareWithTenant}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({
                    ...prev,
                    visibility: { ...prev.visibility, shareWithTenant: checked },
                  }))
                }
              />
            </div>
          </div>

          {/* Sincronización con Google */}
          {!calendar && (
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium">Sincronizar con Google Calendar</p>
                <p className="text-xs text-gray-500">
                  Crea automáticamente este calendario en Google Calendar
                </p>
              </div>
              <Switch
                checked={formData.syncWithGoogle}
                onCheckedChange={(checked) =>
                  setFormData(prev => ({ ...prev, syncWithGoogle: checked }))
                }
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {calendar ? 'Guardar Cambios' : 'Crear Calendario'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
