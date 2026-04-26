/**
 * InventoryToolbar.jsx
 *
 * Simplified toolbar: search + primary CTA visible, secondary actions in menu.
 * UX principle: Progressive Disclosure — show only what's needed.
 */
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import {
  Search,
  Download,
  Upload,
  RefreshCw,
  Printer,
  Plus,
  MoreHorizontal,
  FileSpreadsheet,
} from 'lucide-react';

export function InventoryToolbar({
  onImport,
  onDownloadTemplate,
  onOpenExportDialog,
  onRefresh,
  loading,
  onOpenLabelWizard,
  onAddInventory,
  fileInputRef,
  onFileSelect,
  inventoryAttributeColumns,
  searchTerm,
  onSearchChange,
  searchPlaceholder,
  visibleColumns,
  onVisibleColumnsChange,
  filterCategory,
  onFilterCategoryChange,
  categories,
}) {
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        accept=".xlsx, .csv"
        onChange={onFileSelect}
      />

      {/* Dynamic template alert — only when needed */}
      {inventoryAttributeColumns.length > 0 && (
        <Alert variant="info" className="mb-4">
          <AlertTitle>Plantilla dinamica por vertical</AlertTitle>
          <AlertDescription>
            {`Ademas de SKU y NuevaCantidad, incluye la columna VariantSKU y las columnas `}
            <code>{`inventoryAttr_{clave}`}</code>
            {` para los siguientes atributos: `}
            {inventoryAttributeColumns
              .map(({ descriptor }) => descriptor.label || descriptor.key)
              .join(', ')}
            . Los valores deben coincidir con los atributos configurados en Productos.
          </AlertDescription>
        </Alert>
      )}

      {/* Single row: Search + Category + Actions menu + Primary CTA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4">
        {/* Search — takes most space */}
        <div className="flex-1 relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Category filter */}
        <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
          <SelectTrigger className="w-full sm:w-[180px] shrink-0">
            <SelectValue placeholder="Todas las categorias" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorias</SelectItem>
            {categories.map((category, index) => (
              <SelectItem key={`category-${index}-${category}`} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Consolidated "More" menu — Importar, Exportar, Columnas, Etiquetas, Refresh */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0" title="Mas opciones">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={onRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Actualizando...' : 'Actualizar datos'}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={onImport}>
              <Upload className="h-4 w-4 mr-2" />
              Importar archivo
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={onDownloadTemplate}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Descargar plantilla
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenExportDialog('xlsx')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a .xlsx
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onOpenExportDialog('csv')}>
              <Download className="h-4 w-4 mr-2" />
              Exportar a .csv
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem onSelect={onOpenLabelWizard}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir etiquetas
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={visibleColumns.sku} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, sku: checked }))}>SKU</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.product} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, product: checked }))}>Producto</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, category: checked }))}>Categoria</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.available} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, available: checked }))}>Stock</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.cost} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, cost: checked }))}>Costo</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.location} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, location: checked }))}>Ubicacion</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.expiration} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, expiration: checked }))}>Vencimiento</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.lots} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, lots: checked }))}>Lotes</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.sellingPrice} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, sellingPrice: checked }))}>Precio Venta</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.totalValue} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, totalValue: checked }))}>Valor Total</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, status: checked }))}>Estado</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.actions} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, actions: checked }))}>Acciones</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Primary CTA — always visible */}
        {onAddInventory && (
          <Button size="sm" onClick={onAddInventory} className="bg-[#FB923C] hover:bg-[#F97316] text-white shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        )}
      </div>
    </>
  );
}
