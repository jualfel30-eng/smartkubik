import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import {
  getBeautyRevenueByProfessional,
  getBeautyPopularServices,
  getBeautyNoShowRate,
  getBeautyClientRetention,
  getBeautyPeakHours,
  getBeautyUtilization,
} from '../lib/api';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f97316'];
const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function DateRangePicker({ startDate, endDate, onStartChange, onEndChange }) {
  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div>
        <Label htmlFor="rd-start" className="text-xs">Desde</Label>
        <Input
          id="rd-start"
          type="date"
          value={startDate}
          onChange={(e) => onStartChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label htmlFor="rd-end" className="text-xs">Hasta</Label>
        <Input
          id="rd-end"
          type="date"
          value={endDate}
          onChange={(e) => onEndChange(e.target.value)}
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
}

function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  return new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(amount);
}

// ─────────────────────────────────────────────────────────────────
// 6.1 Revenue by Professional
// ─────────────────────────────────────────────────────────────────
function RevenueByProfessionalCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyRevenueByProfessional({ startDate, endDate })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ingresos por Profesional</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="flex gap-6 mb-4 flex-wrap">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">{formatCurrency(data.totals?.totalRevenue)}</div>
                <div className="text-xs text-muted-foreground">Ingresos totales</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{data.totals?.totalBookings}</div>
                <div className="text-xs text-muted-foreground">Reservas</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(data.totals?.averageTicket)}</div>
                <div className="text-xs text-muted-foreground">Ticket promedio</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.professionals} margin={{ top: 4, right: 8, left: 8, bottom: 20 }}>
                <XAxis
                  dataKey="professionalName"
                  tick={{ fontSize: 11 }}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="totalRevenue" name="Ingresos" radius={[4, 4, 0, 0]}>
                  {(data.professionals || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 divide-y">
              {(data.professionals || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <span className="font-medium">{p.professionalName}</span>
                  <div className="flex gap-4 text-muted-foreground text-xs">
                    <span>{p.totalBookings} citas</span>
                    <span>{p.hoursWorked?.toFixed(1)}h trabajadas</span>
                    <span className="font-semibold text-foreground">{formatCurrency(p.totalRevenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6.2 Popular Services
// ─────────────────────────────────────────────────────────────────
function PopularServicesCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyPopularServices({ startDate, endDate })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Servicios Populares</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.services?.slice(0, 6) || []}
                  dataKey="totalBookings"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percentageOfTotal }) =>
                    `${name} (${percentageOfTotal?.toFixed(0)}%)`
                  }
                  labelLine={false}
                >
                  {(data.services?.slice(0, 6) || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="divide-y overflow-auto max-h-52">
              {(data.services || []).map((s, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[i % COLORS.length] }}
                    />
                    <span className="font-medium truncate max-w-[160px]">{s.name}</span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{s.totalBookings} citas</span>
                    <Badge variant="outline" className="text-[10px]">
                      {s.percentageOfTotal?.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6.3 No-Show Rate
// ─────────────────────────────────────────────────────────────────
function NoShowRateCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [groupBy, setGroupBy] = useState('day');

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyNoShowRate({ startDate, endDate, groupBy })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate, groupBy]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Tasa de No-Show y Cancelaciones</CardTitle>
        <Select value={groupBy} onValueChange={setGroupBy}>
          <SelectTrigger className="w-28 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Por día</SelectItem>
            <SelectItem value="week">Por semana</SelectItem>
            <SelectItem value="month">Por mes</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="flex gap-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {data.averages?.noShowRate?.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">No-show promedio</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-500">
                  {data.averages?.cancellationRate?.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Cancelaciones promedio</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data.periods || []} margin={{ top: 4, right: 8, left: 0, bottom: 20 }}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} unit="%" />
                <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
                <Bar dataKey="noShowRate" name="No-show %" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="cancellationRate" name="Cancelaciones %" fill="#f59e0b" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6.4 Client Retention
// ─────────────────────────────────────────────────────────────────
function ClientRetentionCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyClientRetention({ startDate, endDate })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retención de Clientes</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <div className="text-2xl font-bold text-green-600">{data.summary?.newClients}</div>
                <div className="text-xs text-muted-foreground">Nuevos</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <div className="text-2xl font-bold text-blue-600">{data.summary?.returningClients}</div>
                <div className="text-xs text-muted-foreground">Recurrentes</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <div className="text-2xl font-bold text-red-600">{data.summary?.lostClients}</div>
                <div className="text-xs text-muted-foreground">Perdidos</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30">
                <div className="text-2xl font-bold text-purple-600">
                  {data.summary?.retentionRate?.toFixed(1)}%
                </div>
                <div className="text-xs text-muted-foreground">Retención</div>
              </div>
            </div>
            <div className="text-sm font-semibold mb-2">Top 10 clientes</div>
            <div className="divide-y max-h-52 overflow-auto">
              {(data.topClients || []).map((c, i) => (
                <div key={i} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium">{c.name || c.phone}</span>
                    <Badge
                      variant={c.type === 'new' ? 'success' : 'secondary'}
                      className="ml-2 text-[10px]"
                    >
                      {c.type === 'new' ? 'Nuevo' : 'Recurrente'}
                    </Badge>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{c.visitCount} visitas</span>
                    <span className="font-semibold text-foreground">{formatCurrency(c.totalSpent)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6.5 Peak Hours Heatmap
// ─────────────────────────────────────────────────────────────────
function PeakHoursCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyPeakHours({ startDate, endDate })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  // Build heatmap grid: hours 7-21, days 0-6
  const buildGrid = (heatmap) => {
    const grid = {};
    let maxCount = 0;
    (heatmap || []).forEach(({ day, hour, count }) => {
      if (!grid[day]) grid[day] = {};
      grid[day][hour] = count;
      if (count > maxCount) maxCount = count;
    });
    return { grid, maxCount };
  };

  const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7..21

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Horas Pico</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="flex gap-6 mb-4 flex-wrap text-sm">
              <div>
                <span className="text-muted-foreground">Día más ocupado: </span>
                <span className="font-semibold">{data.insights?.busiestDay || '-'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Hora pico: </span>
                <span className="font-semibold">{data.insights?.busiestHour || '-'}</span>
              </div>
            </div>
            {/* Heatmap grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[420px]">
                {/* Header */}
                <div className="flex">
                  <div className="w-10" />
                  {DAY_LABELS.map((d) => (
                    <div key={d} className="flex-1 text-center text-xs text-muted-foreground font-medium py-1">
                      {d}
                    </div>
                  ))}
                </div>
                {/* Rows */}
                {(() => {
                  const { grid, maxCount } = buildGrid(data.heatmap);
                  return HOURS.map((hour) => (
                    <div key={hour} className="flex items-center">
                      <div className="w-10 text-xs text-muted-foreground text-right pr-2">{hour}h</div>
                      {Array.from({ length: 7 }, (_, day) => {
                        const count = grid[day]?.[hour] || 0;
                        const intensity = maxCount > 0 ? count / maxCount : 0;
                        const bg = intensity === 0
                          ? 'bg-gray-100 dark:bg-gray-800'
                          : intensity < 0.33
                          ? 'bg-indigo-100 dark:bg-indigo-900'
                          : intensity < 0.66
                          ? 'bg-indigo-300 dark:bg-indigo-700'
                          : 'bg-indigo-600 dark:bg-indigo-500';
                        return (
                          <div
                            key={day}
                            className={`flex-1 h-7 m-0.5 rounded text-center text-[10px] flex items-center justify-center transition-colors ${bg} ${
                              count > 0 ? 'cursor-default' : ''
                            }`}
                            title={`${DAY_LABELS[day]} ${hour}:00 — ${count} citas`}
                          >
                            {count > 0 && (
                              <span className={intensity >= 0.66 ? 'text-white' : 'text-gray-700 dark:text-gray-200'}>
                                {count}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ));
                })()}
              </div>
            </div>
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              <span>Menos</span>
              {['bg-gray-100 dark:bg-gray-800', 'bg-indigo-100 dark:bg-indigo-900', 'bg-indigo-300 dark:bg-indigo-700', 'bg-indigo-600 dark:bg-indigo-500'].map((c, i) => (
                <div key={i} className={`w-5 h-5 rounded ${c} border border-gray-200 dark:border-gray-700`} />
              ))}
              <span>Más</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// 6.6 Utilization
// ─────────────────────────────────────────────────────────────────
function UtilizationCard({ startDate, endDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setError(null);
    getBeautyUtilization({ startDate, endDate })
      .then(setData)
      .catch((e) => setError(e.message || 'Error'))
      .finally(() => setLoading(false));
  }, [startDate, endDate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Utilización de Profesionales</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <p className="text-sm text-muted-foreground">Cargando...</p>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {data && (
          <>
            <div className="mb-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {data.averageUtilization?.toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">Utilización promedio</div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.professionals || []}
                layout="vertical"
                margin={{ top: 4, right: 40, left: 80, bottom: 4 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(v) => `${v?.toFixed(1)}%`} />
                <Bar dataKey="utilizationRate" name="Utilización %" radius={[0, 4, 4, 0]}>
                  {(data.professionals || []).map((p, i) => (
                    <Cell
                      key={i}
                      fill={
                        p.utilizationRate >= 70
                          ? '#10b981'
                          : p.utilizationRate >= 40
                          ? '#f59e0b'
                          : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 divide-y text-sm">
              {(data.professionals || []).map((p, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span className="font-medium">{p.name}</span>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span>{p.totalBookings} citas</span>
                    <span>{p.totalWorkedHours?.toFixed(1)}h trabajadas</span>
                    <span>{p.totalAvailableHours?.toFixed(1)}h disponibles</span>
                    <Badge
                      variant={
                        p.utilizationRate >= 70
                          ? 'success'
                          : p.utilizationRate >= 40
                          ? 'warning'
                          : 'destructive'
                      }
                      className="text-[10px]"
                    >
                      {p.utilizationRate?.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main widget exported — all 6 reports with shared date pickers
// ─────────────────────────────────────────────────────────────────
export default function BeautyReportsWidget() {
  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);

  return (
    <div className="space-y-6">
      {/* Date range filter shared by all reports */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <h2 className="text-xl font-bold">Reportes de Belleza</h2>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onStartChange={setStartDate}
          onEndChange={setEndDate}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueByProfessionalCard startDate={startDate} endDate={endDate} />
        <PopularServicesCard startDate={startDate} endDate={endDate} />
        <NoShowRateCard startDate={startDate} endDate={endDate} />
        <ClientRetentionCard startDate={startDate} endDate={endDate} />
        <PeakHoursCard startDate={startDate} endDate={endDate} />
        <UtilizationCard startDate={startDate} endDate={endDate} />
      </div>
    </div>
  );
}
