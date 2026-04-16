import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, Calculator, FileText, Info } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

// Conceptos ISLR más comunes según la ley venezolana
const ISLR_CONCEPTS = [
  { code: 'S-01', description: 'Honorarios profesionales no mercantiles', percentage: 3, sustraendo: 0 },
  { code: 'S-02', description: 'Servicios de publicidad y propaganda', percentage: 3, sustraendo: 0 },
  { code: 'S-03', description: 'Alquileres de bienes inmuebles', percentage: 3, sustraendo: 0 },
  { code: 'S-04', description: 'Servicios profesionales independientes', percentage: 3, sustraendo: 0 },
  { code: 'S-05', description: 'Consultoría técnica, financiera o administrativa', percentage: 5, sustraendo: 0 },
  { code: 'S-06', description: 'Servicios de ingeniería, arquitectura y similares', percentage: 5, sustraendo: 0 },
  { code: 'S-07', description: 'Comisiones por ventas', percentage: 3, sustraendo: 0 },
  { code: 'S-08', description: 'Arrendamiento de equipos', percentage: 3, sustraendo: 0 },
  { code: 'P-01', description: 'Compra de productos agrícolas', percentage: 2, sustraendo: 0 },
  { code: 'P-02', description: 'Compra de productos alimenticios', percentage: 2, sustraendo: 0 },
  { code: 'P-03', description: 'Compra de bienes muebles', percentage: 1, sustraendo: 0 },
  { code: 'P-04', description: 'Compra de materias primas', percentage: 1, sustraendo: 0 },
];

