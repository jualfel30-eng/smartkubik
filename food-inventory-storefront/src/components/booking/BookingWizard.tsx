'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  BookingService,
  AvailabilitySlot,
  BookingAddonPayload,
  CreateBookingPayload,
  CreateBookingResponse,
} from '@/types';
import {
  createBooking,
  getServiceAvailability,
} from '@/lib/api';

type WizardStep = 1 | 2 | 3 | 4;

interface BookingWizardProps {
  tenantId: string;
  domain: string;
  services: BookingService[];
  categories: string[];
  primaryColor?: string;
  allowGuestCount?: boolean;
  secondaryColor?: string;
  language?: string;
  whatsappLink?: string;
}

interface FormState {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  preferredLanguage?: string;
  notes?: string;
  partySize: number;
  acceptPolicies: boolean;
}

interface SubmissionState {
  status: 'idle' | 'submitting' | 'success' | 'error';
  error?: string;
  result?: CreateBookingResponse;
}

const DEFAULT_FORM: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: '',
  partySize: 1,
  acceptPolicies: true,
};

function isValidEmail(email: string): boolean {
  return /^[\w-.]+@[\w-]+\.[A-Za-z]{2,}$/.test(email);
}

export default function BookingWizard({
  tenantId,
  domain,
  services,
  categories,
  primaryColor = '#2563eb',
  secondaryColor = '#1d4ed8',
  allowGuestCount = true,
  language = 'es-VE',
  whatsappLink,
}: BookingWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<BookingService | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState<boolean>(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [selectedAddons, setSelectedAddons] = useState<Record<string, BookingAddonPayload>>({});
  const [submission, setSubmission] = useState<SubmissionState>({ status: 'idle' });
  const locale = language || 'es-VE';

  const filteredServices = useMemo(() => {
    if (selectedCategory === 'all') {
      return services;
    }
    return services.filter((service) => service.category === selectedCategory);
  }, [selectedCategory, services]);

  const serviceCategories = useMemo(() => {
    const base = Array.from(new Set(services.map((service) => service.category).filter(Boolean)));
    const merged = new Set([...(categories || []), ...base]);
    return ['all', ...Array.from(merged)];
  }, [services, categories]);

  const formatSlot = useCallback(
    (slot: AvailabilitySlot): string => {
      const start = new Date(slot.start);
      const end = new Date(slot.end);
      return `${start.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })} - ${end.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    },
    [locale],
  );

  const shareLink = useMemo(() => {
    const basePath = `/${domain}/reservations`;
    const query = `?email=${encodeURIComponent(form.email || '')}`;
    if (typeof window === 'undefined') {
      return `${basePath}${query}`;
    }
    const url = new URL(basePath, window.location.origin);
    if (form.email) {
      url.searchParams.set('email', form.email);
    }
    return url.toString();
  }, [domain, form.email]);

  const handleSelectService = useCallback((service: BookingService) => {
    setSelectedService(service);
    setStep(2);
    setSelectedSlot(null);
    setSelectedDate('');
    setAvailability([]);
    setAvailabilityError(null);
    setSelectedAddons({});
  }, []);

  const handleFetchAvailability = useCallback(
    async (date: string) => {
      if (!selectedService || !date) return;
      try {
        setAvailabilityLoading(true);
        setAvailabilityError(null);
        setAvailability([]);

        const slots = await getServiceAvailability({
          tenantId,
          serviceId: selectedService._id,
          date,
          capacity: allowGuestCount ? form.partySize : undefined,
        });

        setAvailability(slots);
        if (!slots.length) {
          setAvailabilityError('No hay horarios disponibles para la fecha seleccionada.');
        }
      } catch (error: any) {
        setAvailabilityError(error?.message || 'No se pudo obtener disponibilidad.');
      } finally {
        setAvailabilityLoading(false);
      }
    },
    [selectedService, tenantId, form.partySize, allowGuestCount],
  );

  const handleDateChange = useCallback(
    (value: string) => {
      setSelectedDate(value);
      setSelectedSlot(null);
      if (value) {
        void handleFetchAvailability(value);
      } else {
        setAvailability([]);
      }
    },
    [handleFetchAvailability],
  );

  const handleAddonToggle = useCallback(
    (addonName: string, checked: boolean, basePrice: number) => {
      setSelectedAddons((prev) => {
        const next = { ...prev };
        if (checked) {
          next[addonName] = {
            name: addonName,
            price: basePrice,
            quantity: 1,
          };
        } else {
          delete next[addonName];
        }
        return next;
      });
    },
    [],
  );

  const handleAddonQuantity = useCallback((addonName: string, quantity: number) => {
    setSelectedAddons((prev) => {
      if (!prev[addonName]) return prev;
      return {
        ...prev,
        [addonName]: {
          ...prev[addonName],
          quantity: Math.max(1, quantity),
        },
      };
    });
  }, []);

  const validateStep = useCallback(() => {
    if (step === 1) {
      if (!selectedService) {
        return 'Selecciona un servicio para continuar.';
      }
    }
    if (step === 2) {
      if (!selectedDate) {
        return 'Selecciona una fecha.';
      }
      if (!selectedSlot) {
        return 'Selecciona un horario disponible.';
      }
    }
    if (step === 3) {
      if (!form.firstName.trim()) {
        return 'Ingresa el nombre del huésped.';
      }
      if (!form.email.trim() || !isValidEmail(form.email)) {
        return 'Ingresa un correo electrónico válido.';
      }
      if (!form.phone.trim()) {
        return 'Ingresa un teléfono de contacto.';
      }
      if (allowGuestCount && form.partySize < 1) {
        return 'La cantidad de huéspedes debe ser al menos 1.';
      }
      if (
        allowGuestCount &&
        selectedService &&
        form.partySize > (selectedService.maxSimultaneous || 1)
      ) {
        return `La capacidad máxima para este servicio es ${selectedService.maxSimultaneous}.`;
      }
      if (!form.acceptPolicies) {
        return 'Debes aceptar las políticas para continuar.';
      }
    }
    return null;
  }, [step, selectedService, selectedDate, selectedSlot, form, allowGuestCount]);

  const handleNext = useCallback(() => {
    const error = validateStep();
    if (error) {
      setSubmission({ status: 'error', error });
      return;
    }
    setSubmission({ status: 'idle' });
    setStep((prev) => (Math.min(prev + 1, 4) as WizardStep));
  }, [validateStep]);

  const handlePrevious = useCallback(() => {
    if (step === 1) return;
    setSubmission({ status: 'idle' });
    setStep((prev) => (Math.max(prev - 1, 1) as WizardStep));
  }, [step]);

  const totalAddonsPrice = useMemo(() => {
    return Object.values(selectedAddons).reduce((sum, addon) => {
      const addonPrice = addon.price ?? 0;
      const qty = addon.quantity ?? 1;
      return sum + addonPrice * qty;
    }, 0);
  }, [selectedAddons]);

  const estimatedTotal = useMemo(() => {
    if (!selectedService) return 0;
    const base = selectedService.price || 0;
    return base + totalAddonsPrice;
  }, [selectedService, totalAddonsPrice]);

  const handleSubmit = useCallback(async () => {
    const error = validateStep();
    if (error) {
      setSubmission({ status: 'error', error });
      return;
    }

    if (!selectedService || !selectedSlot) {
      setSubmission({
        status: 'error',
        error: 'Faltan datos de la reserva. Vuelve a intentar.',
      });
      return;
    }

    const payload: CreateBookingPayload = {
      tenantId,
      serviceId: selectedService._id,
      startTime: selectedSlot.start,
      notes: form.notes,
      partySize: allowGuestCount ? form.partySize : undefined,
      customer: {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        preferredLanguage: form.preferredLanguage,
      },
      addons: Object.values(selectedAddons),
      metadata: {
        storefrontDomain: domain,
        bookedFrom: 'public_portal',
      },
      acceptPolicies: form.acceptPolicies,
    };

    try {
      setSubmission({ status: 'submitting' });
      const result = await createBooking(payload);
      setSubmission({ status: 'success', result });
      setStep(4);
    } catch (err: any) {
      setSubmission({
        status: 'error',
        error: err?.message || 'No fue posible completar la reserva.',
      });
    }
  }, [
    validateStep,
    selectedService,
    selectedSlot,
    tenantId,
    form,
    selectedAddons,
    domain,
    allowGuestCount,
  ]);

  const handleReset = useCallback(() => {
    setStep(1);
    setSelectedService(null);
    setSelectedDate('');
    setAvailability([]);
    setSelectedSlot(null);
    setForm(DEFAULT_FORM);
    setSelectedAddons({});
    setSubmission({ status: 'idle' });
  }, []);

  return (
    <div
      className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden"
      style={{
        borderColor: `${primaryColor}30`,
        boxShadow: `0 20px 45px -20px ${secondaryColor}55`,
      }}
    >
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">
          Reserva tu experiencia
        </h1>
        <span
          className="px-3 py-1 text-sm font-medium text-white rounded-full"
          style={{ backgroundColor: primaryColor }}
        >
          Paso {step} de 4
        </span>
      </div>

      <div className="px-6 py-6 space-y-6">
        {submission.status === 'error' && submission.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {submission.error}
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Selecciona un servicio
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Elige la experiencia que deseas reservar. Puedes filtrar por categoría para encontrarla más rápido.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {serviceCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full border text-sm transition ${
                    selectedCategory === category
                      ? 'text-white'
                      : 'text-gray-700 hover:border-gray-400'
                  }`}
                  style={
                    selectedCategory === category
                      ? { backgroundColor: primaryColor, borderColor: primaryColor }
                      : {}
                  }
                >
                  {category === 'all' ? 'Todos' : category}
                </button>
              ))}
            </div>

            {filteredServices.length === 0 ? (
              <div className="text-center text-gray-500 border border-dashed border-gray-300 rounded-lg p-6">
                No hay servicios disponibles en esta categoría por ahora.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredServices.map((service) => (
                  <button
                    key={service._id}
                    onClick={() => handleSelectService(service)}
                    className={`text-left border rounded-xl p-4 shadow-sm hover:shadow-md transition ${
                      selectedService?._id === service._id
                        ? 'ring-2 ring-offset-2'
                        : ''
                    }`}
                    style={
                      selectedService?._id === service._id
                        ? { borderColor: primaryColor, boxShadow: `0 0 0 2px ${primaryColor}40` }
                        : {}
                    }
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {service.name}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-3">
                          {service.description || 'Sin descripción.'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          {service.duration} min
                        </p>
                        <p className="text-lg font-semibold text-gray-900 mt-1">
                          ${service.price.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {service.addons?.length ? (
                      <p className="text-xs text-gray-500 mt-3">
                        {service.addons.length} extra(s) disponible(s)
                      </p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && selectedService && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  Elige fecha y horario
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Consulta los horarios disponibles para {selectedService.name}.
                </p>
              </div>
              <button
                onClick={() => setStep(1)}
                className="text-sm font-medium text-gray-500 hover:text-gray-700 underline"
              >
                Cambiar servicio
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Fecha
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {allowGuestCount && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">
                    Número de huéspedes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={selectedService.maxSimultaneous || 1}
                    value={form.partySize}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        partySize: Number(e.target.value) || 1,
                      }))
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500">
                    Máximo permitido: {selectedService.maxSimultaneous || 1}
                  </p>
                </div>
              )}
            </div>

            {availabilityLoading ? (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-6 text-center text-gray-500">
                Consultando disponibilidad...
              </div>
            ) : availabilityError ? (
              <div className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3 rounded-lg">
                {availabilityError}
              </div>
            ) : availability.length > 0 ? (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Horarios disponibles
                </h3>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {availability.map((slot) => {
                    const isSelected =
                      selectedSlot?.start === slot.start && selectedSlot?.end === slot.end;
                    return (
                      <button
                        key={`${slot.start}-${slot.end}`}
                        onClick={() => setSelectedSlot(slot)}
                        className={`border rounded-lg px-3 py-2 text-sm transition ${
                          isSelected
                            ? 'text-white'
                            : 'text-gray-700 hover:border-gray-400'
                        }`}
                        style={
                          isSelected
                            ? { backgroundColor: primaryColor, borderColor: primaryColor }
                            : {}
                        }
                      >
                        {formatSlot(slot)}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedDate ? (
              <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-lg p-6">
                Selecciona una fecha para ver horarios disponibles.
              </div>
            ) : (
              <div className="text-center text-gray-500 border border-dashed border-gray-200 rounded-lg p-6">
                Selecciona una fecha para consultar la disponibilidad.
              </div>
            )}

            {selectedService.addons.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">
                  Extras para tu experiencia
                </h3>
                <div className="space-y-2">
                  {selectedService.addons.map((addon) => {
                    const isChecked = Boolean(selectedAddons[addon.name]);
                    return (
                      <div
                        key={addon.name}
                        className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3"
                      >
                        <input
                          id={`addon-${addon.name}`}
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            handleAddonToggle(addon.name, e.target.checked, addon.price)
                          }
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label
                            htmlFor={`addon-${addon.name}`}
                            className="flex justify-between text-sm font-medium text-gray-700"
                          >
                            <span>{addon.name}</span>
                            <span>${addon.price.toFixed(2)}</span>
                          </label>
                          {addon.description && (
                            <p className="text-xs text-gray-500 mt-1">
                              {addon.description}
                            </p>
                          )}
                          {isChecked && (
                            <div className="flex items-center gap-3 mt-3">
                              <label className="text-xs text-gray-500">
                                Cantidad
                              </label>
                              <input
                                type="number"
                                min={1}
                                value={selectedAddons[addon.name]?.quantity ?? 1}
                                onChange={(e) =>
                                  handleAddonQuantity(
                                    addon.name,
                                    Number(e.target.value) || 1,
                                  )
                                }
                                className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                              />
                              {addon.duration ? (
                                <span className="text-xs text-gray-400">
                                  +{addon.duration} min
                                </span>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && selectedService && selectedSlot && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Datos del huésped
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Necesitamos estos datos para confirmar tu reserva y enviarte notificaciones.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, firstName: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nombre del huésped"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Apellido
                </label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, lastName: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Apellido del huésped"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Email *
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Correo electrónico"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Teléfono *
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="+58 ..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Idioma preferido
              </label>
              <input
                type="text"
                value={form.preferredLanguage || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, preferredLanguage: e.target.value }))
                }
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Ej: es, en"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Notas adicionales
              </label>
              <textarea
                value={form.notes || ''}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                placeholder="Cuéntanos si celebras algo especial o tienes preferencias."
              />
            </div>

            <label className="flex items-start gap-3 border border-gray-200 rounded-lg px-4 py-3">
              <input
                type="checkbox"
                checked={form.acceptPolicies}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, acceptPolicies: e.target.checked }))
                }
                className="mt-1"
              />
              <span className="text-sm text-gray-600">
                Acepto las políticas de reserva, cancelación y privacidad del establecimiento.
              </span>
            </label>
          </div>
        )}

        {/* Step 4 */}
        {step === 4 && submission.status === 'success' && submission.result && (
          <div className="space-y-6 text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-100 text-green-600 text-3xl">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-gray-800">
                ¡Reserva confirmada!
              </h2>
              <p className="text-gray-600">
                Te hemos enviado un correo con los detalles. Guarda tu código de cancelación por si necesitas reprogramar.
              </p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-6 py-5 text-left space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Cita</span>
                <span>{selectedService?.name}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Fecha</span>
                <span>
                  {new Date(submission.result.startTime).toLocaleDateString(locale)} •{' '}
                  {formatSlot({
                    start: submission.result.startTime,
                    end: submission.result.endTime,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Estado</span>
                <span className="font-medium capitalize">{submission.result.status}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Código de cancelación</span>
                <span className="font-mono font-semibold text-gray-800">
                  {submission.result.cancellationCode}
                </span>
              </div>
              {selectedService?.requiresDeposit && (
                <div className="border border-primary/30 bg-primary/5 text-sm text-left text-primary-900 px-4 py-3 rounded-lg space-y-3">
                  <p>
                    Se requiere depósito de {selectedService.depositType === 'percentage'
                      ? `${selectedService.depositAmount}%`
                      : `$${selectedService.depositAmount.toFixed(2)}`}
                    {' '}para confirmar. Recibirás el detalle de las cuentas autorizadas y deberás enviar el comprobante por WhatsApp para validarlo manualmente.
                  </p>
                  {whatsappLink && (
                    <a
                      href={`${whatsappLink}${whatsappLink.includes('?') ? '&' : '?'}text=${encodeURIComponent(
                        `Hola, quiero confirmar el depósito de mi reserva ${selectedService?.name} (${submission.result?.cancellationCode ?? ''})`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#25D366] text-white text-sm font-medium"
                    >
                      Enviar mensaje por WhatsApp
                    </a>
                  )}
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total estimado</span>
                <span className="font-semibold text-gray-800">
                  ${estimatedTotal.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                onClick={async () => {
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    try {
                      await navigator.clipboard.writeText(shareLink);
                      alert('Enlace copiado para compartir.');
                    } catch (error) {
                      console.warn('No fue posible copiar el enlace', error);
                    }
                  }
                }}
              >
                Copiar enlace
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: primaryColor }}
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    window.open(shareLink, '_blank');
                  }
                }}
              >
                Ver mis reservas
              </button>
            </div>
          </div>
        )}

        {/* Footer controls */}
        {step < 4 && (
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <button
              onClick={handlePrevious}
              disabled={step === 1 || submission.status === 'submitting'}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Atrás
            </button>

            {step < 3 ? (
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded-lg text-white font-medium shadow-sm"
                style={{ backgroundColor: primaryColor }}
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={submission.status === 'submitting'}
                className="px-5 py-2 rounded-lg text-white font-medium shadow-sm min-w-[150px] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                style={{ backgroundColor: primaryColor }}
              >
                {submission.status === 'submitting' ? (
                  <>
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Reservando...
                  </>
                ) : (
                  'Confirmar reserva'
                )}
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="flex justify-center gap-3 pt-4 border-t border-gray-100">
            <button
              onClick={handleReset}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Crear otra reserva
            </button>
            <a
              href={`/${domain}`}
              className="px-5 py-2 rounded-lg text-white font-medium shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              Volver al inicio
            </a>
          </div>
        )}
      </div>

      {selectedService && step < 4 && (
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Resumen provisional
          </h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
            <div>
              <p className="font-medium text-gray-700">Servicio</p>
              <p>{selectedService.name}</p>
            </div>
            {selectedSlot && (
              <div>
                <p className="font-medium text-gray-700">Horario</p>
                <p>
                  {new Date(selectedSlot.start).toLocaleDateString(locale)} • {formatSlot(selectedSlot)}
                </p>
              </div>
            )}
            <div>
              <p className="font-medium text-gray-700">Subtotal</p>
              <p>${(selectedService.price || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Extras</p>
              <p>${totalAddonsPrice.toFixed(2)}</p>
            </div>
            <div className="md:col-span-2">
              <p className="font-medium text-gray-700">Total estimado</p>
              <p className="text-lg font-semibold text-gray-900">
                ${estimatedTotal.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
