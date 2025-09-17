import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Command, CommandGroup, CommandItem, CommandInput } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const MultiSelectCombobox = ({ options, value, onChange, placeholder }) => {
  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  const handleUnselect = (item) => {
    onChange(value.filter((v) => v !== item));
  };

  const handleAddTag = (tag) => {
    const newTag = tag.trim();
    if (newTag && !value.includes(newTag)) {
      onChange([...value, newTag]);
    }
    setInputValue('');
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue) {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  const selectables = options.filter((option) => !value.includes(option.value));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="group w-full min-h-10 border border-input rounded-md px-3 py-2 flex items-center flex-wrap gap-2 cursor-text" onClick={() => setOpen(true)}>
          {value.map((item) => (
            <Badge key={item} variant="secondary">
              {item}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnselect(item);
                }}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <span className="text-muted-foreground">{value.length === 0 ? placeholder : ''}</span>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command onKeyDown={handleKeyDown}>
          <CommandInput
            placeholder="Buscar o crear..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandGroup className="h-full max-h-48 overflow-auto">
            {selectables.map((option) => (
              <CommandItem
                key={option.value}
                onSelect={() => handleAddTag(option.value)}
              >
                {option.label}
              </CommandItem>
            ))}
            {inputValue && !options.some(o => o.value === inputValue) && (
              <CommandItem onSelect={() => handleAddTag(inputValue)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear "{inputValue}"
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { MultiSelectCombobox };
