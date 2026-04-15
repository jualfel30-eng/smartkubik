import { Search, X } from 'lucide-react';

/**
 * MobileSearchBar — consistent search input for mobile list views.
 *
 * @param {string}   value        Controlled value
 * @param {function} onChange     onChange handler (receives string)
 * @param {string}   placeholder  Input placeholder
 * @param {string}   className    Additional wrapper classes
 */
export default function MobileSearchBar({ value, onChange, placeholder = 'Buscar…', className = '' }) {
  return (
    <div className={`flex items-center gap-2 rounded-2xl bg-muted px-3 border border-border ${className}`}>
      <Search size={16} className="text-muted-foreground shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent py-3 text-base outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="tap-target no-tap-highlight text-muted-foreground"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
