import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth.jsx';
import { fetchApi, fetchChartOfAccounts } from '@/lib/api';
import { HRNavigation } from '@/components/payroll/HRNavigation.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Switch } from '@/components/ui/switch.jsx';
import { ScrollArea } from '@/components/ui/scroll-area.jsx';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert.jsx';
import {
  Loader2,
  Plus,
  RefreshCw,
  Calculator,
  Layers,
  Settings,
  Eye,
  AlertTriangle,
  Filter,
  ArrowUp,
  ArrowDown,
  Tag,
  Wand2,
  X,
} from 'lucide-react';

const periodOptions = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'custom', label: 'Personalizada' },
];

const calculationOptions = [
  { value: 'fixed', label: 'Monto fijo' },
  { value: 'percentage', label: 'Porcentaje' },
  { value: 'formula', label: 'Fórmula (JSON Logic)' },
];

const structureTemplate = {
  name: '',
  description: '',
  periodType: 'monthly',
  appliesToRoles: [],
  appliesToDepartments: [],
  appliesToContractTypes: [],
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: '',
  isActive: true,
};

const scopeDraftTemplate = {
  appliesToRoles: '',
  appliesToDepartments: '',
  appliesToContractTypes: '',
};

const cloneScopeDraftTemplate = {
  appliesToRoles: '',
  appliesToDepartments: '',
  appliesToContractTypes: '',
};

const ruleTemplate = {
  conceptId: '',
  conceptType: 'earning',
  calculationType: 'fixed',
  amount: 0,
  percentage: 0,
  priority: 0,
  baseConceptCodes: [],
  isActive: true,
  formula: '',
};

const mapStructureToForm = (structure = {}) => ({
  _id: structure._id,
  name: structure.name || '',
  description: structure.description || '',
  periodType: structure.periodType || 'monthly',
  appliesToRoles: structure.appliesToRoles || [],
  appliesToDepartments: structure.appliesToDepartments || [],
  appliesToContractTypes: structure.appliesToContractTypes || [],
  effectiveFrom: structure.effectiveFrom ? structure.effectiveFrom.slice(0, 10) : '',
  effectiveTo: structure.effectiveTo ? structure.effectiveTo.slice(0, 10) : '',
  isActive: structure.isActive ?? true,
});

