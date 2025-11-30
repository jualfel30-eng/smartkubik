import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQualityControl } from '@/hooks/useQualityControl';
import { ShieldCheck, Award, AlertTriangle, TrendingUp, TrendingDown, FileCheck, XCircle } from 'lucide-react';

export function QualityControlDashboard() {
  const { inspections, nonConformances, qcPlans, loadInspections, loadNonConformances, loadQCPlans, loading } = useQualityControl();
  const [metrics, setMetrics] = useState({
    totalInspections: 0,
    completedInspections: 0,
    passedInspections: 0,
    failedInspections: 0,
    approvalRate: 0,
    totalNCs: 0,
    openNCs: 0,
    criticalNCs: 0,
    activePlans: 0,
  });

  useEffect(() => {
    loadQCPlans();
    loadInspections();
    loadNonConformances();
  }, [loadQCPlans, loadInspections, loadNonConformances]);

  const calculateMetrics = useCallback(() => {
    const totalInsp = inspections.length;
    const completed = inspections.filter(i => i.status === 'completed');
    const completedCount = completed.length;
    const passed = completed.filter(i => i.overallResult === true).length;
    const failed = completed.filter(i => i.overallResult === false).length;
    const approvalRate = completedCount > 0 ? ((passed / completedCount) * 100).toFixed(1) : 0;

    const totalNCs = nonConformances.length;
    const openNCs = nonConformances.filter(nc => nc.status === 'open' || nc.status === 'in_progress').length;
    const criticalNCs = nonConformances.filter(nc => nc.severity === 'critical' && nc.status !== 'closed').length;

    const activePlans = qcPlans.filter(plan => plan.isActive).length;

    setMetrics({
      totalInspections: totalInsp,
      completedInspections: completedCount,
      passedInspections: passed,
      failedInspections: failed,
      approvalRate: parseFloat(approvalRate),
      totalNCs,
      openNCs,
      criticalNCs,
      activePlans,
    });
  }, [inspections, nonConformances, qcPlans]);

  useEffect(() => {
    if (inspections || nonConformances || qcPlans) {
      calculateMetrics();
    }
  }, [inspections, nonConformances, qcPlans, calculateMetrics]);

  const MetricCard = ({ title, value, subtitle, icon: Icon, trend, trendValue, colorClass = '' }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className={`h-4 w-4 ${colorClass || 'text-muted-foreground'}`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{trendValue}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Cargando métricas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Resumen de Control de Calidad</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Planes QC Activos"
            value={metrics.activePlans}
            subtitle={`${qcPlans.length} planes totales`}
            icon={FileCheck}
            colorClass="text-blue-600"
          />

          <MetricCard
            title="Inspecciones Completadas"
            value={metrics.completedInspections}
            subtitle={`${metrics.totalInspections} inspecciones totales`}
            icon={Award}
            colorClass="text-purple-600"
          />

          <MetricCard
            title="Tasa de Aprobación"
            value={`${metrics.approvalRate}%`}
            subtitle={`${metrics.passedInspections} aprobadas, ${metrics.failedInspections} rechazadas`}
            icon={metrics.approvalRate >= 90 ? TrendingUp : TrendingDown}
            colorClass={metrics.approvalRate >= 90 ? 'text-green-600' : 'text-orange-600'}
          />

          <MetricCard
            title="NCs Abiertas"
            value={metrics.openNCs}
            subtitle={`${metrics.totalNCs} no conformidades totales`}
            icon={AlertTriangle}
            colorClass={metrics.openNCs > 0 ? 'text-red-600' : 'text-green-600'}
          />
        </div>
      </div>

      {metrics.criticalNCs > 0 && (
        <Card className="border-red-300 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Atención: No Conformidades Críticas
            </CardTitle>
            <CardDescription className="text-red-700">
              Hay {metrics.criticalNCs} no conformidad(es) crítica(s) que requieren atención inmediata
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Inspecciones</CardTitle>
          </CardHeader>
          <CardContent>
            {inspections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay inspecciones registradas</p>
            ) : (
              <div className="space-y-3">
                {inspections.slice(0, 5).map((inspection) => (
                  <div key={inspection._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{inspection.productName}</p>
                      <p className="text-xs text-muted-foreground">
                        {inspection.inspectionNumber} • {inspection.lotNumber || 'Sin lote'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {inspection.overallResult === true && (
                        <Badge className="bg-green-500">Aprobada</Badge>
                      )}
                      {inspection.overallResult === false && (
                        <Badge className="bg-red-500">Rechazada</Badge>
                      )}
                      {inspection.overallResult === null && (
                        <Badge variant="outline">Pendiente</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">No Conformidades Activas</CardTitle>
          </CardHeader>
          <CardContent>
            {nonConformances.filter(nc => nc.status !== 'closed').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6">
                <ShieldCheck className="h-12 w-12 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">No hay no conformidades activas</p>
              </div>
            ) : (
              <div className="space-y-3">
                {nonConformances
                  .filter(nc => nc.status !== 'closed')
                  .slice(0, 5)
                  .map((nc) => (
                    <div key={nc._id} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{nc.ncNumber}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {nc.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {nc.severity === 'critical' && (
                          <Badge className="bg-red-500">Crítica</Badge>
                        )}
                        {nc.severity === 'major' && (
                          <Badge className="bg-orange-500">Mayor</Badge>
                        )}
                        {nc.severity === 'minor' && (
                          <Badge className="bg-yellow-500">Menor</Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribución de Resultados de Inspección</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500"></div>
                  <span className="text-sm">Aprobadas</span>
                </div>
                <span className="text-lg font-bold">{metrics.passedInspections}</span>
              </div>
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500"></div>
                  <span className="text-sm">Rechazadas</span>
                </div>
                <span className="text-lg font-bold">{metrics.failedInspections}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-gray-400"></div>
                  <span className="text-sm">Pendientes</span>
                </div>
                <span className="text-lg font-bold">
                  {metrics.totalInspections - metrics.completedInspections}
                </span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-center">
                <div className={`text-5xl font-bold ${metrics.approvalRate >= 90 ? 'text-green-600' : metrics.approvalRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {metrics.approvalRate}%
                </div>
                <p className="text-sm text-muted-foreground mt-2">Tasa de Aprobación Global</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
