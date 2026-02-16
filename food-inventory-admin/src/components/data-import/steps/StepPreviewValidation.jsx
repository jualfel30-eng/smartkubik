import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, AlertTriangle, XCircle, Filter,
} from 'lucide-react';

export default function StepPreviewValidation({
  importJob,
  validationResult,
  loading,
  onValidate,
  onNext,
  onPrev,
}) {
  const [showOnlyErrors, setShowOnlyErrors] = useState(false);

  useEffect(() => {
    if (importJob?.importJobId && !validationResult) {
      onValidate(importJob.importJobId);
    }
  }, [importJob?.importJobId]);

  const summary = validationResult?.summary;
  const preview = validationResult?.preview || [];
  const preValidation = validationResult?.preValidation;

  const filteredPreview = useMemo(() => {
    if (!showOnlyErrors) return preview;
    return preview.filter((row) => row.status === 'error' || row.status === 'warning');
  }, [preview, showOnlyErrors]);

  // Extract column keys from the first row's data
  const columnKeys = useMemo(() => {
    if (!preview.length) return [];
    const firstRow = preview[0];
    return Object.keys(firstRow.data || {}).filter(
      (key) => !key.startsWith('_'), // Skip internal fields like _productId
    );
  }, [preview]);

  const getRowBgColor = (status) => {
    switch (status) {
      case 'error': return 'bg-red-50';
      case 'warning': return 'bg-yellow-50';
      case 'valid': return '';
      default: return 'bg-gray-50';
    }
  };

  const getCellError = (row, fieldKey) => {
    return row.errors?.find((e) => e.field === fieldKey);
  };

  if (loading && !validationResult) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Validando datos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pre-validation warnings */}
      {preValidation?.warnings?.length > 0 && (
        <Card className="border-yellow-300 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Advertencias</p>
                {preValidation.warnings.map((w, i) => (
                  <p key={i} className="text-sm text-yellow-700 mt-1">{w}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {preValidation?.errors?.length > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="font-medium text-red-800">Errores de pre-validación</p>
                {preValidation.errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-700 mt-1">{e}</p>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Bar */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{summary.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-green-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{summary.valid}</p>
              <p className="text-xs text-muted-foreground">Válidos</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{summary.warnings}</p>
              <p className="text-xs text-muted-foreground">Advertencias</p>
            </CardContent>
          </Card>
          <Card className="border-red-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{summary.errors}</p>
              <p className="text-xs text-muted-foreground">Errores</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-gray-400">{summary.skipped}</p>
              <p className="text-xs text-muted-foreground">Omitidos</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Checkbox
          id="showErrors"
          checked={showOnlyErrors}
          onCheckedChange={(checked) => setShowOnlyErrors(!!checked)}
        />
        <label htmlFor="showErrors" className="text-sm cursor-pointer flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" />
          Mostrar solo errores y advertencias
        </label>
        <Badge variant="outline" className="ml-auto">
          Mostrando {filteredPreview.length} de {preview.length} filas (vista previa)
        </Badge>
      </div>

      {/* Preview Table */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <TooltipProvider>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Fila</TableHead>
                  <TableHead className="w-[80px]">Estado</TableHead>
                  {columnKeys.map((key) => (
                    <TableHead key={key} className="min-w-[120px]">{key}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPreview.map((row) => (
                  <TableRow key={row.rowIndex} className={getRowBgColor(row.status)}>
                    <TableCell className="font-mono text-xs">{row.rowIndex}</TableCell>
                    <TableCell>
                      {row.status === 'valid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                      {row.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-600" />}
                      {row.status === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                    </TableCell>
                    {columnKeys.map((key) => {
                      const cellError = getCellError(row, key);
                      const value = row.data?.[key];
                      const displayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '');

                      return (
                        <TableCell
                          key={key}
                          className={cellError ? (cellError.severity === 'error' ? 'bg-red-100' : 'bg-yellow-100') : ''}
                        >
                          {cellError ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help underline decoration-dashed">
                                  {displayValue || '—'}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{cellError.message}</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-sm truncate max-w-[200px] block">
                              {displayValue || '—'}
                            </span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button
          onClick={onNext}
          disabled={!summary || (summary.valid === 0 && summary.warnings === 0)}
        >
          Siguiente: Ejecutar Importación
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
