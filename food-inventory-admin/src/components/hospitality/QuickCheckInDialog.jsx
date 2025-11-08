import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Input } from '@/components/ui/input.jsx';
import { Label } from '@/components/ui/label.jsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.jsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx';
import { Textarea } from '@/components/ui/textarea.jsx';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox.jsx';
import { useAccountingContext } from '@/context/AccountingContext';

const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload?.data && Array.isArray(payload.data)) {
    return payload.data;
  }
  if (payload?.items && Array.isArray(payload.items)) {
    return payload.items;
  }
  return [];
};

const formatDateTimeLocal = (date) => {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) {
    return '';
  }
  const pad = (num) => String(num).padStart(2, '0');
  const year = value.getFullYear();
  const month = pad(value.getMonth() + 1);
  const day = pad(value.getDate());
  const hours = pad(value.getHours());
  const minutes = pad(value.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const parseDateTimeLocal = (value) => {
  if (!value) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
};

const DEFAULT_STAY_HOURS = 24;

const PAYMENT_METHOD_UNSET = 'unset';
const PAYMENT_DEFAULTS = {
  mode: 'none',
  amount: '',
  currency: 'VES',
  method: PAYMENT_METHOD_UNSET,
  reference: '',
  notes: '',
};

const PAYMENT_METHOD_OPTIONS = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'pago_movil', label: 'Pago móvil' },
  { value: 'pos', label: 'Punto de venta' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'zelle', label: 'Zelle' },
  { value: 'otros', label: 'Otro' },
];

const CURRENCY_OPTIONS = ['VES', 'USD'];
const DEFAULT_TAX_TYPE = 'V';

const sanitizeText = (value = '') => value.trim();
const sanitizeTaxId = (value = '') => sanitizeText(value).toUpperCase();
const sanitizeEmail = (value = '') => sanitizeText(value).toLowerCase();
const sanitizePhone = (value = '') => sanitizeText(value).replace(/[^\d+]/g, '');

const formatCurrency = (amount, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
};

