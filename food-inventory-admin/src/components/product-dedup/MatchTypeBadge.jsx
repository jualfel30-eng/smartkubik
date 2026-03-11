import { Badge } from '@/components/ui/badge.jsx';

const MATCH_LABELS = {
  barcode_exact: 'Barcode',
  sku_exact: 'SKU',
  name_brand_size: 'Nombre+Marca',
  name_fuzzy: 'Nombre similar',
  composite: 'Compuesto',
};

const MATCH_STYLES = {
  barcode_exact: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  sku_exact: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800',
  name_brand_size: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  name_fuzzy: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  composite: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
};

export default function MatchTypeBadge({ matchType }) {
  return (
    <Badge variant="outline" className={MATCH_STYLES[matchType] || ''}>
      {MATCH_LABELS[matchType] || matchType}
    </Badge>
  );
}
