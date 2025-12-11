import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  Calculate,
  Send,
  Payment,
  GetApp,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  calculateIvaDeclaration,
  fetchIvaDeclarationByPeriod,
  updateIvaDeclaration,
  fileIvaDeclaration,
  recordIvaDeclarationPayment,
  downloadIvaDeclarationXML,
  validatePurchaseBook,
  validateSalesBook,
} from '../../lib/api';
import { format } from 'date-fns';

const steps = ['Validar Libros', 'Calcular Declaración', 'Revisar', 'Presentar y Pagar'];

const IvaDeclarationWizard = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Datos del período
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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
        validatePurchaseBook(selectedMonth, selectedYear),
        validateSalesBook(selectedMonth, selectedYear),
      ]);

      setPurchasesValidation(purchasesResult);
      setSalesValidation(salesResult);

      const totalErrors = purchasesResult.errors.length + salesResult.errors.length;

      if (totalErrors === 0) {
        toast.success('✅ Libros validados correctamente');
        setActiveStep(1);
      } else {
        toast.warning(`⚠️ Se encontraron ${totalErrors} errores. Revise antes de continuar.`);
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
        month: selectedMonth,
        year: selectedYear,
        previousCreditBalance: previousCredit,
        autoCalculate: true,
      });

      setDeclaration(calculatedDeclaration);
      toast.success('Declaración calculada exitosamente');
      setActiveStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al calcular declaración');
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
      toast.error(error.response?.data?.message || 'Error al presentar declaración');
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
      toast.error(error.response?.data?.message || 'Error al registrar pago');
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
  };

  // Renderizar cada step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Paso 1: Validar Libros Fiscales
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              Antes de calcular la declaración, validaremos la integridad de los libros de compras y ventas.
            </Typography>

            <Paper elevation={2} sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'white' }}>Mes</InputLabel>
                    <Select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      sx={{ bgcolor: 'white' }}
                    >
                      {monthNames.map((month, index) => (
                        <MenuItem key={index + 1} value={index + 1}>
                          {month}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: 'white' }}>Año</InputLabel>
                    <Select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      sx={{ bgcolor: 'white' }}
                    >
                      {[2023, 2024, 2025, 2026].map((year) => (
                        <MenuItem key={year} value={year}>
                          {year}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Paper>

            {purchasesValidation && salesValidation && (
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Alert
                    severity={purchasesValidation.valid ? 'success' : 'warning'}
                    icon={purchasesValidation.valid ? <CheckCircle /> : <Warning />}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      Libro de Compras
                    </Typography>
                    {purchasesValidation.valid ? (
                      <Typography variant="body2">Validado correctamente</Typography>
                    ) : (
                      <>
                        <Typography variant="body2">
                          {purchasesValidation.errors.length} errores encontrados
                        </Typography>
                        <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
                          {purchasesValidation.errors.slice(0, 3).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Alert>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Alert
                    severity={salesValidation.valid ? 'success' : 'warning'}
                    icon={salesValidation.valid ? <CheckCircle /> : <Warning />}
                  >
                    <Typography variant="subtitle2" fontWeight="bold">
                      Libro de Ventas
                    </Typography>
                    {salesValidation.valid ? (
                      <Typography variant="body2">Validado correctamente</Typography>
                    ) : (
                      <>
                        <Typography variant="body2">
                          {salesValidation.errors.length} errores encontrados
                        </Typography>
                        <ul style={{ marginTop: 8, fontSize: '0.875rem' }}>
                          {salesValidation.errors.slice(0, 3).map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Alert>
                </Grid>
              </Grid>
            )}

            <Box sx={{ mt: 3, textAlign: 'right' }}>
              <Button
                variant="contained"
                onClick={handleValidateBooks}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <CheckCircle />}
              >
                Validar Libros
              </Button>
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Paso 2: Calcular Declaración
            </Typography>
            <Typography variant="body2" color="textSecondary" paragraph>
              El sistema calculará automáticamente la declaración desde los libros fiscales validados.
            </Typography>

            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Configuración
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Excedente del período anterior"
                value={previousCredit}
                onChange={(e) => setPreviousCredit(parseFloat(e.target.value) || 0)}
                helperText="Si tiene crédito fiscal del mes anterior, ingréselo aquí"
                sx={{ mt: 2 }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>Bs.</Typography>,
                }}
              />
            </Paper>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>Atrás</Button>
              <Button
                variant="contained"
                onClick={handleCalculate}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <Calculate />}
              >
                Calcular Declaración
              </Button>
            </Box>
          </Box>
        );

      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Paso 3: Revisar Declaración
            </Typography>

            {declaration && (
              <Grid container spacing={2}>
                {/* Resumen General */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 2, bgcolor: 'info.light', color: 'white' }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Declaración {declaration.declarationNumber}
                    </Typography>
                    <Typography variant="body2">
                      Período: {monthNames[declaration.month - 1]} {declaration.year}
                    </Typography>
                  </Paper>
                </Grid>

                {/* Débito Fiscal */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="primary" gutterBottom>
                      DÉBITO FISCAL (Ventas)
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Base Imponible:</TableCell>
                          <TableCell align="right">
                            Bs. {declaration.salesBaseAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>IVA Ventas:</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              Bs. {declaration.salesIvaAmount.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Operaciones:</TableCell>
                          <TableCell align="right">{declaration.totalSalesTransactions}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>

                {/* Crédito Fiscal */}
                <Grid item xs={12} md={6}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle2" color="success.main" gutterBottom>
                      CRÉDITO FISCAL (Compras)
                    </Typography>
                    <Table size="small">
                      <TableBody>
                        <TableRow>
                          <TableCell>Base Imponible:</TableCell>
                          <TableCell align="right">
                            Bs. {declaration.purchasesBaseAmount.toFixed(2)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>IVA Compras:</TableCell>
                          <TableCell align="right">
                            <Typography fontWeight="bold">
                              Bs. {declaration.purchasesIvaAmount.toFixed(2)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Operaciones:</TableCell>
                          <TableCell align="right">{declaration.totalPurchasesTransactions}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </Paper>
                </Grid>

                {/* Retenciones */}
                <Grid item xs={12}>
                  <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Retenciones
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">IVA Retenido por Clientes:</Typography>
                        <Typography variant="h6">
                          Bs. {declaration.ivaWithheldOnSales.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Excedente Anterior:</Typography>
                        <Typography variant="h6">
                          Bs. {declaration.previousCreditBalance.toFixed(2)}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Cálculo Final */}
                <Grid item xs={12}>
                  <Paper elevation={3} sx={{ p: 3, bgcolor: 'warning.light' }}>
                    <Typography variant="h6" gutterBottom>
                      CÁLCULO FINAL
                    </Typography>
                    <Divider sx={{ my: 2 }} />
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2">Total Débito Fiscal:</Typography>
                        <Typography variant="h6">
                          Bs. {declaration.totalDebitFiscal.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2">Total Crédito Aplicable:</Typography>
                        <Typography variant="h6">
                          Bs. {declaration.totalCreditToApply.toFixed(2)}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Divider />
                      </Grid>
                      {declaration.ivaToPay > 0 ? (
                        <Grid item xs={12}>
                          <Alert severity="warning" icon={<Payment />}>
                            <Typography variant="h5" fontWeight="bold">
                              IVA A PAGAR: Bs. {declaration.ivaToPay.toFixed(2)}
                            </Typography>
                          </Alert>
                        </Grid>
                      ) : (
                        <Grid item xs={12}>
                          <Alert severity="success" icon={<CheckCircle />}>
                            <Typography variant="h5" fontWeight="bold">
                              EXCEDENTE A FAVOR: Bs. {declaration.creditBalance.toFixed(2)}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>
                  </Paper>
                </Grid>

                {/* Desglose por Alícuota */}
                {declaration.rateBreakdown && declaration.rateBreakdown.length > 0 && (
                  <Grid item xs={12}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Desglose por Alícuota
                      </Typography>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Tasa</TableCell>
                            <TableCell align="right">Ventas Base</TableCell>
                            <TableCell align="right">Ventas IVA</TableCell>
                            <TableCell align="right">Compras Base</TableCell>
                            <TableCell align="right">Compras IVA</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {declaration.rateBreakdown.map((rate, index) => (
                            <TableRow key={index}>
                              <TableCell>{rate.rate}%</TableCell>
                              <TableCell align="right">Bs. {rate.salesBase.toFixed(2)}</TableCell>
                              <TableCell align="right">Bs. {rate.salesIva.toFixed(2)}</TableCell>
                              <TableCell align="right">Bs. {rate.purchasesBase.toFixed(2)}</TableCell>
                              <TableCell align="right">Bs. {rate.purchasesIva.toFixed(2)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </Paper>
                  </Grid>
                )}
              </Grid>
            )}

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button onClick={handleBack}>Atrás</Button>
              <Button
                variant="contained"
                onClick={handleFile}
                disabled={loading || !declaration}
                startIcon={loading ? <CircularProgress size={20} /> : <Send />}
              >
                Presentar a SENIAT
              </Button>
            </Box>
          </Box>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Paso 4: Presentar y Pagar
            </Typography>

            {declaration && (
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Alert severity="success" icon={<CheckCircle />}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      Declaración presentada exitosamente
                    </Typography>
                    <Typography variant="body2">
                      Número: {declaration.declarationNumber}
                    </Typography>
                    {declaration.filingDate && (
                      <Typography variant="body2">
                        Fecha de presentación: {format(new Date(declaration.filingDate), 'dd/MM/yyyy')}
                      </Typography>
                    )}
                  </Alert>
                </Grid>

                {declaration.xmlContent && (
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      startIcon={<GetApp />}
                      onClick={handleDownloadXML}
                    >
                      Descargar XML SENIAT
                    </Button>
                  </Grid>
                )}

                {declaration.ivaToPay > 0 && declaration.status !== 'paid' && (
                  <Grid item xs={12}>
                    <Paper elevation={2} sx={{ p: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Registrar Pago
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            type="date"
                            label="Fecha de Pago"
                            value={paymentData.paymentDate}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, paymentDate: e.target.value })
                            }
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            label="Referencia de Pago"
                            value={paymentData.paymentReference}
                            onChange={(e) =>
                              setPaymentData({ ...paymentData, paymentReference: e.target.value })
                            }
                            placeholder="Ej: 123456789"
                          />
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <TextField
                            fullWidth
                            type="number"
                            label="Monto Pagado"
                            value={paymentData.amountPaid || declaration.totalToPay}
                            onChange={(e) =>
                              setPaymentData({
                                ...paymentData,
                                amountPaid: parseFloat(e.target.value),
                              })
                            }
                            InputProps={{
                              startAdornment: <Typography sx={{ mr: 1 }}>Bs.</Typography>,
                            }}
                          />
                        </Grid>
                        <Grid item xs={12}>
                          <Button
                            variant="contained"
                            color="success"
                            onClick={handleRecordPayment}
                            disabled={loading}
                            startIcon={<Payment />}
                          >
                            Registrar Pago
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  </Grid>
                )}

                {declaration.status === 'paid' && (
                  <Grid item xs={12}>
                    <Alert severity="success">
                      <Typography variant="subtitle1" fontWeight="bold">
                        Pago registrado exitosamente
                      </Typography>
                      <Typography variant="body2">
                        Referencia: {declaration.paymentReference}
                      </Typography>
                      <Typography variant="body2">
                        Fecha: {format(new Date(declaration.paymentDate), 'dd/MM/yyyy')}
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Button variant="outlined" onClick={handleReset} fullWidth>
                    Nueva Declaración
                  </Button>
                </Grid>
              </Grid>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" gutterBottom>
          Declaración de IVA (Forma 30)
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Wizard para calcular y presentar la declaración mensual de IVA ante el SENIAT
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {renderStepContent()}
      </CardContent>
    </Card>
  );
};

export default IvaDeclarationWizard;
