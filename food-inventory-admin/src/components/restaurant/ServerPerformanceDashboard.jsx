import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getServerPerformanceAnalytics,
  getServerPerformanceComparison,
  getServerPerformanceLeaderboard,
  setServerGoals,
  getUsers,
} from '@/lib/api';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Target,
  Users,
  Star,
  Zap,
  Trophy,
  Medal,
  Crown,
  ChevronUp,
  ChevronDown,
  Filter,
} from 'lucide-react';

const GRADE_CONFIG = {
  A: { color: 'bg-green-100 text-green-800 border-green-300', label: 'Excelente', icon: Trophy },
  B: { color: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Bueno', icon: Medal },
  C: { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Regular', icon: Star },
  D: { color: 'bg-orange-100 text-orange-800 border-orange-300', label: 'Bajo', icon: TrendingDown },
  F: { color: 'bg-red-100 text-red-800 border-red-300', label: 'Insuficiente', icon: TrendingDown },
};

const ServerPerformanceDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);
  const [servers, setServers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGoalsDialog, setShowGoalsDialog] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    serverId: '',
  });

  // Goals form
  const [goalsForm, setGoalsForm] = useState({
    serverId: '',
    date: new Date().toISOString().split('T')[0],
    salesTarget: 0,
    ordersTarget: 0,
  });

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getServerPerformanceAnalytics(filters);
      setAnalytics(data);
    } catch (error) {
      toast.error('Error al cargar analytics', { description: error.message });
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchComparison = useCallback(async () => {
    try {
      const data = await getServerPerformanceComparison(filters);
      setComparison(data);
    } catch (error) {
      console.error('Error loading comparison:', error);
    }
  }, [filters]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const data = await getServerPerformanceLeaderboard(filters);
      setLeaderboard(data);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  }, [filters]);

  const fetchServers = useCallback(async () => {
    try {
      const data = await getUsers({ role: 'waiter' });
      setServers(data?.users || []);
    } catch (error) {
      console.error('Error loading servers:', error);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
    fetchServers();
  }, [fetchAnalytics, fetchServers]);

  useEffect(() => {
    if (activeTab === 'comparison') {
      fetchComparison();
    } else if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    }
  }, [activeTab, fetchComparison, fetchLeaderboard]);

  const handleSetGoals = async () => {
    try {
      await setServerGoals(goalsForm);
      toast.success('Metas establecidas exitosamente');
      setShowGoalsDialog(false);
      fetchAnalytics();
    } catch (error) {
      toast.error('Error al establecer metas', { description: error.message });
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getGradeConfig = (grade) => {
    return GRADE_CONFIG[grade] || GRADE_CONFIG.F;
  };

  const getRankMedal = (rank) => {
    if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-orange-600" />;
    return <span className="text-sm font-medium text-gray-600">#{rank}</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header with Summary Stats */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Servidores Activos</p>
                  <p className="text-2xl font-bold">{analytics.summary?.totalServers || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ventas Totales</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary?.totalSales || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Órdenes</p>
                  <p className="text-2xl font-bold">{analytics.summary?.totalOrders || 0}</p>
                </div>
                <Award className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Propinas</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics.summary?.totalTips || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Rating Promedio</p>
                  <p className="text-2xl font-bold">{(analytics.summary?.averageRating || 0).toFixed(1)} ⭐</p>
                </div>
                <Star className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Performance de Servidores</CardTitle>
              <CardDescription>
                Analytics y métricas de desempeño del equipo
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {showFilters ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
              </Button>
              <Button onClick={() => setShowGoalsDialog(true)}>
                <Target className="h-4 w-4 mr-2" />
                Establecer Metas
              </Button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <Label>Servidor</Label>
                <Select value={filters.serverId} onValueChange={(val) => setFilters({ ...filters, serverId: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    {servers.map((server) => (
                      <SelectItem key={server._id} value={server._id}>
                        {server.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={fetchAnalytics} className="w-full">
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="analytics">
                <Zap className="h-4 w-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="comparison">
                <Users className="h-4 w-4 mr-2" />
                Comparación
              </TabsTrigger>
              <TabsTrigger value="leaderboard">
                <Trophy className="h-4 w-4 mr-2" />
                Leaderboard
              </TabsTrigger>
            </TabsList>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="mt-6">
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              ) : analytics ? (
                <div className="space-y-6">
                  {/* Top Performers */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Top Performers</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {analytics.topPerformers?.slice(0, 3).map((performer, idx) => {
                        const rankConfig = idx === 0 ? 'border-yellow-400 bg-yellow-50' : idx === 1 ? 'border-gray-400 bg-gray-50' : 'border-orange-400 bg-orange-50';
                        return (
                          <Card key={performer.serverId} className={`border-2 ${rankConfig}`}>
                            <CardContent className="pt-6">
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="font-bold text-lg">{performer.serverName}</h4>
                                {getRankMedal(idx + 1)}
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Ventas:</span>
                                  <span className="font-bold">{formatCurrency(performer.totalSales)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Órdenes:</span>
                                  <span className="font-bold">{performer.totalOrders}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Propinas:</span>
                                  <span className="font-bold">{formatCurrency(performer.totalTips)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rating:</span>
                                  <span className="font-bold">{performer.averageRating.toFixed(1)} ⭐</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t">
                                  <span className="text-gray-600">Score:</span>
                                  <span className="font-bold text-green-600">{performer.performanceScore.toFixed(1)}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Performance by Server */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Performance Individual</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Servidor</TableHead>
                          <TableHead>Órdenes</TableHead>
                          <TableHead>Ventas</TableHead>
                          <TableHead>Valor Prom.</TableHead>
                          <TableHead>Propinas</TableHead>
                          <TableHead>% Propina</TableHead>
                          <TableHead>$/Hora</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead>Grado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.byServer?.map((server) => {
                          const gradeConfig = getGradeConfig(server.performanceGrade);
                          return (
                            <TableRow key={server.serverId}>
                              <TableCell className="font-medium">{server.serverName}</TableCell>
                              <TableCell>{server.ordersServed}</TableCell>
                              <TableCell>{formatCurrency(server.totalSales)}</TableCell>
                              <TableCell>{formatCurrency(server.averageOrderValue)}</TableCell>
                              <TableCell>{formatCurrency(server.tipsReceived)}</TableCell>
                              <TableCell>{server.tipPercentage.toFixed(1)}%</TableCell>
                              <TableCell>{formatCurrency(server.salesPerHour)}</TableCell>
                              <TableCell>{server.averageRating > 0 ? `${server.averageRating.toFixed(1)} ⭐` : '-'}</TableCell>
                              <TableCell>
                                <Badge className={gradeConfig.color}>
                                  {server.performanceGrade} - {gradeConfig.label}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Trends */}
                  {analytics.trends && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Tendencias</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Cambio en Ventas</span>
                              {analytics.trends.weekOverWeek.salesChange >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <p className={`text-2xl font-bold ${analytics.trends.weekOverWeek.salesChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(analytics.trends.weekOverWeek.salesChange)}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Cambio en Órdenes</span>
                              {analytics.trends.weekOverWeek.ordersChange >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <p className={`text-2xl font-bold ${analytics.trends.weekOverWeek.ordersChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(analytics.trends.weekOverWeek.ordersChange)}
                            </p>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-600">Cambio en Propinas</span>
                              {analytics.trends.weekOverWeek.tipsChange >= 0 ? (
                                <TrendingUp className="h-5 w-5 text-green-500" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                            <p className={`text-2xl font-bold ${analytics.trends.weekOverWeek.tipsChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(analytics.trends.weekOverWeek.tipsChange)}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  )}

                  {/* Goal Progress */}
                  {analytics.goalProgress && analytics.goalProgress.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Progreso de Metas</h3>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Servidor</TableHead>
                            <TableHead>Meta Ventas</TableHead>
                            <TableHead>Logrado</TableHead>
                            <TableHead>Progreso</TableHead>
                            <TableHead>Meta Órdenes</TableHead>
                            <TableHead>Logrado</TableHead>
                            <TableHead>Progreso</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analytics.goalProgress.map((goal) => (
                            <TableRow key={goal.serverId}>
                              <TableCell className="font-medium">{goal.serverName}</TableCell>
                              <TableCell>{formatCurrency(goal.salesTarget)}</TableCell>
                              <TableCell>{formatCurrency(goal.salesAchieved)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${goal.salesProgress >= 100 ? 'bg-green-500' : goal.salesProgress >= 75 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                      style={{ width: `${Math.min(goal.salesProgress, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{goal.salesProgress.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{goal.ordersTarget}</TableCell>
                              <TableCell>{goal.ordersAchieved}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${goal.ordersProgress >= 100 ? 'bg-green-500' : goal.ordersProgress >= 75 ? 'bg-blue-500' : 'bg-yellow-500'}`}
                                      style={{ width: `${Math.min(goal.ordersProgress, 100)}%` }}
                                    ></div>
                                  </div>
                                  <span className="text-sm font-medium">{goal.ordersProgress.toFixed(0)}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              ) : null}
            </TabsContent>

            {/* Comparison Tab */}
            <TabsContent value="comparison" className="mt-6">
              {comparison ? (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Comparación de Servidores</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Servidor</TableHead>
                        <TableHead>Rank General</TableHead>
                        <TableHead>Rank Ventas</TableHead>
                        <TableHead>Rank Satisfacción</TableHead>
                        <TableHead>Rank Eficiencia</TableHead>
                        <TableHead>Ventas</TableHead>
                        <TableHead>Órdenes</TableHead>
                        <TableHead>Propinas</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>$/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comparison.servers?.map((server) => (
                        <TableRow key={server.serverId}>
                          <TableCell className="font-medium">{server.serverName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getRankMedal(server.ranking.overallRank)}
                            </div>
                          </TableCell>
                          <TableCell>#{server.ranking.salesRank}</TableCell>
                          <TableCell>#{server.ranking.satisfactionRank}</TableCell>
                          <TableCell>#{server.ranking.efficiencyRank}</TableCell>
                          <TableCell>{formatCurrency(server.metrics.totalSales)}</TableCell>
                          <TableCell>{server.metrics.ordersServed}</TableCell>
                          <TableCell>{formatCurrency(server.metrics.tipsReceived)}</TableCell>
                          <TableCell>{server.metrics.averageRating > 0 ? `${server.metrics.averageRating.toFixed(1)} ⭐` : '-'}</TableCell>
                          <TableCell>{formatCurrency(server.metrics.salesPerHour)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              )}
            </TabsContent>

            {/* Leaderboard Tab */}
            <TabsContent value="leaderboard" className="mt-6">
              {leaderboard ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top by Sales */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-500" />
                      Top por Ventas
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.categories.topBySales?.map((entry) => (
                        <div key={entry.serverId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getRankMedal(entry.rank)}
                            <span className="font-medium">{entry.serverName}</span>
                          </div>
                          <span className="font-bold text-green-600">{formatCurrency(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top by Tips */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-yellow-500" />
                      Top por Propinas
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.categories.topByTips?.map((entry) => (
                        <div key={entry.serverId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getRankMedal(entry.rank)}
                            <span className="font-medium">{entry.serverName}</span>
                          </div>
                          <span className="font-bold text-yellow-600">{formatCurrency(entry.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top by Rating */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Star className="h-5 w-5 text-orange-500" />
                      Top por Calificación
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.categories.topByRating?.map((entry) => (
                        <div key={entry.serverId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getRankMedal(entry.rank)}
                            <span className="font-medium">{entry.serverName}</span>
                          </div>
                          <span className="font-bold text-orange-600">{entry.value.toFixed(1)} ⭐</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top by Efficiency */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-500" />
                      Top por Eficiencia ($/Hora)
                    </h3>
                    <div className="space-y-2">
                      {leaderboard.categories.topByEfficiency?.map((entry) => (
                        <div key={entry.serverId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getRankMedal(entry.rank)}
                            <span className="font-medium">{entry.serverName}</span>
                          </div>
                          <span className="font-bold text-blue-600">{formatCurrency(entry.value)}/hr</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Set Goals Dialog */}
      <Dialog open={showGoalsDialog} onOpenChange={setShowGoalsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Establecer Metas de Performance</DialogTitle>
            <DialogDescription>
              Define metas de ventas y órdenes para un servidor específico
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Servidor *</Label>
              <Select value={goalsForm.serverId} onValueChange={(val) => setGoalsForm({ ...goalsForm, serverId: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un servidor" />
                </SelectTrigger>
                <SelectContent>
                  {servers.map((server) => (
                    <SelectItem key={server._id} value={server._id}>
                      {server.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Fecha *</Label>
              <Input
                type="date"
                value={goalsForm.date}
                onChange={(e) => setGoalsForm({ ...goalsForm, date: e.target.value })}
              />
            </div>

            <div>
              <Label>Meta de Ventas (USD) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={goalsForm.salesTarget}
                onChange={(e) => setGoalsForm({ ...goalsForm, salesTarget: parseFloat(e.target.value) })}
              />
            </div>

            <div>
              <Label>Meta de Órdenes *</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={goalsForm.ordersTarget}
                onChange={(e) => setGoalsForm({ ...goalsForm, ordersTarget: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGoalsDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetGoals}>
              Establecer Metas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ServerPerformanceDashboard;
