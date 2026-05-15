import React, { useState, useEffect, useRef, useMemo } from 'react';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import { useDebounce } from '@/hooks/use-debounce';

const CREATE_NEW_SENTINEL = '__smartkubik_create_new__';

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
  // "+ Crear nuevo" inline action — distinct from `isCreatable` which produces
  // typed __isNew__ entries. When set, appends a synthetic row at the bottom of
  // the dropdown (when query.length >= minSearchLength) that fires the callback
  // instead of selecting a value.
  onCreateNewOption = null,
  createNewOptionLabel = null,
  ...props
}) {
  // States para modo async
  const [asyncOptions, setAsyncOptions] = useState([]);
  const [asyncLoading, setAsyncLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, debounceMs);
  const selectRef = useRef(null);
  const hadFocusBeforeLoad = useRef(false);

  // Effect para cargar opciones remotas
  useEffect(() => {
    if (!asyncSearch || !loadOptions) return;

    const fetchOptions = async () => {
      if (!debouncedSearch || debouncedSearch.length < minSearchLength) {
        setAsyncOptions([]);
        return;
      }

      // Remember if input was focused before loading
      hadFocusBeforeLoad.current = selectRef.current?.inputRef === document.activeElement;
      setAsyncLoading(true);
      try {
        const results = await loadOptions(debouncedSearch);
        setAsyncOptions(results);
      } catch (error) {
        console.error('Error loading options:', error);
        setAsyncOptions([]);
      } finally {
        setAsyncLoading(false);
        // Restore focus if input was focused before loading
        if (hadFocusBeforeLoad.current) {
          requestAnimationFrame(() => {
            selectRef.current?.focus();
          });
        }
      }
    };

    fetchOptions();
  }, [debouncedSearch, asyncSearch, loadOptions, minSearchLength]);

  // Determinar qué opciones y loading usar
  const baseOptions = asyncSearch ? asyncOptions : options;
  const finalLoading = asyncSearch ? asyncLoading : isLoading;

  // Appends a synthetic "+ Crear nuevo" row at the end when the query is long
  // enough and the parent passed `onCreateNewOption`. Distinct from the
  // existing `__isNew__` creatable behavior (which keeps the typed string as
  // the value). The synthetic row carries `__isCreateNew__: true` and the raw
  // query, intercepted in `handleChange` before propagating selection.
  const finalOptions = useMemo(() => {
    if (!onCreateNewOption) return baseOptions;
    const query = (asyncSearch ? searchInput : (inputValue || '')).trim();
    if (!query || query.length < minSearchLength) return baseOptions;
    const labelFn = createNewOptionLabel
      || ((q) => `+ Crear producto nuevo: "${q}"`);
    return [
      ...baseOptions,
      {
        value: CREATE_NEW_SENTINEL,
        label: labelFn(query),
        __isCreateNew__: true,
        __query__: query,
      },
    ];
  }, [
    baseOptions,
    asyncSearch,
    searchInput,
    inputValue,
    minSearchLength,
    onCreateNewOption,
    createNewOptionLabel,
  ]);

  // Usar Select normal si no es creatable, CreatableSelect si lo es
  const SelectComponent = isCreatable ? CreatableSelect : Select;

  const handleChange = (selectedOption, actionMeta) => {
    if (selectedOption?.__isCreateNew__) {
      onCreateNewOption?.(selectedOption.__query__);
      // Reset the input so the dropdown closes; do NOT propagate as a selection
      if (asyncSearch) setSearchInput('');
      return;
    }
    if (onSelection) {
      onSelection(selectedOption, actionMeta);
    }
  };

  const handleInputChange = (newValue, actionMeta) => {
    if (asyncSearch) {
      // Only update search on actual typing or explicit selection/clear
      // Prevents focus loss from 'menu-close' and 'input-blur' actions clearing the input
      if (actionMeta.action === 'input-change') {
        setSearchInput(newValue);
      } else if (actionMeta.action === 'set-value' || actionMeta.action === 'select-option') {
        setSearchInput('');
      }
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
      ref={selectRef}
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
        const currentValue = asyncSearch ? searchInput : event.target.value;
        const shouldCreate = (event.key === 'Tab' || event.key === 'Enter') && currentValue && currentValue.trim();

        if (shouldCreate) {
          // En modo async, verificar que no hay opciones disponibles o que el menú está cerrado
          const hasOptions = asyncSearch ? asyncOptions.length > 0 : options.length > 0;

          // Solo crear automáticamente si no hay opciones para seleccionar
          if (!hasOptions || event.key === 'Tab') {
            event.preventDefault();
            const trimmedValue = currentValue.trim();
            handleChange({
              value: trimmedValue,
              label: trimmedValue,
              __isNew__: true
            }, { action: 'create-option' });

            // NO limpiar el searchInput aquí - dejar que handleInputChange lo maneje
            // cuando reciba la acción 'set-value' desde react-select
          }
        }
      } : undefined}
      filterOption={asyncSearch ? null : undefined}
      {...props}
    />
  );
}