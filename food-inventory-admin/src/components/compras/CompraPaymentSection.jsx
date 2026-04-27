/**
 * @file CompraPaymentSection.jsx
 * Simplified payment terms for purchase order creation.
 *
 * Only shows what's relevant at purchase time:
 * - Expected currency ($BCV default)
 * - Credit terms (yes/no + due date)
 * - Advance payment requirement
 *
 * Payment methods (how to pay) moved to Accounts Payable module
 * where they're needed at payment time, not purchase time.
 * UX principle: "Context of Use" (ISO 9241-210)
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
    <div className="p-4 border rounded-lg space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-lg font-semibold dark:text-gray-100">Terminos de Pago</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Currency — $BCV default */}
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
              <SelectItem value="bolivares_bcv" className="dark:text-gray-100 focus:dark:bg-slate-800">$ BCV (Tasa BCV)</SelectItem>
              <SelectItem value="USD" className="dark:text-gray-100 focus:dark:bg-slate-800">USD ($)</SelectItem>
              <SelectItem value="VES" className="dark:text-gray-100 focus:dark:bg-slate-800">Bolivares (Bs)</SelectItem>
              <SelectItem value="EUR" className="dark:text-gray-100 focus:dark:bg-slate-800">Euros (€)</SelectItem>
              <SelectItem value="euro_bcv" className="dark:text-gray-100 focus:dark:bg-slate-800">€ BCV (Tasa BCV)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Credit */}
        <div className="flex items-center space-x-2 self-end pb-2">
          <Checkbox
            id={`${idPrefix}isCredit`}
            checked={paymentTerms.isCredit}
            onCheckedChange={(checked) => setPaymentTerms({
              isCredit: checked,
              paymentDueDate: checked ? paymentTerms.paymentDueDate : null,
            })}
          />
          <Label htmlFor={`${idPrefix}isCredit`} className="dark:text-gray-200">Compra a credito</Label>
        </div>

        {/* Due date — only when credit */}
        {paymentTerms.isCredit && (
          <div className="space-y-2">
            <Label className="dark:text-gray-200">Fecha de Vencimiento del Pago</Label>
            <Popover open={paymentDueDateOpen} onOpenChange={setPaymentDueDateOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentTerms.paymentDueDate ? format(paymentTerms.paymentDueDate, "PPP") : <span>Selecciona fecha de pago</span>}
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

        {/* Advance payment */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}requiresAdvancePayment`}
            checked={paymentTerms.requiresAdvancePayment}
            onCheckedChange={(checked) => updateField('requiresAdvancePayment', checked)}
          />
          <Label htmlFor={`${idPrefix}requiresAdvancePayment`} className="dark:text-gray-200">Requiere adelanto</Label>
        </div>

        {paymentTerms.requiresAdvancePayment && (
          <div className="space-y-2">
            <Label className="dark:text-gray-200">Porcentaje de Adelanto (%)</Label>
            <Input
              type="number"
              min="0"
              max="100"
              value={paymentTerms.advancePaymentPercentage}
              onChange={e => updateField('advancePaymentPercentage', Number(e.target.value))}
              className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100"
            />
          </div>
        )}
      </div>
    </div>
  );
}