export default function QuickCheckInDialog({ open, onOpenChange, room = null, onSuccess }) {
  const [initializing, setInitializing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [defaultService, setDefaultService] = useState(null);
  const [customerMode, setCustomerMode] = useState('existing');
  const [payment, setPayment] = useState({ ...PAYMENT_DEFAULTS });
  const [bcvRate, setBcvRate] = useState(null);
  const [form, setForm] = useState({
    customerId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestTaxType: DEFAULT_TAX_TYPE,
    guestTaxId: '',
    guestTaxName: '',
    selectedServiceIds: [],
    checkIn: '',
    checkOut: '',
    notes: '',
  });
  const { triggerRefresh: triggerAccountingRefresh } = useAccountingContext();
  const autoAmountRef = useRef(null);

  const roomName = useMemo(() => {
    if (!room) {
      return '';
    }
    return room.name || `Habitación ${room.id}`;
  }, [room]);

  const serviceLookup = useMemo(() => {
    const map = new Map();
    services.forEach((service) => {
      const id = service._id || service.id;
      if (id) {
        map.set(id, service);
      }
    });
    return map;
  }, [services]);

  const findServiceById = useCallback(
    (serviceId) => {
      if (!serviceId) {
        return null;
      }
      return (
        serviceLookup.get(serviceId) ||
        services.find((service) => (service._id || service.id) === serviceId) ||
        null
      );
    },
    [serviceLookup, services],
  );

  const staySummary = useMemo(() => {
    const selectedIds = Array.isArray(form.selectedServiceIds)
      ? form.selectedServiceIds.filter(Boolean)
      : [];

    // El servicio primario SIEMPRE es el defaultService (habitación)
    // Los servicios seleccionados son TODOS extras/adicionales
    const primaryService = defaultService ||
      (services[0] ? services[0] : null);

    const primaryServiceId = primaryService
      ? (primaryService._id || primaryService.id)
      : null;

    // TODOS los servicios seleccionados son adicionales (no reemplazar la habitación)
    const additionalServiceIds = selectedIds;

    const startDate = new Date(form.checkIn);
    const endDate = new Date(form.checkOut);
    let nights = 1;
    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() > startDate.getTime()
    ) {
      const diffMs = endDate.getTime() - startDate.getTime();
      nights = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) || 1);
    }

    // IMPORTANTE: En hoteles el precio viene del RECURSO (habitación), no del servicio
    // Usar room.baseRate.amount si está disponible, sino usar service.price como fallback
    const baseRate = room?.baseRate?.amount
      ? Number(room.baseRate.amount)
      : Number(primaryService?.price ?? 0);

    const baseCurrency = room?.baseRate?.currency
      ? room.baseRate.currency.toUpperCase()
      : (primaryService?.currency || 'USD').toUpperCase();

    const baseTotal =
      Number.isFinite(baseRate) && baseRate > 0 ? baseRate * nights : 0;

    const extrasTotal = additionalServiceIds.reduce((sum, id) => {
      const svc = findServiceById(id);
      if (!svc) {
        return sum;
      }
      const price = Number(svc.price ?? 0);
      return sum + (Number.isFinite(price) ? price : 0);
    }, 0);

    const total = baseTotal + extrasTotal;

    return {
      primaryServiceId,
      primaryService,
      additionalServiceIds,
      nights,
      baseTotal,
      extrasTotal,
      total,
      currency: baseCurrency,
    };
  }, [
    form.checkIn,
    form.checkOut,
    form.selectedServiceIds,
    defaultService,
    services,
    findServiceById,
  ]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    let isMounted = true;
    const controller = new AbortController();

    const now = new Date();
    const defaultCheckout = new Date(now.getTime() + DEFAULT_STAY_HOURS * 60 * 60 * 1000);

    setForm({
      customerId: '',
      guestName: '',
      guestEmail: '',
      guestPhone: '',
      selectedServiceIds: [],
      checkIn: formatDateTimeLocal(now),
      checkOut: formatDateTimeLocal(defaultCheckout),
      notes: '',
    });
    setCustomerMode('existing');
    setInitializing(true);
    setDefaultService(null);
    setPayment({ ...PAYMENT_DEFAULTS });

    async function loadData() {
      try {
        const [customersResponse, servicesResponse, bcvResponse] = await Promise.all([
          fetchApi('/customers?limit=100&page=1', { signal: controller.signal }),
          fetchApi('/services/active', { signal: controller.signal }),
          fetchApi('/exchange-rate/bcv', { signal: controller.signal }).catch(() => null),
        ]);
        if (!isMounted) {
          return;
        }
        const customerList = normalizeListResponse(customersResponse);
        const serviceListRaw = normalizeListResponse(servicesResponse);

        // Set BCV rate if available
        if (bcvResponse?.rate) {
          setBcvRate(bcvResponse.rate);
        }
        const roomServices = serviceListRaw.filter((service) => {
          const allowed = Array.isArray(service.allowedResourceTypes)
            ? service.allowedResourceTypes.map((type) => String(type).toLowerCase())
            : [];
          const serviceType = service.serviceType ? String(service.serviceType).toLowerCase() : '';
          if (allowed.length) {
            return allowed.includes('room');
          }
          if (serviceType) {
            return ['room', 'hospitality'].includes(serviceType);
          }
          return true;
        });

        const preferredServices = roomServices.length ? roomServices : serviceListRaw;

        setCustomers(customerList);
        setServices(preferredServices);

        const computedDefaultService =
          preferredServices.find((service) => {
            const serviceType = service.serviceType ? String(service.serviceType).toLowerCase() : '';
            return serviceType === 'room' || serviceType === 'hospitality';
          }) ||
          preferredServices.find((service) => {
            const allowed = Array.isArray(service.allowedResourceTypes)
              ? service.allowedResourceTypes.map((type) => String(type).toLowerCase())
              : [];
            return allowed.includes('room');
          }) ||
          preferredServices[0] ||
          null;

        setDefaultService(computedDefaultService || null);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }
        console.error('Error loading quick check-in data:', err);
        toast.error(err.message || 'No pudimos preparar el check-in rápido.');
        setCustomers([]);
        setServices([]);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [open, room?.id]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (customerMode === 'existing') {
      setForm((prev) => ({
        ...prev,
        guestName: '',
        guestEmail: '',
        guestPhone: '',
        guestTaxType: DEFAULT_TAX_TYPE,
        guestTaxId: '',
        guestTaxName: '',
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        customerId: '',
        guestTaxType: prev.guestTaxType || DEFAULT_TAX_TYPE,
        guestTaxName: prev.guestTaxName || sanitizeText(prev.guestName),
      }));
    }
  }, [customerMode, open]);

  useEffect(() => {
    if (!open || customerMode !== 'new') {
      return;
    }
    setForm((prev) => {
      const currentName = sanitizeText(prev.guestName);
      const currentTaxName = sanitizeText(prev.guestTaxName);
      if (!currentName || currentTaxName) {
        return prev;
      }
      return {
        ...prev,
        guestTaxName: currentName,
      };
    });
  }, [form.guestName, customerMode, open]);

  useEffect(() => {
    if (payment.mode === 'none') {
      return;
    }
    const suggestedAmount =
      staySummary.total > 0 ? staySummary.total.toFixed(2) : '';
    if (!suggestedAmount) {
      return;
    }
    setPayment((prev) => {
      if (prev.mode === 'none') {
        return prev;
      }
      const desiredCurrency = staySummary.currency || prev.currency;
      const prevAmountNumber = Number(prev.amount);
      if (
        prev.amount &&
        prev.amount !== autoAmountRef.current &&
        Number.isFinite(prevAmountNumber) &&
        prevAmountNumber > 0
      ) {
        if (prev.currency !== desiredCurrency) {
          return { ...prev, currency: desiredCurrency };
        }
        return prev;
      }
      if (
        prev.amount === suggestedAmount &&
        prev.currency === desiredCurrency
      ) {
        autoAmountRef.current = suggestedAmount;
        return prev;
      }
      autoAmountRef.current = suggestedAmount;
      return {
        ...prev,
        amount: suggestedAmount,
        currency: desiredCurrency,
      };
    });
  }, [staySummary.total, staySummary.currency, payment.mode]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!room?.id) {
      toast.error('Selecciona una habitación válida.');
      return;
    }

    const startIso = parseDateTimeLocal(form.checkIn);
    const endIso = parseDateTimeLocal(form.checkOut);
    if (!startIso || !endIso) {
      toast.error('Revisa las fechas de check-in / check-out.');
      return;
    }
    const { primaryServiceId, additionalServiceIds, total: estimatedTotal, currency: stayCurrency } = staySummary;

    if (!primaryServiceId) {
      toast.error('Configura al menos un servicio base para completar el check-in.');
      return;
    }

    const wantsPayment = payment.mode !== 'none';
    const paymentAmount = Number(payment.amount);

    if (wantsPayment && (Number.isNaN(paymentAmount) || paymentAmount <= 0)) {
      toast.error('Ingresa un monto válido para el pago o depósito.');
      return;
    }

    try {
      setSubmitting(true);

      let customerId = form.customerId;
      let guestName = '';

      if (customerMode === 'existing') {
        const customer = customers.find((item) => item._id === form.customerId || item.id === form.customerId);
        if (!customer) {
          toast.error('Selecciona un cliente existente.');
          setSubmitting(false);
          return;
        }
        customerId = customer._id || customer.id;
        guestName = customer.name;
      } else {
        if (!form.guestName.trim()) {
          toast.error('Ingresa el nombre del huésped.');
          setSubmitting(false);
          return;
        }
        const preparedName = sanitizeText(form.guestName);
        const preparedEmail = sanitizeEmail(form.guestEmail);
        const preparedPhone = sanitizePhone(form.guestPhone);
        const preparedTaxType = form.guestTaxType || DEFAULT_TAX_TYPE;
        const preparedTaxId = sanitizeTaxId(form.guestTaxId);
        const preparedTaxName = sanitizeText(form.guestTaxName) || preparedName;

        const payload = {
          name: preparedName,
          customerType: 'individual',
          tags: ['hospitality', 'walk-in'],
        };

        const contacts = [];
        if (preparedPhone) {
          contacts.push({
            type: 'phone',
            value: preparedPhone,
            isPrimary: true,
          });
        }
        if (preparedEmail) {
          contacts.push({
            type: 'email',
            value: preparedEmail,
            isPrimary: contacts.length === 0,
          });
        }
        if (contacts.length) {
          payload.contacts = contacts;
        }

        payload.taxInfo = {
          taxType: preparedTaxType,
          taxName: preparedTaxName,
        };
        if (preparedTaxId) {
          payload.taxInfo.taxId = preparedTaxId;
        }

        const customerResponse = await fetchApi('/customers', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const createdCustomer =
          customerResponse?.data || customerResponse?.customer || customerResponse;
        customerId = createdCustomer?._id || createdCustomer?.id;
        guestName = createdCustomer?.name || payload.name;
        if (!customerId) {
          throw new Error('No pudimos registrar al nuevo huésped.');
        }
        setCustomers((prev) => {
          if (!createdCustomer) {
            return prev;
          }
          const id = createdCustomer._id || createdCustomer.id;
          if (!id || prev.some((item) => (item._id || item.id) === id)) {
            return prev;
          }
          return [
            ...prev,
            {
              ...createdCustomer,
              contacts: createdCustomer.contacts || payload.contacts || [],
              taxInfo: createdCustomer.taxInfo || payload.taxInfo,
            },
          ];
        });
        setForm((prev) => ({
          ...prev,
          guestTaxType: preparedTaxType,
          guestTaxId: preparedTaxId,
          guestTaxName: preparedTaxName,
        }));
      }

      const addons = additionalServiceIds
        .map((serviceId) => {
          const service = findServiceById(serviceId);
          if (!service) {
            return null;
          }
          const price = Number(service.price ?? 0);
          return {
            name: service.name,
            price: Number.isFinite(price) ? price : 0,
            quantity: 1,
          };
        })
        .filter(Boolean);

      const appointmentPayload = {
        customerId,
        serviceId: primaryServiceId,
        resourceId: room.id,
        startTime: startIso,
        endTime: endIso,
        status: 'confirmed',
        notes: form.notes || undefined,
        addons: addons.length ? addons : undefined,
        metadata: additionalServiceIds.length
          ? { quickCheckInExtras: additionalServiceIds }
          : undefined,
      };

      const appointmentResponse = await fetchApi('/appointments', {
        method: 'POST',
        body: JSON.stringify(appointmentPayload),
      });

      const primaryAppointment =
        appointmentResponse?.data || appointmentResponse?.appointment || appointmentResponse;

      if (!primaryAppointment?._id && !primaryAppointment?.id) {
        throw new Error('No pudimos crear la cita principal.');
      }

      if (wantsPayment) {
        try {
          const appointmentId = primaryAppointment._id || primaryAppointment.id;

          // Determinar el estado del pago basado en el método
          // Efectivo y POS se confirman inmediatamente porque el dinero ya se recibió
          // Transferencias, Zelle, etc. requieren verificación
          const isInstantPayment = payment.method === 'efectivo' || payment.method === 'pos';
          const paymentStatus = isInstantPayment ? 'confirmed' : 'submitted';

          await fetchApi(`/appointments/${appointmentId}/manual-deposits`, {
            method: 'POST',
            body: JSON.stringify({
              amount: paymentAmount,
              currency: payment.currency,
              method: payment.method === PAYMENT_METHOD_UNSET ? undefined : payment.method,
              reference: payment.reference?.trim() || undefined,
              status: paymentStatus,
              notes:
                payment.notes?.trim() ||
                (payment.mode === 'full'
                  ? 'Pago registrado al momento del check-in'
                  : 'Depósito registrado al momento del check-in'),
            }),
          });
          triggerAccountingRefresh();
          toast.success(
            payment.mode === 'full'
              ? 'Pago completo registrado.'
              : 'Depósito registrado correctamente.',
          );
        } catch (depositError) {
          console.error('Error creating manual deposit:', depositError);
          toast.error('La reserva se creó, pero no pudimos registrar el depósito.');
        }
      }

      onSuccess({
        appointment: primaryAppointment,
        room,
        customerId,
        guestName,
        checkIn: startIso,
        checkOut: endIso,
        servicesSelected: [primaryServiceId, ...additionalServiceIds],
      });

      onOpenChange(false);
      toast.success('Check-in walk-in registrado.');
    } catch (err) {
      console.error('Error creating walk-in check-in:', err);
      toast.error(err.message || 'No pudimos registrar el check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl sm:max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-in rápido</DialogTitle>
          <DialogDescription>
            Registra un huésped walk-in y asigna la habitación{' '}
            <span className="font-semibold text-foreground">{roomName}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={customerMode} onValueChange={setCustomerMode}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="existing">Cliente existente</TabsTrigger>
              <TabsTrigger value="new">Nuevo huésped</TabsTrigger>
            </TabsList>
            <TabsContent value="existing" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Cliente</Label>
                <Select
                  value={form.customerId || undefined}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, customerId: value }))}
                  disabled={initializing || submitting}
                  required={customerMode === 'existing'}
                >
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => {
                      const id = customer._id || customer.id;
                      return (
                        <SelectItem key={id} value={id}>
                          {customer.name}
                          {customer.phone ? ` · ${customer.phone}` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
            <TabsContent value="new" className="pt-4">
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                <div className="space-y-2 md:col-span-2 lg:col-span-2">
                  <Label htmlFor="guestName">Nombre del huésped *</Label>
                  <Input
                    id="guestName"
                    value={form.guestName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestName: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="Nombre y apellido"
                    required={customerMode === 'new'}
                  />
                </div>
                <div className="space-y-2 md:col-span-1 lg:col-span-2">
                  <Label>Documento</Label>
                  <div className="flex overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
                    <Select
                      value={form.guestTaxType}
                      onValueChange={(value) =>
                        setForm((prev) => ({ ...prev, guestTaxType: value }))
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger
                        id="guestTaxType"
                        className="w-20 rounded-none border-none border-r border-input"
                      >
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="V">V</SelectItem>
                        <SelectItem value="E">E</SelectItem>
                        <SelectItem value="J">J</SelectItem>
                        <SelectItem value="G">G</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      id="guestTaxId"
                      value={form.guestTaxId}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, guestTaxId: event.target.value }))
                      }
                      disabled={submitting}
                      placeholder="V-12345678"
                      className="flex-1 rounded-none border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-1 lg:col-span-2">
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={form.guestEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestEmail: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2 md:col-span-1 lg:col-span-2">
                  <Label htmlFor="guestPhone">Teléfono</Label>
                  <Input
                    id="guestPhone"
                    value={form.guestPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestPhone: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="+58 412 1234567"
                  />
                </div>
                <div className="space-y-2 md:col-span-3 lg:col-span-4">
                  <Label htmlFor="guestTaxName">Nombre fiscal</Label>
                  <Input
                    id="guestTaxName"
                    value={form.guestTaxName}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestTaxName: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="Razón social o nombre en factura"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label>Servicios opcionales</Label>
            <div className="rounded-md border border-border/60 bg-muted/10">
              {services.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No hay servicios configurados todavía. Registra servicios de hospedaje y upsells en la sección Servicios.
                </p>
              ) : (
                services.map((service) => {
                  const id = service._id || service.id;
                  const selectedIds = form.selectedServiceIds || [];
                  const checked = selectedIds.includes(id);
                  return (
                    <label
                      key={id}
                      htmlFor={`service-${id}`}
                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm transition hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id={`service-${id}`}
                          checked={checked}
                          onCheckedChange={(isChecked) =>
                            setForm((prev) => {
                              const current = prev.selectedServiceIds || [];
                              if (isChecked === true) {
                                return { ...prev, selectedServiceIds: [...current, id] };
                              }
                              return {
                                ...prev,
                                selectedServiceIds: current.filter((item) => item !== id),
                              };
                            })
                          }
                          disabled={submitting}
                        />
                        <span className="font-medium text-foreground">{service.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {service.duration ? `${service.duration} min` : null}
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            {defaultService && (
              <p className="text-xs text-muted-foreground">
                Si no seleccionas ninguno, usaremos el servicio base{' '}
                <span className="font-medium text-foreground">{defaultService.name}</span>.
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="checkIn">Check-in</Label>
              <Input
                id="checkIn"
                type="datetime-local"
                value={form.checkIn}
                onChange={(event) => setForm((prev) => ({ ...prev, checkIn: event.target.value }))}
                disabled={submitting}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOut">Check-out</Label>
              <Input
                id="checkOut"
                type="datetime-local"
                value={form.checkOut}
                onChange={(event) => setForm((prev) => ({ ...prev, checkOut: event.target.value }))}
                disabled={submitting}
                required
              />
            </div>
          </div>

          {/* Resumen de costos */}
          {staySummary.total > 0 && (
            <div className="rounded-lg border-2 border-primary/20 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Resumen de costos</h3>
                <div className="text-sm text-muted-foreground">
                  {staySummary.nights} {staySummary.nights === 1 ? 'noche' : 'noches'}
                </div>
              </div>

              <div className="space-y-2">
                {/* Servicio base */}
                {staySummary.primaryService && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {staySummary.primaryService.name}
                      {staySummary.nights > 1 && ` × ${staySummary.nights}`}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(staySummary.baseTotal, staySummary.currency)}
                    </span>
                  </div>
                )}

                {/* Servicios adicionales */}
                {staySummary.additionalServiceIds.length > 0 && (
                  <>
                    {staySummary.additionalServiceIds.map((serviceId) => {
                      const service = findServiceById(serviceId);
                      if (!service) return null;
                      const price = Number(service.price ?? 0);
                      return (
                        <div key={serviceId} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{service.name}</span>
                          <span className="font-medium">
                            {formatCurrency(price, staySummary.currency)}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}

                <div className="border-t border-primary/20 pt-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold">Total a cobrar</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(staySummary.total, staySummary.currency)}
                    </span>
                  </div>

                  {/* Conversión a VES si está disponible y el total es en USD */}
                  {bcvRate && staySummary.currency === 'USD' && (
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-muted-foreground">Equivalente en Bs.</span>
                      <span className="font-semibold text-muted-foreground">
                        {formatCurrency(staySummary.total * bcvRate, 'VES')}
                      </span>
                    </div>
                  )}

                  {/* Conversión a USD si está disponible y el total es en VES */}
                  {bcvRate && staySummary.currency === 'VES' && (
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-muted-foreground">Equivalente en USD</span>
                      <span className="font-semibold text-muted-foreground">
                        {formatCurrency(staySummary.total / bcvRate, 'USD')}
                      </span>
                    </div>
                  )}

                  {bcvRate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Tasa BCV: {formatCurrency(bcvRate, 'VES')}/USD
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas internas</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder="Preferencias, solicitud especial, motivo walk-in..."
              disabled={submitting}
              rows={3}
            />
          </div>

          <div className="space-y-4 rounded-lg border border-border/60 bg-muted/5 p-4">
            <div>
              <Label>Pago o depósito</Label>
              <p className="text-xs text-muted-foreground">
                Registra un monto recibido en este momento. Puedes dejarlo en blanco si cobrarás más tarde.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label htmlFor="paymentMode">Tipo de cobro</Label>
                <Select
                  value={payment.mode}
                  onValueChange={(value) =>
                    setPayment((prev) => {
                      if (value === 'none') {
                        autoAmountRef.current = null;
                        return {
                          ...PAYMENT_DEFAULTS,
                          mode: 'none',
                          currency: staySummary.currency || PAYMENT_DEFAULTS.currency,
                        };
                      }
                      const suggestedAmount =
                        staySummary.total > 0
                          ? staySummary.total.toFixed(2)
                          : '';
                      const shouldApplySuggested =
                        !prev.amount || prev.mode === 'none' || prev.amount === autoAmountRef.current;
                      const nextAmount =
                        shouldApplySuggested && suggestedAmount
                          ? suggestedAmount
                          : prev.amount;
                      if (shouldApplySuggested && suggestedAmount) {
                        autoAmountRef.current = suggestedAmount;
                      }
                      return {
                        ...prev,
                        mode: value,
                        amount: nextAmount,
                        currency: staySummary.currency || prev.currency,
                      };
                    })
                  }
                  disabled={submitting}
                >
                  <SelectTrigger id="paymentMode">
                    <SelectValue placeholder="Selecciona" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin registrar ahora</SelectItem>
                    <SelectItem value="deposit">Registrar depósito</SelectItem>
                    <SelectItem value="full">Pago completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentAmount">Monto</Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.amount}
                  onChange={(event) => {
                    autoAmountRef.current = null;
                    setPayment((prev) => ({ ...prev, amount: event.target.value }));
                  }}
                  disabled={submitting || payment.mode === 'none'}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="paymentCurrency">Moneda</Label>
                <Select
                  value={payment.currency}
                  onValueChange={(value) => setPayment((prev) => ({ ...prev, currency: value }))}
                  disabled={submitting || payment.mode === 'none'}
                >
                  <SelectTrigger id="paymentCurrency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_OPTIONS.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="paymentMethod">Método</Label>
                <Select
                  value={payment.method}
                  onValueChange={(value) => setPayment((prev) => ({ ...prev, method: value }))}
                  disabled={submitting || payment.mode === 'none'}
                >
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Selecciona el método" />
                  </SelectTrigger>
                  <SelectContent>
                <SelectItem value={PAYMENT_METHOD_UNSET}>Sin definir</SelectItem>
                    {PAYMENT_METHOD_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="paymentReference">Referencia</Label>
                <Input
                  id="paymentReference"
                  value={payment.reference}
                  onChange={(event) =>
                    setPayment((prev) => ({ ...prev, reference: event.target.value }))
                  }
                  disabled={submitting || payment.mode === 'none'}
                  placeholder="Número de referencia o comprobante"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentNotes">Notas del pago</Label>
              <Textarea
                id="paymentNotes"
                value={payment.notes}
                onChange={(event) =>
                  setPayment((prev) => ({ ...prev, notes: event.target.value }))
                }
                disabled={submitting || payment.mode === 'none'}
                placeholder="Detalle adicional sobre el pago o depósito"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || initializing}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Guardando
                </>
              ) : (
                'Confirmar check-in'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

QuickCheckInDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onOpenChange: PropTypes.func.isRequired,
  room: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
  }),
  onSuccess: PropTypes.func.isRequired,
};
