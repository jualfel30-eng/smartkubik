import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Switch,
  FormControlLabel,
  Grid,
  Typography,
  Alert,
} from '@mui/material';
import { Add, Edit, Delete, CheckCircle } from '@mui/icons-material';
import { toast } from 'react-toastify';
import {
  fetchTaxSettings,
  createTaxSettings,
  updateTaxSettings,
  deleteTaxSettings,
  seedDefaultTaxes,
} from '../../lib/api';
import { useCountryPlugin } from '../../country-plugins/CountryPluginContext';

const TaxSettingsManager = () => {
  const plugin = useCountryPlugin();
  const defaultTax = plugin.taxEngine.getDefaultTaxes()[0];
  const defaultTaxType = defaultTax?.type ?? 'IVA';
  const defaultTaxRate = defaultTax?.rate ?? 16;

  const [taxSettings, setTaxSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingTax, setEditingTax] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const [formData, setFormData] = useState({
    taxType: 'IVA',
    name: '',
    code: '',
    rate: 16,
    description: '',
    accountCode: '',
    applicableTo: 'all',
    isWithholding: false,
    withholdingRate: 0,
    withholdingAccountCode: '',
    isDefault: false,
    status: 'active',
  });

  useEffect(() => {
    loadTaxSettings();
  }, [filterType]);

  const loadTaxSettings = async () => {
    try {
      setLoading(true);
      const filters = filterType !== 'all' ? { taxType: filterType } : {};
      const data = await fetchTaxSettings(filters);
      setTaxSettings(data);
    } catch (error) {
      toast.error('Error al cargar configuración de impuestos');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (tax = null) => {
    if (tax) {
      setEditingTax(tax);
      setFormData(tax);
    } else {
      setEditingTax(null);
      setFormData({
        taxType: 'IVA',
        name: '',
        code: '',
        rate: 16,
        description: '',
        accountCode: '',
        applicableTo: 'all',
        isWithholding: false,
        withholdingRate: 0,
        withholdingAccountCode: '',
        isDefault: false,
        status: 'active',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingTax(null);
  };

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.code || !formData.accountCode) {
        toast.error('Complete todos los campos obligatorios');
        return;
      }

      if (editingTax) {
        await updateTaxSettings(editingTax._id, formData);
        toast.success('Configuración actualizada exitosamente');
      } else {
        await createTaxSettings(formData);
        toast.success('Configuración creada exitosamente');
      }

      handleCloseDialog();
      loadTaxSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al guardar configuración');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta configuración?')) return;

    try {
      await deleteTaxSettings(id);
      toast.success('Configuración eliminada');
      loadTaxSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al eliminar');
    }
  };

  const handleSeedDefaults = async () => {
    if (!window.confirm('¿Crear impuestos por defecto de Venezuela?')) return;

    try {
      await seedDefaultTaxes();
      toast.success('Impuestos por defecto creados exitosamente');
      loadTaxSettings();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al crear impuestos');
    }
  };

  const getTaxTypeColor = (type) => {
    const colors = {
      IVA: 'primary',
      ISLR: 'secondary',
      IGTF: 'warning',
      CUSTOMS: 'info',
      OTHER: 'default',
    };
    return colors[type] || 'default';
  };

  return (
    <Card>
      <CardContent>
        <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Typography variant="h5">Configuración de Impuestos</Typography>
          </Grid>
          <Grid item xs={12} md={6} sx={{ textAlign: 'right' }}>
            <Button
              variant="outlined"
              onClick={handleSeedDefaults}
              sx={{ mr: 1 }}
            >
              Crear Defaults VE
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
            >
              Nuevo Impuesto
            </Button>
          </Grid>
        </Grid>

        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Filtrar por tipo</InputLabel>
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">Todos</MenuItem>
            <MenuItem value="IVA">IVA</MenuItem>
            <MenuItem value="ISLR">ISLR</MenuItem>
            <MenuItem value="IGTF">IGTF</MenuItem>
            <MenuItem value="CUSTOMS">Aduanas</MenuItem>
            <MenuItem value="OTHER">Otros</MenuItem>
          </Select>
        </FormControl>

        {taxSettings.length === 0 && !loading && (
          <Alert severity="info">
            No hay configuraciones de impuestos. Haz clic en "Crear Defaults VE" para
            crear los impuestos típicos de Venezuela.
          </Alert>
        )}

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Tipo</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Tasa %</TableCell>
              <TableCell>Cuenta</TableCell>
              <TableCell>Retención</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {taxSettings.map((tax) => (
              <TableRow key={tax._id}>
                <TableCell>
                  <Chip
                    label={tax.taxType}
                    color={getTaxTypeColor(tax.taxType)}
                    size="small"
                  />
                </TableCell>
                <TableCell>{tax.code}</TableCell>
                <TableCell>
                  {tax.name}
                  {tax.isDefault && (
                    <Chip
                      label="Default"
                      size="small"
                      color="success"
                      sx={{ ml: 1 }}
                    />
                  )}
                </TableCell>
                <TableCell>{tax.rate}%</TableCell>
                <TableCell>{tax.accountCode}</TableCell>
                <TableCell>
                  {tax.isWithholding ? (
                    <Chip
                      label={`${tax.withholdingRate}%`}
                      size="small"
                      color="warning"
                    />
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    label={tax.status}
                    color={tax.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(tax)}
                  >
                    <Edit />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(tax._id)}
                    disabled={tax.isDefault}
                  >
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Dialog para crear/editar */}
        <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>
            {editingTax ? 'Editar Impuesto' : 'Nuevo Impuesto'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Impuesto</InputLabel>
                  <Select
                    name="taxType"
                    value={formData.taxType}
                    onChange={handleChange}
                  >
                    <MenuItem value="IVA">IVA</MenuItem>
                    <MenuItem value="ISLR">ISLR</MenuItem>
                    <MenuItem value="IGTF">IGTF</MenuItem>
                    <MenuItem value="CUSTOMS">Aduanas</MenuItem>
                    <MenuItem value="OTHER">Otro</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Código"
                  name="code"
                  value={formData.code}
                  onChange={handleChange}
                  placeholder={`${defaultTaxType}-${defaultTaxRate}`}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Nombre"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={`${defaultTaxType} General ${defaultTaxRate}%`}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Tasa %"
                  name="rate"
                  value={formData.rate}
                  onChange={handleChange}
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Código de Cuenta"
                  name="accountCode"
                  value={formData.accountCode}
                  onChange={handleChange}
                  placeholder="2102"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Descripción"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isWithholding"
                      checked={formData.isWithholding}
                      onChange={handleChange}
                    />
                  }
                  label="Es Retención"
                />
              </Grid>

              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isDefault"
                      checked={formData.isDefault}
                      onChange={handleChange}
                    />
                  }
                  label="Marcar como Default"
                />
              </Grid>

              {formData.isWithholding && (
                <>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="% Retención"
                      name="withholdingRate"
                      value={formData.withholdingRate}
                      onChange={handleChange}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Cuenta de Retención"
                      name="withholdingAccountCode"
                      value={formData.withholdingAccountCode}
                      onChange={handleChange}
                      placeholder="2104"
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button onClick={handleSubmit} variant="contained">
              {editingTax ? 'Actualizar' : 'Crear'}
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default TaxSettingsManager;
