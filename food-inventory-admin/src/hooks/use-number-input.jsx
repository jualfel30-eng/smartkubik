import { useState, useCallback } from 'react';

/**
 * Hook personalizado para manejar inputs numéricos sin el molesto 0 forzado
 *
 * @param {number|string} initialValue - Valor inicial
 * @param {Object} options - Opciones de configuración
 * @param {number} options.min - Valor mínimo permitido
 * @param {number} options.max - Valor máximo permitido
 * @param {number} options.step - Incremento/decremento (0.01 para decimales, 1 para enteros)
 * @param {boolean} options.allowEmpty - Permitir valor vacío (default: true)
 * @param {boolean} options.allowNegative - Permitir valores negativos (default: true)
 * @returns {Object} { value, numericValue, handleChange, handleBlur, setValue, reset }
 */
export function useNumberInput(initialValue = '', options = {}) {
  const {
    min,
    max,
    step = 1,
    allowEmpty = true,
    allowNegative = true,
  } = options;

  // El estado interno almacena el valor como string para permitir edición fluida
  const [displayValue, setDisplayValue] = useState(
    initialValue === null || initialValue === undefined || initialValue === ''
      ? ''
      : String(initialValue)
  );

  /**
   * Parsea el valor a número según el step
   */
  const parseValue = useCallback((value) => {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numValue = step < 1 ? parseFloat(value) : parseInt(value, 10);

    if (isNaN(numValue)) {
      return null;
    }

    return numValue;
  }, [step]);

  /**
   * Valida el valor contra restricciones
   */
  const validateValue = useCallback((numValue) => {
    if (numValue === null) return true;

    if (!allowNegative && numValue < 0) return false;
    if (min !== undefined && numValue < min) return false;
    if (max !== undefined && numValue > max) return false;

    return true;
  }, [min, max, allowNegative]);

  /**
   * Maneja el cambio del input
   */
  const handleChange = useCallback((e) => {
    const rawValue = e.target.value;

    // Permitir vacío mientras escribe
    if (rawValue === '') {
      setDisplayValue('');
      return;
    }

    // Permitir signos negativos temporales
    if (allowNegative && (rawValue === '-' || rawValue === '-.')) {
      setDisplayValue(rawValue);
      return;
    }

    // Permitir punto decimal temporal
    if (step < 1 && rawValue === '.') {
      setDisplayValue('0.');
      return;
    }

    // Permitir escribir decimales temporales como "0."
    if (step < 1 && /^-?\d*\.?$/.test(rawValue)) {
      setDisplayValue(rawValue);
      return;
    }

    // Validar formato numérico
    const regex = step < 1
      ? /^-?\d*\.?\d*$/  // Permite decimales
      : /^-?\d*$/;       // Solo enteros

    if (!regex.test(rawValue)) {
      return; // Ignora entrada inválida
    }

    setDisplayValue(rawValue);
  }, [step, allowNegative]);

  /**
   * Maneja el blur (cuando sale del input)
   */
  const handleBlur = useCallback(() => {
    if (displayValue === '' || displayValue === '-' || displayValue === '.') {
      if (!allowEmpty) {
        setDisplayValue('0');
      } else {
        setDisplayValue('');
      }
      return;
    }

    const numValue = parseValue(displayValue);

    if (numValue === null) {
      setDisplayValue(allowEmpty ? '' : '0');
      return;
    }

    // Aplicar restricciones
    let finalValue = numValue;

    if (!allowNegative && finalValue < 0) {
      finalValue = 0;
    }
    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }
    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    // Formatear según step
    if (step < 1) {
      // Para decimales, mantener precisión
      setDisplayValue(finalValue.toString());
    } else {
      // Para enteros, asegurar que no tenga decimales
      setDisplayValue(Math.round(finalValue).toString());
    }
  }, [displayValue, parseValue, allowEmpty, allowNegative, min, max, step]);

  /**
   * Obtiene el valor numérico actual (para usar en el estado del componente)
   */
  const numericValue = useCallback(() => {
    if (displayValue === '' || displayValue === '-' || displayValue === '.') {
      return null;
    }
    return parseValue(displayValue);
  }, [displayValue, parseValue]);

  /**
   * Establece el valor programáticamente
   */
  const setValue = useCallback((newValue) => {
    if (newValue === null || newValue === undefined || newValue === '') {
      setDisplayValue('');
    } else {
      setDisplayValue(String(newValue));
    }
  }, []);

  /**
   * Resetea al valor inicial
   */
  const reset = useCallback(() => {
    setDisplayValue(
      initialValue === null || initialValue === undefined || initialValue === ''
        ? ''
        : String(initialValue)
    );
  }, [initialValue]);

  return {
    // Valor para mostrar en el input
    value: displayValue,

    // Valor numérico para usar en el estado (puede ser null si está vacío)
    numericValue: numericValue(),

    // Handlers para el input
    handleChange,
    handleBlur,

    // Métodos para control programático
    setValue,
    reset,
  };
}

/**
 * Hook simplificado para inputs numéricos con valor por defecto 0
 * (útil cuando no quieres permitir valores vacíos)
 */
export function useNumberInputWithDefault(initialValue = 0, options = {}) {
  return useNumberInput(initialValue, { ...options, allowEmpty: false });
}
