/**
 * InventoryTable.jsx
 *
 * The main data table for inventory items. Includes sortable column headers,
 * animated row rendering, inline stock adjustment, and mini stock bars.
 */
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body.jsx';
import { ContentTransition } from '@/components/ui/content-transition.jsx';
import { Skeleton } from '@/components/ui/skeleton.jsx';
import InlineStockAdjust from '@/components/inventory/InlineStockAdjust.jsx';
import {
  Edit,
  Trash2,
  Package,
  MapPin,
  ArrowRightLeft,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';

/**
 * Renders the status badge for an inventory item.
 */
function StatusBadge({ status }) {
  if (status === 'lowStock') return <Badge variant="destructive">Stock Critico</Badge>;
  if (status === 'nearExpiration') return <Badge variant="secondary" className="bg-warning/10 text-orange-800">Proximo a Vencer</Badge>;
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
 * Mini stock bar visualization.
 */
function StockBar({ quantity, maxQuantity = 100 }) {
  const pct = Math.min(100, Math.max(0, (quantity / maxQuantity) * 100));
  const color = pct < 20 ? 'bg-red-500' : pct < 50 ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden inline-block ml-2 align-middle">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/**
 * Table skeleton for loading state.
 */
function TableSkeleton({ columns = 6 }) {
  return (
    <div className="rounded-md border p-4 space-y-3">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-10 flex-1 rounded" />
          ))}
        </div>
      ))}
    </div>
  );
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
 * @param {Function} [props.onAdjustComplete] - refresh callback after inline adjustment
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
  onAdjustComplete,
  selectable = false,
  isSelected,
  onToggleRow,
  onToggleAllPage,
  isAllPageSelected = false,
  isSomePageSelected = false,
}) {
  const handleColumnSort = (field, defaultOrder = 'asc') => {
    if (sortBy === field) {
      onSort(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, defaultOrder);
    }
  };

  return (
    <ContentTransition loading={loading} skeleton={<TableSkeleton columns={6} />}>
      <div className="rounded-md border">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-[44px]">
                  <Checkbox
                    aria-label="Seleccionar todos los de esta página"
                    checked={isAllPageSelected ? true : isSomePageSelected ? 'indeterminate' : false}
                    onCheckedChange={() => onToggleAllPage?.(data)}
                  />
                </TableHead>
              )}
              {visibleColumns.sku && (
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[8%]"
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
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[28%]"
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
              {visibleColumns.category && <TableHead className="w-[8%]">Categoria</TableHead>}
              {visibleColumns.available && (
                <TableHead
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[12%]"
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
                  className="cursor-pointer select-none hover:bg-muted/50 transition-colors w-[9%]"
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
              {visibleColumns.sellingPrice && <TableHead className="w-[8%]">Precio Venta</TableHead>}
              {visibleColumns.totalValue && <TableHead className="w-[8%]">Valor Total</TableHead>}
              {multiWarehouseEnabled && binLocations.length > 0 && visibleColumns.location && <TableHead className="w-[8%]">Ubicacion</TableHead>}
              {visibleColumns.expiration && <TableHead className="w-[10%]">Vencimiento</TableHead>}
              {visibleColumns.lots && <TableHead className="w-[7%]">Lotes</TableHead>}
              {visibleColumns.status && <TableHead className="w-[7%]">Estado</TableHead>}
              {visibleColumns.actions && <TableHead className="w-[12%]">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <AnimatedTableBody>
            {data.map((item) => (
              <AnimatedTableRow key={item._id} data-state={selectable && isSelected?.(item._id) ? 'selected' : undefined}>
                {selectable && (
                  <TableCell>
                    <Checkbox
                      aria-label={`Seleccionar ${item.productName}`}
                      checked={isSelected?.(item._id) || false}
                      onCheckedChange={() => onToggleRow?.(item)}
                    />
                  </TableCell>
                )}
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
                {visibleColumns.available && (
                  <TableCell>
                    {item.productId?.hasMultipleSellingUnits && item.productId?.sellingUnits?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="font-medium cursor-pointer inline-flex items-center gap-1 group hover:bg-muted/50 px-1 rounded transition-colors w-fit">
                              <span>{item.availableQuantity} {item.productId.unitOfMeasure || 'und'}</span>
                              <span className="text-xs text-emerald-500 font-bold group-hover:underline decoration-emerald-500">(+)</span>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-0" align="start">
                            <div className="p-3 border-b">
                              <h4 className="text-sm font-medium">Stock por unidad</h4>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-xs">Unidad</TableHead>
                                  <TableHead className="text-right text-xs">Cantidad</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {item.productId.sellingUnits.map((unit, idx) => {
                                  const qty = unit.conversionFactor > 0
                                    ? parseFloat((item.availableQuantity / unit.conversionFactor).toFixed(2))
                                    : item.availableQuantity;
                                  return (
                                    <TableRow key={idx}>
                                      <TableCell className="text-xs py-2">
                                        <div className="font-medium">{unit.name}</div>
                                        <div className="text-muted-foreground text-[10px]">{unit.abbreviation}</div>
                                      </TableCell>
                                      <TableCell className="text-right text-xs py-2 font-medium">
                                        {qty} {unit.abbreviation}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </PopoverContent>
                        </Popover>
                        <StockBar quantity={item.availableQuantity} />
                      </div>
                    ) : (
                      <>
                        <span>{item.availableQuantity} {item.productId?.unitOfMeasure || 'unidades'}</span>
                        <StockBar quantity={item.availableQuantity} />
                      </>
                    )}
                  </TableCell>
                )}
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
                      <span className="text-xs text-muted-foreground">Sin ubicacion</span>
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
                    <div className="flex items-center gap-1 relative">
                      <InlineStockAdjust item={item} onAdjustComplete={onAdjustComplete} />
                      <div className="flex space-x-1 ml-1">
                        <Button variant="outline" size="sm" onClick={() => onEdit(item)}><Edit className="h-4 w-4" /></Button>
                        {multiWarehouseEnabled && warehouses.length > 1 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onTransfer(item)}
                            title="Transferir a otro almacen"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onDelete(item._id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </TableCell>
                )}
              </AnimatedTableRow>
            ))}
          </AnimatedTableBody>
        </Table>
      </div>
    </ContentTransition>
  );
}
