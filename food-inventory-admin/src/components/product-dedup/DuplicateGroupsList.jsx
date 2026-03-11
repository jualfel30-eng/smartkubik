import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import DuplicateGroupCard from './DuplicateGroupCard.jsx';
import { getDuplicateGroups, dismissDuplicateGroup } from '@/lib/api.js';
import { toast } from 'sonner';

const MATCH_TYPES = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'barcode_exact', label: 'Barcode exacto' },
  { value: 'sku_exact', label: 'SKU exacto' },
  { value: 'name_brand_size', label: 'Nombre+Marca' },
  { value: 'name_fuzzy', label: 'Nombre similar' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'reviewed', label: 'Revisados' },
  { value: 'merged', label: 'Fusionados' },
  { value: 'dismissed', label: 'Descartados' },
];

export default function DuplicateGroupsList({ scanId, onReviewGroup }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dismissingId, setDismissingId] = useState(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [matchType, setMatchType] = useState('all');
  const [status, setStatus] = useState('pending');
  const limit = 10;

  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (scanId) params.scanId = scanId;
      if (matchType !== 'all') params.matchType = matchType;
      if (status !== 'all') params.status = status;
      const res = await getDuplicateGroups(params);
      setGroups(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error('Error al cargar grupos de duplicados');
    } finally {
      setLoading(false);
    }
  }, [scanId, page, matchType, status]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const handleDismiss = async (groupId) => {
    setDismissingId(groupId);
    try {
      await dismissDuplicateGroup(groupId);
      toast.success('Grupo descartado');
      fetchGroups();
    } catch (err) {
      toast.error('Error al descartar grupo');
    } finally {
      setDismissingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-4 flex-wrap">
        <div className="space-y-1">
          <Label className="text-xs">Tipo de coincidencia</Label>
          <Select value={matchType} onValueChange={(v) => { setMatchType(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MATCH_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Estado</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {total} grupo(s) encontrado(s)
        </div>
      </div>

      {/* Groups list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron grupos de duplicados
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <DuplicateGroupCard
              key={g._id}
              group={g}
              onReview={onReviewGroup}
              onDismiss={handleDismiss}
              dismissLoading={dismissingId === g._id}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
