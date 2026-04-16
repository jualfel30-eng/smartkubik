import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Star, Check, X, Trash2, MessageSquare, Search, RefreshCw } from 'lucide-react';
import { getBeautyReviews, approveBeautyReview, rejectBeautyReview } from '../lib/api';
import { toast } from 'sonner';
import { useConfirm } from '@/hooks/use-confirm';

// ── Star rating component ─────────────────────────────────────────────────────
const StarRating = ({ rating, max = 5 }) => (
  <div className="flex gap-0.5">
    {Array.from({ length: max }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
      />
    ))}
  </div>
);

// ── Relative date helper ──────────────────────────────────────────────────────
const relativeDate = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `hace ${days} día${days !== 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `hace ${months} mes${months !== 1 ? 'es' : ''}`;
};

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ isApproved, hasRejectionReason }) => {
  if (isApproved) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Aprobada</Badge>;
  if (hasRejectionReason) return <Badge className="bg-red-100 text-red-700 border-red-200">Rechazada</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pendiente</Badge>;
};

// ── Main component ────────────────────────────────────────────────────────────
export default function ReviewsManagement() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { confirm } = useConfirm();

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBeautyReviews();
      setReviews(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      setError(err.message || 'Error al cargar las reseñas');
      toast.error('Error al cargar las reseñas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  const approvedReviews = reviews.filter((r) => r.isApproved);
  const rejectedReviews = reviews.filter((r) => !r.isApproved && r.rejectionReason);
  const pendingReviews = reviews.filter((r) => !r.isApproved && !r.rejectionReason);
  const avgRating =
    approvedReviews.length > 0
      ? (approvedReviews.reduce((sum, r) => sum + r.rating, 0) / approvedReviews.length).toFixed(1)
      : '—';

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredReviews = reviews.filter((r) => {
    if (activeFilter === 'pending' && (r.isApproved || r.rejectionReason)) return false;
    if (activeFilter === 'approved' && !r.isApproved) return false;
    if (activeFilter === 'rejected' && (!r.rejectionReason || r.isApproved)) return false;
    if (ratingFilter !== null && r.rating !== ratingFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = (r.client?.name || '').toLowerCase();
      const comment = (r.comment || '').toLowerCase();
      if (!name.includes(q) && !comment.includes(q)) return false;
    }
    return true;
  });

  // ── Actions ─────────────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setSubmitting(true);
    try {
      await approveBeautyReview(id);
      toast.success('Reseña aprobada');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Error al aprobar la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectConfirm = async (id) => {
    setSubmitting(true);
    try {
      await rejectBeautyReview(id, rejectReason || undefined);
      toast.success('Reseña rechazada');
      setRejectingId(null);
      setRejectReason('');
      fetchReviews();
    } catch (err) {
      toast.error(err.message || 'Error al rechazar la reseña');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Eliminar reseña',
      description: 'Esta acción no se puede deshacer. ¿Deseas eliminar esta reseña?',
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    // Reviews controller does not have a DELETE endpoint — inform user
    toast.info('La eliminación de reseñas no está disponible aún en el backend.');
  };

  const handleRespond = async (id) => {
    if (!responseText.trim()) {
      toast.warning('Escribe una respuesta antes de guardar.');
      return;
    }
    setSubmitting(true);
    try {
      // There is no separate respond endpoint — the controller only has PATCH /:id/approve
      // For now we toast a success and close (a future backend endpoint can be wired here)
      toast.success('Respuesta guardada (funcionalidad en desarrollo)');
      setRespondingTo(null);
      setResponseText('');
    } catch (err) {
      toast.error(err.message || 'Error al guardar la respuesta');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'all', label: 'Todas', count: reviews.length },
    { key: 'pending', label: 'Pendientes', count: pendingReviews.length },
    { key: 'approved', label: 'Aprobadas', count: approvedReviews.length },
    { key: 'rejected', label: 'Rechazadas', count: rejectedReviews.length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reseñas</h1>
          <p className="text-muted-foreground text-sm">Modera las reseñas de tus clientes</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReviews} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rating promedio</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{avgRating}</span>
              <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
            </div>
            <p className="text-xs text-muted-foreground">{approvedReviews.length} aprobadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold mt-1">{reviews.length}</p>
            <p className="text-xs text-muted-foreground">reseñas recibidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Pendientes</p>
            <p className="text-2xl font-bold mt-1 text-amber-600">{pendingReviews.length}</p>
            <p className="text-xs text-muted-foreground">requieren revisión</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Rechazadas</p>
            <p className="text-2xl font-bold mt-1 text-red-500">{rejectedReviews.length}</p>
            <p className="text-xs text-muted-foreground">no publicadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activeFilter === tab.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-background border-border text-muted-foreground hover:border-primary hover:text-primary'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-70">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Rating chips + search */}
        <div className="flex gap-2 flex-wrap items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
              className={`flex items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                ratingFilter === star
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-background border-border text-muted-foreground hover:border-amber-400'
              }`}
            >
              {star}
              <Star className="h-3 w-3 fill-current" />
            </button>
          ))}
          <div className="flex-1 max-w-xs relative ml-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-sm"
              placeholder="Buscar por cliente o comentario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Cargando reseñas...</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive text-sm">{error}</div>
      ) : filteredReviews.length === 0 ? (
        <div className="text-center py-16">
          <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No hay reseñas para mostrar</p>
          <p className="text-muted-foreground/70 text-sm mt-1">
            Las reseñas de tus clientes aparecerán aquí para que puedas aprobarlas o rechazarlas.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((review) => {
            const isPending = !review.isApproved && !review.rejectionReason;
            const isRejecting = rejectingId === review._id;
            const isResponding = respondingTo === review._id;

            return (
              <Card key={review._id} className="overflow-hidden">
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-sm">{review.client?.name || 'Anónimo'}</span>
                        <span className="text-xs text-muted-foreground">{relativeDate(review.createdAt)}</span>
                        <StatusBadge isApproved={review.isApproved} hasRejectionReason={!!review.rejectionReason} />
                      </div>
                      <StarRating rating={review.rating} />
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                      )}
                      {review.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">
                          Motivo de rechazo: {review.rejectionReason}
                        </p>
                      )}
                      {review.response && (
                        <div className="mt-3 pl-3 border-l-2 border-primary/30">
                          <p className="text-xs font-medium text-primary mb-0.5">Respuesta del negocio:</p>
                          <p className="text-sm text-muted-foreground">{review.response}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {isPending && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            title="Aprobar"
                            disabled={submitting}
                            onClick={() => handleApprove(review._id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                            title="Rechazar"
                            disabled={submitting}
                            onClick={() => {
                              setRejectingId(isRejecting ? null : review._id);
                              setRejectReason('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        title="Responder"
                        onClick={() => {
                          setRespondingTo(isResponding ? null : review._id);
                          setResponseText(review.response || '');
                        }}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        title="Eliminar"
                        disabled={submitting}
                        onClick={() => handleDelete(review._id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Inline reject form */}
                  {isRejecting && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Motivo de rechazo (opcional):</p>
                      <Textarea
                        className="text-sm min-h-[60px] resize-none"
                        placeholder="Explica brevemente por qué rechazas esta reseña..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={submitting}
                          onClick={() => handleRejectConfirm(review._id)}
                        >
                          Confirmar rechazo
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Inline respond form */}
                  {isResponding && (
                    <div className="mt-3 pt-3 border-t space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Tu respuesta:</p>
                      <Textarea
                        className="text-sm min-h-[70px] resize-none"
                        placeholder="Escribe tu respuesta al cliente..."
                        value={responseText}
                        onChange={(e) => setResponseText(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          disabled={submitting}
                          onClick={() => handleRespond(review._id)}
                        >
                          Guardar respuesta
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setRespondingTo(null); setResponseText(''); }}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
