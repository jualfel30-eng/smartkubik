import { Card, CardContent } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import ConfidenceBadge from './ConfidenceBadge.jsx';
import MatchTypeBadge from './MatchTypeBadge.jsx';
import { GitMerge, XCircle, Eye } from 'lucide-react';

export default function DuplicateGroupCard({ group, onReview, onDismiss, dismissLoading }) {
  const summaries = group.productSummaries || [];
  const suggestedMaster = summaries.find(
    (s) => String(s.productId) === String(group.suggestedMasterId),
  );

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header with badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <ConfidenceBadge score={group.confidenceScore} />
              <MatchTypeBadge matchType={group.matchType} />
              <span className="text-xs text-muted-foreground">
                {summaries.length} producto(s)
              </span>
            </div>

            {/* Suggested master */}
            {suggestedMaster && (
              <div className="text-sm">
                <span className="text-muted-foreground">Maestro sugerido: </span>
                <span className="font-medium">{suggestedMaster.name}</span>
                {suggestedMaster.sku && (
                  <span className="text-muted-foreground ml-1">({suggestedMaster.sku})</span>
                )}
              </div>
            )}

            {/* Product list */}
            <div className="space-y-1">
              {summaries.map((p) => (
                <div
                  key={p.productId}
                  className={`text-sm flex items-center gap-2 ${
                    String(p.productId) === String(group.suggestedMasterId)
                      ? 'font-medium'
                      : 'text-muted-foreground'
                  }`}
                >
                  <span className="truncate">{p.name}</span>
                  {p.sku && <span className="text-xs font-mono shrink-0">SKU: {p.sku}</span>}
                  {p.inventoryCount > 0 && (
                    <span className="text-xs shrink-0">({p.inventoryCount} inv.)</span>
                  )}
                  {p.orderCount > 0 && (
                    <span className="text-xs shrink-0">({p.orderCount} ord.)</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 shrink-0">
            <Button size="sm" variant="default" onClick={() => onReview?.(group)}>
              <Eye className="mr-1 h-3.5 w-3.5" />
              Revisar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDismiss?.(group._id)}
              disabled={dismissLoading}
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Descartar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
