import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankReconciliation } from '@/hooks/use-bank-reconciliation';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, UploadCloud, Loader2, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth.jsx';
import { ShieldAlert } from 'lucide-react';

const resolveCurrency = (rawCurrency) => {
  const normalized = (rawCurrency || '').toString().trim().toUpperCase();

  const map = {
    '$': 'USD',
    'US': 'USD',
    'USD': 'USD',
    'BS': 'VES',
    'BS.': 'VES',
    'BSF': 'VES',
    'BS.S': 'VES',
    'BOLIVAR': 'VES',
    'BOLIVARES': 'VES',
    'BOLÍVAR': 'VES',
    'BOLÍVARES': 'VES',
    'VES': 'VES',
    'VEF': 'VES',
  };

  return map[normalized] || 'USD';
};

const formatCurrency = (value, currency = 'USD') =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: resolveCurrency(currency),
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('es-VE');
};

export default function BankReconciliationView() {
  const { accountId } = useParams();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    statementDate: new Date().toISOString().split('T')[0],
    startingBalance: '',
    endingBalance: '',
    currency: 'USD',
  });
  const [isLoadingAccount, setLoadingAccount] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [isManualDialogOpen, setManualDialogOpen] = useState(false);
  const [selectedStatementMovement, setSelectedStatementMovement] = useState(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState('');
  const [reconcileLoading, setReconcileLoading] = useState({});
  const [paymentNavigateLoading, setPaymentNavigateLoading] = useState({});
  const [showReconciled, setShowReconciled] = useState(false);
  const { user } = useAuth();
  const canReconcile = Array.isArray(user?.permissions)
    ? user.permissions.includes('payments_reconcile')
    : false;

  const {
    isUploading,
    statementImport,
    pending,
    reopened,
    importStatement,
    manualReconcile,
  } = useBankReconciliation(accountId);

  const visibleRows = useMemo(() => {
    const base = Array.isArray(transactions) ? transactions : [];
    if (showReconciled) return base;
    return base.filter(
      (movement) =>
        !movement.reconciliationStatus ||
        movement.reconciliationStatus === 'pending',
    );
  }, [transactions, showReconciled]);

  const totals = useMemo(() => {
    const source = showReconciled
      ? visibleRows
      : visibleRows.filter(
          (movement) =>
            !movement.reconciliationStatus ||
            movement.reconciliationStatus === 'pending',
        );
    return source.reduce(
      (acc, movement) => {
        const amount = Number(movement.amount || 0);
        if (amount >= 0) {
          acc.deposits += amount;
        } else {
          acc.withdrawals += Math.abs(amount);
        }
        return acc;
      },
      { deposits: 0, withdrawals: 0 },
    );
  }, [visibleRows, showReconciled]);

  const loadAccount = async () => {
    if (!accountId) return;
    setLoadingAccount(true);
    try {
      const result = await fetchApi(`/bank-accounts/${accountId}`);
      setAccount(result);
      if (result?.currency) {
        setForm((prev) => ({
          ...prev,
          currency: resolveCurrency(result.currency),
        }));
      }
    } catch (error) {
      toast.error('No se pudo cargar la cuenta bancaria', {
        description: error.message,
      });
    } finally {
      setLoadingAccount(false);
    }
  };

  const loadTransactions = async () => {
    if (!accountId) return;
    setLoadingTransactions(true);
    try {
      const qs = {
        limit: '200',
        sortField: 'transactionDate',
        sortOrder: 'desc',
      };
      if (!showReconciled) {
        qs.reconciliationStatus = 'pending';
      }
      const params = new URLSearchParams(qs).toString();
      const response = await fetchApi(`/bank-accounts/${accountId}/movements?${params}`);
      const data = response.data || response || [];
      setTransactions(Array.isArray(data) ? data : data.data || []);
    } catch (error) {
      toast.error('Error al cargar movimientos del sistema', {
        description: error.message,
      });
      setTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    loadAccount();
    loadTransactions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, showReconciled]);

  const handleFileChange = (event) => {
    const selected = event.target.files?.[0];
    setFile(selected ?? null);
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    const normalizedValue =
      name === 'currency'
        ? value.toString().trim().toUpperCase()
        : value;
    setForm((prev) => ({
      ...prev,
      [name]: normalizedValue,
    }));
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Selecciona un archivo CSV o XLSX');
      return;
    }
    if (!form.statementDate || !form.startingBalance || !form.endingBalance) {
      toast.error('Completa los datos del estado antes de importar');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('statementDate', new Date(form.statementDate).toISOString());
    formData.append('startingBalance', form.startingBalance.toString());
    formData.append('endingBalance', form.endingBalance.toString());
    formData.append('currency', resolveCurrency(form.currency));

    try {
      await importStatement(formData);
      await loadTransactions();
    } finally {
      // keep file for re-import if needed
    }
  };

  const openManualDialog = (statementMovement) => {
    setSelectedStatementMovement(statementMovement);
    setSelectedTransactionId('');
    setManualDialogOpen(true);
  };

  const handleManualReconcile = async () => {
    if (!selectedStatementMovement || !selectedTransactionId) {
      toast.error('Selecciona un movimiento del sistema para conciliar');
      return;
    }

    try {
      await manualReconcile({
        transactionId: selectedTransactionId,
        statementImportId:
          selectedStatementMovement.statementImportId ?? statementImport?._id,
        bankAmount: selectedStatementMovement.amount,
        bankDate: selectedStatementMovement.transactionDate,
        bankReference: selectedStatementMovement.reference,
      });

      setTransactions((current) =>
        current.filter((transaction) => transaction._id !== selectedTransactionId),
      );

      setManualDialogOpen(false);
      setSelectedTransactionId('');
      setSelectedStatementMovement(null);
    } catch (error) {
      console.error('Failed to reconcile manually:', error);
    }
  };

  const matchingTransactions = useMemo(() => {
    if (!selectedStatementMovement) {
      return transactions;
    }
    return transactions.filter((transaction) => {
      const referenceMatch = selectedStatementMovement.reference
        ? transaction.reference?.toLowerCase().includes(
            selectedStatementMovement.reference.toLowerCase(),
          )
        : true;
      const amountMatch =
        Math.abs(Number(transaction.amount || 0)) ===
        Math.abs(Number(selectedStatementMovement.amount || 0));
      return amountMatch || referenceMatch;
    });
  }, [transactions, selectedStatementMovement]);

  const resolvedCurrency = resolveCurrency(
    statementImport?.metadata?.currency ||
      account?.currency ||
      form.currency,
  );

  const handleMatchPayment = async (bankTxId, paymentId) => {
    if (!paymentId) return;
    if (!canReconcile) {
      toast.error('No tienes permisos para conciliar pagos');
      return;
    }
    setReconcileLoading((prev) => ({ ...prev, [bankTxId]: true }));
    try {
      await fetchApi(`/payments/${paymentId}/reconcile`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'matched',
          statementRef: bankTxId,
        }),
      });
      toast.success('Pago marcado como conciliado');
      await loadTransactions();
    } catch (error) {
      toast.error('No se pudo conciliar el pago', { description: error.message });
    } finally {
      setReconcileLoading((prev) => ({ ...prev, [bankTxId]: false }));
    }
  };

  const handleReopenPayment = async (bankTxId, paymentId) => {
    if (!paymentId) return;
    if (!canReconcile) {
      toast.error('No tienes permisos para conciliar pagos');
      return;
    }
    setReconcileLoading((prev) => ({ ...prev, [bankTxId]: true }));
    try {
      await fetchApi(`/payments/${paymentId}/reconcile`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'pending',
          statementRef: null,
        }),
      });
      toast.success('Conciliación reabierta a pendiente');
      await loadTransactions();
    } catch (error) {
      toast.error('No se pudo reabrir la conciliación', { description: error.message });
    } finally {
      setReconcileLoading((prev) => ({ ...prev, [bankTxId]: false }));
    }
  };

  const handleOpenPayment = (paymentId) => {
    if (!paymentId) return;
    setPaymentNavigateLoading((prev) => ({ ...prev, [paymentId]: true }));
    navigate(`/receivables?tab=reports&paymentId=${paymentId}`);
    setTimeout(() => {
      setPaymentNavigateLoading((prev) => ({ ...prev, [paymentId]: false }));
    }, 500);
  };

  const handleBack = () => {
    navigate('/bank-accounts');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Button variant="ghost" onClick={handleBack} className="px-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a cuentas bancarias
          </Button>
          <h1 className="text-3xl font-semibold">Conciliación bancaria</h1>
          <p className="text-muted-foreground">
            Importa tu estado de cuenta y compara los movimientos con los registros del sistema.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Label htmlFor="showReconciled" className="text-muted-foreground">
            Ver conciliados
          </Label>
          <Button
            id="showReconciled"
            variant={showReconciled ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowReconciled((prev) => !prev)}
          >
            {showReconciled ? 'Mostrando todos' : 'Sólo pendientes'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cuenta bancaria</CardTitle>
            <CardDescription>Información general de la cuenta seleccionada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoadingAccount ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando cuenta...
              </div>
            ) : account ? (
              <>
                <div>
                  <p className="font-medium">{account.bankName}</p>
                  <p className="text-muted-foreground">
                    {account.accountNumber} · {resolveCurrency(account.currency)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={account.isActive ? 'success' : 'secondary'}>
                    {account.isActive ? 'Activa' : 'Inactiva'}
                  </Badge>
                  <span className="text-muted-foreground">
                    Saldo actual: {formatCurrency(account.currentBalance, account.currency)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No se encontró la cuenta bancaria.</p>
            )}
          </CardContent>
        </Card>

        <Card>
            <CardHeader>
              <CardTitle>Depósitos pendientes</CardTitle>
              <CardDescription>Movimientos entrantes del estado de cuenta sin conciliar</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-green-600">
            {formatCurrency(totals.deposits, resolvedCurrency)}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Retiros pendientes</CardTitle>
              <CardDescription>Movimientos salientes del estado de cuenta sin conciliar</CardDescription>
            </CardHeader>
            <CardContent className="text-2xl font-semibold text-red-600">
            {formatCurrency(totals.withdrawals, resolvedCurrency)}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Importar estado de cuenta</CardTitle>
          <CardDescription>Sube el archivo descargado del banco en formato CSV o XLSX.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="statementDate">Fecha de corte</Label>
              <Input
                type="date"
                id="statementDate"
                name="statementDate"
                value={form.statementDate}
                onChange={handleFormChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startingBalance">Saldo inicial</Label>
              <Input
                type="number"
                step="0.01"
                id="startingBalance"
                name="startingBalance"
                value={form.startingBalance}
                onChange={handleFormChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endingBalance">Saldo final</Label>
              <Input
                type="number"
                step="0.01"
                id="endingBalance"
                name="endingBalance"
                value={form.endingBalance}
                onChange={handleFormChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moneda</Label>
              <Input
                type="text"
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleFormChange}
                placeholder="USD"
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
            />
            <Button onClick={handleImport} disabled={isUploading || !file}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Importar estado
                </>
              )}
            </Button>
          </div>

          {statementImport && (
            <div className="text-sm text-muted-foreground">
              <p>
                Última importación: {formatDate(statementImport.createdAt)} ·{" "}
                {statementImport.matchedRows} movimientos conciliados automáticamente ·{" "}
                {statementImport.unmatchedRows} pendientes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {reopened && reopened.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Pagos reabiertos tras importación</CardTitle>
            <CardDescription>Pagos que estaban conciliados y se reabrieron a pendiente por no aparecer en el extracto.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {reopened.slice(0, 10).map((item) => (
              <div
                key={`${item.paymentId || item.bankTransactionId || item.reference || 'unknown'}-${item.amount || '0'}`}
              >
                {formatDate(item.transactionDate)} · {item.reference || 'Sin referencia'} ·{' '}
                {formatCurrency(item.amount, resolvedCurrency)}
              </div>
            ))}
            {reopened.length > 10 ? (
              <div className="text-muted-foreground">
                y {reopened.length - 10} más...
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle>
            Movimientos {showReconciled ? 'pendientes y conciliados' : 'pendientes por conciliar'}
          </CardTitle>
          <CardDescription>
            Coincide cada movimiento del estado de cuenta con un movimiento del sistema o regístralo manualmente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Referencia</TableHead>
                  <TableHead>Conciliación</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No hay movimientos pendientes. ¡Todo conciliado! 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((movement) => (
                    <TableRow
                      key={
                        movement._id ||
                        movement.__key ||
                        `${movement.reference || 'unknown'}-${movement.amount || '0'}`
                      }
                    >
                      <TableCell>{formatDate(movement.transactionDate)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{movement.description || '-'}</p>
                          {movement.statementImportId && (
                            <p className="text-xs text-muted-foreground">
                              Importación #{movement.statementImportId.substring(0, 6)}…
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{movement.reference || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              (movement.reconciliationStatus || '').includes('matched')
                                ? 'success'
                                : 'secondary'
                            }
                          >
                            {movement.reconciliationStatus || 'pending'}
                          </Badge>
                          {movement.paymentId ? (
                            <Badge variant="outline">
                              Pago #{movement.paymentId.substring(0, 6)}…
                            </Badge>
                          ) : null}
                          {movement.statementTransactionId ? (
                            <TooltipProvider delayDuration={100}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div>
                                      <span className="font-medium">StatementRef:</span>{' '}
                                      {movement.statementTransactionId}
                                    </div>
                                    <div>
                                      <span className="font-medium">Conciliado:</span>{' '}
                                      {formatDate(movement.reconciledAt)}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : null}
                        </div>
                      </TableCell>
              <TableCell className="text-right">
                <Badge
                  variant={Number(movement.amount || 0) >= 0 ? 'success' : 'destructive'}
                  className="text-base"
                >
                  {formatCurrency(movement.amount, resolvedCurrency)}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openManualDialog(movement)}
                    disabled={loadingTransactions || !canReconcile}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Conciliar
                  </Button>
                  {movement.paymentId ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpenPayment(movement.paymentId)}
                      >
                        {paymentNavigateLoading[movement.paymentId] ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Ver pago
                          </>
                        )}
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleMatchPayment(movement._id, movement.paymentId)}
                          disabled={reconcileLoading[movement._id] || !canReconcile}
                        >
                          {reconcileLoading[movement._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Conciliar pago'
                          )}
                        </Button>
                        {(movement.reconciliationStatus || '').includes('matched') ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReopenPayment(movement._id, movement.paymentId)}
                            disabled={reconcileLoading[movement._id] || !canReconcile}
                          >
                            {reconcileLoading[movement._id] ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Reabrir'
                            )}
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isManualDialogOpen} onOpenChange={setManualDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conciliación manual</DialogTitle>
            <DialogDescription>
              Selecciona el movimiento del sistema que corresponde a este movimiento del estado de cuenta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedStatementMovement && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Movimiento bancario</CardTitle>
                  <CardDescription>
                    {formatDate(selectedStatementMovement.transactionDate)} · {selectedStatementMovement.reference || 'Sin referencia'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedStatementMovement.amount, resolvedCurrency)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedStatementMovement.description || 'Sin descripción'}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-2">
              <Label htmlFor="transactionId">Movimiento del sistema</Label>
              <Select
                value={selectedTransactionId}
                onValueChange={setSelectedTransactionId}
              >
                <SelectTrigger id="transactionId">
                  <SelectValue placeholder={loadingTransactions ? 'Cargando...' : 'Selecciona un movimiento'} />
                </SelectTrigger>
                <SelectContent>
                  {matchingTransactions.length === 0 ? (
                    <SelectItem value="__empty" disabled>
                      {loadingTransactions ? 'Cargando movimientos...' : 'No hay movimientos disponibles'}
                    </SelectItem>
                  ) : (
                    matchingTransactions.map((transaction) => (
                      <SelectItem key={transaction._id} value={transaction._id}>
                        {formatDate(transaction.transactionDate)} · {transaction.description || 'Sin descripción'} ·{' '}
                        {formatCurrency(transaction.amount, transaction.currency || form.currency)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManualDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleManualReconcile}
              disabled={!selectedTransactionId || selectedTransactionId === '__empty' || !canReconcile}
            >
              Conciliar movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!canReconcile ? (
        <Card>
          <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            No tienes permisos para conciliar pagos. Solicita el permiso <code>payments_reconcile</code>.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
