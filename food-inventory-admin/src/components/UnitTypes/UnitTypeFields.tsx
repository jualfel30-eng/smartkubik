import React, { useEffect, useState } from 'react';
import { UnitTypeSelector } from './UnitTypeSelector';
import { UnitConversionDisplay } from './UnitConversionDisplay';
import { useUnitTypes } from '../../hooks/useUnitTypes';
import { UnitType } from '../../types/unit-types';

interface UnitTypeFieldsProps {
  unitTypeId?: string;
  defaultUnit?: string;
  purchaseUnit?: string;
  stockUnit?: string;
  consumptionUnit?: string;
  onChange: (data: {
    unitTypeId?: string;
    defaultUnit?: string;
    purchaseUnit?: string;
    stockUnit?: string;
    consumptionUnit?: string;
  }) => void;
  showConversions?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Componente completo para gestionar campos de UnitType en formularios
 * de productos CONSUMABLE o SUPPLY.
 *
 * @example
 * ```tsx
 * <UnitTypeFields
 *   unitTypeId={formData.unitTypeId}
 *   defaultUnit={formData.defaultUnit}
 *   purchaseUnit={formData.purchaseUnit}
 *   stockUnit={formData.stockUnit}
 *   consumptionUnit={formData.consumptionUnit}
 *   onChange={(data) => setFormData({ ...formData, ...data })}
 *   showConversions={true}
 * />
 * ```
 */
export const UnitTypeFields: React.FC<UnitTypeFieldsProps> = ({
  unitTypeId,
  defaultUnit,
  purchaseUnit,
  stockUnit,
  consumptionUnit,
  onChange,
  showConversions = true,
  disabled = false,
  className = '',
}) => {
  const { getUnitType } = useUnitTypes();
  const [selectedUnitType, setSelectedUnitType] = useState<UnitType | null>(null);
  const [availableUnits, setAvailableUnits] = useState<Array<{
    value: string;
    label: string;
  }>>([]);

  // Load selected unit type and available units
  useEffect(() => {
    const loadUnitType = async () => {
      if (!unitTypeId) {
        setSelectedUnitType(null);
        setAvailableUnits([]);
        return;
      }

      const result = await getUnitType(unitTypeId);
      if (result.success && result.data) {
        setSelectedUnitType(result.data);

        // Build available units list
        const units = result.data.conversions.map((conversion) => ({
          value: conversion.unit,
          label: `${conversion.unit} (${conversion.abbreviation})`,
        }));
        setAvailableUnits(units);
      }
    };

    loadUnitType();
  }, [unitTypeId, getUnitType]);

  const handleUnitTypeChange = (newUnitTypeId: string | undefined) => {
    // Clear all unit fields when unit type changes
    onChange({
      unitTypeId: newUnitTypeId,
      defaultUnit: undefined,
      purchaseUnit: undefined,
      stockUnit: undefined,
      consumptionUnit: undefined,
    });
  };

  const handleUnitChange = (field: string, value: string) => {
    onChange({
      unitTypeId,
      defaultUnit,
      purchaseUnit,
      stockUnit,
      consumptionUnit,
      [field]: value,
    });
  };

  return (
    <div className={`unit-type-fields space-y-4 ${className}`}>
      {/* Unit Type Selector */}
      <UnitTypeSelector
        value={unitTypeId}
        onChange={handleUnitTypeChange}
        label="Tipo de Unidad de Medida"
        placeholder="Seleccionar tipo (Peso, Volumen, etc.)"
        disabled={disabled}
      />

      {/* Unit Fields - Only show when unit type is selected */}
      {unitTypeId && selectedUnitType && (
        <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Unidades para "{selectedUnitType.name}"
          </p>

          {/* Default Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad Base <span className="text-red-500">*</span>
            </label>
            <select
              value={defaultUnit || ''}
              onChange={(e) => handleUnitChange('defaultUnit', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              required
            >
              <option value="">Seleccionar unidad base</option>
              {availableUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unidad principal del producto
            </p>
          </div>

          {/* Purchase Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad de Compra
            </label>
            <select
              value={purchaseUnit || ''}
              onChange={(e) => handleUnitChange('purchaseUnit', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Misma que unidad base</option>
              {availableUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unidad al comprar del proveedor
            </p>
          </div>

          {/* Stock Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad de Almacenamiento
            </label>
            <select
              value={stockUnit || ''}
              onChange={(e) => handleUnitChange('stockUnit', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Misma que unidad base</option>
              {availableUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unidad en inventario
            </p>
          </div>

          {/* Consumption Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Unidad de Consumo
            </label>
            <select
              value={consumptionUnit || ''}
              onChange={(e) => handleUnitChange('consumptionUnit', e.target.value)}
              disabled={disabled}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Misma que unidad base</option>
              {availableUnits.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Unidad al usar/consumir
            </p>
          </div>
        </div>
      )}

      {/* Conversion Display */}
      {showConversions && defaultUnit && unitTypeId && (
        <UnitConversionDisplay
          unitTypeId={unitTypeId}
          quantity={1}
          fromUnit={defaultUnit}
          className="mt-3"
        />
      )}
    </div>
  );
};
