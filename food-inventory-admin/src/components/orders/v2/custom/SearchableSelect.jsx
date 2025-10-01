import React, { useState } from 'react';
import CreatableSelect from 'react-select/creatable';

export function SearchableSelect({
  options = [],
  onSelection,
  onInputChange,
  value = null,
  placeholder = '',
  isCreatable = true,
  inputValue, // Opcional
  ...props
}) {
  const [internalInputValue, setInternalInputValue] = useState('');
  
  const isControlled = inputValue !== undefined;
  const currentInputValue = isControlled ? inputValue : internalInputValue;

  const handleInputChange = (newInputValue, actionMeta) => {
    if (actionMeta.action === 'input-change') {
      if (onInputChange) {
        onInputChange(newInputValue, actionMeta);
      }
      
      if (!isControlled) {
        setInternalInputValue(newInputValue);
      }
    }
  };

  const handleChange = (selectedOption, actionMeta) => {
    if (onSelection) {
      onSelection(selectedOption, actionMeta);
    }
    
    if (selectedOption && actionMeta.action === 'select-option') {
      if (onInputChange && isControlled) {
        onInputChange('', { action: 'clear-input' });
      } else if (!isControlled) {
        setInternalInputValue('');
      }
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
    option: ({ isFocused }) =>
      isFocused
        ? "cursor-default rounded-sm bg-accent text-accent-foreground px-2 py-1.5 text-sm"
        : "cursor-default px-2 py-1.5 text-sm",
  };

  return (
    <CreatableSelect
      options={options}
      onChange={handleChange}
      onInputChange={handleInputChange}
      inputValue={currentInputValue}
      value={value}
      placeholder={placeholder}
      isClearable
      isSearchable
      blurInputOnSelect={false}
      openMenuOnClick={true}
      openMenuOnFocus={true}
      unstyled
      classNames={classNames}
      formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`}
      noOptionsMessage={() => "No se encontraron resultados"}
      {...props}
    />
  );
}