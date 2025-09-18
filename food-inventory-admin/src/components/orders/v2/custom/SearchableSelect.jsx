import React from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

/**
 * A generic, styled, searchable select component that can optionally be creatable.
 * It uses Tailwind CSS classes to match the project's shadcn/ui theme.
 * @param {boolean} isCreatable - If true, renders a CreatableSelect, otherwise a standard Select.
 */
export function SearchableSelect({
  options,
  onSelection,
  value,
  placeholder,
  isCreatable = false,
  ...props
}) {
  const Component = isCreatable ? CreatableSelect : Select;

  const handleChange = (selectedOption) => {
    onSelection(selectedOption);
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
    clearIndicator: () => "text-muted-foreground hover:text-foreground p-1",
    dropdownIndicator: () => "text-muted-foreground hover:text-foreground p-1",
    indicatorSeparator: () => "bg-border mx-1",
  };

  return (
    <Component
      {...props}
      isClearable
      onChange={handleChange}
      options={options}
      value={value}
      placeholder={placeholder}
      unstyled
      classNames={classNames}
      formatCreateLabel={(inputValue) => `Crear nuevo: "${inputValue}"`}
      noOptionsMessage={() => "No se encontraron resultados"}
    />
  );
}
