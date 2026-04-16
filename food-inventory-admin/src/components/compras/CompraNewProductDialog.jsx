/**
 * @file CompraNewProductDialog.jsx
 * "Compra de Producto Nuevo" dialog — creates a new product with initial
 * inventory and purchase in one step.
 */
import { useState } from 'react';
import { PlusCircle, Trash2, CalendarIcon, Package, XCircle, Plus, Camera, Loader2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar } from '@/components/ui/calendar.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { TagInput } from '@/components/ui/tag-input.jsx';
import { SearchableSelect } from '../orders/v2/custom/SearchableSelect';
import { format } from 'date-fns';
import CompraPaymentSection from './CompraPaymentSection.jsx';

export default function CompraNewProductDialog({
  // Dialog open state
  isOpen,
  onOpenChange,

  // New product state
  newProduct,
  setNewProduct,
  selectedImageIndex,
  setSelectedImageIndex,
  additionalVariants,
  newProductTotals,

  // Handlers
  handleDragStart,
  handleDragOver,
  handleDrop,
  addAdditionalVariant,
  removeAdditionalVariant,
  updateAdditionalVariantField,
  handleSupplierSelectionForNewProduct,
  handleAddProduct,
  handleImageUpload,
  handleRemoveImage,
  formatRifInput,

  // Supplier options
  supplierOptions,

  // Scanning
  isScanning,
  scanResult,
  invoiceFileRef2,
  handleScanInvoice,
  handleClearScan,

  // Vertical config values
  getPlaceholder,
  unitOptions,
  supportsVariants,
  allowsWeight,
  isNonFoodRetailVertical,
  ingredientLabel,
  variantSectionDescription,
  showLotFields,
  showExpirationFields,
}) {
  // Local popover state for the payment due date (separate from PO dialog's)
  const [npPaymentDueDateOpen, setNpPaymentDueDateOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full md:w-auto">
          <PlusCircle className="mr-2 h-5 w-5" /> Compra de Producto Nuevo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Agregar Nuevo Producto con Inventario</DialogTitle>
              <DialogDescription>Completa la información para crear un nuevo producto y su inventario inicial.</DialogDescription>
            </div>
            <div className="flex-shrink-0 ml-4">
              <input
                type="file"
                ref={invoiceFileRef2}
                accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleScanInvoice}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => invoiceFileRef2.current?.click()}
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

        <div className="space-y-6 py-4 px-6 overflow-y-auto flex-grow">
          {scanResult && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${scanResult.overallConfidence >= 0.8 ? 'bg-green-50 border border-green-200 text-green-800' :
              scanResult.overallConfidence >= 0.5 ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
                'bg-red-50 border border-red-200 text-red-800'
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

          {/* Images + Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <div className="md:col-span-1 space-y-2">
              <Label>Imágenes (máx. 3)</Label>
              <label htmlFor="images" className="cursor-pointer flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg text-muted-foreground hover:bg-muted/50">
                {newProduct.variant.images && newProduct.variant.images.length > 0 ? (
                  <img src={newProduct.variant.images[selectedImageIndex]} alt={`product-image-${selectedImageIndex}`} className="h-full w-full object-cover rounded-lg" />
                ) : (
                  <div className="text-center">
                    <Package className="mx-auto h-8 w-8" />
                    <p className="mt-1 text-sm">Subir imágenes</p>
                  </div>
                )}
              </label>
              <Input id="images" type="file" multiple accept="image/*" onChange={handleImageUpload} className="hidden" />
              <div className="w-full border rounded-lg p-2 mt-2">
                <div className="flex gap-2 justify-center">
                  {newProduct.variant.images && newProduct.variant.images.map((image, index) => (
                    <div
                      key={image}
                      className="relative"
                      draggable="true"
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                    >
                      {index === 0 && (
                        <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 z-10" variant="secondary">
                          Portada
                        </Badge>
                      )}
                      <img
                        src={image}
                        alt={`product-thumb-${index}`}
                        className={`w-14 h-14 object-cover rounded cursor-pointer hover:opacity-80 ${selectedImageIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                        onClick={() => setSelectedImageIndex(index)}
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full z-10"
                        onClick={(e) => { e.stopPropagation(); handleRemoveImage(index); }}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {newProduct.variant.images && newProduct.variant.images.length > 0 && newProduct.variant.images.length < 3 && (
                    <label htmlFor="images" className="cursor-pointer flex items-center justify-center w-14 h-14 border-2 border-dashed rounded text-muted-foreground hover:bg-muted/50">
                      <Plus className="h-8 w-8" />
                    </label>
                  )}
                </div>
              </div>
              {newProduct.variant.images.length >= 2 && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Arrastra para organizar la portada.
                </p>
              )}
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Producto</Label>
                <Input
                  id="name"
                  value={newProduct.name}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder={getPlaceholder('productName', 'Ej: Arroz Blanco')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Marca</Label>
                <Input
                  id="brand"
                  value={newProduct.brand}
                  onChange={(e) => setNewProduct({ ...newProduct, brand: e.target.value })}
                  placeholder={getPlaceholder('brand', 'Ej: Diana')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU Principal</Label>
                <Input
                  id="sku"
                  value={newProduct.sku}
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
                  placeholder={getPlaceholder('sku', 'Ej: ARR-BLANCO')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcode">Código de Barras (UPC)</Label>
                <Input
                  id="barcode"
                  value={newProduct.variant.barcode}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      variant: { ...newProduct.variant, barcode: e.target.value },
                    })
                  }
                  placeholder={getPlaceholder('barcode', 'Ej: 7591234567890')}
                />
              </div>
            </div>
          </div>

          {/* Additional Variants */}
          {supportsVariants && (
            <div className="col-span-2 border-t pt-4 mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-base font-medium">Variantes adicionales</h5>
                  <p className="text-sm text-muted-foreground">{variantSectionDescription}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={addAdditionalVariant}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar variante
                </Button>
              </div>
              {additionalVariants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  El producto usará únicamente la variante principal hasta que agregues más opciones.
                </p>
              ) : (
                additionalVariants.map((variant, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <h6 className="font-medium">Variante {index + 2}</h6>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeAdditionalVariant(index)}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar variante</span>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          value={variant.name}
                          onChange={(e) => updateAdditionalVariantField(index, 'name', e.target.value)}
                          placeholder={getPlaceholder('variantAdditionalName', 'Ej: Talla M / Color Azul')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SKU</Label>
                        <Input
                          value={variant.sku}
                          onChange={(e) => updateAdditionalVariantField(index, 'sku', e.target.value)}
                          placeholder={getPlaceholder('variantAdditionalSku', `Ej: ${newProduct.sku || 'SKU'}-${(variant.name || `VAR${index + 2}`).toUpperCase().replace(/[^A-Z0-9]+/g, '-')}`)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Código de barras</Label>
                        <Input
                          value={variant.barcode}
                          onChange={(e) => updateAdditionalVariantField(index, 'barcode', e.target.value)}
                          placeholder="Opcional"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Unidad</Label>
                        <Input
                          value={variant.unit || ''}
                          onChange={(e) => updateAdditionalVariantField(index, 'unit', e.target.value)}
                          placeholder={getPlaceholder('variantUnit', 'Ej: unidad')}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tamaño unidad</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.unitSize ?? ''}
                          onChange={(e) => updateAdditionalVariantField(index, 'unitSize', e.target.value)}
                          placeholder="1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Precio costo ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.costPrice ?? ''}
                          onChange={(e) => updateAdditionalVariantField(index, 'costPrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Precio venta ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.basePrice ?? ''}
                          onChange={(e) => updateAdditionalVariantField(index, 'basePrice', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Categories, Description, Properties */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 pt-6 border-t">
            <div className="space-y-2">
              <Label htmlFor="category">Categorías</Label>
              <TagInput
                id="category"
                value={newProduct.category}
                onChange={(val) => setNewProduct({ ...newProduct, category: val })}
                placeholder="Escribe y presiona Enter o coma"
                helpText="Presiona Enter o coma (,) para agregar. Puedes agregar múltiples."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Sub-categorías</Label>
              <TagInput
                id="subcategory"
                value={newProduct.subcategory}
                onChange={(val) => setNewProduct({ ...newProduct, subcategory: val })}
                placeholder="Escribe y presiona Enter o coma"
                helpText="Presiona Enter o coma (,) para agregar."
              />
            </div>

            <div className="col-span-2 space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                placeholder={getPlaceholder('description', 'Descripción detallada del producto')}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="ingredients">{ingredientLabel}</Label>
              <Textarea
                id="ingredients"
                value={newProduct.ingredients}
                onChange={(e) => setNewProduct({ ...newProduct, ingredients: e.target.value })}
                placeholder={
                  isNonFoodRetailVertical
                    ? 'Describe la composición del producto'
                    : 'Lista de ingredientes'
                }
              />
            </div>
            {!isNonFoodRetailVertical && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isPerishable"
                  checked={newProduct.isPerishable}
                  onCheckedChange={(checked) => setNewProduct({ ...newProduct, isPerishable: checked })}
                />
                <Label htmlFor="isPerishable">Es Perecedero</Label>
              </div>
            )}
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox id="ivaApplicable" checked={!newProduct.ivaApplicable} onCheckedChange={(checked) => setNewProduct({ ...newProduct, ivaApplicable: !checked })} />
              <Label htmlFor="ivaApplicable">Exento de IVA</Label>
            </div>
            {allowsWeight && (
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="isSoldByWeight"
                  checked={newProduct.isSoldByWeight}
                  onCheckedChange={(checked) => setNewProduct({ ...newProduct, isSoldByWeight: checked })}
                />
                <Label htmlFor="isSoldByWeight">Vendido por Peso</Label>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="unitOfMeasure">Unidad de Medida</Label>
              <Select
                value={newProduct.unitOfMeasure}
                onValueChange={(value) =>
                  setNewProduct((prev) => ({
                    ...prev,
                    unitOfMeasure: value,
                    variant: { ...prev.variant, unit: value },
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((unit) => (
                    <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isNonFoodRetailVertical && newProduct.isPerishable && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="shelfLifeValue">Vida Útil</Label>
                  <div className="flex gap-2">
                    <Input
                      id="shelfLifeValue"
                      type="number"
                      className="flex-1"
                      value={newProduct.shelfLifeValue ?? 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        const unit = newProduct.shelfLifeUnit || 'days';
                        const multiplier = { days: 1, months: 30, years: 365 }[unit] || 1;
                        setNewProduct({
                          ...newProduct,
                          shelfLifeValue: val,
                          shelfLifeDays: Math.round(val * multiplier),
                        });
                      }}
                    />
                    <Select
                      value={newProduct.shelfLifeUnit || 'days'}
                      onValueChange={(unit) => {
                        const multiplier = { days: 1, months: 30, years: 365 }[unit] || 1;
                        setNewProduct({
                          ...newProduct,
                          shelfLifeUnit: unit,
                          shelfLifeDays: Math.round((newProduct.shelfLifeValue || 0) * multiplier),
                        });
                      }}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Días</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
                        <SelectItem value="years">Años</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storageTemperature">Temperatura de Almacenamiento</Label>
                  <Select value={newProduct.storageTemperature} onValueChange={(value) => setNewProduct({ ...newProduct, storageTemperature: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una temperatura" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ambiente">Ambiente</SelectItem>
                      <SelectItem value="refrigerado">Refrigerado</SelectItem>
                      <SelectItem value="congelado">Congelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>

          {/* Primary Variant */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <h4 className="text-lg font-medium mb-4">Variante Inicial (Requerida)</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="variantName">Nombre Variante</Label>
                <Input
                  id="variantName"
                  value={newProduct.variant.name}
                  onChange={(e) => setNewProduct({ ...newProduct, variant: { ...newProduct.variant, name: e.target.value } })}
                  placeholder={getPlaceholder('variantName', 'Ej: 1kg')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantUnit">Unidad</Label>
                <Input
                  id="variantUnit"
                  value={newProduct.variant.unit}
                  onChange={(e) => setNewProduct({ ...newProduct, variant: { ...newProduct.variant, unit: e.target.value } })}
                  placeholder={getPlaceholder('variantUnit', 'Ej: kg, unidad')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantUnitSize">Tamaño Unidad</Label>
                <Input
                  id="variantUnitSize"
                  type="number"
                  step="0.01"
                  value={newProduct.variant.unitSize}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      variant: { ...newProduct.variant, unitSize: parseFloat(e.target.value) || 0 },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="variantBasePrice">Precio de Venta ($)</Label>
                <Input
                  id="variantBasePrice"
                  type="number"
                  value={newProduct.variant.basePrice}
                  onFocus={() => {
                    if (newProduct.variant.basePrice === 0) {
                      setNewProduct({ ...newProduct, variant: { ...newProduct.variant, basePrice: '' } });
                    }
                  }}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, variant: { ...newProduct.variant, basePrice: e.target.value } });
                  }}
                  onBlur={() => {
                    const price = parseFloat(newProduct.variant.basePrice);
                    if (isNaN(price) || newProduct.variant.basePrice === '') {
                      setNewProduct({ ...newProduct, variant: { ...newProduct.variant, basePrice: 0 } });
                    } else {
                      setNewProduct({ ...newProduct, variant: { ...newProduct.variant, basePrice: price } });
                    }
                  }}
                />
              </div>
            </div>
          </div>

          {/* Multiple Selling Units */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-medium">Unidades de Venta Múltiples</h4>
                <p className="text-sm text-muted-foreground">Configura diferentes unidades (kg, g, lb, cajas, etc.)</p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="hasMultipleSellingUnits"
                  checked={newProduct.hasMultipleSellingUnits}
                  onCheckedChange={(checked) => setNewProduct({ ...newProduct, hasMultipleSellingUnits: checked })}
                />
                <Label htmlFor="hasMultipleSellingUnits">Habilitar</Label>
              </div>
            </div>

            {newProduct.hasMultipleSellingUnits && (
              <div className="mb-4 p-3 bg-info-muted border border-info/30 rounded-md">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-200 mb-1">IMPORTANTE - Configuración de Contenido:</p>
                <p className="text-xs text-blue-800 dark:text-blue-300 mb-2">
                  El inventario SIEMPRE se guarda en <span className="font-bold">"{newProduct.unitOfMeasure}"</span> (la unidad principal).
                  Aquí debes definir <span className="font-bold">cuántas unidades de venta</span> están contenidas en 1 unidad principal.
                </p>
                <div className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <p className="font-semibold">Ejemplos:</p>
                  <p>• Si la unidad base es "Saco" y vendes en "kg": Contenido = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">20</span> (1 Saco trae 20 kg)</p>
                  <p>• Si la unidad base es "Caja" y vendes en "Unidad": Contenido = <span className="font-mono bg-white dark:bg-gray-800 px-1 rounded">24</span> (1 Caja trae 24 unidades)</p>
                </div>
              </div>
            )}

            {newProduct.hasMultipleSellingUnits && (
              <div className="space-y-4">
                {newProduct.sellingUnits.map((unit, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <h5 className="font-medium">Unidad {index + 1}</h5>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const units = [...newProduct.sellingUnits];
                          units.splice(index, 1);
                          setNewProduct({ ...newProduct, sellingUnits: units });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label>Nombre</Label>
                        <Input
                          placeholder="Ej: Kilogramos"
                          value={unit.name || ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], name: e.target.value };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Abreviación</Label>
                        <Input
                          placeholder="Ej: kg"
                          value={unit.abbreviation || ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], abbreviation: e.target.value };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="flex items-center space-x-2 pt-8">
                        <Checkbox
                          id={`np-su-weight-${index}`}
                          checked={unit.isSoldByWeight || false}
                          onCheckedChange={(checked) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], isSoldByWeight: checked };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                        <Label htmlFor={`np-su-weight-${index}`}>Vendido por peso</Label>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          Contenido por {newProduct.unitOfMeasure}
                          <span className="text-xs text-muted-foreground p-1">(¿Cuántos {unit.abbreviation || 'unidad'} tiene 1 {newProduct.unitOfMeasure}?)</span>
                        </Label>
                        <Input
                          type="number"
                          step="0.001"
                          placeholder="Ej: 20"
                          value={unit.conversionFactorInput ?? ''}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            const parsed = parseFloat(rawValue);
                            const calculatedFactor = parsed > 0 ? (1 / parsed) : null;
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], conversionFactorInput: rawValue, conversionFactor: calculatedFactor };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                        <p className="text-xs text-muted-foreground font-medium text-info mt-1">
                          {unit.conversionFactorInput ? `1 ${newProduct.unitOfMeasure} contiene ${unit.conversionFactorInput} ${unit.abbreviation || 'unidad'}` : 'Define el contenido'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Precio/Unidad ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ej: 15.00"
                          value={unit.pricePerUnit ?? ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], pricePerUnit: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Costo/Unidad ($)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ej: 12.00"
                          value={unit.costPerUnit ?? ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], costPerUnit: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Cant. Mínima</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ej: 0.5"
                          value={unit.minimumQuantity || ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], minimumQuantity: parseFloat(e.target.value) || 0 };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Incremento</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Ej: 0.5"
                          value={unit.incrementStep || ''}
                          onChange={(e) => {
                            const units = [...newProduct.sellingUnits];
                            units[index] = { ...units[index], incrementStep: parseFloat(e.target.value) || 0 };
                            setNewProduct({ ...newProduct, sellingUnits: units });
                          }}
                        />
                      </div>
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`np-default-${index}`}
                            checked={unit.isDefault || false}
                            onCheckedChange={(checked) => {
                              const units = newProduct.sellingUnits.map((u, i) => ({
                                ...u,
                                isDefault: i === index ? checked : false
                              }));
                              setNewProduct({ ...newProduct, sellingUnits: units });
                            }}
                          />
                          <Label htmlFor={`np-default-${index}`}>Por defecto</Label>
                        </div>
                      </div>
                      <div className="space-y-2 flex items-end">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`np-active-${index}`}
                            checked={unit.isActive !== false}
                            onCheckedChange={(checked) => {
                              const units = [...newProduct.sellingUnits];
                              units[index] = { ...units[index], isActive: checked };
                              setNewProduct({ ...newProduct, sellingUnits: units });
                            }}
                          />
                          <Label htmlFor={`np-active-${index}`}>Activa</Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNewProduct({
                      ...newProduct,
                      sellingUnits: [...newProduct.sellingUnits, {
                        name: '',
                        abbreviation: '',
                        conversionFactor: 1,
                        conversionFactorInput: '1',
                        pricePerUnit: 0,
                        costPerUnit: 0,
                        isActive: true,
                        isDefault: newProduct.sellingUnits.length === 0,
                        minimumQuantity: 0,
                        incrementStep: 0
                      }]
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Unidad
                </Button>
              </div>
            )}
          </div>

          {/* Inventory Config */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <h4 className="text-lg font-medium mb-4">Configuración de Inventario</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Stock Mínimo</Label>
                <Input
                  type="number"
                  value={newProduct.inventoryConfig.minimumStock}
                  onChange={(e) => setNewProduct({ ...newProduct, inventoryConfig: { ...newProduct.inventoryConfig, minimumStock: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Stock Máximo</Label>
                <Input
                  type="number"
                  value={newProduct.inventoryConfig.maximumStock}
                  onChange={(e) => setNewProduct({ ...newProduct, inventoryConfig: { ...newProduct.inventoryConfig, maximumStock: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Punto de Reorden</Label>
                <Input
                  type="number"
                  value={newProduct.inventoryConfig.reorderPoint}
                  onChange={(e) => setNewProduct({ ...newProduct, inventoryConfig: { ...newProduct.inventoryConfig, reorderPoint: parseInt(e.target.value) || 0 } })}
                />
              </div>
              <div className="space-y-2">
                <Label>Cantidad de Reorden</Label>
                <Input
                  type="number"
                  value={newProduct.inventoryConfig.reorderQuantity}
                  onChange={(e) => setNewProduct({ ...newProduct, inventoryConfig: { ...newProduct.inventoryConfig, reorderQuantity: parseInt(e.target.value) || 0 } })}
                />
              </div>
            </div>
          </div>

          {/* Initial Inventory */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <h4 className="text-lg font-medium mb-4">Inventario Inicial</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invQuantity">Cantidad Inicial</Label>
                <Input id="invQuantity" type="number" value={newProduct.inventory.quantity} onChange={(e) => setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, quantity: parseInt(e.target.value) || 0 } })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invCostPrice">Precio Costo ($)</Label>
                <Input
                  id="invCostPrice"
                  type="number"
                  value={newProduct.inventory.costPrice}
                  onFocus={() => {
                    if (newProduct.inventory.costPrice === 0) {
                      setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, costPrice: '' } });
                    }
                  }}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, costPrice: e.target.value } });
                  }}
                  onBlur={() => {
                    const price = parseFloat(newProduct.inventory.costPrice);
                    if (isNaN(price) || newProduct.inventory.costPrice === '') {
                      setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, costPrice: 0 } });
                    } else {
                      setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, costPrice: price } });
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invDiscount">Descuento (%)</Label>
                <Input
                  id="invDiscount"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={newProduct.inventory.discount || ''}
                  onChange={(e) => {
                    setNewProduct({ ...newProduct, inventory: { ...newProduct.inventory, discount: e.target.value } });
                  }}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Precio Final ($)</Label>
                <div className="h-10 px-3 py-2 border rounded-md bg-muted flex items-center justify-between">
                  <span className="font-medium">
                    ${(Number(newProduct.inventory.costPrice) * (1 - (Number(newProduct.inventory.discount) || 0) / 100)).toFixed(2)}
                  </span>
                  {newProduct.inventory.discount > 0 && (
                    <span className="text-xs text-green-600 font-semibold">-{newProduct.inventory.discount}%</span>
                  )}
                </div>
              </div>
              {showLotFields && newProduct.isPerishable && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="invLotNumber">Número de Lote</Label>
                    <Input
                      id="invLotNumber"
                      value={newProduct.inventory.lotNumber}
                      onChange={(e) =>
                        setNewProduct({
                          ...newProduct,
                          inventory: { ...newProduct.inventory, lotNumber: e.target.value },
                        })
                      }
                      placeholder="Opcional"
                    />
                  </div>
                  {showExpirationFields && (
                    <div className="space-y-2">
                      <Label htmlFor="invExpirationDate">Fecha de Vencimiento</Label>
                      <Input
                        id="invExpirationDate"
                        type="date"
                        value={newProduct.inventory.expirationDate}
                        onChange={(e) =>
                          setNewProduct({
                            ...newProduct,
                            inventory: { ...newProduct.inventory, expirationDate: e.target.value },
                          })
                        }
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Supplier */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <h4 className="text-lg font-medium mb-4">Proveedor</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre de la Empresa</Label>
                <SearchableSelect
                  isCreatable
                  options={supplierOptions}
                  onSelection={handleSupplierSelectionForNewProduct}
                  value={
                    newProduct.supplier.supplierId
                      ? { value: newProduct.supplier.supplierId, label: newProduct.supplier.newSupplierName }
                      : newProduct.supplier.newSupplierName
                        ? { value: newProduct.supplier.newSupplierName, label: newProduct.supplier.newSupplierName }
                        : null
                  }
                  placeholder="Escriba o seleccione un proveedor..."
                />
              </div>
              <div className="space-y-2">
                <Label>RIF / C.I.</Label>
                <div className="flex items-center border border-input rounded-md">
                  <Select
                    value={newProduct.supplier.rifPrefix}
                    onValueChange={(val) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, rifPrefix: val } })}
                    disabled={!newProduct.supplier.isNew}
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
                    value={newProduct.supplier.newSupplierRif}
                    onChange={(e) => {
                      const formatted = formatRifInput(e.target.value, newProduct.supplier.rifPrefix);
                      setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierRif: formatted } });
                    }}
                    placeholder="12345678-9"
                    disabled={!newProduct.supplier.isNew}
                    className="flex-1 rounded-l-none !border-0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre del Vendedor</Label>
                <Input
                  value={newProduct.supplier.newSupplierContactName}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierContactName: e.target.value } })}
                  disabled={!newProduct.supplier.isNew}
                />
              </div>
              <div className="space-y-2">
                <Label>Teléfono del Vendedor</Label>
                <Input
                  value={newProduct.supplier.newSupplierContactPhone}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierContactPhone: e.target.value } })}
                  disabled={!newProduct.supplier.isNew}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Email del Contacto</Label>
                <Input
                  value={newProduct.supplier.newSupplierContactEmail}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierContactEmail: e.target.value } })}
                  disabled={!newProduct.supplier.isNew}
                  placeholder="email@ejemplo.com"
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Dirección</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Input placeholder="Ciudad" value={newProduct.supplier.newSupplierAddress.city} onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierAddress: { ...newProduct.supplier.newSupplierAddress, city: e.target.value } } })} disabled={!newProduct.supplier.isNew} />
                  <Input placeholder="Estado" value={newProduct.supplier.newSupplierAddress.state} onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierAddress: { ...newProduct.supplier.newSupplierAddress, state: e.target.value } } })} disabled={!newProduct.supplier.isNew} />
                  <Input placeholder="Calle, Av, Local..." value={newProduct.supplier.newSupplierAddress.street} onChange={(e) => setNewProduct({ ...newProduct, supplier: { ...newProduct.supplier, newSupplierAddress: { ...newProduct.supplier.newSupplierAddress, street: e.target.value } } })} disabled={!newProduct.supplier.isNew} />
                </div>
              </div>
            </div>
          </div>

          {/* Date, Document Type, Invoice Number */}
          <div className="col-span-2 border-t pt-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Compra</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal"><CalendarIcon className="mr-2 h-4 w-4" />{newProduct.purchaseDate ? format(newProduct.purchaseDate, "PPP") : <span>Selecciona una fecha</span>}</Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={newProduct.purchaseDate} onSelect={(date) => setNewProduct({ ...newProduct, purchaseDate: date })} initialFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-200">
                  Tipo de Documento <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={newProduct.documentType}
                  onValueChange={(value) => setNewProduct(prev => ({ ...prev, documentType: value }))}
                >
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100">
                    <SelectValue placeholder="Selecciona tipo de documento" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                    <SelectItem value="factura_fiscal" className="dark:text-gray-100">Factura Fiscal</SelectItem>
                    <SelectItem value="nota_entrega" className="dark:text-gray-100">Nota de Entrega</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Factura Fiscal incluye IVA (16%). Compra calculada en $ BCV.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="dark:text-gray-200">
                  {newProduct.documentType === 'nota_entrega' ? 'Nº Nota de Entrega' : 'Nº Factura'}
                </Label>
                <Input
                  placeholder="Ej: 00012345"
                  value={newProduct.invoiceNumber}
                  onChange={(e) => setNewProduct(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                  className="dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Payment Terms */}
          <CompraPaymentSection
            paymentTerms={newProduct.paymentTerms}
            setPaymentTerms={(updates) => {
              setNewProduct(prev => ({
                ...prev,
                paymentTerms: { ...prev.paymentTerms, ...updates }
              }));
            }}
            purchaseDate={newProduct.purchaseDate}
            paymentDueDateOpen={npPaymentDueDateOpen}
            setPaymentDueDateOpen={setNpPaymentDueDateOpen}
            idPrefix="np-"
          />

          {/* Purchase Summary */}
          {newProductTotals.subtotal > 0 && (
            <div className="col-span-2 border-t pt-4 mt-4">
              <div className="flex justify-end">
                <div className="w-64 space-y-1 text-sm bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">Resumen de Compra</h4>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${newProductTotals.subtotal.toFixed(2)}</span>
                  </div>
                  {newProduct.documentType === 'factura_fiscal' && newProductTotals.iva > 0 && (
                    <div className="flex justify-between text-blue-600">
                      <span>IVA (16%):</span>
                      <span>${newProductTotals.iva.toFixed(2)}</span>
                    </div>
                  )}
                  {newProduct.documentType === 'factura_fiscal' && newProductTotals.igtf > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>IGTF (3%):</span>
                      <span>${newProductTotals.igtf.toFixed(2)}</span>
                    </div>
                  )}
                  {newProduct.documentType === 'nota_entrega' && (
                    <div className="flex justify-between text-amber-600 text-xs">
                      <span>Sin IVA/IGTF (Nota de Entrega)</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base border-t pt-1 mt-1">
                    <span>Total:</span>
                    <span>${newProductTotals.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleAddProduct}>Crear Producto</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

