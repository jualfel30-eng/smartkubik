import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon } from 'lucide-react';

/**
 * PerformanceCharts - Data visualization component for campaign analytics
 * PHASE 5: Advanced Analytics & Reporting
 */
const PerformanceCharts = ({ dailyPerformance, segmentPerformance }) => {
  // Colors for charts
  const COLORS = {
    revenue: '#10b981', // green
    orders: '#f59e0b', // amber
    opened: '#3b82f6', // blue
    clicked: '#8b5cf6', // purple
    segments: ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'],
  };

  // Format daily performance data for charts
  const formattedDailyData = (dailyPerformance || []).map((day) => ({
    date: new Date(day.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
    revenue: day.revenue,
    orders: day.orders,
    opened: day.opened,
    clicked: day.clicked,
    openRate: day.openRate,
    conversionRate: day.conversionRate,
  }));

  // Format segment data for bar chart
  const formattedSegmentData = (segmentPerformance || []).map((segment) => ({
    name: segment.segmentName,
    revenue: segment.revenue,
    orders: segment.orders,
    customers: segment.customerCount,
    conversionRate: segment.conversionRate,
    revenuePerCustomer: segment.revenuePerCustomer,
  }));

  // Prepare pie chart data for segment revenue distribution
  const pieData = (segmentPerformance || [])
    .filter((s) => s.revenue > 0)
    .map((segment) => ({
      name: segment.segmentName,
      value: segment.revenue,
    }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-semibold dark:text-gray-100">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Daily Performance Charts */}
      <Card className="dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 dark:text-gray-100">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Performance Diario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {formattedDailyData.length > 0 ? (
            <Tabs defaultValue="revenue" className="w-full">
              <TabsList className="dark:bg-gray-900">
                <TabsTrigger value="revenue">Ingresos</TabsTrigger>
                <TabsTrigger value="orders">Órdenes</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
                <TabsTrigger value="rates">Tasas</TabsTrigger>
              </TabsList>

              <TabsContent value="revenue">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke={COLORS.revenue}
                      strokeWidth={2}
                      name="Ingresos ($)"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="orders">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="orders"
                      stroke={COLORS.orders}
                      strokeWidth={2}
                      name="Órdenes"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="engagement">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="opened"
                      stroke={COLORS.opened}
                      strokeWidth={2}
                      name="Aperturas"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="clicked"
                      stroke={COLORS.clicked}
                      strokeWidth={2}
                      name="Clics"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="rates">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={formattedDailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis
                      dataKey="date"
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#9ca3af"
                      style={{ fontSize: '12px' }}
                      domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="openRate"
                      stroke={COLORS.opened}
                      strokeWidth={2}
                      name="Tasa de Apertura (%)"
                      dot={{ r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="conversionRate"
                      stroke={COLORS.revenue}
                      strokeWidth={2}
                      name="Tasa de Conversión (%)"
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No hay datos de performance diario disponibles
            </div>
          )}
        </CardContent>
      </Card>

      {/* Segment Performance Charts */}
      {formattedSegmentData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Ingresos por Segmento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={formattedSegmentData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis
                    dataKey="name"
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis
                    stroke="#9ca3af"
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="revenue"
                    fill={COLORS.revenue}
                    name="Ingresos ($)"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie Chart */}
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-gray-100">
                <PieChartIcon className="w-5 h-5 text-purple-600" />
                Distribución de Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS.segments[index % COLORS.segments.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No hay datos para mostrar
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Segment Conversion Rates */}
      {formattedSegmentData.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Tasa de Conversión por Segmento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formattedSegmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                  domain={[0, 100]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="conversionRate"
                  fill={COLORS.orders}
                  name="Tasa de Conversión (%)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Revenue Per Customer by Segment */}
      {formattedSegmentData.length > 0 && (
        <Card className="dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 dark:text-gray-100">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              Ingreso Promedio por Cliente (Segmento)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formattedSegmentData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <YAxis
                  stroke="#9ca3af"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar
                  dataKey="revenuePerCustomer"
                  fill={COLORS.revenue}
                  name="Ingreso por Cliente ($)"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PerformanceCharts;
