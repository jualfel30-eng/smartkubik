import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button.jsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Badge } from '@/components/ui/badge.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog.jsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { toast } from 'sonner';
import { fetchApi } from '../lib/api';
import { useModuleAccess } from '../hooks/useModuleAccess';
import ModuleAccessDenied from './ModuleAccessDenied';
import { HotelCalendar } from './hospitality/HotelCalendar.jsx';
import {
  Plus,
  Calendar,
  Clock,
  User,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  PlayCircle,
  Receipt,
  Loader2,
} from 'lucide-react';

const UNASSIGNED_RESOURCE = '__UNASSIGNED__';

const initialAppointmentState = {
  customerId: '',
  serviceId: '',
  resourceId: UNASSIGNED_RESOURCE,
  startTime: '',
  endTime: '',
  notes: '',
  status: 'pending',
};

const initialGroupState = {
  hostCustomerId: '',
  serviceId: '',
  resourceId: UNASSIGNED_RESOURCE,
  startDate: '',
  startTime: '',
  notes: '',
};

const initialBlockState = {
  resourceId: UNASSIGNED_RESOURCE,
  locationId: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  reason: '',
};

const initialDepositFormState = {
  amount: '',
  currency: 'VES',
  reference: '',
  proofUrl: '',
  notes: '',
  method: 'transferencia',
  bankAccountId: '',
  proofFileName: '',
  proofMimeType: '',
  proofBase64: '',
  amountUsd: '',
  amountVes: '',
  exchangeRate: '',
};

const initialDepositActionState = {
  status: 'confirmed',
  bankAccountId: '',
  confirmedAmount: '',
  notes: '',
  decisionNotes: '',
  method: 'transferencia',
  reference: '',
  proofUrl: '',
  proofFileName: '',
  proofMimeType: '',
  proofBase64: '',
  amountUsd: '',
  amountVes: '',
  exchangeRate: '',
  transactionDate: '',
};

const DEPOSIT_METHOD_OPTIONS = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'pos', label: 'Punto de venta' },
  { value: 'otros', label: 'Otro' },
];

const DEPOSIT_STATUS_DETAILS = {
  requested: { label: 'Solicitado', variant: 'secondary' },
  submitted: { label: 'Reportado', variant: 'default' },
  confirmed: { label: 'Confirmado', variant: 'success' },
  rejected: { label: 'Rechazado', variant: 'destructive' },
};

