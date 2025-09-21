import React, { useState, useEffect, useCallback } from 'react';
import { fetchApi } from '../lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Users, Building, Activity, TrendingUp } from 'lucide-react';

const MetricCard = ({ title, value, icon, description }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      {icon}
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </CardContent>
  </Card>
);

export default function GlobalMetricsDashboard() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    const { data, error } = await fetchApi('/super-admin/metrics');
    setLoading(false);

    if (error) {
      setError(error);
      toast.error('Error al cargar las métricas globales', { description: error });
      return;
    }
    setMetrics(data);
  }, []);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading) {
    return <div>Cargando métricas...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      <MetricCard 
        title="Total Tenants" 
        value={metrics.totalTenants} 
        icon={<Building className="h-4 w-4 text-muted-foreground" />} 
        description={`${metrics.activeTenants} activos, ${metrics.suspendedTenants} suspendidos`}
      />
      <MetricCard 
        title="Total Usuarios" 
        value={metrics.totalUsers} 
        icon={<Users className="h-4 w-4 text-muted-foreground" />} 
        description={`${metrics.newUsersLast30Days} nuevos en los últimos 30 días`}
      />
      <MetricCard 
        title="Nuevos Tenants (30d)" 
        value={metrics.newTenantsLast30Days} 
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />} 
      />
      <MetricCard 
        title="Usuarios Activos (24h)" 
        value={metrics.activeUsersLast24Hours} 
        icon={<Activity className="h-4 w-4 text-muted-foreground" />} 
      />
    </div>
  );
}