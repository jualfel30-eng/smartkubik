import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function InspectionResultsForm({ qcPlan, results = [], onChange }) {
  const [formResults, setFormResults] = useState([]);

  useEffect(() => {
    if (qcPlan?.checkpoints) {
      // Initialize or merge with existing results
      const initialized = qcPlan.checkpoints.map((checkpoint, index) => {
        const existing = results.find(r => r.checkpointId === checkpoint._id);
        return existing || {
          checkpointId: checkpoint._id || index,
          checkpointName: checkpoint.name,
          expectedValue: checkpoint.expectedValue || '',
          measuredValue: '',
          numericValue: null,
          passed: null,
          notes: '',
        };
      });
      setFormResults(initialized);
    }
  }, [qcPlan, results]);

  const handleResultChange = (index, field, value) => {
    const newResults = [...formResults];
    newResults[index] = { ...newResults[index], [field]: value };

    // Auto-evaluate pass/fail for measurements
    if (field === 'measuredValue' || field === 'numericValue') {
      const checkpoint = qcPlan.checkpoints[index];
      if (checkpoint.testType === 'measurement' && value !== '') {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
          newResults[index].numericValue = numValue;

          let passed = true;
          if (checkpoint.minimumValue !== undefined && checkpoint.minimumValue !== '') {
            passed = passed && numValue >= parseFloat(checkpoint.minimumValue);
          }
          if (checkpoint.maximumValue !== undefined && checkpoint.maximumValue !== '') {
            passed = passed && numValue <= parseFloat(checkpoint.maximumValue);
          }
          newResults[index].passed = passed;
        }
      }
    }

    setFormResults(newResults);
    onChange(newResults);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      minor: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      major: 'bg-orange-100 text-orange-800 border-orange-300',
      critical: 'bg-red-100 text-red-800 border-red-300'
    };
    return colors[severity] || colors.major;
  };

  const getStatusIcon = (passed, checkpoint) => {
    if (passed === null || passed === undefined) {
      return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
    if (passed && checkpoint.mandatory) {
      return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
    if (passed) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  if (!qcPlan || !qcPlan.checkpoints) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Selecciona un plan QC para comenzar la inspección
      </div>
    );
  }

  const passedCount = formResults.filter(r => r.passed === true).length;
  const failedCount = formResults.filter(r => r.passed === false).length;
  const pendingCount = formResults.filter(r => r.passed === null).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 bg-accent/50 rounded-lg">
        <div>
          <h4 className="font-medium">Plan: {qcPlan.name}</h4>
          <p className="text-sm text-muted-foreground">{qcPlan.checkpoints.length} checkpoints</p>
        </div>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-medium">{passedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-4 w-4 text-red-600" />
            <span className="font-medium">{failedCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <AlertCircle className="h-4 w-4 text-gray-400" />
            <span className="font-medium">{pendingCount}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {qcPlan.checkpoints.map((checkpoint, index) => {
          const result = formResults[index] || {};
          return (
            <Card key={index} className={`${getSeverityColor(checkpoint.severity)} border-2`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    {getStatusIcon(result.passed, checkpoint)}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{checkpoint.sequence}
                        </Badge>
                        <span className="font-medium">{checkpoint.name}</span>
                        {checkpoint.mandatory && (
                          <Badge variant="destructive" className="text-xs">Obligatorio</Badge>
                        )}
                      </div>
                      {checkpoint.description && (
                        <p className="text-sm text-muted-foreground">{checkpoint.description}</p>
                      )}
                      {checkpoint.testMethod && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Método: {checkpoint.testMethod}
                        </p>
                      )}
                    </div>

                    <div className="grid gap-3">
                      {checkpoint.testType === 'measurement' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">Valor Medido *</Label>
                            <Input
                              type="number"
                              step="0.001"
                              value={result.measuredValue || ''}
                              onChange={(e) => handleResultChange(index, 'measuredValue', e.target.value)}
                              placeholder={checkpoint.expectedValue || '0'}
                              className="mt-1"
                            />
                            {checkpoint.unit && (
                              <span className="text-xs text-muted-foreground ml-1">{checkpoint.unit}</span>
                            )}
                          </div>
                          <div>
                            <Label className="text-xs">Rango Esperado</Label>
                            <div className="mt-1 text-sm font-medium">
                              {checkpoint.minimumValue && checkpoint.maximumValue ? (
                                <span>
                                  {checkpoint.minimumValue} - {checkpoint.maximumValue} {checkpoint.unit}
                                </span>
                              ) : checkpoint.expectedValue ? (
                                <span>{checkpoint.expectedValue} {checkpoint.unit}</span>
                              ) : (
                                <span className="text-muted-foreground">No especificado</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {checkpoint.testType === 'visual' && (
                        <div>
                          <Label className="text-xs">Observación Visual *</Label>
                          <Textarea
                            value={result.measuredValue || ''}
                            onChange={(e) => handleResultChange(index, 'measuredValue', e.target.value)}
                            placeholder="Describe lo observado..."
                            rows={2}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {checkpoint.testType === 'text' && (
                        <div>
                          <Label className="text-xs">Resultado *</Label>
                          <Input
                            value={result.measuredValue || ''}
                            onChange={(e) => handleResultChange(index, 'measuredValue', e.target.value)}
                            placeholder={checkpoint.expectedValue || 'Ingresa el resultado...'}
                            className="mt-1"
                          />
                        </div>
                      )}

                      {checkpoint.testType === 'binary' && (
                        <div>
                          <Label className="text-xs">Resultado *</Label>
                          <div className="flex gap-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`pass-${index}`}
                                checked={result.passed === true}
                                onCheckedChange={() => {
                                  handleResultChange(index, 'passed', true);
                                  handleResultChange(index, 'measuredValue', 'Sí');
                                }}
                              />
                              <label htmlFor={`pass-${index}`} className="text-sm font-medium">
                                Sí / Cumple
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`fail-${index}`}
                                checked={result.passed === false}
                                onCheckedChange={() => {
                                  handleResultChange(index, 'passed', false);
                                  handleResultChange(index, 'measuredValue', 'No');
                                }}
                              />
                              <label htmlFor={`fail-${index}`} className="text-sm font-medium">
                                No / No Cumple
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      {checkpoint.testType !== 'binary' && checkpoint.testType !== 'measurement' && (
                        <div>
                          <Label className="text-xs">¿Pasó la inspección? *</Label>
                          <div className="flex gap-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`manual-pass-${index}`}
                                checked={result.passed === true}
                                onCheckedChange={() => handleResultChange(index, 'passed', true)}
                              />
                              <label htmlFor={`manual-pass-${index}`} className="text-sm font-medium">
                                Aprobado
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`manual-fail-${index}`}
                                checked={result.passed === false}
                                onCheckedChange={() => handleResultChange(index, 'passed', false)}
                              />
                              <label htmlFor={`manual-fail-${index}`} className="text-sm font-medium">
                                Rechazado
                              </label>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label className="text-xs">Notas Adicionales</Label>
                        <Textarea
                          value={result.notes || ''}
                          onChange={(e) => handleResultChange(index, 'notes', e.target.value)}
                          placeholder="Observaciones, comentarios..."
                          rows={2}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
