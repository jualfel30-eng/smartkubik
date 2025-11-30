import { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { X, Plus, Minus, AlertCircle } from 'lucide-react';

/**
 * ModifierSelector Component
 * Modal para seleccionar modificadores al agregar un producto a una orden
 *
 * @param {Object} product - Producto seleccionado
 * @param {Function} onClose - Función para cerrar el modal
 * @param {Function} onConfirm - Función que recibe los modificadores seleccionados y special instructions
 */
export default function ModifierSelector({ product, onClose, onConfirm }) {
  const [modifierGroups, setModifierGroups] = useState([]);
  const [selectedModifiers, setSelectedModifiers] = useState({}); // { modifierId: quantity }
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchModifierGroups = useCallback(async () => {
    try {
      setLoading(true);
      const groups = await fetchApi(`/modifier-groups/product/${product._id}`);
      setModifierGroups(groups);

      // Inicializar selected modifiers con defaults si required
      const defaults = {};
      groups.forEach(group => {
        if (group.required && group.modifiers?.length > 0) {
          // Si es single y required, seleccionar el primero por defecto
          if (group.selectionType === 'single') {
            defaults[group.modifiers[0]._id] = 1;
          }
        }
      });
      setSelectedModifiers(defaults);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching modifier groups:', error);
      setLoading(false);
    }
  }, [product._id]);

  useEffect(() => {
    fetchModifierGroups();
  }, [product._id, fetchModifierGroups]);

  const handleModifierToggle = (modifier, group) => {
    const newSelected = { ...selectedModifiers };

    if (group.selectionType === 'single') {
      // Radio behavior: deseleccionar otros del mismo grupo
      group.modifiers.forEach(m => {
        if (m._id !== modifier._id) {
          delete newSelected[m._id];
        }
      });

      // Toggle el seleccionado
      if (newSelected[modifier._id]) {
        delete newSelected[modifier._id];
      } else {
        newSelected[modifier._id] = 1;
      }
    } else {
      // Checkbox behavior: toggle individual
      if (newSelected[modifier._id]) {
        delete newSelected[modifier._id];
      } else {
        newSelected[modifier._id] = 1;
      }
    }

    setSelectedModifiers(newSelected);

    // Clear error for this group if fixed
    if (errors[group._id]) {
      validateGroup(group, newSelected);
    }
  };

  const handleModifierQuantityChange = (modifierId, delta) => {
    const newSelected = { ...selectedModifiers };
    const current = newSelected[modifierId] || 0;
    const newQuantity = Math.max(0, current + delta);

    if (newQuantity === 0) {
      delete newSelected[modifierId];
    } else {
      newSelected[modifierId] = newQuantity;
    }

    setSelectedModifiers(newSelected);
  };

  const validateGroup = (group, selected = selectedModifiers) => {
    const groupModifiers = group.modifiers.filter(m => selected[m._id]);
    const count = groupModifiers.length;

    if (group.required && count === 0) {
      return `Debes seleccionar al menos una opción`;
    }

    if (group.minSelections && count < group.minSelections) {
      return `Debes seleccionar al menos ${group.minSelections} opciones`;
    }

    if (group.maxSelections && count > group.maxSelections) {
      return `Puedes seleccionar máximo ${group.maxSelections} opciones`;
    }

    return null;
  };

  const validateAll = () => {
    const newErrors = {};
    let isValid = true;

    modifierGroups.forEach(group => {
      const error = validateGroup(group);
      if (error) {
        newErrors[group._id] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const calculateTotalAdjustment = () => {
    let total = 0;

    modifierGroups.forEach(group => {
      group.modifiers.forEach(modifier => {
        const quantity = selectedModifiers[modifier._id] || 0;
        if (quantity > 0) {
          total += modifier.priceAdjustment * quantity;
        }
      });
    });

    return total;
  };

  const handleConfirm = () => {
    if (!validateAll()) {
      return;
    }

    setSubmitting(true);

    // Construir array de modifiers aplicados
    const appliedModifiers = [];

    modifierGroups.forEach(group => {
      group.modifiers.forEach(modifier => {
        const quantity = selectedModifiers[modifier._id] || 0;
        if (quantity > 0) {
          appliedModifiers.push({
            modifierId: modifier._id,
            name: modifier.name,
            priceAdjustment: modifier.priceAdjustment,
            quantity,
          });
        }
      });
    });

    onConfirm({
      modifiers: appliedModifiers,
      specialInstructions: specialInstructions.trim() || undefined,
      priceAdjustment: calculateTotalAdjustment(),
    });
  };

  const handleSkip = () => {
    onConfirm({
      modifiers: [],
      specialInstructions: specialInstructions.trim() || undefined,
      priceAdjustment: 0,
    });
  };

  const formatPrice = (price) => {
    if (price === 0) return '';
    const sign = price > 0 ? '+' : '';
    return `${sign}$${price.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando opciones...</p>
        </div>
      </div>
    );
  }

  const totalAdjustment = calculateTotalAdjustment();
  const finalPrice = product.price + totalAdjustment;
  const hasModifierGroups = modifierGroups.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-gray-900">{product.name}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg font-semibold text-gray-900">
              ${finalPrice.toFixed(2)}
            </span>
            {totalAdjustment !== 0 && (
              <Badge variant="outline" className="text-sm">
                {formatPrice(totalAdjustment)} ajuste
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!hasModifierGroups ? (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                Este producto no tiene modificadores disponibles
              </p>
            </div>
          ) : (
            modifierGroups.map((group) => (
              <div key={group._id} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {group.name}
                      {group.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </h3>
                    {group.description && (
                      <p className="text-sm text-gray-500">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {group.selectionType === 'single'
                        ? 'Selecciona una opción'
                        : group.maxSelections
                        ? `Selecciona hasta ${group.maxSelections}`
                        : 'Selecciona todas las que quieras'}
                    </p>
                  </div>
                </div>

                {errors[group._id] && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors[group._id]}
                  </div>
                )}

                <div className="space-y-2">
                  {group.modifiers.map((modifier) => {
                    const isSelected = !!selectedModifiers[modifier._id];
                    const quantity = selectedModifiers[modifier._id] || 0;
                    const showQuantity = group.selectionType === 'multiple' && isSelected;

                    return (
                      <div
                        key={modifier._id}
                        className={`
                          p-3 border-2 rounded-lg transition-all cursor-pointer
                          ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                        onClick={() => handleModifierToggle(modifier, group)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`
                                w-5 h-5 rounded-full border-2 flex items-center justify-center
                                ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500'
                                    : 'border-gray-300'
                                }
                              `}
                            >
                              {isSelected && (
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {modifier.name}
                              </p>
                              {modifier.description && (
                                <p className="text-sm text-gray-500">
                                  {modifier.description}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {showQuantity && (
                              <div className="flex items-center gap-2 bg-white rounded-lg px-2 py-1 border" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifierQuantityChange(modifier._id, -1);
                                  }}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-medium min-w-[20px] text-center">
                                  {quantity}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleModifierQuantityChange(modifier._id, 1);
                                  }}
                                  className="text-gray-600 hover:text-gray-900"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {modifier.priceAdjustment !== 0 && (
                              <span className="text-sm font-medium text-gray-700">
                                {formatPrice(modifier.priceAdjustment * (quantity || 1))}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}

          {/* Special Instructions */}
          <div className="pt-4 border-t">
            <Label htmlFor="specialInstructions">
              Instrucciones Especiales{' '}
              <span className="text-gray-400 font-normal">(Opcional)</span>
            </Label>
            <textarea
              id="specialInstructions"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="Ej: Sin cebolla, punto medio, alergia a mariscos..."
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {specialInstructions.length}/500 caracteres
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            {!hasModifierGroups && (
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
            )}
            {hasModifierGroups && modifierGroups.every(g => !g.required) && (
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                disabled={submitting}
                className="flex-1"
              >
                Omitir
              </Button>
            )}
            <Button
              onClick={handleConfirm}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? 'Agregando...' : 'Agregar al Pedido'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
