import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth.jsx";
import { fetchApi } from "@/lib/api";
import { useExchangeRate } from "@/hooks/useExchangeRate";
import { HRNavigation } from '@/components/payroll/HRNavigation.jsx';
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import { Switch } from "@/components/ui/switch.jsx";
import { ScrollArea } from "@/components/ui/scroll-area.jsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer.jsx";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert.jsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart.jsx";

const PERIOD_FILTERS = [
  { value: "all", label: "Todas las frecuencias" },
  { value: "monthly", label: "Mensual" },
  { value: "biweekly", label: "Quincenal" },
  { value: "custom", label: "Personalizada" },
];

const STATUS_FILTERS = [
  { value: "all", label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "calculating", label: "Calculando" },
  { value: "calculated", label: "Calculada" },
  { value: "posted", label: "Contabilizada" },
  { value: "paid", label: "Pagada" },
];

const ENTRY_FILTERS = [
  { value: "all", label: "Todos los conceptos" },
  { value: "earning", label: "Devengos" },
  { value: "deduction", label: "Deducciones" },
  { value: "employer", label: "Aportes patronales" },
];

const statusVariantMap = {
  draft: "secondary",
  calculating: "secondary",
  calculated: "outline",
  posted: "default",
  paid: "default",
};

const formatStructureScope = (structure = {}) => {
  const {
    appliesToRoles = [],
    appliesToDepartments = [],
    appliesToContractTypes = [],
  } = structure;
  const parts = [];
  if (appliesToDepartments?.length) {
    parts.push(`Depto: ${appliesToDepartments.slice(0, 2).join(", ")}`);
  }
  if (appliesToRoles?.length) {
    parts.push(`Rol: ${appliesToRoles.slice(0, 2).join(", ")}`);
  }
  if (appliesToContractTypes?.length) {
    parts.push(`Contrato: ${appliesToContractTypes.slice(0, 2).join(", ")}`);
  }
  return parts.length ? parts.join(" · ") : "Cubre todos los perfiles";
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
      structure.structureName &&
        structure.structureName !== structure.structureId
        ? structure.structureName
        : `Estructura ${index + 1}`,
  }));
  const structuredEmployees = structures.reduce(
    (sum, structure) => sum + structure.employees,
    0,
  );
  const totalEmployees =
    run.totalEmployees || structuredEmployees + legacyEmployees;
  const coveragePercent =
    totalEmployees > 0
      ? Math.round((structuredEmployees / totalEmployees) * 100)
      : 0;
  return {
    totalEmployees,
    structuredEmployees,
    legacyEmployees,
    coveragePercent,
    structures: structures.sort((a, b) => b.employees - a.employees),
  };
};

const formatCurrency = (value, currency = "USD") => {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
};

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
};

const formatDateTime = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getApiBaseUrl = () => {
  if (typeof window === "undefined") {
    return "https://api.smartkubik.com/api/v1";
  }
  const devHostnames = ["localhost", "127.0.0.1"];
  return devHostnames.includes(window.location.hostname)
    ? "http://localhost:3000/api/v1"
    : "https://api.smartkubik.com/api/v1";
};

const KpiCard = ({ label, value, currency }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">
        {typeof value === "number" && currency ? formatCurrency(value, currency) : value}
      </div>
    </CardContent>
  </Card>
);

