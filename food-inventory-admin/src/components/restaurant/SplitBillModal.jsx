import { useState } from 'react';
import { fetchApi } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { X, Users, Receipt, DollarSign, Check } from 'lucide-react';

/**
 * SplitBillModal Component
 * Modal para dividir la cuenta de una orden
 *
 * @param {Object} order - Orden a dividir
 * @param {Function} onClose - Función para cerrar el modal
 * @param {Function} onSuccess - Callback cuando se divide exitosamente
 */
export default function SplitBillModal({ order, onClose, onSuccess }) {
  const [splitType, setSplitType] = useState('by_person'); // 'by_person' | 'by_items'
  const [numberOfPeople, setNumberOfPeople] = useState(2);
  const [tipPercentage, setTipPercentage] = useState(10);
  const [personNames, setPersonNames] = useState(['', '']);
  const [itemAssignments, setItemAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Inicializar assignments cuando cambia numberOfPeople o splitType
  const initializeAssignments = () => {
    if (splitType === 'by_items') {
      const assignments = [];
      for (let i = 0; i < numberOfPeople; i++) {
        assignments.push({
          personName: personNames[i] || `Persona ${i + 1}`,
          itemIds: [],
          tipAmount: 0,
        });
      }
      setItemAssignments(assignments);
    }
  };

  const handleSplitTypeChange = (type) => {
    setSplitType(type);
    if (type === 'by_items') {
      initializeAssignments();
    }
  };

  const handleNumberOfPeopleChange = (value) => {
    const num = parseInt(value) || 2;
    setNumberOfPeople(num);

    // Ajustar array de nombres
    const newNames = [...personNames];
    while (newNames.length < num) {
      newNames.push('');
    }
    setPersonNames(newNames.slice(0, num));

    // Ajustar assignments si está en modo by_items
    if (splitType === 'by_items') {
      const newAssignments = [];
      for (let i = 0; i < num; i++) {
        newAssignments.push(
          itemAssignments[i] || {
            personName: newNames[i] || `Persona ${i + 1}`,
            itemIds: [],
            tipAmount: 0,
          }
        );
      }
      setItemAssignments(newAssignments);
    }
  };

  const handlePersonNameChange = (index, name) => {
    const newNames = [...personNames];
    newNames[index] = name;
    setPersonNames(newNames);

    // Actualizar en assignments si aplica
    if (splitType === 'by_items' && itemAssignments[index]) {
      const newAssignments = [...itemAssignments];
      newAssignments[index].personName = name || `Persona ${index + 1}`;
      setItemAssignments(newAssignments);
    }
  };

  const toggleItemAssignment = (personIndex, itemId) => {
    const newAssignments = [...itemAssignments];
    const itemIds = newAssignments[personIndex].itemIds;

    if (itemIds.includes(itemId)) {
      newAssignments[personIndex].itemIds = itemIds.filter((id) => id !== itemId);
    } else {
      // Remover de otros si ya está asignado
      newAssignments.forEach((assignment, idx) => {
        if (idx !== personIndex) {
          assignment.itemIds = assignment.itemIds.filter((id) => id !== itemId);
        }
      });

      newAssignments[personIndex].itemIds = [...itemIds, itemId];
    }

    setItemAssignments(newAssignments);
  };

  const calculateSplitPreview = () => {
    if (splitType === 'by_person') {
      const baseAmount = order.totalAmount;
      const tipTotal = (baseAmount * tipPercentage) / 100;
      const grandTotal = baseAmount + tipTotal;
      const amountPerPerson = grandTotal / numberOfPeople;
      const tipPerPerson = tipTotal / numberOfPeople;

      return {
        baseAmount,
        tipTotal,
        grandTotal,
        perPerson: amountPerPerson,
        tipPerPerson,
      };
    } else {
      // by_items
      const parts = itemAssignments.map((assignment) => {
        let subtotal = 0;
        assignment.itemIds.forEach((itemId) => {
          const item = order.items.find((i) => i._id === itemId);
          if (item) {
            subtotal += item.finalPrice || item.totalPrice;
          }
        });

        const tip = (subtotal * tipPercentage) / 100;
        return {
          personName: assignment.personName,
          subtotal,
          tip,
          total: subtotal + tip,
        };
      });

      const totalTips = parts.reduce((sum, p) => sum + p.tip, 0);

      return {
        parts,
        baseAmount: order.totalAmount,
        tipTotal: totalTips,
        grandTotal: order.totalAmount + totalTips,
      };
    }
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      let response;

      if (splitType === 'by_person') {
        response = await fetchApi('/bill-splits/split-equally', {
          method: 'POST',
          body: JSON.stringify({
            orderId: order._id,
            numberOfPeople,
            tipPercentage,
            personNames: personNames.filter((n) => n.trim() !== ''),
          }),
        });
      } else {
        // Validar que todos los items estén asignados
        const allItemIds = order.items.map((item) => item._id);
        const assignedItemIds = new Set();
        itemAssignments.forEach((assignment) => {
          assignment.itemIds.forEach((id) => assignedItemIds.add(id));
        });

        const unassignedItems = allItemIds.filter(
          (id) => !assignedItemIds.has(id)
        );

        if (unassignedItems.length > 0) {
          setError(
            `Todos los items deben ser asignados. Faltan ${unassignedItems.length} items.`
          );
          setLoading(false);
          return;
        }

        response = await fetchApi('/bill-splits/split-by-items', {
          method: 'POST',
          body: JSON.stringify({
            orderId: order._id,
            assignments: itemAssignments.map((a) => ({
              personName: a.personName || 'Sin nombre',
              itemIds: a.itemIds,
              tipAmount: undefined, // Se calcula con tipPercentage
            })),
            tipPercentage,
          }),
        });
      }

      onSuccess(response);
    } catch (err) {
      setError(err.message || 'Error al dividir la cuenta');
      setLoading(false);
    }
  };

  const preview = calculateSplitPreview();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Receipt className="w-6 h-6 text-blue-600" />
            Dividir Cuenta
          </h2>
          <p className="text-gray-600 mt-1">
            Orden #{order.orderNumber} - Total: ${order.totalAmount.toFixed(2)}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Tipo de División */}
          <div>
            <Label>Tipo de División</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <button
                onClick={() => handleSplitTypeChange('by_person')}
                className={`
                  p-4 border-2 rounded-lg transition-all
                  ${
                    splitType === 'by_person'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Users className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium">Dividir Equitativamente</p>
                <p className="text-xs text-gray-500 mt-1">
                  Igual entre todas las personas
                </p>
              </button>

              <button
                onClick={() => handleSplitTypeChange('by_items')}
                className={`
                  p-4 border-2 rounded-lg transition-all
                  ${
                    splitType === 'by_items'
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <Receipt className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <p className="font-medium">Por Items</p>
                <p className="text-xs text-gray-500 mt-1">
                  Cada quien paga lo suyo
                </p>
              </button>
            </div>
          </div>

          {/* Número de Personas */}
          <div>
            <Label htmlFor="numberOfPeople">Número de Personas</Label>
            <Input
              id="numberOfPeople"
              type="number"
              min="2"
              max="20"
              value={numberOfPeople}
              onChange={(e) => handleNumberOfPeopleChange(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* Propina */}
          <div>
            <Label htmlFor="tipPercentage">Propina (%)</Label>
            <div className="flex gap-2 mt-2">
              {[0, 5, 10, 15, 20].map((tip) => (
                <Button
                  key={tip}
                  type="button"
                  variant={tipPercentage === tip ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTipPercentage(tip)}
                >
                  {tip}%
                </Button>
              ))}
              <Input
                id="tipPercentage"
                type="number"
                min="0"
                max="100"
                value={tipPercentage}
                onChange={(e) => setTipPercentage(parseFloat(e.target.value) || 0)}
                className="w-20"
              />
            </div>
          </div>

          {/* Nombres de Personas */}
          <div>
            <Label>Nombres (Opcional)</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {Array.from({ length: numberOfPeople }).map((_, index) => (
                <Input
                  key={index}
                  placeholder={`Persona ${index + 1}`}
                  value={personNames[index] || ''}
                  onChange={(e) => handlePersonNameChange(index, e.target.value)}
                />
              ))}
            </div>
          </div>

          {/* Asignación de Items (solo en modo by_items) */}
          {splitType === 'by_items' && (
            <div>
              <Label>Asignar Items a Cada Persona</Label>
              <div className="mt-3 space-y-4">
                {itemAssignments.map((assignment, personIndex) => (
                  <div
                    key={personIndex}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <h4 className="font-medium text-gray-900 mb-3">
                      {assignment.personName}
                    </h4>
                    <div className="space-y-2">
                      {order.items.map((item) => {
                        const isAssigned = assignment.itemIds.includes(item._id);
                        const assignedToOther = itemAssignments.some(
                          (a, idx) =>
                            idx !== personIndex && a.itemIds.includes(item._id)
                        );

                        return (
                          <button
                            key={item._id}
                            onClick={() =>
                              toggleItemAssignment(personIndex, item._id)
                            }
                            disabled={assignedToOther && !isAssigned}
                            className={`
                              w-full text-left p-3 border rounded transition-all
                              ${
                                isAssigned
                                  ? 'border-blue-500 bg-blue-50'
                                  : assignedToOther
                                  ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                                  : 'border-gray-300 hover:border-gray-400'
                              }
                            `}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {isAssigned && (
                                  <Check className="w-4 h-4 text-blue-600" />
                                )}
                                <span className="font-medium">
                                  {item.productName}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  x{item.quantity}
                                </Badge>
                              </div>
                              <span className="font-semibold">
                                ${(item.finalPrice || item.totalPrice).toFixed(2)}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 flex items-center gap-2 mb-3">
              <DollarSign className="w-5 h-5" />
              Vista Previa de la División
            </h3>

            {splitType === 'by_person' ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">
                    ${preview.baseAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Propina ({tipPercentage}%):</span>
                  <span className="font-medium">
                    ${preview.tipTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="font-semibold text-gray-900">
                    Total a Dividir:
                  </span>
                  <span className="font-semibold text-gray-900">
                    ${preview.grandTotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-blue-300">
                  <span className="font-bold text-blue-900">
                    Por Persona:
                  </span>
                  <span className="font-bold text-blue-900 text-lg">
                    ${preview.perPerson.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  (Incluye ${preview.tipPerPerson.toFixed(2)} de propina)
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {preview.parts.map((part, idx) => (
                  <div key={idx} className="bg-white rounded p-3 space-y-1">
                    <p className="font-medium text-gray-900">{part.personName}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>${part.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Propina:</span>
                      <span>${part.tip.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-1 border-t">
                      <span>Total:</span>
                      <span className="text-blue-600">${part.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between pt-2 border-t border-blue-300 font-bold text-blue-900">
                  <span>Gran Total:</span>
                  <span>${preview.grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Dividiendo...' : 'Dividir Cuenta'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
