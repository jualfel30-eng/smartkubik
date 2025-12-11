import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Combobox } from '@/components/ui/combobox';
import { Loader2, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { fetchGeneralLedger, fetchChartOfAccounts } from '../../lib/api';
import { format } from 'date-fns';

const GeneralLedger = () => {
  const [loading, setLoading] = useState(false);
  const [ledger, setLedger] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountCode, setSelectedAccountCode] = useState('');
  const [filters, setFilters] = useState({
    accountCode: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 50,
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    try {
      const data = await fetchChartOfAccounts();
      const list = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setAccounts(list);
    } catch (error) {
      console.error('Error loading accounts:', error);
      toast.error('Error al cargar el catálogo de cuentas');
    }
  };

  const loadGeneralLedger = async () => {
    if (!filters.accountCode) {
      toast.warning('Seleccione una cuenta para ver el libro mayor');
      return;
    }

    try {
      setLoading(true);
      const params = {
        accountCode: filters.accountCode,
        page: filters.page,
        limit: filters.limit,
      };

      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;

      const data = await fetchGeneralLedger(params);
      setLedger(data);
    } catch (error) {
      console.error('Error loading general ledger:', error);
      toast.error(error.message || 'Error al cargar el libro mayor');
    } finally {
      setLoading(false);
    }
  };

  const handleAccountChange = (value) => {
    setSelectedAccountCode(value);
    if (value) {
      setFilters((prev) => ({ ...prev, accountCode: value, page: 1 }));
    } else {
      setFilters((prev) => ({ ...prev, accountCode: '', page: 1 }));
      setLedger(null);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || (ledger?.pagination && newPage > ledger.pagination.totalPages)) {
      return;
    }
    setFilters((prev) => ({ ...prev, page: newPage }));
    // Reload with new page
    setTimeout(() => loadGeneralLedger(), 0);
  };

  const handleApplyFilters = () => {
    setFilters((prev) => ({ ...prev, page: 1 }));
    loadGeneralLedger();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Prepare account options for Combobox
  const accountOptions = accounts.map((acc) => ({
    value: acc.code,
    label: `${acc.code} - ${acc.name}`,
  }));

  // Pagination helper
  const renderPaginationItems = () => {
    if (!ledger?.pagination) return null;

    const { currentPage, totalPages } = ledger.pagination;
    const items = [];

    for (let i = 1; i <= totalPages; i++) {
      // Show first page, last page, current page, and pages around current
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => handlePageChange(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        items.push(
          <PaginationItem key={i}>
            <span className="px-4">...</span>
          </PaginationItem>
        );
      }
    }

    return items;
  };

  const selectedAccount = accounts.find((acc) => acc.code === selectedAccountCode);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Libro Mayor</h2>
          <p className="text-muted-foreground">
            Consulta el detalle de movimientos por cuenta contable
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Selecciona la cuenta y el rango de fechas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 grid gap-2">
              <Label htmlFor="account">Cuenta *</Label>
              <Combobox
                options={accountOptions}
                value={selectedAccountCode}
                onChange={handleAccountChange}
                placeholder="Seleccionar cuenta..."
                searchPlaceholder="Buscar cuenta..."
                emptyPlaceholder="No se encontraron cuentas"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="md:col-span-4 flex justify-start">
              <Button
                onClick={handleApplyFilters}
                disabled={loading || !filters.accountCode}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Consultar Libro Mayor
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      {ledger && selectedAccount && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="text-xl">
                  {ledger.account.code} - {ledger.account.name}
                </CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">{ledger.account.type}</Badge>
                  <span className="text-sm text-muted-foreground">
                    Período: {ledger.period.startDate} - {ledger.period.endDate}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Cargando libro mayor...</p>
          </CardContent>
        </Card>
      )}

      {/* Ledger Table */}
      {!loading && ledger && ledger.entries.length > 0 && (
        <>
          {/* Opening Balance */}
          <Card className="bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Saldo Inicial:</span>
                <span className="text-lg font-bold">
                  {formatCurrency(ledger.openingBalance)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Entries Table */}
          <Card>
            <CardHeader>
              <CardTitle>Movimientos</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="text-right">Débito</TableHead>
                    <TableHead className="text-right">Crédito</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledger.entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {formatDate(entry.date)}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        <span
                          className={
                            entry.balance >= 0
                              ? 'text-green-600 dark:text-green-400 font-semibold'
                              : 'text-red-600 dark:text-red-400 font-semibold'
                          }
                        >
                          {formatCurrency(entry.balance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {entry.isAutomatic && (
                          <Badge variant="secondary">Auto</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Closing Balance */}
          <Card className="bg-green-50 dark:bg-green-950/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Saldo Final:</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(ledger.closingBalance)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {ledger.pagination && ledger.pagination.totalPages > 1 && (
            <div className="flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationPrevious
                    onClick={() => handlePageChange(filters.page - 1)}
                    className={
                      filters.page === 1
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                  {renderPaginationItems()}
                  <PaginationNext
                    onClick={() => handlePageChange(filters.page + 1)}
                    className={
                      filters.page === ledger.pagination.totalPages
                        ? 'pointer-events-none opacity-50'
                        : 'cursor-pointer'
                    }
                  />
                </PaginationContent>
              </Pagination>
            </div>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Movimientos Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {ledger.pagination?.total || ledger.entries.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Inicial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(ledger.openingBalance)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  Saldo Final
                  <TrendingUp className="h-4 w-4" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(ledger.closingBalance)}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && ledger && ledger.entries.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">No hay movimientos</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              No hay movimientos para esta cuenta en el período seleccionado
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Account Selected */}
      {!loading && !ledger && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold">
              Seleccione una cuenta
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Seleccione una cuenta para consultar su libro mayor
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default GeneralLedger;
