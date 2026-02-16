import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight, Loader2, Check, X, ArrowRight } from 'lucide-react';

export default function StepColumnMapping({
  importJob,
  fieldDefinitions,
  presets,
  loading,
  onSaveMapping,
  onNext,
  onPrev,
}) {
  const [mapping, setMapping] = useState({});

  // Initialize mapping from importJob's autoMapping
  useEffect(() => {
    if (importJob?.autoMapping) {
      setMapping(importJob.autoMapping);
    }
  }, [importJob?.autoMapping]);

  const requiredFields = useMemo(
    () => fieldDefinitions.filter((f) => f.required),
    [fieldDefinitions],
  );

  const mappedTargets = useMemo(
    () => new Set(Object.values(mapping).filter(Boolean)),
    [mapping],
  );

  const unmappedRequired = useMemo(
    () => requiredFields.filter((f) => !mappedTargets.has(f.key)),
    [requiredFields, mappedTargets],
  );

  const handleMappingChange = (sourceColumn, targetField) => {
    setMapping((prev) => ({
      ...prev,
      [sourceColumn]: targetField === '__none__' ? '' : targetField,
    }));
  };

  const handleApplyPreset = (presetKey) => {
    const preset = presets.find((p) => p.key === presetKey);
    if (!preset) return;
    // Preset data is loaded by parent — we need to fetch mapping from preset
    // For now, just signal parent
  };

  const handleNext = async () => {
    // Filter out empty mappings
    const cleanMapping = Object.fromEntries(
      Object.entries(mapping).filter(([_, v]) => v),
    );
    const saved = await onSaveMapping(importJob.importJobId, cleanMapping);
    if (saved) onNext();
  };

  const canProceed = unmappedRequired.length === 0 && !loading;

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Mapeo de Columnas</h3>
          <p className="text-sm text-muted-foreground">
            Asigne cada columna de su archivo a un campo de SmartKubik
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={unmappedRequired.length === 0 ? 'default' : 'destructive'}>
            {unmappedRequired.length === 0
              ? 'Todos los campos requeridos mapeados'
              : `${unmappedRequired.length} campo(s) requerido(s) sin mapear`}
          </Badge>
        </div>
      </div>

      {/* Unmapped required fields warning */}
      {unmappedRequired.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm font-medium text-destructive">
              Campos obligatorios sin mapear:
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {unmappedRequired.map((f) => (
                <Badge key={f.key} variant="outline" className="text-destructive border-destructive/30">
                  {f.label}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mapping Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Columna en su Archivo</TableHead>
                <TableHead className="w-[10%] text-center"></TableHead>
                <TableHead className="w-[40%]">Campo en SmartKubik</TableHead>
                <TableHead className="w-[10%] text-center">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(importJob?.parsedHeaders || []).map((header) => {
                const currentTarget = mapping[header] || '';
                const targetField = fieldDefinitions.find((f) => f.key === currentTarget);
                const isMapped = !!currentTarget;
                const isRequiredField = targetField?.required;

                return (
                  <TableRow key={header}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{header}</span>
                        {importJob?.sampleRows?.[0]?.[header] && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                            Ej: {importJob.sampleRows[0][header]}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={currentTarget || '__none__'}
                        onValueChange={(val) => handleMappingChange(header, val)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="No mapear" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">
                            <span className="text-muted-foreground">— No mapear —</span>
                          </SelectItem>
                          {fieldDefinitions.map((field) => (
                            <SelectItem
                              key={field.key}
                              value={field.key}
                              disabled={mappedTargets.has(field.key) && mapping[header] !== field.key}
                            >
                              <span className="flex items-center gap-2">
                                {field.label}
                                {field.required && (
                                  <span className="text-xs text-destructive">*</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      {isMapped ? (
                        <Check className="h-4 w-4 text-green-600 mx-auto" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrev}>
          <ChevronLeft className="h-4 w-4 mr-2" />
          Anterior
        </Button>
        <Button onClick={handleNext} disabled={!canProceed}>
          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          Siguiente: Validar Datos
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
