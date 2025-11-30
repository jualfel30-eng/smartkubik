import { useState, useEffect } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, Square, Circle, Minus } from 'lucide-react';

const SHAPES = [
  { id: 'square', name: 'Cuadrada', icon: Square },
  { id: 'round', name: 'Redonda', icon: Circle },
  { id: 'rectangle', name: 'Rectangular', icon: Minus },
  { id: 'booth', name: 'Booth', icon: Square },
];

export default function TableConfigModal({ table, sections, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    tableNumber: '',
    section: '',
    newSection: '',
    shape: 'square',
    minCapacity: 2,
    maxCapacity: 4,
    positionX: 0,
    positionY: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useNewSection, setUseNewSection] = useState(false);

  useEffect(() => {
    if (table) {
      // Modo edición
      setFormData({
        tableNumber: table.tableNumber,
        section: table.section,
        newSection: '',
        shape: table.shape,
        minCapacity: table.minCapacity,
        maxCapacity: table.maxCapacity,
        positionX: table.position?.x || 0,
        positionY: table.position?.y || 0,
      });
    }
  }, [table]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validaciones
    if (!formData.tableNumber.trim()) {
      setError('El número de mesa es requerido');
      return;
    }

    const selectedSection = useNewSection
      ? formData.newSection.trim()
      : formData.section;

    if (!selectedSection) {
      setError('Debes seleccionar o crear una sección');
      return;
    }

    if (formData.minCapacity < 1 || formData.maxCapacity < 1) {
      setError('La capacidad debe ser al menos 1');
      return;
    }

    if (formData.minCapacity > formData.maxCapacity) {
      setError('La capacidad mínima no puede ser mayor a la máxima');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        tableNumber: formData.tableNumber.trim(),
        section: selectedSection,
        shape: formData.shape,
        minCapacity: parseInt(formData.minCapacity),
        maxCapacity: parseInt(formData.maxCapacity),
        position: {
          x: parseInt(formData.positionX),
          y: parseInt(formData.positionY),
        },
      };

      if (table) {
        // Actualizar mesa existente
        await fetchApi(`/tables/${table._id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } else {
        // Crear nueva mesa
        await fetchApi('/tables', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al guardar la mesa');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!table) return;

    const confirmed = window.confirm(
      `¿Estás seguro de eliminar la Mesa ${table.tableNumber}?`
    );
    if (!confirmed) return;

    setLoading(true);

    try {
      await fetchApi(`/tables/${table._id}`, {
        method: 'DELETE',
      });
      onSuccess();
    } catch (err) {
      setError(err.message || 'Error al eliminar la mesa');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-2xl border border-slate-200 dark:border-slate-700 max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto transition-colors">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {table ? 'Editar Mesa' : 'Nueva Mesa'}
          </h2>
          <p className="text-gray-600 dark:text-slate-300 mt-1">
            {table
              ? `Modificar configuración de Mesa ${table.tableNumber}`
              : 'Configura una nueva mesa para el restaurante'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Número de Mesa */}
          <div>
            <Label htmlFor="tableNumber">Número de Mesa *</Label>
            <Input
              id="tableNumber"
              type="text"
              value={formData.tableNumber}
              onChange={(e) => handleChange('tableNumber', e.target.value)}
              placeholder="Ej: 1, A1, Patio-3"
              className="mt-2"
              required
            />
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
              Puede ser numérico o alfanumérico
            </p>
          </div>

          {/* Sección */}
          <div>
            <Label htmlFor="section">Sección *</Label>
            {!useNewSection ? (
              <div className="space-y-2">
                <select
                  id="section"
                  value={formData.section}
                  onChange={(e) => handleChange('section', e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required={!useNewSection}
                >
                  <option value="">Seleccionar sección existente</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setUseNewSection(true)}
                >
                  + Crear nueva sección
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Input
                  type="text"
                  value={formData.newSection}
                  onChange={(e) => handleChange('newSection', e.target.value)}
                  placeholder="Nombre de la nueva sección"
                  className="mt-2"
                  required={useNewSection}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUseNewSection(false);
                    handleChange('newSection', '');
                  }}
                >
                  Cancelar - Usar sección existente
                </Button>
              </div>
            )}
          </div>

          {/* Forma de la Mesa */}
          <div>
            <Label>Forma de la Mesa *</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
              {SHAPES.map((shape) => {
                const ShapeIcon = shape.icon;
                return (
                  <button
                  key={shape.id}
                  type="button"
                  onClick={() => handleChange('shape', shape.id)}
                  className={`
                    p-4 border-2 rounded-lg flex flex-col items-center gap-2
                    transition-all duration-200
                    ${
                      formData.shape === shape.id
                        ? 'border-blue-600 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-200'
                        : 'border-gray-300 hover:border-gray-400 dark:border-slate-700 dark:hover:border-slate-500'
                    }
                  `}
                >
                  <ShapeIcon className="w-8 h-8" />
                  <span className="text-sm font-medium">{shape.name}</span>
                </button>
                );
              })}
            </div>
          </div>

          {/* Capacidad */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minCapacity">Capacidad Mínima *</Label>
              <Input
                id="minCapacity"
                type="number"
                min="1"
                value={formData.minCapacity}
                onChange={(e) => handleChange('minCapacity', e.target.value)}
                className="mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="maxCapacity">Capacidad Máxima *</Label>
              <Input
                id="maxCapacity"
                type="number"
                min="1"
                value={formData.maxCapacity}
                onChange={(e) => handleChange('maxCapacity', e.target.value)}
                className="mt-2"
                required
              />
            </div>
          </div>

          {/* Posición (Opcional - Para diseño visual avanzado) */}
          <div>
            <Label>Posición en el Plano (Opcional)</Label>
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-2">
              Para futura visualización gráfica del plano
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="positionX" className="text-xs">
                  Posición X
                </Label>
                <Input
                  id="positionX"
                  type="number"
                  value={formData.positionX}
                  onChange={(e) => handleChange('positionX', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="positionY" className="text-xs">
                  Posición Y
                </Label>
                <Input
                  id="positionY"
                  type="number"
                  value={formData.positionY}
                  onChange={(e) => handleChange('positionY', e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            {table && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                Eliminar Mesa
              </Button>
            )}
            <div className="flex-1" />
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : table ? 'Actualizar' : 'Crear Mesa'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
