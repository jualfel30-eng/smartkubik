/**
 * @file CompraCreateDialog.jsx
 * "Nueva Compra" dialog — UX redesigned with 7 improvements:
 *
 * 1. Sticky summary panel (right side, always visible)
 * 2. Reordered sections: Proveedor → Doc+Fecha → Productos → Pago → Notas
 * 3. Inline variant selection (no modal-on-modal)
 * 4. Always-visible Lot/Expiration columns (disabled for non-perishables)
 * 5. Single combined RIF input with format hint
 * 6. Inline validation on required fields (red border + message on blur)
 * 7. Smart defaults from supplier history (currency, credit terms, methods)
 */
import { useState } from 'react';
import { PlusCircle, Trash2, CalendarIcon, Camera, Loader2, X, AlertCircle, Check, Receipt, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import CompraPaymentSection from './CompraPaymentSection.jsx';

// ─── RIF input — single combined field ──────────────────────────────────
function RifInput({ value, taxType, onChange, onTaxTypeChange, suggestions, dropdownOpen, setDropdownOpen, onSuggestionSelect, inputRef, dropdownRef, error, onBlur }) {
  const TAX_TYPES = ['V', 'E', 'J', 'G', 'P', 'N', 'C'];

  return (
    <div className="relative">
      <div className={cn(
        'flex items-center border rounded-md transition-colors',
        error ? 'border-destructive' : 'border-input',
        'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1'
      )}>
        <Select value={taxType} onValueChange={onTaxTypeChange}>
          <SelectTrigger className="w-[60px] !h-10 !min-h-10 !py-2 rounded-l-md rounded-r-none !border-0 !border-r !border-input focus:z-10 font-mono font-semibold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TAX_TYPES.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={inputRef}
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setDropdownOpen(true);
          }}
          onFocus={() => { if (suggestions.length > 0) setDropdownOpen(true); }}
          onBlur={onBlur}
          placeholder="12345678-9"
          className="flex-1 rounded-l-none !border-0 font-mono"
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">Formato: {taxType}-12345678-9</p>
      {error && <p className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{error}</p>}

      {dropdownOpen && suggestions.length > 0 && (
        <div ref={dropdownRef} className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {suggestions.map(s => (
            <button
              key={s._id}
              type="button"
              className="w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-primary/25 cursor-default"
              onMouseDown={(e) => { e.preventDefault(); onSuggestionSelect(s); }}
            >
              <span className="font-medium font-mono">{s.taxInfo?.taxId}</span>
              <span className="ml-2 text-muted-foreground">{s.companyName || s.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inline Variant Picker (replaces modal-on-modal) ─────────────────────
function InlineVariantPicker({ variantSelection, updateVariantSelectionRow, confirmVariantSelection, closeVariantSelection }) {
  if (!variantSelection) return null;
  return (
    <div className="border-2 border-primary/30 rounded-lg p-4 bg-primary/5 space-y-3 mb-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Variantes de {variantSelection.product?.name}</h4>
          <p className="text-xs text-muted-foreground">Define la cantidad y costo para cada variante que necesitas</p>
        </div>
        <Button variant="ghost" size="icon" onClick={closeVariantSelection} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2 max-h-[40vh] overflow-y-auto">
        {variantSelection.rows?.map((row, index) => {
          const variantId = row.variant?._id || `variant-${index}`;
          return (
            <div key={variantId} className="grid grid-cols-[1fr_120px_140px] gap-3 items-end p-2 rounded-md hover:bg-background/50 transition-colors">
              <div>
                <div className="text-sm font-medium">{row.variant?.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{row.variant?.sku}</div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cantidad</Label>
                <Input
                  type="number"
                  min="0"
                  value={row.quantity}
                  onChange={(e) => updateVariantSelectionRow(index, 'quantity', e.target.value)}
                  placeholder="0"
                  className="h-9 no-spinners"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Costo unitario</Label>
                <Input
                  type="number"
                  min="0"
                  value={row.costPrice}
                  onChange={(e) => updateVariantSelectionRow(index, 'costPrice', e.target.value)}
                  placeholder="0.00"
                  className="h-9 no-spinners"
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button variant="outline" size="sm" onClick={closeVariantSelection}>Cancelar</Button>
        <Button size="sm" onClick={confirmVariantSelection}>
          <Check className="h-4 w-4 mr-1" />
          Agregar variantes
        </Button>
      </div>
    </div>
  );
}

// ─── Sticky Summary Panel ───────────────────────────────────────────────
function StickySummary({ po, poTotals, setPo, isCreating, onCancel, onSubmit, validationErrors }) {
  const itemCount = po.items.length;
  const hasItems = itemCount > 0;
  const dueDate = po.paymentTerms?.paymentDueDate;
  const purchaseDate = po.purchaseDate;

  let daysUntilDue = null;
  if (dueDate && po.paymentTerms?.isCredit) {
    const diff = Math.ceil((new Date(dueDate) - new Date(purchaseDate)) / (1000 * 60 * 60 * 24));
    daysUntilDue = diff;
  }

  return (
    <div className="sticky top-0 w-72 shrink-0 self-start space-y-3 ml-4">
      <div className="border rounded-lg bg-card p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Resumen</h3>
          <span className="text-xs text-muted-foreground">{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>

        {/* Document Type — moved here because it affects taxes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Tipo de documento <span className="text-destructive">*</span></Label>
          <Select value={po.documentType} onValueChange={(val) => setPo(prev => ({ ...prev, documentType: val }))}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="factura_fiscal">
                <span className="flex items-center gap-2"><Receipt className="h-3.5 w-3.5" /> Factura Fiscal</span>
              </SelectItem>
              <SelectItem value="nota_entrega">
                <span className="flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Nota de Entrega</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">{po.documentType === 'nota_entrega' ? 'Nº Nota de Entrega' : 'Nº Factura'}</Label>
          <Input
            value={po.invoiceNumber}
            onChange={(e) => setPo(prev => ({ ...prev, invoiceNumber: e.target.value }))}
            placeholder="00012345"
            className="h-9 text-sm font-mono"
          />
        </div>

        {/* Totals — always visible while user fills items */}
        <div className="border-t pt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">${poTotals.subtotal.toFixed(2)}</span>
          </div>
          {po.documentType === 'factura_fiscal' && poTotals.iva > 0 && (
            <div className="flex justify-between text-info">
              <span>IVA 16%</span>
              <span>${poTotals.iva.toFixed(2)}</span>
            </div>
          )}
          {po.documentType === 'factura_fiscal' && poTotals.igtf > 0 && (
            <div className="flex justify-between text-warning">
              <span>IGTF 3%</span>
              <span>${poTotals.igtf.toFixed(2)}</span>
            </div>
          )}
          {po.documentType === 'nota_entrega' && hasItems && (
            <p className="text-xs text-amber-600 dark:text-amber-400">Sin IVA / IGTF</p>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2 mt-2">
            <span>Total</span>
            <span>${poTotals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Credit indicator */}
        {po.paymentTerms?.isCredit && daysUntilDue != null && (
          <div className="border-t pt-2 text-xs text-muted-foreground">
            <span className="font-medium text-amber-600 dark:text-amber-400">Crédito {daysUntilDue} días</span>
            {dueDate && <span className="block">Vence {format(new Date(dueDate), 'dd MMM')}</span>}
          </div>
        )}

        {/* Validation status + submit */}
        <div className="border-t pt-3 space-y-2">
          {validationErrors.length > 0 && (
            <div className="text-xs text-destructive flex items-start gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{validationErrors[0]}</span>
            </div>
          )}
          <Button onClick={onSubmit} disabled={isCreating || !hasItems} className="w-full bg-[#FB923C] hover:bg-[#F97316] text-white">
            {isCreating ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creando...</>
            ) : 'Crear compra'}
          </Button>
          <Button variant="outline" onClick={onCancel} className="w-full" size="sm">Cancelar</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────
export default function CompraCreateDialog({
  isOpen,
  onOpenChange,
  po,
  setPo,
  poLoading,
  poTotals,
  supplierNameInput,
  supplierRifInput,
  rifDropdownOpen,
  setRifDropdownOpen,
  purchaseDateOpen,
  setPurchaseDateOpen,
  paymentDueDateOpen,
  setPaymentDueDateOpen,
  rifInputRef,
  rifDropdownRef,
  rifSuggestions,
  handleSupplierSelection,
  handleSupplierNameInputChange,
  handleFieldChange,
  handleProductSelection,
  updateItemField,
  handleRemoveItemFromPo,
  handlePoSubmit,
  handleRifDropdownSelect,
  formatRifInput,
  loadSupplierOptions,
  loadProductOptions,
  isScanning,
  scanResult,
  invoiceFileRef,
  handleScanInvoice,
  handleClearScan,
  // Inline variant selection
  variantSelection,
  closeVariantSelection,
  updateVariantSelectionRow,
  confirmVariantSelection,
}) {
  // Validation tracking — fields user has touched (blurred at least once)
  const [touched, setTouched] = useState({});
  const markTouched = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  // Inline validation — only show error if field is touched OR submission attempted
  const errors = {
    supplierName: !po.supplierName ? 'Selecciona o crea un proveedor' : null,
    supplierRif: !po.supplierRif || po.supplierRif.length < 7 ? 'RIF requerido (mínimo 7 dígitos)' : null,
    purchaseDate: !po.purchaseDate ? 'Selecciona la fecha de compra' : null,
    items: po.items.length === 0 ? 'Agrega al menos un producto' : null,
  };

  // Top validation errors for sticky panel summary
  const validationErrors = Object.entries(errors).filter(([, v]) => v).map(([, v]) => v);

  const handleRifChange = (rawValue) => {
    const formatted = formatRifInput(rawValue, po.taxType);
    setPo(prev => ({
      ...prev,
      supplierRif: formatted.replace(/[^0-9-]/g, ''),
      supplierId: '',
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => onOpenChange(open)}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Añadir Inventario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Nueva Compra</DialogTitle>
              <DialogDescription>Registra una nueva compra para reabastecer tu inventario.</DialogDescription>
            </div>
            <div className="flex-shrink-0 ml-4">
              <input
                type="file"
                ref={invoiceFileRef}
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleScanInvoice}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => invoiceFileRef.current?.click()}
                disabled={isScanning}
                className="border-blue-300 text-blue-700 hover:bg-blue-50 gap-2"
              >
                {isScanning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Escaneando...</>
                ) : (
                  <><Camera className="h-4 w-4" /> Escanear Factura</>
                )}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* TWO-COLUMN LAYOUT: form (scrolls) + sticky summary panel */}
        <div className="flex-1 overflow-hidden flex">
          {/* LEFT: Form sections (scrollable) */}
          <div className="flex-1 overflow-y-auto p-1 pr-3 space-y-5">
            {scanResult && (
              <div className={cn(
                'p-3 rounded-lg text-sm flex items-center gap-2',
                scanResult.overallConfidence >= 0.8 ? 'bg-success/5 border border-green-200 text-green-800' :
                  scanResult.overallConfidence >= 0.5 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                    'bg-destructive/5 border border-red-200 text-red-800'
              )}>
                <span className="font-medium">{Math.round(scanResult.overallConfidence * 100)}% confianza</span>
                <span>—</span>
                <span className="flex-1">
                  Proveedor: {scanResult.supplier?.matchedSupplierId ? 'Encontrado' : 'Nuevo'} |
                  Productos: {scanResult.items?.filter(i => i.matchedProductId).length}/{scanResult.items?.length || 0} reconocidos
                  {scanResult.invoiceNumber && ` | Factura #${scanResult.invoiceNumber}`}
                </span>
                <button type="button" onClick={handleClearScan} className="ml-auto p-1 rounded-full hover:bg-black/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* SECTION 1: PROVEEDOR */}
            <section className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                <h3 className="text-base font-semibold">Proveedor</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>RIF / C.I. <span className="text-destructive">*</span></Label>
                  <RifInput
                    value={po.supplierRif}
                    taxType={po.taxType}
                    onChange={handleRifChange}
                    onTaxTypeChange={(value) => handleFieldChange('taxType', value)}
                    suggestions={rifSuggestions}
                    dropdownOpen={rifDropdownOpen}
                    setDropdownOpen={setRifDropdownOpen}
                    onSuggestionSelect={handleRifDropdownSelect}
                    inputRef={rifInputRef}
                    dropdownRef={rifDropdownRef}
                    error={touched.supplierRif ? errors.supplierRif : null}
                    onBlur={() => markTouched('supplierRif')}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Nombre o Razón Social <span className="text-destructive">*</span></Label>
                  <SearchableSelect
                    asyncSearch={true}
                    loadOptions={loadSupplierOptions}
                    minSearchLength={2}
                    debounceMs={300}
                    onSelection={handleSupplierSelection}
                    onInputChange={handleSupplierNameInputChange}
                    value={po.supplierName ? { value: po.supplierId || po.supplierName, label: po.supplierName } : null}
                    placeholder="Buscar proveedor (mín. 2 caracteres)..."
                    isCreatable={true}
                  />
                  {touched.supplierName && errors.supplierName && (
                    <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.supplierName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-muted-foreground">Contacto</Label>
                  <Input value={po.contactName} onChange={e => handleFieldChange('contactName', e.target.value)} placeholder="Nombre del contacto" />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Teléfono</Label>
                  <Input value={po.contactPhone} onChange={e => handleFieldChange('contactPhone', e.target.value)} placeholder="0414-1234567" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <Input value={po.contactEmail} onChange={e => handleFieldChange('contactEmail', e.target.value)} placeholder="email@ejemplo.com" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-muted-foreground">Dirección</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <Input placeholder="Ciudad" value={po.supplierAddress.city} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, city: e.target.value } }))} />
                    <Input placeholder="Estado" value={po.supplierAddress.state} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, state: e.target.value } }))} />
                    <Input placeholder="Calle, Av, Local..." value={po.supplierAddress.street} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, street: e.target.value } }))} />
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 2: FECHA */}
            <section className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                <h3 className="text-base font-semibold">Fecha de compra</h3>
              </div>

              <div className="space-y-1 max-w-sm">
                <Label className="text-muted-foreground">Fecha <span className="text-destructive">*</span></Label>
                <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        touched.purchaseDate && errors.purchaseDate ? 'border-destructive' : ''
                      )}
                      onBlur={() => markTouched('purchaseDate')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {po.purchaseDate ? format(po.purchaseDate, "PPP") : <span>Selecciona una fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={po.purchaseDate}
                      onSelect={(date) => {
                        if (date) {
                          setPo(prev => ({ ...prev, purchaseDate: date }));
                          setTimeout(() => setPurchaseDateOpen(false), 0);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </section>

            {/* SECTION 3: PRODUCTOS */}
            <section className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                <h3 className="text-base font-semibold">Productos</h3>
              </div>

              <div className="space-y-1">
                <Label className="text-muted-foreground">Buscar producto</Label>
                <SearchableSelect
                  asyncSearch={true}
                  loadOptions={loadProductOptions}
                  minSearchLength={2}
                  debounceMs={300}
                  onSelection={handleProductSelection}
                  value={null}
                  placeholder="Buscar producto (mín. 2 caracteres)..."
                  isCreatable={false}
                />
              </div>

              {/* Inline variant picker — replaces modal-on-modal */}
              <InlineVariantPicker
                variantSelection={variantSelection}
                updateVariantSelectionRow={updateVariantSelectionRow}
                confirmVariantSelection={confirmVariantSelection}
                closeVariantSelection={closeVariantSelection}
              />

              {/* Items table — Lot/Expiration always visible */}
              {po.items.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground border rounded-md border-dashed">
                  Busca un producto arriba para agregarlo a la compra
                </div>
              ) : (
                <TooltipProvider>
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">Producto</TableHead>
                          <TableHead className="w-[100px]">Cantidad</TableHead>
                          <TableHead className="w-[120px]">Costo unit.</TableHead>
                          <TableHead className="w-[90px]">Desc. %</TableHead>
                          <TableHead className="w-[110px]">Precio final</TableHead>
                          <TableHead className="w-[140px]">Lote</TableHead>
                          <TableHead className="w-[150px]">Vencimiento</TableHead>
                          <TableHead className="w-[110px]">Total</TableHead>
                          <TableHead className="w-[40px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {po.items.map((item, index) => (
                          <TableRow key={`${item.productId}-${item.variantId || 'base'}-${index}`}>
                            <TableCell>
                              <div className="font-medium text-sm">{item.productName}</div>
                              <div className="text-xs text-muted-foreground">
                                {[
                                  item.variantName,
                                  item.productSku ? `SKU: ${item.productSku}` : null,
                                  item.productBrand ? `Marca: ${item.productBrand}` : null,
                                ].filter(Boolean).join(' · ')}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={item.quantity} onChange={e => updateItemField(index, 'quantity', e.target.value)} className="w-20 no-spinners h-9" />
                            </TableCell>
                            <TableCell>
                              <Input type="number" value={item.costPrice} onChange={e => updateItemField(index, 'costPrice', e.target.value)} className="w-28 no-spinners h-9" />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={item.discount || ''}
                                onChange={e => updateItemField(index, 'discount', e.target.value)}
                                placeholder="0"
                                className="w-16 no-spinners h-9"
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              ${(Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100)).toFixed(2)}
                              {item.discount > 0 && (
                                <span className="text-xs text-success block">-{item.discount}%</span>
                              )}
                            </TableCell>
                            {/* Lot — always visible, disabled for non-perishable */}
                            <TableCell>
                              {item.isPerishable ? (
                                <Input
                                  placeholder="Lote"
                                  className="w-32 h-9"
                                  value={item.lotNumber || ''}
                                  onChange={e => updateItemField(index, 'lotNumber', e.target.value)}
                                />
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs text-muted-foreground/40 italic px-2">— N/A —</div>
                                  </TooltipTrigger>
                                  <TooltipContent>Solo para productos perecederos</TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            {/* Expiration — same pattern */}
                            <TableCell>
                              {item.isPerishable ? (
                                <Input
                                  type="date"
                                  className="w-36 h-9"
                                  value={item.expirationDate || ''}
                                  onChange={e => updateItemField(index, 'expirationDate', e.target.value)}
                                />
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="text-xs text-muted-foreground/40 italic px-2">— N/A —</div>
                                  </TooltipTrigger>
                                  <TooltipContent>Solo para productos perecederos</TooltipContent>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-sm">
                              ${(Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100)).toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromPo(index)} className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TooltipProvider>
              )}
            </section>

            {/* SECTION 4: TÉRMINOS DE PAGO (moved AFTER products — natural mental model) */}
            <section className="space-y-2">
              <div className="flex items-center gap-2 pl-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">4</span>
                <h3 className="text-base font-semibold">Términos de pago</h3>
              </div>
              <CompraPaymentSection
                paymentTerms={po.paymentTerms}
                setPaymentTerms={(updater) => {
                  if (typeof updater === 'function') {
                    setPo(prev => ({ ...prev, paymentTerms: updater(prev.paymentTerms) }));
                  } else {
                    setPo(prev => ({ ...prev, paymentTerms: { ...prev.paymentTerms, ...updater } }));
                  }
                }}
                purchaseDate={po.purchaseDate}
                paymentDueDateOpen={paymentDueDateOpen}
                setPaymentDueDateOpen={setPaymentDueDateOpen}
                idPrefix=""
              />
            </section>

            {/* SECTION 5: NOTAS */}
            <section className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground text-xs font-bold">5</span>
                <h3 className="text-base font-semibold">Notas</h3>
                <span className="text-xs text-muted-foreground">(opcional)</span>
              </div>
              <Textarea
                value={po.notes}
                onChange={e => setPo(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observaciones adicionales..."
                rows={2}
              />
            </section>
          </div>

          {/* RIGHT: Sticky summary panel */}
          <StickySummary
            po={po}
            poTotals={poTotals}
            setPo={setPo}
            isCreating={poLoading}
            onCancel={() => onOpenChange(false)}
            onSubmit={() => {
              // Touch all fields to surface validation errors
              setTouched({ supplierName: true, supplierRif: true, purchaseDate: true, items: true });
              handlePoSubmit();
            }}
            validationErrors={validationErrors}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
