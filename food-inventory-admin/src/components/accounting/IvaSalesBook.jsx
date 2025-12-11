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
  Cancel,
  Summarize,
  QrCode2,
  Description,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  fetchSalesBook,
  fetchSalesBookByPeriod,
  validateSalesBook,
  exportSalesBookToTXT,
  getSalesBookSummary,
  annulSalesBookEntry,
  deleteSalesBookEntry,
} from '../../lib/api';
import { format } from 'date-fns';

const IvaSalesBook = ({ customers }) => {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [openSummaryDialog, setOpenSummaryDialog] = useState(false);
  const [openAnnulDialog, setOpenAnnulDialog] = useState(false);
  const [annullingEntry, setAnnullingEntry] = useState(null);
  const [annulmentReason, setAnnulmentReason] = useState('');
  const [summary, setSummary] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  // Filtros
  const [filters, setFilters] = useState({
    status: 'all',
    customerId: '',
    isElectronic: '',
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
      const response = await fetchSalesBook(cleanFilters);
      setEntries(response.data);
      setTotal(response.total);
    } catch (error) {
      toast.error('Error al cargar libro de ventas');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      const result = await validateSalesBook(selectedMonth, selectedYear);

      if (result.valid) {
        toast.success('✅ Libro de ventas validado correctamente');
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
      await exportSalesBookToTXT(selectedMonth, selectedYear);
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
      const summaryData = await getSalesBookSummary(selectedMonth, selectedYear);
      setSummary(summaryData);
      setOpenSummaryDialog(true);
    } catch (error) {
      toast.error('Error al obtener resumen');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAnnulDialog = (entry) => {
    setAnnullingEntry(entry);
    setAnnulmentReason('');
    setOpenAnnulDialog(true);
  };

  const handleAnnul = async () => {
    if (!annulmentReason.trim()) {
      toast.error('Debe especificar una razón de anulación');
      return;
    }

    try {
      await annulSalesBookEntry(annullingEntry._id, { annulmentReason });
      toast.success('Factura anulada exitosamente');
      setOpenAnnulDialog(false);
      loadEntries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al anular');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta entrada del libro de ventas?')) return;

    try {
      await deleteSalesBookEntry(id);
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
      annulled: 'error',
    };
    return colors[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Borrador',
      confirmed: 'Confirmada',
      exported: 'Exportada',
      annulled: 'Anulada',
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
            <Typography variant="h5">Libro de Ventas</Typography>
            <Typography variant="caption" color="textSecondary">
              Registro de operaciones de venta con IVA (SENIAT)
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
        <Paper elevation={2} sx={{ p: 2, mb: 3, bgcolor: 'success.light', color: 'white' }}>
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
                {total} {total === 1 ? 'factura' : 'facturas'} emitidas
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
          <Grid item xs={12} md={3}>
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
                <MenuItem value="annulled">Anuladas</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Cliente</InputLabel>
              <Select
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                {customers?.map((customer) => (
                  <MenuItem key={customer._id} value={customer._id}>
                    {customer.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Tipo Factura</InputLabel>
              <Select
                value={filters.isElectronic}
                onChange={(e) => handleFilterChange('isElectronic', e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                <MenuItem value="true">Electrónicas</MenuItem>
                <MenuItem value="false">Físicas</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Tabla */}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>RIF</TableCell>
              <TableCell>Factura</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell align="right">Base Imp.</TableCell>
              <TableCell align="right">IVA</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={entry._id}
                hover
                sx={{
                  bgcolor: entry.status === 'annulled' ? 'action.disabledBackground' : 'inherit',
                }}
              >
                <TableCell>
                  {format(new Date(entry.operationDate), 'dd/MM/yyyy')}
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.customerName}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption">{entry.customerRif}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {entry.invoiceNumber}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {entry.invoiceControlNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  {entry.isElectronic ? (
                    <Chip
                      icon={<QrCode2 />}
                      label="Electrónica"
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      icon={<Description />}
                      label="Física"
                      size="small"
                      variant="outlined"
                    />
                  )}
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
                  {entry.status === 'confirmed' && (
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleOpenAnnulDialog(entry)}
                      title="Anular factura"
                    >
                      <Cancel fontSize="small" />
                    </IconButton>
                  )}
                  {(entry.status === 'draft' || entry.status === 'confirmed') &&
                    !entry.exportedToSENIAT && (
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
            No hay facturas para el período seleccionado
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

        {/* Dialog Anular */}
        <Dialog open={openAnnulDialog} onClose={() => setOpenAnnulDialog(false)}>
          <DialogTitle>Anular Factura</DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              Esta acción marcará la factura como anulada en el libro de ventas.
            </Alert>
            {annullingEntry && (
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>Factura:</strong> {annullingEntry.invoiceNumber}
                <br />
                <strong>Cliente:</strong> {annullingEntry.customerName}
                <br />
                <strong>Monto:</strong> Bs. {annullingEntry.totalAmount.toFixed(2)}
              </Typography>
            )}
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Razón de Anulación *"
              value={annulmentReason}
              onChange={(e) => setAnnulmentReason(e.target.value)}
              placeholder="Explique por qué se anula esta factura..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAnnulDialog(false)}>Cancelar</Button>
            <Button onClick={handleAnnul} variant="contained" color="error">
              Anular Factura
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog Resumen */}
        <Dialog open={openSummaryDialog} onClose={() => setOpenSummaryDialog(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Resumen Libro de Ventas - {monthNames[selectedMonth - 1]} {selectedYear}
          </DialogTitle>
          <DialogContent>
            {summary && (
              <Grid container spacing={2}>
                {/* Totales generales */}
                <Grid item xs={12}>
                  <Paper elevation={2} sx={{ p: 2, bgcolor: 'success.light', color: 'white' }}>
                    <Typography variant="h6">Totales Generales</Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6} md={2}>
                        <Typography variant="caption">Facturas</Typography>
                        <Typography variant="h6">{summary.totalEntries}</Typography>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Typography variant="caption">Electrónicas</Typography>
                        <Typography variant="h6">{summary.electronicInvoices}</Typography>
                      </Grid>
                      <Grid item xs={6} md={2}>
                        <Typography variant="caption">Físicas</Typography>
                        <Typography variant="h6">{summary.physicalInvoices}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">Base Imponible</Typography>
                        <Typography variant="h6">Bs. {summary.totalBaseAmount.toFixed(2)}</Typography>
                      </Grid>
                      <Grid item xs={6} md={3}>
                        <Typography variant="caption">IVA Total</Typography>
                        <Typography variant="h6">Bs. {summary.totalIvaAmount.toFixed(2)}</Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Por cliente */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                    Por Cliente (Top 10)
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Cliente</TableCell>
                        <TableCell>RIF</TableCell>
                        <TableCell align="right">Facturas</TableCell>
                        <TableCell align="right">Total IVA</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {summary.byCustomer.slice(0, 10).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.customerName}</TableCell>
                          <TableCell>{item.customerRif}</TableCell>
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

export default IvaSalesBook;
