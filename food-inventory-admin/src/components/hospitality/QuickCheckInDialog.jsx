import { useEffect, useMemo, useState } from 'react';
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

export default function QuickCheckInDialog({ open, onOpenChange, room = null, onSuccess }) {
  const [initializing, setInitializing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [defaultService, setDefaultService] = useState(null);
  const [customerMode, setCustomerMode] = useState('existing');
  const [form, setForm] = useState({
    customerId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    selectedServiceIds: [],
    checkIn: '',
    checkOut: '',
    notes: '',
  });

  const roomName = useMemo(() => {
    if (!room) {
      return '';
    }
    return room.name || `Habitación ${room.id}`;
  }, [room]);

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

    async function loadData() {
      try {
        const [customersResponse, servicesResponse] = await Promise.all([
          fetchApi('/customers?limit=100&page=1', { signal: controller.signal }),
          fetchApi('/services/active', { signal: controller.signal }),
        ]);
        if (!isMounted) {
          return;
        }
        const customerList = normalizeListResponse(customersResponse);
        const serviceListRaw = normalizeListResponse(servicesResponse);
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
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        customerId: '',
      }));
    }
  }, [customerMode, open]);

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
    const selectedServices = Array.isArray(form.selectedServiceIds)
      ? form.selectedServiceIds.filter(Boolean)
      : [];

    const primaryServiceId =
      selectedServices[0] ||
      defaultService?._id ||
      defaultService?.id ||
      (services[0]?._id || services[0]?.id) ||
      null;

    if (!primaryServiceId) {
      toast.error('Configura al menos un servicio base para completar el check-in.');
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
        const payload = {
          name: form.guestName.trim(),
          email: form.guestEmail?.trim() || undefined,
          phone: form.guestPhone?.trim() || undefined,
          customerType: 'customer',
          tags: ['hospitality', 'walk-in'],
        };
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
          return [...prev, createdCustomer];
        });
      }

      const appointmentsCreated = [];

      const createAppointment = async (serviceId) => {
        const appointmentPayload = {
          customerId,
          serviceId,
          resourceId: room.id,
          startTime: startIso,
          endTime: endIso,
          status: 'confirmed',
          notes: form.notes || undefined,
        };

        const response = await fetchApi('/appointments', {
          method: 'POST',
          body: JSON.stringify(appointmentPayload),
        });

        const normalized = response?.data || response?.appointment || response;
        appointmentsCreated.push(normalized);
        return normalized;
      };

      const primaryAppointment = await createAppointment(primaryServiceId);

      const additionalServices = selectedServices.slice(primaryServiceId === selectedServices[0] ? 1 : 0);

      for (const extraServiceId of additionalServices) {
        try {
          await createAppointment(extraServiceId);
        } catch (extraError) {
          console.error('Error creating additional service appointment:', extraError);
          toast.error('No pudimos crear una de las reservas adicionales.');
        }
      }

      onSuccess({
        appointment: primaryAppointment,
        room,
        customerId,
        guestName,
        checkIn: startIso,
        checkOut: endIso,
        appointmentsCreated,
        servicesSelected: selectedServices,
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
      <DialogContent className="max-w-xl">
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
            <TabsContent value="new" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Nombre del huésped</Label>
                <Input
                  id="guestName"
                  value={form.guestName}
                  onChange={(event) => setForm((prev) => ({ ...prev, guestName: event.target.value }))}
                  disabled={submitting}
                  placeholder="Nombre y apellido"
                  required={customerMode === 'new'}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email</Label>
                  <Input
                    id="guestEmail"
                    type="email"
                    value={form.guestEmail}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestEmail: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">Teléfono</Label>
                  <Input
                    id="guestPhone"
                    value={form.guestPhone}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, guestPhone: event.target.value }))
                    }
                    disabled={submitting}
                    placeholder="Opcional"
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
