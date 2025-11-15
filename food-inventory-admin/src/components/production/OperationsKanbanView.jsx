import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  User,
  Timer,
  Target,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { fetchApi } from '@/lib/api';

const statusColumns = {
  pending: {
    title: 'Pendiente',
    color: 'bg-gray-100',
    borderColor: 'border-gray-300',
    icon: AlertCircle,
    iconColor: 'text-gray-500'
  },
  in_progress: {
    title: 'En Proceso',
    color: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: Play,
    iconColor: 'text-blue-500'
  },
  completed: {
    title: 'Completada',
    color: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: CheckCircle2,
    iconColor: 'text-green-500'
  }
};

export function OperationsKanbanView({ manufacturingOrder, onOperationUpdate, onRefresh }) {
  const [operations, setOperations] = useState([]);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [timerDialogOpen, setTimerDialogOpen] = useState(false);
  const [activeTimers, setActiveTimers] = useState({});

  // Form state for recording operation
  const [setupTime, setSetupTime] = useState('');
  const [cycleTime, setCycleTime] = useState('');
  const [teardownTime, setTeardownTime] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (manufacturingOrder?.operations) {
      setOperations(manufacturingOrder.operations);
    }
  }, [manufacturingOrder]);

  useEffect(() => {
    // Update timers every second for operations in progress
    const interval = setInterval(() => {
      setActiveTimers(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(opId => {
          if (updated[opId].running) {
            updated[opId].elapsed += 1;
          }
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    } else if (mins > 0) {
      return `${mins}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const formatMinutes = (minutes) => {
    if (!minutes) return '0 min';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    } else {
      return `${mins} min`;
    }
  };

  const handleStartOperation = async (operation) => {
    try {
      await fetchApi(`/manufacturing-orders/${manufacturingOrder._id}/operations/${operation._id}/start`, {
        method: 'POST'
      });

      // Start local timer
      setActiveTimers(prev => ({
        ...prev,
        [operation._id]: {
          running: true,
          elapsed: 0,
          startedAt: Date.now()
        }
      }));

      if (onRefresh) await onRefresh();
    } catch (error) {
      console.error('Error starting operation:', error);
      alert('Error al iniciar operación: ' + (error.message || 'Error desconocido'));
    }
  };

  const handlePauseOperation = (operation) => {
    setActiveTimers(prev => ({
      ...prev,
      [operation._id]: {
        ...prev[operation._id],
        running: false
      }
    }));
  };

  const handleResumeOperation = (operation) => {
    setActiveTimers(prev => ({
      ...prev,
      [operation._id]: {
        ...prev[operation._id],
        running: true
      }
    }));
  };

  const handleCompleteOperation = (operation) => {
    const timer = activeTimers[operation._id];
    const totalSeconds = timer?.elapsed || 0;
    const totalMinutes = Math.round(totalSeconds / 60);

    // Pre-fill form with timer data
    setSetupTime(operation.estimatedSetupTime?.toString() || '0');
    setCycleTime(totalMinutes.toString());
    setTeardownTime(operation.estimatedTeardownTime?.toString() || '0');
    setNotes('');

    setSelectedOperation(operation);
    setTimerDialogOpen(true);
  };

  const handleSaveCompletion = async () => {
    if (!selectedOperation) return;

    try {
      await fetchApi(`/manufacturing-orders/${manufacturingOrder._id}/operations/${selectedOperation._id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          actualSetupTime: parseFloat(setupTime) || 0,
          actualCycleTime: parseFloat(cycleTime) || 0,
          actualTeardownTime: parseFloat(teardownTime) || 0,
          notes: notes
        })
      });

      // Stop and clear timer
      setActiveTimers(prev => {
        const updated = { ...prev };
        delete updated[selectedOperation._id];
        return updated;
      });

      setTimerDialogOpen(false);
      setSelectedOperation(null);
      if (onRefresh) await onRefresh();
      if (onOperationUpdate) onOperationUpdate();
    } catch (error) {
      console.error('Error completing operation:', error);
      alert('Error al completar operación: ' + (error.message || 'Error desconocido'));
    }
  };

  const calculateEfficiency = (operation) => {
    const estimated = (operation.estimatedSetupTime || 0) +
                     (operation.estimatedCycleTime || 0) +
                     (operation.estimatedTeardownTime || 0);
    const actual = (operation.actualSetupTime || 0) +
                   (operation.actualCycleTime || 0) +
                   (operation.actualTeardownTime || 0);

    if (estimated === 0 || actual === 0) return null;

    const efficiency = (estimated / actual) * 100;
    return efficiency;
  };

  const getOperationsByStatus = (status) => {
    return operations.filter(op => op.status === status);
  };

  const getTotalProgress = () => {
    if (operations.length === 0) return 0;
    const completed = operations.filter(op => op.status === 'completed').length;
    return (completed / operations.length) * 100;
  };

  return (
    <div className="space-y-4">
      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Progreso General</span>
            <Badge variant="outline">
              {operations.filter(op => op.status === 'completed').length} / {operations.length} completadas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={getTotalProgress()} className="h-3" />
          <p className="text-sm text-muted-foreground mt-2">
            {getTotalProgress().toFixed(0)}% completado
          </p>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(statusColumns).map(([status, config]) => {
          const StatusIcon = config.icon;
          const ops = getOperationsByStatus(status);

          return (
            <Card key={status} className={`${config.borderColor} border-2`}>
              <CardHeader className={config.color}>
                <CardTitle className="flex items-center gap-2 text-base">
                  <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
                  {config.title}
                  <Badge variant="secondary" className="ml-auto">
                    {ops.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4 min-h-[400px]">
                {ops.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay operaciones
                  </div>
                ) : (
                  ops.map((operation, idx) => {
                    const timer = activeTimers[operation._id];
                    const efficiency = calculateEfficiency(operation);

                    return (
                      <Card key={operation._id || idx} className="shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-sm font-medium">
                                {operation.sequence}. {operation.name}
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {operation.workCenterName || 'Centro de trabajo'}
                              </CardDescription>
                            </div>
                            {efficiency !== null && operation.status === 'completed' && (
                              <div className="flex items-center gap-1">
                                {efficiency >= 100 ? (
                                  <TrendingUp className="h-4 w-4 text-green-500" />
                                ) : (
                                  <TrendingDown className="h-4 w-4 text-orange-500" />
                                )}
                                <span className={`text-xs font-medium ${
                                  efficiency >= 100 ? 'text-green-600' : 'text-orange-600'
                                }`}>
                                  {efficiency.toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Timer Display for in-progress operations */}
                          {operation.status === 'in_progress' && timer && (
                            <Alert className="bg-blue-50 border-blue-200">
                              <Timer className="h-4 w-4 text-blue-500" />
                              <AlertDescription className="flex items-center justify-between">
                                <span className="font-mono text-lg font-bold text-blue-700">
                                  {formatTime(timer.elapsed)}
                                </span>
                                <div className="flex gap-1">
                                  {timer.running ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePauseOperation(operation)}
                                    >
                                      <Pause className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleResumeOperation(operation)}
                                    >
                                      <Play className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </AlertDescription>
                            </Alert>
                          )}

                          {/* Time Info */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-1">
                              <Target className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Estimado:</span>
                              <span className="font-medium">
                                {formatMinutes(
                                  (operation.estimatedSetupTime || 0) +
                                  (operation.estimatedCycleTime || 0) +
                                  (operation.estimatedTeardownTime || 0)
                                )}
                              </span>
                            </div>
                            {operation.status === 'completed' && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3 text-muted-foreground" />
                                <span className="text-muted-foreground">Real:</span>
                                <span className="font-medium">
                                  {formatMinutes(
                                    (operation.actualSetupTime || 0) +
                                    (operation.actualCycleTime || 0) +
                                    (operation.actualTeardownTime || 0)
                                  )}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Assigned User */}
                          {operation.assignedTo && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{operation.assignedToName || 'Operador asignado'}</span>
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-2">
                            {operation.status === 'pending' && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleStartOperation(operation)}
                              >
                                <Play className="h-3 w-3 mr-1" />
                                Iniciar
                              </Button>
                            )}
                            {operation.status === 'in_progress' && (
                              <Button
                                size="sm"
                                className="w-full"
                                onClick={() => handleCompleteOperation(operation)}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completar
                              </Button>
                            )}
                            {operation.status === 'completed' && (
                              <Badge className="w-full justify-center bg-green-500">
                                Completada
                              </Badge>
                            )}
                          </div>

                          {/* Notes */}
                          {operation.notes && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-muted pl-2">
                              {operation.notes}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Complete Operation Dialog */}
      <Dialog open={timerDialogOpen} onOpenChange={setTimerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Operación</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedOperation && (
              <>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription>
                    <div className="font-medium">{selectedOperation.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Registra los tiempos reales de ejecución
                    </div>
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="setupTime">Tiempo de Setup (min)</Label>
                    <Input
                      id="setupTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={setupTime}
                      onChange={(e) => setSetupTime(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Est: {selectedOperation.estimatedSetupTime || 0} min
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="cycleTime">Tiempo de Ciclo (min)</Label>
                    <Input
                      id="cycleTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={cycleTime}
                      onChange={(e) => setCycleTime(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Est: {selectedOperation.estimatedCycleTime || 0} min
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="teardownTime">Tiempo de Limpieza (min)</Label>
                    <Input
                      id="teardownTime"
                      type="number"
                      min="0"
                      step="0.1"
                      value={teardownTime}
                      onChange={(e) => setTeardownTime(e.target.value)}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Est: {selectedOperation.estimatedTeardownTime || 0} min
                    </p>
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notas (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Observaciones sobre la ejecución..."
                    rows={3}
                  />
                </div>

                <div className="bg-muted p-3 rounded">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tiempo total:</span>
                    <span className="font-medium">
                      {formatMinutes(
                        (parseFloat(setupTime) || 0) +
                        (parseFloat(cycleTime) || 0) +
                        (parseFloat(teardownTime) || 0)
                      )}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTimerDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveCompletion}>
              Guardar y Completar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
