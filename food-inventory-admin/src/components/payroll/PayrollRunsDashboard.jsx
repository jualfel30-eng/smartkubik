import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';
import { fetchApi } from '@/lib/api';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import {
  AlertTriangle,
  BarChart3,
  Bell,
  ClipboardList,
  Copy,
  Download,
  FileText,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const PERIOD_FILTERS = [
  { value: 'all', label: 'Todas las frecuencias' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'custom', label: 'Personalizada' },
];

const STATUS_FILTERS = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'draft', label: 'Borrador' },
  { value: 'calculating', label: 'Calculando' },
  { value: 'calculated', label: 'Calculada' },
  { value: 'posted', label: 'Contabilizada' },
  { value: 'paid', label: 'Pagada' },
];

const ENTRY_FILTERS = [
  { value: 'all', label: 'Todos los conceptos' },
  { value: 'earning', label: 'Devengos' },
  { value: 'deduction', label: 'Deducciones' },
  { value: 'employer', label: 'Aportes patronales' },
];

const statusVariantMap = {
  draft: 'secondary',
  calculating: 'secondary',
  calculated: 'outline',
  posted: 'default',
  paid: 'default',
};

const formatStructureScope = (structure = {}) => {
  const { appliesToRoles = [], appliesToDepartments = [], appliesToContractTypes = [] } = structure;
  const parts = [];
  if (appliesToDepartments?.length) {
    parts.push(`Depto: ${appliesToDepartments.slice(0, 2).join(', ')}`);
  }
  if (appliesToRoles?.length) {
    parts.push(`Rol: ${appliesToRoles.slice(0, 2).join(', ')}`);
  }
  if (appliesToContractTypes?.length) {
    parts.push(`Contrato: ${appliesToContractTypes.slice(0, 2).join(', ')}`);
  }
  return parts.length ? parts.join(' · ') : 'Cubre todos los perfiles';
};

const summarizeRunStructures = (run) => {
  if (!run) return null;
  const summary = run.metadata?.structureSummary;
  if (summary?.structures) {
    return {
      ...summary,
      structures: summary.structures.map((structure, index) => ({
        ...structure,
        structureName:
          structure.structureName ||
          structure.structureId ||
          `Estructura ${index + 1}`,
      })),
    };
  }
  const calculations = Array.isArray(run?.metadata?.calculations)
    ? run.metadata.calculations
    : [];
  if (!calculations.length) {
    return null;
  }
  const map = new Map();
  let legacyEmployees = 0;
  calculations.forEach((calculation) => {
    if (!calculation.structureId || calculation.usedStructure === false) {
      legacyEmployees += 1;
      return;
    }
    const key = `${calculation.structureId}:${calculation.structureVersion ?? "latest"}`;
    if (!map.has(key)) {
      map.set(key, {
        structureId: calculation.structureId,
        structureVersion: calculation.structureVersion,
        structureName: calculation.structureId,
        appliesToRoles: [],
        appliesToDepartments: [],
        appliesToContractTypes: [],
        periodType: undefined,
        employees: 0,
      });
    }
    const entry = map.get(key);
    if (entry) {
      entry.employees += 1;
    }
  });
  const structures = Array.from(map.values()).map((structure, index) => ({
    ...structure,
    structureName:
      structure.structureName && structure.structureName !== structure.structureId
        ? structure.structureName
        : `Estructura ${index + 1}`,
  }));
  const structuredEmployees = structures.reduce((sum, structure) => sum + structure.employees, 0);
  const totalEmployees = run.totalEmployees || structuredEmployees + legacyEmployees;
  const coveragePercent =
    totalEmployees > 0 ? Math.round((structuredEmployees / totalEmployees) * 100) : 0;
  return {
    totalEmployees,
    structuredEmployees,
    legacyEmployees,
    coveragePercent,
    structures: structures.sort((a, b) => b.employees - a.employees),
  };
};

