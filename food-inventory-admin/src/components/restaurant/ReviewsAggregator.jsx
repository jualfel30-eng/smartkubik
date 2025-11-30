import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  getReviews,
  getReviewsAnalytics,
  respondToReview,
  flagReview,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  Star,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Minus,
  Send,
  Flag,
  Plus,
  Filter,
} from 'lucide-react';

const SOURCE_CONFIG = {
  google: { label: 'Google', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200' },
  tripadvisor: { label: 'TripAdvisor', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200' },
  yelp: { label: 'Yelp', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' },
  facebook: { label: 'Facebook', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-200' },
  internal: { label: 'Interno', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200' },
  manual: { label: 'Manual', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200' },
};

const SENTIMENT_CONFIG = {
  positive: { label: 'Positivo', icon: ThumbsUp, color: 'text-green-600 dark:text-green-400' },
  neutral: { label: 'Neutral', icon: Minus, color: 'text-yellow-600 dark:text-yellow-400' },
  negative: { label: 'Negativo', icon: ThumbsDown, color: 'text-red-600 dark:text-red-400' },
};

const ReviewsAggregator = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [analytics, setAnalytics] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [respondDialog, setRespondDialog] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [filters, setFilters] = useState({
    source: '',
    sentiment: '',
    isResponded: '',
    minRating: '',
  });

  const fetchAnalytics = useCallback(async () => {
    try {
      const data = await getReviewsAnalytics();
      setAnalytics(data);
    } catch (error) {
      toast.error('Error al cargar analíticas', { description: error.message });
    }
  }, []);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        ...filters,
        limit: 50,
      };
      const data = await getReviews(params);
      setReviews(data.data || []);
    } catch (error) {
      toast.error('Error al cargar reseñas', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnalytics();
    fetchReviews();
  }, [fetchAnalytics, fetchReviews]);

  const handleRespond = async () => {
    if (!responseText.trim() || !respondDialog) return;

    try {
      await respondToReview(respondDialog._id, responseText);
      toast.success('Respuesta enviada exitosamente');
      setRespondDialog(null);
      setResponseText('');
      fetchReviews();
      fetchAnalytics();
    } catch (error) {
      toast.error('Error al responder', { description: error.message });
    }
  };

  const handleFlag = async (reviewId, reason) => {
    try {
      await flagReview(reviewId, reason);
      toast.success('Reseña marcada para revisión');
      fetchReviews();
    } catch (error) {
      toast.error('Error al marcar reseña', { description: error.message });
    }
  };

  const StarRating = ({ rating }) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };

  if (!analytics) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Reseñas y Feedback</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Gestiona y responde a las reseñas de múltiples plataformas
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="reviews">Reseñas</TabsTrigger>
          <TabsTrigger value="attention">Atención</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Calificación Promedio
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.averageRating.toFixed(1)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                    <Star className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <StarRating rating={Math.round(analytics.overview.averageRating)} />
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Total Reseñas
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.totalReviews}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Tasa de Respuesta
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {(analytics.overview.responseRate * 100).toFixed(0)}%
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                    <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Tiempo de Respuesta
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {analytics.overview.averageResponseTime.toFixed(0)}h
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                    <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rating Distribution */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-gray-100">Distribución de Calificaciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = analytics.overview.ratingDistribution[rating] || 0;
                  const percentage =
                    analytics.overview.totalReviews > 0
                      ? (count / analytics.overview.totalReviews) * 100
                      : 0;

                  return (
                    <div key={rating} className="flex items-center gap-4">
                      <div className="flex items-center gap-1 w-20">
                        <span className="text-sm font-medium dark:text-gray-300">{rating}</span>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      </div>
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-yellow-500 dark:bg-yellow-400 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Sentiment Distribution & Sources */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">Sentimiento</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(analytics.overview.sentimentDistribution).map(
                    ([sentiment, count]) => {
                      const config = SENTIMENT_CONFIG[sentiment];
                      const SentimentIcon = config.icon;
                      const percentage =
                        analytics.overview.totalReviews > 0
                          ? (count / analytics.overview.totalReviews) * 100
                          : 0;

                      return (
                        <div key={sentiment} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <SentimentIcon className={`h-5 w-5 ${config.color}`} />
                            <span className="font-medium dark:text-gray-200">
                              {config.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {percentage.toFixed(0)}%
                            </span>
                            <span className="font-semibold dark:text-gray-100">{count}</span>
                          </div>
                        </div>
                      );
                    },
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-900 dark:border-gray-800">
              <CardHeader>
                <CardTitle className="dark:text-gray-100">Por Plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics.bySource.map((source) => (
                    <div
                      key={source.source}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={SOURCE_CONFIG[source.source]?.color}>
                          {SOURCE_CONFIG[source.source]?.label || source.source}
                        </Badge>
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {source.count} reseñas
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold dark:text-gray-100">
                          {source.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6 mt-6">
          {/* Filters */}
          <Card className="dark:bg-gray-900 dark:border-gray-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Plataforma</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.source}
                    onChange={(e) => setFilters({ ...filters, source: e.target.value })}
                  >
                    <option value="">Todas</option>
                    {Object.entries(SOURCE_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Sentimiento</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.sentiment}
                    onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
                  >
                    <option value="">Todos</option>
                    {Object.entries(SENTIMENT_CONFIG).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-gray-200">Estado</label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.isResponded}
                    onChange={(e) => setFilters({ ...filters, isResponded: e.target.value })}
                  >
                    <option value="">Todas</option>
                    <option value="true">Respondidas</option>
                    <option value="false">Sin responder</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium dark:text-gray-200">
                    Calificación mínima
                  </label>
                  <select
                    className="w-full mt-1 p-2 border dark:border-gray-700 rounded-md dark:bg-gray-800 dark:text-gray-200"
                    value={filters.minRating}
                    onChange={(e) => setFilters({ ...filters, minRating: e.target.value })}
                  >
                    <option value="">Todas</option>
                    <option value="4">4+ estrellas</option>
                    <option value="3">3+ estrellas</option>
                    <option value="2">2+ estrellas</option>
                    <option value="1">1+ estrella</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              </div>
            ) : reviews.length === 0 ? (
              <Alert className="dark:bg-gray-800 dark:border-gray-700">
                <AlertDescription className="dark:text-gray-400">
                  No se encontraron reseñas con los filtros seleccionados.
                </AlertDescription>
              </Alert>
            ) : (
              reviews.map((review) => {
                const sourceConfig = SOURCE_CONFIG[review.source] || SOURCE_CONFIG.manual;
                const sentimentConfig = SENTIMENT_CONFIG[review.sentiment];
                const SentimentIcon = sentimentConfig?.icon;

                return (
                  <Card key={review._id} className="dark:bg-gray-900 dark:border-gray-800">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg dark:text-gray-100">
                              {review.customerName}
                            </h4>
                            <Badge className={sourceConfig.color}>{sourceConfig.label}</Badge>
                            {review.isVerified && (
                              <Badge variant="outline" className="dark:border-gray-600">
                                Verificado
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                            <StarRating rating={review.rating} />
                            {SentimentIcon && (
                              <div className="flex items-center gap-1">
                                <SentimentIcon
                                  className={`h-4 w-4 ${sentimentConfig.color}`}
                                />
                                <span>{sentimentConfig.label}</span>
                              </div>
                            )}
                            <span>
                              {new Date(review.reviewDate).toLocaleDateString('es-VE')}
                            </span>
                          </div>
                        </div>
                        {review.isFlagged && (
                          <Flag className="h-5 w-5 text-red-500" />
                        )}
                      </div>

                      {review.title && (
                        <h5 className="font-medium mb-2 dark:text-gray-200">{review.title}</h5>
                      )}
                      <p className="text-gray-700 dark:text-gray-300 mb-4">{review.comment}</p>

                      {review.response && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                            Respuesta del restaurante:
                          </p>
                          <p className="text-sm text-blue-800 dark:text-blue-300">
                            {review.response}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                            {new Date(review.responseDate).toLocaleDateString('es-VE')}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {!review.isResponded && (
                          <Button
                            size="sm"
                            onClick={() => setRespondDialog(review)}
                            className="dark:bg-blue-600 dark:hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        )}
                        {!review.isFlagged && review.rating <= 3 && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFlag(review._id, 'Requiere atención')}
                            className="dark:border-gray-600 dark:hover:bg-gray-800"
                          >
                            <Flag className="h-4 w-4 mr-1" />
                            Marcar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Attention Tab */}
        <TabsContent value="attention" className="space-y-6 mt-6">
          <div className="space-y-4">
            {analytics.needsAttention.length === 0 ? (
              <Alert className="dark:bg-gray-800 dark:border-gray-700">
                <AlertDescription className="dark:text-gray-400">
                  ¡Excelente! No hay reseñas que requieran atención inmediata.
                </AlertDescription>
              </Alert>
            ) : (
              analytics.needsAttention.map((review) => {
                const sourceConfig = SOURCE_CONFIG[review.source] || SOURCE_CONFIG.manual;

                return (
                  <Card
                    key={review._id}
                    className="border-l-4 border-l-red-500 dark:bg-gray-900 dark:border-gray-800"
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold text-lg dark:text-gray-100">
                              {review.customerName}
                            </h4>
                            <Badge className={sourceConfig.color}>{sourceConfig.label}</Badge>
                          </div>
                          <StarRating rating={review.rating} />
                          <p className="text-gray-700 dark:text-gray-300 mt-3 mb-4">
                            {review.comment}
                          </p>
                          <Button
                            size="sm"
                            onClick={() => setRespondDialog(review)}
                            className="dark:bg-blue-600 dark:hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Responder Ahora
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Response Dialog */}
      {respondDialog && (
        <Dialog open={!!respondDialog} onOpenChange={() => setRespondDialog(null)}>
          <DialogContent className="dark:bg-gray-900 dark:border-gray-800">
            <DialogHeader>
              <DialogTitle className="dark:text-gray-100">Responder a Reseña</DialogTitle>
              <DialogDescription className="dark:text-gray-400">
                Responde a {respondDialog.customerName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <StarRating rating={respondDialog.rating} />
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                  {respondDialog.comment}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium dark:text-gray-200">Tu respuesta</label>
                <Textarea
                  className="mt-1 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
                  rows={5}
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Escribe tu respuesta profesional..."
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 dark:border-gray-700 dark:hover:bg-gray-800"
                  onClick={() => setRespondDialog(null)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleRespond}
                  disabled={!responseText.trim()}
                >
                  <Send className="h-4 w-4 mr-1" />
                  Enviar Respuesta
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ReviewsAggregator;
