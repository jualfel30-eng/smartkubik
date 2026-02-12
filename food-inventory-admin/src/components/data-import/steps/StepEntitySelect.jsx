import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Package, Users, Truck, Boxes, Tags,
  Upload, Download, FileSpreadsheet, ChevronRight, Loader2,
} from 'lucide-react';

const ENTITY_OPTIONS = [
  {
    type: 'products',
    label: 'Productos',
    description: 'Productos con variantes, precios y stock inicial',
    icon: Package,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    type: 'customers',
    label: 'Clientes',
    description: 'Clientes con datos de contacto e información fiscal',
    icon: Users,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    type: 'suppliers',
    label: 'Proveedores',
    description: 'Proveedores con contacto y condiciones de pago',
    icon: Truck,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    type: 'inventory',
    label: 'Inventario',
    description: 'Ajustar cantidades de inventario por SKU',
    icon: Boxes,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    type: 'categories',
    label: 'Categorías',
    description: 'Categorías y subcategorías de productos',
    icon: Tags,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
];

export default function StepEntitySelect({
  onNext,
  loading,
  onUpload,
  onDownloadTemplate,
  presets,
  onLoadPresets,
}) {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const handleEntitySelect = useCallback((entityType) => {
    setSelectedEntity(entityType);
    setSelectedFile(null);
    setSelectedPreset('');
    if (onLoadPresets) onLoadPresets(entityType);
  }, [onLoadPresets]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback(() => setDragActive(false), []);

  const handleNext = useCallback(async () => {
    if (!selectedEntity || !selectedFile) return;
    await onUpload(selectedFile, selectedEntity, {
      mappingPreset: selectedPreset || undefined,
      updateExisting,
    });
    onNext();
  }, [selectedEntity, selectedFile, selectedPreset, updateExisting, onUpload, onNext]);

  const canProceed = selectedEntity && selectedFile && !loading;

  return (
    <div className="space-y-6">
      {/* Entity Type Selection */}
      <div>
        <h3 className="text-lg font-semibold mb-3">1. Seleccione el tipo de datos a importar</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ENTITY_OPTIONS.map((entity) => {
            const Icon = entity.icon;
            const isSelected = selectedEntity === entity.type;
            return (
              <Card
                key={entity.type}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isSelected ? 'ring-2 ring-primary shadow-md' : 'hover:ring-1 hover:ring-muted-foreground/20'
                }`}
                onClick={() => handleEntitySelect(entity.type)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`mx-auto w-10 h-10 rounded-lg ${entity.bgColor} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${entity.color}`} />
                  </div>
                  <p className="font-medium text-sm">{entity.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{entity.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* File Upload */}
      {selectedEntity && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">2. Suba su archivo</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadTemplate(selectedEntity, selectedPreset || undefined)}
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Descargar Plantilla
            </Button>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : selectedFile
                  ? 'border-green-400 bg-green-50'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer' }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-green-600" />
                <div className="text-left">
                  <p className="font-medium">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  Cambiar
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-medium">Arrastre su archivo aquí o haga clic para seleccionar</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Formatos: CSV, XLSX (máx. 10MB)
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Options */}
      {selectedEntity && selectedFile && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Preset Selection */}
          {presets?.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">
                Formato de origen (opcional)
              </label>
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger>
                  <SelectValue placeholder="Detección automática" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Detección automática</SelectItem>
                  {presets.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Update existing toggle */}
          <div className="flex items-center space-x-2 pt-6">
            <Checkbox
              id="updateExisting"
              checked={updateExisting}
              onCheckedChange={(checked) => setUpdateExisting(!!checked)}
            />
            <label htmlFor="updateExisting" className="text-sm font-medium cursor-pointer">
              Actualizar registros existentes (por SKU/RIF)
            </label>
          </div>
        </div>
      )}

      {/* Next Button */}
      <div className="flex justify-end">
        <Button onClick={handleNext} disabled={!canProceed}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : null}
          Siguiente: Mapear Columnas
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