const PayrollRunsDashboard = () => {
  const { tenant, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const payrollEnabled = Boolean(tenant?.enabledModules?.payroll);
  const canReadPayroll = hasPermission
    ? hasPermission("payroll_employees_read")
    : false;
  const canWritePayroll = hasPermission
    ? hasPermission("payroll_employees_write")
    : false;
  const currency = tenant?.currency || "USD";
  const { rate: bcvRate, loading: loadingBcvRate } = useExchangeRate();

  const [runs, setRuns] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [filters, setFilters] = useState({
    periodType: "all",
    status: "all",
    calendarId: "",
  });
  const [concepts, setConcepts] = useState([]);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [loadingConcepts, setLoadingConcepts] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [paying, setPaying] = useState(false);
  const [payMethod, setPayMethod] = useState({
    method: "transfer",
    currency: "USD",
    reference: "",
    igtf: false,
    igtfRate: 0.03,
  });
  const [bankAccountId, setBankAccountId] = useState("");
  const [bankAccounts, setBankAccounts] = useState([]);
  const selectedBankAccount = useMemo(
    () => bankAccounts.find((acc) => acc._id === bankAccountId),
    [bankAccounts, bankAccountId],
  );
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [remapping, setRemapping] = useState(false);
  const [exportingRunKey, setExportingRunKey] = useState("");
  const [entriesFilter, setEntriesFilter] = useState("all");
  const [specialRuns, setSpecialRuns] = useState([]);
  const [loadingSpecialRuns, setLoadingSpecialRuns] = useState(false);
  const [specialPreview, setSpecialPreview] = useState(null);
  const [previewingSpecialId, setPreviewingSpecialId] = useState("");
  const [specialForm, setSpecialForm] = useState({
    type: "bonus",
    label: "",
    periodStart: "",
    periodEnd: "",
    totalAmount: "",
  });
  const [creatingSpecial, setCreatingSpecial] = useState(false);
  const [processingSpecialId, setProcessingSpecialId] = useState("");
  const [liquidationRules, setLiquidationRules] = useState([]);
  const [loadingLiquidationRules, setLoadingLiquidationRules] = useState(false);
  const [liquidationRuleForm, setLiquidationRuleForm] = useState({
    daysPerYear: 30,
    minDaysPerYear: 0,
    vacationDays: 0,
    utilitiesDays: 0,
    integralSalaryFactor: 1.0,
    accounts: {
      severanceDebit: "5205",
      vacationDebit: "5201",
      utilitiesDebit: "5207",
      severanceCredit: "2104",
      vacationCredit: "2104",
      utilitiesCredit: "2104",
    },
  });
  const [creatingLiquidationRule, setCreatingLiquidationRule] = useState(false);
  const [liquidationRuns, setLiquidationRuns] = useState([]);
  const [loadingLiquidationRuns, setLoadingLiquidationRuns] = useState(false);
  const [liquidationRunForm, setLiquidationRunForm] = useState({
    label: "",
    ruleSetId: "",
    terminationDate: "",
  });
  const [creatingLiquidationRun, setCreatingLiquidationRun] = useState(false);
  const [liquidationPreview, setLiquidationPreview] = useState(null);
  const [previewingLiquidationId, setPreviewingLiquidationId] = useState("");
  const [processingLiquidationId, setProcessingLiquidationId] = useState("");
  const [exportingLiquidationId, setExportingLiquidationId] = useState("");
  const [newRunForm, setNewRunForm] = useState({
    periodType: "monthly",
    periodStart: "",
    periodEnd: "",
    label: "",
    dryRun: false,
  });
  const [creatingRun, setCreatingRun] = useState(false);
  const [accountingPreview, setAccountingPreview] = useState({
    entries: [],
    totals: { debit: 0, credit: 0 },
  });
  const [loadingAccountingPreview, setLoadingAccountingPreview] =
    useState(false);
  const [localizations, setLocalizations] = useState([]);
  const [loadingLocalizations, setLoadingLocalizations] = useState(false);
  const [creatingLocalization, setCreatingLocalization] = useState(false);
  const [localizationForm, setLocalizationForm] = useState({
    country: "VE",
    label: "",
    version: "",
    validFrom: "",
    ratesText:
      '{"rates": {"ivss": {"employer": 0.09, "employee": 0.04}}}',
  });
  const [activeLocalizationId, setActiveLocalizationId] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importErrors, setImportErrors] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [viewLocalization, setViewLocalization] = useState(null);
  const [activatingLocalization, setActivatingLocalization] = useState(false);
  const [submittingLocalizationId, setSubmittingLocalizationId] = useState("");
  const [reportFilters, setReportFilters] = useState({
    from: "",
    to: "",
    department: "",
    structureId: "",
  });
  const [reportSummary, setReportSummary] = useState({
    totals: { grossPay: 0, deductions: 0, employerCosts: 0, netPay: 0, employees: 0 },
    series: [],
    byDepartment: [],
  });
  const [reportDeductions, setReportDeductions] = useState({ concepts: [] });
  const [reportAbsenteeism, setReportAbsenteeism] = useState({
    totals: { totalRequests: 0, totalDays: 0 },
    byLeaveType: [],
    byEmployee: [],
  });
  const [loadingReports, setLoadingReports] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState({
    endpointUrl: "",
    secret: "",
    enabled: false,
    maxRetries: 3,
    retryDelayMs: 2000,
  });
  const [loadingWebhook, setLoadingWebhook] = useState(false);
  const [savingWebhook, setSavingWebhook] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [auditFilters, setAuditFilters] = useState({
    entity: "",
    entityId: "",
    from: "",
    to: "",
  });
  const [loadingAudit, setLoadingAudit] = useState(false);

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
    () =>
      concepts.filter(
        (concept) => !concept.debitAccountId || !concept.creditAccountId,
      ),
    [concepts],
  );

  const previewEntries = accountingPreview?.entries || [];
  const previewTotals = accountingPreview?.totals || { debit: 0, credit: 0 };
  const previewDiff = (previewTotals.debit || 0) - (previewTotals.credit || 0);
  const isPreviewBalanced = Math.abs(previewDiff) < 0.01;

  const entriesSummary = useMemo(() => {
    if (!selectedRun?.entries?.length) {
      return { earning: 0, deduction: 0, employer: 0 };
    }
    return selectedRun.entries.reduce(
      (acc, entry) => {
        acc[entry.conceptType] =
          (acc[entry.conceptType] || 0) + (entry.amount || 0);
        return acc;
      },
      { earning: 0, deduction: 0, employer: 0 },
    );
  }, [selectedRun]);

  const filteredEntries = useMemo(() => {
    if (!selectedRun?.entries) return [];
    if (entriesFilter === "all") return selectedRun.entries;
    return selectedRun.entries.filter(
      (entry) => entry.conceptType === entriesFilter,
    );
  }, [selectedRun, entriesFilter]);

  const previousNetPay = previousRun?.netPay || 0;
  const variationNet = selectedRun
    ? (selectedRun.netPay || 0) - previousNetPay
    : 0;
  const variationPct = previousNetPay
    ? (variationNet / previousNetPay) * 100
    : 0;
  const employerProvision = entriesSummary.employer || 0;

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const calendarId = params.get("calendarId") || "";
    if (calendarId) {
      setFilters((prev) => ({ ...prev, calendarId }));
    }
  }, [location.search]);

  const loadRuns = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingRuns(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", "10");
      if (filters.periodType !== "all")
        params.set("periodType", filters.periodType);
      if (filters.status !== "all") params.set("status", filters.status);
      if (filters.calendarId) params.set("calendarId", filters.calendarId);
      const response = await fetchApi(`/payroll/runs?${params.toString()}`);
      setRuns(Array.isArray(response?.data) ? response.data : []);
      const nextPagination = response?.pagination || {};
      setPagination((prev) => ({
        page: nextPagination.page || prev.page,
        totalPages: nextPagination.totalPages || prev.totalPages || 1,
      }));
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar las nóminas");
    } finally {
      setLoadingRuns(false);
    }
  }, [
    payrollEnabled,
    canReadPayroll,
    filters.periodType,
    filters.status,
    filters.calendarId,
    pagination.page,
  ]);

  const loadConcepts = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingConcepts(true);
    try {
      const data = await fetchApi("/payroll/concepts");
      setConcepts(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar los conceptos");
    } finally {
      setLoadingConcepts(false);
    }
  }, [payrollEnabled, canReadPayroll]);

  const loadBankAccounts = useCallback(async () => {
    try {
      const data = await fetchApi("/bank-accounts");
      setBankAccounts(Array.isArray(data) ? data : data?.data || []);
    } catch {
      setBankAccounts([]);
    }
  }, []);

  const loadLocalizations = useCallback(async () => {
    setLoadingLocalizations(true);
    try {
      const data = await fetchApi("/payroll/localizations");
      const list = Array.isArray(data) ? data : data?.data || [];
      setLocalizations(list);
      const activeLoc = list.find((loc) => loc.status === "active");
      if (activeLoc?._id) {
        setActiveLocalizationId(activeLoc._id);
      }
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar las localizaciones");
    } finally {
      setLoadingLocalizations(false);
    }
  }, []);

  const loadSpecialRuns = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingSpecialRuns(true);
    try {
      const data = await fetchApi("/payroll/special-runs");
      const runs = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data)
          ? data
          : [];
      setSpecialRuns(runs);
    } catch (error) {
      toast.error(
        error.message || "No se pudieron cargar las nóminas especiales",
      );
    } finally {
      setLoadingSpecialRuns(false);
    }
  }, [payrollEnabled, canReadPayroll]);

  const loadLiquidationRules = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingLiquidationRules(true);
    try {
      const data = await fetchApi("/liquidations/rules");
      setLiquidationRules(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(
        error.message || "No se pudieron cargar reglas de liquidación",
      );
    } finally {
      setLoadingLiquidationRules(false);
    }
  }, [payrollEnabled, canReadPayroll]);

  const loadLiquidationRuns = useCallback(async () => {
    if (!payrollEnabled || !canReadPayroll) return;
    setLoadingLiquidationRuns(true);
    try {
      const data = await fetchApi("/liquidations/runs");
      setLiquidationRuns(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar liquidaciones");
    } finally {
      setLoadingLiquidationRuns(false);
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

  useEffect(() => {
    loadBankAccounts();
  }, [loadBankAccounts]);

  useEffect(() => {
    loadSpecialRuns();
  }, [loadSpecialRuns]);

  useEffect(() => {
    loadLiquidationRules();
    loadLiquidationRuns();
    loadLocalizations();
  }, [loadLiquidationRules, loadLiquidationRuns, loadLocalizations]);

  useEffect(() => {
    if (!liquidationRunForm.ruleSetId && liquidationRules.length > 0) {
      setLiquidationRunForm((prev) => ({
        ...prev,
        ruleSetId: prev.ruleSetId || liquidationRules[0]._id,
      }));
    }
  }, [liquidationRules, liquidationRunForm.ruleSetId]);

  useEffect(() => {
    setAccountingPreview({ entries: [], totals: { debit: 0, credit: 0 } });
  }, [selectedRun?._id]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const parseRatesJson = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("El JSON debe contener un objeto de tasas.");
      }
      return { data: parsed, errors: [] };
    } catch (err) {
      return { data: null, errors: [err.message || "JSON inválido"] };
    }
  };

  const parseRatesCsv = (text) => {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const errors = [];
    const rates = {};
    lines.forEach((line, idx) => {
      const [key, value] = line.split(/[,;]/).map((p) => p?.trim());
      if (!key) {
        errors.push(`Línea ${idx + 1}: falta clave`);
        return;
      }
      const num = Number(value);
      if (Number.isNaN(num)) {
        errors.push(`Línea ${idx + 1}: valor inválido para ${key}`);
        return;
      }
      rates[key] = num;
    });
    if (!Object.keys(rates).length) {
      errors.push("CSV sin tasas válidas (clave,valor)");
    }
    return { data: { rates }, errors };
  };

  const handlePageChange = (direction) => {
    setPagination((prev) => {
      const nextPage = Math.max(
        1,
        Math.min(prev.totalPages || 1, prev.page + direction),
      );
      return { ...prev, page: nextPage };
    });
  };

  const handleCreateRun = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para generar nóminas");
      return;
    }
    if (!newRunForm.periodStart || !newRunForm.periodEnd) {
      toast.error("Selecciona las fechas de inicio y fin");
      return;
    }
    setCreatingRun(true);
    try {
      const payload = {
        ...newRunForm,
        periodStart: new Date(newRunForm.periodStart).toISOString(),
        periodEnd: new Date(newRunForm.periodEnd).toISOString(),
      };
      await fetchApi("/payroll/runs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success(
        newRunForm.dryRun ? "Simulación generada" : "Nómina creada",
      );
      setCreateDialogOpen(false);
      setNewRunForm((prev) => ({
        ...prev,
        periodStart: "",
        periodEnd: "",
        label: "",
        dryRun: false,
      }));
      setPagination((prev) => ({ ...prev, page: 1 }));
      loadRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo crear la nómina");
    } finally {
      setCreatingRun(false);
    }
  };

  const handleRemapAccounts = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para remapear");
      return;
    }
    setRemapping(true);
    try {
      // Usa defaults server-side; puedes ajustar listas si se requiere
      await fetchApi("/payroll/concepts/remap-accounts", {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Cuentas remapeadas con defaults");
      loadRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo remapear cuentas");
    } finally {
      setRemapping(false);
    }
  };

  const loadAuditLogs = useCallback(async (runId) => {
    setAuditLoading(true);
    try {
      const params = new URLSearchParams({
        entity: "payrollRun",
        entityId: runId,
        limit: "30",
      });
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
    setEntriesFilter("all");
    try {
      const detail = await fetchApi(`/payroll/runs/${run._id}`);
      setSelectedRun(detail?.data || detail || run);
      loadAuditLogs(run._id);
    } catch (error) {
      toast.error(error.message || "No se pudo cargar el detalle");
      setSelectedRun(run);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailDrawerOpen(false);
    setSelectedRun(null);
    setAuditLogs([]);
    setPayDialogOpen(false);
  };

  const handleDownloadBankFile = async (
    runId,
    bank = "generic",
    format = "csv",
  ) => {
    if (!runId) return;
    const key = `${runId}-bank-${format}`;
    setExportingRunKey(key);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${getApiBaseUrl()}/payroll/runs/${runId}/bank-file?bank=${bank}&format=${format}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "No se pudo generar el archivo bancario");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `payroll-bank.${format}`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      toast.error(error.message || "Error descargando archivo bancario");
    } finally {
      setExportingRunKey("");
    }
  };

  const [approvingRun, setApprovingRun] = useState(false);

  const handleApproveRun = async () => {
    if (!selectedRun?._id) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para aprobar nóminas");
      return;
    }
    setApprovingRun(true);
    try {
      await fetchApi(`/payroll/runs/${selectedRun._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      toast.success("Nómina aprobada");
      loadRuns();
      const detail = await fetchApi(`/payroll/runs/${selectedRun._id}`);
      setSelectedRun(detail?.data || detail || selectedRun);
    } catch (error) {
      toast.error(error.message || "No se pudo aprobar la nómina");
    } finally {
      setApprovingRun(false);
    }
  };

  const handlePayRun = async () => {
    if (!selectedRun?._id) return;
    if (selectedRun.status !== "approved") {
      toast.error("Solo puedes pagar nóminas aprobadas");
      return;
    }
    if (!bankAccountId) {
      toast.error("Selecciona una cuenta bancaria");
      return;
    }
    if (selectedBankAccount && !selectedBankAccount.isActive) {
      toast.error("La cuenta bancaria está inactiva");
      return;
    }
    if (
      selectedBankAccount &&
      selectedBankAccount.currency !== payMethod.currency
    ) {
      toast.error(
        `La cuenta es ${selectedBankAccount.currency}, selecciona la moneda correcta`,
      );
      return;
    }
    if (
      selectedBankAccount?.acceptedPaymentMethods?.length &&
      !selectedBankAccount.acceptedPaymentMethods.includes(payMethod.method)
    ) {
      toast.error("El método no está permitido para esta cuenta");
      return;
    }
    if (payMethod.currency === "VES" && !bcvRate) {
      toast.error("No se pudo obtener la tasa BCV para pagar en VES");
      return;
    }
    setPaying(true);
    try {
      const payload = {
        method: payMethod.method,
        currency: payMethod.currency,
        bankAccountId: bankAccountId || undefined,
        reference: payMethod.reference,
        applyIgtf: payMethod.igtf,
        igtfRate: payMethod.igtfRate,
        exchangeRate: payMethod.currency === "VES" ? bcvRate : undefined,
      };
      await fetchApi(`/payroll/runs/${selectedRun._id}/pay`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Nómina pagada");
      loadRuns();
      const detail = await fetchApi(`/payroll/runs/${selectedRun._id}`);
      setSelectedRun(detail?.data || detail || selectedRun);
      setPayDialogOpen(false);
    } catch (error) {
      toast.error(error.message || "No se pudo pagar la nómina");
    } finally {
      setPaying(false);
    }
  };

  const downloadRun = async (runId, format) => {
    if (!runId || !format) return;
    const key = `${runId}-${format}`;
    setExportingRunKey(key);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${getApiBaseUrl()}/payroll/runs/${runId}/export?format=${format}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "No se pudo exportar la nómina");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `payroll-run.${format}`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Archivo descargado");
    } catch (error) {
      toast.error(error.message || "No se pudo completar la descarga");
    } finally {
      setExportingRunKey("");
    }
  };

  const handleCreateSpecial = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para crear ejecuciones especiales");
      return;
    }
    if (!specialForm.periodStart || !specialForm.periodEnd) {
      toast.error("Selecciona el período de la ejecución especial");
      return;
    }
    setCreatingSpecial(true);
    try {
      const payload = {
        type: specialForm.type,
        label: specialForm.label || undefined,
        periodStart: new Date(specialForm.periodStart).toISOString(),
        periodEnd: new Date(specialForm.periodEnd).toISOString(),
        totalAmount: specialForm.totalAmount
          ? Number(specialForm.totalAmount)
          : undefined,
      };
      await fetchApi("/payroll/special-runs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Ejecución especial creada");
      setSpecialForm((prev) => ({
        ...prev,
        label: "",
        periodStart: "",
        periodEnd: "",
        totalAmount: "",
      }));
      loadSpecialRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo crear la ejecución especial");
    } finally {
      setCreatingSpecial(false);
    }
  };

  const handleSpecialPreview = async (runId) => {
    if (!runId) return;
    setPreviewingSpecialId(runId);
    try {
      const response = await fetchApi(
        `/payroll/special-runs/${runId}/accounting-preview`,
      );
      setSpecialPreview(normalizeAccountingPreview(response));
      toast.success("Preview contable generado");
    } catch (error) {
      toast.error(error.message || "No se pudo obtener el preview contable");
    } finally {
      setPreviewingSpecialId("");
    }
  };

  const handleApproveSpecial = async (runId) => {
    if (!runId) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para aprobar ejecuciones especiales");
      return;
    }
    const key = `${runId}-approve`;
    setProcessingSpecialId(key);
    try {
      await fetchApi(`/payroll/special-runs/${runId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "approved" }),
      });
      toast.success("Ejecución especial aprobada");
      loadSpecialRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo aprobar la ejecución especial");
    } finally {
      setProcessingSpecialId("");
    }
  };

  const handlePaySpecial = async (runId) => {
    if (!runId) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para pagar ejecuciones especiales");
      return;
    }
    const key = `${runId}-pay`;
    setProcessingSpecialId(key);
    try {
      await fetchApi(`/payroll/special-runs/${runId}/pay`, {
        method: "POST",
        body: JSON.stringify({ method: "transfer", currency }),
      });
      toast.success("Ejecución especial pagada");
      loadSpecialRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo pagar la ejecución especial");
    } finally {
      setProcessingSpecialId("");
    }
  };

  const handleCreateLiquidationRule = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para crear reglas de liquidación");
      return;
    }
    setCreatingLiquidationRule(true);
    try {
      const payload = {
        country: "VE",
        daysPerYear: Number(liquidationRuleForm.daysPerYear) || 0,
        minDaysPerYear: Number(liquidationRuleForm.minDaysPerYear) || 0,
        integralSalaryFactor:
          Number(liquidationRuleForm.integralSalaryFactor) || 1,
        vacationDays: Number(liquidationRuleForm.vacationDays) || 0,
        utilitiesDays: Number(liquidationRuleForm.utilitiesDays) || 0,
        accounts: { ...liquidationRuleForm.accounts },
      };
      const response = await fetchApi("/liquidations/rules", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const createdRule = response?.data || response;
      toast.success("Regla de liquidación guardada");
      loadLiquidationRules();
      if (createdRule?._id) {
        setLiquidationRunForm((prev) => ({
          ...prev,
          ruleSetId: createdRule._id,
        }));
      }
    } catch (error) {
      toast.error(error.message || "No se pudo guardar la regla");
    } finally {
      setCreatingLiquidationRule(false);
    }
  };

  const handleCreateLiquidationRun = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para crear liquidaciones");
      return;
    }
    if (!liquidationRunForm.ruleSetId) {
      toast.error("Selecciona una regla antes de crear la liquidación");
      return;
    }
    setCreatingLiquidationRun(true);
    try {
      const payload = {
        country: "VE",
        ruleSetId: liquidationRunForm.ruleSetId,
        label: liquidationRunForm.label || undefined,
        terminationDate: liquidationRunForm.terminationDate
          ? new Date(liquidationRunForm.terminationDate).toISOString()
          : undefined,
      };
      const response = await fetchApi("/liquidations/runs", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const created = response?.data || response;
      if (created?._id) {
        await fetchApi(`/liquidations/runs/${created._id}/calculate`, {
          method: "POST",
        });
      }
      toast.success("Liquidación creada y calculada");
      setLiquidationRunForm((prev) => ({
        ...prev,
        label: "",
        terminationDate: "",
      }));
      loadLiquidationRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo crear la liquidación");
    } finally {
      setCreatingLiquidationRun(false);
    }
  };

  const handlePreviewLiquidationRun = async (runId) => {
    if (!runId) return;
    setPreviewingLiquidationId(runId);
    try {
      const response = await fetchApi(
        `/liquidations/runs/${runId}/accounting-preview`,
      );
      const preview = normalizeAccountingPreview(response);
      const runMeta = liquidationRuns.find((item) => item._id === runId);
      setLiquidationPreview({
        ...preview,
        runLabel: runMeta?.label || runId,
        debitAccount: preview.entries?.[0]?.debitAccount,
        creditAccount: preview.entries?.[0]?.creditAccount,
      });
      toast.success("Preview contable VE actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo obtener el preview contable");
    } finally {
      setPreviewingLiquidationId("");
    }
  };

  const handleApproveLiquidationRun = async (runId) => {
    if (!runId) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para aprobar liquidaciones");
      return;
    }
    const key = `${runId}-approve`;
    setProcessingLiquidationId(key);
    try {
      await fetchApi(`/liquidations/runs/${runId}/approve`, { method: "POST" });
      toast.success("Liquidación aprobada");
      loadLiquidationRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo aprobar la liquidación");
    } finally {
      setProcessingLiquidationId("");
    }
  };

  const handlePayLiquidationRun = async (runId) => {
    if (!runId) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para pagar liquidaciones");
      return;
    }
    const key = `${runId}-pay`;
    setProcessingLiquidationId(key);
    try {
      await fetchApi(`/liquidations/runs/${runId}/pay`, {
        method: "POST",
        body: JSON.stringify({ method: "transfer", currency }),
      });
      toast.success("Liquidación pagada");
      loadLiquidationRuns();
    } catch (error) {
      toast.error(error.message || "No se pudo pagar la liquidación");
    } finally {
      setProcessingLiquidationId("");
    }
  };

  const handleExportLiquidationRun = async (runId, format = "csv") => {
    if (!runId) return;
    const key = `${runId}-${format}`;
    setExportingLiquidationId(key);
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `${getApiBaseUrl()}/liquidations/runs/${runId}/export?format=${format}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "No se pudo exportar la liquidación");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename =
        response.headers
          .get("Content-Disposition")
          ?.split("filename=")[1]
          ?.replace(/"/g, "") || `liquidacion-${runId}.${format}`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success("Exportación lista");
    } catch (error) {
      toast.error(error.message || "No se pudo exportar la liquidación");
    } finally {
      setExportingLiquidationId("");
    }
  };

  const handleCreateLocalization = async () => {
    if (!canWritePayroll) {
      toast.error("No tienes permisos para crear localizaciones");
      return;
    }
    setCreatingLocalization(true);
    try {
      let parsedRates;
      if (localizationForm.ratesText.trim()) {
        try {
          parsedRates = JSON.parse(localizationForm.ratesText);
        } catch (err) {
          console.error('Invalid JSON for localization rates:', err);
          toast.error("JSON inválido en tasas");
          return;
        }
      }
      const payload = {
        country: localizationForm.country || "VE",
        label: localizationForm.label || undefined,
        version: localizationForm.version
          ? Number(localizationForm.version)
          : undefined,
        validFrom: localizationForm.validFrom || undefined,
        rates: parsedRates?.rates || parsedRates || undefined,
        islrTable: Array.isArray(parsedRates?.islrTable)
          ? parsedRates.islrTable
          : undefined,
      };
      await fetchApi("/payroll/localizations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Paquete de localización creado");
      setLocalizationForm((prev) => ({
        ...prev,
        label: "",
        version: "",
        validFrom: "",
      }));
      loadLocalizations();
    } catch (error) {
      toast.error(error.message || "No se pudo crear el paquete");
    } finally {
      setCreatingLocalization(false);
    }
  };

  const handleImportFile = (file) => {
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result || "";
      const result =
        file.name.toLowerCase().endsWith(".csv") ||
          file.type === "text/csv"
          ? parseRatesCsv(text)
          : parseRatesJson(text);
      setImportPreview(result.data);
      setImportErrors(result.errors || []);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importErrors.length) {
      toast.error("Corrige los errores de importación");
      return;
    }
    if (!canWritePayroll) {
      toast.error("No tienes permisos para crear localizaciones");
      return;
    }
    setCreatingLocalization(true);
    try {
      const payload = {
        country: "VE",
        label:
          localizationForm.label ||
          importFileName ||
          `Importación ${new Date().toISOString().slice(0, 10)}`,
        version: localizationForm.version
          ? Number(localizationForm.version)
          : undefined,
        validFrom:
          localizationForm.validFrom ||
          new Date().toISOString().slice(0, 10),
        rates: importPreview?.rates || importPreview,
        islrTable: Array.isArray(importPreview?.islrTable)
          ? importPreview.islrTable
          : undefined,
      };
      await fetchApi("/payroll/localizations", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      toast.success("Importación creada");
      setImportDialogOpen(false);
      setImportPreview(null);
      setImportErrors([]);
      setImportFileName("");
      loadLocalizations();
    } catch (error) {
      toast.error(error.message || "No se pudo importar las tasas");
    } finally {
      setCreatingLocalization(false);
    }
  };

  const handleSaveWebhook = async () => {
    setSavingWebhook(true);
    try {
      await fetchApi("/payroll/webhooks/config", {
        method: "POST",
        body: JSON.stringify(webhookConfig),
      });
      toast.success("Configuración guardada");
    } catch (error) {
      toast.error(error.message || "No se pudo guardar el webhook");
    } finally {
      setSavingWebhook(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    try {
      await fetchApi("/payroll/webhooks/test", { method: "POST" });
      toast.success("Webhook probado con éxito");
    } catch (error) {
      toast.error(error.message || "No se pudo probar el webhook");
    } finally {
      setTestingWebhook(false);
    }
  };

  const loadReports = useCallback(async () => {
    setLoadingReports(true);
    try {
      const params = new URLSearchParams();
      if (reportFilters.from) params.set("from", reportFilters.from);
      if (reportFilters.to) params.set("to", reportFilters.to);
      if (reportFilters.department) params.set("department", reportFilters.department);
      if (reportFilters.structureId) params.set("structureId", reportFilters.structureId);

      const [summaryResp, deductionsResp, absenteeismResp] = await Promise.all([
        fetchApi(`/payroll/reports/summary?${params.toString()}`),
        fetchApi(`/payroll/reports/deductions-breakdown?${params.toString()}`),
        fetchApi(`/payroll/reports/absenteeism?${params.toString()}`),
      ]);

      setReportSummary(summaryResp || { totals: {}, series: [], byDepartment: [] });
      setReportDeductions(deductionsResp || { concepts: [] });
      setReportAbsenteeism(
        absenteeismResp || { totals: {}, byLeaveType: [], byEmployee: [] },
      );
    } catch (error) {
      toast.error(error.message || "No se pudieron cargar los reportes");
    } finally {
      setLoadingReports(false);
    }
  }, [reportFilters]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const loadWebhookConfig = useCallback(async () => {
    setLoadingWebhook(true);
    try {
      const data = await fetchApi("/payroll/webhooks/config");
      if (data) {
        setWebhookConfig({
          endpointUrl: data.endpointUrl || "",
          secret: data.secret || "",
          enabled: Boolean(data.enabled),
        });
      }
    } catch (error) {
      toast.error(error.message || "No se pudo cargar el webhook");
    } finally {
      setLoadingWebhook(false);
    }
  }, []);

  useEffect(() => {
    loadWebhookConfig();
  }, [loadWebhookConfig]);

  const loadAuditLogsGlobal = useCallback(async () => {
    setLoadingAudit(true);
    try {
      const params = new URLSearchParams();
      if (auditFilters.entity) params.set("entity", auditFilters.entity);
      if (auditFilters.entityId) params.set("entityId", auditFilters.entityId);
      if (auditFilters.from) params.set("from", auditFilters.from);
      if (auditFilters.to) params.set("to", auditFilters.to);
      const data = await fetchApi(`/payroll/audit?${params.toString()}`);
      setAuditLogs(Array.isArray(data) ? data : data?.data || []);
    } catch (error) {
      toast.error(error.message || "No se pudo cargar la auditoría");
    } finally {
      setLoadingAudit(false);
    }
  }, [auditFilters]);

  useEffect(() => {
    loadAuditLogsGlobal();
  }, [loadAuditLogsGlobal]);

  const handleActivateLocalization = async (id) => {
    if (!id) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para activar localizaciones");
      return;
    }
    try {
      await fetchApi(`/payroll/localizations/${id}/approve`, {
        method: "POST",
      });
      toast.success("Localización activada");
      loadLocalizations();
    } catch (error) {
      toast.error(error.message || "No se pudo activar la localización");
    }
  };

  const handleSubmitLocalization = async (id) => {
    if (!id) return;
    if (!canWritePayroll) {
      toast.error("No tienes permisos para enviar a aprobación");
      return;
    }
    setSubmittingLocalizationId(id);
    try {
      await fetchApi(`/payroll/localizations/${id}/submit`, {
        method: "POST",
      });
      toast.success("Enviado a aprobación");
      loadLocalizations();
    } catch (error) {
      toast.error(error.message || "No se pudo enviar a aprobación");
    } finally {
      setSubmittingLocalizationId("");
    }
  };

  const shareByEmail = (run) => {
    if (!run) return;
    const subject = encodeURIComponent(`Resumen de nómina ${run.label || ""}`);
    const body = encodeURIComponent(
      `Consulta la nómina ${run.label || ""} (${formatDate(run.periodStart)} - ${formatDate(run.periodEnd)}).\n\nPuedes descargarla en ${window.location.origin}/payroll/runs`,
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const copyJournalEntry = (entryId) => {
    if (!entryId) return;
    navigator.clipboard.writeText(entryId).then(() => {
      toast.success("Referencia copiada");
    });
  };

  const normalizeAccountingPreview = (data) => {
    if (!data) {
      return { entries: [], totals: { debit: 0, credit: 0 } };
    }
    const entries =
      data.entries ||
      data.lines ||
      data.groups ||
      data.data ||
      (Array.isArray(data) ? data : []);
    const safeEntries = Array.isArray(entries) ? entries : [];
    const totals = data.totals || {
      debit: safeEntries.reduce((sum, item) => sum + (item.debit || 0), 0),
      credit: safeEntries.reduce((sum, item) => sum + (item.credit || 0), 0),
    };
    return { entries: safeEntries, totals };
  };

  const loadAccountingPreview = async (runId) => {
    if (!runId) return;
    setLoadingAccountingPreview(true);
    try {
      const response = await fetchApi(
        `/payroll/runs/${runId}/accounting-preview`,
      );
      setAccountingPreview(normalizeAccountingPreview(response));
      toast.success("Preview contable actualizado");
    } catch (error) {
      toast.error(error.message || "No se pudo cargar el preview contable");
    } finally {
      setLoadingAccountingPreview(false);
    }
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
      <HRNavigation />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Nómina y payroll runs</h1>
          <p className="text-sm text-muted-foreground">
            Controla tus ciclos de nómina, valida los asientos automáticos y
            revisa la auditoría desde un solo dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link to="/payroll/runs/wizard">
              <BarChart3 className="mr-2 h-4 w-4" />
              Abrir wizard
            </Link>
          </Button>
          <Button variant="outline" onClick={loadRuns} disabled={loadingRuns}>
            {loadingRuns ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Actualizar
          </Button>
          <Button
            variant="outline"
            onClick={handleRemapAccounts}
            disabled={!canWritePayroll || remapping}
          >
            {remapping ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Remapear cuentas
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            disabled={!canWritePayroll}
          >
            <BarChart3 className="mr-2 h-4 w-4" />
            Nuevo ciclo
          </Button>
        </div>
      </div>

      <Tabs defaultValue="operations" className="space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="operations">Operaciones</TabsTrigger>
          <TabsTrigger value="reports">Reportes y Auditoría</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="operations" className="space-y-4">
          <Tabs defaultValue="runs">
            <TabsList className="bg-muted/50 p-1">
              <TabsTrigger value="runs">Nómina Regular</TabsTrigger>
              <TabsTrigger value="special">Especiales</TabsTrigger>
              <TabsTrigger value="liquidations">Liquidaciones</TabsTrigger>
            </TabsList>
            <TabsContent value="runs" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Costo neto actual
                    </CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(latestRun?.netPay || 0, currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {previousRun
                        ? `${latestRun?.netPay >= previousRun.netPay ? "▲" : "▼"} ${formatCurrency(Math.abs((latestRun?.netPay || 0) - (previousRun?.netPay || 0)), currency)} vs anterior`
                        : "Sin histórico previo"}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Deducciones totales
                    </CardTitle>
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {formatCurrency(latestRun?.deductions || 0, currency)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Retenciones y aportes legales de la última ejecución.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Empleados procesados
                    </CardTitle>
                    <ClipboardList className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {latestRun?.totalEmployees || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Periodo {formatDate(latestRun?.periodEnd)}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>Historial de nóminas</CardTitle>
                    <CardDescription>
                      Filtra por frecuencia y estado para comparar ejecuciones.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <Select
                      value={filters.periodType}
                      onValueChange={(value) => handleFilterChange("periodType", value)}
                    >
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
                    <Select
                      value={filters.status}
                      onValueChange={(value) => handleFilterChange("status", value)}
                    >
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
                    {filters.calendarId ? (
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="px-2">
                          Calendario: {filters.calendarId.slice(-6)}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() =>
                            setFilters((prev) => ({ ...prev, calendarId: "" }))
                          }
                        >
                          Limpiar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          onClick={() =>
                            navigate(
                              `/payroll/calendar?calendarId=${filters.calendarId}`,
                            )
                          }
                        >
                          Ver calendario
                        </Button>
                      </div>
                    ) : null}
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
                            <TableCell
                              colSpan={7}
                              className="text-center text-sm text-muted-foreground"
                            >
                              Aún no se han generado nóminas.
                            </TableCell>
                          </TableRow>
                        ) : (
                          runs.map((run) => {
                            const structureSummary = summarizeRunStructures(run);
                            return (
                              <TableRow key={run._id}>
                                <TableCell>
                                  <div className="font-medium">
                                    {run.label || "Sin título"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {formatDate(run.periodStart)} -{" "}
                                    {formatDate(run.periodEnd)}
                                  </div>
                                  {structureSummary && (
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {structureSummary.coveragePercent || 0}%
                                        cobertura
                                      </Badge>
                                      {structureSummary.structures
                                        .slice(0, 2)
                                        .map((structure) => (
                                          <Badge
                                            key={`${structure.structureId}-${structure.structureVersion || "latest"}`}
                                            variant="outline"
                                            className="cursor-pointer text-xs"
                                            onClick={() =>
                                              openStructureBuilder(
                                                structure.structureId,
                                              )
                                            }
                                          >
                                            {structure.structureName || "Estructura"}
                                            {structure.structureVersion
                                              ? ` · v${structure.structureVersion}`
                                              : ""}
                                            <span className="ml-1 text-muted-foreground">
                                              · {structure.employees}
                                            </span>
                                          </Badge>
                                        ))}
                                      {structureSummary.structures.length > 2 && (
                                        <Badge variant="outline" className="text-xs">
                                          +{structureSummary.structures.length - 2}
                                        </Badge>
                                      )}
                                      {structureSummary.legacyEmployees > 0 && (
                                        <Badge className="border-amber-200 bg-amber-50 text-amber-900">
                                          {structureSummary.legacyEmployees} sin
                                          estructura
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="capitalize">
                                  {run.periodType}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={statusVariantMap[run.status] || "outline"}
                                    className="capitalize"
                                  >
                                    {run.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{run.totalEmployees}</TableCell>
                                <TableCell>
                                  {formatCurrency(run.grossPay, currency)}
                                </TableCell>
                                <TableCell>
                                  {formatCurrency(run.netPay, currency)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openDetail(run)}
                                    >
                                      Detalles
                                    </Button>
                                    {run.calendarId ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() =>
                                          navigate(
                                            `/payroll/calendar?calendarId=${run.calendarId}`,
                                          )
                                        }
                                      >
                                        Calendario
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => downloadRun(run._id, "csv")}
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
                                      onClick={() => downloadRun(run._id, "pdf")}
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
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pagination.page <= 1}
                        onClick={() => handlePageChange(-1)}
                      >
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
                      <CardDescription>
                        Sincroniza cuentas contables para cada concepto y evita asientos
                        huérfanos.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {concepts.length} conceptos
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {conceptStats.earning} devengos · {conceptStats.deduction}{" "}
                    deducciones · {conceptStats.employer} aportes patronales.
                  </p>
                  {conceptWarnings.length > 0 && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Asignaciones contables pendientes</AlertTitle>
                      <AlertDescription>
                        {conceptWarnings.length} concepto(s) sin cuenta de débito o
                        crédito. Configúralos para mantener la trazabilidad de los
                        asientos.
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
                            <TableCell
                              colSpan={5}
                              className="text-center text-sm text-muted-foreground"
                            >
                              No hay conceptos configurados todavía.
                            </TableCell>
                          </TableRow>
                        ) : (
                          concepts.map((concept) => (
                            <TableRow key={concept._id}>
                              <TableCell>{concept.code}</TableCell>
                              <TableCell>{concept.name}</TableCell>
                              <TableCell className="capitalize">
                                {concept.conceptType}
                              </TableCell>
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
            </TabsContent>
            <TabsContent value="special" className="mt-0">
              <Card>
                <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>
                      Ejecuciones especiales (aguinaldos/liquidaciones/bonos)
                    </CardTitle>
                    <CardDescription>
                      Pagos únicos fuera de la nómina regular.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadSpecialRuns}
                    disabled={loadingSpecialRuns}
                  >
                    {loadingSpecialRuns ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Actualizar
                  </Button>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-5">
                    <div className="md:col-span-1">
                      <Label>Tipo</Label>
                      <Select
                        value={specialForm.type}
                        onValueChange={(value) =>
                          setSpecialForm((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bonus">Bono</SelectItem>
                          <SelectItem value="thirteenth">Aguinaldo</SelectItem>
                          <SelectItem value="severance">Liquidación</SelectItem>
                          <SelectItem value="vacation_bonus">
                            Bono vacacional
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-1">
                      <Label>Etiqueta</Label>
                      <Input
                        value={specialForm.label || ""}
                        onChange={(e) =>
                          setSpecialForm((prev) => ({
                            ...prev,
                            label: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Inicio</Label>
                      <Input
                        type="date"
                        value={specialForm.periodStart || ""}
                        onChange={(e) =>
                          setSpecialForm((prev) => ({
                            ...prev,
                            periodStart: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Fin</Label>
                      <Input
                        type="date"
                        value={specialForm.periodEnd || ""}
                        onChange={(e) =>
                          setSpecialForm((prev) => ({
                            ...prev,
                            periodEnd: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label>Monto total</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={specialForm.totalAmount || ""}
                          onChange={(e) =>
                            setSpecialForm((prev) => ({
                              ...prev,
                              totalAmount: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          onClick={handleCreateSpecial}
                          disabled={creatingSpecial}
                        >
                          {creatingSpecial ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Crear
                        </Button>
                      </div>
                    </div>
                  </div>
                  {specialRuns.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Sin ejecuciones especiales.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Etiqueta</TableHead>
                            <TableHead>Período</TableHead>
                            <TableHead>Empleados</TableHead>
                            <TableHead className="text-right">Neto</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Acciones</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {specialRuns.map((run) => (
                            <TableRow key={run._id}>
                              <TableCell className="capitalize">
                                {run.type?.replace("_", " ")}
                              </TableCell>
                              <TableCell>{run.label || "—"}</TableCell>
                              <TableCell>
                                {formatDate(run.periodStart)} -{" "}
                                {formatDate(run.periodEnd)}
                              </TableCell>
                              <TableCell>
                                {run.totalEmployees || run.employees?.length || 0}
                              </TableCell>
                              <TableCell className="text-right">
                                {formatCurrency(
                                  run.netPay || run.grossPay || 0,
                                  currency,
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    statusVariantMap[run.status] || "outline"
                                  }
                                  className="capitalize"
                                >
                                  {run.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    onClick={() => handleSpecialPreview(run._id)}
                                    disabled={previewingSpecialId === run._id}
                                  >
                                    {previewingSpecialId === run._id ? (
                                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                    ) : (
                                      <FileText className="mr-1 h-3 w-3" />
                                    )}
                                    Preview
                                  </Button>
                                  {run.status === "draft" ||
                                    run.status === "calculated" ? (
                                    <Button
                                      size="xs"
                                      onClick={() => handleApproveSpecial(run._id)}
                                      disabled={
                                        !canWritePayroll ||
                                        processingSpecialId === `${run._id}-approve`
                                      }
                                    >
                                      {processingSpecialId ===
                                        `${run._id}-approve` ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : null}
                                      Aprobar
                                    </Button>
                                  ) : null}
                                  {run.status === "approved" ? (
                                    <Button
                                      size="xs"
                                      variant="secondary"
                                      onClick={() => handlePaySpecial(run._id)}
                                      disabled={
                                        !canWritePayroll ||
                                        processingSpecialId === `${run._id}-pay`
                                      }
                                    >
                                      {processingSpecialId === `${run._id}-pay` ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : null}
                                      Pagar
                                    </Button>
                                  ) : null}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                  {specialPreview ? (
                    <Alert>
                      <FileText className="h-4 w-4" />
                      <AlertTitle>Preview contable</AlertTitle>
                      <AlertDescription>
                        Débito:{" "}
                        {formatCurrency(
                          specialPreview.totals?.debit || 0,
                          currency,
                        )}{" "}
                        ({specialPreview.entries?.[0]?.debitAccount || "—"}) ·
                        Crédito:{" "}
                        {formatCurrency(
                          specialPreview.totals?.credit || 0,
                          currency,
                        )}{" "}
                        ({specialPreview.entries?.[0]?.creditAccount || "—"}) —{" "}
                        {specialPreview.entries?.[0]?.conceptName || "—"}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="liquidations" className="mt-0">
              <Card>
                <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle>Liquidaciones VE</CardTitle>
                    <CardDescription>
                      Configura cuentas y ejecuta liquidaciones con las reglas
                      vigentes.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLiquidationRules}
                      disabled={loadingLiquidationRules}
                    >
                      {loadingLiquidationRules ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Reglas
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadLiquidationRuns}
                      disabled={loadingLiquidationRuns}
                    >
                      {loadingLiquidationRuns ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Runs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border p-3 space-y-3">
                    <p className="text-sm font-medium">
                      Cuentas contables y parámetros
                    </p>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Días/año</Label>
                        <Input
                          type="number"
                          value={liquidationRuleForm.daysPerYear}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              daysPerYear: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Días mínimos</Label>
                        <Input
                          type="number"
                          value={liquidationRuleForm.minDaysPerYear}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              minDaysPerYear: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Factor integral</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={liquidationRuleForm.integralSalaryFactor}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              integralSalaryFactor: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Días vacaciones</Label>
                        <Input
                          type="number"
                          value={liquidationRuleForm.vacationDays}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              vacationDays: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Días utilidades</Label>
                        <Input
                          type="number"
                          value={liquidationRuleForm.utilitiesDays}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              utilitiesDays: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Débito prestaciones</Label>
                        <Input
                          value={liquidationRuleForm.accounts.severanceDebit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                severanceDebit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Crédito prestaciones</Label>
                        <Input
                          value={liquidationRuleForm.accounts.severanceCredit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                severanceCredit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          size="sm"
                          onClick={handleCreateLiquidationRule}
                          disabled={creatingLiquidationRule}
                        >
                          {creatingLiquidationRule ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-2 h-4 w-4" />
                          )}
                          Guardar regla VE
                        </Button>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Débito vacaciones</Label>
                        <Input
                          value={liquidationRuleForm.accounts.vacationDebit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                vacationDebit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Crédito vacaciones</Label>
                        <Input
                          value={liquidationRuleForm.accounts.vacationCredit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                vacationCredit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Débito utilidades</Label>
                        <Input
                          value={liquidationRuleForm.accounts.utilitiesDebit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                utilitiesDebit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label>Crédito utilidades</Label>
                        <Input
                          value={liquidationRuleForm.accounts.utilitiesCredit || ""}
                          onChange={(e) =>
                            setLiquidationRuleForm((prev) => ({
                              ...prev,
                              accounts: {
                                ...prev.accounts,
                                utilitiesCredit: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-md border p-3 space-y-3">
                    <p className="text-sm font-medium">Ejecutar liquidación VE</p>
                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <Label>Regla</Label>
                        <Select
                          value={liquidationRunForm.ruleSetId}
                          onValueChange={(value) =>
                            setLiquidationRunForm((prev) => ({
                              ...prev,
                              ruleSetId: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona regla" />
                          </SelectTrigger>
                          <SelectContent>
                            {liquidationRules.map((rule) => (
                              <SelectItem key={rule._id} value={rule._id}>
                                {rule.country} · v{rule.version}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Etiqueta</Label>
                        <Input
                          value={liquidationRunForm.label || ""}
                          onChange={(e) =>
                            setLiquidationRunForm((prev) => ({
                              ...prev,
                              label: e.target.value,
                            }))
                          }
                          placeholder="Liquidación masiva"
                        />
                      </div>
                      <div>
                        <Label>Fecha terminación</Label>
                        <Input
                          type="date"
                          value={liquidationRunForm.terminationDate || ""}
                          onChange={(e) =>
                            setLiquidationRunForm((prev) => ({
                              ...prev,
                              terminationDate: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateLiquidationRun}
                        disabled={creatingLiquidationRun}
                      >
                        {creatingLiquidationRun ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <BarChart3 className="mr-2 h-4 w-4" />
                        )}
                        Crear y calcular
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={loadLiquidationRuns}
                        disabled={loadingLiquidationRuns}
                      >
                        {loadingLiquidationRuns ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        Refrescar runs
                      </Button>
                    </div>
                    {liquidationRuns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Sin liquidaciones.
                      </p>
                    ) : (
                      <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Etiqueta</TableHead>
                              <TableHead>Estado</TableHead>
                              <TableHead className="text-right">Neto</TableHead>
                              <TableHead>Acciones</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {liquidationRuns.map((run) => (
                              <TableRow key={run._id}>
                                <TableCell>{run.label || run._id}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      statusVariantMap[run.status] || "outline"
                                    }
                                    className="capitalize"
                                  >
                                    {run.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(run.netPayable || 0, currency)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex flex-wrap gap-2">
                                    <Button
                                      size="xs"
                                      variant="ghost"
                                      onClick={() =>
                                        handlePreviewLiquidationRun(run._id)
                                      }
                                      disabled={previewingLiquidationId === run._id}
                                    >
                                      {previewingLiquidationId === run._id ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : (
                                        <FileText className="mr-1 h-3 w-3" />
                                      )}
                                      Preview
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() =>
                                        handleExportLiquidationRun(run._id, "csv")
                                      }
                                      disabled={
                                        exportingLiquidationId === `${run._id}-csv`
                                      }
                                    >
                                      {exportingLiquidationId ===
                                        `${run._id}-csv` ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : (
                                        <Download className="mr-1 h-3 w-3" />
                                      )}
                                      CSV
                                    </Button>
                                    <Button
                                      size="xs"
                                      variant="outline"
                                      onClick={() =>
                                        handleExportLiquidationRun(run._id, "pdf")
                                      }
                                      disabled={
                                        exportingLiquidationId === `${run._id}-pdf`
                                      }
                                    >
                                      {exportingLiquidationId ===
                                        `${run._id}-pdf` ? (
                                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                      ) : (
                                        <Download className="mr-1 h-3 w-3" />
                                      )}
                                      PDF
                                    </Button>
                                    {run.status === "calculated" ||
                                      run.status === "draft" ? (
                                      <Button
                                        size="xs"
                                        onClick={() =>
                                          handleApproveLiquidationRun(run._id)
                                        }
                                        disabled={
                                          !canWritePayroll ||
                                          processingLiquidationId ===
                                          `${run._id}-approve`
                                        }
                                      >
                                        {processingLiquidationId ===
                                          `${run._id}-approve` ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : null}
                                        Aprobar
                                      </Button>
                                    ) : null}
                                    {run.status === "approved" ? (
                                      <Button
                                        size="xs"
                                        variant="secondary"
                                        onClick={() =>
                                          handlePayLiquidationRun(run._id)
                                        }
                                        disabled={
                                          !canWritePayroll ||
                                          processingLiquidationId ===
                                          `${run._id}-pay`
                                        }
                                      >
                                        {processingLiquidationId ===
                                          `${run._id}-pay` ? (
                                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                        ) : null}
                                        Pagar
                                      </Button>
                                    ) : null}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                    {liquidationPreview ? (
                      <Alert>
                        <FileText className="h-4 w-4" />
                        <AlertTitle>Preview contable</AlertTitle>
                        <AlertDescription>
                          Débito:{" "}
                          {formatCurrency(
                            liquidationPreview.totals?.debit || 0,
                            currency,
                          )}{" "}
                          (
                          {liquidationPreview.debitAccount ||
                            liquidationPreview.entries?.[0]?.debitAccount ||
                            "—"}
                          ) · Crédito:{" "}
                          {formatCurrency(
                            liquidationPreview.totals?.credit || 0,
                            currency,
                          )}{" "}
                          (
                          {liquidationPreview.creditAccount ||
                            liquidationPreview.entries?.[0]?.creditAccount ||
                            "—"}
                          ) —{" "}
                          {liquidationPreview.runLabel ||
                            liquidationPreview.entries?.[0]?.conceptName ||
                            "Liquidación"}
                        </AlertDescription>
                      </Alert>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <Card className="mt-6">
            <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Reporting de nómina</CardTitle>
                <CardDescription>KPIs, costos y ausentismo filtrados por fecha y departamento.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={reportFilters.from || ""}
                  onChange={(e) => setReportFilters((p) => ({ ...p, from: e.target.value }))}
                  className="w-36"
                  placeholder="Desde"
                />
                <Input
                  type="date"
                  value={reportFilters.to || ""}
                  onChange={(e) => setReportFilters((p) => ({ ...p, to: e.target.value }))}
                  className="w-36"
                  placeholder="Hasta"
                />
                <Input
                  value={reportFilters.department || ""}
                  onChange={(e) => setReportFilters((p) => ({ ...p, department: e.target.value }))}
                  className="w-36"
                  placeholder="Departamento"
                />
                <Input
                  value={reportFilters.structureId || ""}
                  onChange={(e) => setReportFilters((p) => ({ ...p, structureId: e.target.value }))}
                  className="w-40"
                  placeholder="Estructura"
                />
                <Button onClick={loadReports} disabled={loadingReports} variant="outline">
                  {loadingReports ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Actualizar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-4">
                <KpiCard label="Costo bruto" value={reportSummary?.totals?.grossPay || 0} currency={currency} />
                <KpiCard label="Deducciones" value={reportSummary?.totals?.deductions || 0} currency={currency} />
                <KpiCard label="Aportes patronales" value={reportSummary?.totals?.employerCosts || 0} currency={currency} />
                <KpiCard label="Empleados" value={reportSummary?.totals?.employees || 0} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <div>
                      <div className="text-sm font-semibold">Costos por departamento</div>
                      <div className="text-xs text-muted-foreground">Bruto, deducciones, patronal</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Depto</TableHead>
                        <TableHead>Bruto</TableHead>
                        <TableHead>Deducciones</TableHead>
                        <TableHead>Patronal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reportSummary?.byDepartment || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-sm text-muted-foreground text-center">
                            Sin datos
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportSummary.byDepartment.map((row) => (
                          <TableRow key={row.department}>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{formatCurrency(row.grossPay, currency)}</TableCell>
                            <TableCell>{formatCurrency(row.deductions, currency)}</TableCell>
                            <TableCell>{formatCurrency(row.employerCosts, currency)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border">
                  <div className="flex items-center justify-between border-b px-4 py-2">
                    <div>
                      <div className="text-sm font-semibold">Top deducciones/aportes</div>
                      <div className="text-xs text-muted-foreground">Conceptos con mayor impacto</div>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Concepto</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(reportDeductions?.concepts || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-sm text-muted-foreground text-center">
                            Sin datos
                          </TableCell>
                        </TableRow>
                      ) : (
                        reportDeductions.concepts.map((c) => (
                          <TableRow key={c._id}>
                            <TableCell>{c.conceptName || c._id}</TableCell>
                            <TableCell className="capitalize">{c.conceptType}</TableCell>
                            <TableCell>{formatCurrency(c.total, currency)}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div>
                      <div className="text-sm font-semibold">Tendencia de costos</div>
                      <div className="text-xs text-muted-foreground">Bruto vs. Neto</div>
                    </div>
                  </div>
                  <ChartContainer
                    className="h-72"
                    config={{
                      grossPay: { label: "Bruto", color: "hsl(var(--primary))" },
                      netPay: { label: "Neto", color: "hsl(var(--chart-2, 200 80% 50%))" },
                    }}
                  >
                    <LineChart data={reportSummary?.series || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="periodEnd" tickFormatter={(v) => formatDate(v)} />
                      <YAxis />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Line type="monotone" dataKey="grossPay" stroke="var(--color-grossPay)" dot={false} />
                      <Line type="monotone" dataKey="netPay" stroke="var(--color-netPay)" dot={false} />
                    </LineChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-md border p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div>
                      <div className="text-sm font-semibold">Distribución de deducciones/aportes</div>
                      <div className="text-xs text-muted-foreground">Top conceptos</div>
                    </div>
                  </div>
                  <ChartContainer
                    className="h-72"
                    config={{
                      total: { label: "Total", color: "hsl(var(--primary))" },
                    }}
                  >
                    <PieChart>
                      <Pie
                        data={reportDeductions?.concepts || []}
                        dataKey="total"
                        nameKey="conceptName"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.conceptName || entry._id}
                      >
                        {(reportDeductions?.concepts || []).map((_, idx) => (
                          <Cell key={idx} fill="var(--color-total)" opacity={1 - idx * 0.05} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<ChartTooltipContent />} />
                    </PieChart>
                  </ChartContainer>
                </div>

                <div className="rounded-md border p-2">
                  <div className="flex items-center justify-between px-2 pb-2">
                    <div>
                      <div className="text-sm font-semibold">Serie por departamento</div>
                      <div className="text-xs text-muted-foreground">Bruto + deducciones + patronal</div>
                    </div>
                  </div>
                  <ChartContainer
                    className="h-72"
                    config={{
                      grossPay: { label: "Bruto", color: "hsl(var(--primary))" },
                      deductions: { label: "Deducciones", color: "hsl(var(--chart-3, 280 70% 50%))" },
                      employerCosts: { label: "Patronal", color: "hsl(var(--chart-4, 140 70% 45%))" },
                    }}
                  >
                    <BarChart data={reportSummary?.byDepartment || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <RechartsTooltip content={<ChartTooltipContent />} />
                      <Legend content={<ChartLegendContent />} />
                      <Bar dataKey="grossPay" stackId="a" fill="var(--color-grossPay)" />
                      <Bar dataKey="deductions" stackId="a" fill="var(--color-deductions)" />
                      <Bar dataKey="employerCosts" stackId="a" fill="var(--color-employerCosts)" />
                    </BarChart>
                  </ChartContainer>
                </div>
              </div>

              <div className="rounded-md border">
                <div className="flex items-center justify-between border-b px-4 py-2">
                  <div>
                    <div className="text-sm font-semibold">Ausentismo</div>
                    <div className="text-xs text-muted-foreground">
                      Solicitudes aprobadas: {reportAbsenteeism?.totals?.totalRequests || 0} · Días: {reportAbsenteeism?.totals?.totalDays || 0}
                    </div>
                  </div>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Días</TableHead>
                      <TableHead>Solicitudes</TableHead>
                      <TableHead>Tipos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reportAbsenteeism?.byEmployee || []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                          Sin registros de ausencias
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportAbsenteeism.byEmployee.map((emp) => (
                        <TableRow key={emp.employeeId}>
                          <TableCell>{emp.employeeName}</TableCell>
                          <TableCell>{emp.totalDays}</TableCell>
                          <TableCell>{emp.requests}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {Object.entries(emp.leaveTypes || {})
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Auditoría de nómina</CardTitle>
                <CardDescription>Eventos y cambios en runs, conceptos y estructuras.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Entidad (run/concept/structure)"
                  value={auditFilters.entity || ""}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, entity: e.target.value }))}
                  className="w-52"
                />
                <Input
                  placeholder="ID entidad"
                  value={auditFilters.entityId || ""}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, entityId: e.target.value }))}
                  className="w-48"
                />
                <Input
                  type="date"
                  value={auditFilters.from || ""}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, from: e.target.value }))}
                  className="w-36"
                />
                <Input
                  type="date"
                  value={auditFilters.to || ""}
                  onChange={(e) => setAuditFilters((p) => ({ ...p, to: e.target.value }))}
                  className="w-36"
                />
                <Button variant="outline" onClick={loadAuditLogsGlobal} disabled={loadingAudit}>
                  {loadingAudit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  Filtrar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Detalle</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingAudit ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center">
                          <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                        </TableCell>
                      </TableRow>
                    ) : auditLogs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                          Sin eventos de auditoría
                        </TableCell>
                      </TableRow>
                    ) : (
                      auditLogs.map((log) => (
                        <TableRow key={log._id || `${log.entity}-${log.createdAt}`}>
                          <TableCell className="text-xs text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs">
                            {log.entity} {log.entityId ? `(${log.entityId})` : ""}
                          </TableCell>
                          <TableCell className="text-xs capitalize">{log.action}</TableCell>
                          <TableCell className="text-xs">
                            {(log.userId && log.userId.toString()) || "SYSTEM"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {log.before || log.after
                              ? JSON.stringify({ before: log.before, after: log.after })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>Localización de nómina (VE)</CardTitle>
                <CardDescription>
                  Selecciona el paquete activo y revisa las tasas vigentes.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadLocalizations}
                  disabled={loadingLocalizations}
                >
                  {loadingLocalizations ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Recargar
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setImportDialogOpen(true)}
                >
                  Importar CSV/JSON
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={!activeLocalizationId || activatingLocalization}
                  onClick={async () => {
                    if (!activeLocalizationId) return;
                    setActivatingLocalization(true);
                    try {
                      await handleActivateLocalization(activeLocalizationId);
                    } finally {
                      setActivatingLocalization(false);
                    }
                  }}
                >
                  {activatingLocalization ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Activar versión seleccionada
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-4">
                <div>
                  <Label>País</Label>
                  <Input value="VE" disabled />
                </div>
                <div>
                  <Label>Versión activa</Label>
                  <Select
                    value={activeLocalizationId || ""}
                    onValueChange={(val) => setActiveLocalizationId(val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona versión" />
                    </SelectTrigger>
                    <SelectContent>
                      {localizations.map((loc) => (
                        <SelectItem key={loc._id} value={loc._id}>
                          {loc.label || "Sin etiqueta"} · v{loc.version || 1} ·{" "}
                          {loc.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Etiqueta</Label>
                  <Input
                    value={localizationForm.label || ""}
                    onChange={(e) =>
                      setLocalizationForm((prev) => ({
                        ...prev,
                        label: e.target.value,
                      }))
                    }
                    placeholder="Tasas vigentes"
                  />
                </div>
                <div>
                  <Label>Versión</Label>
                  <Input
                    type="number"
                    value={localizationForm.version || ""}
                    onChange={(e) =>
                      setLocalizationForm((prev) => ({
                        ...prev,
                        version: e.target.value,
                      }))
                    }
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Vigente desde</Label>
                  <Input
                    type="date"
                    value={localizationForm.validFrom || ""}
                    onChange={(e) =>
                      setLocalizationForm((prev) => ({
                        ...prev,
                        validFrom: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tasas (JSON)</Label>
                <Textarea
                  rows={4}
                  value={localizationForm.ratesText || ""}
                  onChange={(e) =>
                    setLocalizationForm((prev) => ({
                      ...prev,
                      ratesText: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleCreateLocalization}
                  disabled={creatingLocalization}
                >
                  {creatingLocalization ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Crear versión
                </Button>
              </div>
              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">VE</Badge>
                  <Badge variant="outline">
                    {localizations.find((l) => l._id === activeLocalizationId)
                      ? `v${localizations.find((l) => l._id === activeLocalizationId)?.version || 1}`
                      : "sin selección"}
                  </Badge>
                  <Badge
                    variant={
                      localizations.find((l) => l._id === activeLocalizationId)
                        ?.status === "active"
                        ? "default"
                        : "outline"
                    }
                  >
                    {localizations.find((l) => l._id === activeLocalizationId)?.status || "—"}
                  </Badge>
                  <span className="text-muted-foreground">
                    Tasas activas y vigencia.
                  </span>
                </div>
                <pre className="mt-2 overflow-auto rounded bg-background p-3 text-xs">
                  {JSON.stringify(
                    localizations.find((l) => l._id === activeLocalizationId)
                      ?.rates || {},
                    null,
                    2,
                  )}
                </pre>
              </div>
              {localizations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin paquetes todavía.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>País</TableHead>
                        <TableHead>Versión</TableHead>
                        <TableHead>Etiqueta</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Vigencia</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {localizations.map((loc) => (
                        <TableRow key={loc._id}>
                          <TableCell>{loc.country}</TableCell>
                          <TableCell>{loc.version || 1}</TableCell>
                          <TableCell>{loc.label || "Sin nombre"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                loc.status === "active" ? "default" : "outline"
                              }
                              className="capitalize"
                            >
                              {loc.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {loc.validFrom ? formatDate(loc.validFrom) : "N/D"}
                            {loc.validTo ? ` → ${formatDate(loc.validTo)}` : ""}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {loc.status !== "pending" && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => handleSubmitLocalization(loc._id)}
                                  disabled={
                                    submittingLocalizationId === loc._id ||
                                    !canWritePayroll
                                  }
                                >
                                  {submittingLocalizationId === loc._id ? (
                                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  ) : null}
                                  Enviar a aprobación
                                </Button>
                              )}
                              <Button
                                size="xs"
                                variant="outline"
                                onClick={() => handleActivateLocalization(loc._id)}
                                disabled={
                                  !canWritePayroll || loc.status === "active"
                                }
                              >
                                Activar
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setActiveLocalizationId(loc._id)}
                              >
                                Historial / tasas
                              </Button>
                              <Button
                                size="xs"
                                variant="ghost"
                                onClick={() => setViewLocalization(loc)}
                              >
                                Ver tasas
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Integraciones externas (Webhooks)</CardTitle>
                <CardDescription>Configura endpoint, secreto y prueba el envío de eventos de nómina.</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={webhookConfig.enabled}
                  onCheckedChange={(val) =>
                    setWebhookConfig((prev) => ({ ...prev, enabled: val }))
                  }
                />
                <span className="text-sm text-muted-foreground">
                  {webhookConfig.enabled ? "Habilitado" : "Deshabilitado"}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Endpoint</Label>
                  <Input
                    value={webhookConfig.endpointUrl || ""}
                    onChange={(e) =>
                      setWebhookConfig((prev) => ({
                        ...prev,
                        endpointUrl: e.target.value,
                      }))
                    }
                    placeholder="https://mi-app.com/webhooks/payroll"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secreto (HMAC)</Label>
                  <Input
                    value={webhookConfig.secret || ""}
                    onChange={(e) =>
                      setWebhookConfig((prev) => ({ ...prev, secret: e.target.value }))
                    }
                    placeholder="secreto para firma"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reintentos</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={webhookConfig.maxRetries || ""}
                    onChange={(e) =>
                      setWebhookConfig((prev) => ({
                        ...prev,
                        maxRetries: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Delay entre reintentos (ms)</Label>
                  <Input
                    type="number"
                    min={500}
                    step={100}
                    value={webhookConfig.retryDelayMs || ""}
                    onChange={(e) =>
                      setWebhookConfig((prev) => ({
                        ...prev,
                        retryDelayMs: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleSaveWebhook}
                  disabled={savingWebhook || loadingWebhook}
                >
                  {savingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Guardar
                </Button>
                <Button
                  variant="outline"
                  onClick={handleTestWebhook}
                  disabled={testingWebhook || loadingWebhook}
                >
                  {testingWebhook ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Enviar prueba
                </Button>
              </div>
            </CardContent>
          </Card>
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Importar tasas (VE)</DialogTitle>
                <DialogDescription>
                  Sube un archivo CSV (clave,valor) o JSON con el objeto de tasas. Solo aplica a Venezuela.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Input
                  type="file"
                  accept=".csv, text/csv, application/json, .json"
                  onChange={(e) => handleImportFile(e.target.files?.[0])}
                />
                <Textarea
                  rows={6}
                  placeholder="O pega aquí JSON/CSV"
                  onChange={(e) => {
                    const text = e.target.value;
                    const isCsv = text.includes(",") && !text.trim().startsWith("{");
                    const result = isCsv ? parseRatesCsv(text) : parseRatesJson(text);
                    setImportPreview(result.data);
                    setImportErrors(result.errors || []);
                    setImportFileName(isCsv ? "pasted.csv" : "pasted.json");
                  }}
                />
                {importErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTitle>Errores</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-4">
                        {importErrors.map((err) => (
                          <li key={err}>{err}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
                {importPreview && (
                  <div className="rounded-md border bg-muted/40 p-3">
                    <div className="text-sm text-muted-foreground mb-2">
                      Vista previa ({importFileName || "sin nombre"})
                    </div>
                    <pre className="max-h-64 overflow-auto text-xs">
                      {JSON.stringify(importPreview, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={!importPreview || importErrors.length > 0 || creatingLocalization}
                >
                  {creatingLocalization ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Crear versión
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      <Dialog open={!!viewLocalization} onOpenChange={(open) => !open && setViewLocalization(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              Tasas versión {viewLocalization?.version || "—"} ({viewLocalization?.label || "Sin etiqueta"})
            </DialogTitle>
            <DialogDescription>
              Vigente desde {viewLocalization?.validFrom ? formatDate(viewLocalization.validFrom) : "N/D"}
              {viewLocalization?.validTo ? ` hasta ${formatDate(viewLocalization.validTo)}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground">
              <Badge variant="outline">VE</Badge>
              <Badge variant="outline">v{viewLocalization?.version || 1}</Badge>
              <Badge variant={viewLocalization?.status === "active" ? "default" : "outline"}>
                {viewLocalization?.status}
              </Badge>
            </div>
            <pre className="mt-3 max-h-[60vh] overflow-auto rounded bg-background p-3 text-xs">
              {JSON.stringify(viewLocalization?.rates || {}, null, 2)}
            </pre>
            {Array.isArray(viewLocalization?.islrTable) && viewLocalization.islrTable.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold mb-1">Tabla ISLR</div>
                <pre className="max-h-56 overflow-auto rounded bg-background p-2 text-xs">
                  {JSON.stringify(viewLocalization.islrTable, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewLocalization(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Nuevo ciclo de nómina</DialogTitle>
            <DialogDescription>
              Define las fechas y, si lo necesitas, genera una simulación en
              tiempo real.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Frecuencia</Label>
              <Select
                value={newRunForm.periodType}
                onValueChange={(value) =>
                  setNewRunForm((prev) => ({ ...prev, periodType: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_FILTERS.filter(
                    (option) => option.value !== "all",
                  ).map((option) => (
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
                <Input
                  type="date"
                  value={newRunForm.periodStart || ""}
                  onChange={(event) =>
                    setNewRunForm((prev) => ({
                      ...prev,
                      periodStart: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label>Fin</Label>
                <Input
                  type="date"
                  value={newRunForm.periodEnd || ""}
                  onChange={(event) =>
                    setNewRunForm((prev) => ({
                      ...prev,
                      periodEnd: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Etiqueta</Label>
              <Input
                placeholder="Ej. Nómina marzo"
                value={newRunForm.label || ""}
                onChange={(event) =>
                  setNewRunForm((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Simulación</p>
                <p className="text-xs text-muted-foreground">
                  Calcula sin generar asientos contables ni afectar reportes.
                </p>
              </div>
              <Switch
                checked={newRunForm.dryRun}
                onCheckedChange={(checked) =>
                  setNewRunForm((prev) => ({ ...prev, dryRun: checked }))
                }
              />
            </div>
          </div>
          <DialogFooter className="sm:space-x-0 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creatingRun}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateRun}
              disabled={creatingRun}
            >
              {creatingRun ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="mr-2 h-4 w-4" />
              )}
              {newRunForm.dryRun ? "Simular" : "Crear nómina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Pagar nómina</DialogTitle>
            <DialogDescription>
              Confirma método, moneda e IGTF. Se pagarán los payables generados
              al aprobar esta nómina.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label>Método</Label>
                <Select
                  value={payMethod.method}
                  onValueChange={(value) =>
                    setPayMethod((prev) => ({
                      ...prev,
                      method: value,
                    }))
                  }
                  disabled={paying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedBankAccount?.acceptedPaymentMethods?.length
                      ? selectedBankAccount.acceptedPaymentMethods
                      : ["transfer", "pago-movil", "zelle", "cash", "other"]
                    ).map((method) => (
                      <SelectItem key={method} value={method}>
                        {method === "transfer"
                          ? "Transferencia"
                          : method === "pago-movil"
                            ? "Pago Móvil"
                            : method === "zelle"
                              ? "Zelle"
                              : method === "cash"
                                ? "Efectivo"
                                : method === "other"
                                  ? "Otro"
                                  : method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Moneda</Label>
                <Select
                  value={payMethod.currency}
                  onValueChange={(value) =>
                    setPayMethod((prev) => ({ ...prev, currency: value }))
                  }
                  disabled={paying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Moneda" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="VES">VES</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>IGTF</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={payMethod.igtf}
                    onCheckedChange={(checked) =>
                      setPayMethod((prev) => ({ ...prev, igtf: checked }))
                    }
                    disabled={paying}
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payMethod.igtfRate}
                    onChange={(e) =>
                      setPayMethod((prev) => ({
                        ...prev,
                        igtfRate: parseFloat(e.target.value || "0") || 0,
                      }))
                    }
                    disabled={!payMethod.igtf || paying}
                  />
                  <span className="text-xs text-muted-foreground">tasa</span>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <div>
                <Label>Cuenta bancaria</Label>
                <Select
                  value={bankAccountId}
                  onValueChange={(value) => setBankAccountId(value)}
                  disabled={paying}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona cuenta" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((account) => (
                      <SelectItem key={account._id} value={account._id}>
                        {account.bankName || "Banco"} ·{" "}
                        {account.accountNumber || account.alias || ""} ·{" "}
                        {account.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referencia</Label>
                <Input
                  value={payMethod.reference}
                  onChange={(e) =>
                    setPayMethod((prev) => ({
                      ...prev,
                      reference: e.target.value,
                    }))
                  }
                  disabled={paying}
                  placeholder="N° de referencia"
                />
              </div>
            </div>
            <div className="rounded-md border p-3 text-sm text-muted-foreground space-y-1">
              <div>
                Run: {selectedRun?.label || "N/A"} (
                {formatDate(selectedRun?.periodStart)} -{" "}
                {formatDate(selectedRun?.periodEnd)})
              </div>
              <div>
                Neto: {formatCurrency(selectedRun?.netPay || 0, currency)}
              </div>
              {payMethod.igtf ? (
                <div>
                  IGTF ({(payMethod.igtfRate * 100).toFixed(2)}%):{" "}
                  {formatCurrency(
                    (selectedRun?.netPay || 0) * payMethod.igtfRate,
                    currency,
                  )}
                </div>
              ) : null}
              <div className="font-semibold">
                Total a pagar:{" "}
                {formatCurrency(
                  (selectedRun?.netPay || 0) *
                  (payMethod.igtf ? 1 + payMethod.igtfRate : 1),
                  currency,
                )}
              </div>
              {payMethod.currency === "VES" && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-2 dark:border-blue-800 dark:bg-blue-950 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Tasa BCV:</span>
                    <span className="font-medium">
                      {loadingBcvRate
                        ? "Cargando..."
                        : bcvRate
                          ? `Bs. ${bcvRate.toFixed(2)} / USD`
                          : "No disponible"}
                    </span>
                  </div>
                  {bcvRate && (
                    <div className="flex justify-between text-sm font-semibold text-blue-700 dark:text-blue-300">
                      <span>Total en Bs.:</span>
                      <span>
                        Bs.{" "}
                        {(
                          (selectedRun?.netPay || 0) *
                          (payMethod.igtf ? 1 + payMethod.igtfRate : 1) *
                          bcvRate
                        ).toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {selectedBankAccount ? (
                <div>
                  Cuenta: {selectedBankAccount.bankName} ·{" "}
                  {selectedBankAccount.accountNumber} (
                  {selectedBankAccount.currency}){" "}
                  {selectedBankAccount.isActive ? "" : "(Inactiva)"}
                </div>
              ) : (
                <div>Selecciona una cuenta bancaria</div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPayDialogOpen(false)}
              disabled={paying}
            >
              Cancelar
            </Button>
            <Button
              onClick={handlePayRun}
              disabled={
                paying || selectedRun?.status !== "approved" || !canWritePayroll
              }
            >
              {paying ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Drawer
        open={detailDrawerOpen}
        onOpenChange={(open) =>
          open ? setDetailDrawerOpen(true) : closeDetail()
        }
      >
        <DrawerContent className="max-h-[92vh]">
          <DrawerHeader className="space-y-1 border-b">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <DrawerTitle>
                  {selectedRun?.label || "Detalle de nómina"}
                </DrawerTitle>
                <DrawerDescription>
                  {formatDate(selectedRun?.periodStart)} -{" "}
                  {formatDate(selectedRun?.periodEnd)} ·{" "}
                  {selectedRun?.totalEmployees || 0} empleados
                </DrawerDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => shareByEmail(selectedRun)}
                  disabled={!selectedRun}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Compartir
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => downloadRun(selectedRun?._id, "pdf")}
                  disabled={
                    !selectedRun ||
                    exportingRunKey === `${selectedRun?._id}-pdf`
                  }
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
          <div className="grid gap-4 p-4 overflow-y-auto flex-1">
            {detailLoading ? (
              <div className="flex h-48 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedRun ? (
              <div className="min-h-[200px] text-center text-sm text-muted-foreground">
                Selecciona una nómina para ver detalles.
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Estado
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Badge
                        variant={
                          statusVariantMap[selectedRun.status] || "outline"
                        }
                        className="capitalize"
                      >
                        {selectedRun.status}
                      </Badge>
                      {selectedRun.metadata?.dryRun && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Simulación (no genera asientos)
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Pago
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Método</Label>
                          <Input
                            value={payMethod.method}
                            onChange={(e) =>
                              setPayMethod((prev) => ({
                                ...prev,
                                method: e.target.value,
                              }))
                            }
                            placeholder="transfer"
                            disabled={paying}
                          />
                        </div>
                        <div>
                          <Label>Moneda</Label>
                          <Select
                            value={payMethod.currency}
                            onValueChange={(value) =>
                              setPayMethod((prev) => ({
                                ...prev,
                                currency: value,
                              }))
                            }
                            disabled={paying}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Moneda" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="VES">VES</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>IGTF</Label>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={payMethod.igtf}
                              onCheckedChange={(checked) =>
                                setPayMethod((prev) => ({
                                  ...prev,
                                  igtf: checked,
                                }))
                              }
                              disabled={paying}
                            />
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={payMethod.igtfRate}
                              onChange={(e) =>
                                setPayMethod((prev) => ({
                                  ...prev,
                                  igtfRate:
                                    parseFloat(e.target.value || "0") || 0,
                                }))
                              }
                              disabled={!payMethod.igtf || paying}
                            />
                            <span className="text-xs text-muted-foreground">
                              tasa
                            </span>
                          </div>
                        </div>
                        <div className="col-span-2">
                          <Label>Cuenta bancaria</Label>
                          <Select
                            value={bankAccountId}
                            onValueChange={(value) => setBankAccountId(value)}
                            disabled={paying}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona cuenta" />
                            </SelectTrigger>
                            <SelectContent>
                              {bankAccounts.map((account) => (
                                <SelectItem
                                  key={account._id}
                                  value={account._id}
                                >
                                  {account.bankName || "Banco"} ·{" "}
                                  {account.accountNumber || account.alias || ""}{" "}
                                  · {account.currency}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>
                          Neto:{" "}
                          {formatCurrency(selectedRun.netPay || 0, currency)}
                        </div>
                        {payMethod.igtf ? (
                          <div>
                            IGTF ({(payMethod.igtfRate * 100).toFixed(2)}%):{" "}
                            {formatCurrency(
                              (selectedRun.netPay || 0) * payMethod.igtfRate,
                              currency,
                            )}
                          </div>
                        ) : null}
                        <div className="font-semibold">
                          Total a pagar:{" "}
                          {formatCurrency(
                            (selectedRun.netPay || 0) *
                            (payMethod.igtf ? 1 + payMethod.igtfRate : 1),
                            currency,
                          )}
                        </div>
                        {payMethod.currency === "VES" && (
                          <div className="rounded border border-blue-200 bg-blue-50 p-1.5 dark:border-blue-800 dark:bg-blue-950 space-y-0.5">
                            <div className="flex justify-between">
                              <span>Tasa BCV:</span>
                              <span className="font-medium">
                                {loadingBcvRate
                                  ? "Cargando..."
                                  : bcvRate
                                    ? `Bs. ${bcvRate.toFixed(2)}`
                                    : "No disponible"}
                              </span>
                            </div>
                            {bcvRate && (
                              <div className="flex justify-between font-semibold text-blue-700 dark:text-blue-300">
                                <span>Total Bs.:</span>
                                <span>
                                  Bs.{" "}
                                  {(
                                    (selectedRun.netPay || 0) *
                                    (payMethod.igtf ? 1 + payMethod.igtfRate : 1) *
                                    bcvRate
                                  ).toLocaleString("es-VE", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                        {selectedBankAccount ? (
                          <div>
                            Cuenta: {selectedBankAccount.bankName} ·{" "}
                            {selectedBankAccount.accountNumber} (
                            {selectedBankAccount.currency}){" "}
                            {selectedBankAccount.isActive ? "" : "(Inactiva)"}
                          </div>
                        ) : (
                          <div>Selecciona una cuenta bancaria</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedRun.status === "calculated" && (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={handleApproveRun}
                            disabled={approvingRun || !canWritePayroll}
                          >
                            {approvingRun ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="mr-2 h-4 w-4" />
                            )}
                            Aprobar nómina
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => setPayDialogOpen(true)}
                          disabled={
                            selectedRun.status !== "approved" ||
                            !canWritePayroll
                          }
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Pagar nómina
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleDownloadBankFile(
                              selectedRun._id,
                              "generic",
                              "csv",
                            )
                          }
                          disabled={
                            !selectedRun?._id ||
                            exportingRunKey === `${selectedRun._id}-bank-csv`
                          }
                        >
                          {exportingRunKey === `${selectedRun._id}-bank-csv` ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          Archivo bancario
                        </Button>
                      </div>
                      {selectedRun.status === "approved" ? (
                        <p className="text-xs text-muted-foreground">
                          Se usarán los payables agregados/por empleado
                          generados al aprobar. Asegura cuentas bancarias
                          activas.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Paga solo runs aprobadas.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Bruto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">
                        {formatCurrency(selectedRun.grossPay, currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Incluye bonos y ajustes.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Deducciones
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">
                        {formatCurrency(selectedRun.deductions, currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Impuestos, retenciones y préstamos.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Costo neto
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-xl font-semibold">
                        {formatCurrency(selectedRun.netPay, currency)}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Pagos al empleado.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Integración contable</CardTitle>
                      <CardDescription>
                        Seguimiento del asiento generado automáticamente.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRun.metadata?.journalEntryId ? (
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {selectedRun.metadata.journalEntryId}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              copyJournalEntry(
                                selectedRun.metadata?.journalEntryId,
                              )
                            }
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          En cuanto la nómina se contabilice verás aquí el
                          identificador del asiento.
                        </p>
                      )}
                      <Alert className="bg-muted/60">
                        <Bell className="h-4 w-4" />
                        <AlertTitle>Asignaciones por tipo</AlertTitle>
                        <AlertDescription>
                          {formatCurrency(entriesSummary.earning, currency)}{" "}
                          devengos ·{" "}
                          {formatCurrency(entriesSummary.deduction, currency)}{" "}
                          deducciones ·{" "}
                          {formatCurrency(entriesSummary.employer, currency)}{" "}
                          aportes patronales.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Cobertura por estructura</CardTitle>
                      <CardDescription>
                        Verifica qué estructuras se usaron al calcular la
                        nómina.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedRunStructureSummary ? (
                        <>
                          <div className="text-sm">
                            {selectedRunStructureSummary.coveragePercent || 0}%
                            de empleados con estructura (
                            {selectedRunStructureSummary.structuredEmployees ||
                              0}
                            /{selectedRunStructureSummary.totalEmployees || 0})
                          </div>
                          {selectedRunStructureSummary.legacyEmployees > 0 && (
                            <p className="text-xs text-amber-600">
                              {selectedRunStructureSummary.legacyEmployees}{" "}
                              empleado
                              {selectedRunStructureSummary.legacyEmployees === 1
                                ? ""
                                : "s"}{" "}
                              se calcularon con reglas legacy.
                            </p>
                          )}
                          {selectedRunStructureSummary.structures.length > 0 ? (
                            <div className="space-y-2">
                              {selectedRunStructureSummary.structures.map(
                                (structure) => (
                                  <div
                                    key={`${structure.structureId}-${structure.structureVersion || "latest"}`}
                                    className="flex flex-col gap-2 rounded-md border p-2 sm:flex-row sm:items-center sm:justify-between"
                                  >
                                    <div>
                                      <p className="text-sm font-medium">
                                        {structure.structureName ||
                                          "Estructura"}
                                        {structure.structureVersion
                                          ? ` · v${structure.structureVersion}`
                                          : ""}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {structure.employees} empleado
                                        {structure.employees === 1 ? "" : "s"} ·{" "}
                                        {formatStructureScope(structure)}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        openStructureBuilder(
                                          structure.structureId,
                                        )
                                      }
                                    >
                                      Ver estructura
                                    </Button>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Todos los empleados se calcularon sin estructuras
                              asignadas.
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Esta nómina se generó antes de capturar la información
                          de estructuras.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Bitácora</CardTitle>
                      <CardDescription>
                        Auditoría completa de cambios y cálculos.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {auditLoading ? (
                        <div className="flex h-40 items-center justify-center">
                          <Loader2 className="h-5 w-5 animate-spin" />
                        </div>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Sin movimientos registrados.
                        </p>
                      ) : (
                        <ScrollArea className="h-48">
                          <div className="space-y-3">
                            {auditLogs.map((log) => (
                              <div
                                key={
                                  log._id || `${log.action}-${log.createdAt}`
                                }
                                className="rounded-md border p-3"
                              >
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                  <span className="font-medium capitalize">
                                    {log.action}
                                  </span>
                                  <span>{formatDateTime(log.createdAt)}</span>
                                </div>
                                {log.metadata?.note && (
                                  <p className="mt-1 text-sm">
                                    {log.metadata.note}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Variación & provisiones</CardTitle>
                      <CardDescription>
                        Control rápido de gasto vs período previo y aportes
                        patronales.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge
                          variant={
                            Math.abs(variationPct) > 10
                              ? "destructive"
                              : "secondary"
                          }
                        >
                          {variationPct >= 0 ? "▲" : "▼"}{" "}
                          {variationPct.toFixed(1)}%
                        </Badge>
                        <span>
                          Variación neta:{" "}
                          {formatCurrency(variationNet, currency)} vs período
                          previo ({formatCurrency(previousNetPay, currency)}).
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>
                          Aportes patronales (provisión):{" "}
                          {formatCurrency(employerProvision, currency)}
                        </p>
                        <p>
                          Deducciones:{" "}
                          {formatCurrency(entriesSummary.deduction, currency)}
                        </p>
                        <p>
                          Devengos:{" "}
                          {formatCurrency(entriesSummary.earning, currency)}
                        </p>
                      </div>
                      {Math.abs(variationPct) > 10 && (
                        <Alert
                          variant="warning"
                          className="border-amber-300/80 bg-amber-50"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>Alerta de variación</AlertTitle>
                          <AlertDescription>
                            La nómina cambió más de 10% vs el período anterior.
                            Revisa provisiones, ausencias y bonos
                            extraordinarios.
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Preview contable</CardTitle>
                      <CardDescription>
                        Débitos/créditos por concepto antes de aprobar o pagar.
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadAccountingPreview(selectedRun?._id)}
                        disabled={!selectedRun || loadingAccountingPreview}
                      >
                        {loadingAccountingPreview ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-2 h-4 w-4" />
                        )}
                        {loadingAccountingPreview ? "Cargando" : "Actualizar"}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!selectedRun ? (
                      <p className="text-sm text-muted-foreground">
                        Selecciona una nómina para ver el preview contable.
                      </p>
                    ) : loadingAccountingPreview ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : previewEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Aún no hay datos. Carga el preview para validar el
                        balance antes de aprobar/pagar.
                      </p>
                    ) : (
                      <>
                        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                          <Badge
                            variant={
                              isPreviewBalanced ? "default" : "destructive"
                            }
                          >
                            {isPreviewBalanced ? "Balanceado" : "Descuadrado"}
                          </Badge>
                          <span>
                            Débito:{" "}
                            {formatCurrency(previewTotals.debit || 0, currency)}{" "}
                            · Crédito:{" "}
                            {formatCurrency(
                              previewTotals.credit || 0,
                              currency,
                            )}
                          </span>
                          {!isPreviewBalanced && (
                            <span>
                              Diferencia:{" "}
                              {formatCurrency(Math.abs(previewDiff), currency)}
                            </span>
                          )}
                        </div>
                        <ScrollArea className="h-[240px]">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Concepto</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Cuenta débito</TableHead>
                                <TableHead className="text-right">
                                  Débito
                                </TableHead>
                                <TableHead>Cuenta crédito</TableHead>
                                <TableHead className="text-right">
                                  Crédito
                                </TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {previewEntries.map((entry, index) => {
                                const debitAccount =
                                  entry.debitAccountCode ||
                                  entry.debitAccount ||
                                  entry.debitAccountId ||
                                  "—";
                                const creditAccount =
                                  entry.creditAccountCode ||
                                  entry.creditAccount ||
                                  entry.creditAccountId ||
                                  "—";
                                return (
                                  <TableRow
                                    key={`${entry.conceptCode || entry.conceptName || "concept"}-${index}`}
                                  >
                                    <TableCell>
                                      <div className="font-medium">
                                        {entry.conceptName ||
                                          entry.conceptCode ||
                                          "Concepto"}
                                      </div>
                                      {entry.conceptCode && (
                                        <p className="text-xs text-muted-foreground">
                                          {entry.conceptCode}
                                        </p>
                                      )}
                                    </TableCell>
                                    <TableCell className="capitalize">
                                      {entry.conceptType || "—"}
                                    </TableCell>
                                    <TableCell>{debitAccount}</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(
                                        entry.debit || 0,
                                        currency,
                                      )}
                                    </TableCell>
                                    <TableCell>{creditAccount}</TableCell>
                                    <TableCell className="text-right">
                                      {formatCurrency(
                                        entry.credit || 0,
                                        currency,
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <CardTitle>Detalle de conceptos</CardTitle>
                      <CardDescription>
                        Explora cada entrada calculada por empleado y concepto.
                      </CardDescription>
                    </div>
                    <Select
                      value={entriesFilter}
                      onValueChange={setEntriesFilter}
                    >
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
                      <p className="text-sm text-muted-foreground">
                        Sin entradas para el filtro seleccionado.
                      </p>
                    ) : (
                      <ScrollArea className="h-[320px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Empleado</TableHead>
                              <TableHead>Concepto</TableHead>
                              <TableHead>Tipo</TableHead>
                              <TableHead>Departamento</TableHead>
                              <TableHead className="text-right">
                                Monto
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEntries.map((entry, index) => (
                              <TableRow
                                key={`${entry.employeeId}-${entry.conceptCode}-${index}`}
                              >
                                <TableCell>
                                  <div className="font-medium">
                                    {entry.employeeName || entry.employeeId}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">
                                    {entry.conceptName || entry.conceptCode}
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.conceptCode}
                                  </p>
                                </TableCell>
                                <TableCell className="capitalize">
                                  {entry.conceptType}
                                </TableCell>
                                <TableCell>{entry.department || "—"}</TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(entry.amount, currency)}
                                </TableCell>
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
