import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { toast } from 'sonner';
import { fetchApi } from '../lib/api';
import { PlusCircle, Edit, Trash2, DollarSign, TrendingUp, TrendingDown, List as ListIcon, RefreshCcw, CheckCircle } from 'lucide-react';
import { Textarea } from './ui/textarea';

const initialFormState = {
  bankName: '',
  accountNumber: '',
  accountType: 'corriente',
  currency: 'VES',
  initialBalance: 0,
  accountHolderName: '',
  branchName: '',
  swiftCode: '',
  notes: '',
  isActive: true,
  acceptedPaymentMethods: [],
};

const STANDARD_PAYMENT_METHODS = [
  'Efectivo',
  'Tarjeta de Débito',
  'Tarjeta de Crédito',
  'Transferencia',
  'Pagomóvil',
  'Zelle',
  'POS',
  'Otro'
];

export default function BankAccountsManagement() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [adjustmentData, setAdjustmentData] = useState({ amount: 0, reason: '', type: 'increase' });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesByCurrency, setBalancesByCurrency] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageLimit, setPageLimit] = useState(25);
  const [totalAccounts, setTotalAccounts] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isMovementsDialogOpen, setIsMovementsDialogOpen] = useState(false);
  const [selectedAccountForMovements, setSelectedAccountForMovements] = useState(null);
  const [movements, setMovements] = useState([]);
  const [movementsPagination, setMovementsPagination] = useState({ page: 1, totalPages: 0, limit: 20 });
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');

  const fetchAccounts = useCallback(async (page = 1, limit = 25) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetchApi(`/bank-accounts?${params.toString()}`);
      setAccounts(response.data || response || []);
      setTotalAccounts(response.pagination?.total || 0);
      setTotalPages(response.pagination?.totalPages || 0);
      setCurrentPage(page);
    } catch (error) {
      toast.error('Error al cargar cuentas bancarias', { description: error.message });
      setAccounts([]);
      setTotalAccounts(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBalancesByCurrency = useCallback(async () => {
    try {
      const response = await fetchApi('/bank-accounts/balance/by-currency');
      setBalancesByCurrency(response || {});
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, []);

  const fetchMovements = useCallback(async (accountId, page = 1) => {
    try {
      setMovementsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      const response = await fetchApi(`/bank-accounts/${accountId}/movements?${params.toString()}`);
      const data = response.data || response;
      setMovements(Array.isArray(data) ? data : data?.data || []);
      const pagination = response.pagination || data?.pagination || { page, totalPages: 1, limit: 20, total: movements.length };
      setMovementsPagination({
        page: pagination.page || page,
        totalPages: pagination.totalPages || 1,
        limit: pagination.limit || 20,
        totalItems: pagination.total ?? pagination.totalItems ?? movements.length,
      });
    } catch (error) {
      console.error('Error fetching bank movements:', error);
      toast.error('Error al cargar movimientos bancarios', { description: error.message });
      setMovements([]);
    } finally {
      setMovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts(currentPage, pageLimit);
    fetchBalancesByCurrency();
  }, [fetchBalancesByCurrency]);

  useEffect(() => {
    if (currentPage > 1) {
      fetchAccounts(currentPage, pageLimit);
    }
  }, [currentPage]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? Number(value) : value
    }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const openCreateDialog = () => {
    setEditingAccount(null);
    setFormData(initialFormState);
    setCustomPaymentMethod('');
    setIsDialogOpen(true);
  };

  const openEditDialog = (account) => {
    setEditingAccount(account);
    setFormData({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountType: account.accountType,
      currency: account.currency,
      initialBalance: account.initialBalance,
      accountHolderName: account.accountHolderName || '',
      branchName: account.branchName || '',
      swiftCode: account.swiftCode || '',
      notes: account.notes || '',
      isActive: account.isActive,
      acceptedPaymentMethods: account.acceptedPaymentMethods || [],
    });
    setCustomPaymentMethod('');
    setIsDialogOpen(true);
  };

  const togglePaymentMethod = (method) => {
    setFormData(prev => {
      const current = prev.acceptedPaymentMethods || [];
      const isSelected = current.includes(method);

      if (isSelected) {
        return {
          ...prev,
          acceptedPaymentMethods: current.filter(m => m !== method)
        };
      } else {
        return {
          ...prev,
          acceptedPaymentMethods: [...current, method]
        };
      }
    });
  };

  const handleAddCustomPaymentMethod = () => {
    const trimmed = customPaymentMethod.trim();
    if (!trimmed) {
      toast.error('Ingrese un nombre para el método de pago');
      return;
    }

    const current = formData.acceptedPaymentMethods || [];
    if (current.includes(trimmed)) {
      toast.error('Este método de pago ya está agregado');
      return;
    }

    setFormData(prev => ({
      ...prev,
      acceptedPaymentMethods: [...current, trimmed]
    }));
    setCustomPaymentMethod('');
    toast.success(`Método de pago "${trimmed}" agregado`);
  };

  const openAdjustDialog = (account) => {
    setSelectedAccount(account);
    setAdjustmentData({ amount: 0, reason: '', type: 'increase' });
    setIsAdjustDialogOpen(true);
  };

  const openMovementsDialog = async (account) => {
    setSelectedAccountForMovements(account);
    setIsMovementsDialogOpen(true);
    await fetchMovements(account._id, 1);
  };

  const handleMovementsPageChange = async (direction) => {
    if (!selectedAccountForMovements) return;
    const newPage = movementsPagination.page + direction;
    if (newPage < 1 || newPage > movementsPagination.totalPages) return;
    await fetchMovements(selectedAccountForMovements._id, newPage);
  };

  const handleRefreshMovements = async () => {
    if (!selectedAccountForMovements) return;
    await fetchMovements(
      selectedAccountForMovements._id,
      movementsPagination.page || 1,
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await fetchApi(`/bank-accounts/${editingAccount._id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        });
        toast.success('Cuenta bancaria actualizada');
      } else {
        await fetchApi('/bank-accounts', {
          method: 'POST',
          body: JSON.stringify(formData),
        });
        toast.success('Cuenta bancaria creada');
      }
      setIsDialogOpen(false);
      fetchAccounts(currentPage, pageLimit);
      fetchBalancesByCurrency();
    } catch (error) {
      toast.error('Error al guardar cuenta bancaria', { description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta bancaria?')) return;

    try {
      await fetchApi(`/bank-accounts/${id}`, { method: 'DELETE' });
      toast.success('Cuenta bancaria eliminada');
      fetchAccounts(currentPage, pageLimit);
      fetchBalancesByCurrency();
    } catch (error) {
      toast.error('Error al eliminar cuenta bancaria', { description: error.message });
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustmentData.reason.trim()) {
      toast.error('Debe proporcionar una razón para el ajuste');
      return;
    }

    try {
      await fetchApi(`/bank-accounts/${selectedAccount._id}/adjust-balance`, {
        method: 'POST',
        body: JSON.stringify(adjustmentData),
      });
      toast.success('Saldo ajustado correctamente');
      setIsAdjustDialogOpen(false);
      fetchAccounts(currentPage, pageLimit);
      fetchBalancesByCurrency();
    } catch (error) {
      toast.error('Error al ajustar saldo', { description: error.message });
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const totalsByBank = useMemo(() => {
    const totals = {};
    accounts.forEach((account) => {
      const bankKey = account.bankName || 'Banco sin nombre';
      const currencyKey = (account.currency || 'VES').toUpperCase();
      if (!totals[bankKey]) {
        totals[bankKey] = {};
      }
      if (!totals[bankKey][currencyKey]) {
        totals[bankKey][currencyKey] = 0;
      }
      totals[bankKey][currencyKey] += Number(account.currentBalance || 0);
    });
    return totals;
  }, [accounts]);

  const formatCurrency = (value, currency = 'USD') =>
    new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(Number(value || 0));

  const handlePageLimitChange = (newLimit) => {
    setPageLimit(newLimit);
    setCurrentPage(1);
  };

  const getAccountTypeBadge = (type) => {
    const types = {
      'corriente': 'Corriente',
      'ahorro': 'Ahorro',
      'nomina': 'Nómina',
      'otra': 'Otra'
    };
    return types[type] || type;
  };

  if (loading) return <p>Cargando cuentas bancarias...</p>;

  return (
    <div className="space-y-6">
      {/* Resumen de saldos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(balancesByCurrency).map(([currency, balance]) => (
          <Card key={currency}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Total {currency}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {new Intl.NumberFormat('es-VE', {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 2
                  }).format(balance)}
                </span>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Totales por banco */}
      {Object.keys(totalsByBank).length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold">Totales por banco</h2>
            <p className="text-sm text-muted-foreground">
              Suma de saldos por entidad financiera y moneda registrada.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(totalsByBank).map(([bankName, currencies]) => (
              <Card key={bankName}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">{bankName}</CardTitle>
                  <CardDescription>Totales agrupados por moneda</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(currencies).map(([currency, total]) => (
                    <div
                      key={`${bankName}-${currency}`}
                      className="flex items-center justify-between rounded-md border px-3 py-2"
                    >
                      <span className="text-sm font-medium text-muted-foreground">
                        {currency}
                      </span>
                      <span className="text-base font-semibold">
                        {formatCurrency(total, currency)}
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Tabla de cuentas */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Cuentas Bancarias</CardTitle>
            <CardDescription>Gestiona las cuentas bancarias de tu empresa</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Cuenta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>{editingAccount ? 'Editar Cuenta Bancaria' : 'Nueva Cuenta Bancaria'}</DialogTitle>
                <DialogDescription>
                  {editingAccount ? 'Modifica los datos de la cuenta bancaria' : 'Registra una nueva cuenta bancaria'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Banco *</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleInputChange}
                      placeholder="Ej: Banco Mercantil"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Número de Cuenta *</Label>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                      placeholder="0102-1234-5678"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Tipo de Cuenta *</Label>
                    <Select
                      value={formData.accountType}
                      onValueChange={(value) => handleSelectChange('accountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="corriente">Corriente</SelectItem>
                        <SelectItem value="ahorro">Ahorro</SelectItem>
                        <SelectItem value="nomina">Nómina</SelectItem>
                        <SelectItem value="otra">Otra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="currency">Moneda *</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleSelectChange('currency', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VES">VES (Bolívares)</SelectItem>
                        <SelectItem value="USD">USD (Dólares)</SelectItem>
                        <SelectItem value="EUR">EUR (Euros)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="initialBalance">Saldo Inicial *</Label>
                    <Input
                      id="initialBalance"
                      name="initialBalance"
                      type="number"
                      step="0.01"
                      value={formData.initialBalance}
                      onChange={handleInputChange}
                      required
                      disabled={!!editingAccount}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Titular</Label>
                    <Input
                      id="accountHolderName"
                      name="accountHolderName"
                      value={formData.accountHolderName}
                      onChange={handleInputChange}
                      placeholder="Nombre del titular"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchName">Sucursal</Label>
                    <Input
                      id="branchName"
                      name="branchName"
                      value={formData.branchName}
                      onChange={handleInputChange}
                      placeholder="Nombre de la sucursal"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="swiftCode">Código SWIFT</Label>
                  <Input
                    id="swiftCode"
                    name="swiftCode"
                    value={formData.swiftCode}
                    onChange={handleInputChange}
                    placeholder="Para transferencias internacionales"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    placeholder="Información adicional"
                    rows={3}
                  />
                </div>

                <div className="space-y-3">
                  <Label>Métodos de Pago Aceptados</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {STANDARD_PAYMENT_METHODS.filter(m => m !== 'Otro').map((method) => (
                      <div key={method} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`payment-${method}`}
                          checked={(formData.acceptedPaymentMethods || []).includes(method)}
                          onChange={() => togglePaymentMethod(method)}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`payment-${method}`} className="font-normal cursor-pointer">
                          {method}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customPaymentMethod">Agregar Método Personalizado</Label>
                    <div className="flex gap-2">
                      <Input
                        id="customPaymentMethod"
                        value={customPaymentMethod}
                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                        placeholder="Ej: PayPal, Binance, etc."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomPaymentMethod();
                          }
                        }}
                      />
                      <Button type="button" onClick={handleAddCustomPaymentMethod} variant="outline">
                        Agregar
                      </Button>
                    </div>
                  </div>

                  {formData.acceptedPaymentMethods && formData.acceptedPaymentMethods.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.acceptedPaymentMethods.map((method) => (
                        <Badge
                          key={method}
                          variant="secondary"
                          className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => togglePaymentMethod(method)}
                        >
                          {method} ✕
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingAccount ? 'Actualizar' : 'Crear'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Banco</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Saldo Actual</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-center">Ver Movimientos</TableHead>
                <TableHead className="text-center">Conciliar</TableHead>
                <TableHead className="text-center">Ajustar Saldo</TableHead>
                <TableHead className="text-center">Editar</TableHead>
                <TableHead className="text-center">Eliminar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account._id}>
                  <TableCell className="font-medium">{account.bankName}</TableCell>
                  <TableCell>{account.accountNumber}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getAccountTypeBadge(account.accountType)}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">
                      {new Intl.NumberFormat('es-VE', {
                        style: 'currency',
                        currency: account.currency,
                        minimumFractionDigits: 2
                      }).format(account.currentBalance)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={account.isActive ? 'default' : 'secondary'}>
                      {account.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openMovementsDialog(account)}
                      title="Ver movimientos"
                    >
                      <ListIcon className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/bank-accounts/${account._id}/reconciliation`)}
                      title="Conciliar banco"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openAdjustDialog(account)}
                      title="Ajustar saldo"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(account)}
                      title="Editar cuenta"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account._id)}
                      title="Eliminar cuenta"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">
                  Mostrando {accounts.length} de {totalAccounts} cuentas bancarias
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">Filas por página:</p>
                  <Select
                    value={pageLimit.toString()}
                    onValueChange={(value) => handlePageLimitChange(parseInt(value))}
                  >
                    <SelectTrigger className="h-8 w-[70px]">
                      <SelectValue placeholder={pageLimit.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top">
                      {[10, 25, 50, 100].map((limit) => (
                        <SelectItem key={limit} value={limit.toString()}>
                          {limit}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {totalPages > 1 && (
                  <>
                    <div className="text-sm text-muted-foreground">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isMovementsDialogOpen} onOpenChange={setIsMovementsDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Movimientos Bancarios</DialogTitle>
            <DialogDescription>
              {selectedAccountForMovements
                ? `${selectedAccountForMovements.bankName} - ${selectedAccountForMovements.accountNumber}`
                : 'Seleccione una cuenta para ver sus movimientos'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between pb-2">
            <div className="text-sm text-muted-foreground">
              {movementsPagination.totalItems
                ? `Mostrando ${movements.length} de ${movementsPagination.totalItems} movimientos`
                : null}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshMovements}
              disabled={movementsLoading}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refrescar
            </Button>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Canal</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Cargando movimientos...
                    </TableCell>
                  </TableRow>
                )}
                {!movementsLoading && movements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      No hay movimientos registrados para esta cuenta.
                    </TableCell>
                  </TableRow>
                )}
                {!movementsLoading &&
                  movements.map((movement) => (
                    <TableRow key={movement._id}>
                      <TableCell>{movement.transactionDate ? new Date(movement.transactionDate).toLocaleDateString('es-VE') : '-'}</TableCell>
                      <TableCell>
                        <div className="font-medium">{movement.description}</div>
                        {movement.metadata?.note && (
                          <div className="text-xs text-muted-foreground">{movement.metadata.note}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{movement.channel}</Badge>
                      </TableCell>
                      <TableCell>{movement.reference || '-'}</TableCell>
                      <TableCell className={`text-right font-semibold ${movement.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                        {new Intl.NumberFormat('es-VE', {
                          style: 'currency',
                          currency: selectedAccountForMovements?.currency || 'VES',
                          minimumFractionDigits: 2,
                        }).format(movement.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        {movement.balanceAfter !== undefined
                          ? new Intl.NumberFormat('es-VE', {
                              style: 'currency',
                              currency: selectedAccountForMovements?.currency || 'VES',
                              minimumFractionDigits: 2,
                            }).format(movement.balanceAfter)
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{movement.reconciliationStatus || 'pendiente'}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>

          {movementsPagination.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Página {movementsPagination.page} de {movementsPagination.totalPages}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={movementsPagination.page <= 1 || movementsLoading}
                  onClick={() => handleMovementsPageChange(-1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    movementsPagination.page >= movementsPagination.totalPages || movementsLoading
                  }
                  onClick={() => handleMovementsPageChange(1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setIsMovementsDialogOpen(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ajustar saldo */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Ajustar Saldo</DialogTitle>
            <DialogDescription>
              {selectedAccount && `${selectedAccount.bankName} - ${selectedAccount.accountNumber}`}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdjustBalance} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Ajuste</Label>
              <Select
                value={adjustmentData.type}
                onValueChange={(value) => setAdjustmentData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">
                    <div className="flex items-center">
                      <TrendingUp className="mr-2 h-4 w-4 text-green-500" />
                      Aumentar
                    </div>
                  </SelectItem>
                  <SelectItem value="decrease">
                    <div className="flex items-center">
                      <TrendingDown className="mr-2 h-4 w-4 text-red-500" />
                      Disminuir
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Monto</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={adjustmentData.amount}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, amount: Number(e.target.value) }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Razón del Ajuste *</Label>
              <Textarea
                id="reason"
                value={adjustmentData.reason}
                onChange={(e) => setAdjustmentData(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Ej: Comisión bancaria, Interés ganado, etc."
                required
                rows={3}
              />
            </div>

            {selectedAccount && (
              <div className="p-4 bg-muted rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Saldo Actual:</span>
                  <span className="font-semibold">
                    {new Intl.NumberFormat('es-VE', {
                      style: 'currency',
                      currency: selectedAccount.currency,
                    }).format(selectedAccount.currentBalance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Ajuste:</span>
                  <span className={adjustmentData.type === 'increase' ? 'text-green-600' : 'text-red-600'}>
                    {adjustmentData.type === 'increase' ? '+' : '-'}
                    {new Intl.NumberFormat('es-VE', {
                      style: 'currency',
                      currency: selectedAccount.currency,
                    }).format(adjustmentData.amount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-bold pt-2 border-t">
                  <span>Nuevo Saldo:</span>
                  <span>
                    {new Intl.NumberFormat('es-VE', {
                      style: 'currency',
                      currency: selectedAccount.currency,
                    }).format(
                      selectedAccount.currentBalance +
                      (adjustmentData.type === 'increase' ? adjustmentData.amount : -adjustmentData.amount)
                    )}
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAdjustDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Ajustar Saldo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