const PayrollStructuresManager = () => {
  const { hasPermission, tenant } = useAuth();
  const canRead = hasPermission?.('payroll_employees_read');
  const canWrite = hasPermission?.('payroll_employees_write');

  const [structures, setStructures] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState(null);
  const [rules, setRules] = useState([]);
  const [concepts, setConcepts] = useState([]);
  const [loadingStructures, setLoadingStructures] = useState(false);
  const [loadingRules, setLoadingRules] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [structureForm, setStructureForm] = useState(() => ({ ...structureTemplate }));
  const [ruleForm, setRuleForm] = useState(ruleTemplate);
  const [savingStructure, setSavingStructure] = useState(false);
  const [savingRule, setSavingRule] = useState(false);
  const [previewPayload, setPreviewPayload] = useState({ baseSalary: '', context: '{}' });
  const [previewResult, setPreviewResult] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [structureFilters, setStructureFilters] = useState({ role: '', department: '', contractType: '' });
  const [suggestionFilters, setSuggestionFilters] = useState({ role: '', department: '', contractType: '' });
  const [suggestions, setSuggestions] = useState(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [scopeDrafts, setScopeDrafts] = useState(() => ({ ...scopeDraftTemplate }));
  const [reorderingRuleId, setReorderingRuleId] = useState(null);
  const [baseCodeDraft, setBaseCodeDraft] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountDialog, setAccountDialog] = useState({
    open: false,
    conceptId: null,
    debitAccountId: '',
    creditAccountId: '',
  });
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);
  const [cloneForm, setCloneForm] = useState({
    name: '',
    description: '',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: '',
    appliesToRoles: [],
    appliesToDepartments: [],
    appliesToContractTypes: [],
  });
  const [cloneScopeDrafts, setCloneScopeDrafts] = useState(() => ({ ...cloneScopeDraftTemplate }));

  const currency = tenant?.currency || 'USD';

  const previewHasImbalance = useMemo(() => {
    if (!previewResult?.totals) return false;
    const { earnings = 0, deductions = 0, netPay = 0 } = previewResult.totals;
    const delta = Math.abs(netPay - (earnings - deductions));
    return delta > 0.01;
  }, [previewResult]);

  const previewNetNegative = useMemo(() => {
    if (!previewResult?.totals) return false;
    return previewResult.totals.netPay < 0;
  }, [previewResult]);
  const previewLogs = useMemo(() => previewResult?.logs || [], [previewResult]);
  const previewSkippedLogs = useMemo(() => previewLogs.filter((log) => log.skipped), [previewLogs]);
  const [searchParams, setSearchParams] = useSearchParams();
  const structureParam = searchParams.get('structureId');

  const structureMap = useMemo(
    () => new Map(structures.map((structure) => [structure._id, structure])),
    [structures],
  );
  const conceptMap = useMemo(
    () => new Map(concepts.map((concept) => [concept._id, concept])),
    [concepts],
  );
  const rulesWithoutAccounts = useMemo(
    () =>
      rules.filter((rule) => {
        const concept = conceptMap.get(rule.conceptId);
        return !concept?.debitAccountId || !concept?.creditAccountId;
      }),
    [rules, conceptMap],
  );

  const selectedStructure = useMemo(
    () => structures.find((structure) => structure._id === selectedStructureId) || null,
    [structures, selectedStructureId],
  );
  const filteredStructures = useMemo(() => {
    const role = structureFilters.role.trim().toLowerCase();
    const department = structureFilters.department.trim().toLowerCase();
    const contractType = structureFilters.contractType.trim().toLowerCase();
    if (!role && !department && !contractType) {
      return structures;
    }
    return structures.filter((structure) => {
      const roles = (structure.appliesToRoles || []).map((value) => value.toLowerCase());
      const departments = (structure.appliesToDepartments || []).map((value) => value.toLowerCase());
      const contractTypes = (structure.appliesToContractTypes || []).map((value) => value.toLowerCase());
      const matchesRole = !role || roles.includes(role);
      const matchesDept = !department || departments.includes(department);
      const matchesContract = !contractType || contractTypes.includes(contractType);
      return matchesRole && matchesDept && matchesContract;
    });
  }, [structures, structureFilters]);
  const baseConceptOptions = useMemo(
    () =>
      concepts
        .filter((concept) => concept.code)
        .map((concept) => ({
          code: concept.code,
          name: concept.name,
        })),
    [concepts],
  );
  const accountOptions = useMemo(
    () =>
      accounts.map((account) => ({
        id: account._id,
        label: `${account.code} · ${account.name}`,
        type: account.type,
      })),
    [accounts],
  );
  const versionHistory = useMemo(() => {
    if (!selectedStructure) return [];
    const familyIds = new Set([selectedStructure._id]);
    // ancestors
    let ancestor = selectedStructure;
    while (ancestor?.supersedesId) {
      const parent = structureMap.get(ancestor.supersedesId);
      if (!parent || familyIds.has(parent._id)) break;
      familyIds.add(parent._id);
      ancestor = parent;
    }
    // descendants
    let updated = true;
    while (updated) {
      updated = false;
      structures.forEach((structure) => {
        if (
          structure.supersedesId &&
          familyIds.has(structure.supersedesId) &&
          !familyIds.has(structure._id)
        ) {
          familyIds.add(structure._id);
          updated = true;
        }
      });
    }
    return structures
      .filter((structure) => familyIds.has(structure._id))
      .sort((a, b) => (b.version || 0) - (a.version || 0));
  }, [structures, selectedStructure, structureMap]);

  const loadConcepts = useCallback(async () => {
    if (!canRead) return;
    try {
      const data = await fetchApi('/payroll/concepts');
      setConcepts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar los conceptos');
    }
  }, [canRead]);

  const loadStructures = useCallback(async () => {
    if (!canRead) return;
    setLoadingStructures(true);
    try {
      const data = await fetchApi('/payroll/structures');
      const list = Array.isArray(data) ? data : data?.data || [];
      setStructures(list);
    } catch (error) {
      toast.error(error.message || 'No se pudieron cargar las estructuras');
    } finally {
      setLoadingStructures(false);
    }
  }, [canRead]);

  const loadRules = useCallback(
    async (structureId) => {
      if (!canRead || !structureId) return;
      setLoadingRules(true);
      try {
        const data = await fetchApi(`/payroll/structures/${structureId}/rules`);
        setRules(Array.isArray(data) ? data : data?.data || []);
      } catch (error) {
        toast.error(error.message || 'No se pudieron cargar las reglas');
      } finally {
        setLoadingRules(false);
      }
    },
    [canRead],
  );

  const handleScopeChipAdd = (field) => {
    const draftValue = scopeDrafts[field]?.trim();
    if (!draftValue) return;
    setStructureForm((prev) => {
      const nextValues = Array.from(new Set([...(prev[field] || []), draftValue]));
      return { ...prev, [field]: nextValues };
    });
    setScopeDrafts((prev) => ({ ...prev, [field]: '' }));
  };

  const handleScopeChipRemove = (field, value) => {
    setStructureForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((item) => item !== value),
    }));
  };

  const handleCloneChipAdd = (field) => {
    const draftValue = cloneScopeDrafts[field]?.trim();
    if (!draftValue) return;
    setCloneForm((prev) => {
      const nextValues = Array.from(new Set([...(prev[field] || []), draftValue]));
      return { ...prev, [field]: nextValues };
    });
    setCloneScopeDrafts((prev) => ({ ...prev, [field]: '' }));
  };

  const handleCloneChipRemove = (field, value) => {
    setCloneForm((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((item) => item !== value),
    }));
  };

  const handleSuggestionFetch = async () => {
    if (!canRead) return;
    const query = new URLSearchParams();
    Object.entries(suggestionFilters).forEach(([key, value]) => {
      if (value.trim()) query.append(key, value.trim());
    });
    if (!query.toString()) {
      toast.error('Ingresa al menos un filtro para obtener sugerencias');
      return;
    }
    setSuggestionLoading(true);
    try {
      const data = await fetchApi(`/payroll/structures/suggestions?${query.toString()}`);
      setSuggestions(data);
    } catch (error) {
      toast.error(error.message || 'No se pudieron obtener sugerencias');
    } finally {
      setSuggestionLoading(false);
    }
  };

  const handleAccountsDialogOpen = (conceptId) => {
    if (!accounts.length) {
      loadAccounts();
    }
    const concept = conceptMap.get(conceptId);
    setAccountDialog({
      open: true,
      conceptId,
      debitAccountId: concept?.debitAccountId || '',
      creditAccountId: concept?.creditAccountId || '',
    });
  };

  const handleAccountsDialogClose = () => {
    setAccountDialog({
      open: false,
      conceptId: null,
      debitAccountId: '',
      creditAccountId: '',
    });
  };

  const handleAccountsDialogSave = async () => {
    if (!accountDialog.conceptId) return;
    try {
      await fetchApi(`/payroll/concepts/${accountDialog.conceptId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          debitAccountId: accountDialog.debitAccountId || null,
          creditAccountId: accountDialog.creditAccountId || null,
        }),
      });
      toast.success('Cuentas asignadas al concepto');
      handleAccountsDialogClose();
      loadConcepts();
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el concepto');
    }
  };

  const handleCloneDialogOpen = () => {
    if (!selectedStructure) return;
    setCloneForm({
      name: selectedStructure.name,
      description: selectedStructure.description || '',
      effectiveFrom: new Date().toISOString().slice(0, 10),
      effectiveTo: '',
      appliesToRoles: selectedStructure.appliesToRoles || [],
      appliesToDepartments: selectedStructure.appliesToDepartments || [],
      appliesToContractTypes: selectedStructure.appliesToContractTypes || [],
    });
    setCloneScopeDrafts({ ...cloneScopeDraftTemplate });
    setCloneDialogOpen(true);
  };

  const handleCloneSubmit = async () => {
    if (!selectedStructureId) return;
    try {
      await fetchApi(`/payroll/structures/${selectedStructureId}/version`, {
        method: 'POST',
        body: JSON.stringify(cloneForm),
      });
      toast.success('Versión duplicada');
      setCloneDialogOpen(false);
      loadStructures();
    } catch (error) {
      toast.error(error.message || 'No se pudo duplicar la estructura');
    }
  };

  const handleActivateStructure = async (structureId) => {
    try {
      await fetchApi(`/payroll/structures/${structureId}/activate`, { method: 'PATCH' });
      toast.success('Estructura activada');
      loadStructures();
    } catch (error) {
      toast.error(error.message || 'No se pudo activar la estructura');
    }
  };

  const handleDeactivateStructure = async (structureId) => {
    if (!canWrite) {
      toast.error('No tienes permisos para modificar estructuras');
      return;
    }
    try {
      await fetchApi(`/payroll/structures/${structureId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      });
      toast.success('Estructura pausada');
      loadStructures();
    } catch (error) {
      toast.error(error.message || 'No se pudo pausar la estructura');
    }
  };

  const handleRuleConceptChange = (conceptId) => {
    const concept = conceptMap.get(conceptId);
    setRuleForm((prev) => ({
      ...prev,
      conceptId,
      conceptType: concept?.conceptType || prev.conceptType,
    }));
  };

  const handleAddBaseConceptCode = (code) => {
    if (!code) return;
    setRuleForm((prev) => {
      const nextCodes = Array.from(new Set([...(prev.baseConceptCodes || []), code]));
      return { ...prev, baseConceptCodes: nextCodes };
    });
  };

  const handleRemoveBaseConceptCode = (code) => {
    setRuleForm((prev) => ({
      ...prev,
      baseConceptCodes: (prev.baseConceptCodes || []).filter((item) => item !== code),
    }));
  };

  const handleRuleReorder = async (ruleId, direction) => {
    if (!selectedStructureId) return;
    const index = rules.findIndex((rule) => rule._id === ruleId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= rules.length) return;
    const nextOrder = [...rules];
    const [moved] = nextOrder.splice(index, 1);
    nextOrder.splice(targetIndex, 0, moved);
    setRules(nextOrder);
    setReorderingRuleId(ruleId);
    try {
      await Promise.all(
        nextOrder.map((rule, priority) =>
          fetchApi(`/payroll/structures/${selectedStructureId}/rules/${rule._id}`, {
            method: 'PATCH',
            body: JSON.stringify({ priority }),
          }),
        ),
      );
      toast.success('Orden actualizado');
      loadRules(selectedStructureId);
    } catch (error) {
      toast.error(error.message || 'No se pudo actualizar el orden');
      loadRules(selectedStructureId);
    } finally {
      setReorderingRuleId(null);
    }
  };

  const renderChipInput = (label, field, placeholder) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {(structureForm[field] || []).map((value) => (
          <Badge key={value} variant="secondary" className="inline-flex items-center gap-1">
            {value}
            <button
              type="button"
              onClick={() => handleScopeChipRemove(field, value)}
              className="focus:outline-none"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={scopeDrafts[field]}
          onChange={(event) =>
            setScopeDrafts((prev) => ({ ...prev, [field]: event.target.value }))
          }
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => handleScopeChipAdd(field)}>
          Agregar
        </Button>
      </div>
    </div>
  );
  const renderCloneChipInput = (label, field, placeholder) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {(cloneForm[field] || []).map((value) => (
          <Badge key={value} variant="secondary" className="inline-flex items-center gap-1">
            {value}
            <button type="button" onClick={() => handleCloneChipRemove(field, value)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={cloneScopeDrafts[field]}
          onChange={(event) =>
            setCloneScopeDrafts((prev) => ({ ...prev, [field]: event.target.value }))
          }
          placeholder={placeholder}
        />
        <Button type="button" variant="outline" onClick={() => handleCloneChipAdd(field)}>
          Agregar
        </Button>
      </div>
    </div>
  );

  useEffect(() => {
    loadConcepts();
    loadStructures();
  }, [loadConcepts, loadStructures]);

  useEffect(() => {
    if (!structures.length) return;
    if (structureParam && structures.some((structure) => structure._id === structureParam)) {
      if (selectedStructureId !== structureParam) {
        setSelectedStructureId(structureParam);
      }
      return;
    }
    if (!selectedStructureId) {
      setSelectedStructureId(structures[0]._id);
    }
  }, [structures, structureParam, selectedStructureId]);

  useEffect(() => {
    if (!selectedStructureId) return;
    if (structureParam === selectedStructureId) return;
    const next = new URLSearchParams(searchParams.toString());
    next.set('structureId', selectedStructureId);
    setSearchParams(next, { replace: true });
  }, [selectedStructureId, structureParam, searchParams, setSearchParams]);

  useEffect(() => {
    if (selectedStructureId) {
      loadRules(selectedStructureId);
    } else {
      setRules([]);
    }
  }, [selectedStructureId, loadRules]);

  useEffect(() => {
    if (filteredStructures.length === 0) {
      if (!structureMap.has(selectedStructureId)) {
        setSelectedStructureId(null);
      }
      return;
    }
    if (!selectedStructureId) {
      setSelectedStructureId(filteredStructures[0]._id);
      return;
    }
    const exists = filteredStructures.some((structure) => structure._id === selectedStructureId);
    if (!exists && !structureMap.has(selectedStructureId)) {
      setSelectedStructureId(filteredStructures[0]._id);
    }
  }, [filteredStructures, selectedStructureId, structureMap]);

  useEffect(() => {
    if (!ruleDialogOpen) {
      setBaseCodeDraft('');
      setRuleForm(ruleTemplate);
    }
  }, [ruleDialogOpen]);

  const loadAccounts = useCallback(async () => {
    if (!canRead) return;
    setLoadingAccounts(true);
    try {
      const data = await fetchChartOfAccounts();
      const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      setAccounts(list);
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar el plan de cuentas');
    } finally {
      setLoadingAccounts(false);
    }
  }, [canRead]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const resetPreviewState = () => {
    setPreviewPayload({ baseSalary: '', context: '{}' });
    setPreviewResult(null);
  };

  const handleDialogToggle = (open) => {
    if (!open) {
      setStructureForm({ ...structureTemplate });
      setScopeDrafts({ ...scopeDraftTemplate });
      resetPreviewState();
    }
    setDialogOpen(open);
  };

  const openNewStructureDialog = () => {
    setStructureForm({ ...structureTemplate });
    setScopeDrafts({ ...scopeDraftTemplate });
    resetPreviewState();
    setDialogOpen(true);
  };

  const handleViewStructure = (structure) => {
    if (!structure) return;
    setSelectedStructureId(structure._id);
    setStructureForm(mapStructureToForm(structure));
    setScopeDrafts({ ...scopeDraftTemplate });
    resetPreviewState();
    setDialogOpen(true);
  };

  const handleStructureSubmit = async () => {
    if (!canWrite) {
      toast.error('No tienes permisos para crear estructuras');
      return;
    }
    if (!structureForm.name.trim()) {
      toast.error('Ingresa un nombre para la estructura');
      return;
    }
    if (structureForm.isActive) {
      if (!previewResult) {
        toast.error('Ejecuta una simulación antes de activar la estructura.');
        return;
      }
      if (previewHasImbalance || previewNetNegative) {
        toast.error('Corrige la simulación: el neto debe ser devengos - deducciones y no puede ser negativo.');
        return;
      }
    }
    setSavingStructure(true);
    try {
      await fetchApi(structureForm._id ? `/payroll/structures/${structureForm._id}` : '/payroll/structures', {
        method: structureForm._id ? 'PATCH' : 'POST',
        body: JSON.stringify(structureForm),
      });
      toast.success(structureForm._id ? 'Estructura actualizada' : 'Estructura creada');
      handleDialogToggle(false);
      loadStructures();
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la estructura');
    } finally {
      setSavingStructure(false);
    }
  };

  const handleRuleSubmit = async () => {
    if (!canWrite || !selectedStructureId) {
      toast.error('Selecciona una estructura antes de agregar reglas');
      return;
    }
    if (!ruleForm.conceptId) {
      toast.error('Selecciona un concepto');
      return;
    }
    if (ruleForm.calculationType === 'fixed' && !ruleForm.amount) {
      toast.error('Define un monto fijo');
      return;
    }
    if (ruleForm.calculationType === 'percentage' && !ruleForm.percentage) {
      toast.error('Define un porcentaje');
      return;
    }
    setSavingRule(true);
    try {
      await fetchApi(`/payroll/structures/${selectedStructureId}/rules`, {
        method: 'POST',
        body: JSON.stringify(ruleForm),
      });
      toast.success('Regla agregada');
      setRuleDialogOpen(false);
      setRuleForm(ruleTemplate);
      loadRules(selectedStructureId);
    } catch (error) {
      toast.error(error.message || 'No se pudo guardar la regla');
    } finally {
      setSavingRule(false);
    }
  };

  const handlePreview = async () => {
    if (!selectedStructureId) {
      toast.error('Selecciona una estructura para simular');
      return;
    }
    setPreviewLoading(true);
    try {
      let context = {};
      if (previewPayload.context) {
        try {
          context = JSON.parse(previewPayload.context);
        } catch (err) {
          console.warn('Invalid preview context JSON', err);
          toast.error('El contexto debe ser un JSON válido');
          setPreviewLoading(false);
          return;
        }
      }
      const body = {
        baseSalary: previewPayload.baseSalary ? Number(previewPayload.baseSalary) : undefined,
        context,
      };
      const response = await fetchApi(`/payroll/structures/${selectedStructureId}/preview`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setPreviewResult(response);
      toast.success('Simulación completa');
    } catch (error) {
      toast.error(error.message || 'No se pudo simular la estructura');
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!canRead) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No tienes permisos para consultar nómina.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <HRNavigation />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Estructuras de nómina</h1>
          <p className="text-sm text-muted-foreground">Configura conjuntos de reglas y conceptos por rol/departamento.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={loadStructures} disabled={loadingStructures}>
            {loadingStructures ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Recargar
          </Button>
          <Button onClick={openNewStructureDialog} disabled={!canWrite}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva estructura
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros y sugerencias</CardTitle>
          <CardDescription>Acota la lista por alcance y obtén recomendaciones de estructuras existentes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <Label>Rol</Label>
              <Input
                placeholder="Ej. cajero"
                value={structureFilters.role}
                onChange={(event) =>
                  setStructureFilters((prev) => ({ ...prev, role: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Departamento</Label>
              <Input
                placeholder="Ej. operaciones"
                value={structureFilters.department}
                onChange={(event) =>
                  setStructureFilters((prev) => ({ ...prev, department: event.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Tipo de contrato</Label>
              <Input
                placeholder="Ej. permanente"
                value={structureFilters.contractType}
                onChange={(event) =>
                  setStructureFilters((prev) => ({ ...prev, contractType: event.target.value }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setStructureFilters({ role: '', department: '', contractType: '' });
                setSuggestions(null);
              }}
            >
              <X className="mr-2 h-4 w-4" /> Limpiar filtros
            </Button>
            <div className="flex flex-wrap gap-2">
              {['role', 'department', 'contractType'].map((field) => (
                <div key={field} className="space-y-1">
                  <Label className="text-xs capitalize">Sugerir por {field === 'role' ? 'rol' : field === 'department' ? 'departamento' : 'tipo de contrato'}</Label>
                  <Input
                    size="sm"
                    value={suggestionFilters[field]}
                    onChange={(event) =>
                      setSuggestionFilters((prev) => ({
                        ...prev,
                        [field]: event.target.value,
                      }))
                    }
                    placeholder={field === 'role' ? 'cajero' : field === 'department' ? 'ventas' : 'permanent'}
                  />
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleSuggestionFetch}
              disabled={suggestionLoading}
            >
              {suggestionLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Filter className="mr-2 h-4 w-4" />
              )}
              Buscar sugerencias
            </Button>
          </div>
          {suggestions && (
            <div className="space-y-2 rounded-md border p-3">
              <p className="text-sm text-muted-foreground">
                {suggestions.suggestions?.length || 0} coincidencias para los filtros ingresados.
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                {suggestions.suggestions?.map((item) => (
                  <div
                    key={item.structure._id}
                    className="rounded-md border p-3 text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{item.structure.name}</p>
                        <p className="text-xs text-muted-foreground">
                          versión {item.structure.version || 1}
                        </p>
                      </div>
                      {item.isFallback ? (
                        <Badge variant="outline">Fallback</Badge>
                      ) : (
                        <Badge>Match {item.score}</Badge>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(item.matchedDimensions || []).map((dimension) => (
                        <Badge key={dimension} variant="secondary" className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3" />
                          {dimension === 'role'
                            ? 'Rol'
                            : dimension === 'department'
                              ? 'Departamento'
                              : 'Contrato'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {suggestions.suggestions?.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No encontramos estructuras específicas, se sugiere crear una nueva o ampliar los filtros.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription>Selecciona una estructura para ver reglas y simulaciones.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredStructures.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay estructuras registradas.</div>
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredStructures.map((structure) => (
                <button
                  key={structure._id}
                  type="button"
                  onClick={() => setSelectedStructureId(structure._id)}
                  className={`rounded-md border p-4 text-left transition hover:border-primary ${selectedStructureId === structure._id ? 'border-primary bg-primary/5' : 'border-muted'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{structure.name}</p>
                      <p className="text-xs text-muted-foreground">{structure.description || 'Sin descripción'}</p>
                    </div>
                    <Badge variant={structure.isActive ? 'default' : 'outline'}>
                      {structure.isActive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Layers className="h-3 w-3" /> {structure.periodType}
                    </span>
                    {structure.effectiveFrom && (
                      <span>
                        Vigente {structure.effectiveFrom?.slice(0, 10)}
                        {structure.effectiveTo ? ` → ${structure.effectiveTo?.slice(0, 10)}` : ''}
                      </span>
                    )}
                    {structure.appliesToDepartments?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Settings className="h-3 w-3" /> {structure.appliesToDepartments.join(', ')}
                      </span>
                    )}
                    {structure.appliesToRoles?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <Tag className="h-3 w-3" /> {structure.appliesToRoles.join(', ')}
                      </span>
                    )}
                    {structure.appliesToContractTypes?.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        Contrato: {structure.appliesToContractTypes.join(', ')}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStructure && (
        <>
          <Card>
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Versiones de {selectedStructure.name}</CardTitle>
                <CardDescription>Duplica, programa y activa versiones históricas o futuras.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleCloneDialogOpen}>
                <Plus className="mr-2 h-4 w-4" />
                Duplicar versión
              </Button>
            </CardHeader>
            <CardContent>
              {versionHistory.length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay historial disponible.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Versión</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vigencia</TableHead>
                      <TableHead>Alcance</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versionHistory.map((structure) => (
                      <TableRow key={structure._id} className={structure._id === selectedStructureId ? 'bg-muted/40' : undefined}>
                        <TableCell>
                          <div className="font-medium">v{structure.version || 1}</div>
                          <p className="text-xs text-muted-foreground">
                            {structure.supersedesId ? `Deriva de ${structure.supersedesId.slice(-6)}` : 'Base'}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={structure.isActive ? 'default' : 'outline'}>
                            {structure.isActive ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {structure.effectiveFrom?.slice(0, 10) || 'N/D'}
                          {structure.effectiveTo ? ` → ${structure.effectiveTo.slice(0, 10)}` : ''}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <p>{(structure.appliesToRoles || []).join(', ') || 'Todos los roles'}</p>
                            <p>{(structure.appliesToDepartments || []).join(', ') || 'Todos los departamentos'}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleViewStructure(structure)}
                            >
                              Ver
                            </Button>
                            {structure.isActive ? (
                              <Button size="xs" variant="ghost" onClick={() => handleDeactivateStructure(structure._id)} disabled={!canWrite}>
                                Pausar
                              </Button>
                            ) : (
                              <Button size="xs" onClick={() => handleActivateStructure(structure._id)} disabled={!canWrite}>
                                Activar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Reglas asociadas</CardTitle>
                <CardDescription>Define cómo se calculan los conceptos y su prioridad.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setRuleForm({ ...ruleTemplate, conceptType: 'earning' }); setRuleDialogOpen(true); }} disabled={!canWrite}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar regla
              </Button>
            </CardHeader>
            <CardContent>
              {rulesWithoutAccounts.length > 0 && (
                <Alert className="mb-3" variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Conceptos sin cuentas contables</AlertTitle>
                  <AlertDescription>
                    {rulesWithoutAccounts.length} concepto(s) no tienen cuenta de débito o crédito asignada. Asignar cuentas para que los asientos se generen automáticamente.
                  </AlertDescription>
                </Alert>
              )}
              {loadingRules ? (
                <div className="flex h-24 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : rules.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aún no hay reglas configuradas.</p>
              ) : (
                <ScrollArea className="h-[320px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Referencias</TableHead>
                        <TableHead>Cálculo</TableHead>
                        <TableHead>Prioridad</TableHead>
                        <TableHead>Cuentas</TableHead>
                        <TableHead>Activo</TableHead>
                        <TableHead>Orden</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rules.map((rule) => {
                        const concept = conceptMap.get(rule.conceptId);
                        return (
                          <TableRow key={rule._id}>
                            <TableCell>
                              <div className="font-medium">{concept?.name || 'Concepto'}</div>
                              <p className="text-xs text-muted-foreground">{concept?.code}</p>
                            </TableCell>
                            <TableCell className="capitalize">
                              <Badge variant={rule.conceptType === 'earning' ? 'default' : rule.conceptType === 'deduction' ? 'destructive' : 'secondary'}>
                                {rule.conceptType === 'earning'
                                  ? 'Devengo'
                                  : rule.conceptType === 'deduction'
                                    ? 'Deducción'
                                    : 'Patronal'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {rule.baseConceptCodes?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {rule.baseConceptCodes.map((code) => (
                                    <Badge key={code} variant="outline" className="text-xs">
                                      <Tag className="mr-1 h-3 w-3" />
                                      {code}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Salario base</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {rule.calculationType === 'fixed' && `${rule.amount || 0} ${currency}`}
                              {rule.calculationType === 'percentage' && `${rule.percentage || 0}%`}
                              {rule.calculationType === 'formula' && <code className="text-xs">{rule.formula?.slice(0, 40)}...</code>}
                            </TableCell>
                            <TableCell>{rule.priority ?? 0}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1 text-xs">
                                <span className={!concept?.debitAccountId ? 'text-destructive' : ''}>
                                  {concept?.debitAccountId
                                    ? `Débito: ${accounts.find((acc) => acc._id === concept.debitAccountId)?.code || 'N/D'}`
                                    : 'Sin débito'}
                                </span>
                                <span className={!concept?.creditAccountId ? 'text-destructive' : ''}>
                                  {concept?.creditAccountId
                                    ? `Crédito: ${accounts.find((acc) => acc._id === concept.creditAccountId)?.code || 'N/D'}`
                                    : 'Sin crédito'}
                                </span>
                                <Button
                                  type="button"
                                  variant="link"
                                  className="px-0 text-xs"
                                  onClick={() => handleAccountsDialogOpen(rule.conceptId)}
                                >
                                  Configurar cuentas
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>{rule.isActive ? 'Sí' : 'No'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={reorderingRuleId === rule._id}
                                  onClick={() => handleRuleReorder(rule._id, 'up')}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  disabled={reorderingRuleId === rule._id}
                                  onClick={() => handleRuleReorder(rule._id, 'down')}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                </Button>
                                {reorderingRuleId === rule._id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Simulador</CardTitle>
              <CardDescription>Prueba la estructura con un salario base y contexto personalizado.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Salario base</Label>
                  <Input
                    type="number"
                    value={previewPayload.baseSalary}
                    onChange={(event) => setPreviewPayload((prev) => ({ ...prev, baseSalary: event.target.value }))}
                    placeholder="750"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Contexto adicional (JSON)</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPreviewPayload((prev) => ({
                          ...prev,
                          context: JSON.stringify(
                            {
                              horasExtra: 12,
                              bonoProductividad: 80,
                            },
                            null,
                            2,
                          ),
                        }))
                      }
                    >
                      <Wand2 className="mr-2 h-3.5 w-3.5" />
                      Plantilla
                    </Button>
                  </div>
                  <Textarea
                    rows={4}
                    value={previewPayload.context}
                    onChange={(event) => setPreviewPayload((prev) => ({ ...prev, context: event.target.value }))}
                    placeholder='{"bonoProductividad": 120}'
                  />
                </div>
              </div>
              <Button onClick={handlePreview} disabled={previewLoading}>
                {previewLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                Simular
              </Button>
              {previewResult && (
                <div className="rounded-md border p-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    <span>Devengos: <strong>{previewResult.totals.earnings.toFixed(2)} {currency}</strong></span>
                    <span>Deducciones: <strong>{previewResult.totals.deductions.toFixed(2)} {currency}</strong></span>
                    <span>Aportes: <strong>{previewResult.totals.employerCosts.toFixed(2)} {currency}</strong></span>
                    <span>Neto: <strong>{previewResult.totals.netPay.toFixed(2)} {currency}</strong></span>
                  </div>
                  {(previewHasImbalance || previewNetNegative) && (
                    <Alert variant="destructive" className="mt-3">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Revisa tus reglas</AlertTitle>
                      <AlertDescription>
                        {previewHasImbalance && 'El neto no coincide con devengos menos deducciones. '}
                        {previewNetNegative && 'El neto resultante es negativo.'}
                      </AlertDescription>
                    </Alert>
                  )}
                  <ScrollArea className="mt-3 h-48">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Método</TableHead>
                          <TableHead>Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {previewResult.entries.map((entry) => {
                          const concept = concepts.find((item) => item._id === entry.conceptId);
                          return (
                            <TableRow key={`${entry.conceptId}-${entry.priority}`}>
                              <TableCell>{concept?.name || entry.conceptId}</TableCell>
                              <TableCell className="capitalize">{entry.conceptType}</TableCell>
                              <TableCell>{entry.calculationType}</TableCell>
                              <TableCell>{entry.amount.toFixed(2)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {previewLogs.length > 0 && (
                    <div className="mt-4 space-y-2 rounded-md bg-muted/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Bitácora de reglas ({previewLogs.length})</p>
                        {previewSkippedLogs.length > 0 && (
                          <Badge variant="destructive">{previewSkippedLogs.length} saltadas</Badge>
                        )}
                      </div>
                      <ScrollArea className="h-40">
                        <div className="space-y-2 pr-2 text-xs">
                          {previewLogs.map((log) => (
                            <div
                              key={`${log.ruleId}-${log.conceptId}`}
                              className="rounded border bg-background p-2"
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{log.ruleId?.slice(-6)}</Badge>
                                <span className="font-medium">
                                  {conceptMap.get(log.conceptId)?.name || log.conceptId}
                                </span>
                                {log.skipped ? (
                                  <Badge variant="destructive">Omitida ({log.reason})</Badge>
                                ) : (
                                  <Badge variant="secondary">Aplicada</Badge>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-4">
                                <span>Base: {log.baseAmount?.toFixed?.(2) ?? log.baseAmount}</span>
                                <span>Resultado: {log.amount?.toFixed?.(2) ?? log.amount}</span>
                                {log.references?.length > 0 && (
                                  <span>Refs: {log.references.join(', ')}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={handleDialogToggle}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{structureForm._id ? 'Editar estructura' : 'Nueva estructura'}</DialogTitle>
            <DialogDescription>Define nombre, frecuencia y alcance.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={structureForm.name} onChange={(event) => setStructureForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Descripción</Label>
              <Textarea rows={3} value={structureForm.description} onChange={(event) => setStructureForm((prev) => ({ ...prev, description: event.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Frecuencia</Label>
              <Select value={structureForm.periodType} onValueChange={(value) => setStructureForm((prev) => ({ ...prev, periodType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {renderChipInput('Roles aplicables', 'appliesToRoles', 'ej. supervisor')}
              {renderChipInput('Departamentos', 'appliesToDepartments', 'ej. operaciones')}
              {renderChipInput('Tipos de contrato', 'appliesToContractTypes', 'ej. permanente')}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Inicio de vigencia</Label>
                <Input
                  type="date"
                  value={structureForm.effectiveFrom}
                  onChange={(event) => setStructureForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fin de vigencia</Label>
                <Input
                  type="date"
                  value={structureForm.effectiveTo}
                  onChange={(event) => setStructureForm((prev) => ({ ...prev, effectiveTo: event.target.value }))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-xs text-muted-foreground">Solo las estructuras activas están disponibles en simulaciones.</p>
              </div>
              <Switch checked={structureForm.isActive} onCheckedChange={(checked) => setStructureForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogToggle(false)}>
              Cancelar
            </Button>
            <Button onClick={handleStructureSubmit} disabled={savingStructure}>
              {savingStructure ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Layers className="mr-2 h-4 w-4" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva regla</DialogTitle>
            <DialogDescription>Selecciona el concepto y cómo se calculará.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Concepto</Label>
              <Select value={ruleForm.conceptId} onValueChange={handleRuleConceptChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona concepto" />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((concept) => (
                    <SelectItem key={concept._id} value={concept._id}>
                      {concept.code} · {concept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={ruleForm.conceptType} onValueChange={(value) => setRuleForm((prev) => ({ ...prev, conceptType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="earning">Devengo</SelectItem>
                    <SelectItem value="deduction">Deducción</SelectItem>
                    <SelectItem value="employer">Patronal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cálculo</Label>
                <Select value={ruleForm.calculationType} onValueChange={(value) => setRuleForm((prev) => ({ ...prev, calculationType: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {calculationOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {ruleForm.calculationType === 'fixed' && (
              <div className="space-y-1">
                <Label>Monto</Label>
                <Input type="number" value={ruleForm.amount} onChange={(event) => setRuleForm((prev) => ({ ...prev, amount: Number(event.target.value) }))} />
              </div>
            )}
            {ruleForm.calculationType === 'percentage' && (
              <div className="space-y-1">
                <Label>Porcentaje</Label>
                <Input type="number" value={ruleForm.percentage} onChange={(event) => setRuleForm((prev) => ({ ...prev, percentage: Number(event.target.value) }))} />
              </div>
            )}
            {ruleForm.calculationType === 'formula' && (
              <div className="space-y-1">
                <Label>Fórmula (JSON Logic)</Label>
                <Textarea
                  rows={4}
                  value={ruleForm.formula}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, formula: event.target.value }))}
                  placeholder='{"*": [{"var": "baseSalary"}, 0.1]}'
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Referencias de base</Label>
              {ruleForm.baseConceptCodes?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {ruleForm.baseConceptCodes.map((code) => (
                    <Badge key={code} variant="outline" className="inline-flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {code}
                      <button type="button" onClick={() => handleRemoveBaseConceptCode(code)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Si no agregas referencias se usará el salario base.</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Select value={baseCodeDraft} onValueChange={(value) => setBaseCodeDraft(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona concepto base" />
                  </SelectTrigger>
                  <SelectContent>
                    {baseConceptOptions.map((option) => (
                      <SelectItem key={option.code} value={option.code}>
                        {option.code} · {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    handleAddBaseConceptCode(baseCodeDraft);
                    setBaseCodeDraft('');
                  }}
                  disabled={!baseCodeDraft}
                >
                  Agregar referencia
                </Button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Prioridad</Label>
              <Input type="number" value={ruleForm.priority} onChange={(event) => setRuleForm((prev) => ({ ...prev, priority: Number(event.target.value) }))} />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Activa</p>
                <p className="text-xs text-muted-foreground">Las reglas inactivas se ignoran en la simulación.</p>
              </div>
              <Switch checked={ruleForm.isActive} onCheckedChange={(checked) => setRuleForm((prev) => ({ ...prev, isActive: checked }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRuleSubmit} disabled={savingRule}>
              {savingRule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calculator className="mr-2 h-4 w-4" />}
              Guardar regla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar versión</DialogTitle>
            <DialogDescription>Define fechas y alcance para la nueva versión (se creará en estado inactivo).</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Inicio de vigencia</Label>
                <Input
                  type="date"
                  value={cloneForm.effectiveFrom}
                  onChange={(event) =>
                    setCloneForm((prev) => ({ ...prev, effectiveFrom: event.target.value }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Fin de vigencia</Label>
                <Input
                  type="date"
                  value={cloneForm.effectiveTo}
                  onChange={(event) =>
                    setCloneForm((prev) => ({ ...prev, effectiveTo: event.target.value }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {renderCloneChipInput('Roles', 'appliesToRoles', 'ej. supervisor')}
              {renderCloneChipInput('Departamentos', 'appliesToDepartments', 'ej. operación')}
              {renderCloneChipInput('Contratos', 'appliesToContractTypes', 'ej. fijo')}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCloneSubmit}>
              Crear versión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={accountDialog.open} onOpenChange={(open) => (!open ? handleAccountsDialogClose() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar cuentas contables</DialogTitle>
            <DialogDescription>
              Selecciona las cuentas de débito y crédito para el concepto {conceptMap.get(accountDialog.conceptId)?.name || ''}
            </DialogDescription>
          </DialogHeader>
          {loadingAccounts ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Cuenta de débito</Label>
                <Select
                  value={accountDialog.debitAccountId}
                  onValueChange={(value) =>
                    setAccountDialog((prev) => ({ ...prev, debitAccountId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cuenta de crédito</Label>
                <Select
                  value={accountDialog.creditAccountId}
                  onValueChange={(value) =>
                    setAccountDialog((prev) => ({ ...prev, creditAccountId: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accountOptions.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={handleAccountsDialogClose}>
              Cancelar
            </Button>
            <Button onClick={handleAccountsDialogSave} disabled={loadingAccounts}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PayrollStructuresManager;
