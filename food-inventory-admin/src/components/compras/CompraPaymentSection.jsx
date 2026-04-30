/**
 * @file CompraPaymentSection.jsx
 * Simplified payment terms for purchase order creation.
 *
 * Layout: 3-column grid where each column owns its checkbox + conditional field
 * - Col 1: Currency (always visible)
 * - Col 2: "Compra a credito" + (conditional) Due date
 * - Col 3: "Requiere adelanto" + (conditional) Percentage
 *
 * Checkboxes have a stronger visible border in dark mode (was nearly invisible).
 */
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { format } from 'date-fns';

// Stronger checkbox border for dark mode visibility on dark section backgrounds
const CHECKBOX_VISIBLE = 'dark:border-slate-500 dark:bg-slate-700/50';

export default function CompraPaymentSection({
  paymentTerms,
  setPaymentTerms,
  purchaseDate,
  paymentDueDateOpen,
  setPaymentDueDateOpen,
  idPrefix = '',
}) {
  const updateField = (field, value) => {
    setPaymentTerms({ [field]: value });
  };

  return (
    <div className="p-4 border rounded-lg dark:border-slate-700 dark:bg-slate-800/50">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Column 1: Currency */}
        <div className="space-y-2">
          <Label className="dark:text-gray-200">Moneda de Pago <span className="text-destructive">*</span></Label>
          <Select
            value={paymentTerms.expectedCurrency}
            onValueChange={(value) => updateField('expectedCurrency', value)}
          >
            <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100">
              <SelectValue placeholder="Selecciona moneda" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="USD_BCV" className="dark:text-gray-100 focus:dark:bg-slate-800">$ BCV (Tasa BCV)</SelectItem>
              <SelectItem value="USD" className="dark:text-gray-100 focus:dark:bg-slate-800">USD ($)</SelectItem>
              <SelectItem value="VES" className="dark:text-gray-100 focus:dark:bg-slate-800">Bolivares (Bs)</SelectItem>
              <SelectItem value="EUR" className="dark:text-gray-100 focus:dark:bg-slate-800">Euros (€)</SelectItem>
              <SelectItem value="EUR_BCV" className="dark:text-gray-100 focus:dark:bg-slate-800">€ BCV (Tasa BCV)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Column 2: Credit + (conditional) Due date */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 h-10">
            <Checkbox
              id={`${idPrefix}isCredit`}
              checked={paymentTerms.isCredit}
              onCheckedChange={(checked) => setPaymentTerms({
                isCredit: checked,
                paymentDueDate: checked ? paymentTerms.paymentDueDate : null,
              })}
              className={CHECKBOX_VISIBLE}
            />
            <Label htmlFor={`${idPrefix}isCredit`} className="dark:text-gray-200 cursor-pointer">
              Compra a credito
            </Label>
          </div>
          {paymentTerms.isCredit && (
            <div className="space-y-1.5">
              <Label className="text-xs dark:text-gray-300">Fecha de Vencimiento</Label>
              <Popover open={paymentDueDateOpen} onOpenChange={setPaymentDueDateOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {paymentTerms.paymentDueDate ? format(paymentTerms.paymentDueDate, "PPP") : <span className="text-muted-foreground">Selecciona fecha</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-slate-900 dark:border-slate-700">
                  <Calendar
                    mode="single"
                    selected={paymentTerms.paymentDueDate}
                    onSelect={(date) => {
                      if (date) {
                        updateField('paymentDueDate', date);
                        setTimeout(() => setPaymentDueDateOpen(false), 0);
                      }
                    }}
                    disabled={(date) => date < purchaseDate}
                    initialFocus
                    className="dark:bg-slate-900 dark:text-gray-100"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>

        {/* Column 3: Advance + (conditional) Percentage */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2 h-10">
            <Checkbox
              id={`${idPrefix}requiresAdvancePayment`}
              checked={paymentTerms.requiresAdvancePayment}
              onCheckedChange={(checked) => updateField('requiresAdvancePayment', checked)}
              className={CHECKBOX_VISIBLE}
            />
            <Label htmlFor={`${idPrefix}requiresAdvancePayment`} className="dark:text-gray-200 cursor-pointer">
              Requiere adelanto
            </Label>
          </div>
          {paymentTerms.requiresAdvancePayment && (
            <div className="space-y-1.5">
              <Label className="text-xs dark:text-gray-300">Porcentaje de adelanto (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                value={paymentTerms.advancePaymentPercentage}
                onChange={e => updateField('advancePaymentPercentage', Number(e.target.value))}
                className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100"
                placeholder="0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