const formatCurrency = (value, currency = 'USD') => {
  if (typeof value !== 'number') return '—';
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'https://api.smartkubik.com/api/v1';
  }
  const devHostnames = ['localhost', '127.0.0.1'];
  return devHostnames.includes(window.location.hostname)
    ? 'http://localhost:3000/api/v1'
    : 'https://api.smartkubik.com/api/v1';
};

const PayrollRunsDashboard = () => {
  const { tenant, hasPermission } = useAuth();
  const navigate = useNavigate();
  const payrollEnabled = Boolean(tenant?.enabledModules?.payroll);
  const canReadPayroll = hasPermission ? hasPermission('payroll_employees_read') : false;
  const canWritePayroll = hasPermission ? hasPermission('payroll_employees_write') : false;
  const currency = tenant?.currency || 'USD';

  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({ periodType: 'all', status: 'all' });
  const [concepts, setConcepts] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [exportingRunKey, setExportingRunKey] = useState('');
  const [entriesFilter, setEntriesFilter] = useState('all');
  const [newRunForm, setNewRunForm] = useState({
    periodType: 'monthly',
    periodStart: '',
    periodEnd: '',
    label: '',
    dryRun: false,
  });
  const [creatingRun, setCreatingRun] = useState(false);

  const latestRun = runs[0] || null;
  const previousRun = runs[1] || null;
  const selectedRunStructureSummary = useMemo(
    () => summarizeRunStructures(selectedRun),
    [selectedRun],
  );

  const conceptStats = useMemo(() => {
    if (!concepts.length) {
      return { earning: 0, deduction: 0, employer: 0 };
    }
    return concepts.reduce(
      (acc, concept) => {
        acc[concept.conceptType] = (acc[concept.conceptType] || 0) + 1;
        return acc;
      },
      { earning: 0, deduction: 0, employer: 0 },
    );
  }, [concepts]);

  const conceptWarnings = useMemo(
    () => concepts.filter((concept) => !concept.debitAccountId || !concept.creditAccountId),
    [concepts],
  );

  const entriesSummary = useMemo(() => {
    if (!selectedRun?.entries?.length) {
      return { earning: 0, deduction: 0, employer: 0 };
    }
    return selectedRun.entries.reduce(
      (acc, entry) => {
        acc[entry.conceptType] = (acc[entry.conceptType] || 0) + (entry.amount || 0);
        return acc;
      },
      { earning: 0, deduction: 0, employer: 0 },
    );
  }, [selectedRun]);

  const filteredEntries = useMemo(() => {
    if (!selectedRun?.entries) return [];
    if (entriesFilter === 'all') return selectedRun.entries;
    return selectedRun.entries.filter((entry) => entry.conceptType === entriesFilter);
  }, [selectedRun, entriesFilter]);

  const loadRuns = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingRuns(true);
    try {
      const params = new URLSearchParams();
      params.set('page', pagination.page.toString());
      params.set('limit', '10');
      if (filters.periodType !== 'all') params.set('periodType', filters.periodType);
      if (filters.status !== 'all') params.set('status', filters.status);
      const response = await fetchApi(`/payroll/runs?${params.toString()}`);
      setRuns(Array.isArray(response?.data) ? response.data : []);
      const nextPagination = response?.pagination || {};
      setPagination((prev) => ({
        page: nextPagination.page || prev.page,
        totalPages: nextPagination.totalPages || prev.totalPages || 1,
      }));
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar las nóminas');
    } finally {
      setLoadingRuns(false);
    }
  }, [payrollEnabled, canReadPayroll, filters.periodType, filters.status, pagination.page]);

  const loadConcepts = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingConcepts(true);
    try {
      const data = await fetchApi('/payroll/concepts');
      setConcepts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar los conceptos');
    } finally {
      setLoadingConcepts(false);
    }
  }, [payrollEnabled, canReadPayroll]);

  const openStructureBuilder = useCallback(
    (structureId) => {
      if (!structureId) return;
      navigate(`/payroll/structures?structureId=${structureId}`);
    },
    [navigate],
  );

  useEffect(() => {
    loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    loadConcepts();
  }, [loadConcepts]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (direction) => {
    setPagination((prev) => {
      const nextPage = Math.max(1, Math.min((prev.totalPages || 1), prev.page + direction));
      return { ...prev, page: nextPage };
    });
  };

  const handleCreateRun = async () => {
    if (!canWritePayroll) {
      toast.error('No tienes permisos para generar nóminas');
      return;
    }
    if (!newRunForm.periodStart || !newRunForm.periodEnd) {
      toast.error('Selecciona las fechas de inicio y fin');
      return;
    }
    setCreatingRun(true);
    try {
      const payload = {
        ...newRunForm,
        periodStart: new Date(newRunForm.periodStart).toISOString(),
        periodEnd: new Date(newRunForm.periodEnd).toISOString(),
      };
      await fetchApi('/payroll/runs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      toast.success(newRunForm.dryRun ? 'Simulación generada' : 'Nómina creada');
      setCreateDialogOpen(false);
      setNewRunForm((prev) => ({
        ...prev,
        periodStart: '',
        periodEnd: '',
        label: '',
        dryRun: false,
      }));
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadRuns();
    } catch (error) {
      toast.error(error.message || 'No se pudo crear la nómina');
    } finally {
      setCreatingRun(false);
    }
  };

  const loadAuditLogs = useCallback(async (runId) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({ entity: 'payrollRun', entityId: runId, limit: '30' });
      const logs = await fetchApi(`/payroll/audit?${params.toString()}`);
      setAuditLogs(Array.isArray(logs) ? logs : logs?.data || []);
    } catch {
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  }, []);

  const openDetail = async (run) => {
    setDetailDrawerOpen(true);
    setDetailLoading(true);
    setEntriesFilter('all');
    try {
      const detail = await fetchApi(`/payroll/runs/${run._id}`);
      setSelectedRun(detail?.data || detail || run);
      loadAuditLogs(run._id);
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el detalle');
      setSelectedRun(run);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedRun(null);
    setAuditLogs([]);
  };

  const downloadRun = async (runId, format) => {
    if (!runId || !format) return;
    const key = `${runId}-${format}`;
    setExportingRunKey(key);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${getApiBaseUrl()}/payroll/runs/${runId}/export?format=${format}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'No se pudo exportar la nómina');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
        `payroll-run.${format}`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Archivo descargado');
    } catch (error) {
      toast.error(error.message || 'No se pudo completar la descarga');
    } finally {
      setExportingRunKey('');
    }
  };

  const shareByEmail = (run) => {
    if (!run) return;
    const subject = encodeURIComponent(`Resumen de nómina ${run.label || ''}`);
    const body = encodeURIComponent(
      `Consulta la nómina ${run.label || ''} (${formatDate(run.periodStart)} - ${formatDate(run.periodEnd)}).\n\nPuedes descargarla en ${window.location.origin}/payroll/runs`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyJournalEntry = (entryId) => {
    if (!entryId) return;
    navigator.clipboard.writeText(entryId).then(() => {
      toast.success('Referencia copiada');
    });
  };

  if (!payrollEnabled) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        El módulo de nómina no está habilitado para este tenant.
      </div>
    );
  }

  if (!canReadPayroll) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No tienes permisos para visualizar la información de nómina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nómina y payroll runs</h1>
          <p className="text-sm text-muted-foreground">
            Controla tus ciclos de nómina, valida los asientos automáticos y revisa la auditoría desde un solo dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadRuns} disabled={loadingRuns}>
            {loadingRuns ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Actualizar
          </Button>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={!canWritePayroll}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Nuevo ciclo
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Costo neto actual</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(latestRun?.netPay || 0, currency)}</div>
            <p className="text-xs text-muted-foreground">
              {previousRun
                ? `${latestRun?.netPay >= previousRun.netPay ? '▲' : '▼'} ${formatCurrency(Math.abs((latestRun?.netPay || 0) - (previousRun?.netPay || 0)), currency)} vs anterior`
                : 'Sin histórico previo'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deducciones totales</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{formatCurrency(latestRun?.deductions || 0, currency)}</div>
            <p className="text-xs text-muted-foreground">Retenciones y aportes legales de la última ejecución.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados procesados</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{latestRun?.totalEmployees || 0}</div>
            <p className="text-xs text-muted-foreground">Periodo {formatDate(latestRun?.periodEnd)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Historial de nóminas</CardTitle>
            <CardDescription>Filtra por frecuencia y estado para comparar ejecuciones.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Select value={filters.periodType} onValueChange={(value) => handleFilterChange('periodType', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Frecuencia" />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Empleados</TableHead>
                  <TableHead>Bruto</TableHead>
                  <TableHead>Neto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingRuns ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : runs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                      Aún no se han generado nóminas.
                    </TableCell>
                  </TableRow>
                ) : (
                  runs.map((run) => {
                    const structureSummary = summarizeRunStructures(run);
                    return (
                      <TableRow key={run._id}>
                      <TableCell>
                        <div className="font-medium">{run.label || 'Sin título'}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(run.periodStart)} - {formatDate(run.periodEnd)}
                        </div>
                        {structureSummary && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {structureSummary.coveragePercent || 0}% cobertura
                            </Badge>
                            {structureSummary.structures.slice(0, 2).map((structure) => (
                              <Badge
                                key={`${structure.structureId}-${structure.structureVersion || 'latest'}`}
                                variant="outline"
                                className="cursor-pointer text-xs"
                                onClick={() => openStructureBuilder(structure.structureId)}
                              >
                                {structure.structureName || 'Estructura'}
                                {structure.structureVersion ? ` · v${structure.structureVersion}` : ''}
                                <span className="ml-1 text-muted-foreground">· {structure.employees}</span>
                              </Badge>
                            ))}
                            {structureSummary.structures.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{structureSummary.structures.length - 2}
                              </Badge>
                            )}
                            {structureSummary.legacyEmployees > 0 && (
                              <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                                {structureSummary.legacyEmployees} sin estructura
                              </Badge>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{run.periodType}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariantMap[run.status] || 'outline'} className="capitalize">
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{run.totalEmployees}</TableCell>
                      <TableCell>{formatCurrency(run.grossPay, currency)}</TableCell>
                      <TableCell>{formatCurrency(run.netPay, currency)}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDetail(run)}>
                            Detalles
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadRun(run._id, 'csv')}
                            disabled={exportingRunKey === `${run._id}-csv`}
                          >
                            {exportingRunKey === `${run._id}-csv` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Download className="mr-1 h-4 w-4" />
                                CSV
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => downloadRun(run._id, 'pdf')}
                            disabled={exportingRunKey === `${run._id}-pdf`}
                          >
                            {exportingRunKey === `${run._id}-pdf` ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <FileText className="mr-1 h-4 w-4" />
                                PDF
                              </>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Página {pagination.page} de {pagination.totalPages || 1}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pagination.page <= 1} onClick={() => handlePageChange(-1)}>
                Anterior
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pagination.page >= (pagination.totalPages || 1)}
                onClick={() => handlePageChange(1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Conceptos de nómina</CardTitle>
              <CardDescription>Sincroniza cuentas contables para cada concepto y evita asientos huérfanos.</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs font-normal">
              {concepts.length} conceptos
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {conceptStats.earning} devengos · {conceptStats.deduction} deducciones · {conceptStats.employer} aportes patronales.
          </p>
          {conceptWarnings.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Asignaciones contables pendientes</AlertTitle>
              <AlertDescription>
                {conceptWarnings.length} concepto(s) sin cuenta de débito o crédito. Configúralos para mantener la trazabilidad de los asientos.
              </AlertDescription>
            </Alert>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Débito</TableHead>
                  <TableHead>Crédito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingConcepts ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : concepts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                      No hay conceptos configurados todavía.
                    </TableCell>
                  </TableRow>
                ) : (
                  concepts.map((concept) => (
                    <TableRow key={concept._id}>
                      <TableCell>{concept.code}</TableCell>
                      <TableCell>{concept.name}</TableCell>
                      <TableCell className="capitalize">{concept.conceptType}</TableCell>
                      <TableCell>
                        {concept.debitAccountId ? (
                          concept.debitAccountId
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {concept.creditAccountId ? (
                          concept.creditAccountId
                        ) : (
                          <Badge variant="outline" className="text-[11px]">
                            Pendiente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo ciclo de nómina</DialogTitle>
            <DialogDescription>Define las fechas y, si lo necesitas, genera una simulación en tiempo real.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Frecuencia</Label>
              <Select value={newRunForm.periodType} onValueChange={(value) => setNewRunForm((prev) => ({ ...prev, periodType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_FILTERS.filter((option) => option.value !== 'all').map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Inicio</Label>
                <Input type="date" value={newRunForm.periodStart} onChange={(event) => setNewRunForm((prev) => ({ ...prev, periodStart: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Fin</Label>
                <Input type="date" value={newRunForm.periodEnd} onChange={(event) => setNewRunForm((prev) => ({ ...prev, periodEnd: event.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Etiqueta</Label>
              <Input placeholder="Ej. Nómina marzo" value={newRunForm.label} onChange={(event) => setNewRunForm((prev) => ({ ...prev, label: event.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Simulación</p>
                <p className="text-xs text-muted-foreground">Calcula sin generar asientos contables ni afectar reportes.</p>
              </div>
              <Switch checked={newRunForm.dryRun} onCheckedChange={(checked) => setNewRunForm((prev) => ({ ...prev, dryRun: checked }))} />
            </div>
          </div>
          <DialogFooter className="sm:space-x-0 sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creatingRun}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleCreateRun} disabled={creatingRun}>
              {creatingRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              {newRunForm.dryRun ? 'Simular' : 'Crear nómina'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={detailDrawerOpen} onOpenChange={(open) => (open ? setDetailDrawerOpen(true) : closeDetail())}>
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="space-y-1 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <DrawerTitle>{selectedRun?.label || 'Detalle de nómina'}</DrawerTitle>
                <DrawerDescription>
                  {formatDate(selectedRun?.periodStart)} - {formatDate(selectedRun?.periodEnd)} · {selectedRun?.totalEmployees || 0} empleados
                </DrawerDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => shareByEmail(selectedRun)} disabled={!selectedRun}>
                  <Mail className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadRun(selectedRun?._id, 'pdf')}
                  disabled={!selectedRun || exportingRunKey === `${selectedRun?._id}-pdf`}
                >
                  {exportingRunKey === `${selectedRun?._id}-pdf` ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  PDF
                </Button>
              </div>
            </div>
          </DrawerHeader>
          <div className="grid gap-4 p-4">
            {detailLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedRun ? (
              <div className="min-h-[200px] text-center text-sm text-muted-foreground">Selecciona una nómina para ver detalles.</div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Estado</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge variant={statusVariantMap[selectedRun.status] || 'outline'} className="capitalize">
                        {selectedRun.status}
                      </Badge>
                      {selectedRun.metadata?.dryRun && (
                        <p className="mt-2 text-xs text-muted-foreground">Simulación (no genera asientos)</p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Bruto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">{formatCurrency(selectedRun.grossPay, currency)}</div>
                      <p className="text-xs text-muted-foreground">Incluye bonos y ajustes.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">{formatCurrency(selectedRun.deductions, currency)}</div>
                      <p className="text-xs text-muted-foreground">Impuestos, retenciones y préstamos.</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Costo neto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">{formatCurrency(selectedRun.netPay, currency)}</div>
                      <p className="text-xs text-muted-foreground">Pagos al empleado.</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Integración contable</CardTitle>
                      <CardDescription>Seguimiento del asiento generado automáticamente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRun.metadata?.journalEntryId ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 text-xs">{selectedRun.metadata.journalEntryId}</code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => copyJournalEntry(selectedRun.metadata?.journalEntryId)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          En cuanto la nómina se contabilice verás aquí el identificador del asiento.
                        </p>
                      )}
                      <Alert className="bg-muted/60">
                        <Bell className="h-4 w-4" />
                        <AlertTitle>Asignaciones por tipo</AlertTitle>
                        <AlertDescription>
                          {formatCurrency(entriesSummary.earning, currency)} devengos · {formatCurrency(entriesSummary.deduction, currency)} deducciones ·{' '}
                          {formatCurrency(entriesSummary.employer, currency)} aportes patronales.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Cobertura por estructura</CardTitle>
                      <CardDescription>Verifica qué estructuras se usaron al calcular la nómina.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRunStructureSummary ? (
                        <>
                          <div className="text-sm">
                            {selectedRunStructureSummary.coveragePercent || 0}% de empleados con estructura (
                            {selectedRunStructureSummary.structuredEmployees || 0}/{selectedRunStructureSummary.totalEmployees || 0})
                          </div>
                          {selectedRunStructureSummary.legacyEmployees > 0 && (
                            <p className="text-xs text-amber-600">
                              {selectedRunStructureSummary.legacyEmployees} empleado
                              {selectedRunStructureSummary.legacyEmployees === 1 ? '' : 's'} se calcularon con reglas legacy.
                            </p>
                          )}
                          {selectedRunStructureSummary.structures.length > 0 ? (
                            <div className="space-y-2">
                              {selectedRunStructureSummary.structures.map((structure) => (
                                <div
                                  key={`${structure.structureId}-${structure.structureVersion || 'latest'}`}
                                  className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div>
                                    <p className="text-sm font-medium">
                                      {structure.structureName || 'Estructura'}
                                      {structure.structureVersion ? ` · v${structure.structureVersion}` : ''}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {structure.employees} empleado{structure.employees === 1 ? '' : 's'} ·{' '}
                                      {formatStructureScope(structure)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => openStructureBuilder(structure.structureId)}
                                  >
                                    Ver estructura
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Todos los empleados se calcularon sin estructuras asignadas.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Esta nómina se generó antes de capturar la información de estructuras.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Bitácora</CardTitle>
                      <CardDescription>Auditoría completa de cambios y cálculos.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {auditLoading ? (
                        <div className="flex h-40 items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Sin movimientos registrados.</p>
                      ) : (
                        <ScrollArea className="h-48">
                          <div className="space-y-3">
                            {auditLogs.map((log) => (
                              <div key={log._id || `${log.action}-${log.createdAt}`} className="rounded-md border p-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="font-medium capitalize">{log.action}</span>
                                  <span>{formatDateTime(log.createdAt)}</span>
                                </div>
                                {log.metadata?.note && <p className="mt-1 text-sm">{log.metadata.note}</p>}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Detalle de conceptos</CardTitle>
                      <CardDescription>Explora cada entrada calculada por empleado y concepto.</CardDescription>
                    </div>
                    <Select value={entriesFilter} onValueChange={setEntriesFilter}>
                      <SelectTrigger className="w-full sm:w-56">
                        <SelectValue placeholder="Filtrar por tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {ENTRY_FILTERS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </CardHeader>
                  <CardContent>
                    {filteredEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Sin entradas para el filtro seleccionado.</p>
                    ) : (
                      <ScrollArea className="h-[320px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Empleado</TableHead>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead className="text-right">Monto</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEntries.map((entry, index) => (
                              <TableRow key={`${entry.employeeId}-${entry.conceptCode}-${index}`}>
                                <TableCell>
                                  <div className="font-medium">{entry.employeeName || entry.employeeId}</div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{entry.conceptName || entry.conceptCode}</div>
                                  <p className="text-xs text-muted-foreground">{entry.conceptCode}</p>
                                </TableCell>
                                <TableCell className="capitalize">{entry.conceptType}</TableCell>
                                <TableCell>{entry.department || '—'}</TableCell>
                                <TableCell className="text-right">{formatCurrency(entry.amount, currency)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default PayrollRunsDashboard;
