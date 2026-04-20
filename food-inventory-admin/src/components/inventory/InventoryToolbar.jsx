/**
 * InventoryToolbar.jsx
 *
 * Top action bar for the Inventory Management module.
 * Contains import/export dropdowns, refresh button, label wizard button,
 * dynamic template alert, search input, column visibility toggle,
 * and category filter.
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
} from 'lucide-react';

/**
 * @param {object} props
 * @param {Function} props.onImport - triggers file input click
 * @param {Function} props.onDownloadTemplate - downloads the XLSX template
 * @param {Function} props.onOpenExportDialog - opens export dialog with format
 * @param {Function} props.onRefresh - reloads data
 * @param {boolean} props.loading - whether data is currently loading
 * @param {Function} props.onOpenLabelWizard - opens label wizard
 * @param {React.RefObject} props.fileInputRef - ref for hidden file input
 * @param {Function} props.onFileSelect - handles file input change
 * @param {Array} props.inventoryAttributeColumns - dynamic attribute column descriptors
 * @param {string} props.searchTerm - current search value
 * @param {Function} props.onSearchChange - search input handler
 * @param {string} props.searchPlaceholder - placeholder for search
 * @param {object} props.visibleColumns - column visibility map
 * @param {Function} props.onVisibleColumnsChange - updates visible columns
 * @param {string} props.filterCategory - selected category filter
 * @param {Function} props.onFilterCategoryChange - category filter handler
 * @param {Array} props.categories - available categories
 */
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-start items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"><Upload className="h-4 w-4 mr-2" />Importar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onSelect={onImport}>Importar Archivo</DropdownMenuItem>
              <DropdownMenuItem onSelect={onDownloadTemplate}>Descargar Plantilla</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".xlsx, .csv"
            onChange={onFileSelect}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto"><Download className="h-4 w-4 mr-2" />Exportar</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onOpenExportDialog('xlsx')}>Exportar a .xlsx</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onOpenExportDialog('csv')}>Exportar a .csv</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={onRefresh} disabled={loading} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
          <Button variant="secondary" size="sm" onClick={onOpenLabelWizard} className="w-full sm:w-auto">
            <Printer className="h-4 w-4 mr-2" /> Imprimir Etiquetas
          </Button>
          {onAddInventory && (
            <Button size="sm" onClick={onAddInventory} className="bg-[#FB923C] hover:bg-[#F97316] text-white w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" /> Agregar Inventario
            </Button>
          )}
        </div>
        <div className="space-y-4">
          {inventoryAttributeColumns.length > 0 && (
            <Alert variant="info">
              <AlertTitle>Plantilla dinámica por vertical</AlertTitle>
              <AlertDescription>
                {`Además de SKU y NuevaCantidad, incluye la columna VariantSKU y las columnas `}
                <code>{`inventoryAttr_{clave}`}</code>
                {` para los siguientes atributos: `}
                {inventoryAttributeColumns
                  .map(({ descriptor }) => descriptor.label || descriptor.key)
                  .join(', ')}
                . Los valores deben coincidir con los atributos configurados en Productos.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Search + Columns + Category filter (inside CardContent) */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mb-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">Columnas</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Alternar columnas</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={visibleColumns.sku} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, sku: checked }))}>SKU</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.product} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, product: checked }))}>Producto</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.category} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, category: checked }))}>Categoría</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.available} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, available: checked }))}>Stock</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.cost} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, cost: checked }))}>Costo</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.location} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, location: checked }))}>Ubicación</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.expiration} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, expiration: checked }))}>Vencimiento</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.lots} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, lots: checked }))}>Lotes</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.sellingPrice} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, sellingPrice: checked }))}>Precio Venta</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.totalValue} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, totalValue: checked }))}>Valor Total</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.status} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, status: checked }))}>Estado</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={visibleColumns.actions} onCheckedChange={(checked) => onVisibleColumnsChange(prev => ({ ...prev, actions: checked }))}>Acciones</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Select value={filterCategory} onValueChange={onFilterCategoryChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filtrar por categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((category, index) => (
              <SelectItem key={`category-${index}-${category}`} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
