import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from "@tanstack/react-table";

export function OrdersDataTableV2({ columns, data, pagination, onPageChange, pageLimit, onPageLimitChange }) {
  const table = useReactTable({
    data: data || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // We are handling pagination manually
    pageCount: pagination?.totalPages ?? -1,
  });

  const handlePreviousPage = () => {
    if (pagination.page > 1) {
      onPageChange(pagination.page - 1);
    }
  };

  const handleNextPage = () => {
    if (pagination.page < pagination.totalPages) {
      onPageChange(pagination.page + 1);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(headerGroup => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map(row => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Mostrando {data?.length || 0} de {pagination.total || 0} órdenes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Filas por página:</p>
              <Select
                value={pageLimit?.toString() || "25"}
                onValueChange={(value) => onPageLimitChange?.(parseInt(value))}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pageLimit?.toString() || "25"} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 25, 50, 100].map((limit) => (
                    <SelectItem key={limit} value={limit.toString()}>
                      {limit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pagination.totalPages > 1 && (
              <>
                <div className="text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={pagination.page <= 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}