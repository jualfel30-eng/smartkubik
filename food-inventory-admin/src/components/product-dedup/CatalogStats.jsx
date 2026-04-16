import { Card, CardContent } from '@/components/ui/card.jsx';
import { Package, DollarSign, Barcode, Tag, Loader2 } from 'lucide-react';

const STAT_CARDS = [
  { key: 'totalProducts', label: 'Productos activos', icon: Package, color: 'text-info' },
  { key: 'withoutPrice', label: 'Sin precio', icon: DollarSign, color: 'text-destructive' },
  { key: 'withoutBarcode', label: 'Sin código de barras', icon: Barcode, color: 'text-amber-600 dark:text-amber-400' },
  { key: 'withoutCategory', label: 'Sin categoría', icon: Tag, color: 'text-warning dark:text-orange-400' },
];

export default function CatalogStats({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STAT_CARDS.map((c) => (
          <Card key={c.key}>
            <CardContent className="p-4 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold">—</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {STAT_CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.key}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-5 w-5 ${c.color}`} />
              <div>
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold">{stats?.[c.key] ?? 0}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
