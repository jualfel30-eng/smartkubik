import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  AlertTriangle,
  Calculator,
  Send,
  CreditCard,
  Download,
  Loader2,
  ChevronLeft,
  FileText,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  calculateIvaDeclaration,
  fileIvaDeclaration,
  recordIvaDeclarationPayment,
  downloadIvaDeclarationXML,
  validatePurchaseBook,
  validateSalesBook,
  fetchIvaDeclarations,
  deleteIvaDeclaration,
} from '../../lib/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from "@/lib/utils";

const steps = ['Validar Libros', 'Calcular Declaración', 'Revisar', 'Presentar y Pagar'];

const IvaDeclarationWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Datos del período
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  // Validación
  const [purchasesValidation, setPurchasesValidation] = useState(null);
  const [salesValidation, setSalesValidation] = useState(null);

  // Declaración
  const [declaration, setDeclaration] = useState(null);
  const [previousCredit, setPreviousCredit] = useState(0);

  // Pago
  const [paymentData, setPaymentData] = useState({
    paymentDate: format(new Date(), 'yyyy-MM-dd'),
    paymentReference: '',
    amountPaid: 0,
  });

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Step 1: Validar libros
  const handleValidateBooks = async () => {
    try {
      setLoading(true);

      const [purchasesResult, salesResult] = await Promise.all([
        validatePurchaseBook(parseInt(selectedMonth), parseInt(selectedYear)),
        validateSalesBook(parseInt(selectedMonth), parseInt(selectedYear)),
      ]);

      setPurchasesValidation(purchasesResult);
      setSalesValidation(salesResult);

      const totalErrors = purchasesResult.errors.length + salesResult.errors.length;

      if (totalErrors === 0) {
        toast.success('Libros validados correctamente');
        setActiveStep(1);
      } else {
        // PERMITIR AVANZAR PARA CORREGIR ERRORES VIA SYNC
        toast.warning(`Se encontraron ${totalErrors} errores. Procediendo al cálculo para intentar corrección automática.`);
        setActiveStep(1);
      }
    } catch (error) {
      toast.error('Error al validar libros');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Calcular declaración
  const handleCalculate = async () => {
    try {
      setLoading(true);

      const calculatedDeclaration = await calculateIvaDeclaration({
        month: parseInt(selectedMonth),
        year: parseInt(selectedYear),
        previousCreditBalance: previousCredit,
        autoCalculate: true,
      });

      setDeclaration(calculatedDeclaration);
      toast.success('Declaración calculada exitosamente');
      setActiveStep(2);
    } catch (error) {
      toast.error(error.message || 'Error al calcular declaración');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Presentar a SENIAT
  const handleFile = async () => {
    if (!window.confirm('¿Presentar esta declaración a SENIAT?')) return;

    try {
      setLoading(true);

      const filed = await fileIvaDeclaration(declaration._id, {
        filingDate: new Date().toISOString(),
        generateXML: true,
        validateBeforeFiling: true,
      });

      setDeclaration(filed);
      toast.success('Declaración presentada a SENIAT');
      setActiveStep(3);
    } catch (error) {
      toast.error(error.message || 'Error al presentar declaración');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Step 4: Registrar pago
  const handleRecordPayment = async () => {
    if (!paymentData.paymentReference.trim()) {
      toast.error('Debe ingresar la referencia de pago');
      return;
    }

    try {
      setLoading(true);

      const paid = await recordIvaDeclarationPayment(declaration._id, paymentData);

      setDeclaration(paid);
      toast.success('Pago registrado exitosamente');
    } catch (error) {
      toast.error(error.message || 'Error al registrar pago');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadXML = async () => {
    try {
      await downloadIvaDeclarationXML(declaration._id);
      toast.success('XML descargado');
    } catch (error) {
      toast.error('Error al descargar XML');
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setDeclaration(null);
    setPurchasesValidation(null);
    setSalesValidation(null);
    setPreviousCredit(0);
    setPaymentData({
      paymentDate: format(new Date(), 'yyyy-MM-dd'),
      paymentReference: '',
      amountPaid: 0,
    });
  };

  const StepIndicator = () => (
    <div className="w-full mb-10 px-2">
      <div className="flex items-center w-full">
        {steps.map((label, index) => {
          const isCompleted = activeStep > index;
          const isActive = activeStep === index;
          const isPending = activeStep < index;
          const isLast = index === steps.length - 1;

          return (
            <React.Fragment key={index}>
              {/* Step Circle & Label */}
              <div className="relative flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 text-sm font-bold transition-all duration-300 z-10 bg-background",
                    isActive && "border-primary bg-primary text-primary-foreground shadow-[0_0_0_4px_rgba(var(--primary),0.2)] scale-110",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    isPending && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                </div>

                {/* Text Label - Absolute positioned to not affect flex layout of lines */}
                <div className="absolute top-12 w-32 flex justify-center">
                  <span className={cn(
                    "text-xs font-medium text-center transition-colors duration-300",
                    isActive && "text-primary font-bold",
                    isCompleted && "text-primary",
                    isPending && "text-muted-foreground"
                  )}>
                    {label}
                  </span>
                </div>
              </div>

              {/* Connecting Line (Progress Bar) */}
              {!isLast && (
                <div className="flex-1 h-[2px] mx-2 relative">
                  {/* Base Line */}
                  <div className={cn(
                    "absolute inset-0 transition-colors duration-300",
                    // If current step is completed (meaning we moved past it), the base line is colored?
                    // Actually, usually the line fills up as we go. 
                    // Let's keep base gray, and fill overlay.
                    "bg-border"
                  )} />

                  {/* Active Fill Line */}
                  <div
                    className={cn(
                      "absolute inset-0 bg-primary transition-all duration-500 origin-left",
                      activeStep > index ? "w-full" : "w-0"
                    )}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );

  // Renderizar cada step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <div className="space-y-8">
            <div className="space-y-6">
              <div className="grid gap-2">
                <h3 className="text-lg font-medium">Paso 1: Validar Libros Fiscales</h3>
                <p className="text-sm text-muted-foreground">
                  Seleccione el período a declarar. El sistema verificará la integridad de los libros y sincronizará automáticamente las facturas faltantes.
                </p>
              </div>

              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="month">Mes</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger id="month">
                          <SelectValue placeholder="Seleccionar mes" />
                        </SelectTrigger>
                        <SelectContent>
                          {monthNames.map((month, index) => (
                            <SelectItem key={index + 1} value={(index + 1).toString()}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year">Año</Label>
                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger id="year">
                          <SelectValue placeholder="Seleccionar año" />
                        </SelectTrigger>
                        <SelectContent>
                          {[2023, 2024, 2025, 2026].map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {purchasesValidation && salesValidation && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Alert variant={purchasesValidation.valid ? "default" : "destructive"}>
                    {purchasesValidation.valid ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>Libro de Compras</AlertTitle>
                    <AlertDescription>
                      {purchasesValidation.valid ? (
                        "Validado correctamente"
                      ) : (
                        <div className="mt-2">
                          <p className="font-medium">{purchasesValidation.errors.length} errores encontrados:</p>
                          <ul className="list-disc list-inside text-xs mt-1">
                            {purchasesValidation.errors.slice(0, 3).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>

                  <Alert variant={salesValidation.valid ? "default" : "destructive"}>
                    {salesValidation.valid ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <AlertTitle>Libro de Ventas</AlertTitle>
                    <AlertDescription>
                      {salesValidation.valid ? (
                        "Validado correctamente"
                      ) : (
                        <div className="mt-2">
                          <p className="font-medium">{salesValidation.errors.length} errores encontrados:</p>
                          <ul className="list-disc list-inside text-xs mt-1">
                            {salesValidation.errors.slice(0, 3).map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <Button onClick={handleValidateBooks} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {!loading && <CheckCircle className="mr-2 h-4 w-4" />}
                  Validar y Sincronizar
                </Button>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Historial de Declaraciones */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Historial de Declaraciones</h3>
              <DeclarationsHistory
                refreshTrigger={loading}
                onSelect={(decl) => {
                  setSelectedMonth(decl.month.toString());
                  setSelectedYear(decl.year.toString());
                  // Auto-load logic could go here
                }}
              />
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="grid gap-2">
              <h3 className="text-lg font-medium">Paso 2: Calcular Declaración</h3>
              <p className="text-sm text-muted-foreground">
                El sistema calculará automáticamente la declaración desde los libros fiscales validados.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Configuración Inicial</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="previousCredit">Excedente del período anterior (Crédito Fiscal)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">Bs.</span>
                    <Input
                      id="previousCredit"
                      type="number"
                      className="pl-10"
                      value={previousCredit}
                      onChange={(e) => setPreviousCredit(parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Si tiene crédito fiscal del mes anterior, ingréselo aquí</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <Button onClick={handleCalculate} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!loading && <Calculator className="mr-2 h-4 w-4" />}
                Calcular Declaración
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Paso 3: Revisar Declaración</h3>

            {declaration && (
              <div className="space-y-6">
                {/* Resumen General */}
                <Card className="bg-muted/50 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-lg font-bold text-primary">Declaración {declaration.declarationNumber}</h4>
                        <p className="text-sm text-muted-foreground">
                          Período: {monthNames[declaration.month - 1]} {declaration.year}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-base px-3 py-1">
                        Forma 30
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Débito Fiscal */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-blue-600">DÉBITO FISCAL (Ventas)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="py-2">Base Imponible</TableCell>
                            <TableCell className="text-right py-2 font-mono">Bs. {declaration.salesBaseAmount.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="py-2 font-medium">IVA Ventas</TableCell>
                            <TableCell className="text-right py-2 font-mono font-bold">Bs. {declaration.salesIvaAmount.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="py-2 text-muted-foreground">Operaciones</TableCell>
                            <TableCell className="text-right py-2">{declaration.totalSalesTransactions}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Crédito Fiscal */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-green-600">CRÉDITO FISCAL (Compras)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableBody>
                          <TableRow>
                            <TableCell className="py-2">Base Imponible</TableCell>
                            <TableCell className="text-right py-2 font-mono">Bs. {declaration.purchasesBaseAmount.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="py-2 font-medium">IVA Compras</TableCell>
                            <TableCell className="text-right py-2 font-mono font-bold">Bs. {declaration.purchasesIvaAmount.toFixed(2)}</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="py-2 text-muted-foreground">Operaciones</TableCell>
                            <TableCell className="text-right py-2">{declaration.totalPurchasesTransactions}</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>

                {/* Retenciones y Excedentes */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Retenciones y Créditos Anteriores</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">IVA Retenido por Clientes</p>
                        <p className="text-xl font-bold font-mono">Bs. {declaration.ivaWithheldOnSales.toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Excedente Período Anterior</p>
                        <p className="text-xl font-bold font-mono">Bs. {declaration.previousCreditBalance.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cálculo Final */}
                <Card className={cn("border-2", declaration.ivaToPay > 0
                  ? "border-orange-200 bg-orange-50/50 dark:bg-orange-900/10 dark:border-orange-900/50"
                  : "border-green-200 bg-green-50/50 dark:bg-green-900/10 dark:border-green-900/50"
                )}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calculator className="h-5 w-5" />
                      CÁLCULO FINAL
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span>Total Débito Fiscal:</span>
                      <span className="font-mono">Bs. {declaration.totalDebitFiscal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Total Crédito Aplicable:</span>
                      <span className="font-mono">Bs. {declaration.totalCreditToApply.toFixed(2)}</span>
                    </div>

                    <Separator />

                    {declaration.ivaToPay > 0 ? (
                      <div className="flex justify-between items-center text-orange-700 dark:text-orange-400">
                        <span className="text-lg font-bold">IVA A PAGAR AL TESORO:</span>
                        <span className="text-2xl font-bold font-mono">Bs. {declaration.ivaToPay.toFixed(2)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-green-700 dark:text-green-400">
                        <span className="text-lg font-bold">EXCEDENTE (CRÉDITO FISCAL):</span>
                        <span className="text-2xl font-bold font-mono">Bs. {declaration.creditBalance.toFixed(2)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Desglose por Alícuota */}
                {declaration.rateBreakdown && declaration.rateBreakdown.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Desglose por Alícuota</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tasa</TableHead>
                            <TableHead className="text-right">Ventas Base</TableHead>
                            <TableHead className="text-right">Ventas IVA</TableHead>
                            <TableHead className="text-right">Compras Base</TableHead>
                            <TableHead className="text-right">Compras IVA</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {declaration.rateBreakdown.map((rate, index) => (
                            <TableRow key={index}>
                              <TableCell>{rate.rate}%</TableCell>
                              <TableCell className="text-right font-mono">Bs. {rate.salesBase.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">Bs. {rate.salesIva.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">Bs. {rate.purchasesBase.toFixed(2)}</TableCell>
                              <TableCell className="text-right font-mono">Bs. {rate.purchasesIva.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={handleBack} disabled={loading}>
                <ChevronLeft className="mr-2 h-4 w-4" />
                Atrás
              </Button>
              <Button onClick={handleFile} disabled={loading || !declaration}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!loading && <Send className="mr-2 h-4 w-4" />}
                Presentar a SENIAT
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-medium">Paso 4: Presentar y Pagar</h3>

            {declaration && (
              <div className="space-y-6">
                <Alert className="border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100">
                  <CheckCircle className="h-4 w-4" />
                  <AlertTitle>Declaración presentada exitosamente</AlertTitle>
                  <AlertDescription>
                    <div className="mt-2 space-y-1">
                      <p>Número de Declaración: <span className="font-mono font-bold">{declaration.declarationNumber}</span></p>
                      {declaration.filingDate && (
                        <p>Fecha: {format(new Date(declaration.filingDate), 'dd/MM/yyyy HH:mm')}</p>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>

                {declaration.xmlContent && (
                  <Button variant="outline" onClick={handleDownloadXML} className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Descargar XML SENIAT
                  </Button>
                )}

                {declaration.ivaToPay > 0 && declaration.status !== 'paid' && (
                  <Card className="border-orange-200">
                    <CardHeader>
                      <CardTitle className="text-orange-700 flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Registrar Pago
                      </CardTitle>
                      <CardDescription>
                        Ingrese los datos de la transferencia o pago realizado al tesoro nacional.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentDate">Fecha de Pago</Label>
                          <Input
                            id="paymentDate"
                            type="date"
                            value={paymentData.paymentDate}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, paymentDate: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="paymentRef">Referencia</Label>
                          <Input
                            id="paymentRef"
                            value={paymentData.paymentReference}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, paymentReference: e.target.value })
                            }
                            placeholder="Ej: 12345678"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="amountPaid">Monto Pagado</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-2.5 text-muted-foreground">Bs.</span>
                            <Input
                              id="amountPaid"
                              type="number"
                              className="pl-10"
                              value={paymentData.amountPaid || declaration.totalToPay}
                              onChange={(e) =>
                                setPaymentData({
                                  ...paymentData,
                                  amountPaid: parseFloat(e.target.value),
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        onClick={handleRecordPayment}
                        disabled={loading}
                        className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Registrar Pago
                      </Button>
                    </CardFooter>
                  </Card>
                )}

                {declaration.status === 'paid' && (
                  <Alert className="border-blue-500 bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-100">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Pago registrado</AlertTitle>
                    <AlertDescription>
                      <div className="mt-2 space-y-1">
                        <p>Referencia: <span className="font-mono">{declaration.paymentReference}</span></p>
                        <p>Fecha: {format(new Date(declaration.paymentDate), 'dd/MM/yyyy')}</p>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4">
                  <Button variant="ghost" onClick={handleReset} className="w-full">
                    Iniciar Nueva Declaración
                  </Button>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Declaración de IVA</h2>
          <p className="text-muted-foreground">Forma 30 - Servicio Nacional Integrado de Administración Aduanera y Tributaria</p>
        </div>
        <FileText className="h-10 w-10 text-muted-foreground/20" />
      </div>

      <StepIndicator />

      <div className="min-h-[400px]">
        {renderStepContent()}
      </div>
    </div>
  );
};


const DeclarationsHistory = ({ refreshTrigger, onSelect }) => {
  const [declarations, setDeclarations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await fetchIvaDeclarations(); // Corrected usage
      setDeclarations(data.data || []);
    } catch (error) {
      console.error("Error fetching history", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [refreshTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que desea eliminar esta declaración? Esto permitirá recalcular el período.")) return;
    try {
      await deleteIvaDeclaration(id);
      toast.success("Declaración eliminada");
      fetchHistory();
    } catch (error) {
      toast.error("Error al eliminar");
    }
  };

  if (loading) return <div className="text-sm text-muted-foreground">Cargando historial...</div>;
  if (declarations.length === 0) return <div className="text-sm text-muted-foreground italic">No hay declaraciones previas.</div>;

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Período</TableHead>
            <TableHead>Número</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {declarations.map((decl) => (
            <TableRow key={decl._id}>
              <TableCell>{decl.month}/{decl.year}</TableCell>
              <TableCell className="font-mono">{decl.declarationNumber}</TableCell>
              <TableCell>
                <Badge variant={decl.status === 'paid' ? 'success' : decl.status === 'filed' ? 'warning' : 'outline'}>
                  {decl.status === 'calculated' ? 'Borrador' : decl.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono">
                {decl.ivaToPay > 0 ? `Bs. ${decl.ivaToPay.toFixed(2)}` : 'Crédito'}
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(decl._id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};


export default IvaDeclarationWizard;
