import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';

export default function VariantMergePreview({ masterProduct, duplicateProducts, strategy }) {
  if (strategy === 'keep_master') {
    const variants = masterProduct?.variants || [];
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Vista previa de variantes (mantener maestro)</CardTitle>
        </CardHeader>
        <CardContent>
          {variants.length === 0 ? (
            <p className="text-sm text-muted-foreground">El producto maestro no tiene variantes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead>Origen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((v, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm">{v.name || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{v.sku || '—'}</TableCell>
                    <TableCell className="text-sm font-mono">{v.barcode || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
                        Maestro
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    );
  }

  // strategy === 'combine'
  const allVariants = [];
  const seenKeys = new Set();

  // Master variants first
  for (const v of masterProduct?.variants || []) {
    const key = (v.barcode || v.sku || v.name || '').toLowerCase();
    seenKeys.add(key);
    allVariants.push({ ...v, source: 'master', productName: masterProduct.name });
  }

  // Then duplicate variants
  for (const dup of duplicateProducts || []) {
    for (const v of dup.variants || []) {
      const key = (v.barcode || v.sku || v.name || '').toLowerCase();
      const isDuplicate = key && seenKeys.has(key);
      seenKeys.add(key);
      allVariants.push({
        ...v,
        source: 'duplicate',
        productName: dup.name,
        isDuplicate,
      });
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">
          Vista previa de variantes combinadas ({allVariants.length} total)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {allVariants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún producto tiene variantes</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Origen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allVariants.map((v, i) => (
                <TableRow key={i} className={v.isDuplicate ? 'opacity-50' : ''}>
                  <TableCell className="text-sm">{v.name || '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{v.sku || '—'}</TableCell>
                  <TableCell className="text-sm font-mono">{v.barcode || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        v.source === 'master'
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs'
                          : 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300 text-xs'
                      }
                    >
                      {v.source === 'master' ? 'Maestro' : v.productName}
                    </Badge>
                    {v.isDuplicate && (
                      <Badge variant="outline" className="ml-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                        Duplicada
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
