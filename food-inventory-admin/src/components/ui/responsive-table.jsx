import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import { MoreHorizontal } from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

/**
 * ResponsiveTable — Desktop table / Mobile card list.
 *
 * On desktop (>=600px): renders a standard HTML table.
 * On mobile (<600px): renders stacked cards with primary field prominent,
 * secondary fields in a 2-column grid, and actions in a dropdown menu.
 *
 * @param {Array<{key, label, primary?, render?, className?}>} columns
 *   - key: field name in data object
 *   - label: display name
 *   - primary: boolean — the main field shown large on mobile cards
 *   - render: (value, row) => ReactNode — custom cell renderer
 *   - className: extra classes for the th/td
 *   - hideOnMobile: boolean — hide this column on mobile cards
 *
 * @param {Array<Object>} data — array of row objects
 * @param {string} keyField — unique ID field name (default: "_id")
 * @param {Array<{label, icon?, onClick, variant?}>} actions — row-level actions
 * @param {(row) => void} onRowClick — click handler for the row/card
 * @param {string} className
 * @param {React.ReactNode} emptyState — shown when data is empty
 */
function ResponsiveTable({
  columns = [],
  data = [],
  keyField = "_id",
  actions = [],
  onRowClick,
  className,
  emptyState,
}) {
  const isMobile = useIsMobile()

  if (data.length === 0 && emptyState) {
    return emptyState
  }

  if (isMobile) {
    return (
      <MobileCardList
        columns={columns}
        data={data}
        keyField={keyField}
        actions={actions}
        onRowClick={onRowClick}
        className={className}
      />
    )
  }

  return (
    <DesktopTable
      columns={columns}
      data={data}
      keyField={keyField}
      actions={actions}
      onRowClick={onRowClick}
      className={className}
    />
  )
}

function DesktopTable({ columns, data, keyField, actions, onRowClick, className }) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.key} className={col.className}>
              {col.label}
            </TableHead>
          ))}
          {actions.length > 0 && (
            <TableHead className="w-10">
              <span className="sr-only">Acciones</span>
            </TableHead>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row[keyField]}
            className={cn(onRowClick && "cursor-pointer")}
            onClick={() => onRowClick?.(row)}
          >
            {columns.map((col) => (
              <TableCell key={col.key} className={col.className}>
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </TableCell>
            ))}
            {actions.length > 0 && (
              <TableCell>
                <RowActions actions={actions} row={row} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function MobileCardList({ columns, data, keyField, actions, onRowClick, className }) {
  const primaryCol = columns.find((c) => c.primary) || columns[0]
  const secondaryCols = columns.filter(
    (c) => c !== primaryCol && !c.hideOnMobile
  )

  return (
    <div className={cn("space-y-3", className)}>
      {data.map((row) => (
        <div
          key={row[keyField]}
          className={cn(
            "rounded-xl border bg-card p-4 space-y-2.5 transition-shadow",
            "active:scale-[0.98] active:transition-transform",
            onRowClick && "cursor-pointer hover:shadow-md"
          )}
          onClick={() => onRowClick?.(row)}
        >
          {/* Header: primary field + actions */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              {primaryCol.label && (
                <p className="text-xs text-muted-foreground mb-0.5">
                  {primaryCol.label}
                </p>
              )}
              <p className="font-semibold text-sm truncate">
                {primaryCol.render
                  ? primaryCol.render(row[primaryCol.key], row)
                  : row[primaryCol.key]}
              </p>
            </div>
            {actions.length > 0 && (
              <RowActions actions={actions} row={row} />
            )}
          </div>

          {/* Secondary fields in 2-column grid */}
          {secondaryCols.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              {secondaryCols.map((col) => (
                <div key={col.key} className="min-w-0">
                  <p className="text-xs text-muted-foreground">{col.label}</p>
                  <p className="truncate">
                    {col.render
                      ? col.render(row[col.key], row)
                      : row[col.key] ?? "—"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function RowActions({ actions, row }) {
  if (actions.length === 1) {
    const action = actions[0]
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation()
          action.onClick(row)
        }}
      >
        {action.icon || <MoreHorizontal className="h-4 w-4" />}
        <span className="sr-only">{action.label}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {actions.map((action) => (
          <DropdownMenuItem
            key={action.label}
            onClick={(e) => {
              e.stopPropagation()
              action.onClick(row)
            }}
            className={cn(
              action.variant === "destructive" && "text-destructive focus:text-destructive"
            )}
          >
            {action.icon && <span className="mr-2">{action.icon}</span>}
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { ResponsiveTable, MobileCardList, DesktopTable }
