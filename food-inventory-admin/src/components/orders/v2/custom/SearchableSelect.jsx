import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

export function SearchableSelect({
  options = [],
  onSelection,
  onInputChange,
  value = null,
  placeholder = '',
  isCreatable = true,
  inputValue, // Opcional
  isLoading = false, // Indicador de carga
  ...props
}) {
  // Usar Select normal si no es creatable, CreatableSelect si lo es
  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const handleChange = (selectedOption, actionMeta) => {
    if (onSelection) {
      onSelection(selectedOption, actionMeta);
    }
  };

  const classNames = {
    control: ({ isFocused }) =>
      isFocused
        ? "flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-2 ring-ring ring-offset-2 ring-offset-background"
        : "flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background",
    valueContainer: () => "p-0 gap-1",
    input: () => "text-sm text-foreground",
    placeholder: () => "text-muted-foreground",
    menu: () => "my-2 z-50 min-w-full overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
    option: ({ isFocused, isSelected }) =>
      isFocused || isSelected
        ? "cursor-default rounded-sm bg-primary/25 text-foreground px-2 py-1.5 text-sm font-medium"
        : "cursor-default px-2 py-1.5 text-sm",
  };

  return (
    <SelectComponent
      options={options}
      onChange={handleChange}
      onInputChange={onInputChange}
      inputValue={inputValue}
      value={value}
      placeholder={placeholder}
      isClearable
      isSearchable
      openMenuOnClick
      openMenuOnFocus
      unstyled
      classNames={classNames}
      formatCreateLabel={isCreatable ? (inputValue) => `Crear nuevo: "${inputValue}"` : undefined}
      noOptionsMessage={() => "No se encontraron resultados"}
      isLoading={isLoading}
      loadingMessage={() => "Buscando..."}
      {...props}
    />
  );
}