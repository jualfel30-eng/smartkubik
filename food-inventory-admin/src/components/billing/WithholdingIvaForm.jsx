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
import { AlertCircle, Calculator, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

const WithholdingIvaForm = ({ onSuccess, onCancel, invoiceId = null }) => {
  const [invoices, setInvoices] = useState([]);
  const [series, setSeries] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
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
      retentionPercentage: 75,
      seriesId: '',
      operationDate: new Date().toISOString().split('T')[0],
      notes: '',
    },
  });

  const watchedInvoiceId = watch('affectedDocumentId');
  const watchedPercentage = watch('retentionPercentage');

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
    if (selectedInvoice && watchedPercentage) {
      calculateRetention();
    }
  }, [selectedInvoice, watchedPercentage]);

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
      const response = await api.get('/document-sequences?type=retention-iva');
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
    const taxRate = selectedInvoice.totals?.taxRate || 16;
    const taxAmount = selectedInvoice.totals?.tax || 0;
    const percentage = parseFloat(watchedPercentage) || 75;

    const retentionAmount = (taxAmount * percentage) / 100;

    setCalculation({
      baseAmount,
      taxRate,
      taxAmount,
      percentage,
      retentionAmount,
    });
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const payload = {
        affectedDocumentId: data.affectedDocumentId,
        retentionPercentage: parseFloat(data.retentionPercentage),
        seriesId: data.seriesId,
        operationDate: data.operationDate,
        notes: data.notes || undefined,
      };

      const response = await api.post('/withholding/iva', payload);

      toast.success('Retención IVA creada exitosamente');

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
                      <span className="text-muted-foreground">
                        IVA ({selectedInvoice.totals?.taxRate}%):
                      </span>{' '}
                      <span className="font-medium">
                        {formatCurrency(selectedInvoice.totals?.tax)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuración de Retención */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configuración de Retención</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="retentionPercentage">Porcentaje de Retención *</Label>
              <Select
                value={String(watchedPercentage)}
                onValueChange={(value) => setValue('retentionPercentage', parseFloat(value))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="75">75%</SelectItem>
                  <SelectItem value="100">100%</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                75% para contribuyentes ordinarios, 100% para no calificados
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
              {errors.seriesId && (
                <p className="text-sm text-destructive mt-1">
                  {errors.seriesId.message}
                </p>
              )}
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
                  IVA ({calculation.taxRate}%):
                </span>
                <span className="font-medium">{formatCurrency(calculation.taxAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Porcentaje de Retención:
                </span>
                <span className="font-medium">{calculation.percentage}%</span>
              </div>
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
            No hay series de retenciones IVA configuradas. Por favor, crea una serie
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
          {loading ? 'Creando...' : 'Crear Retención IVA'}
        </Button>
      </div>
    </form>
  );
};

export default WithholdingIvaForm;
