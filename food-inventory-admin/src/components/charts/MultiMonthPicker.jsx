import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { CalendarRange, X, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

const MONTH_FULL = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const QUICK_SELECTS = [
  { label: 'Q1', months: [0, 1, 2] },
  { label: 'Q2', months: [3, 4, 5] },
  { label: 'Q3', months: [6, 7, 8] },
  { label: 'Q4', months: [9, 10, 11] },
  { label: 'H1', months: [0, 1, 2, 3, 4, 5] },
  { label: 'H2', months: [6, 7, 8, 9, 10, 11] },
  { label: 'Todo', months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
];

function buildYearOptions() {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Shared multi-month picker with checkboxes and quick-select buttons.
 *
 * Props:
 *  - onApply(fromISO, toISO)  called with the min/max date range of selected months
 *  - onClose()                closes the panel
 */
export function MultiMonthPicker({ onApply, onClose }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [selected, setSelected] = useState(new Set([now.getMonth()]));

  const toggle = (m) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const applyQuick = (months) => {
    setSelected(new Set(months));
  };

  const handleApply = () => {
    if (selected.size === 0) return;
    const sorted = Array.from(selected).sort((a, b) => a - b);
    const fromMonth = sorted[0];
    const toMonth = sorted[sorted.length - 1];
    const from = new Date(year, fromMonth, 1, 0, 0, 0, 0);
    const to = new Date(year, toMonth + 1, 0, 23, 59, 59, 999);
    onApply(from.toISOString(), to.toISOString());
  };

  const selectedLabel =
    selected.size === 0
      ? 'Ninguno'
      : selected.size === 12
        ? `Todo ${year}`
        : Array.from(selected)
            .sort((a, b) => a - b)
            .map((m) => MONTH_NAMES[m])
            .join(', ') + ` ${year}`;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">Seleccionar meses</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-muted rounded"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Year selector + quick selects */}
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={String(year)}
            onValueChange={(v) => setYear(Number(v))}
          >
            <SelectTrigger className="w-[90px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {buildYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-border" />

          {QUICK_SELECTS.map((qs) => {
            const isActive =
              qs.months.length === selected.size &&
              qs.months.every((m) => selected.has(m));
            return (
              <button
                key={qs.label}
                type="button"
                onClick={() => applyQuick(qs.months)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground border border-border hover:bg-muted'
                }`}
              >
                {qs.label}
              </button>
            );
          })}
        </div>

        {/* Month grid (4x3) */}
        <div className="grid grid-cols-4 gap-1.5">
          {MONTH_NAMES.map((name, idx) => {
            const isChecked = selected.has(idx);
            return (
              <button
                key={idx}
                type="button"
                onClick={() => toggle(idx)}
                className={`relative flex items-center justify-center gap-1 px-2 py-2 rounded-md text-xs font-medium transition-all border ${
                  isChecked
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {isChecked && (
                  <Check className="h-3 w-3 flex-shrink-0" />
                )}
                {name}
              </button>
            );
          })}
        </div>

        {/* Footer: selection summary + apply */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-muted-foreground truncate max-w-[280px]">
            {selectedLabel}
          </p>
          <Button
            onClick={handleApply}
            size="sm"
            className="h-7 text-xs"
            disabled={selected.size === 0}
          >
            Aplicar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Small label showing the selected custom range with a clear button.
 */
export function CustomRangeIndicator({ customRange, onClear }) {
  if (!customRange) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <CalendarRange className="h-3.5 w-3.5" />
      <span>
        {new Date(customRange.from).toLocaleDateString('es-VE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}{' '}
        -{' '}
        {new Date(customRange.to).toLocaleDateString('es-VE', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </span>
      <button
        type="button"
        onClick={onClear}
        className="p-0.5 hover:bg-muted rounded"
        title="Volver a periodo rapido"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
