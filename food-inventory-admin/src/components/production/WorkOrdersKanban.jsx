import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Circle, Play } from 'lucide-react';

const statusConfig = {
  pending: { label: 'Pendiente', color: 'bg-gray-500', icon: Circle },
  in_progress: { label: 'En Proceso', color: 'bg-yellow-500', icon: Play },
  completed: { label: 'Completada', color: 'bg-green-500', icon: CheckCircle },
};

export function WorkOrdersKanban({ operations = [], workCenters = [] }) {
  // Agrupar operaciones por estado
  const operationsByStatus = {
    pending: operations.filter((op) => op.status === 'pending'),
    in_progress: operations.filter((op) => op.status === 'in_progress'),
    completed: operations.filter((op) => op.status === 'completed'),
  };

  const getWorkCenterName = (workCenterId) => {
    const wc = workCenters.find((w) => w._id === workCenterId || w._id === workCenterId?._id);
    return wc ? wc.name : 'Centro no especificado';
  };

  const formatTime = (minutes) => {
    if (!minutes) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const OperationCard = ({ operation }) => {
    const statusInfo = statusConfig[operation.status] || statusConfig.pending;
    const StatusIcon = statusInfo.icon;

    const estimatedTotal =
      (operation.estimatedSetupTime || 0) +
      (operation.estimatedCycleTime || 0) +
      (operation.estimatedTeardownTime || 0);

    const actualTotal =
      (operation.actualSetupTime || 0) +
      (operation.actualCycleTime || 0) +
      (operation.actualTeardownTime || 0);

    return (
      <Card className="mb-3 border-l-4" style={{ borderLeftColor: statusInfo.color.replace('bg-', '#') }}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              {operation.sequence}. {operation.name}
            </CardTitle>
            <Badge className={`${statusInfo.color} text-white`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Circle className="h-3 w-3" />
              <span>{getWorkCenterName(operation.workCenterId)}</span>
            </div>

            <div className="flex items-center gap-2">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimado:</span>
                  <span className="font-medium">{formatTime(estimatedTotal)}</span>
                </div>
                {operation.status !== 'pending' && actualTotal > 0 && (
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Real:</span>
                    <span className={`font-medium ${actualTotal > estimatedTotal ? 'text-red-600' : 'text-green-600'}`}>
                      {formatTime(actualTotal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {operation.estimatedLaborCost > 0 && (
              <div className="flex justify-between pt-2 border-t">
                <span className="text-muted-foreground">Costo Estimado:</span>
                <span className="font-medium">${operation.estimatedLaborCost.toFixed(2)}</span>
              </div>
            )}

            {operation.actualLaborCost > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo Real:</span>
                <span className={`font-medium ${operation.actualLaborCost > operation.estimatedLaborCost ? 'text-red-600' : 'text-green-600'}`}>
                  ${operation.actualLaborCost.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Object.entries(operationsByStatus).map(([status, ops]) => {
        const statusInfo = statusConfig[status];
        const StatusIcon = statusInfo.icon;

        return (
          <div key={status} className="flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b">
              <StatusIcon className="h-5 w-5" />
              <h3 className="font-semibold">{statusInfo.label}</h3>
              <Badge variant="outline" className="ml-auto">
                {ops.length}
              </Badge>
            </div>

            <div className="flex-1 space-y-3">
              {ops.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No hay operaciones {statusInfo.label.toLowerCase()}
                </div>
              ) : (
                ops.map((operation, index) => (
                  <OperationCard key={operation._id || index} operation={operation} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
