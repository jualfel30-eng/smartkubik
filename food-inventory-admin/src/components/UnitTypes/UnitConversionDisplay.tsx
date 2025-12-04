import React, { useEffect, useState } from 'react';
import { useUnitTypes } from '../../hooks/useUnitTypes';
import { UnitType, UnitConversionRule } from '../../types/unit-types';

interface UnitConversionDisplayProps {
  unitTypeId: string;
  quantity?: number;
  fromUnit?: string;
  className?: string;
}

export const UnitConversionDisplay: React.FC<UnitConversionDisplayProps> = ({
  unitTypeId,
  quantity = 1,
  fromUnit,
  className = '',
}) => {
  const { getUnitType, loading } = useUnitTypes();
  const [unitType, setUnitType] = useState<UnitType | null>(null);
  const [conversions, setConversions] = useState<Array<{
    unit: string;
    quantity: number;
    abbreviation: string;
  }>>([]);

  useEffect(() => {
    const loadUnitType = async () => {
      const result = await getUnitType(unitTypeId);
      if (result.success && result.data) {
        setUnitType(result.data);
      }
    };

    loadUnitType();
  }, [unitTypeId, getUnitType]);

  useEffect(() => {
    if (!unitType || !fromUnit) {
      setConversions([]);
      return;
    }

    // Find the conversion rule for the fromUnit
    const fromConversion = unitType.conversions.find(
      (c) => c.unit === fromUnit || c.abbreviation === fromUnit
    );

    if (!fromConversion) {
      setConversions([]);
      return;
    }

    // Convert to base unit first
    const baseQuantity = quantity * fromConversion.factor;

    // Calculate conversions to all other units
    const allConversions = unitType.conversions
      .filter((c) => c.unit !== fromUnit && c.abbreviation !== fromUnit)
      .map((conversion) => {
        const convertedQty = baseQuantity / conversion.factor;
        return {
          unit: conversion.unit,
          quantity: Math.round(convertedQty * 100000) / 100000, // 5 decimals
          abbreviation: conversion.abbreviation,
        };
      })
      .filter((c) => c.quantity > 0.00001) // Filter very small quantities
      .sort((a, b) => b.quantity - a.quantity); // Sort by quantity descending

    setConversions(allConversions);
  }, [unitType, fromUnit, quantity]);

  if (loading) {
    return (
      <div className={`unit-conversion-display ${className}`}>
        <p className="text-sm text-gray-500 dark:text-gray-400">Cargando conversiones...</p>
      </div>
    );
  }

  if (!unitType || !fromUnit || conversions.length === 0) {
    return null;
  }

  return (
    <div className={`unit-conversion-display ${className}`}>
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
        <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
          Equivalencias de {quantity} {fromUnit}:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {conversions.slice(0, 6).map((conversion, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-xs text-blue-800 dark:text-blue-300"
            >
              <span className="font-medium">{conversion.quantity}</span>
              <span className="text-blue-600 dark:text-blue-400">
                {conversion.abbreviation}
              </span>
            </div>
          ))}
        </div>
        {conversions.length > 6 && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
            +{conversions.length - 6} más...
          </p>
        )}
      </div>
    </div>
  );
};
