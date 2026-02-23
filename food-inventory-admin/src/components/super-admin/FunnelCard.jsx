import React, { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCheck, Activity, CreditCard, AlertTriangle } from 'lucide-react';

const STAGES = [
  { key: 'totalRegistered', label: 'Registrados', icon: Users, color: 'bg-gray-500' },
  { key: 'totalConfirmed', label: 'Confirmados', icon: UserCheck, color: 'bg-blue-500' },
  { key: 'totalActive', label: 'Activos', icon: Activity, color: 'bg-emerald-500' },
  { key: 'totalPaying', label: 'Pagando', icon: CreditCard, color: 'bg-green-600' },
];

export default function FunnelCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/super-admin/metrics/funnel')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Cargando métricas de funnel...
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Funnel de Conversión</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Funnel stages */}
        <div className="flex items-end gap-2">
          {STAGES.map((stage, i) => {
            const value = data[stage.key] || 0;
            const prevValue = i > 0 ? (data[STAGES[i - 1].key] || 1) : value;
            const convRate = i > 0 && prevValue > 0
              ? Math.round((value / prevValue) * 100)
              : 100;
            const Icon = stage.icon;

            return (
              <div key={stage.key} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs text-muted-foreground">
                  {i > 0 && (
                    <span className="text-xs font-mono">{convRate}%</span>
                  )}
                </div>
                <div
                  className={`w-full rounded-lg flex flex-col items-center justify-center text-white font-bold py-3 ${stage.color}`}
                  style={{ minHeight: `${Math.max(48, (value / Math.max(data.totalRegistered, 1)) * 120)}px` }}
                >
                  <Icon className="h-4 w-4 mb-1 opacity-80" />
                  <span className="text-xl">{value}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center">{stage.label}</span>
              </div>
            );
          })}
        </div>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-2 pt-2 border-t">
          {data.trialExpiring7d > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.trialExpiring7d} trial(s) por vencer en 7d
            </Badge>
          )}
          <Badge variant="outline">
            Últimos 7d: +{data.recentRegistrations7d}
          </Badge>
          <Badge variant="outline">
            Últimos 30d: +{data.recentRegistrations30d}
          </Badge>
          {data.planBreakdown && Object.entries(data.planBreakdown).map(([plan, count]) => (
            <Badge key={plan} variant="secondary" className="text-xs">
              {plan}: {count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
