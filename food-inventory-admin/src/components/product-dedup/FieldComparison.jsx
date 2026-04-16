import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group.jsx';
import { Label } from '@/components/ui/label.jsx';

const FIELDS = [
  { key: 'name', label: 'Nombre' },
  { key: 'brand', label: 'Marca' },
  { key: 'description', label: 'Descripción' },
  { key: 'category', label: 'Categoría' },
  { key: 'subcategory', label: 'Subcategoría' },
  { key: 'unitOfMeasure', label: 'Unidad de medida' },
  { key: 'salePrice', label: 'Precio de venta', format: 'currency' },
  { key: 'costPrice', label: 'Precio de costo', format: 'currency' },
  { key: 'taxRate', label: 'Tasa de impuesto', format: 'percent' },
  { key: 'minStock', label: 'Stock mínimo' },
  { key: 'maxStock', label: 'Stock máximo' },
  { key: 'reorderPoint', label: 'Punto de reorden' },
];

function formatValue(value, format) {
  if (value === undefined || value === null || value === '') return '—';
  if (format === 'currency') return `$${Number(value).toFixed(2)}`;
  if (format === 'percent') return `${value}%`;
  if (Array.isArray(value)) return value.join(', ') || '—';
  return String(value);
}

function getFieldStatus(masterVal, dupVal) {
  const mEmpty = masterVal === undefined || masterVal === null || masterVal === '';
  const dEmpty = dupVal === undefined || dupVal === null || dupVal === '';

  if (mEmpty && dEmpty) return 'both-empty';
  if (!mEmpty && dEmpty) return 'master-only';
  if (mEmpty && !dEmpty) return 'duplicate-only';
  if (String(masterVal) === String(dupVal)) return 'match';
  return 'conflict';
}

const STATUS_STYLES = {
  match: 'bg-success/5 dark:bg-green-900/20',
  'master-only': 'bg-success/5 dark:bg-green-900/20',
  'duplicate-only': 'bg-amber-50 dark:bg-amber-900/20',
  conflict: 'bg-yellow-50 dark:bg-yellow-900/20',
  'both-empty': '',
};

export default function FieldComparison({
  masterProduct,
  duplicateProduct,
  fieldResolutions,
  onFieldResolutionChange,
}) {
  return (
    <div className="rounded-md border overflow-hidden">
      <div className="grid grid-cols-[180px_1fr_1fr_auto] gap-0 text-sm">
        {/* Header */}
        <div className="bg-muted px-3 py-2 font-medium border-b">Campo</div>
        <div className="bg-blue-50 dark:bg-blue-900/20 px-3 py-2 font-medium border-b border-l">
          Maestro: {masterProduct?.name || '—'}
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 px-3 py-2 font-medium border-b border-l">
          Duplicado: {duplicateProduct?.name || '—'}
        </div>
        <div className="bg-muted px-3 py-2 font-medium border-b border-l text-center">Usar</div>

        {/* Rows */}
        {FIELDS.map((field) => {
          const masterVal = masterProduct?.[field.key];
          const dupVal = duplicateProduct?.[field.key];
          const status = getFieldStatus(masterVal, dupVal);
          const rowBg = STATUS_STYLES[status];
          const currentResolution = fieldResolutions?.find((r) => r.field === field.key);
          const selectedSource = currentResolution?.sourceProductId || masterProduct?._id;

          return (
            <div key={field.key} className={`contents ${rowBg}`}>
              <div className={`px-3 py-2 border-b font-medium text-muted-foreground ${rowBg}`}>
                {field.label}
              </div>
              <div className={`px-3 py-2 border-b border-l ${rowBg}`}>
                {formatValue(masterVal, field.format)}
              </div>
              <div className={`px-3 py-2 border-b border-l ${rowBg}`}>
                {formatValue(dupVal, field.format)}
              </div>
              <div className={`px-3 py-2 border-b border-l flex justify-center ${rowBg}`}>
                {status === 'conflict' || status === 'duplicate-only' ? (
                  <RadioGroup
                    value={selectedSource}
                    onValueChange={(sourceId) =>
                      onFieldResolutionChange?.(field.key, sourceId)
                    }
                    className="flex gap-3"
                  >
                    <div className="flex items-center gap-1">
                      <RadioGroupItem
                        value={masterProduct?._id}
                        id={`${field.key}-master`}
                      />
                      <Label htmlFor={`${field.key}-master`} className="text-xs cursor-pointer">
                        M
                      </Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <RadioGroupItem
                        value={duplicateProduct?._id}
                        id={`${field.key}-dup`}
                      />
                      <Label htmlFor={`${field.key}-dup`} className="text-xs cursor-pointer">
                        D
                      </Label>
                    </div>
                  </RadioGroup>
                ) : (
                  <span className="text-xs text-muted-foreground">auto</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
