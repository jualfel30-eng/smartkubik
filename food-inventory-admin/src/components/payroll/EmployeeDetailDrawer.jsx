import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import {
  Loader2,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileText,
  Plus,
  Trash2,
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  DollarSign,
  Users,
  Pause,
  Ban,
  CheckCircle,
  Sparkles,
  Info,
  Calendar,
  FileDown,
} from 'lucide-react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerClose } from '@/components/ui/drawer.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { useCRM } from '@/hooks/use-crm.js';
import { fetchApi, getApiBaseUrl } from '@/lib/api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import { Calendar as CalendarPicker } from '@/components/ui/calendar.jsx';
import { cn } from '@/lib/utils.js';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Activo' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'terminated', label: 'Terminado' },
  { value: 'draft', label: 'Borrador' },
];

const CONTRACT_TYPES = [
  { value: 'permanent', label: 'Indefinido' },
  { value: 'fixed_term', label: 'Plazo fijo' },
  { value: 'internship', label: 'Pasantía' },
  { value: 'contractor', label: 'Contrato de servicios' },
];

const PAY_FREQUENCIES = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Personalizada' },
];

const COMPENSATION_TYPES = [
  { value: 'salary', label: 'Salario fijo' },
  { value: 'hourly', label: 'Por hora' },
  { value: 'daily', label: 'Por día' },
];

const BASE_PROFILE_REQUIREMENTS = [
  { path: 'employeeNumber', label: 'Número de empleado' },
  { path: 'position', label: 'Posición' },
  { path: 'department', label: 'Departamento' },
  { path: 'hireDate', label: 'Fecha de ingreso' },
  { path: 'status', label: 'Estado' },
];

const ROLE_SPECIFIC_REQUIREMENTS = {
  operations: [
    { path: 'workLocation', label: 'Ubicación de trabajo' },
    { path: 'emergencyContact.phone', label: 'Teléfono de contacto de emergencia' },
  ],
  finance: [
    { path: 'emergencyContact.email', label: 'Correo de contacto de emergencia' },
    {
      path: 'documents',
      label: 'Documento de identidad adjunto',
      validator: ({ documents }) =>
        Array.isArray(documents) &&
        documents.some((doc) => doc.type?.toLowerCase().includes('id') && doc.url),
    },
  ],
  hr: [
    {
      path: 'tags',
      label: 'Etiquetas o habilidades',
      validator: ({ profileForm }) => Boolean(profileForm.tags && profileForm.tags.trim().length > 0),
    },
  ],
  default: [],
};

const CONTRACT_WARNING_RULES = [
  {
    when: ({ contractForm }) =>
      contractForm.contractType === 'permanent' && (!contractForm.benefits || contractForm.benefits.length === 0),
    message: 'Agrega beneficios para contratos permanentes.',
  },
  {
    when: ({ contractForm }) =>
      contractForm.contractType === 'contractor' && (!contractForm.deductions || contractForm.deductions.length === 0),
    message: 'Considera registrar deducciones para contratistas.',
  },
];

const getValueByPath = (source, path) => {
  if (!source || !path) return undefined;
  return path.split('.').reduce((acc, key) => {
    if (acc === undefined || acc === null) return undefined;
    return acc[key];
  }, source);
};

const createEmptyProfileForm = () => ({
  employeeNumber: '',
  position: '',
  department: '',
  contactEmail: '',
  contactPhone: '',
  status: 'active',
  hireDate: '',
  probationEndDate: '',
  terminationDate: '',
  workLocation: '',
  supervisorId: '',
  tags: '',
  notes: '',
  emergencyContact: {
    name: '',
    relationship: '',
    phone: '',
    email: '',
  },
});

const defaultContractForm = {
  contractType: 'permanent',
  startDate: '',
  endDate: '',
  payFrequency: 'monthly',
  payDay: 15,
  nextPayDate: '',
  compensationType: 'salary',
  compensationAmount: '',
  currency: 'USD',
  payrollStructureId: '',
  schedule: {
    timezone: '',
    days: '',
    startTime: '',
    endTime: '',
    hoursPerWeek: '',
  },
  benefits: [],
  deductions: [],
  bankAccount: {
    bankName: '',
    accountType: '',
    accountNumber: '',
    currency: 'USD',
    routingNumber: '',
  },
  taxation: {
    taxId: '',
    withholdingPercentage: '',
    socialSecurityRate: '',
  },
  status: 'active',
  notes: '',
};

const createContractFormState = () => ({
  ...defaultContractForm,
  schedule: { ...defaultContractForm.schedule },
  benefits: [],
  deductions: [],
  bankAccount: { ...defaultContractForm.bankAccount },
  taxation: { ...defaultContractForm.taxation },
});

const normalizeDocument = (doc) => ({
  type: doc?.type || '',
  label: doc?.label || '',
  url: doc?.url || '',
  uploadedAt: doc?.uploadedAt || new Date().toISOString(),
});

const normalizeCustomFields = (customFields) => {
  if (!customFields || typeof customFields !== 'object') {
    return [{ key: '', value: '' }];
  }
  const entries = Object.entries(customFields).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
  return entries.length ? entries : [{ key: '', value: '' }];
};

const describeDimensionValues = (values, fallbackLabel = 'Todos') => {
  if (!Array.isArray(values) || values.length === 0) return fallbackLabel;
  const normalized = values.filter(Boolean);
  if (!normalized.length) return fallbackLabel;
  if (normalized.some((value) => value === '*' || value === 'all')) {
    return fallbackLabel;
  }
  if (normalized.length > 3) {
    return `${normalized.slice(0, 3).join(', ')} +${normalized.length - 3}`;
  }
  return normalized.join(', ');
};

const formatShortDate = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

