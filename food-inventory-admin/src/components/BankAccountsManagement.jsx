import { useState, useEffect, useCallback } from 'react';
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
import { PlusCircle, Edit, Trash2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
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
};

export default function BankAccountsManagement() {
  const [accounts, setAccounts] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [formData, setFormData] = useState(initialFormState);
  const [adjustmentData, setAdjustmentData] = useState({ amount: 0, reason: '', type: 'increase' });
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [balancesByCurrency, setBalancesByCurrency] = useState({});

  const fetchAccounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/bank-accounts');
      setAccounts(response || []);
    } catch (error) {
      toast.error('Error al cargar cuentas bancarias', { description: error.message });
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

  useEffect(() => {
    fetchAccounts();
    fetchBalancesByCurrency();
  }, [fetchAccounts, fetchBalancesByCurrency]);

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
    });
    setIsDialogOpen(true);
  };

  const openAdjustDialog = (account) => {
    setSelectedAccount(account);
    setAdjustmentData({ amount: 0, reason: '', type: 'increase' });
    setIsAdjustDialogOpen(true);
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
      fetchAccounts();
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
      fetchAccounts();
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
      fetchAccounts();
      fetchBalancesByCurrency();
    } catch (error) {
      toast.error('Error al ajustar saldo', { description: error.message });
    }
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
                <TableHead className="text-right">Acciones</TableHead>
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
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openAdjustDialog(account)}
                      title="Ajustar saldo"
                    >
                      <DollarSign className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(account)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(account._id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
