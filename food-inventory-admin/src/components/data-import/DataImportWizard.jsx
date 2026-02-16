import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useDataImport } from '@/hooks/use-data-import';
import { useImportWebSocket } from '@/hooks/use-import-websocket';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2 } from 'lucide-react';

import StepEntitySelect from './steps/StepEntitySelect';
import StepColumnMapping from './steps/StepColumnMapping';
import StepPreviewValidation from './steps/StepPreviewValidation';
import StepExecuteImport from './steps/StepExecuteImport';
import StepImportSummary from './steps/StepImportSummary';

const STEPS = [
  { key: 'entity', label: 'Tipo y Archivo' },
  { key: 'mapping', label: 'Mapeo de Columnas' },
  { key: 'preview', label: 'Vista Previa' },
  { key: 'execute', label: 'Ejecutar' },
  { key: 'summary', label: 'Resultado' },
];

export default function DataImportWizard({ onGoToHistory }) {
  const [currentStep, setCurrentStep] = useState(0);
  const { user } = useAuth();

  const {
    importJob,
    fieldDefinitions,
    presets,
    validationResult,
    loading,
    upload,
    loadFieldDefinitions,
    loadPresets,
    downloadTemplate,
    saveMapping,
    validate,
    execute,
    refreshJob,
    downloadErrors,
    rollback,
    reset,
  } = useDataImport();

  const {
    progress,
    isComplete,
    completionResult,
    wsError,
    resetWs,
  } = useImportWebSocket(user?._id || user?.id);

  const goNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleUpload = useCallback(async (file, entityType, options) => {
    const result = await upload(file, entityType, options);
    if (result) {
      await loadFieldDefinitions(entityType);
    }
    return result;
  }, [upload, loadFieldDefinitions]);

  const handleReset = useCallback(() => {
    reset();
    resetWs();
    setCurrentStep(0);
  }, [reset, resetWs]);

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <nav className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isCompleted
                        ? 'bg-green-100 text-green-700'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <span
                  className={`text-sm hidden md:inline ${
                    isActive ? 'font-semibold' : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 ${
                    idx < currentStep ? 'bg-green-300' : 'bg-border'
                  }`}
                />
              )}
            </div>
          );
        })}
      </nav>

      {/* Current Step */}
      {currentStep === 0 && (
        <StepEntitySelect
          loading={loading}
          presets={presets}
          onUpload={handleUpload}
          onDownloadTemplate={downloadTemplate}
          onLoadPresets={loadPresets}
          onNext={goNext}
        />
      )}

      {currentStep === 1 && (
        <StepColumnMapping
          importJob={importJob}
          fieldDefinitions={fieldDefinitions}
          presets={presets}
          loading={loading}
          onSaveMapping={saveMapping}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}

      {currentStep === 2 && (
        <StepPreviewValidation
          importJob={importJob}
          validationResult={validationResult}
          loading={loading}
          onValidate={validate}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}

      {currentStep === 3 && (
        <StepExecuteImport
          importJob={importJob}
          loading={loading}
          progress={progress}
          isComplete={isComplete}
          completionResult={completionResult}
          wsError={wsError}
          onExecute={execute}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}

      {currentStep === 4 && (
        <StepImportSummary
          importJob={importJob}
          loading={loading}
          onRefreshJob={refreshJob}
          onDownloadErrors={downloadErrors}
          onRollback={rollback}
          onReset={handleReset}
          onGoToHistory={onGoToHistory}
        />
      )}
    </div>
  );
}