export function EmployeeDetailDrawer({
  open,
  onClose,
  employeeId,
  initialEmployee = null,
  onDataChanged,
}) {
  const {
    fetchEmployeeProfile,
    updateEmployeeProfile: persistProfile,
    listEmployeeContracts,
    createEmployeeContract,
    updateEmployeeContract,
    updateCustomer,
    bulkReinviteEmployees,
  } = useCRM();
  const [activeTab, setActiveTab] = useState('profile');
  const [profileLoading, setProfileLoading] = useState(false);
  const [contractsLoading, setContractsLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingContract, setSavingContract] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState('');
  const [employee, setEmployee] = useState(initialEmployee);
  const [profileForm, setProfileForm] = useState(createEmptyProfileForm());
  const [documents, setDocuments] = useState([]);
  const [customFields, setCustomFields] = useState([{ key: '', value: '' }]);
  const [contracts, setContracts] = useState([]);
  const [contractForm, setContractForm] = useState(createContractFormState);
  const [editingContractId, setEditingContractId] = useState(null);
  const [profileValidation, setProfileValidation] = useState({ errors: [], warnings: [] });
  const [contractValidation, setContractValidation] = useState({ errors: [], warnings: [] });
  const [structures, setStructures] = useState([]);
  const [structuresLoading, setStructuresLoading] = useState(false);
  const [structureSuggestions, setStructureSuggestions] = useState([]);
  const [structureSuggestionsLoading, setStructureSuggestionsLoading] = useState(false);
  const [structureSuggestionError, setStructureSuggestionError] = useState(null);
  const autoStructureAppliedRef = useRef(false);
  const [calendarMonths, setCalendarMonths] = useState({});
  const [documentType, setDocumentType] = useState('employment_letter');
  const [documentLang, setDocumentLang] = useState('es');
  const [orgName, setOrgName] = useState('');
  const [orgAddress, setOrgAddress] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signerTitle, setSignerTitle] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const start = current - 30;
    return Array.from({ length: 61 }, (_, idx) => start + idx);
  }, []);

  const resolvedEmployee = employee || initialEmployee;

  const suggestionFilters = useMemo(
    () => ({
      role: (profileForm.position || resolvedEmployee?.position || '').trim(),
      department: (profileForm.department || resolvedEmployee?.department || '').trim(),
      contractType: contractForm.contractType || '',
    }),
    [
      profileForm.position,
      resolvedEmployee?.position,
      profileForm.department,
      resolvedEmployee?.department,
      contractForm.contractType,
    ],
  );

  const hasSuggestionContext = Boolean(
    suggestionFilters.role ||
      suggestionFilters.department ||
      suggestionFilters.contractType,
  );

  const availableStructures = useMemo(() => {
    const map = new Map();
    structures.forEach((structure) => {
      if (structure?._id) {
        map.set(structure._id, structure);
      }
    });
    structureSuggestions.forEach((item) => {
      const structure = item?.structure;
      if (structure?._id && !map.has(structure._id)) {
        map.set(structure._id, structure);
      }
    });
    return Array.from(map.values());
  }, [structures, structureSuggestions]);

  const selectedStructure = useMemo(() => {
    if (!contractForm.payrollStructureId) return null;
    return (
      availableStructures.find((structure) => structure._id === contractForm.payrollStructureId) ||
      null
    );
  }, [availableStructures, contractForm.payrollStructureId]);

  const structureCoverageDetails = useMemo(() => {
    if (!selectedStructure) return null;
    return {
      roles: describeDimensionValues(selectedStructure.appliesToRoles, 'Todos los roles'),
      departments: describeDimensionValues(selectedStructure.appliesToDepartments, 'Todos los departamentos'),
      contracts: describeDimensionValues(
        selectedStructure.appliesToContractTypes,
        'Todos los tipos de contrato',
      ),
    };
  }, [selectedStructure]);

  const structureVigencyState = useMemo(() => {
    if (!selectedStructure) {
      return { isExpired: false, isFuture: false };
    }
    const now = Date.now();
    const effectiveFrom = selectedStructure.effectiveFrom
      ? new Date(selectedStructure.effectiveFrom).getTime()
      : null;
    const effectiveTo = selectedStructure.effectiveTo
      ? new Date(selectedStructure.effectiveTo).getTime()
      : null;
    return {
      isExpired: Boolean(effectiveTo && effectiveTo < now),
      isFuture: Boolean(effectiveFrom && effectiveFrom > now),
    };
  }, [selectedStructure]);

  const inferRoleKey = useCallback(() => {
    const department = (profileForm.department || resolvedEmployee?.department || '').toLowerCase();
    if (department.includes('finan') || department.includes('conta')) return 'finance';
    if (department.includes('oper') || department.includes('produ')) return 'operations';
    if (department.includes('rrhh') || department.includes('talent') || department.includes('human')) return 'hr';
    return 'default';
  }, [profileForm.department, resolvedEmployee?.department]);

  const evaluateProfileValidation = useCallback(() => {
    const roleKey = inferRoleKey();
    const requirements = [
      ...BASE_PROFILE_REQUIREMENTS,
      ...(ROLE_SPECIFIC_REQUIREMENTS[roleKey] || []),
    ];
    const context = { profileForm, documents };
    const errors = [];
    const warnings = [];

    requirements.forEach((requirement) => {
      const isValid = requirement.validator
        ? requirement.validator(context)
        : (() => {
            const value =
              requirement.path === 'documents'
                ? documents
                : getValueByPath(profileForm, requirement.path);
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'string') return value.trim().length > 0;
            return Boolean(value);
          })();
      if (!isValid) {
        errors.push(requirement.label);
      }
    });

    if (profileForm.status === 'active' && !profileForm.emergencyContact.phone) {
      warnings.push('Agrega un teléfono de emergencia para empleados activos.');
    }
    if (!documents || documents.length === 0) {
      warnings.push('Este perfil no posee documentos adjuntos.');
    }

    return { errors, warnings };
  }, [profileForm, documents, inferRoleKey]);

  const evaluateContractValidation = useCallback(() => {
    const errors = [];
    const warnings = [];
    const compensationValue = Number(contractForm.compensationAmount);

    if (!contractForm.startDate) errors.push('Fecha de inicio');
    if (!compensationValue || compensationValue <= 0) errors.push('Compensación');
    if (contractForm.contractType === 'fixed_term' && !contractForm.endDate) {
      errors.push('Fecha de finalización');
    }
    if (contractForm.payFrequency === 'custom' && !contractForm.nextPayDate) {
      errors.push('Próxima fecha de pago');
    }
    if (contractForm.compensationType !== 'salary' && !contractForm.schedule.hoursPerWeek) {
      errors.push('Horas por semana');
    }
    if (
      ['contractor', 'permanent'].includes(contractForm.contractType) &&
      !contractForm.bankAccount.accountNumber
    ) {
      errors.push('Cuenta bancaria para dispersión');
    }
    if (contractForm.contractType !== 'internship' && !contractForm.taxation.taxId) {
      errors.push('Identificador fiscal');
    }

    CONTRACT_WARNING_RULES.forEach((rule) => {
      if (rule.when({ contractForm })) {
        warnings.push(rule.message);
      }
    });

    return { errors, warnings };
  }, [contractForm]);

  const loadProfile = useCallback(async () => {
    if (!employeeId || !open) return;
    setProfileLoading(true);
    try {
      const data = await fetchEmployeeProfile(employeeId);
      setEmployee(data);
      setProfileForm({
        employeeNumber: data.employeeNumber || '',
        position: data.position || '',
        department: data.department || '',
        contactEmail: data.customer?.email || '',
        contactPhone: data.customer?.phone || '',
        status: data.status || 'active',
        hireDate: data.hireDate ? data.hireDate.slice(0, 10) : '',
        probationEndDate: data.probationEndDate ? data.probationEndDate.slice(0, 10) : '',
        terminationDate: data.terminationDate ? data.terminationDate.slice(0, 10) : '',
        workLocation: data.workLocation || '',
        supervisorId: data.supervisorId || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
        notes: data.notes || '',
        emergencyContact: {
          name: data.emergencyContact?.name || '',
          relationship: data.emergencyContact?.relationship || '',
          phone: data.emergencyContact?.phone || '',
          email: data.emergencyContact?.email || '',
        },
      });
      setDocuments((data.documents || []).map(normalizeDocument));
      setCustomFields(normalizeCustomFields(data.customFields));
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el empleado');
    } finally {
      setProfileLoading(false);
    }
  }, [employeeId, open, fetchEmployeeProfile]);

  const loadContracts = useCallback(async () => {
    if (!employeeId || !open) return;
    setContractsLoading(true);
    try {
      const { contracts: list } = await listEmployeeContracts(employeeId, 1, 50);
      setContracts(list);
    } catch (err) {
      toast.error(err.message || 'No se pudieron obtener los contratos');
    } finally {
      setContractsLoading(false);
    }
  }, [employeeId, open, listEmployeeContracts]);

  useEffect(() => {
    if (open) {
      loadProfile();
      loadContracts();
    } else {
      setActiveTab('profile');
      setEditingContractId(null);
      setContractForm(createContractFormState());
      autoStructureAppliedRef.current = false;
    }
  }, [open, loadProfile, loadContracts]);

  useEffect(() => {
    setEmployee(initialEmployee);
  }, [initialEmployee]);

  useEffect(() => {
    setProfileValidation(evaluateProfileValidation());
  }, [evaluateProfileValidation]);

  useEffect(() => {
    setContractValidation(evaluateContractValidation());
  }, [evaluateContractValidation]);

  const handleProfileInputChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleEmergencyContactChange = (field, value) => {
    setProfileForm((prev) => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [field]: value,
      },
    }));
  };

  const handleDocumentChange = (index, field, value) => {
    setDocuments((prev) =>
      prev.map((doc, idx) =>
        idx === index ? { ...doc, [field]: value } : doc,
      ),
    );
  };

  const addDocument = () => {
    setDocuments((prev) => [...prev, normalizeDocument({})]);
  };

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDocumentUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setDocuments((prev) => [
        ...prev,
        normalizeDocument({
          label: file.name,
          type: file.type,
          url: e.target?.result || '',
          uploadedAt: new Date().toISOString(),
        }),
      ]);
    };
    reader.readAsDataURL(file);
    event.target.value = null;
  };

  const handleCustomFieldChange = (index, key, value) => {
    setCustomFields((prev) =>
      prev.map((field, idx) =>
        idx === index ? { ...field, [key]: value } : field,
      ),
    );
  };

  const addCustomField = () => {
    setCustomFields((prev) => [...prev, { key: '', value: '' }]);
  };

  const removeCustomField = (index) => {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== index));
  };

  const loadStructures = useCallback(async () => {
    if (!open) return;
    setStructuresLoading(true);
    try {
      const data = await fetchApi('/payroll/structures');
      const list = Array.isArray(data) ? data : data?.data || [];
      setStructures(list);
    } catch (err) {
      console.error('Error loading payroll structures:', err);
    } finally {
      setStructuresLoading(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      loadStructures();
    }
  }, [open, loadStructures]);

  useEffect(() => {
    if (!open) {
      setStructureSuggestions([]);
      setStructureSuggestionError(null);
      setStructureSuggestionsLoading(false);
      return;
    }
    autoStructureAppliedRef.current = false;
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (!hasSuggestionContext) {
      setStructureSuggestions([]);
      setStructureSuggestionError(null);
      setStructureSuggestionsLoading(false);
      return;
    }
    let isCancelled = false;
    setStructureSuggestionsLoading(true);
    setStructureSuggestionError(null);
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (suggestionFilters.role) params.set('role', suggestionFilters.role);
        if (suggestionFilters.department) params.set('department', suggestionFilters.department);
        if (suggestionFilters.contractType) params.set('contractType', suggestionFilters.contractType);
        params.set('includeFallback', 'true');
        params.set('limit', '5');
        const data = await fetchApi(`/payroll/structures/suggestions?${params.toString()}`);
        if (!isCancelled) {
          const suggestions = Array.isArray(data?.suggestions) ? data.suggestions : [];
          setStructureSuggestions(suggestions);
        }
      } catch (err) {
        if (isCancelled) return;
        console.error('Error fetching structure suggestions:', err);
        setStructureSuggestionError(err.message || 'No se pudieron obtener sugerencias');
      } finally {
        if (!isCancelled) {
          setStructureSuggestionsLoading(false);
        }
      }
    }, 350);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [
    open,
    hasSuggestionContext,
    suggestionFilters.role,
    suggestionFilters.department,
    suggestionFilters.contractType,
  ]);

  useEffect(() => {
    if (!open) return;
    if (editingContractId) return;
    if (autoStructureAppliedRef.current) return;
    if (contractForm.payrollStructureId) {
      autoStructureAppliedRef.current = true;
      return;
    }
    const topSuggestion = structureSuggestions.find(
      (item) => item?.structure && item.structure._id,
    );
    if (topSuggestion?.structure?._id) {
      setContractForm((prev) => ({
        ...prev,
        payrollStructureId: topSuggestion.structure._id,
      }));
      autoStructureAppliedRef.current = true;
    }
  }, [
    open,
    editingContractId,
    structureSuggestions,
    contractForm.payrollStructureId,
  ]);

  useEffect(() => {
    if (settingsLoaded) return;
    const loadTenantSettings = async () => {
      try {
        const settings = await fetchApi('/tenant/settings');
        if (settings?.payroll?.documents) {
          const docs = settings.payroll.documents;
          setOrgName((prev) => prev || docs.orgName || '');
          setOrgAddress((prev) => prev || docs.orgAddress || '');
          setSignerName((prev) => prev || docs.signerName || '');
          setSignerTitle((prev) => prev || docs.signerTitle || '');
        } else if (settings?.companyName) {
          setOrgName((prev) => prev || settings.companyName);
        }
      } catch (err) {
        // Silently ignore; user can type manual values
      } finally {
        setSettingsLoaded(true);
      }
    };
    loadTenantSettings();
  }, [settingsLoaded]);

  const buildProfilePayload = () => {
    const payload = {
      employeeNumber: profileForm.employeeNumber || undefined,
      position: profileForm.position || undefined,
      department: profileForm.department || undefined,
      status: profileForm.status || undefined,
      hireDate: profileForm.hireDate || undefined,
      probationEndDate: profileForm.probationEndDate || undefined,
      terminationDate: profileForm.terminationDate || undefined,
      workLocation: profileForm.workLocation || undefined,
      supervisorId: profileForm.supervisorId || undefined,
      tags: profileForm.tags
        ? profileForm.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : undefined,
      notes: profileForm.notes || undefined,
      emergencyContact: profileForm.emergencyContact,
      documents: documents
        .filter((doc) => doc.label || doc.url)
        .map((doc) => ({
          ...doc,
          uploadedAt: doc.uploadedAt || new Date().toISOString(),
        })),
      customFields: customFields.reduce((acc, field) => {
        if (field.key) {
          acc[field.key] = field.value;
        }
        return acc;
      }, {}),
    };
    // Remove empty customFields object
    if (payload.customFields && Object.keys(payload.customFields).length === 0) {
      delete payload.customFields;
    }
    return payload;
  };

  const handleSaveProfile = async () => {
    if (!employeeId) return;
    const validation = evaluateProfileValidation();
    setProfileValidation(validation);
    if (validation.errors.length > 0) {
      toast.error('Completa los campos obligatorios del perfil.');
      return;
    }
    setSavingProfile(true);
    try {
      // Actualiza contacto del empleado en CRM
      if (resolvedEmployee?.customer?.id) {
        const contactPayload = {};
        if (profileForm.contactEmail !== undefined) contactPayload.email = profileForm.contactEmail || '';
        if (profileForm.contactPhone !== undefined) contactPayload.phone = profileForm.contactPhone || '';
        if (Object.keys(contactPayload).length > 0) {
          await updateCustomer(resolvedEmployee.customer.id, contactPayload, {
            skipCustomerReload: true,
            refreshEmployees: true,
          });
        }
      }
      const updated = await persistProfile(employeeId, buildProfilePayload());
      const mergedCustomer = {
        ...updated.customer,
        email: profileForm.contactEmail || updated.customer?.email,
        phone: profileForm.contactPhone || updated.customer?.phone,
      };
      setEmployee({ ...updated, customer: mergedCustomer });
      toast.success('Perfil actualizado correctamente');
      await loadProfile();
      onDataChanged?.();
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el perfil');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStatusChange = async (status) => {
    if (!employeeId) return;
    setSavingProfile(true);
    try {
      const updated = await persistProfile(employeeId, { status });
      setEmployee(updated);
      toast.success(`Estado actualizado a ${status}`);
      await loadProfile();
      onDataChanged?.();
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar el estado');
    } finally {
      setSavingProfile(false);
    }
  };

  const renderDatePicker = (label, field) => {
    const value = profileForm[field];
    const selected = value ? new Date(value) : undefined;
    const month = calendarMonths[field] || selected || new Date();
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={value}
            onChange={(e) => handleProfileInputChange(field, e.target.value)}
            className="flex-1"
            placeholder="YYYY-MM-DD"
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon">
                <Calendar className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <div className="flex items-center justify-between gap-2 px-3 py-2 border-b text-xs text-muted-foreground">
                <select
                  className="border rounded px-2 py-1 text-xs bg-background"
                  value={month.getFullYear()}
                  onChange={(e) =>
                    setCalendarMonths((prev) => ({
                      ...prev,
                      [field]: new Date(Number(e.target.value), month.getMonth(), 1),
                    }))
                  }
                >
                  {yearOptions.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <span className="capitalize">
                  {month.toLocaleString('es-VE', { month: 'long' })} {month.getFullYear()}
                </span>
              </div>
              <CalendarPicker
                mode="single"
                month={month}
                onMonthChange={(nextMonth) =>
                  setCalendarMonths((prev) => ({ ...prev, [field]: nextMonth }))
                }
                selected={selected}
                onSelect={(date) =>
                  handleProfileInputChange(
                    field,
                    date ? date.toISOString().slice(0, 10) : '',
                  )
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  };

  const handleContractFieldChange = (field, value) => {
    if (field === 'payrollStructureId') {
      autoStructureAppliedRef.current = true;
    }
    setContractForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleScheduleChange = (field, value) => {
    setContractForm((prev) => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [field]: value,
      },
    }));
  };

  const handleBankAccountChange = (field, value) => {
    setContractForm((prev) => ({
      ...prev,
      bankAccount: {
        ...prev.bankAccount,
        [field]: value,
      },
    }));
  };

  const handleTaxationChange = (field, value) => {
    setContractForm((prev) => ({
      ...prev,
      taxation: {
        ...prev.taxation,
        [field]: value,
      },
    }));
  };

  const addBenefit = () => {
    setContractForm((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), { name: '', amount: '' }],
    }));
  };

  const updateBenefit = (index, field, value) => {
    setContractForm((prev) => ({
      ...prev,
      benefits: prev.benefits.map((benefit, idx) =>
        idx === index ? { ...benefit, [field]: value } : benefit,
      ),
    }));
  };

  const removeBenefit = (index) => {
    setContractForm((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, idx) => idx !== index),
    }));
  };

  const addDeduction = () => {
    setContractForm((prev) => ({
      ...prev,
      deductions: [...(prev.deductions || []), { name: '', amount: '', percentage: '' }],
    }));
  };

  const updateDeduction = (index, field, value) => {
    setContractForm((prev) => ({
      ...prev,
      deductions: prev.deductions.map((deduction, idx) =>
        idx === index ? { ...deduction, [field]: value } : deduction,
      ),
    }));
  };

  const removeDeduction = (index) => {
    setContractForm((prev) => ({
      ...prev,
      deductions: prev.deductions.filter((_, idx) => idx !== index),
    }));
  };

  const resetContractForm = () => {
    setContractForm(createContractFormState());
    setEditingContractId(null);
    autoStructureAppliedRef.current = false;
  };

  const handleEditContract = (contract) => {
    setEditingContractId(contract._id);
    autoStructureAppliedRef.current = true;
    setContractForm({
      contractType: contract.contractType || 'permanent',
      startDate: contract.startDate ? contract.startDate.slice(0, 10) : '',
      endDate: contract.endDate ? contract.endDate.slice(0, 10) : '',
      payFrequency: contract.payFrequency || 'monthly',
      payDay: contract.payDay || '',
      nextPayDate: contract.nextPayDate ? contract.nextPayDate.slice(0, 10) : '',
      compensationType: contract.compensationType || 'salary',
      compensationAmount: contract.compensationAmount || '',
      currency: contract.currency || 'USD',
      payrollStructureId: contract.payrollStructureId || '',
      schedule: {
        timezone: contract.schedule?.timezone || '',
        days: (contract.schedule?.days || []).join(', '),
        startTime: contract.schedule?.startTime || '',
        endTime: contract.schedule?.endTime || '',
        hoursPerWeek: contract.schedule?.hoursPerWeek || '',
      },
      benefits: contract.benefits || [],
      deductions: contract.deductions || [],
      bankAccount: {
        bankName: contract.bankAccount?.bankName || '',
        accountType: contract.bankAccount?.accountType || '',
        accountNumber: contract.bankAccount?.accountNumber || '',
        currency: contract.bankAccount?.currency || 'USD',
        routingNumber: contract.bankAccount?.routingNumber || '',
      },
      taxation: {
        taxId: contract.taxation?.taxId || '',
        withholdingPercentage: contract.taxation?.withholdingPercentage || '',
        socialSecurityRate: contract.taxation?.socialSecurityRate || '',
      },
      status: contract.status || 'active',
      notes: contract.notes || '',
    });
    setActiveTab('contracts');
  };

  const buildContractPayload = () => ({
    contractType: contractForm.contractType,
    startDate: contractForm.startDate,
    endDate: contractForm.endDate || undefined,
    payFrequency: contractForm.payFrequency,
    payDay: contractForm.payDay ? Number(contractForm.payDay) : undefined,
    nextPayDate: contractForm.nextPayDate || undefined,
    compensationType: contractForm.compensationType,
    compensationAmount: Number(contractForm.compensationAmount),
    currency: contractForm.currency || 'USD',
    payrollStructureId: contractForm.payrollStructureId
      ? contractForm.payrollStructureId
      : null,
    schedule: {
      timezone: contractForm.schedule.timezone || undefined,
      days: contractForm.schedule.days
        ? contractForm.schedule.days.split(',').map((day) => day.trim()).filter(Boolean)
        : undefined,
      startTime: contractForm.schedule.startTime || undefined,
      endTime: contractForm.schedule.endTime || undefined,
      hoursPerWeek: contractForm.schedule.hoursPerWeek
        ? Number(contractForm.schedule.hoursPerWeek)
        : undefined,
    },
    benefits: (contractForm.benefits || []).filter((benefit) => benefit.name),
    deductions: (contractForm.deductions || []).filter((deduction) => deduction.name),
    bankAccount: {
      bankName: contractForm.bankAccount.bankName || undefined,
      accountType: contractForm.bankAccount.accountType || undefined,
      accountNumber: contractForm.bankAccount.accountNumber || undefined,
      currency: contractForm.bankAccount.currency || undefined,
      routingNumber: contractForm.bankAccount.routingNumber || undefined,
    },
    taxation: {
      taxId: contractForm.taxation.taxId || undefined,
      withholdingPercentage: contractForm.taxation.withholdingPercentage
        ? Number(contractForm.taxation.withholdingPercentage)
        : undefined,
      socialSecurityRate: contractForm.taxation.socialSecurityRate
        ? Number(contractForm.taxation.socialSecurityRate)
        : undefined,
    },
    status: contractForm.status || 'active',
    notes: contractForm.notes || undefined,
  });

  const handleSubmitContract = async () => {
    if (!employeeId) return;
    const validation = evaluateContractValidation();
    setContractValidation(validation);
    if (validation.errors.length > 0) {
      toast.error('Revisa los campos obligatorios del contrato.');
      return;
    }
    try {
      setSavingContract(true);
      const payload = buildContractPayload();
      if (editingContractId) {
        await updateEmployeeContract(employeeId, editingContractId, payload);
        toast.success('Contrato actualizado');
      } else {
        await createEmployeeContract(employeeId, payload);
        toast.success('Contrato creado');
      }
      await loadContracts();
      await loadProfile();
      onDataChanged?.();
      resetContractForm();
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el contrato');
    } finally {
      setSavingContract(false);
    }
  };

  const handleReinvite = async () => {
    if (!resolvedEmployee?.customer?.email) {
      toast.error('El contacto no tiene correo registrado');
      return;
    }
    setInviteLoading(true);
    try {
      const summary = await bulkReinviteEmployees([resolvedEmployee]);
      if (summary.failureCount > 0) {
        throw new Error(summary.errors.join(', '));
      }
      toast.success('Invitación enviada');
    } catch (err) {
      toast.error(err.message || 'Error al enviar la invitación');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDownloadDocument = async (docType = documentType, lang = documentLang) => {
    if (!resolvedEmployee?._id) {
      toast.error('No se encontró el empleado');
      return;
    }
    setDocumentLoading(docType);
    try {
      const baseUrl = getApiBaseUrl();
      const token = localStorage.getItem('accessToken');
      const res = await fetch(
        `${baseUrl}/api/v1/payroll/employees/${resolvedEmployee._id}/documents?type=${docType}&lang=${lang}` +
          `${orgName ? `&orgName=${encodeURIComponent(orgName)}` : ''}` +
          `${orgAddress ? `&orgAddress=${encodeURIComponent(orgAddress)}` : ''}` +
          `${signerName ? `&signerName=${encodeURIComponent(signerName)}` : ''}` +
          `${signerTitle ? `&signerTitle=${encodeURIComponent(signerTitle)}` : ''}`,
        {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'Cache-Control': 'no-cache',
          },
        },
      );
      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || 'Error al descargar el documento');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download =
        docType === 'income_certificate'
          ? `constancia-ingresos-${resolvedEmployee._id}.pdf`
          : docType === 'seniority_letter'
            ? `constancia-antiguedad-${resolvedEmployee._id}.pdf`
            : docType === 'fiscal_certificate'
              ? `constancia-fiscal-${resolvedEmployee._id}.pdf`
              : `carta-trabajo-${resolvedEmployee._id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('Documento descargado');
    } catch (err) {
      toast.error(err.message || 'No se pudo descargar el documento');
    } finally {
      setDocumentLoading('');
    }
  };

  const closeDrawer = (nextState) => {
    if (!nextState) {
      onClose?.();
    }
  };

  useEffect(() => {
    if (open) {
      const activeElement = document.activeElement;
      if (activeElement && 'blur' in activeElement) {
        activeElement.blur();
      }
    }
  }, [open]);

  const statusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      onboarding: 'bg-blue-100 text-blue-700',
      suspended: 'bg-amber-100 text-amber-700',
      terminated: 'bg-red-100 text-red-700',
      draft: 'bg-slate-100 text-slate-700',
    };
    return (
      <Badge className={styles[status] || styles.draft}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
      </Badge>
    );
  };

  const actionButtons = (
    <div className="flex flex-wrap gap-2">
      <Select value={documentType} onValueChange={setDocumentType}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Tipo de documento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="employment_letter">Carta de trabajo</SelectItem>
          <SelectItem value="income_certificate">Constancia de ingresos</SelectItem>
          <SelectItem value="seniority_letter">Constancia de antigüedad</SelectItem>
          <SelectItem value="fiscal_certificate">Constancia fiscal</SelectItem>
        </SelectContent>
      </Select>
      <Select value={documentLang} onValueChange={setDocumentLang}>
        <SelectTrigger className="w-32">
          <SelectValue placeholder="Idioma" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="es">Español</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Empresa/Entidad</Label>
          <Input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="Acme Corp."
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Dirección</Label>
          <Input
            value={orgAddress}
            onChange={(e) => setOrgAddress(e.target.value)}
            placeholder="Dirección para el encabezado"
            className="w-64"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Firmante</Label>
          <Input
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Nombre del firmante"
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Cargo firmante</Label>
          <Input
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
            placeholder="Ej. Director RRHH"
            className="w-48"
          />
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleDownloadDocument(documentType, documentLang)}
        disabled={documentLoading === documentType}
      >
        {documentLoading === documentType ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileDown className="mr-2 h-4 w-4" />
        )}
        Descargar
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStatusChange('suspended')}
        disabled={savingProfile}
      >
        <Pause className="mr-2 h-4 w-4" />
        Suspender
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => handleStatusChange('terminated')}
        disabled={savingProfile}
      >
        <Ban className="mr-2 h-4 w-4" />
        Terminar
      </Button>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => handleStatusChange('active')}
        disabled={savingProfile}
      >
        <CheckCircle className="mr-2 h-4 w-4" />
        Re-activar
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleReinvite}
        disabled={inviteLoading}
      >
        {inviteLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
        Re-invitar
      </Button>
    </div>
  );

  const renderContractCard = (contract) => (
    <Card key={contract._id} className="border-muted">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-semibold">
            {contract.contractType ? CONTRACT_TYPES.find((c) => c.value === contract.contractType)?.label || contract.contractType : 'Contrato'}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'Sin fecha'}{' '}
            - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Indefinido'}
          </p>
        </div>
        {statusBadge(contract.status)}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            {contract.compensationAmount?.toLocaleString?.() || contract.compensationAmount || '—'} {contract.currency || ''}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-sky-500" />
            {contract.payFrequency || 'Frecuencia no definida'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => handleEditContract(contract)}>
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Drawer open={open} onOpenChange={closeDrawer} direction="right">
      <DrawerContent className="w-full sm:w-[75vw] lg:w-[65vw] max-w-5xl h-screen sm:h-[95vh]">
        <DrawerHeader>
          <div className="flex flex-col gap-1">
            <DrawerTitle className="text-2xl font-semibold">
              {resolvedEmployee?.customer?.name || 'Empleado'}
            </DrawerTitle>
            <DrawerDescription className="flex items-center gap-2 text-sm">
              {statusBadge(resolvedEmployee?.status || 'draft')}
              {resolvedEmployee?.position && <span>{resolvedEmployee.position}</span>}
              {resolvedEmployee?.department && (
                <>
                  <span>•</span>
                  <span>{resolvedEmployee.department}</span>
                </>
              )}
            </DrawerDescription>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {actionButtons}
            <DrawerClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto"
              >
                <span className="sr-only">Cerrar</span>
                ✕
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>
        <ScrollArea
          className="border-t"
          style={{ height: 'calc(100vh - 160px)' }}
        >
          <div className="flex flex-col gap-6 p-6 pb-24">
            {profileLoading && (
              <div className="flex items-center justify-center gap-2 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando información del empleado...
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Contacto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {resolvedEmployee?.customer?.email || 'Sin correo'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {resolvedEmployee?.customer?.phone || 'Sin teléfono'}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {resolvedEmployee?.workLocation || 'Sin ubicación'}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Contrato vigente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  {resolvedEmployee?.currentContract ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        {CONTRACT_TYPES.find((c) => c.value === resolvedEmployee.currentContract.contractType)?.label ||
                          resolvedEmployee.currentContract.contractType}
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        {resolvedEmployee.currentContract.compensationAmount?.toLocaleString?.() ||
                          resolvedEmployee.currentContract.compensationAmount || '—'}{' '}
                        {resolvedEmployee.currentContract.currency || ''}
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {resolvedEmployee.currentContract.payFrequency || 'Frecuencia no definida'}
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Sin contrato activo</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="profile">Perfil</TabsTrigger>
                <TabsTrigger value="contracts">Contratos</TabsTrigger>
                <TabsTrigger value="documents">Documentos & Bancos</TabsTrigger>
              </TabsList>
              <TabsContent value="profile" className="space-y-4 pt-4">
                {profileValidation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>Faltan datos obligatorios</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1">
                        {profileValidation.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {profileValidation.warnings.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTitle>Recomendaciones</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1">
                        {profileValidation.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Número de empleado</Label>
                    <Input
                      value={profileForm.employeeNumber}
                      onChange={(e) => handleProfileInputChange('employeeNumber', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Posición</Label>
                    <Input
                      value={profileForm.position}
                      onChange={(e) => handleProfileInputChange('position', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Departamento</Label>
                    <Input
                      value={profileForm.department}
                      onChange={(e) => handleProfileInputChange('department', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Correo laboral</Label>
                    <Input
                      type="email"
                      value={profileForm.contactEmail}
                      onChange={(e) => handleProfileInputChange('contactEmail', e.target.value)}
                      placeholder="nombre@compañia.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      value={profileForm.contactPhone}
                      onChange={(e) => handleProfileInputChange('contactPhone', e.target.value)}
                      placeholder="+58 412..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estado</Label>
                    <Select
                      value={profileForm.status}
                      onValueChange={(value) => handleProfileInputChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">{renderDatePicker('Fecha de ingreso', 'hireDate')}</div>
                  <div className="space-y-2">{renderDatePicker('Fin de período de prueba', 'probationEndDate')}</div>
                  <div className="space-y-2">{renderDatePicker('Fecha de salida', 'terminationDate')}</div>
                  <div className="space-y-2">
                    <Label>Ubicación / Sede</Label>
                    <Input
                      value={profileForm.workLocation}
                      onChange={(e) => handleProfileInputChange('workLocation', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Supervisor</Label>
                    <Input
                      value={profileForm.supervisorId}
                      onChange={(e) => handleProfileInputChange('supervisorId', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Etiquetas</Label>
                    <Input
                      placeholder="Ej: cocina, tiempo completo"
                      value={profileForm.tags}
                      onChange={(e) => handleProfileInputChange('tags', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notas internas</Label>
                  <Textarea
                    value={profileForm.notes}
                    onChange={(e) => handleProfileInputChange('notes', e.target.value)}
                    rows={4}
                  />
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Contacto de emergencia</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input
                        value={profileForm.emergencyContact.name}
                        onChange={(e) => handleEmergencyContactChange('name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Parentesco</Label>
                      <Input
                        value={profileForm.emergencyContact.relationship}
                        onChange={(e) => handleEmergencyContactChange('relationship', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        value={profileForm.emergencyContact.phone}
                        onChange={(e) => handleEmergencyContactChange('phone', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={profileForm.emergencyContact.email}
                        onChange={(e) => handleEmergencyContactChange('email', e.target.value)}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Campos personalizados</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {customFields.map((field, index) => (
                      <div key={`custom-field-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                        <Input
                          placeholder="Clave"
                          value={field.key}
                          onChange={(e) => handleCustomFieldChange(index, 'key', e.target.value)}
                        />
                        <Input
                          placeholder="Valor"
                          value={field.value}
                          onChange={(e) => handleCustomFieldChange(index, 'value', e.target.value)}
                        />
                        <Button
                          variant="ghost"
                          type="button"
                          className="justify-start text-red-500"
                          onClick={() => removeCustomField(index)}
                          disabled={customFields.length === 1}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" type="button" onClick={addCustomField} className="w-full">
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar campo
                    </Button>
                  </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" type="button" onClick={loadProfile} disabled={savingProfile}>
                    Actualizar
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={savingProfile}>
                    {savingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Guardar cambios
                  </Button>
                </div>
              </TabsContent>
              <TabsContent value="contracts" className="space-y-4 pt-4">
                {contractValidation.errors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>Completa la información del contrato</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1">
                        {contractValidation.errors.map((error) => (
                          <li key={error}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {contractValidation.warnings.length > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTitle>Mejoras sugeridas</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4 space-y-1">
                        {contractValidation.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex flex-col gap-4">
                  {contractsLoading ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Cargando contratos...
                    </div>
                  ) : contracts.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      No hay contratos registrados.
                    </div>
                  ) : (
                    <div className="grid gap-4">{contracts.map(renderContractCard)}</div>
                  )}
                </div>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">
                      {editingContractId ? 'Editar contrato' : 'Nuevo contrato'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Tipo</Label>
                        <Select
                          value={contractForm.contractType}
                          onValueChange={(value) => handleContractFieldChange('contractType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTRACT_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Estado</Label>
                        <Select
                          value={contractForm.status}
                          onValueChange={(value) => handleContractFieldChange('status', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Inicio</Label>
                        <Input
                          type="date"
                          value={contractForm.startDate}
                          onChange={(e) => handleContractFieldChange('startDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Fin</Label>
                        <Input
                          type="date"
                          value={contractForm.endDate}
                          onChange={(e) => handleContractFieldChange('endDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Frecuencia de pago</Label>
                        <Select
                          value={contractForm.payFrequency}
                          onValueChange={(value) => handleContractFieldChange('payFrequency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAY_FREQUENCIES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Día de pago</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          value={contractForm.payDay}
                          onChange={(e) => handleContractFieldChange('payDay', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Próximo pago</Label>
                        <Input
                          type="date"
                          value={contractForm.nextPayDate}
                          onChange={(e) => handleContractFieldChange('nextPayDate', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Compensación</Label>
                        <Input
                          type="number"
                          value={contractForm.compensationAmount}
                          onChange={(e) => handleContractFieldChange('compensationAmount', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de compensación</Label>
                        <Select
                          value={contractForm.compensationType}
                          onValueChange={(value) => handleContractFieldChange('compensationType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {COMPENSATION_TYPES.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Moneda</Label>
                        <Input
                          value={contractForm.currency}
                          onChange={(e) => handleContractFieldChange('currency', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estructura de nómina</Label>
                        <Select
                          value={contractForm.payrollStructureId}
                          onValueChange={(value) =>
                            handleContractFieldChange(
                              'payrollStructureId',
                              value === 'none' ? '' : value
                            )
                          }
                          disabled={structuresLoading && !availableStructures.length}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={structuresLoading ? 'Cargando...' : 'Sin estructura'} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin estructura</SelectItem>
                            {availableStructures.map((structure) => (
                              <SelectItem key={structure._id} value={structure._id}>
                                <div className="flex flex-col">
                                  <span className="font-medium">{structure.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {structure.version ? `v${structure.version} · ` : ''}
                                    Vigente desde {formatShortDate(structure.effectiveFrom)}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {selectedStructure && (
                          <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                            <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                              <Info className="h-4 w-4 text-blue-500" />
                              {selectedStructure.name}
                              {selectedStructure.version && (
                                <Badge variant="outline">v{selectedStructure.version}</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatShortDate(selectedStructure.effectiveFrom)} -{' '}
                                {selectedStructure.effectiveTo ? formatShortDate(selectedStructure.effectiveTo) : 'sin fin'}
                              </Badge>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Badge variant="secondary" className="cursor-help">
                                    Alcance
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent className="space-y-1 text-xs">
                                  <p>
                                    <span className="font-semibold">Roles:</span>{' '}
                                    {structureCoverageDetails?.roles || 'Todos'}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Departamentos:</span>{' '}
                                    {structureCoverageDetails?.departments || 'Todos'}
                                  </p>
                                  <p>
                                    <span className="font-semibold">Contratos:</span>{' '}
                                    {structureCoverageDetails?.contracts || 'Todos'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            {(structureVigencyState.isExpired ||
                              structureVigencyState.isFuture ||
                              selectedStructure.isActive === false) && (
                              <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                                <AlertTitle className="flex items-center gap-2 text-xs font-semibold">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  Vigencia especial
                                </AlertTitle>
                                <AlertDescription>
                                  {!selectedStructure.isActive && 'Esta versión está inactiva. '}
                                  {structureVigencyState.isExpired &&
                                    `Venció el ${formatShortDate(selectedStructure.effectiveTo)}. `}
                                  {structureVigencyState.isFuture &&
                                    `Se activará el ${formatShortDate(selectedStructure.effectiveFrom)}.`}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        )}
                        {hasSuggestionContext && (
                          <div className="space-y-2 rounded-md border border-dashed p-3">
                            <div className="flex items-center justify-between text-sm font-medium">
                              <span className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-amber-500" />
                                Sugerencias automáticas
                              </span>
                              {structureSuggestionsLoading && (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                            <div className="space-y-2">
                              {structureSuggestionError && (
                                <p className="text-xs text-destructive">{structureSuggestionError}</p>
                              )}
                              {!structureSuggestionError &&
                                !structureSuggestionsLoading &&
                                structureSuggestions.length === 0 && (
                                  <p className="text-xs text-muted-foreground">
                                    No hay sugerencias para los filtros actuales.
                                  </p>
                                )}
                              {structureSuggestions.map((item) => {
                                const structure = item.structure;
                                if (!structure?._id) return null;
                                const isSelected = structure._id === contractForm.payrollStructureId;
                                return (
                                  <button
                                    type="button"
                                    key={structure._id}
                                    onClick={() =>
                                      handleContractFieldChange('payrollStructureId', structure._id)
                                    }
                                    className={`w-full rounded-md border p-3 text-left text-sm transition ${
                                      isSelected
                                        ? 'border-primary bg-primary/10'
                                        : 'border-border hover:border-primary/60'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div>
                                        <p className="font-medium">{structure.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {describeDimensionValues(
                                            structure.appliesToDepartments,
                                            'Todos los departamentos',
                                          )}{' '}
                                          ·{' '}
                                          {describeDimensionValues(
                                            structure.appliesToRoles,
                                            'Todos los roles',
                                          )}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {structure.version && (
                                          <Badge variant="outline">v{structure.version}</Badge>
                                        )}
                                        {isSelected && <CheckCircle className="h-4 w-4 text-emerald-500" />}
                                      </div>
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                      <span
                                        className={
                                          item.isFallback ? 'text-amber-600' : 'text-emerald-600'
                                        }
                                      >
                                        {item.isFallback
                                          ? 'Fallback sin coincidencias específicas'
                                          : `Coincidencia: ${
                                              item.matchedDimensions?.join(', ') || 'Rol'
                                            }`}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Vigente desde {formatShortDate(structure.effectiveFrom)}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Horario</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Días (separados por coma)</Label>
                          <Input
                            value={contractForm.schedule.days}
                            onChange={(e) => handleScheduleChange('days', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Zona horaria</Label>
                          <Input
                            value={contractForm.schedule.timezone}
                            onChange={(e) => handleScheduleChange('timezone', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Inicio</Label>
                          <Input
                            type="time"
                            value={contractForm.schedule.startTime}
                            onChange={(e) => handleScheduleChange('startTime', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Fin</Label>
                          <Input
                            type="time"
                            value={contractForm.schedule.endTime}
                            onChange={(e) => handleScheduleChange('endTime', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Horas por semana</Label>
                          <Input
                            type="number"
                            value={contractForm.schedule.hoursPerWeek}
                            onChange={(e) => handleScheduleChange('hoursPerWeek', e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Beneficios</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(contractForm.benefits || []).map((benefit, index) => (
                          <div key={`benefit-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                            <Input
                              placeholder="Nombre"
                              value={benefit.name}
                              onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                            />
                            <Input
                              placeholder="Monto"
                              type="number"
                              value={benefit.amount ?? ''}
                              onChange={(e) => updateBenefit(index, 'amount', e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              type="button"
                              className="justify-start text-red-500"
                              onClick={() => removeBenefit(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" type="button" onClick={addBenefit} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar beneficio
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Deducciones</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {(contractForm.deductions || []).map((deduction, index) => (
                          <div key={`deduction-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                            <Input
                              placeholder="Nombre"
                              value={deduction.name}
                              onChange={(e) => updateDeduction(index, 'name', e.target.value)}
                            />
                            <Input
                              placeholder="%"
                              type="number"
                              value={deduction.percentage ?? ''}
                              onChange={(e) => updateDeduction(index, 'percentage', e.target.value)}
                            />
                            <Input
                              placeholder="Monto fijo"
                              type="number"
                              value={deduction.amount ?? ''}
                              onChange={(e) => updateDeduction(index, 'amount', e.target.value)}
                            />
                            <Button
                              variant="ghost"
                              type="button"
                              className="justify-start text-red-500"
                              onClick={() => removeDeduction(index)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Quitar
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" type="button" onClick={addDeduction} className="w-full">
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar deducción
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Cuenta bancaria</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Banco</Label>
                          <Input
                            value={contractForm.bankAccount.bankName}
                            onChange={(e) => handleBankAccountChange('bankName', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo de cuenta</Label>
                          <Input
                            value={contractForm.bankAccount.accountType}
                            onChange={(e) => handleBankAccountChange('accountType', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Número</Label>
                          <Input
                            value={contractForm.bankAccount.accountNumber}
                            onChange={(e) => handleBankAccountChange('accountNumber', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Moneda</Label>
                          <Input
                            value={contractForm.bankAccount.currency}
                            onChange={(e) => handleBankAccountChange('currency', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Routing / Swift</Label>
                          <Input
                            value={contractForm.bankAccount.routingNumber}
                            onChange={(e) => handleBankAccountChange('routingNumber', e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-muted/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Impuestos</CardTitle>
                      </CardHeader>
                      <CardContent className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label>ID fiscal</Label>
                          <Input
                            value={contractForm.taxation.taxId}
                            onChange={(e) => handleTaxationChange('taxId', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Retención (%)</Label>
                          <Input
                            type="number"
                            value={contractForm.taxation.withholdingPercentage}
                            onChange={(e) => handleTaxationChange('withholdingPercentage', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Seguridad social (%)</Label>
                          <Input
                            type="number"
                            value={contractForm.taxation.socialSecurityRate}
                            onChange={(e) => handleTaxationChange('socialSecurityRate', e.target.value)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <div className="space-y-2">
                      <Label>Notas</Label>
                      <Textarea
                        rows={3}
                        value={contractForm.notes}
                        onChange={(e) => handleContractFieldChange('notes', e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end gap-2">
                      {editingContractId && (
                        <Button type="button" variant="ghost" onClick={resetContractForm}>
                          Cancelar edición
                        </Button>
                      )}
                      <Button onClick={handleSubmitContract} disabled={savingContract}>
                        {savingContract ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {editingContractId ? 'Actualizar contrato' : 'Crear contrato'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="documents" className="space-y-4 pt-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Documentos del colaborador</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" asChild>
                        <label className="inline-flex cursor-pointer items-center">
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Subir archivo
                          <input type="file" className="hidden" onChange={handleDocumentUpload} />
                        </label>
                      </Button>
                      <Button type="button" variant="secondary" onClick={addDocument}>
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar enlace
                      </Button>
                    </div>
                    {(documents || []).map((doc, index) => (
                      <div key={`doc-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <Input
                          placeholder="Etiqueta"
                          value={doc.label}
                          onChange={(e) => handleDocumentChange(index, 'label', e.target.value)}
                        />
                        <Input
                          placeholder="Tipo"
                          value={doc.type}
                          onChange={(e) => handleDocumentChange(index, 'type', e.target.value)}
                        />
                        <Input
                          placeholder="URL o base64"
                          value={doc.url}
                          onChange={(e) => handleDocumentChange(index, 'url', e.target.value)}
                        />
                        <div className="flex items-center justify-end gap-2">
                          {doc.url && (
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              asChild
                            >
                              <a href={doc.url} target="_blank" rel="noreferrer">
                                <FileText className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-red-500"
                            onClick={() => removeDocument(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold">Cuenta bancaria actual</CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                    {resolvedEmployee?.currentContract?.bankAccount ? (
                      <>
                        <div>
                          <span className="font-medium text-foreground">Banco: </span>
                          {resolvedEmployee.currentContract.bankAccount.bankName || '—'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Tipo: </span>
                          {resolvedEmployee.currentContract.bankAccount.accountType || '—'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Cuenta: </span>
                          {resolvedEmployee.currentContract.bankAccount.accountNumber || '—'}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Routing / Swift: </span>
                          {resolvedEmployee.currentContract.bankAccount.routingNumber || '—'}
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">Aún no se ha registrado información bancaria.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}

export default EmployeeDetailDrawer;
