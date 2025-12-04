import React, { useEffect, useState } from 'react';
import { useUnitTypes } from '../../hooks/useUnitTypes';
import { UnitType, UnitCategory, UNIT_CATEGORY_LABELS } from '../../types/unit-types';

interface UnitTypeSelectorProps {
  value?: string;
  onChange: (unitTypeId: string | undefined) => void;
  category?: UnitCategory;
  includeCustom?: boolean;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const UnitTypeSelector: React.FC<UnitTypeSelectorProps> = ({
  value,
  onChange,
  category,
  includeCustom = true,
  label = 'Tipo de Unidad',
  placeholder = 'Seleccionar tipo de unidad',
  disabled = false,
  className = '',
}) => {
  const { listUnitTypes, loading, error } = useUnitTypes();
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);

  useEffect(() => {
    const loadUnitTypes = async () => {
      const result = await listUnitTypes({
        category,
        isActive: true,
        ...(includeCustom ? {} : { isSystemDefined: true }),
      });

      if (result.success && result.data) {
        setUnitTypes(result.data);
      }
    };

    loadUnitTypes();
  }, [category, includeCustom, listUnitTypes]);

  // Group unit types by category
  const groupedUnitTypes = unitTypes.reduce((acc, unitType) => {
    const cat = unitType.category;
    if (!acc[cat]) {
      acc[cat] = [];
    }
    acc[cat].push(unitType);
    return acc;
  }, {} as Record<UnitCategory, UnitType[]>);

  return (
    <div className={`unit-type-selector ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || undefined)}
        disabled={disabled || loading}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
      >
        <option value="">{placeholder}</option>

        {Object.entries(groupedUnitTypes).map(([cat, types]) => (
          <optgroup key={cat} label={UNIT_CATEGORY_LABELS[cat as UnitCategory]}>
            {types.map((unitType) => (
              <option key={unitType._id} value={unitType._id}>
                {unitType.name}
                {unitType.isSystemDefined ? '' : ' (Personalizado)'}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cargando tipos de unidades...</p>
      )}
    </div>
  );
};
