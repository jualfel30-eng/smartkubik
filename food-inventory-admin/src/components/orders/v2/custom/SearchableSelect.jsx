import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useDebounce } from '@/hooks/use-debounce';

export function SearchableSelect({
  options = [],
  onSelection,
  onInputChange,
  value = null,
  placeholder = '',
  isCreatable = true,
  inputValue, // Opcional
  isLoading = false, // Indicador de carga (modo sync)
  customControlClass = '', // Clases personalizadas para el control
  // Nuevas props para búsqueda async
  asyncSearch = false,
  loadOptions = null,
  minSearchLength = 2,
  debounceMs = 300,
  noOptionsMessage: customNoOptionsMessage = null,
  ...props
}) {
  // States para modo async
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, debounceMs);

  // Effect para cargar opciones remotas
  useEffect(() => {
    if (!asyncSearch || !loadOptions) return;

    const fetchOptions = async () => {
      if (!debouncedSearch || debouncedSearch.length < minSearchLength) {
        setAsyncOptions([]);
        return;
      }

      setAsyncLoading(true);
      try {
        const results = await loadOptions(debouncedSearch);
        setAsyncOptions(results);
      } catch (error) {
        console.error('Error loading options:', error);
        setAsyncOptions([]);
      } finally {
        setAsyncLoading(false);
      }
    };

    fetchOptions();
  }, [debouncedSearch, asyncSearch, loadOptions, minSearchLength]);

  // Determinar qué opciones y loading usar
  const finalOptions = asyncSearch ? asyncOptions : options;
  const finalLoading = asyncSearch ? asyncLoading : isLoading;

  // Usar Select normal si no es creatable, CreatableSelect si lo es
  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const handleChange = (selectedOption, actionMeta) => {
    if (onSelection) {
      onSelection(selectedOption, actionMeta);
    }
  };

  const handleInputChange = (newValue, actionMeta) => {
    if (asyncSearch) {
      setSearchInput(newValue);
    }

    // Llamar callback original si existe
    if (onInputChange) {
      onInputChange(newValue, actionMeta);
    }
  };

  const getNoOptionsMessage = () => {
    if (asyncSearch) {
      if (!searchInput || searchInput.length < minSearchLength) {
        return `Escribe al menos ${minSearchLength} caracteres para buscar...`;
      }
      return customNoOptionsMessage || "No se encontraron productos";
    }
    return "No se encontraron resultados";  // Mensaje original para modo sync
  };

  const classNames = {
    control: ({ isFocused }) => {
      // Si hay clases personalizadas, combinarlas con el estado de focus
      if (customControlClass) {
        const focusClasses = isFocused
          ? "ring-2 ring-ring ring-offset-2"
          : "";
        return `${customControlClass} ${focusClasses}`;
      }
      return isFocused
        ? "flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-2 ring-ring ring-offset-2 ring-offset-background"
        : "flex h-10 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm ring-offset-background";
    },
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
      options={finalOptions}
      onChange={handleChange}
      onInputChange={handleInputChange}
      inputValue={asyncSearch ? searchInput : inputValue}
      value={value}
      placeholder={placeholder}
      isClearable
      isSearchable
      openMenuOnClick
      openMenuOnFocus
      unstyled
      classNames={classNames}

      formatCreateLabel={isCreatable ? (inputValue) => `Crear nuevo: "${inputValue}"` : undefined}
      noOptionsMessage={getNoOptionsMessage}
      isLoading={finalLoading}
      loadingMessage={() => "Buscando..."}
      // Permitir crear opciones con Tab y Enter (solo para CreatableSelect)
      onKeyDown={isCreatable ? (event) => {
        if (event.key === 'Tab' && event.target.value) {
          event.preventDefault();
          // Forzar la creación de la nueva opción
          handleChange({ value: event.target.value, label: event.target.value, __isNew__: true }, { action: 'create-option' });
        }
      } : undefined}
      {...props}
    />
  );
}