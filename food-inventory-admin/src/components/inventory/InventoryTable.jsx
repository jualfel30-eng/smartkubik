/**
 * InventoryTable.jsx
 *
 * The main data table for inventory items. Includes sortable column headers
 * and row rendering with all visible column data.
 */
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import {
  Edit,
  Trash2,
  Package,
  MapPin,
  ArrowRightLeft,
  Loader2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

/**
 * Renders the status badge for an inventory item.
 */
function StatusBadge({ status }) {
  if (status === 'lowStock') return <Badge variant="destructive">Stock Crítico</Badge>;
  if (status === 'nearExpiration') return <Badge variant="secondary" className="bg-warning/10 text-orange-800">Próximo a Vencer</Badge>;
  return <Badge className="bg-success/10 text-green-800">Disponible</Badge>;
}

/**
 * Renders a sort indicator icon for a column header.
 */
function SortIcon({ columnKey, sortBy, sortOrder }) {
  if (sortBy === columnKey) {
    return sortOrder === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  }
  return <ChevronsUpDown className="h-4 w-4" />;
}

/**
 * @param {object} props
 * @param {Array} props.data - filtered inventory items to display
 * @param {boolean} props.loading - show loading overlay
 * @param {object} props.visibleColumns - column visibility map
 * @param {string} props.sortBy - current sort field
 * @param {string} props.sortOrder - 'asc' or 'desc'
 * @param {Function} props.onSort - (field, defaultOrder) => void
 * @param {boolean} props.multiWarehouseEnabled - feature flag
 * @param {Array} props.binLocations - all bin locations
 * @param {Array} props.warehouses - all warehouses
 * @param {Function} props.formatProductCategory - category formatter
 * @param {Function} props.getBinLocationName - bin location name resolver
 * @param {Function} props.getStatusBadge - returns status string for item
 * @param {Function} props.onEdit - edit handler
 * @param {Function} props.onDelete - delete handler
 * @param {Function} props.onTransfer - transfer handler
 * @param {Function} props.onViewLots - (item) => void
 */
export function InventoryTable({
  data,
  loading,
  visibleColumns,
  sortBy,
  sortOrder,
  onSort,
  multiWarehouseEnabled,
  binLocations,
  warehouses,
  formatProductCategory,
  getBinLocationName,
  getStatusBadge,
  onEdit,
  onDelete,
  onTransfer,
  onViewLots,
}) {
  const handleColumnSort = (field, defaultOrder = 'asc') => {
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, defaultOrder);
    }
  };

  return (
    <div className="rounded-md border relative">
      {loading && <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
      <Table>
        <TableHeader>
          <TableRow>
            {visibleColumns.sku && (
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleColumnSort('sku', 'asc')}
              >
                <div className="flex items-center space-x-1">
                  <span>SKU</span>
                  <span className="text-muted-foreground">
                    <SortIcon columnKey="sku" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </div>
              </TableHead>
            )}
            {visibleColumns.product && (
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleColumnSort('productName', 'asc')}
              >
                <div className="flex items-center space-x-1">
                  <span>Producto</span>
                  <span className="text-muted-foreground">
                    <SortIcon columnKey="productName" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </div>
              </TableHead>
            )}
            {visibleColumns.category && <TableHead>Categoría</TableHead>}
            {visibleColumns.available && (
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleColumnSort('availableQuantity', 'desc')}
              >
                <div className="flex items-center space-x-1">
                  <span>Stock Disponible</span>
                  <span className="text-muted-foreground">
                    <SortIcon columnKey="availableQuantity" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </div>
              </TableHead>
            )}
            {visibleColumns.cost && (
              <TableHead
                className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                onClick={() => handleColumnSort('cost', 'desc')}
              >
                <div className="flex items-center space-x-1">
                  <span>Costo Promedio</span>
                  <span className="text-muted-foreground">
                    <SortIcon columnKey="cost" sortBy={sortBy} sortOrder={sortOrder} />
                  </span>
                </div>
              </TableHead>
            )}
            {visibleColumns.sellingPrice && <TableHead>Precio Venta</TableHead>}
            {visibleColumns.totalValue && <TableHead>Valor Total</TableHead>}
            {multiWarehouseEnabled && binLocations.length > 0 && visibleColumns.location && <TableHead>Ubicación</TableHead>}
            {visibleColumns.expiration && <TableHead>Vencimiento (1er Lote)</TableHead>}
            {visibleColumns.lots && <TableHead>Lotes</TableHead>}
            {visibleColumns.status && <TableHead>Estado</TableHead>}
            {visibleColumns.actions && <TableHead>Acciones</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item._id}>
              {visibleColumns.sku && <TableCell className="font-medium">{item.productSku}</TableCell>}
              {visibleColumns.product && (
                <TableCell>
                  <div>
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">{item.productId?.brand || 'N/A'}</div>
                  </div>
                </TableCell>
              )}
              {visibleColumns.category && <TableCell>{formatProductCategory(item.productId?.category)}</TableCell>}
              {visibleColumns.available && <TableCell>{item.availableQuantity} unidades</TableCell>}
              {visibleColumns.cost && <TableCell>${item.averageCostPrice.toFixed(2)}</TableCell>}
              {visibleColumns.sellingPrice && (
                <TableCell>
                  ${(() => {
                    const variants = item.productId?.variants || [];
                    const variant = item.variantSku
                      ? variants.find(v => v.sku === item.variantSku)
                      : variants[0];
                    const price = variant?.basePrice || 0;
                    return price.toFixed(2);
                  })()}
                </TableCell>
              )}
              {visibleColumns.totalValue && (
                <TableCell>
                  ${(() => {
                    const variants = item.productId?.variants || [];
                    const variant = item.variantSku
                      ? variants.find(v => v.sku === item.variantSku)
                      : variants[0];
                    const price = variant?.basePrice || 0;
                    return (item.availableQuantity * price).toFixed(2);
                  })()}
                </TableCell>
              )}
              {multiWarehouseEnabled && binLocations.length > 0 && visibleColumns.location && (
                <TableCell>
                  {getBinLocationName(item.binLocationId) ? (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">{getBinLocationName(item.binLocationId)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin ubicación</span>
                  )}
                </TableCell>
              )}
              {visibleColumns.expiration && (
                <TableCell>
                  {item.lots && item.lots.length > 0 ? (
                    <span>{new Date(item.lots[0].expirationDate).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </TableCell>
              )}
              {visibleColumns.lots && (
                <TableCell>
                  {item.lots && item.lots.length > 0 ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewLots(item)}
                    >
                      <Package className="h-4 w-4 mr-1" />
                      {item.lots.length === 1 ? 'Ver lote' : `Ver ${item.lots.length} lotes`}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Sin lotes</span>
                  )}
                </TableCell>
              )}
              {visibleColumns.status && <TableCell><StatusBadge status={getStatusBadge(item)} /></TableCell>}
              {visibleColumns.actions && (
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                    {multiWarehouseEnabled && warehouses.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTransfer(item)}
                        title="Transferir a otro almacén"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onDelete(item._id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
