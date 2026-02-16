import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, Play, CheckCircle2, XCircle } from 'lucide-react';

export default function StepExecuteImport({
  importJob,
  loading,
  progress,
  isComplete,
  completionResult,
  wsError,
  onExecute,
  onNext,
  onPrev,
}) {
  const [started, setStarted] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleExecute = useCallback(async () => {
    if (!importJob?.importJobId) return;
    setStarted(true);
    try {
      const result = await onExecute(importJob.importJobId);
      if (!result.queued) {
        // Sync result — go directly to summary
        setSyncResult(result);
      }
    } catch {
      // Error handled by hook
    }
  }, [importJob?.importJobId, onExecute]);

  // Auto-advance when complete
  useEffect(() => {
    if (isComplete || syncResult) {
      const timer = setTimeout(onNext, 1500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, syncResult, onNext]);

  const percentComplete = progress?.percentComplete || 0;
  const isProcessing = started && !isComplete && !syncResult && !wsError;
  const isDone = isComplete || !!syncResult;

  return (
    <div className="space-y-6">
      {!started ? (
        // Pre-execution view
        <Card>
          <CardContent className="p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              Listo para importar
            </h3>
            <p className="text-muted-foreground mb-6">
              Se procesarán {importJob?.totalRows || 0} filas de tipo{' '}
              <span className="font-medium">{importJob?.entityType}</span>.
              {importJob?.totalRows > 1000 && (
                <span className="block mt-1 text-sm">
                  El archivo será procesado en segundo plano.
                </span>
              )}
            </p>
            <Button size="lg" onClick={handleExecute} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Iniciar Importación
            </Button>
          </CardContent>
        </Card>
      ) : (
        // During/after execution
        <Card>
          <CardContent className="p-8">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">
                  {isDone ? 'Completado' : 'Procesando...'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {isDone ? '100%' : `${percentComplete}%`}
                </span>
              </div>
              <Progress value={isDone ? 100 : percentComplete} className="h-3" />
            </div>

            {/* Stats Grid */}
            {(progress || syncResult) && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold">
                    {progress?.processedRows || syncResult?.created + syncResult?.updated + syncResult?.failed + syncResult?.skipped || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Procesados</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {progress?.successfulRows || (syncResult?.created || 0) + (syncResult?.updated || 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">Exitosos</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">
                    {progress?.failedRows || syncResult?.failed || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Fallidos</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-400">
                    {progress?.skippedRows || syncResult?.skipped || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Omitidos</p>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="text-center">
              {isProcessing && (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-muted-foreground">
                    Procesando lote {progress?.currentBatch || '...'} de {progress?.totalBatches || '...'}
                  </span>
                </div>
              )}
              {isDone && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">Importación completada</span>
                </div>
              )}
              {wsError && (
                <div className="flex items-center justify-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  <span className="font-medium">{wsError}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
