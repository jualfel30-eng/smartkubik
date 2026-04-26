import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchApi } from '../lib/api';
import { Table, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, CreditCard, MessageSquare, Eye, X, Search } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatedTableBody, AnimatedTableRow } from '@/components/ui/animated-table-body';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/currency-utils';
import { fadeUp } from '@/lib/motion';
import ARSummaryCards from './accounts-receivable/ARSummaryCards';
import RecordReceivablePaymentDialog from './accounts-receivable/RecordReceivablePaymentDialog';

const getUrgency = (dueDate, status) => {
  if (status === 'paid') return 'current';
  if (!dueDate) return 'current';
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return 'overdue';
  if (days > -7) return 'due-soon';
  return 'current';
};

const urgencyStyles = {
  overdue: 'border-l-4 border-l-red-500 bg-red-500/5',
  'due-soon': 'border-l-4 border-l-amber-500',
  current: '',
};

const getDaysLabel = (dueDate) => {
  if (!dueDate) return null;
  const days = Math.floor((new Date() - new Date(dueDate)) / 86400000);
  if (days > 0) return { text: `Vencida hace ${days} día${days === 1 ? '' : 's'}`, className: 'text-destructive text-xs' };
  if (days === 0) return { text: 'Vence hoy', className: 'text-amber-600 dark:text-amber-400 text-xs' };
  if (days > -7) return { text: `Vence en ${Math.abs(days)} día${Math.abs(days) === 1 ? '' : 's'}`, className: 'text-amber-600 dark:text-amber-400 text-xs' };
  return null;
};

const getStatusBadge = (status, dueDate) => {
  const isOverdue = dueDate && new Date(dueDate) < new Date();
  if (status === 'paid') return { variant: 'default', label: 'Pagado', className: 'bg-success/10 text-green-800 dark:text-green-400' };
  if (status === 'partial') return { variant: 'secondary', label: 'Parcial', className: 'bg-warning/10 text-yellow-800 dark:text-yellow-400' };
  if (isOverdue) return { variant: 'destructive', label: 'Vencida', className: '' };
  return { variant: 'outline', label: 'Pendiente', className: '' };
};

const sendWhatsAppReminder = (row) => {
  const msg = `Hola ${row.customerName}, le recordamos que tiene un saldo pendiente de ${formatCurrency(Number(row.balance))} correspondiente a la orden #${row.orderNumber}. Agradecemos su pronto pago. Gracias.`;
  window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
};

const AccountsReceivableReport = () => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [agingFilter, setAgingFilter] = useState(null);

  // Payment dialog
  const [selectedReceivable, setSelectedReceivable] = useState(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [flashRowId, setFlashRowId] = useState(null);

  // Pagination
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

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  // Filtered data
  const filteredData = useMemo(() => {
    let result = reportData;

    // Search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(row =>
        row.customerName?.toLowerCase().includes(search) ||
        row.orderNumber?.toString().toLowerCase().includes(search)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        result = result.filter(row => row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'paid');
      } else {
        result = result.filter(row => row.status === statusFilter);
      }
    }

    // Aging filter from summary cards
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

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(start, start + itemsPerPage);
  }, [filteredData, currentPage]);

  // Reset page on filter change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, agingFilter]);

  const handleAgingFilterChange = (filter) => {
    setAgingFilter(prev => prev === filter ? null : filter);
  };

  const handlePaymentSuccess = () => {
    const paidId = selectedReceivable?.orderNumber;
    setIsPaymentDialogOpen(false);
    fetchReport();
    if (paidId) {
      setFlashRowId(paidId);
      setTimeout(() => setFlashRowId(null), 1500);
    }
  };

  const hasActiveFilters = searchTerm || statusFilter !== 'all' || agingFilter;

  const clearAllFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setAgingFilter(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse dark:bg-slate-900 dark:border-slate-800">
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded w-1/2 mb-1"></div>
                <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
        </div>
        <div className="bg-destructive/5 border border-red-200 rounded-lg p-4 dark:bg-red-950/20 dark:border-red-900/50">
          <p className="text-destructive text-sm dark:text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/accounting-management')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold">Cuentas por Cobrar</h1>
      </div>

      {/* Summary Cards */}
      <ARSummaryCards
        data={reportData}
        activeFilter={agingFilter}
        onFilterChange={handleAgingFilterChange}
      />

      {/* Filter Bar */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente u orden..."
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
            Mostrando {filteredData.length} de {reportData.length} cuentas
          </p>
        </CardHeader>
        <CardContent>
          {filteredData.length === 0 ? (
            <EmptyState
              title="Sin cuentas por cobrar"
              description={hasActiveFilters ? "No se encontraron cuentas con esos filtros" : "Todas las cuentas están al día"}
              actionLabel={hasActiveFilters ? "Limpiar filtros" : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead># Orden</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha Orden</TableHead>
                  <TableHead>Fecha Vencimiento</TableHead>
                  <TableHead className="text-right">Monto Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <AnimatedTableBody>
                {paginatedData.map((row) => {
                  const urgency = getUrgency(row.dueDate, row.status);
                  const daysLabel = getDaysLabel(row.dueDate);
                  const statusBadge = getStatusBadge(row.status, row.dueDate);
                  const balance = Number(row.balance) || 0;
                  const isPaid = balance <= 0;

                  return (
                    <AnimatedTableRow
                      key={row.orderNumber}
                      className={cn(urgencyStyles[urgency])}
                      animate={flashRowId === row.orderNumber
                        ? { backgroundColor: ['rgba(16,185,129,0.3)', 'rgba(16,185,129,0)', 'transparent'] }
                        : {}
                      }
                      transition={flashRowId === row.orderNumber ? { duration: 1.5 } : {}}
                    >
                      <TableCell className="font-medium">{row.orderNumber}</TableCell>
                      <TableCell>{row.customerName}</TableCell>
                      <TableCell>{new Date(row.orderDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          {row.dueDate ? new Date(row.dueDate).toLocaleDateString() : <span className="text-gray-400 italic">N/A</span>}
                          {daysLabel && <span className={daysLabel.className}>{daysLabel.text}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(row.totalAmount))}</TableCell>
                      <TableCell className="text-right text-success">{formatCurrency(Number(row.paidAmount))}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(balance)}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} className={statusBadge.className}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          {!isPaid && (
                            <>
                              <Button
                                variant={urgency === 'overdue' ? 'destructive' : 'outline'}
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => {
                                  setSelectedReceivable(row);
                                  setIsPaymentDialogOpen(true);
                                }}
                                title="Registrar cobro"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20"
                                onClick={() => sendWhatsAppReminder(row)}
                                title="Enviar recordatorio por WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </AnimatedTableRow>
                  );
                })}
              </AnimatedTableBody>
            </Table>
          )}

          {/* Pagination */}
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

      {/* Payment Dialog */}
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
