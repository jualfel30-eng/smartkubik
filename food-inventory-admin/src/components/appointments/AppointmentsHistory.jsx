import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Search, ChevronLeft, ChevronRight,
  Filter, X, DollarSign, CheckCircle, XCircle, History,
} from 'lucide-react';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { listItem, fadeUp, SPRING, STAGGER } from '@/lib/motion';

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmada', dot: 'bg-blue-400' },
  in_progress: { label: 'En Progreso', dot: 'bg-purple-400' },
  completed: { label: 'Completada', dot: 'bg-emerald-400' },
  cancelled: { label: 'Cancelada', dot: 'bg-red-400' },
  no_show: { label: 'No asistió', dot: 'bg-orange-400' },
};

const PAGE_SIZE = 15;

/**
 * AppointmentsHistory — paginated history dialog with date range + status filter.
 * Opens as a full-width dialog for consulting past and future appointments.
 */
export default function AppointmentsHistory({
  open,
  onClose,
  endpoint,
  isBeautyVertical = false,
  transformAppointment,
  labels = {},
}) {
  // Filters
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // Quick date presets
  const applyPreset = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(to.toISOString().split('T')[0]);
    setPage(1);
  };

  // Load data
  const loadHistory = useCallback(async () => {
    if (!open || !dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('startDate', dateFrom);
      params.append('endDate', dateTo);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());
      params.append('limit', String(PAGE_SIZE));
      params.append('skip', String((page - 1) * PAGE_SIZE));

      const data = await fetchApi(`${endpoint}?${params}`);
      let items = Array.isArray(data) ? data : data?.items || data?.data || [];

      if (transformAppointment) {
        items = items.map(transformAppointment);
      }

      // Sort by date descending (most recent first)
      items.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

      setResults(items);
      setTotalCount(data?.total || data?.totalCount || items.length);
    } catch (err) {
      console.error('Error loading history:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [open, dateFrom, dateTo, statusFilter, searchQuery, page, endpoint, transformAppointment]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [dateFrom, dateTo, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = results.length;
    const completed = results.filter(a => a.status === 'completed').length;
    const cancelled = results.filter(a => a.status === 'cancelled').length;
    const revenue = results.filter(a => a.status === 'completed').reduce((s, a) => s + (Number(a.totalPrice) || 0), 0);
    return { total, completed, cancelled, revenue };
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose?.(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] p-0 gap-0 flex flex-col overflow-hidden dark:bg-gray-900 dark:border-gray-800">
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-primary" />
            Historial de {labels.cita?.plural || 'Citas'}
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="px-6 pb-3 space-y-3 shrink-0 border-b border-border/30 dark:border-gray-800">
          {/* Date range + presets */}
          <div className="flex items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Desde</Label>
              <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hasta</Label>
              <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-8 text-sm w-36" />
            </div>
            <div className="flex gap-1">
              {[
                { label: '7d', days: 7 },
                { label: '30d', days: 30 },
                { label: '90d', days: 90 },
              ].map(p => (
                <Button key={p.label} variant="outline" size="sm" className="h-8 text-xs px-2.5"
                  onClick={() => applyPreset(p.days)}>
                  {p.label}
                </Button>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Estado</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 text-xs w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                    <SelectItem key={val} value={val} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  className="h-8 text-sm pl-8"
                />
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalCount} resultado{totalCount !== 1 ? 's' : ''}</span>
            {stats.completed > 0 && (
              <span className="flex items-center gap-1">
                <CheckCircle className="h-3 w-3 text-emerald-400" />
                {stats.completed} completada{stats.completed > 1 ? 's' : ''}
              </span>
            )}
            {stats.cancelled > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-red-400" />
                {stats.cancelled} cancelada{stats.cancelled > 1 ? 's' : ''}
              </span>
            )}
            {stats.revenue > 0 && (
              <span className="flex items-center gap-1 text-emerald-400">
                <DollarSign className="h-3 w-3" />
                ${stats.revenue.toFixed(2)}
              </span>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <motion.div variants={fadeUp} initial="initial" animate="animate"
              className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/20 mb-3" />
              <p className="text-sm text-muted-foreground">Sin resultados para este rango</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Ajusta las fechas o los filtros</p>
            </motion.div>
          ) : (
            <motion.div variants={STAGGER(0.02)} initial="initial" animate="animate" className="divide-y divide-border/20">
              {results.map((apt) => {
                const sc = STATUS_CONFIG[apt.status] || STATUS_CONFIG.pending;
                return (
                  <motion.div
                    key={apt._id}
                    variants={listItem}
                    className="flex items-center gap-4 py-3 text-sm"
                  >
                    {/* Date/Time */}
                    <div className="w-28 shrink-0">
                      <p className="font-medium text-xs">
                        {new Date(apt.startTime).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {new Date(apt.startTime).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    {/* Customer */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.customerName || 'Sin cliente'}</p>
                      {apt.customerPhone && <p className="text-xs text-muted-foreground">{apt.customerPhone}</p>}
                    </div>

                    {/* Service */}
                    <div className="w-40 shrink-0 truncate">
                      <Badge variant="outline" className="text-[10px]">{apt.serviceName || 'Servicio'}</Badge>
                    </div>

                    {/* Resource */}
                    <div className="w-32 shrink-0 text-xs text-muted-foreground truncate">
                      {apt.resourceName || '-'}
                    </div>

                    {/* Status */}
                    <div className="w-24 shrink-0 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                      <span className="text-xs">{sc.label}</span>
                    </div>

                    {/* Price */}
                    <div className="w-16 shrink-0 text-right">
                      {apt.totalPrice > 0 ? (
                        <span className="text-xs font-medium text-emerald-400">${Number(apt.totalPrice).toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">-</span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-border/30 dark:border-gray-800 flex items-center justify-between shrink-0">
            <p className="text-xs text-muted-foreground">
              Página {page} de {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {/* Page numbers (show max 5) */}
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button key={pageNum} variant={pageNum === page ? 'secondary' : 'ghost'}
                    size="sm" className="h-7 w-7 p-0 text-xs"
                    onClick={() => setPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
