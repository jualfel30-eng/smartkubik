import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Grid,
  Typography,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Box,
  Paper,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FileDownload,
  CheckCircle,
  Warning,
  Summarize,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  fetchPurchaseBook,
  fetchPurchaseBookByPeriod,
  validatePurchaseBook,
  exportPurchaseBookToTXT,
  getPurchaseBookSummary,
  deletePurchaseBookEntry,
} from '../../lib/api';
import { format } from 'date-fns';

const IvaPurchaseBook = ({ suppliers }) => {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [summary, setSummary] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    supplierId: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    loadEntries();
  }, [selectedMonth, selectedYear, filters]);

  const loadEntries = async () => {
    try {
      setLoading(true);
      const cleanFilters = {
        month: selectedMonth,
        year: selectedYear,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '' && v !== 'all')
        ),
      };
      const response = await fetchPurchaseBook(cleanFilters);
      setEntries(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('Error al cargar libro de compras');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      const result = await validatePurchaseBook(selectedMonth, selectedYear);

      if (result.valid) {
        toast.success('✅ Libro de compras validado correctamente');
        setValidationErrors([]);
      } else {
        toast.warning(`⚠️ Se encontraron ${result.errors.length} errores`);
        setValidationErrors(result.errors);
      }
      setShowValidation(true);
    } catch (error) {
      toast.error('Error al validar libro');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportTXT = async () => {
    try {
      setLoading(true);
      await exportPurchaseBookToTXT(selectedMonth, selectedYear);
      toast.success('Archivo TXT descargado exitosamente');
    } catch (error) {
      toast.error('Error al exportar TXT');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowSummary = async () => {
    try {
      setLoading(true);
      const summaryData = await getPurchaseBookSummary(selectedMonth, selectedYear);
      setSummary(summaryData);
      setOpenSummaryDialog(true);
    } catch (error) {
      toast.error('Error al obtener resumen');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada del libro de compras?')) return;

    try {
      await deletePurchaseBookEntry(id);
      toast.success('Entrada eliminada');
      loadEntries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleFilterChange = (name, value) => {
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const handlePageChange = (event, newPage) => {
    setFilters({ ...filters, page: newPage + 1 });
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'default',
      confirmed: 'success',
      exported: 'primary',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Borrador',
      confirmed: 'Confirmada',
      exported: 'Exportada',
    };
    return labels[status] || status;
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  return (
    <Card>
      <CardContent>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5">Libro de Compras</Typography>
            <Typography variant="caption" color="textSecondary">
              Registro de operaciones de compra con IVA (SENIAT)
            </Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              startIcon={<CheckCircle />}
              onClick={handleValidate}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Validar
            </Button>
            <Button
              variant="outlined"
              startIcon={<Summarize />}
              onClick={handleShowSummary}
              disabled={loading}
              sx={{ mr: 1 }}
            >
              Resumen
            </Button>
            <Button
              variant="contained"
              startIcon={<FileDownload />}
              onClick={handleExportTXT}
              disabled={loading}
            >
              Exportar TXT
            </Button>
          </Grid>
        </Grid>

        {/* Selector de Período */}
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'primary.light', color: 'white' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={3}>
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
            <Grid item xs={12} md={6}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                Período: {monthNames[selectedMonth - 1]} {selectedYear}
              </Typography>
              <Typography variant="body2" sx={{ color: 'white', opacity: 0.9 }}>
                {total} {total === 1 ? 'registro' : 'registros'} encontrados
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Validación */}
        {showValidation && validationErrors.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setShowValidation(false)}>
            <Typography variant="subtitle2" fontWeight="bold">
              Se encontraron {validationErrors.length} errores:
            </Typography>
            <ul style={{ marginTop: 8, marginBottom: 0 }}>
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index}>
                  <Typography variant="body2">{error}</Typography>
                </li>
              ))}
            </ul>
            {validationErrors.length > 5 && (
              <Typography variant="caption">
                ... y {validationErrors.length - 5} errores más
              </Typography>
            )}
          </Alert>
        )}

        {/* Filtros */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="draft">Borradores</MenuItem>
                <MenuItem value="confirmed">Confirmadas</MenuItem>
                <MenuItem value="exported">Exportadas</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Proveedor</InputLabel>
              <Select
                value={filters.supplierId}
                onChange={(e) => handleFilterChange('supplierId', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {suppliers?.map((supplier) => (
                  <MenuItem key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Tabla */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Proveedor</TableCell>
              <TableCell>RIF</TableCell>
              <TableCell>Factura</TableCell>
              <TableCell>Nro. Control</TableCell>
              <TableCell align="right">Base Imp.</TableCell>
              <TableCell align="right">IVA</TableCell>
              <TableCell align="right">Retenido</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry._id} hover>
                <TableCell>
                  {format(new Date(entry.operationDate), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.supplierName}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{entry.supplierRif}</Typography>
                </TableCell>
                <TableCell>{entry.invoiceNumber}</TableCell>
                <TableCell>
                  <Typography variant="caption">{entry.invoiceControlNumber}</Typography>
                </TableCell>
                <TableCell align="right">
                  Bs. {entry.baseAmount.toFixed(2)}
                </TableCell>
                <TableCell align="right">
                  Bs. {entry.ivaAmount.toFixed(2)}
                  <Chip
                    label={`${entry.ivaRate}%`}
                    size="small"
                    sx={{ ml: 0.5 }}
                  />
                </TableCell>
                <TableCell align="right">
                  {entry.withheldIvaAmount > 0 ? (
                    <Typography variant="body2" color="warning.main">
                      Bs. {entry.withheldIvaAmount.toFixed(2)}
                    </Typography>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight="bold">
                    Bs. {entry.totalAmount.toFixed(2)}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(entry.status)}
                    color={getStatusColor(entry.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {entry.status !== 'exported' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(entry._id)}
                      title="Eliminar"
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {entries.length === 0 && !loading && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No hay registros para el período seleccionado
          </Alert>
        )}

        <TablePagination
          component="div"
          count={total}
          page={filters.page - 1}
          onPageChange={handlePageChange}
          rowsPerPage={filters.limit}
          rowsPerPageOptions={[50]}
        />

        {/* Dialog Resumen */}
        <Dialog open={openSummaryDialog} onClose={() => setOpenSummaryDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Resumen Libro de Compras - {monthNames[selectedMonth - 1]} {selectedYear}
          </DialogTitle>
          <DialogContent>
            {summary && (
              <Grid container spacing={2}>
                {/* Totales generales */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 2, bgcolor: 'primary.light', color: 'white' }}>
                    <Typography variant="h6">Totales Generales</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">Registros</Typography>
                        <Typography variant="h6">{summary.totalEntries}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">Base Imponible</Typography>
                        <Typography variant="h6">Bs. {summary.totalBaseAmount.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">IVA Total</Typography>
                        <Typography variant="h6">Bs. {summary.totalIvaAmount.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">IVA Retenido</Typography>
                        <Typography variant="h6">Bs. {summary.totalWithheldIva.toFixed(2)}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Por proveedor */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Por Proveedor
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Proveedor</TableCell>
                        <TableCell>RIF</TableCell>
                        <TableCell align="right">Facturas</TableCell>
                        <TableCell align="right">Total IVA</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.bySupplier.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.supplierName}</TableCell>
                          <TableCell>{item.supplierRif}</TableCell>
                          <TableCell align="right">{item.count}</TableCell>
                          <TableCell align="right">Bs. {item.totalIva.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>

                {/* Por tasa de IVA */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Por Tasa de IVA
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Tasa</TableCell>
                        <TableCell align="right">Facturas</TableCell>
                        <TableCell align="right">Base Imponible</TableCell>
                        <TableCell align="right">IVA</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.byIvaRate.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.ivaRate}%</TableCell>
                          <TableCell align="right">{item.count}</TableCell>
                          <TableCell align="right">Bs. {item.totalBase.toFixed(2)}</TableCell>
                          <TableCell align="right">Bs. {item.totalIva.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenSummaryDialog(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default IvaPurchaseBook;
