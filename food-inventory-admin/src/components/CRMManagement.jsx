import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu.jsx';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Phone,
  Mail,
  MapPin,
  Building,
  ShieldCheck,
  DollarSign,
  UserCheck,
  RefreshCw,
  Bell,
  CalendarClock,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import { useCRM } from '@/hooks/use-crm.js';
import { useAuth } from '@/hooks/use-auth';
import { LocationPicker } from '@/components/ui/LocationPicker.jsx';
import EmployeeDetailDrawer from '@/components/payroll/EmployeeDetailDrawer.jsx';
import { CustomerDetailDialog } from '@/components/CustomerDetailDialog.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';

const DEFAULT_PAGE_LIMIT = 25;
const SEARCH_PAGE_LIMIT = 100;
const SEARCH_DEBOUNCE_MS = 600;

const exportRowsToCsv = (headers, rows, filename) => {
  const csvRows = [headers, ...rows]
    .map((row) =>
      row
        .map((value) => {
          if (value === null || value === undefined) return '""';
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(','),
    )
    .join('\n');

  const blob = new Blob([`\uFEFF${csvRows}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const describeStructureDimension = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 'Todos';
  const normalized = values.filter(Boolean);
  if (!normalized.length) return 'Todos';
  if (normalized.includes('*')) return 'Todos';
  return normalized.join(' | ');
};

const formatDateForCsv = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toISOString().split('T')[0];
  } catch {
    return value;
  }
};

const initialNewContactState = {
  name: '',
  customerType: 'business', // Default value
  email: '',
  phone: '',
  companyName: '',
  address: '',
  city: '',
  state: '',
  notes: '',
  taxType: 'V',
  taxId: '',
  primaryLocation: null
};

function CRMManagement({ forceEmployeeTab = false, hideEmployeeTab = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tenant } = useAuth();
  const {
    crmData,
    loading,
    error,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loadCustomers,
    currentPage,
    pageLimit,
    totalCustomers,
    totalPages,
    setCurrentPage,
    employeesData,
    employeesLoading,
    employeesError,
    employeesPagination,
    employeeSummary,
    loadEmployees,
    loadEmployeeSummary,
    refreshEmployeesData,
    bulkReinviteEmployees,
    bulkUpdateEmployeeStatus,
    bulkNotifyEmployees,
    reconcileEmployeeProfiles,
  } = useCRM();
  const initialTabRaw = forceEmployeeTab ? 'employee' : searchParams.get('tab') || 'all';
  const initialTab = hideEmployeeTab && initialTabRaw === 'employee' ? 'all' : initialTabRaw;
  const [filteredData, setFilteredData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(initialTab);
  const [filterTier] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [committedSearch, setCommittedSearch] = useState('');
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeCommittedSearch, setEmployeeCommittedSearch] = useState('');
  const [employeeStatusFilter, setEmployeeStatusFilter] = useState('all');
  const [employeeDepartmentFilter, setEmployeeDepartmentFilter] = useState('all');
  const [employeeStructureFilter, setEmployeeStructureFilter] = useState('all');
  const [employeePage, setEmployeePage] = useState(1);
  const EMPLOYEE_PAGE_LIMIT = 25;
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(() => new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Customer Detail Dialog
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [selectedEmployeeSnapshot, setSelectedEmployeeSnapshot] = useState(null);
  const [isEmployeeDrawerOpen, setIsEmployeeDrawerOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyTemplate, setNotifyTemplate] = useState('payroll-status-update');
  const [notifyChannels, setNotifyChannels] = useState(['email']);
  const [notifyMessage, setNotifyMessage] = useState('');
  const [reconcileLoading, setReconcileLoading] = useState(false);
  const [structureDialogOpen, setStructureDialogOpen] = useState(false);
  const [structureOptions, setStructureOptions] = useState([]);
  const [structureSelection, setStructureSelection] = useState('');
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureApplyFilters, setStructureApplyFilters] = useState({
    onlyActiveContracts: true,
    excludeAlreadyAssigned: true,
  });
  const notificationChannelOptions = [
    { value: 'email', label: 'Correo electrónico' },
    { value: 'whatsapp', label: 'WhatsApp' },
  ];
  const notificationTemplates = [
    { value: 'payroll-status-update', label: 'Actualización de estado' },
    { value: 'payroll-documents-reminder', label: 'Recordatorio de documentos faltantes' },
  ];

  // Sincronizar filterType con searchParams cuando cambia la URL
  useEffect(() => {
    if (forceEmployeeTab && filterType !== 'employee') {
      setFilterType('employee');
      setSearchParams({ tab: 'employee' }, { replace: true });
      return;
    }
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== filterType && !(hideEmployeeTab && tabFromUrl === 'employee')) {
      setFilterType(tabFromUrl);
    }
    if (hideEmployeeTab && filterType === 'employee') {
      setFilterType('all');
      setSearchParams({ tab: 'all' }, { replace: true });
    }
  }, [searchParams, filterType, forceEmployeeTab, hideEmployeeTab, setSearchParams]);

  // Manejador para cambiar tabs (actualiza estado y URL)
  const handleTabChange = (newTab) => {
    if (forceEmployeeTab) return;
    if (hideEmployeeTab && newTab === 'employee') return;
    setFilterType(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  };
  const manualPageLimitRef = useRef(DEFAULT_PAGE_LIMIT);
  const lastQueryRef = useRef({
    search: null,
    customerType: null,
    limit: null,
  });
  const currentFilters = useMemo(() => {
    const filters = {};
    if (committedSearch) {
      filters.search = committedSearch;
    }
    if (filterType !== 'all') {
      filters.customerType = filterType;
    }
    return filters;
  }, [committedSearch, filterType]);
  const employeeFilters = useMemo(
    () => ({
      search: employeeCommittedSearch,
      status: employeeStatusFilter,
      department: employeeDepartmentFilter,
      structureId: employeeStructureFilter,
    }),
    [employeeCommittedSearch, employeeStatusFilter, employeeDepartmentFilter, employeeStructureFilter],
  );

  const employeeStatusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'active', label: 'Activos' },
    { value: 'onboarding', label: 'Onboarding' },
    { value: 'suspended', label: 'Suspendidos' },
    { value: 'terminated', label: 'Terminados' },
    { value: 'draft', label: 'Borrador' },
  ];

  const employeeDepartmentOptions = useMemo(() => {
    if (!employeeSummary?.byDepartment) return [];
    return Object.keys(employeeSummary.byDepartment).filter(Boolean);
  }, [employeeSummary]);
  const employeeStructureOptions = useMemo(() => {
    const baseOptions = [
      { value: 'all', label: 'Todas' },
      { value: 'none', label: 'Sin estructura' },
    ];
    if (!structureOptions?.length) {
      return baseOptions;
    }
    return baseOptions.concat(
      structureOptions.map((structure) => ({
        value: structure._id,
        label: structure.name,
      })),
    );
  }, [structureOptions]);

  const isEmployeeTab = forceEmployeeTab || filterType === 'employee';
  const showEmployeeTab = forceEmployeeTab || !hideEmployeeTab;
  const selectedEmployees = useMemo(
    () => employeesData.filter((employee) => selectedEmployeeIds.has(employee._id)),
    [employeesData, selectedEmployeeIds],
  );
  const selectedEmployeesCount = selectedEmployees.length;
  const isAllEmployeesSelected =
    employeesData.length > 0 && selectedEmployeesCount === employeesData.length;
  const isSomeEmployeesSelected =
    selectedEmployeesCount > 0 && selectedEmployeesCount < employeesData.length;

  const reloadCustomers = useCallback(
    async (page, limit, filtersOverride) => {
      const filtersToUse = filtersOverride ?? currentFilters;
      lastQueryRef.current = {
        search: filtersToUse?.search ?? '',
        customerType: filtersToUse?.customerType ?? 'all',
        limit,
      };
      await loadCustomers(page, limit, filtersToUse);
    },
    [currentFilters, loadCustomers],
  );

  useEffect(() => {
    const trimmed = searchTerm.trim();
    if (trimmed === '') {
      setCommittedSearch('');
      return;
    }
    const timeoutId = setTimeout(() => {
      setCommittedSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  useEffect(() => {
    if (!isEmployeeTab) return;
    const trimmed = employeeSearchTerm.trim();
    if (trimmed === '') {
      setEmployeeCommittedSearch('');
      return;
    }
    const timeoutId = setTimeout(() => {
      setEmployeeCommittedSearch(trimmed);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeoutId);
  }, [employeeSearchTerm, isEmployeeTab]);

  useEffect(() => {
    if (filterType === 'employee') {
      return;
    }
    const effectiveLimit = committedSearch
      ? Math.max(manualPageLimitRef.current, SEARCH_PAGE_LIMIT)
      : manualPageLimitRef.current;

    const normalizedSearch = committedSearch || '';
    const normalizedCustomerType = filterType !== 'all' ? filterType : 'all';

    if (
      lastQueryRef.current.search === normalizedSearch &&
      lastQueryRef.current.customerType === normalizedCustomerType &&
      lastQueryRef.current.limit === effectiveLimit
    ) {
      return;
    }

    setCurrentPage(1);
    reloadCustomers(1, effectiveLimit, currentFilters);
  }, [committedSearch, filterType, currentFilters, reloadCustomers, setCurrentPage]);

  const [selectedContactId, setSelectedContactId] = useState(null);
  const [editingFormState, setEditingFormState] = useState({});
  const [newContact, setNewContact] = useState(initialNewContactState);
  const currentSearchValue = isEmployeeTab ? employeeSearchTerm : searchTerm;

  useEffect(() => {
    if (isEmployeeTab && newContact.customerType !== 'employee') {
      setNewContact((prev) => ({ ...prev, customerType: 'employee' }));
    }
  }, [isEmployeeTab, newContact.customerType]);

  useEffect(() => {
    if (!isEmployeeTab) return;
    loadEmployees(1, EMPLOYEE_PAGE_LIMIT, employeeFilters);
    setEmployeePage(1);
    loadEmployeeSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployeeTab]);

  useEffect(() => {
    if (!isEmployeeTab) return;
    loadEmployees(employeePage, EMPLOYEE_PAGE_LIMIT, employeeFilters);
  }, [isEmployeeTab, employeePage, employeeFilters, loadEmployees]);

  useEffect(() => {
    if (!isEmployeeTab) return;
    setEmployeePage(1);
  }, [employeeFilters, isEmployeeTab, employeeCommittedSearch]);

  useEffect(() => {
    setSelectedEmployeeIds((prev) => {
      const availableIds = new Set(employeesData.map((employee) => employee._id));
      const next = new Set();
      prev.forEach((id) => {
        if (availableIds.has(id)) {
          next.add(id);
        }
      });
      return next;
    });
  }, [employeesData]);

  useEffect(() => {
    if (!isEmployeeTab && selectedEmployeeIds.size > 0) {
      setSelectedEmployeeIds(new Set());
    }
  }, [isEmployeeTab, selectedEmployeeIds.size]);

  const getTierBadge = (tier) => {
    const tierMap = {
      diamante: { label: 'Diamante', icon: '💎', className: 'bg-blue-100 text-blue-800 border-blue-300' },
      oro: { label: 'Oro', icon: '🥇', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      plata: { label: 'Plata', icon: '🥈', className: 'bg-gray-100 text-gray-800 border-gray-300' },
      bronce: { label: 'Bronce', icon: '🥉', className: 'bg-amber-100 text-amber-800 border-amber-300' },
    };
    const tierInfo = tierMap[tier] || { label: tier || 'Sin tier', icon: '', className: 'bg-gray-50 text-gray-600 border-gray-200' };
    return (
      <Badge className={`${tierInfo.className} border`}>
        {tierInfo.icon && <span className="mr-1">{tierInfo.icon}</span>}
        {tierInfo.label}
      </Badge>
    );
  };

  const getContactTypeBadge = (type) => {
    const typeMap = {
      admin: { label: 'Admin', className: 'bg-purple-100 text-purple-800' },
      business: { label: 'Cliente', className: 'bg-blue-100 text-blue-800' },
      individual: { label: 'Cliente', className: 'bg-blue-100 text-blue-800' },
      supplier: { label: 'Proveedor', className: 'bg-green-100 text-green-800' },
      employee: { label: 'Empleado', className: 'bg-orange-100 text-orange-800' },
      manager: { label: 'Gestor', className: 'bg-gray-100 text-gray-800' },
    };
    const typeInfo = typeMap[type] || { label: type, className: 'bg-gray-200' };
    return <Badge className={typeInfo.className}>{typeInfo.label}</Badge>;
  };

  const employeeStatusStyles = {
    active: 'bg-emerald-100 text-emerald-800',
    onboarding: 'bg-blue-100 text-blue-800',
    suspended: 'bg-yellow-100 text-yellow-800',
    terminated: 'bg-red-100 text-red-800',
    draft: 'bg-gray-100 text-gray-800',
  };

  const renderEmployeeStatusBadge = (status = 'draft') => {
    const className = employeeStatusStyles[status] || employeeStatusStyles.draft;
    const labelMap = {
      active: 'Activo',
      onboarding: 'Onboarding',
      suspended: 'Suspendido',
      terminated: 'Terminado',
      draft: 'Borrador',
    };
    return <Badge className={className}>{labelMap[status] || status}</Badge>;
  };

  const openEmployeeDrawer = useCallback((employee) => {
    if (!employee?._id) return;
    setSelectedEmployeeId(employee._id);
    setSelectedEmployeeSnapshot(employee);
    setIsEmployeeDrawerOpen(true);
  }, []);

  const closeEmployeeDrawer = useCallback(() => {
    setIsEmployeeDrawerOpen(false);
    setSelectedEmployeeId(null);
    setSelectedEmployeeSnapshot(null);
  }, []);

  const toggleEmployeeSelection = useCallback((employeeId) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) {
        next.delete(employeeId);
      } else {
        next.add(employeeId);
      }
      return next;
    });
  }, []);

  const toggleAllEmployeesOnPage = useCallback(
    (checked) => {
      if (!checked) {
        setSelectedEmployeeIds(new Set());
        return;
      }
      setSelectedEmployeeIds(
        new Set(employeesData.map((employee) => employee._id)),
      );
    },
    [employeesData],
  );

  const clearSelectedEmployees = useCallback(() => {
    setSelectedEmployeeIds(new Set());
  }, []);

  const handleBulkReinvite = useCallback(async () => {
    if (selectedEmployeesCount === 0) return;
    setBulkActionLoading(true);
    try {
      const summary = await bulkReinviteEmployees(selectedEmployees);
      if (summary.successCount > 0) {
        toast.success(
          `${summary.successCount} ${summary.successCount === 1 ? 'invitación enviada' : 'invitaciones enviadas'}`,
        );
      }
      if (summary.failureCount > 0) {
        toast.error(summary.errors.join(', '));
      }
      if (summary.failureCount === 0) {
        clearSelectedEmployees();
      }
    } catch (err) {
      toast.error(err.message || 'Error al enviar invitaciones');
    } finally {
      setBulkActionLoading(false);
    }
  }, [selectedEmployeesCount, bulkReinviteEmployees, selectedEmployees, clearSelectedEmployees]);

  const toggleNotificationChannel = useCallback((channel) => {
    setNotifyChannels((prev) => {
      if (prev.includes(channel)) {
        return prev.filter((value) => value !== channel);
      }
      return [...prev, channel];
    });
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (status) => {
      if (selectedEmployeesCount === 0) return;
      setBulkActionLoading(true);
      try {
        await bulkUpdateEmployeeStatus({
          employeeIds: selectedEmployees.map((employee) => employee._id),
          status,
        });
        toast.success(`Estado actualizado a ${status} para ${selectedEmployeesCount} empleado${selectedEmployeesCount === 1 ? '' : 's'}`);
        clearSelectedEmployees();
      } catch (err) {
        toast.error(err.message || 'Error al actualizar estado masivo');
      } finally {
        setBulkActionLoading(false);
      }
    },
    [selectedEmployeesCount, bulkUpdateEmployeeStatus, selectedEmployees, clearSelectedEmployees],
  );

  const handleOpenNotifyDialog = useCallback(() => {
    if (selectedEmployeesCount === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }
    setNotifyDialogOpen(true);
  }, [selectedEmployeesCount]);

  const loadStructureOptions = useCallback(async () => {
    setStructureLoading(true);
    try {
      const data = await fetchApi('/payroll/structures');
      setStructureOptions(Array.isArray(data) ? data : data?.data || []);
    } catch (err) {
      console.error('Error loading payroll structures:', err);
      toast.error('No se pudieron cargar las estructuras');
    } finally {
      setStructureLoading(false);
    }
  }, []);

  const handleOpenStructureDialog = useCallback(() => {
    if (selectedEmployeesCount === 0) {
      toast.error('Selecciona al menos un empleado');
      return;
    }
    setStructureDialogOpen(true);
  }, [selectedEmployeesCount]);

  useEffect(() => {
    if (structureDialogOpen && structureOptions.length === 0) {
      loadStructureOptions();
    }
  }, [structureDialogOpen, structureOptions.length, loadStructureOptions]);

  useEffect(() => {
    if (structureOptions.length === 0) {
      loadStructureOptions();
    }
  }, [structureOptions.length, loadStructureOptions]);

  const structureAssignmentPreview = useMemo(() => {
    if (!selectedEmployees.length) {
      return {
        eligible: [],
        excluded: [],
        reasonCounts: {},
        total: 0,
      };
    }
    const summary = {
      eligible: [],
      excluded: [],
      reasonCounts: {},
      total: selectedEmployees.length,
    };
    const isRemoval = !structureSelection;
    selectedEmployees.forEach((employee) => {
      const contract = employee.currentContract;
      const normalizedStructureId =
        typeof contract?.payrollStructureId === 'string'
          ? contract.payrollStructureId
          : contract?.payrollStructureId?._id || '';
      const matchesTarget = isRemoval
        ? !normalizedStructureId
        : Boolean(normalizedStructureId && normalizedStructureId === structureSelection);
      let exclusionReason = null;
      if (
        structureApplyFilters.onlyActiveContracts &&
        contract?.status !== 'active'
      ) {
        exclusionReason = contract
          ? `Contrato ${contract.status || 'sin estado'}`
          : 'Sin contrato asignado';
      }
      if (
        !exclusionReason &&
        structureApplyFilters.excludeAlreadyAssigned &&
        matchesTarget
      ) {
        exclusionReason = isRemoval ? 'Ya está sin estructura' : 'Ya tiene esta estructura';
      }
      if (exclusionReason) {
        summary.excluded.push({ employee, reason: exclusionReason });
        summary.reasonCounts[exclusionReason] = (summary.reasonCounts[exclusionReason] || 0) + 1;
      } else {
        summary.eligible.push({ employee, contract });
      }
    });
    return summary;
  }, [selectedEmployees, structureSelection, structureApplyFilters]);

  const handleBulkAssignStructure = useCallback(async () => {
    if (selectedEmployeesCount === 0) return;
    const targetEmployees = structureAssignmentPreview.eligible.map((item) => item.employee);
    if (targetEmployees.length === 0) {
      toast.error('Ningún empleado cumple las condiciones seleccionadas para aplicar el cambio.');
      return;
    }
    setBulkActionLoading(true);
    try {
      await fetchApi('/payroll/employees/bulk/structure', {
        method: 'PATCH',
        body: JSON.stringify({
          employeeIds: targetEmployees.map((employee) => employee._id),
          payrollStructureId: structureSelection || null,
        }),
      });
      const appliedCount = targetEmployees.length;
      const excludedCount = structureAssignmentPreview.excluded.length;
      const baseMessage = structureSelection
        ? `Estructura asignada a ${appliedCount} empleado${appliedCount === 1 ? '' : 's'}`
        : `Estructura removida de ${appliedCount} empleado${appliedCount === 1 ? '' : 's'}`;
      toast.success(
        excludedCount > 0
          ? `${baseMessage}. Omitidos ${excludedCount} por condiciones.`
          : baseMessage,
      );
      setStructureDialogOpen(false);
      setStructureSelection('');
      clearSelectedEmployees();
      refreshEmployeesData().catch(() => {});
    } catch (err) {
      toast.error(err.message || 'No se pudo asignar la estructura');
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    selectedEmployeesCount,
    structureAssignmentPreview,
    structureSelection,
    clearSelectedEmployees,
    refreshEmployeesData,
  ]);

  const handleSendBulkNotification = useCallback(async () => {
    if (selectedEmployeesCount === 0) return;
    if (notifyChannels.length === 0) {
      toast.error('Selecciona al menos un canal de notificación');
      return;
    }
    setBulkActionLoading(true);
    try {
      await bulkNotifyEmployees({
        employeeIds: selectedEmployees.map((employee) => employee._id),
        templateId: notifyTemplate,
        channels: notifyChannels,
        context: {
          message: notifyMessage,
          tenantName: tenant?.legalName || tenant?.name,
          triggeredAt: new Date().toISOString(),
        },
      });
      toast.success(`Notificaciones enviadas a ${selectedEmployeesCount} empleado${selectedEmployeesCount === 1 ? '' : 's'}`);
      setNotifyDialogOpen(false);
      setNotifyMessage('');
    } catch (err) {
      toast.error(err.message || 'Error al enviar notificaciones');
    } finally {
      setBulkActionLoading(false);
    }
  }, [
    selectedEmployeesCount,
    bulkNotifyEmployees,
    selectedEmployees,
    notifyTemplate,
    notifyChannels,
    notifyMessage,
    tenant?.legalName,
    tenant?.name,
  ]);

  const handleReconcileEmployees = useCallback(async () => {
    setReconcileLoading(true);
    try {
      const summary = await reconcileEmployeeProfiles();
      toast.success(
        summary?.removedProfiles
          ? `Reconciliación completada: ${summary.removedProfiles} duplicado${summary.removedProfiles === 1 ? '' : 's'} eliminados`
          : 'No se encontraron duplicados',
      );
    } catch (err) {
      toast.error(err.message || 'Error al reconciliar empleados');
    } finally {
      setReconcileLoading(false);
    }
  }, [reconcileEmployeeProfiles]);

  const handleExportEmployeesCsv = useCallback(() => {
    if (!employeesData.length) {
      toast.error('No hay empleados para exportar');
      return;
    }
    const headers = [
      'Empleado',
      'Número',
      'Departamento',
      'Puesto',
      'Estado',
      'Correo',
      'Teléfono',
      'Estructura',
      'Versión',
      'Roles cubiertos',
      'Departamentos cubiertos',
      'Contratos cubiertos',
      'Estructura activa',
      'Vigente desde',
      'Vigente hasta',
      'Inicio contrato',
      'Fin contrato',
      'Tipo contrato',
      'Tipo compensación',
      'Compensación',
      'Moneda',
      'Próximo pago',
    ];
    const rows = employeesData.map((employee) => {
      const contract = employee.currentContract || {};
      const structure =
        typeof contract?.payrollStructureId === 'object' ? contract.payrollStructureId : null;
      return [
        employee.customer?.name || '',
        employee.employeeNumber || '',
        employee.department || '',
        employee.position || '',
        employee.status || '',
        employee.customer?.email || '',
        employee.customer?.phone || '',
        structure?.name || 'Sin estructura',
        structure?.version || '',
        describeStructureDimension(structure?.appliesToRoles),
        describeStructureDimension(structure?.appliesToDepartments),
        describeStructureDimension(structure?.appliesToContractTypes),
        structure ? (structure.isActive === false ? 'No' : 'Sí') : '',
        formatDateForCsv(structure?.effectiveFrom),
        formatDateForCsv(structure?.effectiveTo),
        formatDateForCsv(contract.startDate),
        formatDateForCsv(contract.endDate),
        contract.contractType || '',
        contract.compensationType || '',
        contract.compensationAmount ?? '',
        contract.currency || '',
        formatDateForCsv(contract.nextPayDate),
      ];
    });
    exportRowsToCsv(headers, rows, 'empleados_nomina.csv');
  }, [employeesData]);

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

  // --- LÓGICA DE INTELIGENCIA DE COMUNICACIONES ---
  // Determinar si mostrar el componente de comunicaciones (solo SERVICES y FOOD_SERVICE)
  const showCommunicationsIntelligence = useMemo(() => {
    if (!tenant?.vertical) return false;
    return tenant.vertical === 'SERVICES' || tenant.vertical === 'FOOD_SERVICE';
  }, [tenant?.vertical]);

  // Obtener texto adaptado según categoría de negocio
  const communicationsDescription = useMemo(() => {
    const businessType = tenant?.businessType?.toLowerCase() || '';

    // Mapeo de categorías de negocio a términos apropiados
    const customerTermMap = {
      // Hotelería y hospitalidad
      'hotel': 'huéspedes',
      'hostel': 'huéspedes',
      'resort': 'huéspedes',
      'motel': 'huéspedes',
      'posada': 'huéspedes',
      'hospedaje': 'huéspedes',

      // Salud
      'clínica': 'pacientes',
      'clinica': 'pacientes',
      'hospital': 'pacientes',
      'consultorio': 'pacientes',
      'médico': 'pacientes',
      'medico': 'pacientes',
      'odontología': 'pacientes',
      'odontologia': 'pacientes',
      'veterinaria': 'pacientes',

      // Educación
      'escuela': 'estudiantes',
      'colegio': 'estudiantes',
      'academia': 'estudiantes',
      'instituto': 'estudiantes',
      'universidad': 'estudiantes',
      'centro de formación': 'estudiantes',

      // Spa y belleza
      'spa': 'clientes',
      'salón': 'clientes',
      'salon': 'clientes',
      'peluquería': 'clientes',
      'peluqueria': 'clientes',
      'barbería': 'clientes',
      'barberia': 'clientes',
      'estética': 'clientes',
      'estetica': 'clientes',

      // Restaurantes
      'restaurante': 'comensales',
      'restaurant': 'comensales',
      'cafetería': 'clientes',
      'cafeteria': 'clientes',
      'bar': 'clientes',
      'pub': 'clientes',
      'food truck': 'clientes',

      // Gimnasios y fitness
      'gimnasio': 'miembros',
      'gym': 'miembros',
      'fitness': 'miembros',
      'crossfit': 'miembros',
      'yoga': 'participantes',
      'pilates': 'participantes',

      // Eventos y entretenimiento
      'teatro': 'asistentes',
      'cine': 'espectadores',
      'museo': 'visitantes',
      'galería': 'visitantes',
      'galeria': 'visitantes',
    };

    // Buscar coincidencia en el businessType
    for (const [key, value] of Object.entries(customerTermMap)) {
      if (businessType.includes(key)) {
        return `Seguimiento de recordatorios automatizados y respuesta de ${value} a través de correo, SMS y WhatsApp.`;
      }
    }

    // Fallback genérico
    return 'Seguimiento de recordatorios automatizados y respuesta de clientes a través de correo, SMS y WhatsApp.';
  }, [tenant?.businessType]);

  // --- FILTRADO DE DATOS ---
  useEffect(() => {
    let filtered = [...crmData];

    if (filterTier !== 'all') {
      filtered = filtered.filter(c => c.tier === filterTier);
    }

    setFilteredData(filtered);
  }, [crmData, filterTier]);

  useEffect(() => {
    console.log('CRM Data received:', crmData);
    crmData.forEach(customer => {
      console.log(`${customer.name}: totalSpent = ${customer.metrics?.totalSpent}`);
    });
  }, [crmData]);

  // --- MANEJO DE OPERACIONES CRUD ---
  const handleOpenEditDialog = (contact) => {
    setSelectedContactId(contact._id);
    setEditingFormState({
      name: contact.name || '',
      customerType: contact.customerType || 'business',
      companyName: contact.companyName || '',
      notes: contact.notes || '',
      email: contact.contacts?.find(c => c.type === 'email')?.value || '',
      phone: contact.contacts?.find(c => c.type === 'phone')?.value || '',
      street: contact.addresses?.[0]?.street || '',
      city: contact.addresses?.[0]?.city || '',
      state: contact.addresses?.[0]?.state || '',
      taxId: contact.taxInfo?.taxId || '',
      taxType: contact.taxInfo?.taxType || 'V',
      primaryLocation: contact.primaryLocation || null,
    });
    setIsEditDialogOpen(true);
  };

  const handleAddContact = async () => {
    const contactsPayload = [];
    if (newContact.email) {
      contactsPayload.push({ type: 'email', value: newContact.email, isPrimary: true });
    }
    if (newContact.phone) {
      contactsPayload.push({ type: 'phone', value: newContact.phone, isPrimary: !newContact.email });
    }

    const payload = {
      name: newContact.name,
      customerType: newContact.customerType,
      companyName: newContact.companyName,
      taxInfo: { taxId: newContact.taxId, taxType: newContact.taxType },
      addresses: [{ type: 'shipping', street: newContact.address, city: newContact.city, state: newContact.state, isDefault: true }],
      contacts: contactsPayload,
      notes: newContact.notes,
      primaryLocation: newContact.primaryLocation,
    };

    const shouldEnsureEmployee = payload.customerType === 'employee';
    try {
      await addCustomer(payload, {
        ensureEmployeeProfile: shouldEnsureEmployee,
        refreshEmployees: shouldEnsureEmployee,
        skipCustomerReload: isEmployeeTab,
      });
      setNewContact(initialNewContactState);
      setIsAddDialogOpen(false);
    } catch (err) {
      alert(`Error al agregar cliente: ${err.message}`);
    }
  };

  const handleSearchInputChange = (value) => {
    if (isEmployeeTab) {
      setEmployeeSearchTerm(value);
    } else {
      setSearchTerm(value);
    }
  };

  const communicationsLeaderboard = useMemo(() => {
    return [...filteredData]
      .filter((customer) => Array.isArray(customer.communicationEvents) && customer.communicationEvents.length > 0)
      .sort(
        (a, b) => (b.metrics?.engagementScore || 0) - (a.metrics?.engagementScore || 0),
      )
      .slice(0, 5)
      .map((customer) => {
        const lastEvent = customer.communicationEvents?.[customer.communicationEvents.length - 1];
        return {
          id: customer._id,
          name: customer.name,
          totalEvents: customer.communicationEvents?.length || 0,
          channel:
            lastEvent?.channels?.[0] || customer.preferences?.communicationChannel || 'email',
          engagementScore: customer.metrics?.engagementScore || 0,
          lastContactAt: lastEvent?.deliveredAt ? new Date(lastEvent.deliveredAt) : null,
        };
      });
  }, [filteredData]);

  const communicationTotals = useMemo(() => {
    return filteredData.reduce(
      (acc, customer) => {
        const touchpoints = customer.metrics?.communicationTouchpoints || 0;
        const engagement = customer.metrics?.engagementScore || 0;
        return {
          touchpoints: acc.touchpoints + touchpoints,
          engaged: acc.engaged + (engagement >= 80 ? 1 : 0),
        };
      },
      { touchpoints: 0, engaged: 0 },
    );
  }, [filteredData]);

  const handleEditContact = async () => {
    if (!selectedContactId) return;

    const originalContact = crmData.find(c => c._id === selectedContactId);
    const changedFields = {};

    // Compara campos simples
    if (editingFormState.name !== originalContact.name) changedFields.name = editingFormState.name;
    if (editingFormState.customerType !== originalContact.customerType) changedFields.customerType = editingFormState.customerType;
    if (editingFormState.companyName !== originalContact.companyName) changedFields.companyName = editingFormState.companyName;
    if (editingFormState.notes !== originalContact.notes) changedFields.notes = editingFormState.notes;

    // Compara y construye el array de contactos solo si hay cambios
    const newEmail = editingFormState.email;
    const newPhone = editingFormState.phone;
    const oldEmail = originalContact.contacts?.find(c => c.type === 'email')?.value || '';
    const oldPhone = originalContact.contacts?.find(c => c.type === 'phone')?.value || '';

    if (newEmail !== oldEmail || newPhone !== oldPhone) {
      changedFields.contacts = [
        { type: 'email', value: newEmail, isPrimary: true },
        { type: 'phone', value: newPhone, isPrimary: false },
      ].filter(c => c.value);
    }

    // Compara y construye el array de direcciones solo si hay cambios
    const newStreet = editingFormState.street;
    const oldStreet = originalContact.addresses?.[0]?.street || '';
    if (newStreet && newStreet !== oldStreet) {
        changedFields.addresses = [{
            type: 'shipping',
            street: editingFormState.street,
            city: editingFormState.city,
            state: editingFormState.state,
            isDefault: true
        }];
    }

    // Compara primaryLocation
    const oldLocation = originalContact.primaryLocation;
    const newLocation = editingFormState.primaryLocation;
    if (JSON.stringify(oldLocation) !== JSON.stringify(newLocation)) {
      changedFields.primaryLocation = newLocation;
    }

    const oldTaxType = originalContact.taxInfo?.taxType || 'V';
    const oldTaxId = originalContact.taxInfo?.taxId || '';
    if (
      editingFormState.taxType !== oldTaxType ||
      (editingFormState.taxId || '') !== oldTaxId
    ) {
      changedFields.taxInfo = {
        taxType: editingFormState.taxType,
        taxId: editingFormState.taxId,
      };
    }

    if (Object.keys(changedFields).length === 0) {
      setIsEditDialogOpen(false); // No hay cambios, solo cerrar
      return;
    }

    const convertedToEmployee =
      originalContact.customerType !== 'employee' &&
      editingFormState.customerType === 'employee';
    const isEmployeeAfterUpdate = editingFormState.customerType === 'employee';

    try {
      await updateCustomer(selectedContactId, changedFields, {
        ensureEmployeeProfile: convertedToEmployee,
        refreshEmployees: isEmployeeAfterUpdate,
        skipCustomerReload: isEmployeeTab,
      });
      setIsEditDialogOpen(false);
      setSelectedContactId(null);
    } catch (err) {
      alert(`Error al editar cliente: ${err.message}`);
    }
  };

  const handleDeleteContact = async (id) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este contacto?')) {
      try {
        await deleteCustomer(id);
      } catch (err) {
        alert(`Error al eliminar contacto: ${err.message}`);
      }
    }
  };

  const employeeTotals = employeeSummary?.totals || {};
  const employeeStatusBreakdown = employeeSummary?.byStatus || {};
  const employeeDepartmentBreakdown = employeeSummary?.byDepartment || {};
  const contractSummary = employeeSummary?.contractSummary || {};
  const contractTypeBreakdown = contractSummary.byType || {};
  const expiringContracts = contractSummary.expiringSoon || [];
  const employeeTotalPages = employeesPagination?.totalPages || 1;
  const handleRefreshEmployees = () => {
    loadEmployees(employeePage, EMPLOYEE_PAGE_LIMIT, employeeFilters);
    loadEmployeeSummary();
  };

  // --- RENDERIZADO ---
  if (!isEmployeeTab && loading) return <div>Cargando CRM...</div>;
  if (isEmployeeTab && employeesLoading && employeesData.length === 0) {
    return <div>Cargando empleados...</div>;
  }
  if (!isEmployeeTab && error) {
    return <div className="text-red-500">Error al cargar datos del CRM: {error}</div>;
  }
  if (isEmployeeTab && employeesError && employeesData.length === 0) {
    return <div className="text-red-500">Error al cargar empleados: {employeesError}</div>;
  }

  return (
    <div className="space-y-6">
      {showCommunicationsIntelligence && !isEmployeeTab && (
        <Card>
          <CardHeader>
            <CardTitle>Inteligencia de comunicaciones</CardTitle>
            <CardDescription>
              {communicationsDescription}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-none bg-muted/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Touchpoints totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{communicationTotals.touchpoints}</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Clientes altamente comprometidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{communicationTotals.engaged}</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Clientes monitoreados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-foreground">{filteredData.length}</p>
              </CardContent>
            </Card>
            <Card className="border-none bg-muted/40 shadow-none">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Último envío registrado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {communicationsLeaderboard[0]?.lastContactAt
                    ? communicationsLeaderboard[0].lastContactAt.toLocaleString()
                    : 'Sin registros recientes'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Interacciones</TableHead>
                  <TableHead>Canal preferido</TableHead>
                  <TableHead>Último contacto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {communicationsLeaderboard.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      Aún no se registran interacciones automáticas.
                    </TableCell>
                  </TableRow>
                )}
                {communicationsLeaderboard.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium text-foreground">{entry.name}</div>
                      <div className="text-xs text-muted-foreground">Engagement {Math.round(entry.engagementScore)}</div>
                    </TableCell>
                    <TableCell>{entry.totalEvents}</TableCell>
                    <TableCell className="capitalize">{entry.channel}</TableCell>
                    <TableCell>
                      {entry.lastContactAt
                        ? entry.lastContactAt.toLocaleString()
                        : 'Sin historial'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      )}
      {isEmployeeTab && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Empleados activos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employeeTotals.employees || 0}</div>
                <p className="text-xs text-muted-foreground">Perfiles sincronizados</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Contratos activos</CardTitle>
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{employeeTotals.activeContracts || 0}</div>
                <p className="text-xs text-muted-foreground">Con pagos vigentes</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vencen en 30 días</CardTitle>
                <CalendarClock className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{employeeTotals.expiringContracts || 0}</div>
                <p className="text-xs text-muted-foreground">Programar renovaciones</p>
              </CardContent>
            </Card>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Estados de empleados</CardTitle>
                <CardDescription>Distribución actual de la fuerza laboral.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(employeeStatusBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin datos suficientes.</p>
                ) : (
                  Object.entries(employeeStatusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Contratos por tipo</CardTitle>
                <CardDescription>Monitorea la mezcla de contratos en el equipo.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.keys(contractTypeBreakdown).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin contratos registrados.</p>
                ) : (
                  Object.entries(contractTypeBreakdown).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{type.replace('_', ' ')}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Contratos por vencer</CardTitle>
              <CardDescription>Alertas de los próximos 30 días.</CardDescription>
            </CardHeader>
            <CardContent>
              {expiringContracts.length === 0 ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle className="h-4 w-4 text-emerald-500" />
                  No hay contratos por expirar en los próximos 30 días.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Empleado</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Fin</TableHead>
                        <TableHead>Restan</TableHead>
                        <TableHead className="text-right">Compensación</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiringContracts.map((contract) => (
                        <TableRow key={contract.contractId}>
                          <TableCell>
                            <div className="font-medium">{contract.employeeName}</div>
                            <div className="text-xs text-muted-foreground">
                              {contract.department || contract.position || '—'}
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{contract.contractType || '—'}</TableCell>
                          <TableCell>{formatDate(contract.endDate)}</TableCell>
                          <TableCell>
                            {typeof contract.daysUntilEnd === 'number'
                              ? `${contract.daysUntilEnd} días`
                              : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {contract.compensationAmount
                              ? formatCurrency(contract.compensationAmount, contract.currency || 'USD')
                              : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-foreground">
          {isEmployeeTab ? 'Gestión de Empleados' : 'Gestión de Contactos'}
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => {
              if (isEmployeeTab) {
                handleRefreshEmployees();
              } else {
                reloadCustomers(currentPage, pageLimit, currentFilters);
              }
            }}
            disabled={isEmployeeTab ? employeesLoading : loading}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${
                (isEmployeeTab ? employeesLoading : loading) ? 'animate-spin' : ''
              }`}
            />
            {(isEmployeeTab ? employeesLoading : loading) ? 'Actualizando...' : 'Actualizar'}
          </Button>
          {isEmployeeTab && (
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={handleReconcileEmployees}
              disabled={reconcileLoading}
            >
              {reconcileLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Reconciliar duplicados
            </Button>
          )}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full sm:w-auto"
                onClick={() =>
                  setNewContact({
                    ...initialNewContactState,
                    customerType: isEmployeeTab ? 'employee' : initialNewContactState.customerType,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" /> {isEmployeeTab ? 'Crear empleado' : 'Agregar contacto'}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{isEmployeeTab ? 'Crear empleado' : 'Agregar nuevo contacto'}</DialogTitle>
                <DialogDescription>
                  {isEmployeeTab
                    ? 'Registra un empleado con sus datos básicos de contacto.'
                    : 'Completa los detalles para registrar un nuevo contacto en el sistema.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={newContact.name} onChange={(e) => setNewContact({ ...newContact, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Contacto</Label>
                  <Select
                    value={newContact.customerType}
                    onValueChange={(value) => setNewContact({ ...newContact, customerType: value })}
                    disabled={isEmployeeTab}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="business">Cliente</SelectItem>
                      <SelectItem value="supplier">Proveedor</SelectItem>
                      <SelectItem value="employee">Empleado</SelectItem>
                      {!isEmployeeTab && (
                        <>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="manager">Gestor</SelectItem>
                          <SelectItem value="Repartidor">Repartidor</SelectItem>
                          <SelectItem value="Cajero">Cajero</SelectItem>
                          <SelectItem value="Mesonero">Mesonero</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Empresa</Label>
                  <Input
                    value={newContact.companyName}
                    onChange={(e) => setNewContact({ ...newContact, companyName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Dirección</Label>
                  <Input
                    value={newContact.address}
                    onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ciudad</Label>
                  <Input
                    value={newContact.city}
                    onChange={(e) => setNewContact({ ...newContact, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Estado</Label>
                  <Input
                    value={newContact.state}
                    onChange={(e) => setNewContact({ ...newContact, state: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Identificación Fiscal</Label>
                  <div className="flex gap-2">
                    <Select
                      value={newContact.taxType}
                      onValueChange={(value) => setNewContact({ ...newContact, taxType: value })}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="J">J</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={newContact.taxId}
                      onChange={(e) => setNewContact({ ...newContact, taxId: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-span-2 space-y-2">
                  <LocationPicker
                    label="Ubicación del Cliente"
                    value={newContact.primaryLocation}
                    onChange={(location) => setNewContact({ ...newContact, primaryLocation: location })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notas</Label>
                  <Textarea
                    value={newContact.notes}
                    onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddContact}>
                  {isEmployeeTab ? 'Crear empleado' : 'Agregar contacto'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      {isEmployeeTab && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen de empleados</CardTitle>
            <CardDescription>Estado general de los colaboradores y contratos activos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-none bg-muted/40 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Empleados totales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-foreground">{employeeTotals.employees || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-muted/40 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contratos activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-foreground">{employeeTotals.activeContracts || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-muted/40 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Contratos por vencer (30 días)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-foreground">{employeeTotals.expiringContracts || 0}</p>
                </CardContent>
              </Card>
              <Card className="border-none bg-muted/40 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Departamentos activos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold text-foreground">{Object.keys(employeeDepartmentBreakdown).length || 0}</p>
                </CardContent>
              </Card>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Por estado</p>
                <div className="space-y-2">
                  {Object.keys(employeeStatusBreakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin información disponible.</p>
                  )}
                  {Object.entries(employeeStatusBreakdown).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between text-sm">
                      <span className="capitalize">{status}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm font-semibold text-muted-foreground mb-2">Por departamento</p>
                <div className="space-y-2">
                  {Object.keys(employeeDepartmentBreakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground">Aún no se registran departamentos.</p>
                  )}
                  {Object.entries(employeeDepartmentBreakdown).map(([dept, count]) => (
                    <div key={dept} className="flex items-center justify-between text-sm">
                      <span>{dept}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <Tabs value={filterType} onValueChange={handleTabChange} className="w-full overflow-x-auto sm:w-auto">
                <TabsList>
                  {!forceEmployeeTab && <TabsTrigger value="all">Todos</TabsTrigger>}
                  {!forceEmployeeTab && <TabsTrigger value="individual">Clientes</TabsTrigger>}
                  {!forceEmployeeTab && <TabsTrigger value="supplier">Proveedores</TabsTrigger>}
                  {showEmployeeTab && <TabsTrigger value="employee">Empleados</TabsTrigger>}
                </TabsList>
              </Tabs>
            <div className="relative w-full sm:flex-1 sm:max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={isEmployeeTab ? 'Buscar empleados...' : 'Buscar contactos...'}
                className="pl-8 w-full"
                value={currentSearchValue}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
            </div>
          </div>
          {isEmployeeTab && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={employeeStatusFilter} onValueChange={setEmployeeStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStatusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Departamento</Label>
                <Select value={employeeDepartmentFilter} onValueChange={setEmployeeDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {employeeDepartmentOptions.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estructura</Label>
                <Select value={employeeStructureFilter} onValueChange={setEmployeeStructureFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estructura" />
                  </SelectTrigger>
                  <SelectContent>
                    {employeeStructureOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {isEmployeeTab ? (
            <div className="space-y-4">
              {selectedEmployeesCount > 0 && (
                <div className="rounded-md border bg-muted/40 p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm font-medium">
                    {selectedEmployeesCount} empleado{selectedEmployeesCount === 1 ? '' : 's'} seleccionados
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelectedEmployees}
                      disabled={bulkActionLoading}
                    >
                      Limpiar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" disabled={bulkActionLoading}>
                          {bulkActionLoading ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Procesando...
                            </>
                          ) : (
                            'Acciones masivas'
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Seleccionados</DropdownMenuLabel>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleBulkReinvite();
                          }}
                        >
                          Re-invitar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleOpenNotifyDialog();
                          }}
                        >
                          Enviar notificación
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleOpenStructureDialog();
                          }}
                        >
                          Asignar estructura
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleBulkStatusUpdate('suspended');
                          }}
                        >
                          Suspender
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={(event) => {
                            event.preventDefault();
                            handleBulkStatusUpdate('active');
                          }}
                        >
                          Re-activar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="text-sm text-muted-foreground">
                  {employeesPagination?.total
                    ? `Coincidencias: ${employeesPagination.total}`
                    : 'Sin resultados filtrados'}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportEmployeesCsv}
                  disabled={!employeesData.length}
                >
                  Exportar CSV
                </Button>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={isAllEmployeesSelected ? true : isSomeEmployeesSelected ? 'indeterminate' : false}
                          onCheckedChange={(value) => toggleAllEmployeesOnPage(Boolean(value))}
                        />
                      </TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Puesto</TableHead>
                      <TableHead>Estructura</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Compensación</TableHead>
                      <TableHead>Próximo pago</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                    <TableBody>
                      {employeesData.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                            No hay empleados registrados.
                          </TableCell>
                        </TableRow>
                      )}
                      {employeesData.map((employee) => {
                      const contract = employee.currentContract;
                      const employeeName = employee.customer?.name || 'Sin nombre';
                      const department = employee.department || employee.customer?.companyName || '—';
                      const structure =
                        typeof contract?.payrollStructureId === 'object'
                          ? contract.payrollStructureId
                          : null;
                      const structureLabel = structure?.name || 'Sin estructura';
                        return (
                          <TableRow
                            key={employee._id}
                            className="cursor-pointer transition hover:bg-muted/60"
                            onClick={() => openEmployeeDrawer(employee)}
                          >
                            <TableCell className="align-top">
                              <Checkbox
                                checked={selectedEmployeeIds.has(employee._id)}
                                onCheckedChange={() => toggleEmployeeSelection(employee._id)}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{employeeName}</div>
                            <div className="text-sm text-muted-foreground">{employee.employeeNumber || employee.customer?.customerNumber || '—'}</div>
                          </TableCell>
                          <TableCell>{department}</TableCell>
                          <TableCell>{employee.position || '—'}</TableCell>
                          <TableCell>
                            <Badge variant={structure ? 'secondary' : 'outline'}>
                              {structureLabel}
                            </Badge>
                            {structure?.version && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                v{structure.version}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{renderEmployeeStatusBadge(employee.status)}</TableCell>
                          <TableCell>
                            {contract
                              ? formatCurrency(contract.compensationAmount, contract.currency)
                              : '—'}
                          </TableCell>
                          <TableCell>{formatDate(contract?.nextPayDate)}</TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEmployeeDrawer(employee);
                              }}
                            >
                              Ver perfil
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  Mostrando <span className="font-semibold">{employeesData.length}</span> de{' '}
                  <span className="font-semibold">{employeesPagination?.total || 0}</span> empleados
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmployeePage((page) => Math.max(1, page - 1))}
                    disabled={employeePage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Página <span className="font-semibold">{employeePage}</span> de{' '}
                    <span className="font-semibold">{employeeTotalPages || 1}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmployeePage((page) => Math.min(employeeTotalPages || 1, page + 1))}
                    disabled={employeePage === (employeeTotalPages || 1) || employeeTotalPages === 0}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader><TableRow><TableHead>Contacto</TableHead><TableHead>Tier RFM</TableHead><TableHead>Tipo</TableHead><TableHead>Contacto Principal</TableHead><TableHead>Gastos Totales</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {filteredData.map((customer) => {
                      const primaryContact = customer.contacts?.find(c => c.isPrimary) || customer.contacts?.[0];
                      return (
                        <TableRow key={customer._id}>
                          <TableCell>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-muted-foreground">{customer.companyName}</div>
                          </TableCell>
                          <TableCell>{getTierBadge(customer.tier)}</TableCell>
                          <TableCell>{getContactTypeBadge(customer.customerType)}</TableCell>
                          <TableCell>
                            {primaryContact?.value && <div className="text-sm flex items-center gap-2"><Mail className="h-3 w-3" /> {primaryContact.value}</div>}
                          </TableCell>
                          <TableCell><div className="font-medium">${customer.metrics?.totalSpent?.toFixed(2) || '0.00'}</div></TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setIsDetailDialogOpen(true);
                                }}
                                title="Ver detalles y historial"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(customer)}><Edit className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteContact(customer._id)} className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
                <div>
                  Mostrando <span className="font-semibold">{filteredData.length}</span> de{' '}
                  <span className="font-semibold">{totalCustomers}</span> contactos
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.max(1, currentPage - 1);
                      setCurrentPage(newPage);
                      reloadCustomers(newPage, pageLimit, currentFilters);
                    }}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Página <span className="font-semibold">{currentPage}</span> de{' '}
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newPage = Math.min(totalPages, currentPage + 1);
                      setCurrentPage(newPage);
                      reloadCustomers(newPage, pageLimit, currentFilters);
                    }}
                    disabled={currentPage === totalPages}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notificar empleados seleccionados
            </DialogTitle>
            <DialogDescription>
              Envía un recordatorio o actualización a los empleados seleccionados usando los canales disponibles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plantilla</Label>
              <Select value={notifyTemplate} onValueChange={setNotifyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona plantilla" />
                </SelectTrigger>
                <SelectContent>
                  {notificationTemplates.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Canales</Label>
              <div className="flex flex-wrap gap-3">
                {notificationChannelOptions.map((channel) => (
                  <label key={channel.value} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={notifyChannels.includes(channel.value)}
                      onCheckedChange={() => toggleNotificationChannel(channel.value)}
                    />
                    {channel.label}
                  </label>
                ))}
              </div>
              {notifyChannels.length === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Selecciona al menos un canal.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Mensaje contextual</Label>
              <Textarea
                rows={4}
                placeholder="Ej: Recordatorio de actualizar datos bancarios..."
                value={notifyMessage}
                onChange={(event) => setNotifyMessage(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Se enviará a {selectedEmployeesCount} empleado{selectedEmployeesCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendBulkNotification} disabled={bulkActionLoading || notifyChannels.length === 0}>
              {bulkActionLoading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar notificaciones'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={structureDialogOpen} onOpenChange={setStructureDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar estructura de nómina</DialogTitle>
            <DialogDescription>
              Selecciona la estructura que aplicará a los empleados seleccionados.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Estructura</Label>
              <Select
                value={structureSelection}
                onValueChange={setStructureSelection}
                disabled={structureLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder={structureLoading ? 'Cargando...' : 'Sin estructura'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin estructura</SelectItem>
                  {structureOptions.map((structure) => (
                    <SelectItem key={structure._id} value={structure._id}>
                      {structure.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Puedes dejar vacío para eliminar la estructura asignada actualmente.
            </p>
            <div className="space-y-2 rounded-md border border-dashed p-3">
              <Label className="text-xs font-semibold">Condiciones</Label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={structureApplyFilters.onlyActiveContracts}
                  onCheckedChange={(value) =>
                    setStructureApplyFilters((prev) => ({
                      ...prev,
                      onlyActiveContracts: Boolean(value),
                    }))
                  }
                />
                Solo contratos activos
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={structureApplyFilters.excludeAlreadyAssigned}
                  onCheckedChange={(value) =>
                    setStructureApplyFilters((prev) => ({
                      ...prev,
                      excludeAlreadyAssigned: Boolean(value),
                    }))
                  }
                />
                {structureSelection
                  ? 'Omitir empleados que ya tienen esta estructura'
                  : 'Omitir empleados que ya están sin estructura'}
              </label>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span>Total seleccionados</span>
                <span>{selectedEmployeesCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Se aplicará a</span>
                <span className="font-semibold">{structureAssignmentPreview.eligible.length}</span>
              </div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Omitidos por condiciones</span>
                <span>{structureAssignmentPreview.excluded.length}</span>
              </div>
              {structureAssignmentPreview.excluded.length > 0 && (
                <div className="space-y-1 pt-2">
                  {Object.entries(structureAssignmentPreview.reasonCounts).map(([reason, count]) => (
                    <div key={reason} className="flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground">{reason}</span>
                      <span className="text-[11px]">{count}</span>
                    </div>
                  ))}
                </div>
              )}
              {structureAssignmentPreview.eligible.length > 0 && (
                <div className="pt-2 text-[11px] text-muted-foreground">
                  <p className="font-semibold text-foreground">Primeros en recibir el cambio:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    {structureAssignmentPreview.eligible.slice(0, 3).map(({ employee }) => (
                      <li key={employee._id}>
                        {employee.customer?.name || 'Sin nombre'} ·{' '}
                        {employee.currentContract?.status || 'sin contrato'}
                      </li>
                    ))}
                    {structureAssignmentPreview.eligible.length > 3 && (
                      <li>+{structureAssignmentPreview.eligible.length - 3} más…</li>
                    )}
                  </ul>
                </div>
              )}
              {structureAssignmentPreview.eligible.length === 0 && (
                <p className="pt-2 text-[11px] text-amber-600">
                  Ajusta las condiciones para incluir al menos un empleado.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStructureDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkAssignStructure} disabled={bulkActionLoading}>
              {bulkActionLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EmployeeDetailDrawer
        open={isEmployeeDrawerOpen}
        onClose={closeEmployeeDrawer}
        employeeId={selectedEmployeeId}
        initialEmployee={selectedEmployeeSnapshot}
        onDataChanged={refreshEmployeesData}
      />

      {/* Dialog de edición */}
      {isEditDialogOpen && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Contacto</DialogTitle><DialogDescription>Modifica la información del contacto existente.</DialogDescription></DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2"><Label>Nombre</Label><Input value={editingFormState.name} onChange={(e) => setEditingFormState({...editingFormState, name: e.target.value})} /></div>
                <div className="space-y-2"><Label>Tipo de Contacto</Label><Select value={editingFormState.customerType} onValueChange={(value) => setEditingFormState({...editingFormState, customerType: value})}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Cliente</SelectItem><SelectItem value="supplier">Proveedor</SelectItem><SelectItem value="employee">Empleado</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Gestor</SelectItem><SelectItem value="Repartidor">Repartidor</SelectItem><SelectItem value="Cajero">Cajero</SelectItem><SelectItem value="Mesonero">Mesonero</SelectItem></SelectContent></Select></div>
                <div className="space-y-2"><Label>Empresa</Label><Input value={editingFormState.companyName} onChange={(e) => setEditingFormState({...editingFormState, companyName: e.target.value})} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={editingFormState.email} onChange={(e) => setEditingFormState({...editingFormState, email: e.target.value})} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input value={editingFormState.phone} onChange={(e) => setEditingFormState({...editingFormState, phone: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={editingFormState.street} onChange={(e) => setEditingFormState({...editingFormState, street: e.target.value})} /></div>
                <div className="space-y-2"><Label>Ciudad</Label><Input value={editingFormState.city} onChange={(e) => setEditingFormState({...editingFormState, city: e.target.value})} /></div>
                <div className="space-y-2"><Label>Estado</Label><Input value={editingFormState.state} onChange={(e) => setEditingFormState({...editingFormState, state: e.target.value})} /></div>
                <div className="col-span-2 space-y-2"><Label>Identificación Fiscal</Label><div className="flex gap-2"><Select value={editingFormState.taxType} onValueChange={(value) => setEditingFormState({...editingFormState, taxType: value})}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select><Input value={editingFormState.taxId} onChange={(e) => setEditingFormState({...editingFormState, taxId: e.target.value})} /></div></div>
                <div className="col-span-2 space-y-2">
                  <LocationPicker
                    label="Ubicación del Cliente"
                    value={editingFormState.primaryLocation}
                    onChange={(location) => setEditingFormState({...editingFormState, primaryLocation: location})}
                  />
                </div>
                <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea value={editingFormState.notes} onChange={(e) => setEditingFormState({...editingFormState, notes: e.target.value})} /></div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditContact}>Guardar Cambios</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Customer Detail Dialog */}
      <CustomerDetailDialog
        customer={selectedCustomer}
        open={isDetailDialogOpen}
        onOpenChange={(open) => {
          setIsDetailDialogOpen(open);
          if (!open) {
            setSelectedCustomer(null);
          }
        }}
      />
    </div>
  );
}

export default CRMManagement;
