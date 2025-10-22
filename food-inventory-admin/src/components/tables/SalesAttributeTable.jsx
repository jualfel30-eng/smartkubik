import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';

const exportToCsv = (headers, rows, filename) => {
  const csvRows = [headers]
    .concat(rows)
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return '""';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([`\uFEFF${csvRows}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export function SalesAttributeTable({ schema = [], combinations = [] }) {
  const [selectedKey, setSelectedKey] = useState(schema[0]?.key ?? '');
  const [filterValue, setFilterValue] = useState('');

  const attributeColumns = useMemo(
    () => schema.map((descriptor) => ({
      key: descriptor.key,
      label: descriptor.label || descriptor.key,
    })),
    [schema],
  );

  const filteredCombinations = useMemo(() => {
    if (!selectedKey || !filterValue.trim()) {
      return combinations;
    }
    const normalizedFilter = filterValue.trim().toLowerCase();
    return combinations.filter((row) => {
      const value = row.attributes?.[selectedKey];
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(normalizedFilter);
    });
  }, [selectedKey, filterValue, combinations]);

  const handleExport = () => {
    if (!filteredCombinations.length) return;
    const headers = [
      'Producto',
      'SKU',
      'Variante',
      ...attributeColumns.map((column) => column.label),
      'UnidadesVendidas',
      'Ingresos',
    ];

    const rows = filteredCombinations.map((row) => [
      row.productName,
      row.productSku,
      row.variantSku || '',
      ...attributeColumns.map((column) => row.attributes?.[column.key] ?? ''),
      row.unitsSold ?? 0,
      row.totalRevenue ?? 0,
    ]);

    exportToCsv(headers, rows, 'ventas_por_atributos.csv');
  };

  if (!schema.length || !combinations.length) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ventas por atributos</CardTitle>
        <CardDescription>
          Agrupa las líneas de venta por los atributos configurados para la vertical. Usa estas combinaciones para planificar reposiciones o campañas.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label htmlFor="sales-attribute-key">Atributo</Label>
            <Select value={selectedKey} onValueChange={setSelectedKey}>
              <SelectTrigger id="sales-attribute-key">
                <SelectValue placeholder="Selecciona atributo" />
              </SelectTrigger>
              <SelectContent>
                {attributeColumns.map((column) => (
                  <SelectItem key={column.key} value={column.key}>
                    {column.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sales-attribute-filter">Valor contiene</Label>
            <Input
              id="sales-attribute-filter"
              value={filterValue}
              onChange={(event) => setFilterValue(event.target.value)}
              placeholder="Ej: Azul, 38, serial..."
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} className="ml-auto">
              Exportar CSV
            </Button>
          </div>
        </div>

        <ScrollArea className="max-h-[360px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Variante</TableHead>
                {attributeColumns.map((column) => (
                  <TableHead key={column.key}>{column.label}</TableHead>
                ))}
                <TableHead className="text-right">Unidades</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCombinations.map((row) => (
                <TableRow
                  key={`${row.productId}-${row.variantSku || 'base'}-${JSON.stringify(row.attributes || {})}`}
                >
                  <TableCell>
                    <div className="font-medium">{row.productName}</div>
                    <div className="text-xs text-muted-foreground">
                      {row.brand || '—'}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{row.productSku}</TableCell>
                  <TableCell className="font-mono text-xs">{row.variantSku || '—'}</TableCell>
                  {attributeColumns.map((column) => (
                    <TableCell key={column.key} className="text-xs">
                      {row.attributes?.[column.key] ?? '—'}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium">
                    {Number(row.unitsSold ?? 0).toLocaleString('es-VE')}
                  </TableCell>
                  <TableCell className="text-right">
                    {Number(row.totalRevenue ?? 0).toLocaleString('es-VE', {
                      style: 'currency',
                      currency: 'USD',
                      minimumFractionDigits: 2,
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