const formatDateTimeLocal = (value) => {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!date || Number.isNaN(date.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeLocalToISO = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

const formatCurrency = (value, currency = 'VES') => {
  if (value === undefined || value === null || value === '') return '';
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return '';
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch (error) {
    return `${currency} ${numeric.toFixed(2)}`;
  }
};

const STATUS_CONFIG = {
  pending: { label: 'Pendiente', variant: 'secondary', icon: AlertCircle },
  confirmed: { label: 'Confirmada', variant: 'default', icon: CheckCircle },
  in_progress: { label: 'En progreso', variant: 'warning', icon: PlayCircle },
  completed: { label: 'Completada', variant: 'success', icon: CheckCircle },
  cancelled: { label: 'Cancelada', variant: 'destructive', icon: XCircle },
  no_show: { label: 'No asistió', variant: 'destructive', icon: XCircle },
};

function AppointmentsManagement() {
  const hasAccess = useModuleAccess('appointments');
  const hasBankAccess = useModuleAccess('bankAccounts');
  const [appointments, setAppointments] = useState([]);
  const [services, setServices] = useState([]);
  const [resources, setResources] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [formData, setFormData] = useState({ ...initialAppointmentState });
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({ ...initialGroupState });
  const [groupCustomers, setGroupCustomers] = useState([]);
  const [groupCustomerSelection, setGroupCustomerSelection] = useState('');
  const [groupSubmitting, setGroupSubmitting] = useState(false);
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [blockForm, setBlockForm] = useState({ ...initialBlockState });
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [depositRecords, setDepositRecords] = useState([]);
  const [depositForm, setDepositForm] = useState({ ...initialDepositFormState });
  const [depositPreview, setDepositPreview] = useState('');
  const [depositSubmitting, setDepositSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedDeposit, setSelectedDeposit] = useState(null);
  const [depositActionForm, setDepositActionForm] = useState({ ...initialDepositActionState });
  const [isDepositActionDialogOpen, setIsDepositActionDialogOpen] = useState(false);
  const [depositActionPreview, setDepositActionPreview] = useState('');
  const [depositActionSubmitting, setDepositActionSubmitting] = useState(false);
  const [receiptLoadingId, setReceiptLoadingId] = useState(null);
  const depositFileInputRef = useRef(null);
  const depositActionFileInputRef = useRef(null);
  const depositMethodOptions = useMemo(() => DEPOSIT_METHOD_OPTIONS, []);

  const normalizeListResponse = (apiResponse) => {
    if (Array.isArray(apiResponse)) {
      return apiResponse;
    }
    if (apiResponse && Array.isArray(apiResponse.data)) {
      return apiResponse.data;
    }
    return [];
  };

  if (!hasAccess) {
    return <ModuleAccessDenied moduleName="appointments" />;
  }

  useEffect(() => {
    // Set default date range (current week)
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay()); // Sunday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    setDateFrom(weekStart.toISOString().split('T')[0]);
    setDateTo(weekEnd.toISOString().split('T')[0]);

    const defaultDate = weekStart.toISOString().split('T')[0];
    setGroupForm((prev) => ({
      ...prev,
      startDate: defaultDate,
      startTime: '09:00',
    }));
    setBlockForm((prev) => ({
      ...prev,
      startDate: defaultDate,
      endDate: defaultDate,
      startTime: '09:00',
      endTime: '11:00',
    }));

    loadServices();
    loadResources();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (dateFrom && dateTo) {
      loadAppointments();
    }
  }, [dateFrom, dateTo, statusFilter]);

  useEffect(() => {
    if (!hasBankAccess) {
      setBankAccounts([]);
      return;
    }

    const loadBankAccounts = async () => {
      try {
        const response = await fetchApi('/bank-accounts');
        setBankAccounts(normalizeListResponse(response));
      } catch (error) {
        console.error('Error loading bank accounts:', error);
      }
    };

    loadBankAccounts();
  }, [hasBankAccess]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (dateFrom) params.append('startDate', dateFrom);
      if (dateTo) params.append('endDate', dateTo);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const data = await fetchApi(`/appointments?${params}`);
      setAppointments(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading appointments:', error);
      alert('Error al cargar las citas');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const data = await fetchApi('/services/active');
      setServices(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading services:', error);
      setServices([]);
    }
  };

  const loadResources = async () => {
    try {
      const data = await fetchApi('/resources/active');
      setResources(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading resources:', error);
      setResources([]);
    }
  };

  const loadCustomers = async () => {
    try {
      const data = await fetchApi('/customers');
      setCustomers(normalizeListResponse(data));
    } catch (error) {
      console.error('Error loading customers:', error);
      setCustomers([]);
    }
  };

  const getBankAccountLabel = useCallback(
    (accountId) => {
      if (!accountId) return 'Sin cuenta asignada';
      const stringId = typeof accountId === 'string' ? accountId : accountId?._id || accountId?.toString?.();
      const account = bankAccounts.find(
        (item) => item._id === stringId || item._id?.toString?.() === stringId,
      );
      if (!account) return stringId || 'Sin cuenta asignada';

      const suffix = account.accountNumber
        ? ` · ****${account.accountNumber.slice(-4)}`
        : '';
      return `${account.bankName}${suffix}`;
    },
    [bankAccounts],
  );

  const openGroupDialog = () => {
    const today = new Date();
    const todayIso = today.toISOString().split('T')[0];
    setGroupForm({
      ...initialGroupState,
      startDate: todayIso,
      startTime: '09:00',
    });
    setGroupCustomers([]);
    setGroupCustomerSelection('');
    setIsGroupDialogOpen(true);
  };

  const handleAddGroupCustomer = () => {
    if (!groupCustomerSelection) return;
    if (groupCustomers.includes(groupCustomerSelection)) return;
    setGroupCustomers((prev) => [...prev, groupCustomerSelection]);
    setGroupCustomerSelection('');
  };

  const handleRemoveGroupCustomer = (customerId) => {
    setGroupCustomers((prev) => prev.filter((id) => id !== customerId));
  };

  const handleGroupSubmit = async (event) => {
    event.preventDefault();

    if (!groupForm.hostCustomerId) {
      alert('Selecciona el cliente principal del grupo');
      return;
    }

    if (!groupForm.serviceId) {
      alert('Selecciona un servicio');
      return;
    }

    if (!groupForm.startDate || !groupForm.startTime) {
      alert('Selecciona fecha y hora de inicio');
      return;
    }

    const service = (Array.isArray(services) ? services : []).find(
      (svc) => svc._id === groupForm.serviceId,
    );

    if (!service) {
      alert('Servicio inválido');
      return;
    }

    const start = new Date(`${groupForm.startDate}T${groupForm.startTime}`);
    if (Number.isNaN(start.getTime())) {
      alert('Fecha u hora inválida');
      return;
    }

    const durationMinutes = service.duration || 60;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const allParticipants = [groupForm.hostCustomerId, ...groupCustomers];
    const capacityTotal = Math.max(allParticipants.length, 1);

    const baseAppointment = {
      customerId: groupForm.hostCustomerId,
      serviceId: groupForm.serviceId,
      resourceId:
        groupForm.resourceId && groupForm.resourceId !== UNASSIGNED_RESOURCE
          ? groupForm.resourceId
          : undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      notes: groupForm.notes || '',
      status: 'pending',
      capacity: capacityTotal,
      capacityUsed: 1,
      source: 'backoffice',
    };

    const attendees = groupCustomers.map((customerId) => ({
      customerId,
      capacityUsed: 1,
    }));

    const payload = {
      baseAppointment,
      attendees,
      metadata: {
        groupCreatedAt: new Date().toISOString(),
        groupLabel: service.name,
      },
    };

    try {
      setGroupSubmitting(true);
      await fetchApi('/appointments/group', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Bloque grupal creado exitosamente');
      setIsGroupDialogOpen(false);
      await loadAppointments();
    } catch (error) {
      console.error('Error creating group appointment:', error);
      alert(error?.message || 'No fue posible crear el bloque grupal');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const handleBlockSubmit = async (event) => {
    event.preventDefault();

    if (!blockForm.resourceId || blockForm.resourceId === UNASSIGNED_RESOURCE) {
      alert('Selecciona el recurso a bloquear');
      return;
    }

    if (!blockForm.startDate || !blockForm.startTime || !blockForm.endDate || !blockForm.endTime) {
      alert('Completa el rango de fechas');
      return;
    }

    const start = new Date(`${blockForm.startDate}T${blockForm.startTime}`);
    const end = new Date(`${blockForm.endDate}T${blockForm.endTime}`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      alert('El rango de fechas no es válido');
      return;
    }

    const payload = {
      resourceId: blockForm.resourceId,
      locationId: blockForm.locationId || undefined,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      reason: blockForm.reason || 'Bloqueo operativo',
      metadata: {
        createdFrom: 'admin_ui',
      },
    };

    try {
      setBlockSubmitting(true);
      await fetchApi('/appointments/room-block', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      alert('Bloqueo registrado exitosamente');
      setIsBlockDialogOpen(false);
      await loadAppointments();
    } catch (error) {
      console.error('Error creating room block:', error);
      alert(error?.message || 'No fue posible crear el bloqueo');
    } finally {
      setBlockSubmitting(false);
    }
  };

  const handleDepositFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearDepositFile();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El comprobante no puede exceder 5MB.');
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const [metadata, base64] = reader.result.split(',');
        const mimeMatch = metadata?.match(/data:(.*);base64/);
        setDepositForm((prev) => ({
          ...prev,
          proofFileName: file.name,
          proofMimeType: file.type || mimeMatch?.[1] || 'application/octet-stream',
          proofBase64: base64 || '',
        }));
        setDepositPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearDepositFile = () => {
    setDepositForm((prev) => ({
      ...prev,
      proofFileName: '',
      proofMimeType: '',
      proofBase64: '',
    }));
    setDepositPreview('');
    if (depositFileInputRef.current) {
      depositFileInputRef.current.value = '';
    }
  };

  const handleDepositActionFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      clearDepositActionFile();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('El comprobante no puede exceder 5MB.');
      if (event.target) event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const [metadata, base64] = reader.result.split(',');
        const mimeMatch = metadata?.match(/data:(.*);base64/);
        setDepositActionForm((prev) => ({
          ...prev,
          proofFileName: file.name,
          proofMimeType: file.type || mimeMatch?.[1] || 'application/octet-stream',
          proofBase64: base64 || '',
        }));
        setDepositActionPreview(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const clearDepositActionFile = () => {
    setDepositActionForm((prev) => ({
      ...prev,
      proofFileName: '',
      proofMimeType: '',
      proofBase64: '',
    }));
    setDepositActionPreview('');
    if (depositActionFileInputRef.current) {
      depositActionFileInputRef.current.value = '';
    }
  };

  const getDepositProofHref = useCallback((deposit) => {
    if (!deposit) return '';
    if (deposit.proof?.base64 && deposit.proof?.mimeType) {
      return `data:${deposit.proof.mimeType};base64,${deposit.proof.base64}`;
    }
    return deposit.proofUrl || '';
  }, []);

  const getDepositProofLabel = useCallback((deposit) => {
    if (!deposit) return 'Ver comprobante';
    return deposit.proof?.fileName || deposit.proofUrl || 'Ver comprobante';
  }, []);

  const openDepositActionDialog = (deposit, status) => {
    if (!deposit) return;
    setSelectedDeposit(deposit);
    setDepositActionForm({
      ...initialDepositActionState,
      status,
      bankAccountId:
        (deposit.bankAccountId && (deposit.bankAccountId._id || deposit.bankAccountId)) || '',
      confirmedAmount: (deposit.confirmedAmount ?? deposit.amount ?? '').toString(),
      notes: deposit.notes || '',
      method: deposit.method || 'transferencia',
      reference: deposit.reference || '',
      proofUrl: deposit.proofUrl || '',
      amountUsd:
        deposit.amountUsd !== undefined && deposit.amountUsd !== null
          ? deposit.amountUsd.toString()
          : '',
      amountVes:
        deposit.amountVes !== undefined && deposit.amountVes !== null
          ? deposit.amountVes.toString()
          : '',
      exchangeRate:
        deposit.exchangeRate !== undefined && deposit.exchangeRate !== null
          ? deposit.exchangeRate.toString()
          : '',
      transactionDate: formatDateTimeLocal(
        deposit.transactionDate || deposit.createdAt || new Date(),
      ),
    });
    if (depositActionFileInputRef.current) {
      depositActionFileInputRef.current.value = '';
    }
    if (deposit.proof?.base64 && deposit.proof?.mimeType) {
      setDepositActionPreview(
        `data:${deposit.proof.mimeType};base64,${deposit.proof.base64}`,
      );
    } else {
      setDepositActionPreview('');
    }
    setIsDepositActionDialogOpen(true);
  };

  const closeDepositActionDialog = () => {
    setIsDepositActionDialogOpen(false);
    setSelectedDeposit(null);
    setDepositActionForm({ ...initialDepositActionState });
    setDepositActionPreview('');
    if (depositActionFileInputRef.current) {
      depositActionFileInputRef.current.value = '';
    }
  };

  const submitDepositAction = async (event) => {
    event.preventDefault();
    if (!editingAppointment || !selectedDeposit) return;

    const payload = {
      status: depositActionForm.status,
      notes: depositActionForm.notes || undefined,
      decisionNotes: depositActionForm.decisionNotes || undefined,
      proofUrl: depositActionForm.proofUrl || undefined,
      method: depositActionForm.method || undefined,
      reference: depositActionForm.reference || undefined,
      bankAccountId: depositActionForm.bankAccountId || undefined,
      amountUsd: depositActionForm.amountUsd
        ? Number(depositActionForm.amountUsd)
        : undefined,
      amountVes: depositActionForm.amountVes
        ? Number(depositActionForm.amountVes)
        : undefined,
      exchangeRate: depositActionForm.exchangeRate
        ? Number(depositActionForm.exchangeRate)
        : undefined,
    };

    if (depositActionForm.transactionDate) {
      const isoDate = parseDateTimeLocalToISO(depositActionForm.transactionDate);
      if (isoDate) {
        payload.transactionDate = isoDate;
      }
    }

    if (depositActionForm.proofBase64) {
      payload.proofBase64 = depositActionForm.proofBase64;
      payload.proofFileName = depositActionForm.proofFileName;
      payload.proofMimeType = depositActionForm.proofMimeType;
    }

    if (depositActionForm.status === 'confirmed') {
      const confirmedAmount = Number(
        depositActionForm.confirmedAmount || selectedDeposit.amount || 0,
      );
      if (Number.isNaN(confirmedAmount) || confirmedAmount <= 0) {
        alert('Ingresa un monto confirmado válido');
        return;
      }
      payload.confirmedAmount = confirmedAmount;

      if (!depositActionForm.bankAccountId && hasBankAccess) {
        const continueWithoutAccount = window.confirm(
          'No seleccionaste una cuenta bancaria para registrar el depósito. ¿Deseas continuar de todas formas?',
        );
        if (!continueWithoutAccount) {
          return;
        }
      }
    }

    try {
      setDepositActionSubmitting(true);
      await fetchApi(
        `/appointments/${editingAppointment._id}/manual-deposits/${selectedDeposit._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
      );
      closeDepositActionDialog();
      await refreshEditingAppointment();
      await loadAppointments();
    } catch (error) {
      console.error('Error updating deposit:', error);
      alert(error?.message || 'No se pudo actualizar el estado del depósito');
    } finally {
      setDepositActionSubmitting(false);
    }
  };

  const handleDepositSubmit = async (event) => {
    event.preventDefault();
    if (!editingAppointment) return;

    const amount = Number(depositForm.amount);
    if (Number.isNaN(amount) || amount <= 0) {
      alert('Ingresa un monto válido');
      return;
    }

    const payload = {
      amount,
      currency: depositForm.currency || 'VES',
      reference: depositForm.reference || undefined,
      proofUrl: depositForm.proofUrl || undefined,
      notes: depositForm.notes || undefined,
      method: depositForm.method || undefined,
      bankAccountId: depositForm.bankAccountId || undefined,
      amountUsd: depositForm.amountUsd ? Number(depositForm.amountUsd) : undefined,
      amountVes: depositForm.amountVes ? Number(depositForm.amountVes) : undefined,
      exchangeRate: depositForm.exchangeRate
        ? Number(depositForm.exchangeRate)
        : undefined,
    };

    if (depositForm.proofBase64) {
      payload.proofBase64 = depositForm.proofBase64;
      payload.proofFileName = depositForm.proofFileName;
      payload.proofMimeType = depositForm.proofMimeType;
    }

    try {
      setDepositSubmitting(true);
      await fetchApi(`/appointments/${editingAppointment._id}/manual-deposits`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setDepositForm({ ...initialDepositFormState });
      clearDepositFile();
      await refreshEditingAppointment();
      await loadAppointments();
    } catch (error) {
      console.error('Error registering deposit:', error);
      alert(error?.message || 'No se pudo registrar el depósito');
    } finally {
      setDepositSubmitting(false);
    }
  };

  const handleCopyReceipt = async (deposit) => {
    if (!editingAppointment || !deposit?._id) return;
    try {
      setReceiptLoadingId(deposit._id);
      const response = await fetchApi(`/appointments/${editingAppointment._id}/manual-deposits/${deposit._id}/receipt`);
      const data = response?.data || response;
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      toast.success('Comprobante copiado al portapapeles');
    } catch (error) {
      console.error('Error fetching receipt:', error);
      toast.error('No se pudo obtener el comprobante', { description: error?.message });
    } finally {
      setReceiptLoadingId(null);
    }
  };

  const openCreateDialog = () => {
    setEditingAppointment(null);
    setFormData({ ...initialAppointmentState });
    setDepositRecords([]);
    setDepositForm({ ...initialDepositFormState });
    setDepositPreview('');
    setSelectedDeposit(null);
    setDepositActionForm({ ...initialDepositActionState });
    setDepositActionPreview('');
    if (depositFileInputRef.current) {
      depositFileInputRef.current.value = '';
    }
    setIsDialogOpen(true);
  };

  const openBlockDialog = () => {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    setBlockForm({
      ...initialBlockState,
      startDate: iso,
      endDate: iso,
      startTime: '09:00',
      endTime: '11:00',
      resourceId: UNASSIGNED_RESOURCE,
    });
    setIsBlockDialogOpen(true);
  };

  const fetchAppointmentDetail = useCallback(async (id) => {
    const response = await fetchApi(`/appointments/${id}`);
    return Array.isArray(response) ? response[0] : response?.data || response;
  }, []);

  const openEditDialog = async (appointment) => {
    try {
      setLoading(true);
      const detail = await fetchAppointmentDetail(appointment._id);
      setEditingAppointment(detail);
      setDepositRecords(detail?.depositRecords || []);
      setDepositForm({ ...initialDepositFormState });
      setDepositPreview('');
      setSelectedDeposit(null);
      setDepositActionForm({ ...initialDepositActionState });
      setDepositActionPreview('');
      if (depositFileInputRef.current) {
        depositFileInputRef.current.value = '';
      }
      if (depositActionFileInputRef.current) {
        depositActionFileInputRef.current.value = '';
      }
      setFormData({
        customerId: detail.customerId?._id || detail.customerId,
        serviceId: detail.serviceId?._id || detail.serviceId,
        resourceId: detail.resourceId?._id || detail.resourceId || UNASSIGNED_RESOURCE,
        startTime: new Date(detail.startTime).toISOString().slice(0, 16),
        endTime: new Date(detail.endTime).toISOString().slice(0, 16),
        notes: detail.notes || '',
        status: detail.status,
      });
      setIsDialogOpen(true);
    } catch (error) {
      console.error('Error loading appointment detail:', error);
      alert('No fue posible cargar el detalle de la cita');
    } finally {
      setLoading(false);
    }
  };

  const refreshEditingAppointment = useCallback(async () => {
    if (!editingAppointment) return;
    try {
      const detail = await fetchAppointmentDetail(editingAppointment._id);
      setEditingAppointment(detail);
      setDepositRecords(detail?.depositRecords || []);
    } catch (error) {
      console.error('Error refreshing appointment detail:', error);
    }
  }, [editingAppointment, fetchAppointmentDetail]);

  const handleServiceChange = (serviceId) => {
    const serviceList = Array.isArray(services) ? services : [];
    const service = serviceList.find(s => s._id === serviceId);
    setFormData(prev => {
      const next = { ...prev, serviceId };
      if (prev.startTime && service?.duration) {
        const start = new Date(prev.startTime);
        if (!Number.isNaN(start.getTime())) {
          const end = new Date(start.getTime() + service.duration * 60000);
          next.endTime = end.toISOString().slice(0, 16);
        }
      }
      return next;
    });
  };

  const handleStartTimeChange = (startTime) => {
    const serviceList = Array.isArray(services) ? services : [];
    setFormData(prev => {
      const next = { ...prev, startTime };
      if (prev.serviceId) {
        const service = serviceList.find(s => s._id === prev.serviceId);
        if (service?.duration) {
          const start = new Date(startTime);
          if (!Number.isNaN(start.getTime())) {
            const end = new Date(start.getTime() + service.duration * 60000);
            next.endTime = end.toISOString().slice(0, 16);
          }
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const payload = {
        ...formData,
        startTime: new Date(formData.startTime).toISOString(),
        endTime: new Date(formData.endTime).toISOString(),
        resourceId:
          (formData.resourceId || UNASSIGNED_RESOURCE) === UNASSIGNED_RESOURCE
            ? undefined
            : formData.resourceId,
      };

      if (editingAppointment) {
        await fetchApi(`/appointments/${editingAppointment._id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await fetchApi('/appointments', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      setIsDialogOpen(false);
      loadAppointments();
      await refreshEditingAppointment();
    } catch (error) {
      console.error('Error saving appointment:', error);
      alert(error.message || 'Error al guardar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta cita?')) return;

    try {
      setLoading(true);
      await fetchApi(`/appointments/${id}`, { method: 'DELETE' });
      loadAppointments();
    } catch (error) {
      console.error('Error deleting appointment:', error);
      alert('Error al eliminar la cita');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      setLoading(true);
      await fetchApi(`/appointments/${appointmentId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      loadAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agenda de Citas</h1>
          <p className="text-gray-500">Gestiona las reservas del hotel y spa</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openBlockDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Bloque habitación
          </Button>
          <Button variant="outline" onClick={openGroupDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Bloque grupal
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cita
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="list">Lista</TabsTrigger>
          <TabsTrigger value="calendar">Calendario hotel</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Desde</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Hasta</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Estado</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendientes</SelectItem>
                      <SelectItem value="confirmed">Confirmadas</SelectItem>
                      <SelectItem value="in_progress">En progreso</SelectItem>
                      <SelectItem value="completed">Completadas</SelectItem>
                      <SelectItem value="cancelled">Canceladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button onClick={loadAppointments} className="w-full">
                    Buscar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {appointments.length} cita{appointments.length !== 1 ? 's' : ''}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha/Hora</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Servicio</TableHead>
                    <TableHead>Recurso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                        No se encontraron citas en este rango de fechas
                      </TableCell>
                    </TableRow>
                  ) : (
                    appointments.map((apt) => (
                      <TableRow key={apt._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">
                                {new Date(apt.startTime).toLocaleDateString('es-VE', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {new Date(apt.startTime).toLocaleTimeString('es-VE', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <div>
                              <div className="font-medium">{apt.customerName}</div>
                              {apt.customerPhone && (
                                <div className="text-sm text-gray-500">{apt.customerPhone}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{apt.serviceName}</Badge>
                        </TableCell>
                        <TableCell>
                          {apt.resourceName || <span className="text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={apt.status}
                            onValueChange={(value) => handleStatusChange(apt._id, value)}
                          >
                            <SelectTrigger className="w-[160px]">
                              {getStatusBadge(apt.status)}
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                  {config.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(apt)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(apt._id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <HotelCalendar />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingAppointment ? 'Editar Cita' : 'Nueva Cita'}
            </DialogTitle>
            <DialogDescription>
              Completa la información de la cita y asigna un recurso opcional antes de guardar.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="customerId">Cliente *</Label>
                <Select
                  value={formData.customerId}
                  onValueChange={(value) => setFormData({ ...formData, customerId: value })}
                  required
                >
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} - {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="serviceId">Servicio *</Label>
                <Select
                  value={formData.serviceId}
                  onValueChange={handleServiceChange}
                  required
                >
                  <SelectTrigger id="serviceId">
                    <SelectValue placeholder="Selecciona un servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(services) ? services : []).map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.name} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="resourceId">Recurso</Label>
                <Select
                  value={formData.resourceId || UNASSIGNED_RESOURCE}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      resourceId: value || UNASSIGNED_RESOURCE,
                    })
                  }
                >
                  <SelectTrigger id="resourceId">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_RESOURCE}>Sin asignar</SelectItem>
                    {(Array.isArray(resources) ? resources : []).map((resource) => (
                      <SelectItem key={resource._id} value={resource._id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="startTime">Inicio *</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="endTime">Fin *</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notas adicionales..."
                  rows={3}
                />
              </div>
            </div>

            {editingAppointment && (
              <div className="space-y-4 border rounded-lg border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Depósitos registrados</h3>
                  <span className="text-xs text-gray-500">
                    Estado de pago: {editingAppointment.paymentStatus || 'pending'} · Total confirmado ${editingAppointment.paidAmount || 0}
                  </span>
                </div>

                {depositRecords.length === 0 ? (
                  <p className="text-sm text-gray-500">Aún no se han registrado depósitos.</p>
                ) : (
                  <div className="space-y-3">
                    {depositRecords.map((deposit) => {
                      const statusInfo = DEPOSIT_STATUS_DETAILS[deposit.status] || DEPOSIT_STATUS_DETAILS.requested;
                      const proofHref = getDepositProofHref(deposit);
                      const proofLabel = getDepositProofLabel(deposit);
                      const createdLabel = deposit.createdAt
                        ? new Date(deposit.createdAt).toLocaleString('es-VE')
                        : null;
                      const confirmedLabel = deposit.confirmedAt
                        ? new Date(deposit.confirmedAt).toLocaleString('es-VE')
                        : null;
                      const depositDateLabel = deposit.transactionDate
                        ? new Date(deposit.transactionDate).toLocaleString('es-VE')
                        : null;

                      return (
                        <div
                          key={deposit._id}
                          className="border border-gray-200 rounded-md px-3 py-3 text-sm text-gray-600 flex flex-col gap-2"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-700">
                                {formatCurrency(deposit.amount, deposit.currency || 'VES')}
                              </p>
                              {deposit.status === 'confirmed' && deposit.confirmedAmount !== undefined && (
                                <p className="text-xs text-gray-500">
                                  Confirmado: {formatCurrency(deposit.confirmedAmount, deposit.currency || 'VES')}
                                </p>
                              )}
                            </div>
                            <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                          </div>

                          <div className="grid md:grid-cols-2 gap-y-1 gap-x-4">
                            {deposit.method && (
                              <span><strong>Método:</strong> {deposit.method}</span>
                            )}
                            {deposit.reference && (
                              <span><strong>Referencia:</strong> {deposit.reference}</span>
                            )}
                            {deposit.bankAccountId && (
                              <span>
                                <strong>Cuenta:</strong> {getBankAccountLabel(deposit.bankAccountId)}
                              </span>
                            )}
                            {deposit.amountUsd && (
                              <span><strong>Monto USD:</strong> {formatCurrency(deposit.amountUsd, 'USD')}</span>
                            )}
                            {deposit.exchangeRate && (
                              <span><strong>Tasa:</strong> {Number(deposit.exchangeRate).toLocaleString('es-VE')}</span>
                            )}
                            {createdLabel && (
                              <span><strong>Registrado:</strong> {createdLabel}</span>
                            )}
                            {depositDateLabel && (
                              <span><strong>Fecha depósito:</strong> {depositDateLabel}</span>
                            )}
                            {confirmedLabel && (
                              <span><strong>Confirmado:</strong> {confirmedLabel}</span>
                            )}
                            {deposit.bankTransactionId && (
                              <span>
                                <strong>Movimiento bancario:</strong> {deposit.bankTransactionId.toString().slice(-6)}
                              </span>
                            )}
                            {deposit.journalEntryId && (
                              <span>
                                <strong>Asiento contable:</strong> {deposit.journalEntryId.toString().slice(-6)}
                              </span>
                            )}
                            {deposit.receiptNumber && (
                              <span>
                                <strong>Recibo:</strong> {deposit.receiptNumber}
                              </span>
                            )}
                          </div>

                          {deposit.notes && (
                            <p className="text-sm text-gray-600">
                              <strong>Notas:</strong> {deposit.notes}
                            </p>
                          )}
                          {deposit.decisionNotes && (
                            <p className="text-sm text-gray-600">
                              <strong>Resolución:</strong> {deposit.decisionNotes}
                            </p>
                          )}
                          {proofHref && (
                            <a
                              href={proofHref}
                              className="text-primary underline text-sm"
                              target="_blank"
                              rel="noreferrer"
                            >
                              {proofLabel}
                            </a>
                          )}
                          {deposit.status === 'rejected' && deposit.rejectedAt && (
                            <span className="text-xs text-gray-500">
                              Rechazado: {new Date(deposit.rejectedAt).toLocaleString('es-VE')}
                            </span>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2">
                            {deposit.status === 'confirmed' && deposit.receiptNumber && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyReceipt(deposit)}
                                disabled={receiptLoadingId === deposit._id}
                              >
                                {receiptLoadingId === deposit._id ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : (
                                  <Receipt className="h-3.5 w-3.5 mr-1" />
                                )}
                                Copiar recibo
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => openDepositActionDialog(deposit, 'confirmed')}
                              disabled={depositActionSubmitting}
                            >
                              {deposit.status === 'confirmed' ? 'Editar confirmación' : 'Confirmar'}
                            </Button>
                            {deposit.status !== 'confirmed' && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => openDepositActionDialog(deposit, 'rejected')}
                                disabled={depositActionSubmitting}
                              >
                                {deposit.status === 'rejected' ? 'Editar rechazo' : 'Rechazar'}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <form className="grid md:grid-cols-3 gap-3" onSubmit={handleDepositSubmit}>
                  <div>
                    <Label>Monto *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositForm.amount}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label>Moneda</Label>
                    <Select
                      value={depositForm.currency}
                      onValueChange={(value) => setDepositForm((prev) => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="VES">VES</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Método</Label>
                    <Select
                      value={depositForm.method}
                      onValueChange={(value) => setDepositForm((prev) => ({ ...prev, method: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un método" />
                      </SelectTrigger>
                      <SelectContent>
                        {depositMethodOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {hasBankAccess && (
                    <div className="md:col-span-3">
                      <Label>Cuenta bancaria destino</Label>
                      <Select
                        value={depositForm.bankAccountId}
                        onValueChange={(value) => setDepositForm((prev) => ({ ...prev, bankAccountId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona cuenta" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin asignar</SelectItem>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {getBankAccountLabel(account._id)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="md:col-span-3">
                    <Label>Referencia</Label>
                    <Input
                      value={depositForm.reference}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, reference: e.target.value }))}
                      placeholder="Banco, número, etc."
                    />
                  </div>

                  <div>
                    <Label>Monto USD</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositForm.amountUsd}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, amountUsd: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label>Monto VES</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={depositForm.amountVes}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, amountVes: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>
                  <div>
                    <Label>Tasa</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={depositForm.exchangeRate}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, exchangeRate: e.target.value }))}
                      placeholder="Opcional"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label>Adjuntar comprobante</Label>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleDepositFileChange}
                        ref={depositFileInputRef}
                      />
                      {depositPreview && (
                        <Button type="button" size="sm" variant="ghost" onClick={clearDepositFile}>
                          Quitar
                        </Button>
                      )}
                    </div>
                    {depositPreview && (
                      <a
                        href={depositPreview}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary underline"
                      >
                        Ver archivo adjunto
                      </a>
                    )}
                  </div>

                  <div className="md:col-span-3">
                    <Label>URL comprobante</Label>
                    <Input
                      value={depositForm.proofUrl}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, proofUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="md:col-span-3">
                    <Label>Notas</Label>
                    <Textarea
                      rows={2}
                      value={depositForm.notes}
                      onChange={(e) => setDepositForm((prev) => ({ ...prev, notes: e.target.value }))}
                      placeholder="Comentario interno sobre el pago"
                    />
                  </div>

                  <div className="md:col-span-3 text-right">
                    <Button type="submit" disabled={depositSubmitting}>
                      {depositSubmitting ? 'Registrando...' : 'Registrar depósito'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : editingAppointment ? 'Actualizar' : 'Crear'}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>

      {/* Room Block Dialog */}
      <Dialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Bloqueo de habitación / recurso</DialogTitle>
            <DialogDescription>
              Registra un bloqueo temporal por mantenimiento o limpieza profunda. El recurso no estará disponible durante el intervalo indicado.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleBlockSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Recurso *</Label>
                <Select
                  value={blockForm.resourceId}
                  onValueChange={(value) => setBlockForm((prev) => ({ ...prev, resourceId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona recurso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_RESOURCE} disabled>
                      Selecciona recurso
                    </SelectItem>
                    {(Array.isArray(resources) ? resources : []).map((resource) => (
                      <SelectItem key={resource._id} value={resource._id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Ubicación</Label>
                <Input
                  value={blockForm.locationId}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, locationId: e.target.value }))}
                  placeholder="Opcional"
                />
              </div>

              <div>
                <Label>Inicio *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={blockForm.startDate}
                    onChange={(e) => setBlockForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    required
                  />
                  <Input
                    type="time"
                    value={blockForm.startTime}
                    onChange={(e) => setBlockForm((prev) => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label>Fin *</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={blockForm.endDate}
                    onChange={(e) => setBlockForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    required
                  />
                  <Input
                    type="time"
                    value={blockForm.endTime}
                    onChange={(e) => setBlockForm((prev) => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label>Motivo *</Label>
                <Textarea
                  value={blockForm.reason}
                  onChange={(e) => setBlockForm((prev) => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                  placeholder="Describe el motivo del bloqueo (mantenimiento, fumigación, etc.)"
                  required
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsBlockDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={blockSubmitting}>
                {blockSubmitting ? 'Registrando...' : 'Registrar bloqueo'}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>

      {/* Deposit Action Dialog */}
      <Dialog
        open={isDepositActionDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeDepositActionDialog();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Gestionar depósito manual</DialogTitle>
            <DialogDescription>
              Valida la evidencia reportada y confirma o rechaza el pago correspondiente a la reserva.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={submitDepositAction}>
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Estado</Label>
                <Select
                  value={depositActionForm.status}
                  onValueChange={(value) =>
                    setDepositActionForm((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="rejected">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fecha del depósito</Label>
                <Input
                  type="datetime-local"
                  value={depositActionForm.transactionDate}
                  onChange={(e) =>
                    setDepositActionForm((prev) => ({ ...prev, transactionDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {depositActionForm.status === 'confirmed' && (
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <Label>Monto confirmado *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={depositActionForm.confirmedAmount}
                    onChange={(e) =>
                      setDepositActionForm((prev) => ({ ...prev, confirmedAmount: e.target.value }))
                    }
                    required
                  />
                </div>
                {hasBankAccess && (
                  <div>
                    <Label>Cuenta bancaria</Label>
                    <Select
                      value={depositActionForm.bankAccountId || ''}
                      onValueChange={(value) =>
                        setDepositActionForm((prev) => ({ ...prev, bankAccountId: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Sin asignar</SelectItem>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account._id} value={account._id}>
                            {getBankAccountLabel(account._id)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label>Método</Label>
                <Select
                  value={depositActionForm.method}
                  onValueChange={(value) =>
                    setDepositActionForm((prev) => ({ ...prev, method: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona método" />
                  </SelectTrigger>
                  <SelectContent>
                    {depositMethodOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Referencia</Label>
                <Input
                  value={depositActionForm.reference}
                  onChange={(e) =>
                    setDepositActionForm((prev) => ({ ...prev, reference: e.target.value }))
                  }
                  placeholder="Banco, número, etc."
                />
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <Label>Monto USD</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositActionForm.amountUsd}
                  onChange={(e) =>
                    setDepositActionForm((prev) => ({ ...prev, amountUsd: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label>Monto VES</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositActionForm.amountVes}
                  onChange={(e) =>
                    setDepositActionForm((prev) => ({ ...prev, amountVes: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
              <div>
                <Label>Tasa</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.0001"
                  value={depositActionForm.exchangeRate}
                  onChange={(e) =>
                    setDepositActionForm((prev) => ({ ...prev, exchangeRate: e.target.value }))
                  }
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adjuntar nueva evidencia</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept="image/*,application/pdf"
                  ref={depositActionFileInputRef}
                  onChange={handleDepositActionFileChange}
                />
                {depositActionPreview && (
                  <Button type="button" size="sm" variant="ghost" onClick={clearDepositActionFile}>
                    Quitar
                  </Button>
                )}
              </div>
              {depositActionPreview && (
                <a
                  href={depositActionPreview}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-primary underline"
                >
                  Ver archivo seleccionado
                </a>
              )}
              {selectedDeposit && getDepositProofHref(selectedDeposit) && (
                <a
                  href={getDepositProofHref(selectedDeposit)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-500 underline"
                >
                  Ver comprobante original
                </a>
              )}
            </div>

            <div className="space-y-2">
              <Label>URL comprobante</Label>
              <Input
                value={depositActionForm.proofUrl}
                onChange={(e) =>
                  setDepositActionForm((prev) => ({ ...prev, proofUrl: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea
                rows={2}
                value={depositActionForm.notes}
                onChange={(e) =>
                  setDepositActionForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Detalles relevantes para el equipo (ej. recibido por WhatsApp)"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas de resolución</Label>
              <Textarea
                rows={2}
                value={depositActionForm.decisionNotes}
                onChange={(e) =>
                  setDepositActionForm((prev) => ({ ...prev, decisionNotes: e.target.value }))
                }
                placeholder="Observaciones al confirmar o rechazar"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDepositActionDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={depositActionSubmitting}>
                {depositActionSubmitting
                  ? 'Guardando...'
                  : depositActionForm.status === 'rejected'
                    ? 'Registrar rechazo'
                    : 'Confirmar depósito'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Group Block Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Nuevo bloque grupal</DialogTitle>
            <DialogDescription>
              Crea múltiples reservas sincronizadas para un tour, clase o experiencia compartida.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleGroupSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Cliente principal *</Label>
                <Select
                  value={groupForm.hostCustomerId}
                  onValueChange={(value) => setGroupForm((prev) => ({ ...prev, hostCustomerId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el cliente anfitrión" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {customer.name} · {customer.phone || 'Sin teléfono'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Añadir participantes</Label>
                <div className="flex gap-2">
                  <Select
                    value={groupCustomerSelection}
                    onValueChange={setGroupCustomerSelection}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers
                        .filter((customer) =>
                          customer._id !== groupForm.hostCustomerId &&
                          !groupCustomers.includes(customer._id),
                        )
                        .map((customer) => (
                          <SelectItem key={customer._id} value={customer._id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" onClick={handleAddGroupCustomer}>
                    Agregar
                  </Button>
                </div>
                {groupCustomers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {groupCustomers.map((customerId) => {
                      const customer = customers.find((c) => c._id === customerId);
                      return (
                        <Badge key={customerId} variant="secondary" className="flex items-center gap-2 py-1 px-2">
                          <span>{customer?.name || customerId}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => handleRemoveGroupCustomer(customerId)}
                          >
                            ✕
                          </Button>
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <Label>Servicio *</Label>
                <Select
                  value={groupForm.serviceId}
                  onValueChange={(value) => setGroupForm((prev) => ({ ...prev, serviceId: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona servicio" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Array.isArray(services) ? services : []).map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        {service.name} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recurso</Label>
                <Select
                  value={groupForm.resourceId || UNASSIGNED_RESOURCE}
                  onValueChange={(value) =>
                    setGroupForm((prev) => ({
                      ...prev,
                      resourceId: value === UNASSIGNED_RESOURCE ? UNASSIGNED_RESOURCE : value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNASSIGNED_RESOURCE}>Sin asignar</SelectItem>
                    {(Array.isArray(resources) ? resources : []).map((resource) => (
                      <SelectItem key={resource._id} value={resource._id}>
                        {resource.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={groupForm.startDate}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label>Hora *</Label>
                <Input
                  type="time"
                  value={groupForm.startTime}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label>Notas</Label>
                <Textarea
                  value={groupForm.notes}
                  onChange={(e) => setGroupForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Indicaciones para el grupo, requerimientos especiales, etc."
                  rows={3}
                />
              </div>
            </div>

            <Card variant="outline">
              <CardContent className="py-3">
                <div className="text-sm text-muted-foreground flex flex-wrap gap-4">
                  <span>
                    Participantes total:{' '}
                    <strong>{[groupForm.hostCustomerId, ...groupCustomers.filter(Boolean)].length}</strong>
                  </span>
                  {groupForm.serviceId && (
                    <span>
                      Duración estimada:{' '}
                      <strong>
                        {(() => {
                          const service = (Array.isArray(services) ? services : []).find(
                            (svc) => svc._id === groupForm.serviceId,
                          );
                          return service ? `${service.duration} min` : '--';
                        })()}
                      </strong>
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsGroupDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={groupSubmitting}>
                {groupSubmitting ? 'Creando...' : 'Crear bloque'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AppointmentsManagement;
