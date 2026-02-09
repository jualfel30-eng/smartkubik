import { useState, useEffect, useRef, useMemo } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Button } from '@/components/ui/button.jsx';
import { CalendarRange, ChevronDown, Check } from 'lucide-react';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const MONTH_SHORT = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
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
 * Builds date ranges from selected years and months.
 * Returns one period per year, each spanning the min-to-max selected months.
 * Sorted descending by year (most recent first).
 */
export function buildPeriods(yearsArr, monthsArr) {
  if (!yearsArr.length || !monthsArr.length) return [];
  const sorted = [...monthsArr].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  return [...yearsArr].sort((a, b) => b - a).map((year) => {
    const from = new Date(year, first, 1, 0, 0, 0, 0);
    const to = new Date(year, last + 1, 0, 23, 59, 59, 999);

    let monthLabel;
    if (sorted.length === 12) {
      monthLabel = 'Todo';
    } else if (sorted.length === 1) {
      monthLabel = MONTH_SHORT[first];
    } else {
      monthLabel = `${MONTH_SHORT[first]}-${MONTH_SHORT[last]}`;
    }

    return {
      year,
      from: from.toISOString(),
      to: to.toISOString(),
      label: `${monthLabel} ${year}`,
    };
  });
}

/**
 * Unified period selector with two multi-select dropdown checkboxes:
 * one for years and one for months. Supports multi-year comparison
 * and quick-select buttons (Q1-Q4, H1, H2, Todo).
 *
 * Props:
 *  - selectedYears: Set of selected years (controlled)
 *  - selectedMonths: Set of selected months (controlled)
 *  - onYearsChange(Set): called when years selection changes
 *  - onMonthsChange(Set): called when months selection changes
 */
export function PeriodSelector({
  selectedYears = new Set([new Date().getFullYear()]),
  selectedMonths = new Set([new Date().getMonth()]),
  onYearsChange,
  onMonthsChange
}) {
  // Working state for popover editing (before Apply)
  const [workingYears, setWorkingYears] = useState(() => new Set(selectedYears));
  const [workingMonths, setWorkingMonths] = useState(() => new Set(selectedMonths));
  const [yearsOpen, setYearsOpen] = useState(false);
  const [monthsOpen, setMonthsOpen] = useState(false);

  const toggleYear = (y) => {
    setWorkingYears((prev) => {
      const next = new Set(prev);
      if (next.has(y)) {
        if (next.size > 1) next.delete(y);
      } else {
        next.add(y);
      }
      return next;
    });
  };

  const toggleMonth = (m) => {
    setWorkingMonths((prev) => {
      const next = new Set(prev);
      if (next.has(m)) {
        if (next.size > 1) next.delete(m);
      } else {
        next.add(m);
      }
      return next;
    });
  };

  const applyQuickMonths = (months) => {
    setWorkingMonths(new Set(months));
  };

  const applyYears = () => {
    onYearsChange(new Set(workingYears));
    setYearsOpen(false);
  };

  const applyMonths = () => {
    onMonthsChange(new Set(workingMonths));
    setMonthsOpen(false);
  };

  const cancelYears = () => {
    setWorkingYears(new Set(selectedYears));
    setYearsOpen(false);
  };

  const cancelMonths = () => {
    setWorkingMonths(new Set(selectedMonths));
    setMonthsOpen(false);
  };

  // Sync working state when popover opens/closes
  const handleYearsOpenChange = (open) => {
    if (open) {
      // Sync working state with parent state when opening
      setWorkingYears(new Set(selectedYears));
    }
    setYearsOpen(open);
  };

  const handleMonthsOpenChange = (open) => {
    if (open) {
      // Sync working state with parent state when opening
      setWorkingMonths(new Set(selectedMonths));
    }
    setMonthsOpen(open);
  };

  const sortedYears = [...selectedYears].sort((a, b) => a - b);
  const yearsLabel = sortedYears.join(', ');

  const sortedMonthsArr = [...selectedMonths].sort((a, b) => a - b);
  const monthsLabel =
    sortedMonthsArr.length === 12
      ? 'Todos los meses'
      : sortedMonthsArr.map((m) => MONTH_SHORT[m]).join(', ');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <CalendarRange className="h-4 w-4 text-muted-foreground" />

      {/* Years dropdown */}
      <Popover open={yearsOpen} onOpenChange={handleYearsOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-background text-foreground border-border hover:bg-muted transition-colors"
          >
            {yearsLabel}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-3 pb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Años
            </p>
            <div className="space-y-1 max-h-[280px] overflow-y-auto">
              {buildYearOptions().map((y) => (
                <label
                  key={y}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-muted px-2 py-1.5 rounded text-sm"
                >
                  <Checkbox
                    checked={workingYears.has(y)}
                    onCheckedChange={() => toggleYear(y)}
                  />
                  <span>{y}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 border-t bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={cancelYears}
              className="flex-1 h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyYears}
              className="flex-1 h-8 text-xs gap-1"
            >
              <Check className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Months dropdown */}
      <Popover open={monthsOpen} onOpenChange={handleMonthsOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border bg-background text-foreground border-border hover:bg-muted transition-colors max-w-[300px]"
          >
            <span className="truncate">{monthsLabel}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
          <div className="p-3 pb-2">
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
              Meses
            </p>
            {/* Quick-select pills */}
            <div className="flex flex-wrap gap-1 mb-3 pb-2 border-b">
              {QUICK_SELECTS.map((qs) => {
                const isActive =
                  qs.months.length === workingMonths.size &&
                  qs.months.every((m) => workingMonths.has(m));
                return (
                  <button
                    key={qs.label}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      applyQuickMonths(qs.months);
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {qs.label}
                  </button>
                );
              })}
            </div>
            {/* Checkboxes in 2 columns */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 max-h-[280px] overflow-y-auto">
              {MONTH_NAMES.map((name, idx) => (
                <label
                  key={idx}
                  className="flex items-center gap-2.5 cursor-pointer hover:bg-muted px-2 py-1.5 rounded text-sm"
                >
                  <Checkbox
                    checked={workingMonths.has(idx)}
                    onCheckedChange={() => toggleMonth(idx)}
                  />
                  <span>{name}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 border-t bg-muted/30">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={cancelMonths}
              className="flex-1 h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={applyMonths}
              className="flex-1 h-8 text-xs gap-1"
            >
              <Check className="h-3 w-3" />
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Comparison badge */}
      {selectedYears.size > 1 && (
        <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
          Comparando {selectedYears.size} años
        </span>
      )}
    </div>
  );
}
