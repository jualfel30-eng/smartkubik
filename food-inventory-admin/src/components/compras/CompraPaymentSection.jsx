/**
 * @file CompraPaymentSection.jsx
 * Reusable payment terms section used in both the "Nueva Compra" and
 * "Compra de Producto Nuevo" dialogs.
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
import { PAYMENT_METHOD_OPTIONS } from './compras-utils';

/**
 * @param {object} props
 * @param {object} props.paymentTerms - The paymentTerms sub-state
 * @param {function} props.setPaymentTerms - Updater: receives partial object to merge
 * @param {Date} props.purchaseDate - Purchase date (to disable dates before it in the calendar)
 * @param {boolean} props.paymentDueDateOpen - Popover open state
 * @param {function} props.setPaymentDueDateOpen - Popover open state setter
 * @param {string} [props.idPrefix=''] - Prefix for checkbox IDs to avoid collisions
 */
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

  const togglePaymentMethod = (method, checked) => {
    const updated = checked
      ? [...paymentTerms.paymentMethods, method]
      : paymentTerms.paymentMethods.filter(m => m !== method);
    setPaymentTerms({ paymentMethods: updated });
  };

  return (
    <div className="p-4 border rounded-lg space-y-4 dark:border-slate-700 dark:bg-slate-800/50">
      <h3 className="text-lg font-semibold dark:text-gray-100">Términos de Pago</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}isCredit`}
            checked={paymentTerms.isCredit}
            onCheckedChange={(checked) => setPaymentTerms({
              isCredit: checked,
              paymentDueDate: checked ? paymentTerms.paymentDueDate : null,
            })}
          />
          <Label htmlFor={`${idPrefix}isCredit`} className="dark:text-gray-200">¿Acepta crédito?</Label>
        </div>

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

        <div className="space-y-2">
          <Label className="dark:text-gray-200">Moneda de Pago Esperada <span className="text-destructive">*</span></Label>
          <Select
            value={paymentTerms.expectedCurrency}
            onValueChange={(value) => updateField('expectedCurrency', value)}
          >
            <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100">
              <SelectValue placeholder="Selecciona moneda" />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
              <SelectItem value="USD" className="dark:text-gray-100 focus:dark:bg-slate-800">USD ($)</SelectItem>
              <SelectItem value="VES" className="dark:text-gray-100 focus:dark:bg-slate-800">Bolívares (Bs)</SelectItem>
              <SelectItem value="EUR" className="dark:text-gray-100 focus:dark:bg-slate-800">Euros (€)</SelectItem>
              <SelectItem value="USD_BCV" className="dark:text-gray-100 focus:dark:bg-slate-800">$ BCV (Tasa BCV)</SelectItem>
              <SelectItem value="EUR_BCV" className="dark:text-gray-100 focus:dark:bg-slate-800">€ BCV (Tasa BCV)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-2">
          <Label className="flex items-center gap-2 dark:text-gray-200">
            Métodos de Pago Aceptados <span className="text-destructive">*</span>
            {paymentTerms.paymentMethods.length === 0 && !paymentTerms.customPaymentMethod && (
              <span className="text-xs text-destructive font-normal">(Selecciona al menos uno)</span>
            )}
          </Label>
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 p-3 border rounded-lg ${paymentTerms.paymentMethods.length === 0 && !paymentTerms.customPaymentMethod
            ? 'border-red-300 bg-destructive/5 dark:bg-red-900/10 dark:border-red-800'
            : 'dark:border-slate-700 dark:bg-slate-900/50'
            }`}>
            {PAYMENT_METHOD_OPTIONS.map(method => (
              <div key={method.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`${idPrefix}payment-${method.value}`}
                  checked={paymentTerms.paymentMethods.includes(method.value)}
                  onCheckedChange={(checked) => togglePaymentMethod(method.value, checked)}
                />
                <Label htmlFor={`${idPrefix}payment-${method.value}`} className="text-sm font-normal cursor-pointer dark:text-gray-300 hover:dark:text-gray-100">{method.label}</Label>
              </div>
            ))}
          </div>
        </div>

        <div className="col-span-2 space-y-2">
          <Label className="dark:text-gray-200">Método de Pago Personalizado (opcional)</Label>
          <Input
            value={paymentTerms.customPaymentMethod}
            onChange={e => updateField('customPaymentMethod', e.target.value)}
            placeholder="Ej: Cripto, Bitcoin, USDT, etc."
            className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100 dark:placeholder-gray-500"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`${idPrefix}requiresAdvancePayment`}
            checked={paymentTerms.requiresAdvancePayment}
            onCheckedChange={(checked) => updateField('requiresAdvancePayment', checked)}
          />
          <Label htmlFor={`${idPrefix}requiresAdvancePayment`} className="dark:text-gray-200">¿Requiere adelanto?</Label>
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
