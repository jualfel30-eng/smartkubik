'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BookingLookupPayload,
  BookingSummary,
  RescheduleBookingPayload,
} from '@/types';
import {
  lookupBookings,
  cancelBooking,
  getServiceAvailability,
  rescheduleBooking,
} from '@/lib/api';
import { useSearchParams } from 'next/navigation';

interface BookingManagerProps {
  tenantId: string;
  domain: string;
  primaryColor?: string;
  whatsappLink?: string;
}

interface LookupFormState {
  email: string;
  phone: string;
  cancellationCode: string;
  includePast: boolean;
}

interface RescheduleState {
  isOpen: boolean;
  selectedDate: string;
  selectedSlot?: { start: string; end: string };
  slots: { start: string; end: string }[];
  loading: boolean;
  error?: string;
  success?: string;
}

interface AlertState {
  type: 'success' | 'error';
  message: string;
}

const DEFAULT_FORM: LookupFormState = {
  email: '',
  phone: '',
  cancellationCode: '',
  includePast: false,
};

export default function BookingManager({ tenantId, domain, primaryColor = '#2563eb', whatsappLink }: BookingManagerProps) {
  const [form, setForm] = useState<LookupFormState>(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [alert, setAlert] = useState<AlertState | null>(null);
  const [rescheduleMap, setRescheduleMap] = useState<Record<string, RescheduleState>>({});
  const [fetchAttempted, setFetchAttempted] = useState(false);
  const searchParams = useSearchParams();

  const hasResults = bookings.length > 0;

  const resetRescheduleEntry = useCallback(() => ({
    isOpen: false,
    selectedDate: '',
    selectedSlot: undefined,
    slots: [],
    loading: false,
    error: undefined,
    success: undefined,
  }), []);

  const openReschedule = useCallback((bookingId: string) => {
    setRescheduleMap((prev) => ({
      ...prev,
      [bookingId]: {
        ...resetRescheduleEntry(),
        isOpen: true,
      },
    }));
  }, [resetRescheduleEntry]);

  const closeReschedule = useCallback((bookingId: string) => {
    setRescheduleMap((prev) => ({
      ...prev,
      [bookingId]: {
        ...resetRescheduleEntry(),
      },
    }));
  }, [resetRescheduleEntry]);

  const updateReschedule = useCallback((bookingId: string, updates: Partial<RescheduleState>) => {
    setRescheduleMap((prev) => ({
      ...prev,
      [bookingId]: {
        ...resetRescheduleEntry(),
        ...prev[bookingId],
        ...updates,
      },
    }));
  }, [resetRescheduleEntry]);

  const handleLookup = useCallback(async () => {
    setFetchAttempted(true);
    setAlert(null);

    const payload: BookingLookupPayload = {
      tenantId,
      email: form.email.trim(),
      phone: form.phone.trim() || undefined,
      cancellationCode: form.cancellationCode.trim() || undefined,
      includePast: form.includePast,
    };

    if (!payload.email) {
      setAlert({ type: 'error', message: 'Ingresa un correo electrónico para buscar tus reservas.' });
      return;
    }

    try {
      setLoading(true);
      const result = await lookupBookings(payload);
      setBookings(result);
      setAlert(result.length ? null : { type: 'error', message: 'No encontramos reservas con los datos proporcionados.' });
    } catch (error: any) {
      setAlert({ type: 'error', message: error?.message || 'No fue posible consultar tus reservas.' });
    } finally {
      setLoading(false);
    }
  }, [form, tenantId]);

  const handleCancel = useCallback(async (booking: BookingSummary) => {
    try {
      setAlert(null);
      setLoading(true);
      await cancelBooking(booking.appointmentId, {
        tenantId,
        cancellationCode: booking.cancellationCode || form.cancellationCode || '',
        reason: 'Cancelado desde portal huésped',
      });
      setAlert({ type: 'success', message: 'Reserva cancelada exitosamente.' });
      await handleLookup();
    } catch (error: any) {
      setAlert({ type: 'error', message: error?.message || 'No se pudo cancelar la reserva.' });
    } finally {
      setLoading(false);
    }
  }, [form.cancellationCode, handleLookup, tenantId]);

  const handleDateChange = useCallback(async (booking: BookingSummary, value: string) => {
    if (!booking.serviceId) {
      updateReschedule(booking.appointmentId, {
        isOpen: true,
        loading: false,
        error: 'Este servicio no admite reprogramación en línea. Contáctanos para recibir asistencia.',
        selectedDate: value,
        slots: [],
        selectedSlot: undefined,
      });
      return;
    }

    updateReschedule(booking.appointmentId, {
      selectedDate: value,
      loading: true,
      error: undefined,
      slots: [],
      selectedSlot: undefined,
    });

    if (!value) {
      updateReschedule(booking.appointmentId, {
        loading: false,
      });
      return;
    }

    try {
      const slots = await getServiceAvailability({
        tenantId,
        serviceId: booking.serviceId || '',
        date: value,
        capacity: booking.capacity,
      });

      updateReschedule(booking.appointmentId, {
        slots,
        loading: false,
        error: slots.length ? undefined : 'No hay horarios disponibles en esa fecha.',
      });
    } catch (error: any) {
      updateReschedule(booking.appointmentId, {
        loading: false,
        error: error?.message || 'No fue posible obtener los horarios disponibles.',
      });
    }
  }, [tenantId, updateReschedule]);

  const handleReschedule = useCallback(async (booking: BookingSummary, state: RescheduleState) => {
    if (!booking.serviceId) {
      updateReschedule(booking.appointmentId, {
        error: 'Este servicio no puede reprogramarse automáticamente. Contáctanos para recibir ayuda.',
      });
      return;
    }

    if (!state.selectedSlot) {
      updateReschedule(booking.appointmentId, {
        error: 'Selecciona un horario disponible para reprogramar.',
      });
      return;
    }

    const payload: RescheduleBookingPayload = {
      tenantId,
      newStartTime: state.selectedSlot.start,
      cancellationCode: booking.cancellationCode || form.cancellationCode || '',
    };

    try {
      updateReschedule(booking.appointmentId, { loading: true, error: undefined, success: undefined });
      await rescheduleBooking(booking.appointmentId, payload);
      updateReschedule(booking.appointmentId, {
        loading: false,
        success: 'Reserva reprogramada exitosamente.',
      });
      await handleLookup();
    } catch (error: any) {
      updateReschedule(booking.appointmentId, {
        loading: false,
        error: error?.message || 'No fue posible reprogramar la reserva.',
      });
    }
  }, [form.cancellationCode, handleLookup, tenantId, updateReschedule]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    void handleLookup();
  }, [handleLookup]);

  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (!emailParam) return;

    setForm((prev) => ({ ...prev, email: emailParam }));
    setFetchAttempted(false);

    void (async () => {
      try {
        setLoading(true);
        const payload: BookingLookupPayload = { tenantId, email: emailParam };
        const result = await lookupBookings(payload);
        setBookings(result);
        setAlert(result.length ? null : { type: 'error', message: 'No encontramos reservas con el correo proporcionado.' });
      } catch (error: any) {
        setAlert({ type: 'error', message: error?.message || 'No fue posible consultar tus reservas.' });
      } finally {
        setLoading(false);
        setFetchAttempted(true);
      }
    })();
  }, [searchParams, tenantId]);

  const bannerMessage = useMemo(() => {
    if (!fetchAttempted) return 'Ingresa tu correo para consultar tus reservas.';
    if (loading) return 'Buscando reservas, por favor espera...';
    if (hasResults) return 'Selecciona una reserva para cancelarla o reprogramarla.';
    return 'No encontramos reservas. Verifica tus datos o intenta con otro correo.';
  }, [fetchAttempted, loading, hasResults]);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 bg-gray-50">
        <h1 className="text-xl font-semibold text-gray-800">Gestiona tus reservas</h1>
        <p className="text-sm text-gray-500 mt-1">Consulta, reprograma o cancela tus próximas citas utilizando el correo con el que reservaste.</p>
        {whatsappLink && (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-3 text-sm text-[#25D366] hover:text-[#1ebe5d]"
          >
            ¿Necesitas ayuda? Escríbenos por WhatsApp
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Correo electrónico *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="tu@correo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Teléfono</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Opcional, ayuda a validar tu reserva"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Código de cancelación</label>
            <input
              type="text"
              value={form.cancellationCode}
              onChange={(e) => setForm((prev) => ({ ...prev, cancellationCode: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="CNL-XXXXXX (opcional)"
            />
          </div>
          <label className="flex items-center gap-3 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={form.includePast}
              onChange={(e) => setForm((prev) => ({ ...prev, includePast: e.target.checked }))}
              className="h-4 w-4"
            />
            Mostrar reservas pasadas
          </label>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-lg text-white font-medium shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            style={{ backgroundColor: primaryColor }}
          >
            {loading ? 'Buscando...' : 'Buscar reservas'}
          </button>
        </div>
      </form>

      <div className="px-6 pb-6 space-y-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-600">
          {bannerMessage}
        </div>

        {alert && (
          <div
            className={`px-4 py-3 rounded-lg text-sm ${
              alert.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {alert.message}
          </div>
        )}

        {hasResults && (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const rescheduleState = rescheduleMap[booking.appointmentId] || resetRescheduleEntry();
              const startDate = new Date(booking.startTime);
              const endDate = new Date(booking.endTime);
              return (
                <div
                  key={booking.appointmentId}
                  className="border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-1">
                      <p className="text-sm uppercase tracking-wide text-gray-400">{booking.serviceName}</p>
                      <h3 className="text-lg font-semibold text-gray-800">
                        {startDate.toLocaleDateString()} • {startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Termina {endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <p className="text-sm text-gray-500">Estado: <span className="font-medium capitalize">{booking.status}</span></p>
                      {booking.cancellationCode && (
                        <p className="text-xs text-gray-400">Código: {booking.cancellationCode}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          if (!booking.serviceId) {
                            setAlert({
                              type: 'error',
                              message:
                                'Este servicio no admite reprogramación en línea. Por favor contáctanos para modificar la cita.',
                            });
                            return;
                          }
                          openReschedule(booking.appointmentId);
                        }}
                        disabled={!booking.canModify || loading || !booking.serviceId}
                        className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Reprogramar
                      </button>
                      <button
                        onClick={() => handleCancel(booking)}
                        disabled={!booking.canModify || loading}
                        className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>

                  {rescheduleState.isOpen && (
                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-gray-700">
                          Selecciona una nueva fecha y horario
                        </h4>
                        <button
                          onClick={() => closeReschedule(booking.appointmentId)}
                          className="text-xs text-gray-500 hover:text-gray-700 underline"
                        >
                          Cerrar
                        </button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Fecha</label>
                          <input
                            type="date"
                            min={new Date().toISOString().split('T')[0]}
                            value={rescheduleState.selectedDate}
                            onChange={(e) => handleDateChange(booking, e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-gray-700">Horarios disponibles</label>
                          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {rescheduleState.loading ? (
                              <div className="col-span-2 text-sm text-gray-500">Consultando disponibilidad...</div>
                            ) : rescheduleState.slots.length ? (
                              rescheduleState.slots.map((slot) => {
                                const label = new Date(slot.start).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                });
                                const isSelected = rescheduleState.selectedSlot?.start === slot.start;
                                return (
                                  <button
                                    key={`${slot.start}-${slot.end}`}
                                    onClick={() => updateReschedule(booking.appointmentId, { selectedSlot: slot, error: undefined })}
                                    className={`border rounded-lg px-3 py-2 text-xs transition ${
                                      isSelected ? 'text-white' : 'text-gray-700 hover:border-gray-400'
                                    }`}
                                    style={
                                      isSelected
                                        ? { backgroundColor: primaryColor, borderColor: primaryColor }
                                        : {}
                                    }
                                  >
                                    {label}
                                  </button>
                                );
                              })
                            ) : (
                              <div className="col-span-2 text-sm text-gray-500">
                                Selecciona una fecha para ver horarios.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {rescheduleState.error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                          {rescheduleState.error}
                        </div>
                      )}

                      {rescheduleState.success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                          {rescheduleState.success}
                        </div>
                      )}

                      <div className="flex justify-end">
                        <button
                          onClick={() => handleReschedule(booking, rescheduleState)}
                          disabled={rescheduleState.loading}
                          className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {rescheduleState.loading ? 'Reprogramando...' : 'Confirmar reprogramación'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        ¿Necesitas ayuda adicional? Escríbenos a{' '}
        <a href={`mailto:${domain}@contacto.com`} className="underline">
          soporte
        </a>
        .
      </div>
    </div>
  );
}
