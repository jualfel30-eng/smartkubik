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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.jsx";
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
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { OpportunityDetailDialog } from '@/components/OpportunityDetailDialog.jsx';
import OpportunityStagesManagement from './crm/OpportunityStagesManagement.jsx';
import { OwnerSelect } from './crm/OwnerSelect.jsx';
import { PlaybooksManagement } from './PlaybooksManagement.jsx';
import { ActivityTimeline } from './ActivityTimeline.jsx';
import { RemindersWidget } from './RemindersWidget.jsx';
import { HRNavigation } from '@/components/payroll/HRNavigation.jsx';

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
  const { tenant, user, hasPermission } = useAuth();

  // Access control based on backend requirement
  // Managers (view_all) or Admins (customers_update) can manage stages
  const canManageStages = hasPermission('opportunities_view_all') || hasPermission('customers_update');
  const canViewAllOpportunities = hasPermission('opportunities_view_all');

  // Maintain 'isAdmin' alias for existing code compatibility if needed, 
  // or refactor usage. Using canManageStages is cleaner.
  const isAdmin = canManageStages;
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
    opportunities,
    opportunitiesLoading,
    opportunitiesPagination,
    loadOpportunities,
    owners,
    ownersLoading,
    searchOwners,
    stageDefinitions,
    stageDefinitionsLoading,
    loadOpportunityStages,
    createOpportunityStage,
    updateOpportunityStage,
    deleteOpportunityStage,
  } = useCRM();

  const initialTabRaw = forceEmployeeTab ? 'employee' : searchParams.get('tab') || 'all';
  const initialTab = hideEmployeeTab && initialTabRaw === 'employee' ? 'all' : initialTabRaw;
  /* const isPipelineTab = initialTab === 'pipeline'; // REMOVED UNUSED */

  // Calculate initial top tab
  const getInitialTopTab = () => {
    if (initialTab === 'pipeline') return 'pipeline';
    if (initialTab === 'settings') return 'settings';
    if (initialTab === 'playbooks') return 'playbooks';
    if (initialTab === 'reminders') return 'reminders';
    return 'contacts';
  };

  const [activeTopTab, setActiveTopTab] = useState(getInitialTopTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(
    initialTab === 'pipeline' || initialTab === 'settings' ? 'all' : initialTab
  );

  const handleTopTabChange = (value) => {
    setActiveTopTab(value);
    if (value === 'pipeline') {
      setFilterType('pipeline');
      setSearchParams({ tab: 'pipeline' });
    } else if (value === 'settings') {
      setFilterType('settings');
      setSearchParams({ tab: 'settings' });
    } else if (value === 'playbooks') {
      setSearchParams({ tab: 'playbooks' });
    } else if (value === 'reminders') {
      setSearchParams({ tab: 'reminders' });
    } else {
      // Switch back to contacts
      const newSubTab = filterType === 'pipeline' || filterType === 'settings' ? 'all' : filterType;
      setFilterType(newSubTab);
      setSearchParams({ tab: newSubTab });
    }
  };

  // Sync state with URL changes (back/forward navigation)
  useEffect(() => {
    if (forceEmployeeTab) return;

    const tab = searchParams.get('tab') || 'all';
    if (tab === 'pipeline') {
      if (activeTopTab !== 'pipeline') setActiveTopTab('pipeline');
      if (filterType !== 'pipeline') setFilterType('pipeline');
    } else if (tab === 'settings') {
      if (activeTopTab !== 'settings') setActiveTopTab('settings');
      if (filterType !== 'settings') setFilterType('settings');
    } else if (tab === 'playbooks') {
      if (activeTopTab !== 'playbooks') setActiveTopTab('playbooks');
    } else if (tab === 'reminders') {
      if (activeTopTab !== 'reminders') setActiveTopTab('reminders');
    } else {
      if (activeTopTab !== 'contacts') setActiveTopTab('contacts');
      if (filterType !== tab) setFilterType(tab);
    }
  }, [searchParams, activeTopTab, filterType, forceEmployeeTab]);

  const [filteredData, setFilteredData] = useState([]);
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
  const [opportunityStageFilter, setOpportunityStageFilter] = useState('all');
  const [opportunitySearch, setOpportunitySearch] = useState('');
  const [isOpportunityDialogOpen, setIsOpportunityDialogOpen] = useState(false);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [activeOpportunity, setActiveOpportunity] = useState(null);
  const [activeDetailOpp, setActiveDetailOpp] = useState(null);
  const [pipelineView, setPipelineView] = useState('table'); // table | kanban
  const defaultStages = [
    'Prospecto',
    'Contactado',
    'Calificado',
    'Demo/Discovery',
    'Propuesta',
    'Negociación',
    'Cierre ganado',
    'Cierre perdido',
  ];
  const [customStageInput, setCustomStageInput] = useState('');
  const [stageEdits, setStageEdits] = useState({});
  const [newOpportunity, setNewOpportunity] = useState({
    name: '',
    stage: 'Prospecto',
    amount: '',
    currency: 'USD',
    nextStep: '',
    nextStepDue: '',
    customerId: '',
    ownerId: '',
  });
  const [stageForm, setStageForm] = useState({
    stage: 'Prospecto',
    amount: '',
    currency: 'USD',
    expectedCloseDate: '',
    nextStep: '',
    nextStepDue: '',
    reasonLost: '',
    competitor: '',
    ownerId: '',
    painNeed: '',
    budgetFit: '',
    decisionMaker: '',
    timeline: '',
    stakeholders: '',
    useCases: '',
    risks: '',
    razonesBloqueo: '',
    requisitosLegales: '',
  });
  const [ownerSearchTerm, setOwnerSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [territoryFilter, setTerritoryFilter] = useState('all');
  const [oppSummary, setOppSummary] = useState(null);

  const [isCaptureOpen, setIsCaptureOpen] = useState(false);
  const captureInitial = {
    name: '',
    stage: 'Prospecto',
    customerId: '',
    source: '',
    utmSource: '',
    utmMedium: '',
    utmCampaign: '',
    utmTerm: '',
    utmContent: '',
    budgetFit: 'sí',
    decisionMaker: '',
    timeline: '',
    nextStep: '',
    nextStepDue: '',
  };
  const [captureForm, setCaptureForm] = useState(captureInitial);
  const stageOptions = useMemo(() => {
    const fromCatalog =
      stageDefinitions && stageDefinitions.length > 0
        ? [...stageDefinitions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((s) => s.name)
        : defaultStages;
    const set = new Set(fromCatalog);
    opportunities.forEach((opp) => {
      if (opp.stage) set.add(opp.stage);
    });
    return Array.from(set);
  }, [defaultStages, stageDefinitions, opportunities]);

  const handleAddCustomStage = async () => {
    const value = (customStageInput || '').trim();
    if (!value) return;
    try {
      await createOpportunityStage({ name: value });
      setCustomStageInput('');
      await loadOpportunityStages();
      toast.success('Etapa agregada');
    } catch (err) {
      console.error('Error creando etapa:', err);
      toast.error(err?.message || 'No se pudo crear la etapa');
    }
  };
  const handleUpdateStage = async (id) => {
    const draft = stageEdits[id];
    if (!draft) return;
    try {
      await updateOpportunityStage(id, draft);
      await loadOpportunityStages();
      toast.success('Etapa actualizada');
    } catch (err) {
      console.error('Error actualizando etapa:', err);
      toast.error(err?.message || 'No se pudo actualizar la etapa');
    }
  };
  const handleDeleteStage = async (id) => {
    try {
      await deleteOpportunityStage(id);
      await loadOpportunityStages();
      toast.success('Etapa eliminada');
    } catch (err) {
      console.error('Error eliminando etapa:', err);
      toast.error(err?.message || 'No se pudo eliminar la etapa');
    }
  };

  const handleStageFieldChange = (id, field, value) => {
    setStageEdits((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleQuickMoveStage = async (oppId, stage) => {
    try {
      await fetchApi(`/opportunities/${oppId}/stage`, {
        method: 'PATCH',
        body: JSON.stringify({ stage }),
      });
      refreshOpportunities();
      toast.success('Etapa actualizada');
    } catch (err) {
      console.error('Error moviendo etapa:', err);
      toast.error(err?.message || 'No se pudo mover la etapa');
    }
  };

  const handleMqlDecision = async (oppId, status) => {
    const reason = status === 'rejected' ? window.prompt('Razón de rechazo MQL', '') || '' : undefined;
    try {
      await fetchApi(`/opportunities/${oppId}/mql`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      refreshOpportunities();
      toast.success(`MQL ${status}`);
    } catch (err) {
      console.error('Error MQL:', err);
      toast.error(err?.message || 'No se pudo marcar MQL');
    }
  };

  const handleSqlDecision = async (oppId, status) => {
    const reason = status === 'rejected' ? window.prompt('Razón de rechazo SQL', '') || '' : undefined;
    try {
      await fetchApi(`/opportunities/${oppId}/sql`, {
        method: 'PATCH',
        body: JSON.stringify({ status, reason }),
      });
      refreshOpportunities();
      toast.success(`SQL ${status}`);
    } catch (err) {
      console.error('Error SQL:', err);
      toast.error(err?.message || 'No se pudo marcar SQL');
    }
  };

  const handleCaptureSubmit = async () => {
    try {
      if (!captureForm.customerId) {
        toast.error('Selecciona cliente');
        return;
      }
      await fetchApi('/opportunities/capture/form', {
        method: 'POST',
        body: JSON.stringify({
          ...captureForm,
          nextStepDue: captureForm.nextStepDue || new Date().toISOString().slice(0, 10),
        }),
      });
      setIsCaptureOpen(false);
      setCaptureForm(captureInitial);
      refreshOpportunities();
      toast.success('Oportunidad capturada');
    } catch (err) {
      console.error('Error capturando oportunidad:', err);
      toast.error(err?.message || 'No se pudo capturar oportunidad');
    }
  };
  const requiredFieldsByStage = {
    Prospecto: ['nextStep', 'nextStepDue'],
    Contactado: ['nextStep', 'nextStepDue'],
    Calificado: ['nextStep', 'nextStepDue', 'painNeed', 'budgetFit', 'decisionMaker', 'timeline'],
    'Demo/Discovery': ['nextStep', 'nextStepDue', 'stakeholders', 'useCases', 'risks'],
    Propuesta: ['nextStep', 'nextStepDue', 'amount', 'currency', 'expectedCloseDate'],
    Negociación: [
      'nextStep',
      'nextStepDue',
      'amount',
      'currency',
      'expectedCloseDate',
      'razonesBloqueo',
      'requisitosLegales',
    ],
    'Cierre ganado': ['nextStep', 'nextStepDue', 'amount', 'currency'],
    'Cierre perdido': ['reasonLost'],
  };

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

    // Map filterType to correct customerType filter
    if (filterType === 'individual') {
      // "Clientes" tab should show business AND individual (exclude suppliers/employees)
      filters.customerType = { $in: ['business', 'individual'] };
    } else if (filterType === 'supplier') {
      filters.customerType = 'supplier';
    } else if (filterType === 'employee') {
      filters.customerType = 'employee';
    }
    // 'all', 'pipeline', 'settings' show everything, no customerType filter needed

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
  /* const isPipelineTab = filterType === 'pipeline'; // REMOVED DUPLICATE */
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

  const refreshOpportunities = useCallback(() => {
    loadOpportunities(1, opportunitiesPagination.limit || 20, {
      stage: opportunityStageFilter === 'all' ? undefined : opportunityStageFilter,
      search: opportunitySearch?.trim() || undefined,
      ownerId: ownerFilter === 'all' ? undefined : ownerFilter,
      territory: territoryFilter === 'all' ? undefined : territoryFilter,
    });
  }, [
    loadOpportunities,
    opportunitiesPagination.limit,
    opportunityStageFilter,
    opportunitySearch,
    ownerFilter,
    territoryFilter,
  ]);

  const handleCreateOpportunity = async () => {
    try {
      if (!newOpportunity.customerId) {
        toast.error('Selecciona un cliente para la oportunidad');
        return;
      }
      const payload = {
        ...newOpportunity,
        amount: newOpportunity.amount ? Number(newOpportunity.amount) : undefined,
        ownerId: newOpportunity.ownerId || undefined,
      };
      await fetchApi('/opportunities', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setIsOpportunityDialogOpen(false);
      setNewOpportunity({
        name: '',
        stage: 'Prospecto',
        amount: '',
        currency: 'USD',
        nextStep: '',
        nextStepDue: '',
        customerId: '',
        ownerId: '',
      });
      refreshOpportunities();
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast.error(error?.message || 'Error al crear oportunidad');
    }
  };

  const slaAging = useMemo(() => {
    const today = new Date();
    let overdue = 0;
    let dueSoon = 0;
    opportunities.forEach((opp) => {
      if (!opp.nextStepDue) return;
      const due = new Date(opp.nextStepDue);
      const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) overdue += 1;
      if (diffDays >= 0 && diffDays <= 2) dueSoon += 1;
    });
    return { overdue, dueSoon };
  }, [opportunities]);



  const openStageDialog = (opp) => {
    setActiveOpportunity(opp);
    setStageForm({
      stage: opp.stage || 'Prospecto',
      amount: opp.amount || '',
      currency: opp.currency || 'USD',
      expectedCloseDate: opp.expectedCloseDate
        ? new Date(opp.expectedCloseDate).toISOString().slice(0, 10)
        : '',
      nextStep: opp.nextStep || '',
      nextStepDue: opp.nextStepDue ? new Date(opp.nextStepDue).toISOString().slice(0, 10) : '',
      reasonLost: opp.reasonLost || '',
      competitor: opp.competitor || '',
      painNeed: opp.painNeed || '',
      budgetFit: opp.budgetFit || '',
      decisionMaker: opp.decisionMaker || '',
      timeline: opp.timeline || '',
      stakeholders: (opp.stakeholders || []).join(', '),
      useCases: (opp.useCases || []).join(', '),
      risks: (opp.risks || []).join(', '),
      razonesBloqueo: (opp.razonesBloqueo || []).join(', '),
      requisitosLegales: (opp.requisitosLegales || []).join(', '),
      ownerId: opp.ownerId?._id || opp.ownerId || '',
    });
    setIsStageDialogOpen(true);
  };

  const handleChangeStage = async () => {
    if (!activeOpportunity?._id) {
      toast.error('No se seleccionó oportunidad');
      return;
    }
    if (!stageForm.stage) {
      toast.error('Selecciona la etapa');
      return;
    }
    if (stageForm.stage === 'Cierre perdido' && !stageForm.reasonLost) {
      toast.error('Indica razón de pérdida');
      return;
    }
    const required = requiredFieldsByStage[stageForm.stage] || [];
    const missing = required.filter((field) => {
      const value = stageForm[field];
      if (value === null || value === undefined) return true;
      if (typeof value === 'string' && value.trim() === '') return true;
      if (Array.isArray(value) && value.length === 0) return true;
      return false;
    });
    if (missing.length > 0) {
      toast.error(`Faltan campos: ${missing.join(', ')}`);
      return;
    }
    try {
      const payload = {
        stage: stageForm.stage,
        amount: stageForm.amount ? Number(stageForm.amount) : undefined,
        currency: stageForm.currency || undefined,
        expectedCloseDate: stageForm.expectedCloseDate || undefined,
        nextStep: stageForm.nextStep || undefined,
        nextStepDue: stageForm.nextStepDue || undefined,
        reasonLost: stageForm.reasonLost || undefined,
        competitor: stageForm.competitor || undefined,
        ownerId: stageForm.ownerId || undefined,
        painNeed: stageForm.painNeed || undefined,
        budgetFit: stageForm.budgetFit || undefined,
        decisionMaker: stageForm.decisionMaker || undefined,
        timeline: stageForm.timeline || undefined,
        stakeholders: stageForm.stakeholders
          ? stageForm.stakeholders.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        useCases: stageForm.useCases
          ? stageForm.useCases.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        risks: stageForm.risks
          ? stageForm.risks.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        razonesBloqueo: stageForm.razonesBloqueo
          ? stageForm.razonesBloqueo.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
        requisitosLegales: stageForm.requisitosLegales
          ? stageForm.requisitosLegales.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      };
      await fetchApi(`/opportunities/${activeOpportunity._id}/stage`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      setIsStageDialogOpen(false);
      setActiveOpportunity(null);
      refreshOpportunities();
      toast.success('Etapa actualizada');
    } catch (error) {
      console.error('Error cambiando etapa:', error);
      toast.error(error?.message || 'Error al cambiar etapa');
    }
  };

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
    if (filterType === 'employee' || filterType === 'pipeline' || filterType === 'settings' || activeTopTab === 'playbooks' || activeTopTab === 'reminders') {
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
  }, [committedSearch, filterType, currentFilters, reloadCustomers, setCurrentPage, activeTopTab]);

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
    loadOpportunityStages();
  }, [loadOpportunityStages]);

  useEffect(() => {
    // cargar owners para filtros y selects
    searchOwners('');
  }, [searchOwners]);

  useEffect(() => {
    const stage = opportunityStageFilter === 'all' ? undefined : opportunityStageFilter;
    const search = opportunitySearch?.trim() || undefined;
    const ownerId = ownerFilter === 'all' ? undefined : ownerFilter;
    const territory = territoryFilter === 'all' ? undefined : territoryFilter;
    loadOpportunities(1, opportunitiesPagination.limit || 20, {
      stage,
      search,
      ownerId,
      territory,
    });
  }, [
    loadOpportunities,
    opportunityStageFilter,
    opportunitySearch,
    ownerFilter,
    territoryFilter,
    opportunitiesPagination.limit,
  ]);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetchApi('/opportunities/summary');
        setOppSummary(response?.data || response || null);
      } catch (err) {
        console.error('Error cargando resumen pipeline:', err.message);
      }
    };
    fetchSummary();
  }, []);

  useEffect(() => {
    if (!isOpportunityDialogOpen && !isStageDialogOpen) return;
    searchOwners(ownerSearchTerm);
  }, [isOpportunityDialogOpen, isStageDialogOpen, ownerSearchTerm, searchOwners]);

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
      refreshEmployeesData().catch(() => { });
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

  /* DEBUG: Checking user role structure
  console.log('DEBUG USER ROLE:', user?.role); 
  */



  return (
    <div className="space-y-6">
      {forceEmployeeTab && <HRNavigation />}
      <Tabs value={activeTopTab} onValueChange={handleTopTabChange} className="w-full">
        {!forceEmployeeTab && (
          <TabsList className="grid w-full grid-cols-5 max-w-[1000px]">
            <TabsTrigger value="contacts">Contactos</TabsTrigger>
            <TabsTrigger value="pipeline">Embudo de Ventas</TabsTrigger>
            <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
            <TabsTrigger value="reminders">Recordatorios</TabsTrigger>
            {isAdmin && <TabsTrigger value="settings">Configuración</TabsTrigger>}
          </TabsList>
        )}
        <TabsContent value="contacts" className="space-y-6">

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

          {(
            <>
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
                      className={`h-4 w-4 mr-2 ${(isEmployeeTab ? employeesLoading : loading) ? 'animate-spin' : ''
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

                  {/* Botón para empleados: abre el drawer directamente sin diálogo */}
                  {isEmployeeTab ? (
                    <Button
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setSelectedEmployeeId(null);
                        setSelectedEmployeeSnapshot(null);
                        setIsEmployeeDrawerOpen(true);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Crear empleado
                    </Button>
                  ) : (
                    /* Botón para contactos: abre el diálogo del CRM */
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                          <Plus className="h-4 w-4 mr-2" /> Agregar contacto
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Agregar nuevo contacto</DialogTitle>
                          <DialogDescription>
                            Completa los detalles para registrar un nuevo contacto en el sistema.
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
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="business">Cliente</SelectItem>
                                <SelectItem value="supplier">Proveedor</SelectItem>
                                <SelectItem value="employee">Empleado</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="manager">Gestor</SelectItem>
                                <SelectItem value="Repartidor">Repartidor</SelectItem>
                                <SelectItem value="Cajero">Cajero</SelectItem>
                                <SelectItem value="Mesonero">Mesonero</SelectItem>
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
                            Agregar contacto
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
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
                          <TableHeader><TableRow><TableHead>Contacto</TableHead><TableHead>Tier RFM</TableHead><TableHead>Tipo</TableHead><TableHead>Dirección</TableHead><TableHead>Email</TableHead><TableHead>Contacto Principal</TableHead><TableHead>Gastos Totales</TableHead><TableHead>Acciones</TableHead></TableRow></TableHeader>
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
                                    <div className="text-sm max-w-[200px] truncate" title={customer.addresses?.find(a => a.isDefault)?.street || customer.addresses?.[0]?.street || ''}>
                                      {customer.addresses?.find(a => a.isDefault)?.street || customer.addresses?.[0]?.street || '-'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm flex items-center gap-2">
                                      {customer.contacts?.find(c => c.type === 'email')?.value ? (
                                        <>
                                          <Mail className="h-3 w-3" />
                                          <span className="truncate max-w-[150px]" title={customer.contacts.find(c => c.type === 'email').value}>
                                            {customer.contacts.find(c => c.type === 'email').value}
                                          </span>
                                        </>
                                      ) : '-'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {primaryContact?.value && primaryContact.type !== 'email' ? (
                                      <div className="text-sm flex items-center gap-2"><Phone className="h-3 w-3" /> {primaryContact.value}</div>
                                    ) : '-'}
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
            </>
          )}

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
                  <div className="space-y-2"><Label>Nombre</Label><Input value={editingFormState.name} onChange={(e) => setEditingFormState({ ...editingFormState, name: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Tipo de Contacto</Label><Select value={editingFormState.customerType} onValueChange={(value) => setEditingFormState({ ...editingFormState, customerType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="business">Cliente</SelectItem><SelectItem value="supplier">Proveedor</SelectItem><SelectItem value="employee">Empleado</SelectItem><SelectItem value="admin">Admin</SelectItem><SelectItem value="manager">Gestor</SelectItem><SelectItem value="Repartidor">Repartidor</SelectItem><SelectItem value="Cajero">Cajero</SelectItem><SelectItem value="Mesonero">Mesonero</SelectItem></SelectContent></Select></div>
                  <div className="space-y-2"><Label>Empresa</Label><Input value={editingFormState.companyName} onChange={(e) => setEditingFormState({ ...editingFormState, companyName: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Email</Label><Input type="email" value={editingFormState.email} onChange={(e) => setEditingFormState({ ...editingFormState, email: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Teléfono</Label><Input value={editingFormState.phone} onChange={(e) => setEditingFormState({ ...editingFormState, phone: e.target.value })} /></div>
                  <div className="col-span-2 space-y-2"><Label>Dirección</Label><Input value={editingFormState.street} onChange={(e) => setEditingFormState({ ...editingFormState, street: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Ciudad</Label><Input value={editingFormState.city} onChange={(e) => setEditingFormState({ ...editingFormState, city: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Estado</Label><Input value={editingFormState.state} onChange={(e) => setEditingFormState({ ...editingFormState, state: e.target.value })} /></div>
                  <div className="col-span-2 space-y-2"><Label>Identificación Fiscal</Label><div className="flex gap-2"><Select value={editingFormState.taxType} onValueChange={(value) => setEditingFormState({ ...editingFormState, taxType: value })}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="V">V</SelectItem><SelectItem value="E">E</SelectItem><SelectItem value="J">J</SelectItem><SelectItem value="G">G</SelectItem></SelectContent></Select><Input value={editingFormState.taxId} onChange={(e) => setEditingFormState({ ...editingFormState, taxId: e.target.value })} /></div></div>
                  <div className="col-span-2 space-y-2">
                    <LocationPicker
                      label="Ubicación del Cliente"
                      value={editingFormState.primaryLocation}
                      onChange={(location) => setEditingFormState({ ...editingFormState, primaryLocation: location })}
                    />
                  </div>
                  <div className="col-span-2 space-y-2"><Label>Notas</Label><Textarea value={editingFormState.notes} onChange={(e) => setEditingFormState({ ...editingFormState, notes: e.target.value })} /></div>
                </div>
                <DialogFooter><Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button><Button onClick={handleEditContact}>Guardar Cambios</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}

        </TabsContent>
        <TabsContent value="pipeline" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h2 className="text-3xl font-bold text-foreground">Embudo de Ventas</h2>
          </div>
          <Card>
            <CardHeader className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Pipeline de oportunidades</CardTitle>
                  <CardDescription>Vista rápida de etapas y próximos pasos.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select value={pipelineView} onValueChange={setPipelineView}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="table">Tabla</SelectItem>
                      <SelectItem value="kanban">Kanban</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={refreshOpportunities} disabled={opportunitiesLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${opportunitiesLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsCaptureOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Capturar lead
                  </Button>
                  <Button size="sm" onClick={() => setIsOpportunityDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear oportunidad
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr,220px]">
                <Input
                  placeholder="Buscar oportunidad..."
                  value={opportunitySearch}
                  onChange={(e) => setOpportunitySearch(e.target.value)}
                />
                <div className="flex gap-2 flex-wrap">
                  <Select value={opportunityStageFilter} onValueChange={setOpportunityStageFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las etapas</SelectItem>
                      {stageOptions.map((stage) => (
                        <SelectItem key={stage} value={stage}>
                          {stage}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los owners</SelectItem>
                      {owners.map((o) => (
                        <SelectItem key={o._id} value={o._id}>
                          {o.firstName ? `${o.firstName} ${o.lastName || ''}`.trim() : o.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="w-[200px]"
                    placeholder="Territorio"
                    value={territoryFilter === 'all' ? '' : territoryFilter}
                    onChange={(e) =>
                      setTerritoryFilter(e.target.value.trim() ? e.target.value : 'all')
                    }
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {oppSummary?.byStage && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {oppSummary.byStage.map((row) => (
                    <div key={row._id || 'sin-etapa'} className="rounded-md border p-3">
                      <div className="text-sm font-semibold">{row._id || 'Sin etapa'}</div>
                      <div className="text-2xl font-bold">{row.total || 0}</div>
                      <div className="text-xs text-muted-foreground">
                        Prob promedio: {Math.round(row.avgProbability || 0)}% · Monto: {row.amount || 0}
                      </div>
                    </div>
                  ))}
                  <div className="rounded-md border p-3 bg-amber-50 dark:bg-amber-950/30">
                    <div className="text-sm font-semibold text-amber-900 dark:text-amber-400">Vence en ≤2 días</div>
                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-400">{slaAging.dueSoon}</div>
                    <div className="text-xs text-amber-800 dark:text-amber-500">Next step cercano requiere acción.</div>
                  </div>
                  <div className="rounded-md border p-3 bg-red-50 dark:bg-red-950/30">
                    <div className="text-sm font-semibold text-red-900 dark:text-red-400">Vencidos</div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-400">{slaAging.overdue}</div>
                    <div className="text-xs text-red-800 dark:text-red-500">Next step vencido (SLA roto).</div>
                  </div>
                </div>
              )}
              {pipelineView === 'table' ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Oportunidad</TableHead>
                        <TableHead>Etapa</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Next step</TableHead>
                        <TableHead>Vence</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opportunitiesLoading && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                            Cargando pipeline...
                          </TableCell>
                        </TableRow>
                      )}
                      {!opportunitiesLoading && opportunities.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                            Sin oportunidades aún.
                          </TableCell>
                        </TableRow>
                      )}
                      {!opportunitiesLoading &&
                        opportunities.map((opp) => (
                          <TableRow key={opp._id}>
                            <TableCell>
                              <div className="font-semibold">{opp.name || 'Sin nombre'}</div>
                              <div className="text-xs text-muted-foreground">
                                Cliente: {opp.customerId?.name || opp.customerId?.companyName || opp.customerId || '—'}
                              </div>
                            </TableCell>
                            <TableCell>{opp.stage || '—'}</TableCell>
                            <TableCell className="text-sm">
                              {opp.ownerId?.name || opp.ownerId?.email || '—'}
                            </TableCell>
                            <TableCell>
                              {opp.amount ? (
                                <>
                                  {opp.amount} {opp.currency || 'USD'}
                                </>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{opp.nextStep || '—'}</TableCell>
                            <TableCell className="text-sm">
                              {opp.nextStepDue ? new Date(opp.nextStepDue).toISOString().slice(0, 10) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 mb-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setActiveDetailOpp(opp);
                                    setIsDetailViewOpen(true);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openStageDialog(opp)}>
                                  Cambiar etapa
                                </Button>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <Button variant="secondary" size="xs" onClick={() => handleMqlDecision(opp._id, 'accepted')}>
                                  MQL ✓
                                </Button>
                                <Button variant="destructive" size="xs" onClick={() => handleMqlDecision(opp._id, 'rejected')}>
                                  MQL ×
                                </Button>
                                <Button variant="secondary" size="xs" onClick={() => handleSqlDecision(opp._id, 'accepted')}>
                                  SQL ✓
                                </Button>
                                <Button variant="destructive" size="xs" onClick={() => handleSqlDecision(opp._id, 'rejected')}>
                                  SQL ×
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      placeholder="Agregar etapa personalizada"
                      value={customStageInput}
                      onChange={(e) => setCustomStageInput(e.target.value)}
                      className="w-full sm:w-64"
                    />
                    <Button type="button" variant="outline" onClick={handleAddCustomStage}>
                      Añadir etapa
                    </Button>
                  </div>
                  <DndProvider backend={HTML5Backend}>
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {stageOptions.map((stage) => {
                        const cards = opportunities.filter((opp) => opp.stage === stage);
                        return (
                          <KanbanColumn
                            key={stage}
                            stage={stage}
                            cards={cards}
                            onDrop={(opp) => openStageDialog({ ...opp, stage })}
                            onQuickMove={handleQuickMoveStage}
                            onMqlDecision={handleMqlDecision}
                            onSqlDecision={handleSqlDecision}
                            onOpenDetail={(opp) => {
                              setActiveDetailOpp(opp);
                              setIsDetailViewOpen(true);
                            }}
                            stageOptions={stageOptions}
                          />
                        );
                      })}
                    </div>
                  </DndProvider>
                  <div className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-semibold">Catálogo de etapas</div>
                        <p className="text-xs text-muted-foreground">
                          Edita probabilidad/orden y elimina etapas del tenant.
                        </p>
                      </div>
                      {stageDefinitionsLoading && (
                        <Badge variant="outline">Cargando...</Badge>
                      )}
                    </div>
                    <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
                      {(stageDefinitions || []).map((stage) => (
                        <div key={stage._id} className="rounded border p-2 grid grid-cols-4 gap-2 text-sm">
                          <div className="col-span-2">
                            <div className="font-medium">{stage.name}</div>
                            <div className="text-[11px] text-muted-foreground">
                              Required: {(stage.requiredFields || []).join(', ') || '—'}
                            </div>
                          </div>
                          <div>
                            <Label className="text-[11px]">Prob (%)</Label>
                            <Input
                              type="number"
                              value={stageEdits[stage._id]?.probability ?? stage.probability ?? 0}
                              onChange={(e) =>
                                handleStageFieldChange(stage._id, 'probability', Number(e.target.value))
                              }
                            />
                          </div>
                          <div>
                            <Label className="text-[11px]">Orden</Label>
                            <Input
                              type="number"
                              value={stageEdits[stage._id]?.order ?? stage.order ?? 0}
                              onChange={(e) =>
                                handleStageFieldChange(stage._id, 'order', Number(e.target.value))
                              }
                            />
                          </div>
                          <div className="col-span-4 flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStage(stage._id)}
                            >
                              Guardar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteStage(stage._id)}
                            >
                              Eliminar
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="playbooks" className="space-y-6">
          <PlaybooksManagement />
        </TabsContent>

        <TabsContent value="reminders" className="space-y-6">
          <RemindersWidget />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Configuración del CRM</CardTitle>
                <CardDescription>Gestiona las etapas personalizadas de tus embudos de venta.</CardDescription>
              </CardHeader>
              <CardContent>
                <OpportunityStagesManagement />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <Dialog open={isOpportunityDialogOpen} onOpenChange={setIsOpportunityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva oportunidad</DialogTitle>
            <DialogDescription>Crea una oportunidad en el embudo.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nombre</Label>
              <Input
                value={newOpportunity.name}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, name: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Cliente (ID)</Label>
              {crmData.length > 0 ? (
                <Select
                  value={newOpportunity.customerId}
                  onValueChange={(value) => setNewOpportunity({ ...newOpportunity, customerId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {crmData.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name || c.companyName || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="customerId"
                  value={newOpportunity.customerId}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, customerId: e.target.value })}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label>Etapa</Label>
              <Select
                value={newOpportunity.stage}
                onValueChange={(value) => setNewOpportunity({ ...newOpportunity, stage: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Monto</Label>
              <Input
                type="number"
                value={newOpportunity.amount}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, amount: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Moneda</Label>
              <Input
                value={newOpportunity.currency}
                onChange={(e) => setNewOpportunity({ ...newOpportunity, currency: e.target.value })}
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Next step</Label>
                <Input
                  value={newOpportunity.nextStep}
                  onChange={(e) => setNewOpportunity({ ...newOpportunity, nextStep: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha compromiso</Label>
                <Input
                  type="date"
                  value={newOpportunity.nextStepDue}
                  onChange={(e) =>
                    setNewOpportunity({ ...newOpportunity, nextStepDue: e.target.value })
                  }
                />
              </div>
            </div>
            <OwnerSelect
              value={newOpportunity.ownerId}
              onChange={(value) => setNewOpportunity((prev) => ({ ...prev, ownerId: value }))}
              disabled={!canViewAllOpportunities}
              searchTerm={ownerSearchTerm}
              onSearchChange={setOwnerSearchTerm}
              onSearch={searchOwners}
              loading={ownersLoading}
              owners={owners}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpportunityDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateOpportunity}>Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCaptureOpen} onOpenChange={setIsCaptureOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Capturar lead (formulario/UTM)</DialogTitle>
            <DialogDescription>Crear oportunidad desde un lead entrante con fuente y UTM.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Nombre de la oportunidad</Label>
              <Input
                value={captureForm.name}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ej: Demo con ACME"
              />
            </div>
            <div className="space-y-1">
              <Label>Cliente</Label>
              {crmData.length > 0 ? (
                <Select
                  value={captureForm.customerId}
                  onValueChange={(value) => setCaptureForm((prev) => ({ ...prev, customerId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {crmData.map((c) => (
                      <SelectItem key={c._id} value={c._id}>
                        {c.name || c.companyName || 'Sin nombre'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="customerId"
                  value={captureForm.customerId}
                  onChange={(e) => setCaptureForm((prev) => ({ ...prev, customerId: e.target.value }))}
                />
              )}
            </div>
            <div className="space-y-1">
              <Label>Etapa inicial</Label>
              <Select
                value={captureForm.stage}
                onValueChange={(value) => setCaptureForm((prev) => ({ ...prev, stage: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Fuente</Label>
              <Input
                value={captureForm.source}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, source: e.target.value }))}
                placeholder="Ej: Landing, Evento, Chat"
              />
            </div>
            <div className="space-y-1">
              <Label>UTM Source</Label>
              <Input
                value={captureForm.utmSource}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, utmSource: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>UTM Medium</Label>
              <Input
                value={captureForm.utmMedium}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, utmMedium: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>UTM Campaign</Label>
              <Input
                value={captureForm.utmCampaign}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, utmCampaign: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>UTM Term</Label>
              <Input
                value={captureForm.utmTerm}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, utmTerm: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>UTM Content</Label>
              <Input
                value={captureForm.utmContent}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, utmContent: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Ajuste presupuesto (fit)</Label>
              <Select
                value={captureForm.budgetFit}
                onValueChange={(value) => setCaptureForm((prev) => ({ ...prev, budgetFit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sí">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="parcial">Parcial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Decision maker</Label>
              <Input
                value={captureForm.decisionMaker}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, decisionMaker: e.target.value }))}
                placeholder="Nombre/rol"
              />
            </div>
            <div className="space-y-1">
              <Label>Timeline</Label>
              <Input
                value={captureForm.timeline}
                onChange={(e) => setCaptureForm((prev) => ({ ...prev, timeline: e.target.value }))}
                placeholder="Ej: Q2, 30 días"
              />
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Next step</Label>
                <Input
                  value={captureForm.nextStep}
                  onChange={(e) => setCaptureForm((prev) => ({ ...prev, nextStep: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha compromiso</Label>
                <Input
                  type="date"
                  value={captureForm.nextStepDue}
                  onChange={(e) => setCaptureForm((prev) => ({ ...prev, nextStepDue: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCaptureOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCaptureSubmit}>Capturar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isStageDialogOpen} onOpenChange={setIsStageDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Cambiar etapa</DialogTitle>
            <DialogDescription>
              Ajusta la etapa y la información mínima requerida para la oportunidad.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label>Etapa</Label>
              <Select
                value={stageForm.stage}
                onValueChange={(value) => setStageForm((prev) => ({ ...prev, stage: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {stageOptions.map((stage) => (
                    <SelectItem key={stage} value={stage}>
                      {stage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <OwnerSelect
              value={stageForm.ownerId}
              onChange={(value) => setStageForm((prev) => ({ ...prev, ownerId: value }))}
              disabled={!canViewAllOpportunities}
              searchTerm={ownerSearchTerm}
              onSearchChange={setOwnerSearchTerm}
              onSearch={searchOwners}
              loading={ownersLoading}
              owners={owners}
            />
            {(stageForm.stage === 'Propuesta' ||
              stageForm.stage === 'Negociación' ||
              stageForm.stage === 'Cierre ganado') && (
                <>
                  <div className="space-y-1">
                    <Label>Monto</Label>
                    <Input
                      type="number"
                      value={stageForm.amount}
                      onChange={(e) => setStageForm((prev) => ({ ...prev, amount: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Moneda</Label>
                    <Input
                      value={stageForm.currency}
                      onChange={(e) => setStageForm((prev) => ({ ...prev, currency: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Fecha cierre estimada</Label>
                    <Input
                      type="date"
                      value={stageForm.expectedCloseDate}
                      onChange={(e) =>
                        setStageForm((prev) => ({ ...prev, expectedCloseDate: e.target.value }))
                      }
                    />
                  </div>
                </>
              )}
            {(stageForm.stage === 'Calificado' || stageForm.stage === 'Demo/Discovery') && (
              <>
                <div className="space-y-1">
                  <Label>Dolor/Necesidad</Label>
                  <Input
                    value={stageForm.painNeed}
                    onChange={(e) => setStageForm((prev) => ({ ...prev, painNeed: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Budget fit (sí/no)</Label>
                  <Select
                    value={stageForm.budgetFit || 'sí'}
                    onValueChange={(value) => setStageForm((prev) => ({ ...prev, budgetFit: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sí">Sí</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Decision maker</Label>
                  <Input
                    value={stageForm.decisionMaker}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, decisionMaker: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Timeline</Label>
                  <Input
                    value={stageForm.timeline}
                    onChange={(e) => setStageForm((prev) => ({ ...prev, timeline: e.target.value }))}
                  />
                </div>
              </>
            )}
            {stageForm.stage === 'Demo/Discovery' && (
              <>
                <div className="space-y-1 col-span-2">
                  <Label>Stakeholders (separar por coma)</Label>
                  <Input
                    value={stageForm.stakeholders}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, stakeholders: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Casos de uso (coma)</Label>
                  <Input
                    value={stageForm.useCases}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, useCases: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Riesgos (coma)</Label>
                  <Input
                    value={stageForm.risks}
                    onChange={(e) => setStageForm((prev) => ({ ...prev, risks: e.target.value }))}
                  />
                </div>
              </>
            )}
            {stageForm.stage === 'Negociación' && (
              <>
                <div className="space-y-1 col-span-2">
                  <Label>Razones de bloqueo (coma)</Label>
                  <Input
                    value={stageForm.razonesBloqueo}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, razonesBloqueo: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Requisitos legales (coma)</Label>
                  <Input
                    value={stageForm.requisitosLegales}
                    onChange={(e) =>
                      setStageForm((prev) => ({ ...prev, requisitosLegales: e.target.value }))
                    }
                  />
                </div>
              </>
            )}
            <div className="col-span-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Next step</Label>
                <Input
                  value={stageForm.nextStep}
                  onChange={(e) => setStageForm((prev) => ({ ...prev, nextStep: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha compromiso</Label>
                <Input
                  type="date"
                  value={stageForm.nextStepDue}
                  onChange={(e) =>
                    setStageForm((prev) => ({ ...prev, nextStepDue: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Competidor</Label>
              <Input
                value={stageForm.competitor}
                onChange={(e) =>
                  setStageForm((prev) => ({ ...prev, competitor: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Razón de pérdida</Label>
              <Input
                placeholder="Requerido si etapa = Cierre perdido"
                value={stageForm.reasonLost}
                onChange={(e) =>
                  setStageForm((prev) => ({ ...prev, reasonLost: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStageDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleChangeStage}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OpportunityDetailDialog
        open={isDetailViewOpen}
        onOpenChange={(open) => {
          setIsDetailViewOpen(open);
          if (!open) setActiveDetailOpp(null);
        }}
        opportunity={activeDetailOpp}
        onRefresh={refreshOpportunities}
      />

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

function KanbanColumn({ stage, cards, onDrop, onQuickMove, onMqlDecision, onSqlDecision, onOpenDetail, stageOptions }) {
  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'OPPORTUNITY_CARD',
      drop: (item) => onDrop(item.opp),
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [onDrop],
  );

  return (
    <div
      ref={drop}
      className={`rounded-lg border bg-muted/40 p-3 ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold">{stage}</div>
        <Badge variant="outline">{cards.length}</Badge>
      </div>
      <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
        {cards.length === 0 && (
          <div className="text-sm text-muted-foreground">Sin oportunidades</div>
        )}
        {cards.map((opp) => (
          <KanbanCard
            key={opp._id}
            opp={opp}
            onQuickMove={onQuickMove}
            onMqlDecision={onMqlDecision}
            onSqlDecision={onSqlDecision}
            onOpenDetail={onOpenDetail}
            stageOptions={stageOptions}
          />
        ))}
      </div>
    </div>
  );
}

function KanbanCard({ opp, onQuickMove, onMqlDecision, onSqlDecision, onOpenDetail, stageOptions }) {
  const [, drag] = useDrag(() => ({ type: 'OPPORTUNITY_CARD', opp }), [opp]);
  const dueDate = opp.nextStepDue ? new Date(opp.nextStepDue) : null;
  const today = new Date();
  const diffDays = dueDate ? Math.floor((dueDate - today) / (1000 * 60 * 60 * 24)) : null;
  const isOverdue = diffDays !== null && diffDays < 0;
  const isDueSoon = diffDays !== null && diffDays >= 0 && diffDays <= 2;

  return (
    <div
      ref={drag}
      className="rounded-md border bg-background p-2 shadow-sm space-y-1 cursor-grab active:cursor-grabbing"
    >
      <div className="flex justify-between items-start">
        <div className="font-medium text-sm">{opp.name || 'Sin nombre'}</div>
        <Button variant="ghost" size="xs" className="h-4 w-4 p-0" onClick={() => onOpenDetail && onOpenDetail(opp)}>
          <Eye className="h-3 w-3" />
        </Button>
      </div>
      <div className="text-xs text-muted-foreground">
        Cliente: {opp.customerId?.name || opp.customerId?.companyName || '—'}
      </div>
      <div className="text-xs text-muted-foreground">
        Owner: {opp.ownerId?.name || opp.ownerId?.email || '—'}
      </div>
      <div className="text-xs flex items-center gap-2">
        <span>Next: {opp.nextStep || '—'}</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] ${isOverdue ? 'bg-destructive/20 text-destructive dark:bg-destructive/30 dark:text-destructive' : isDueSoon ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-muted text-muted-foreground'}`}>
          {opp.nextStepDue ? new Date(opp.nextStepDue).toISOString().slice(0, 10) : '—'}
        </span>
      </div>
      <Select
        value={opp.stage}
        onValueChange={(value) => onQuickMove(opp._id, value)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Mover a" />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="xs"
          onClick={() => onMqlDecision && onMqlDecision(opp._id, 'accepted')}
        >
          MQL ✓
        </Button>
        <Button
          variant="secondary"
          size="xs"
          onClick={() => onSqlDecision && onSqlDecision(opp._id, 'accepted')}
        >
          SQL ✓
        </Button>
      </div>
    </div>
  );
}
