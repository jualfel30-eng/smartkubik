import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import MergeJobDetail from './MergeJobDetail.jsx';
import { getMergeJobs } from '@/lib/api.js';
import { toast } from 'sonner';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'completed', label: 'Completados' },
  { value: 'reversed', label: 'Revertidos' },
  { value: 'failed', label: 'Fallidos' },
];

export default function MergeHistoryList() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('all');
  const limit = 10;

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit };
      if (status !== 'all') params.status = status;
      const res = await getMergeJobs(params);
      setJobs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      toast.error('Error al cargar historial de fusiones');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-end gap-4">
        <div className="space-y-1">
          <Label className="text-xs">Estado</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="w-[160px]">
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
          {total} fusión(es) registrada(s)
        </div>
      </div>

      {/* Jobs list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No se encontraron fusiones registradas
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <MergeJobDetail key={job._id} job={job} onReversed={fetchJobs} />
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
