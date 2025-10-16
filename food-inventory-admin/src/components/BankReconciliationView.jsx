import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useBankReconciliation } from '@/hooks/use-bank-reconciliation';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { ArrowLeft, UploadCloud, Loader2, CheckCircle } from 'lucide-react';

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

  const {
    isUploading,
    statementImport,
    pending,
    importStatement,
    manualReconcile,
  } = useBankReconciliation(accountId);

  const totals = useMemo(() => {
    return pending.reduce(
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
  }, [pending]);

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
      const params = new URLSearchParams({
        limit: '200',
        reconciliationStatus: 'pending',
        sortField: 'transactionDate',
        sortOrder: 'desc',
      }).toString();
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
  }, [accountId]);

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

      <Card>
        <CardHeader>
          <CardTitle>Movimientos pendientes por conciliar</CardTitle>
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
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No hay movimientos pendientes. ¡Todo conciliado! 🎉
                    </TableCell>
                  </TableRow>
                ) : (
                  pending.map((movement) => (
                    <TableRow key={movement.__key}>
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
                      <TableCell className="text-right">
                        <Badge
                          variant={Number(movement.amount || 0) >= 0 ? 'success' : 'destructive'}
                          className="text-base"
                        >
                          {formatCurrency(movement.amount, resolvedCurrency)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openManualDialog(movement)}
                          disabled={loadingTransactions}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Conciliar
                        </Button>
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
              disabled={!selectedTransactionId || selectedTransactionId === '__empty'}
            >
              Conciliar movimiento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
