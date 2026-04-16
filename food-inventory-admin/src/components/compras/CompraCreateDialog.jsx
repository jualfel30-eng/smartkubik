/**
 * @file CompraCreateDialog.jsx
 * "Nueva Compra" / "Anadir Inventario" dialog — registers a purchase order
 * for existing products to restock inventory.
 */
import { PlusCircle, Trash2, CalendarIcon, Camera, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { format } from 'date-fns';
import { parseTaxId } from './compras-utils';
import CompraPaymentSection from './CompraPaymentSection.jsx';

export default function CompraCreateDialog({
  // Dialog open state
  isOpen,
  onOpenChange,

  // PO state
  po,
  setPo,
  poLoading,
  poTotals,

  // Supplier inputs
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

  // Handlers
  handleSupplierSelection,
  handleSupplierNameInputChange,
  handleFieldChange,
  handleProductSelection,
  updateItemField,
  handleRemoveItemFromPo,
  handlePoSubmit,
  handleRifDropdownSelect,
  formatRifInput,

  // Async search
  loadSupplierOptions,
  loadProductOptions,

  // Scanning
  isScanning,
  scanResult,
  invoiceFileRef,
  handleScanInvoice,
  handleClearScan,

  // Initial state for reset
  initialPoState,
}) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        onOpenChange(open);
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Añadir Inventario
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
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

        <div className="space-y-6 p-1 overflow-y-auto flex-1">
          {scanResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${scanResult.overallConfidence >= 0.8 ? 'bg-success/5 border border-green-200 text-green-800' :
              scanResult.overallConfidence >= 0.5 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                'bg-destructive/5 border border-red-200 text-red-800'
              }`}>
              <span className="font-medium">
                {Math.round(scanResult.overallConfidence * 100)}% confianza
              </span>
              <span>&mdash;</span>
              <span className="flex-1">
                Proveedor: {scanResult.supplier?.matchedSupplierId ? 'Encontrado' : 'Nuevo'} |
                Productos: {scanResult.items?.filter(i => i.matchedProductId).length}/{scanResult.items?.length || 0} reconocidos
                {scanResult.invoiceNumber && ` | Factura #${scanResult.invoiceNumber}`}
              </span>
              <button
                type="button"
                onClick={handleClearScan}
                className="ml-auto p-1 rounded-full hover:bg-black/10 transition-colors"
                title="Descartar escaneo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Supplier Section */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Proveedor</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>RIF / C.I. del Proveedor</Label>
                <div className="relative">
                  <div className="flex items-center border border-input rounded-md">
                    <Select
                      value={po.taxType}
                      onValueChange={(value) => handleFieldChange('taxType', value)}
                    >
                      <SelectTrigger className="w-[70px] !h-10 !min-h-10 !py-2 rounded-l-md rounded-r-none !border-0 !border-r !border-input focus:z-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="J">J</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                        <SelectItem value="P">P</SelectItem>
                        <SelectItem value="N">N</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      ref={rifInputRef}
                      value={po.supplierRif || ''}
                      onChange={(e) => {
                        const formatted = formatRifInput(e.target.value, po.taxType);
                        setPo(prev => ({
                          ...prev,
                          supplierRif: formatted.replace(/[^0-9-]/g, ''),
                          supplierId: '',
                        }));
                        setRifDropdownOpen(true);
                      }}
                      onFocus={() => { if (rifSuggestions.length > 0) setRifDropdownOpen(true); }}
                      placeholder="12345678-9"
                      className="flex-1 rounded-l-none !border-0"
                    />
                  </div>
                  {rifDropdownOpen && rifSuggestions.length > 0 && (
                    <div
                      ref={rifDropdownRef}
                      className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md"
                    >
                      {rifSuggestions.map(s => (
                        <button
                          key={s._id}
                          type="button"
                          className="w-full text-left rounded-sm px-2 py-1.5 text-sm hover:bg-primary/25 cursor-default"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleRifDropdownSelect(s);
                          }}
                        >
                          <span className="font-medium">{s.taxInfo?.taxId}</span>
                          <span className="ml-2 text-muted-foreground">{s.companyName || s.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre o Razón Social</Label>
                <SearchableSelect
                  asyncSearch={true}
                  loadOptions={loadSupplierOptions}
                  minSearchLength={2}
                  debounceMs={300}
                  onSelection={handleSupplierSelection}
                  onInputChange={handleSupplierNameInputChange}
                  value={po.supplierName ? {
                    value: po.supplierId || po.supplierName,
                    label: po.supplierName
                  } : null}
                  placeholder="Buscar proveedor (mín. 2 caracteres)..."
                  isCreatable={true}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre del Contacto</Label>
                <Input value={po.contactName} onChange={e => handleFieldChange('contactName', e.target.value)} />
              </div>
              <div className="space-y-2"><Label>Teléfono del Contacto</Label><Input value={po.contactPhone} onChange={e => handleFieldChange('contactPhone', e.target.value)} /></div>
              <div className="space-y-2 col-span-2"><Label>Email del Contacto</Label><Input value={po.contactEmail} onChange={e => handleFieldChange('contactEmail', e.target.value)} placeholder="email@ejemplo.com" /></div>
              <div className="space-y-2 col-span-2">
                <Label>Dirección</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Input placeholder="Ciudad" value={po.supplierAddress.city} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, city: e.target.value } }))} />
                  <Input placeholder="Estado" value={po.supplierAddress.state} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, state: e.target.value } }))} />
                  <Input placeholder="Calle, Av, Local..." value={po.supplierAddress.street} onChange={e => setPo(prev => ({ ...prev, supplierAddress: { ...prev.supplierAddress, street: e.target.value } }))} />
                </div>
              </div>
            </div>

            {/* Purchase Date */}
            <div className="mt-4">
              <div className="space-y-2">
                <Label>Fecha de Compra <span className="text-destructive">*</span></Label>
                <Popover open={purchaseDateOpen} onOpenChange={setPurchaseDateOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
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
            </div>
          </div>

          {/* Payment Terms */}
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

          {/* Items Section */}
          <div className="p-4 border rounded-lg space-y-4">
            <h3 className="text-lg font-semibold">Ítems de la Compra</h3>
            <div className="space-y-2">
              <Label>Buscar Producto para Agregar</Label>
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto / Variante</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Costo Unit.</TableHead>
                  <TableHead>Desc. %</TableHead>
                  <TableHead>Precio Final</TableHead>
                  <TableHead>Nro. Lote</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {po.items.map((item, index) => (
                  <TableRow key={`${item.productId}-${item.variantId || 'base'}-${index}`}>
                    <TableCell>
                      <div className="font-medium">{item.productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {[
                          item.variantName,
                          item.productSku ? `SKU: ${item.productSku}` : null,
                          item.productBrand ? `Marca: ${item.productBrand}` : null
                        ].filter(Boolean).join(' · ')}
                      </div>
                    </TableCell>
                    <TableCell><Input type="number" value={item.quantity} onChange={e => updateItemField(index, 'quantity', e.target.value)} className="w-24 no-spinners" /></TableCell>
                    <TableCell><Input type="number" value={item.costPrice} onChange={e => updateItemField(index, 'costPrice', e.target.value)} className="w-32 no-spinners" /></TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={item.discount || ''}
                        onChange={e => updateItemField(index, 'discount', e.target.value)}
                        placeholder="0"
                        className="w-20 no-spinners"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100)).toFixed(2)}
                      {item.discount > 0 && (
                        <span className="text-xs text-success block">-{item.discount}%</span>
                      )}
                    </TableCell>
                    <TableCell>{item.isPerishable && <Input placeholder="Nro. Lote" className="w-32" value={item.lotNumber} onChange={e => updateItemField(index, 'lotNumber', e.target.value)} />}</TableCell>
                    <TableCell>{item.isPerishable && <Input type="date" className="w-40" value={item.expirationDate} onChange={e => updateItemField(index, 'expirationDate', e.target.value)} />}</TableCell>
                    <TableCell className="font-semibold">${(Number(item.quantity) * Number(item.costPrice) * (1 - (Number(item.discount) || 0) / 100)).toFixed(2)}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveItemFromPo(index)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {po.items.length > 0 && (
              <>
                {/* Document Type, Invoice Number */}
                <div className="flex justify-end mt-4 mb-3 gap-3">
                  <div className="w-56 p-3 border rounded-lg space-y-2 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Tipo de Documento
                    </Label>
                    <Select value={po.documentType} onValueChange={(val) => setPo(prev => ({ ...prev, documentType: val }))}>
                      <SelectTrigger className="bg-white dark:bg-slate-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="factura_fiscal">Factura</SelectItem>
                        <SelectItem value="nota_entrega">Nota de Entrega</SelectItem>
                      </SelectContent>
                    </Select>
                    {po.documentType === 'nota_entrega' && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Sin IVA ni IGTF
                      </p>
                    )}
                  </div>

                  <div className="w-56 p-3 border rounded-lg space-y-2 bg-slate-50 dark:bg-slate-900/50 dark:border-slate-700">
                    <Label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      {po.documentType === 'nota_entrega' ? 'Nº Nota de Entrega' : 'Nº Factura'}
                    </Label>
                    <Input
                      placeholder="Ej: 00012345"
                      value={po.invoiceNumber}
                      onChange={(e) => setPo(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                      className="bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="flex justify-end mt-2">
                  <div className="w-64 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
                      <span>${poTotals.subtotal.toFixed(2)}</span>
                    </div>
                    {po.documentType === 'factura_fiscal' && poTotals.iva > 0 && (
                      <div className="flex justify-between text-info">
                        <span>IVA (16%):</span>
                        <span>${poTotals.iva.toFixed(2)}</span>
                      </div>
                    )}
                    {po.documentType === 'factura_fiscal' && poTotals.igtf > 0 && (
                      <div className="flex justify-between text-warning">
                        <span>IGTF (3%):</span>
                        <span>${poTotals.igtf.toFixed(2)}</span>
                      </div>
                    )}
                    {po.documentType === 'nota_entrega' && (
                      <div className="flex justify-between text-amber-600 text-xs">
                        <span>Sin IVA/IGTF (Nota de Entrega)</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-base border-t pt-1">
                      <span>Total:</span>
                      <span>${poTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="space-y-2"><Label>Notas</Label><Textarea value={po.notes} onChange={e => setPo(prev => ({ ...prev, notes: e.target.value }))} /></div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handlePoSubmit} disabled={poLoading}>{poLoading ? 'Creando...' : 'Crear Compra'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
