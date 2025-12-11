import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, Loader2, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import { fetchTrialBalance } from '../../lib/api';

export default function TrialBalance() {
  const [loading, setLoading] = useState(false);
  const [trialBalance, setTrialBalance] = useState(null);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    accountType: 'all',
    includeZeroBalances: false,
  });

  const loadTrialBalance = async () => {
    try {
      setLoading(true);
      const params = {};

      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.accountType && filters.accountType !== 'all') params.accountType = filters.accountType;
      params.includeZeroBalances = filters.includeZeroBalances;

      const data = await fetchTrialBalance(params);
      setTrialBalance(data);
    } catch (error) {
      console.error('Error loading trial balance:', error);
      toast.error(error.message || 'Error al cargar el balance de comprobación');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Balance de Comprobación</h2>
          <p className="text-muted-foreground">
            Verifica que el total de débitos sea igual al total de créditos
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Selecciona el rango de fechas y tipo de cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountType">Tipo de Cuenta</Label>
              <Select
                value={filters.accountType}
                onValueChange={(value) => setFilters({ ...filters, accountType: value })}
              >
                <SelectTrigger id="accountType">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Pasivo">Pasivo</SelectItem>
                  <SelectItem value="Patrimonio">Patrimonio</SelectItem>
                  <SelectItem value="Ingreso">Ingreso</SelectItem>
                  <SelectItem value="Gasto">Gasto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadTrialBalance} disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Consultar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {trialBalance && (
        <>
          {/* Balance Status */}
          <div className="flex items-center gap-2">
            {trialBalance.totals.isBalanced ? (
              <Badge variant="default" className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Balance Cuadrado
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="mr-1 h-3 w-3" />
                Balance No Cuadrado
              </Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {trialBalance.accounts.length} cuentas
            </span>
          </div>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detalle de Cuentas</CardTitle>
              <CardDescription>
                Período: {trialBalance.period.startDate} - {trialBalance.period.endDate}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cuenta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trialBalance.accounts.map((account, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">{account.code}</TableCell>
                      <TableCell>{account.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{account.type}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.debit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.credit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            account.balance >= 0
                              ? 'text-green-600 dark:text-green-400'
                              : 'text-red-600 dark:text-red-400'
                          }
                        >
                          {formatCurrency(account.balance)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals Row */}
                  <TableRow className="border-t-2 font-bold bg-muted/50">
                    <TableCell colSpan={3} className="text-right">
                      TOTALES
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(trialBalance.totals.totalDebits)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(trialBalance.totals.totalCredits)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      <span
                        className={
                          trialBalance.totals.difference === 0
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }
                      >
                        {formatCurrency(trialBalance.totals.difference)}
                      </span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Débitos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(trialBalance.totals.totalDebits)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Créditos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(trialBalance.totals.totalCredits)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Diferencia
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    trialBalance.totals.difference === 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(trialBalance.totals.difference)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State */}
      {!trialBalance && !loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay datos</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Selecciona los filtros y haz clic en "Consultar" para ver el balance de comprobación
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