const WithholdingIslrForm = ({ onSuccess, onCancel, invoiceId = null }) => {
  const [invoices, setInvoices] = useState([]);
  const [series, setSeries] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [calculation, setCalculation] = useState(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      affectedDocumentId: invoiceId || '',
      conceptCode: '',
      conceptDescription: '',
      retentionPercentage: 3,
      sustraendo: 0,
      seriesId: '',
      operationDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchedInvoiceId = watch('affectedDocumentId');
  const watchedConceptCode = watch('conceptCode');
  const watchedPercentage = watch('retentionPercentage');
  const watchedSustraendo = watch('sustraendo');

  useEffect(() => {
    loadInvoices();
    loadSeries();
  }, []);

  useEffect(() => {
    if (watchedInvoiceId) {
      loadInvoiceDetails(watchedInvoiceId);
    }
  }, [watchedInvoiceId]);

  useEffect(() => {
    if (watchedConceptCode) {
      const concept = ISLR_CONCEPTS.find(c => c.code === watchedConceptCode);
      if (concept) {
        setSelectedConcept(concept);
        setValue('conceptDescription', concept.description);
        setValue('retentionPercentage', concept.percentage);
        setValue('sustraendo', concept.sustraendo);
      }
    }
  }, [watchedConceptCode]);

  useEffect(() => {
    if (selectedInvoice && watchedPercentage) {
      calculateRetention();
    }
  }, [selectedInvoice, watchedPercentage, watchedSustraendo]);

  const loadInvoices = async () => {
    try {
      const response = await api.get('/billing?status=issued&limit=100');
      setInvoices(response || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
      toast.error('Error al cargar facturas');
    }
  };

  const loadSeries = async () => {
    try {
      const response = await api.get('/document-sequences?type=retention-islr');
      setSeries(response || []);

      // Auto-seleccionar la primera serie si existe
      if (response && response.length > 0) {
        setValue('seriesId', response[0]._id);
      }
    } catch (error) {
      console.error('Error loading series:', error);
      toast.error('Error al cargar series');
    }
  };

  const loadInvoiceDetails = async (invoiceId) => {
    try {
      const response = await api.get(`/billing/${invoiceId}`);
      setSelectedInvoice(response);
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Error al cargar detalles de factura');
    }
  };

  const calculateRetention = () => {
    if (!selectedInvoice) return;

    const baseAmount = selectedInvoice.totals?.subtotal || 0;
    const percentage = parseFloat(watchedPercentage) || 3;
    const sustraendo = parseFloat(watchedSustraendo) || 0;

    const retentionAmount = Math.max(0, (baseAmount * percentage / 100) - sustraendo);

    setCalculation({
      baseAmount,
      percentage,
      sustraendo,
      retentionAmount,
    });
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const payload = {
        affectedDocumentId: data.affectedDocumentId,
        retentionPercentage: parseFloat(data.retentionPercentage),
        conceptCode: data.conceptCode,
        conceptDescription: data.conceptDescription,
        sustraendo: parseFloat(data.sustraendo) || 0,
        seriesId: data.seriesId,
        operationDate: data.operationDate,
        notes: data.notes || undefined,
      };

      const response = await api.post('/withholding/islr', payload);

      toast.success('Retención ISLR creada exitosamente');

      if (onSuccess) {
        onSuccess(response);
      }
    } catch (error) {
      console.error('Error creating retention:', error);
      toast.error(error.message || 'Error al crear retención');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Selección de Factura */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documento Afectado</CardTitle>
          <CardDescription>
            Selecciona la factura sobre la cual aplicar la retención
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="affectedDocumentId">Factura *</Label>
            <Select
              value={watchedInvoiceId}
              onValueChange={(value) => setValue('affectedDocumentId', value)}
            >
              <SelectTrigger className={errors.affectedDocumentId ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona una factura" />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((invoice) => (
                  <SelectItem key={invoice._id} value={invoice._id}>
                    {invoice.documentNumber} - {invoice.customer?.name} - {formatCurrency(invoice.totals?.total)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.affectedDocumentId && (
              <p className="text-sm text-destructive mt-1">
                {errors.affectedDocumentId.message}
              </p>
            )}
          </div>

          {selectedInvoice && (
            <div className="bg-muted p-4 rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div className="flex-1 space-y-1">
                  <p className="font-medium">{selectedInvoice.documentNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    Cliente: {selectedInvoice.customer?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    RIF: {selectedInvoice.customer?.taxId}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Subtotal:</span>{' '}
                      <span className="font-medium">
                        {formatCurrency(selectedInvoice.totals?.subtotal)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total:</span>{' '}
                      <span className="font-medium">
                        {formatCurrency(selectedInvoice.totals?.total)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Retención ISLR */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Concepto ISLR</CardTitle>
          <CardDescription>
            Selecciona el concepto según la naturaleza del ingreso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="conceptCode">Concepto *</Label>
            <Select
              value={watchedConceptCode}
              onValueChange={(value) => setValue('conceptCode', value)}
            >
              <SelectTrigger className={errors.conceptCode ? 'border-red-500' : ''}>
                <SelectValue placeholder="Selecciona un concepto" />
              </SelectTrigger>
              <SelectContent>
                {ISLR_CONCEPTS.map((concept) => (
                  <SelectItem key={concept.code} value={concept.code}>
                    {concept.code} - {concept.description} ({concept.percentage}%)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.conceptCode && (
              <p className="text-sm text-destructive mt-1">
                {errors.conceptCode.message}
              </p>
            )}
          </div>

          {selectedConcept && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>{selectedConcept.code}:</strong> {selectedConcept.description}
                <br />
                Tasa: {selectedConcept.percentage}%
                {selectedConcept.sustraendo > 0 && ` | Sustraendo: ${formatCurrency(selectedConcept.sustraendo)}`}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="retentionPercentage">Porcentaje *</Label>
              <Input
                type="number"
                id="retentionPercentage"
                step="0.01"
                min="0"
                max="100"
                {...register('retentionPercentage', {
                  required: 'El porcentaje es requerido',
                  min: { value: 0, message: 'Mínimo 0%' },
                  max: { value: 100, message: 'Máximo 100%' }
                })}
                className={errors.retentionPercentage ? 'border-red-500' : ''}
              />
              {errors.retentionPercentage && (
                <p className="text-sm text-destructive mt-1">
                  {errors.retentionPercentage.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="sustraendo">Sustraendo</Label>
              <Input
                type="number"
                id="sustraendo"
                step="0.01"
                min="0"
                {...register('sustraendo')}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Monto a descontar (opcional)
              </p>
            </div>

            <div>
              <Label htmlFor="seriesId">Serie *</Label>
              <Select
                value={watch('seriesId')}
                onValueChange={(value) => setValue('seriesId', value)}
              >
                <SelectTrigger className={errors.seriesId ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Selecciona serie" />
                </SelectTrigger>
                <SelectContent>
                  {series.map((s) => (
                    <SelectItem key={s._id} value={s._id}>
                      {s.prefix} (Próximo: {s.nextNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="operationDate">Fecha de Operación *</Label>
            <Input
              type="date"
              id="operationDate"
              {...register('operationDate', { required: 'La fecha es requerida' })}
              className={errors.operationDate ? 'border-red-500' : ''}
            />
            {errors.operationDate && (
              <p className="text-sm text-destructive mt-1">
                {errors.operationDate.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="notes">Notas (Opcional)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Cálculo Preview */}
      {calculation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Vista Previa del Cálculo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Imponible:</span>
                <span className="font-medium">{formatCurrency(calculation.baseAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Retención ({calculation.percentage}%):
                </span>
                <span className="font-medium">
                  {formatCurrency(calculation.baseAmount * calculation.percentage / 100)}
                </span>
              </div>
              {calculation.sustraendo > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sustraendo:</span>
                  <span className="font-medium">- {formatCurrency(calculation.sustraendo)}</span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-lg font-semibold">Monto a Retener:</span>
                <span className="text-2xl font-bold text-success">
                  {formatCurrency(calculation.retentionAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advertencia sobre series */}
      {series.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay series de retenciones ISLR configuradas. Por favor, crea una serie
            antes de continuar.
          </AlertDescription>
        </Alert>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !selectedInvoice || series.length === 0}>
          {loading ? 'Creando...' : 'Crear Retención ISLR'}
        </Button>
      </div>
    </form>
  );
};

export default WithholdingIslrForm;
