import * as React from "react"
import { Input } from "./input"
import { useNumberInput } from "../../hooks/use-number-input"

/**
 * NumberInput - Input numérico sin el molesto 0 forzado
 *
 * @example
 * // Uso básico (permite vacío, se convierte a null)
 * <NumberInput
 *   value={quantity}
 *   onValueChange={(val) => setQuantity(val)}
 *   placeholder="Cantidad"
 * />
 *
 * @example
 * // Con validaciones
 * <NumberInput
 *   value={price}
 *   onValueChange={(val) => setPrice(val)}
 *   step={0.01}
 *   min={0}
 *   max={9999.99}
 *   placeholder="Precio"
 * />
 *
 * @example
 * // No permitir vacío (siempre tiene valor, mínimo 0)
 * <NumberInput
 *   value={stock}
 *   onValueChange={(val) => setStock(val)}
 *   allowEmpty={false}
 *   min={0}
 * />
 */
export const NumberInput = React.forwardRef(({
  value: externalValue,
  onValueChange,
  onChange: onChangeProp,
  onBlur: onBlurProp,
  step = 1,
  min,
  max,
  allowEmpty = true,
  allowNegative = true,
  className,
  ...props
}, ref) => {
  const {
    value: displayValue,
    numericValue,
    handleChange: internalHandleChange,
    handleBlur: internalHandleBlur,
    setValue,
  } = useNumberInput(externalValue, {
    step,
    min,
    max,
    allowEmpty,
    allowNegative,
  });

  // Sincronizar con valor externo cuando cambie
  const prevExternalValue = React.useRef(externalValue);
  React.useEffect(() => {
    if (prevExternalValue.current !== externalValue) {
      prevExternalValue.current = externalValue;
      setValue(externalValue);
    }
  }, [externalValue, setValue]);

  const handleChange = React.useCallback((e) => {
    internalHandleChange(e);

    // Notificar cambio inmediatamente si hay callback
    if (onChangeProp) {
      onChangeProp(e);
    }
  }, [internalHandleChange, onChangeProp]);

  const handleBlur = React.useCallback((e) => {
    internalHandleBlur();

    // Notificar el valor numérico final después del blur
    if (onValueChange) {
      // Parsear el valor final después del blur
      const finalValue = e.target.value === ''
        ? (allowEmpty ? null : 0)
        : (step < 1 ? parseFloat(e.target.value) : parseInt(e.target.value, 10));

      // Solo notificar si el valor cambió
      if (finalValue !== externalValue) {
        onValueChange(finalValue);
      }
    }

    if (onBlurProp) {
      onBlurProp(e);
    }
  }, [internalHandleBlur, onValueChange, onBlurProp, allowEmpty, step, externalValue]);

  return (
    <Input
      ref={ref}
      type="text"
      inputMode={step < 1 ? "decimal" : "numeric"}
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
});

NumberInput.displayName = "NumberInput";

/**
 * NumberInputSimple - Versión simplificada que siempre tiene un valor (nunca null)
 * Útil para campos que siempre deben tener un número
 */
export const NumberInputSimple = React.forwardRef((props, ref) => {
  return <NumberInput ref={ref} allowEmpty={false} {...props} />;
});

NumberInputSimple.displayName = "NumberInputSimple";
