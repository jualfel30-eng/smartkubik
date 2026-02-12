import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2, XCircle, Download, RotateCcw, PlusCircle, History,
  FileWarning, ArrowUpCircle,
} from 'lucide-react';

export default function StepImportSummary({
  importJob,
  loading,
  onRefreshJob,
  onDownloadErrors,
  onRollback,
  onReset,
  onGoToHistory,
}) {
  const [jobDetails, setJobDetails] = useState(null);

  useEffect(() => {
    if (importJob?.importJobId) {
      onRefreshJob(importJob.importJobId).then((data) => {
        if (data) setJobDetails(data);
      });
    }
  }, [importJob?.importJobId]);

  const details = jobDetails || importJob;
  const hasErrors = (details?.failedRows || 0) > 0;
  const totalSuccessful = (details?.successfulRows || 0);

  return (
    <div className="space-y-6">
      {/* Main Result Card */}
      <Card className={hasErrors ? 'border-yellow-300' : 'border-green-300'}>
        <CardContent className="p-8 text-center">
          <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
            hasErrors ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            {hasErrors ? (
              <FileWarning className="h-8 w-8 text-yellow-600" />
            ) : (
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            )}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            {hasErrors
              ? 'Importación completada con errores'
              : 'Importación exitosa'}
          </h3>
          <p className="text-muted-foreground">
            {details?.originalFileName || 'archivo'}
          </p>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold">{details?.totalRows || 0}</p>
            <p className="text-xs text-muted-foreground">Total Filas</p>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <PlusCircle className="h-4 w-4 text-green-600" />
              <p className="text-3xl font-bold text-green-600">
                {(details?.successfulRows || 0) - (details?.updatedRows || 0)}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Creados</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <ArrowUpCircle className="h-4 w-4 text-blue-600" />
              <p className="text-3xl font-bold text-blue-600">
                {details?.updatedRows || 0}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Actualizados</p>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <p className="text-3xl font-bold text-red-600">
                {details?.failedRows || 0}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Fallidos</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-400">
              {details?.skippedRows || 0}
            </p>
            <p className="text-xs text-muted-foreground">Omitidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {/* Download Errors */}
        {hasErrors && (
          <Button
            variant="outline"
            onClick={() => onDownloadErrors(importJob.importJobId)}
            disabled={loading}
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar Reporte de Errores
          </Button>
        )}

        {/* Rollback */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive border-destructive/30">
              <RotateCcw className="h-4 w-4 mr-2" />
              Revertir Importación
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revertir importación</AlertDialogTitle>
              <AlertDialogDescription>
                Esto eliminará todos los registros creados por esta importación
                ({totalSuccessful} registros). Los registros actualizados serán
                restaurados a sus valores anteriores. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRollback(importJob.importJobId)}
                className="bg-destructive text-destructive-foreground"
              >
                Sí, revertir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Import More */}
        <Button onClick={onReset}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Importar Más Datos
        </Button>

        {/* History */}
        <Button variant="outline" onClick={onGoToHistory}>
          <History className="h-4 w-4 mr-2" />
          Ver Historial
        </Button>
      </div>
    </div>
  );
}
