import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../lib/api';
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ArrowLeft, CreditCard, MessageSquare, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body';
import { EmptyState } from '@/components/ui/empty-state';
import { DataHighlight } from '@/components/ui/data-highlight';
import { ContentTransition } from '@/components/ui/content-transition';
import { TableSkeleton } from '@/components/ui/page-loading';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { URGENCY_STYLES, getUrgency, getDaysLabel, getARStatusInfo } from '@/lib/invoice-constants';
import { fadeUp } from '@/lib/motion';
import ARSummaryCards from './accounts-receivable/ARSummaryCards';
import RecordReceivablePaymentDialog from './accounts-receivable/RecordReceivablePaymentDialog';

const AccountsReceivableReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState(null);

  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApi('/accounting/reports/accounts-receivable');
      setReportData(response || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const filteredData = useMemo(() => {
    let result = reportData;

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row =>
        row.customerName?.toLowerCase().includes(search) ||
        row.orderNumber?.toString().toLowerCase().includes(search)
      );
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter(row => row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'paid');
      } else {
        result = result.filter(row => row.status === statusFilter);
      }
    }

    if (agingFilter) {
      const now = new Date();
      if (agingFilter === 'overdue') {
        result = result.filter(row => row.dueDate && new Date(row.dueDate) < now && row.status !== 'paid');
      } else if (agingFilter === 'current') {
        result = result.filter(row => !row.dueDate || new Date(row.dueDate) >= now);
      } else if (agingFilter === 'days30') {
        result = result.filter(row => {
          if (!row.dueDate) return false;
          const days = Math.floor((now - new Date(row.dueDate)) / 86400000);
          return days > 0 && days <= 30;
        });
      } else if (agingFilter === 'days60') {
        result = result.filter(row => {
          if (!row.dueDate) return false;
          const days = Math.floor((now - new Date(row.dueDate)) / 86400000);
          return days > 30 && days <= 60;
        });
      } else if (agingFilter === 'days60plus') {
        result = result.filter(row => {
          if (!row.dueDate) return false;
          const days = Math.floor((now - new Date(row.dueDate)) / 86400000);
          return days > 60;
        });
      }
    }

    return result;
  }, [reportData, searchTerm, statusFilter, agingFilter]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, agingFilter]);

  const handleAgingFilterChange = (filter) => {
    setAgingFilter(prev => prev === filter ? null : filter);
  };

  const handlePaymentSuccess = () => {
    setIsPaymentDialogOpen(false);
    fetchReport();
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || agingFilter;

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAgingFilter(null);
  };

  const buildWhatsAppMessage = (row) => {
    return `Hola ${row.customerName}, le recordamos que tiene un saldo pendiente de ${formatCurrency(Number(row.balance))} correspondiente al pedido N° ${row.orderNumber}. Agradecemos su pronto pago. Gracias.`;
  };

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
        </div>
        <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
          <p className="text-destructive text-sm">Error: {error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={fetchReport}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Volver a Contabilidad</TooltipContent>
        </Tooltip>
        <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
      </div>

      {/* Summary Cards */}
      <ContentTransition
        loading={loading}
        skeleton={
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-7 bg-muted rounded w-1/2 mb-1" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        }
      >
        <ARSummaryCards
          data={reportData}
          activeFilter={agingFilter}
          onFilterChange={handleAgingFilterChange}
        />
      </ContentTransition>

      {/* Filter Bar + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente o N° de pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="partial">Parcial</SelectItem>
                  <SelectItem value="overdue">Vencida</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-muted-foreground">
                <X className="h-4 w-4 mr-1" /> Limpiar filtros
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters
              ? `Mostrando ${filteredData.length} de ${reportData.length} cuentas (filtros activos)`
              : `${reportData.length} cuentas por cobrar`
            }
          </p>
        </CardHeader>
        <CardContent>
          <ContentTransition
            loading={loading}
            skeleton={<TableSkeleton rows={8} />}
          >
            {filteredData.length === 0 ? (
              <EmptyState
                title={hasActiveFilters ? "Sin resultados" : "Sin cuentas por cobrar"}
                description={hasActiveFilters ? "No se encontraron cuentas con esos filtros" : "Todas las cuentas están al día"}
                actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
                onAction={hasActiveFilters ? clearAllFilters : undefined}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>N° Pedido</TableHead>
                    <TableHead>Fecha Venc.</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center" />
                  </TableRow>
                </TableHeader>
                <AnimatedTableBody>
                  {paginatedData.map((row) => {
                    const urgency = getUrgency(row.dueDate);
                    const daysLabel = getDaysLabel(row.dueDate);
                    const statusInfo = getARStatusInfo(row.status, row.dueDate);
                    const balance = Number(row.balance) || 0;
                    const isPaid = balance <= 0;

                    return (
                      <AnimatedTableRow
                        key={row.orderNumber}
                        className={cn(URGENCY_STYLES[urgency])}
                      >
                        <TableCell className="font-medium">{row.customerName}</TableCell>
                        <TableCell className="text-muted-foreground">{row.orderNumber}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {row.dueDate
                              ? new Date(row.dueDate).toLocaleDateString()
                              : <span className="text-muted-foreground">Sin definir</span>}
                            {daysLabel && <span className={daysLabel.className}>{daysLabel.text}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <DataHighlight value={balance}>
                            {formatCurrency(balance)}
                          </DataHighlight>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!isPaid && (
                            <div className="flex items-center justify-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant={urgency === 'overdue' ? 'destructive' : 'outline'}
                                    size="sm"
                                    className="h-8 gap-1"
                                    onClick={() => {
                                      setSelectedReceivable(row);
                                      setIsPaymentDialogOpen(true);
                                    }}
                                  >
                                    <CreditCard className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">Cobrar</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Registrar cobro de este cliente</TooltipContent>
                              </Tooltip>

                              {/* WhatsApp with message preview */}
                              <Popover>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20"
                                      >
                                        <MessageSquare className="h-3.5 w-3.5" />
                                      </Button>
                                    </PopoverTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Enviar recordatorio por WhatsApp</TooltipContent>
                                </Tooltip>
                                <PopoverContent className="w-80" align="end">
                                  <div className="space-y-3">
                                    <p className="text-sm font-medium">Mensaje de recordatorio</p>
                                    <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                                      {buildWhatsAppMessage(row)}
                                    </p>
                                    <Button
                                      size="sm"
                                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                      onClick={() => {
                                        window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppMessage(row))}`, '_blank');
                                      }}
                                    >
                                      <MessageSquare className="h-4 w-4 mr-2" />
                                      Abrir WhatsApp
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </TableCell>
                      </AnimatedTableRow>
                    );
                  })}
                </AnimatedTableBody>
              </Table>
            )}
          </ContentTransition>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Página {currentPage} de {totalPages} ({filteredData.length} registros)
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <RecordReceivablePaymentDialog
        isOpen={isPaymentDialogOpen}
        onClose={() => setIsPaymentDialogOpen(false)}
        receivable={selectedReceivable}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default AccountsReceivableReport;
