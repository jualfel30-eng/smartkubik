'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import {
  getBeautyServices,
  getBeautyPackages,
  getProfessionals,
  getAvailability,
  createBeautyBooking,
  type BeautyService,
  type BeautyPackage,
  type Professional,
  type AvailabilitySlot,
} from '@/lib/beautyApi';
import '@/templates/HealthStorefront/health.css';

// Health vertical reusa el motor de reservas de beauty (mismos endpoints públicos
// beauty-bookings), con skin clínico (cream/oro, Cormorant, sin dark mode).
const ACCENT = '#C9A96E';
const ACCENT_DARK = '#B8944F';

interface StorefrontConfig {
  tenantId: string;
  name: string;
}

const STEP_LABELS = ['Servicios', 'Profesional', 'Fecha y Hora', 'Tus Datos', 'Confirmar'];

export default function HealthBookingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const domain = params.domain as string;
  const preselectAppliedRef = useRef(false);

  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [packages, setPackages] = useState<BeautyPackage[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);

  const [step, setStep] = useState(1);
  const [stepDirection, setStepDirection] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canProceed, setCanProceed] = useState(true);
  const [depositWarning, setDepositWarning] = useState(false);

  const [selectedServices, setSelectedServices] = useState<
    Array<{ serviceId: string; addons: string[] }>
  >([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const STORAGE_KEY = `health-booking-${domain}`;

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/storefront/by-domain/${domain}`,
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configJson = await configRes.json();
        const configData = configJson.data || configJson;

        if (configData.templateType !== 'health') {
          router.push(`/${domain}`);
          return;
        }

        const tenantId =
          typeof configData.tenantId === 'object' ? configData.tenantId._id : configData.tenantId;
        const tenantName =
          typeof configData.tenantId === 'object'
            ? configData.tenantId.name
            : configData.seo?.title || 'Clínica';

        setConfig({ tenantId, name: tenantName });

        const [servicesData, packagesData, professionalsData] = await Promise.all([
          getBeautyServices(tenantId),
          getBeautyPackages(tenantId),
          getProfessionals(tenantId),
        ]);

        setServices(servicesData);
        setPackages(packagesData);
        setProfessionals(professionalsData);
      } catch (err) {
        setError('No se pudieron cargar los datos de reserva');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [domain, router]);

  // Load availability
  useEffect(() => {
    async function loadAvailability() {
      if (!config || !selectedDate || selectedServices.length === 0) {
        setAvailableSlots([]);
        return;
      }
      setLoadingSlots(true);
      try {
        const result = await getAvailability({
          tenantId: config.tenantId,
          date: selectedDate,
          serviceIds: selectedServices.map((s) => s.serviceId),
          professionalId: selectedProfessional || undefined,
        });
        setAvailableSlots(result.slots);
      } catch (err) {
        console.error('Error loading availability:', err);
        setAvailableSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    }
    loadAvailability();
  }, [config, selectedDate, selectedServices, selectedProfessional]);

  const toggleService = (serviceId: string) => {
    setSelectedPackageId('');
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) return prev.filter((s) => s.serviceId !== serviceId);
      return [...prev, { serviceId, addons: [] }];
    });
  };

  const selectPackage = (pkg: BeautyPackage) => {
    if (selectedPackageId === pkg._id) {
      setSelectedPackageId('');
      setSelectedServices([]);
    } else {
      setSelectedPackageId(pkg._id);
      setSelectedServices(pkg.services.map((s) => ({ serviceId: s._id, addons: [] })));
    }
  };

  const toggleAddon = (serviceId: string, addonName: string) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.serviceId === serviceId) {
          const hasAddon = s.addons.includes(addonName);
          return {
            ...s,
            addons: hasAddon ? s.addons.filter((a) => a !== addonName) : [...s.addons, addonName],
          };
        }
        return s;
      }),
    );
  };

  const calculateTotals = () => {
    if (selectedPackageId) {
      const pkg = packages.find((p) => p._id === selectedPackageId);
      if (pkg) return { totalPrice: pkg.price.amount, totalDuration: pkg.totalDuration };
    }
    let totalPrice = 0;
    let totalDuration = 0;
    selectedServices.forEach((selected) => {
      const service = services.find((s) => s._id === selected.serviceId);
      if (!service) return;
      totalPrice += service.price.amount;
      totalDuration += service.duration;
      selected.addons.forEach((addonName) => {
        const addon = service.addons?.find((a) => a.name === addonName);
        if (addon) {
          totalPrice += addon.price;
          totalDuration += addon.duration || 0;
        }
      });
    });
    return { totalPrice, totalDuration };
  };

  const handleSubmit = async () => {
    if (!config) return;
    setSubmitting(true);
    setError(null);
    try {
      const booking = await createBeautyBooking({
        tenantId: config.tenantId,
        client: { name: clientName, phone: clientPhone },
        services: selectedServices.map((s) => ({ service: s.serviceId, addonNames: s.addons })),
        date: selectedDate,
        startTime: selectedTime,
        professionalId: selectedProfessional || undefined,
        notes: notes || undefined,
        packageId: selectedPackageId || undefined,
      });

      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}

      if (booking.depositPayment?.url) {
        window.location.href = booking.depositPayment.url;
        return;
      }

      router.push(`/${domain}/health/reserva/${booking.bookingNumber}`);
    } catch (err: any) {
      const msg = err.message || 'Error al crear la reserva';
      if (
        err.status === 409 ||
        msg.toLowerCase().includes('no disponible') ||
        msg.toLowerCase().includes('already taken')
      ) {
        setError('Ese horario acaba de ser reservado por alguien más. Por favor elige otro.');
        setSelectedTime('');
        setStepDirection(-1);
        setStep(3);
      } else {
        setError(msg);
      }
      setSubmitting(false);
    }
  };

  const checkClientStatus = async (phone: string) => {
    if (!config || !phone) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/beauty-bookings/client-status?tenantId=${config.tenantId}&phone=${encodeURIComponent(phone)}`,
      );
      if (!res.ok) return;
      const data = await res.json();
      if (!data.canBook) {
        setError(
          data.message ||
            'No es posible realizar la reserva. Por favor contacta a la clínica directamente.',
        );
        setCanProceed(false);
      } else if (data.requiresDeposit) {
        setDepositWarning(true);
        setCanProceed(true);
      } else {
        setCanProceed(true);
        setDepositWarning(false);
      }
    } catch {
      setCanProceed(true);
    }
  };

  const canGoToStep = (targetStep: number): boolean => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return selectedServices.length > 0;
    if (targetStep === 3) return selectedServices.length > 0;
    if (targetStep === 4) return !!(selectedDate && selectedTime);
    if (targetStep === 5) return !!(clientName && clientPhone) && canProceed;
    return false;
  };

  // Persist + restore booking state
  useEffect(() => {
    if (loading) return;
    const state = {
      step,
      selectedServices,
      selectedPackageId,
      selectedProfessional,
      selectedDate,
      selectedTime,
      clientName,
      clientPhone,
      notes,
    };
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [
    step,
    selectedServices,
    selectedPackageId,
    selectedProfessional,
    selectedDate,
    selectedTime,
    clientName,
    clientPhone,
    notes,
    loading,
    STORAGE_KEY,
  ]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved);
      if (state.selectedServices?.length > 0) setSelectedServices(state.selectedServices);
      if (state.selectedPackageId) setSelectedPackageId(state.selectedPackageId);
      if (state.selectedProfessional) setSelectedProfessional(state.selectedProfessional);
      if (state.selectedDate) setSelectedDate(state.selectedDate);
      if (state.selectedTime) setSelectedTime(state.selectedTime);
      if (state.clientName) setClientName(state.clientName);
      if (state.clientPhone) setClientPhone(state.clientPhone);
      if (state.notes) setNotes(state.notes);
      if (state.step > 1 && state.selectedServices?.length > 0) setStep(state.step);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preselect service from ?serviceId=...
  useEffect(() => {
    if (preselectAppliedRef.current) return;
    if (services.length === 0) return;
    const serviceIdParam = searchParams?.get('serviceId');
    if (!serviceIdParam) return;
    preselectAppliedRef.current = true;
    if (services.some((s) => s._id === serviceIdParam)) {
      setSelectedPackageId('');
      setSelectedServices((prev) =>
        prev.some((s) => s.serviceId === serviceIdParam)
          ? prev
          : [...prev, { serviceId: serviceIdParam, addons: [] }],
      );
      setStep(1);
    }
    router.replace(`/${domain}/health/reservar`);
  }, [services, searchParams, router, domain]);

  const nextStep = async () => {
    if (step === 4 && clientPhone) {
      await checkClientStatus(clientPhone);
    }
    if (canGoToStep(step + 1)) {
      setStepDirection(1);
      setStep(step + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStepDirection(-1);
      setStep(step - 1);
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className="health-root flex min-h-screen items-center justify-center">
        <div
          className="h-12 w-12 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: ACCENT, borderRightColor: ACCENT }}
        />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="health-root flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-display mb-2 text-2xl font-light text-[#0A0A0A]">
            Reservas no disponibles
          </h1>
          <p className="text-[#6B6B6B]">No se pudo cargar la configuración.</p>
        </div>
      </div>
    );
  }

  const { totalPrice, totalDuration } = calculateTotals();
  const stepAnim = {
    initial: { x: stepDirection > 0 ? 30 : -30, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: stepDirection > 0 ? -30 : 30, opacity: 0 },
    transition: { duration: 0.2, ease: 'easeOut' as const },
  };

  return (
    <div className="health-root min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#E5E0D8] bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <button
            onClick={() => router.push(`/${domain}/health`)}
            className="flex items-center gap-2 text-sm font-medium text-[#6B6B6B] transition hover:opacity-70"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="font-display tracking-[0.15em] text-[#0A0A0A]">{config.name}</span>
          <span className="w-12" />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl font-light text-[#0A0A0A]">Reservar Cita</h1>
          <p className="mt-1 text-[#6B6B6B]">Selecciona tus servicios y agenda tu cita</p>
        </div>

        {/* Step indicator */}
        <div className="mb-10">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 right-0 top-4 h-0.5 bg-[#E5E0D8]" />
            <div
              className="absolute left-0 top-4 h-0.5 transition-all duration-500"
              style={{ width: `${((step - 1) / 4) * 100}%`, backgroundColor: ACCENT }}
            />
            {STEP_LABELS.map((label, idx) => {
              const num = idx + 1;
              const isActive = step >= num;
              const isCurrent = step === num;
              return (
                <div key={num} className="relative z-10 flex flex-col items-center" style={{ width: '20%' }}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                      isActive ? 'text-white' : 'border-2 border-[#E5E0D8] bg-white text-[#A8A29A]'
                    }`}
                    style={{
                      backgroundColor: isActive ? ACCENT : undefined,
                      boxShadow: isCurrent ? `0 0 0 4px ${ACCENT}30` : undefined,
                    }}
                  >
                    {isActive && num < step ? (
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span
                    className="mt-2 text-center text-[10px] font-medium sm:text-xs"
                    style={{ color: isActive ? ACCENT : '#A8A29A' }}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        )}

        {/* Step content */}
        <div className="mb-6 rounded-2xl border border-[#E5E0D8] bg-white p-6 shadow-sm md:p-8">
          <AnimatePresence mode="wait" initial={false}>
            {/* Step 1: Services */}
            {step === 1 && (
              <motion.div key="step-1" {...stepAnim}>
                <h2 className="font-display mb-2 text-2xl font-light text-[#0A0A0A]">
                  Selecciona tus Servicios
                </h2>
                <p className="mb-6 text-sm text-[#6B6B6B]">Puedes seleccionar uno o varios servicios</p>

                {packages.length > 0 && (
                  <div className="mb-8">
                    <div className="mb-4 flex items-center gap-2">
                      <span
                        className="label-caps rounded-full px-2.5 py-1 text-[10px]"
                        style={{ backgroundColor: `${ACCENT}18`, color: ACCENT_DARK }}
                      >
                        Combos
                      </span>
                      <div className="h-px flex-1 bg-[#E5E0D8]" />
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {packages.map((pkg) => {
                        const isSelected = selectedPackageId === pkg._id;
                        return (
                          <div
                            key={pkg._id}
                            onClick={() => selectPackage(pkg)}
                            className="relative cursor-pointer overflow-hidden rounded-2xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                            style={{
                              borderColor: isSelected ? ACCENT : '#E5E0D8',
                              backgroundColor: isSelected ? `${ACCENT}08` : undefined,
                            }}
                          >
                            {pkg.savings > 0 && (
                              <div
                                className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-xs font-bold text-white"
                                style={{ backgroundColor: ACCENT }}
                              >
                                Ahorras ${pkg.savings}
                              </div>
                            )}
                            <h3 className="pr-16 text-lg font-semibold text-[#0A0A0A]">{pkg.name}</h3>
                            {pkg.description && (
                              <p className="mt-1 text-sm text-[#6B6B6B]">{pkg.description}</p>
                            )}
                            <ul className="mt-3 space-y-1">
                              {pkg.services.map((svc) => (
                                <li key={svc._id} className="flex items-center gap-1.5 text-sm text-[#6B6B6B]">
                                  <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: ACCENT }}>
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>{svc.name}</span>
                                  <span className="ml-auto text-xs text-[#A8A29A]">{svc.duration} min</span>
                                </li>
                              ))}
                            </ul>
                            <div className="mt-4 flex items-center justify-between border-t pt-3" style={{ borderColor: `${ACCENT}20` }}>
                              <span className="text-sm text-[#A8A29A]">{pkg.totalDuration} min</span>
                              <span className="font-display text-xl font-medium" style={{ color: ACCENT_DARK }}>
                                ${pkg.price.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mb-4 mt-8 flex items-center gap-2">
                      <span className="label-caps text-[10px] text-[#A8A29A]">O elige servicios individuales</span>
                      <div className="h-px flex-1 bg-[#E5E0D8]" />
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {services.map((service) => {
                    const isSelected = selectedServices.some((s) => s.serviceId === service._id);
                    const selected = selectedServices.find((s) => s.serviceId === service._id);
                    return (
                      <div
                        key={service._id}
                        className="cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                        style={{
                          borderColor: isSelected ? ACCENT : '#E5E0D8',
                          backgroundColor: isSelected ? `${ACCENT}08` : undefined,
                        }}
                        onClick={() => toggleService(service._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#0A0A0A]">{service.name}</h3>
                            <p className="mt-1 text-sm text-[#6B6B6B]">{service.description}</p>
                            <div className="mt-3 flex gap-4 text-sm text-[#A8A29A]">
                              <span className="flex items-center gap-1">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {service.duration} min
                              </span>
                              <span className="font-semibold" style={{ color: ACCENT_DARK }}>
                                ${service.price.amount}
                              </span>
                            </div>
                          </div>
                          <div
                            className="ml-4 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all"
                            style={{
                              borderColor: isSelected ? ACCENT : '#E5E0D8',
                              backgroundColor: isSelected ? ACCENT : undefined,
                              color: isSelected ? '#fff' : undefined,
                            }}
                          >
                            {isSelected && (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>

                        {isSelected && service.addons && service.addons.length > 0 && (
                          <div className="ml-1 mt-4 border-l-2 pl-4" style={{ borderColor: `${ACCENT}40` }}>
                            <p className="mb-2 text-sm font-semibold text-[#6B6B6B]">Extras disponibles:</p>
                            <div className="space-y-2">
                              {service.addons
                                .filter((addon) => addon.isActive)
                                .map((addon) => (
                                  <label
                                    key={addon.name}
                                    className="flex cursor-pointer items-center gap-2"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selected?.addons.includes(addon.name) || false}
                                      onChange={() => toggleAddon(service._id, addon.name)}
                                      style={{ accentColor: ACCENT }}
                                    />
                                    <span className="text-sm text-[#6B6B6B]">
                                      {addon.name} (+${addon.price}
                                      {addon.duration ? `, ${addon.duration} min` : ''})
                                    </span>
                                  </label>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Professional */}
            {step === 2 && (
              <motion.div key="step-2" {...stepAnim}>
                <h2 className="font-display mb-2 text-2xl font-light text-[#0A0A0A]">Elige tu Especialista</h2>
                <p className="mb-6 text-[#6B6B6B]">Opcional — puedes dejarlo al primero disponible</p>
                <div className="space-y-4">
                  <div
                    className="cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                    style={{
                      borderColor: !selectedProfessional ? ACCENT : '#E5E0D8',
                      backgroundColor: !selectedProfessional ? `${ACCENT}08` : undefined,
                    }}
                    onClick={() => setSelectedProfessional('')}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-[#0A0A0A]">Sin preferencia</h3>
                        <p className="text-sm text-[#6B6B6B]">Primer especialista disponible</p>
                      </div>
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full border-2"
                        style={{
                          borderColor: !selectedProfessional ? ACCENT : '#E5E0D8',
                          backgroundColor: !selectedProfessional ? ACCENT : undefined,
                          color: !selectedProfessional ? '#fff' : undefined,
                        }}
                      >
                        {!selectedProfessional && (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  {professionals.map((professional) => {
                    const isSelected = selectedProfessional === professional._id;
                    return (
                      <div
                        key={professional._id}
                        className="cursor-pointer rounded-xl border-2 p-5 transition-all duration-200 hover:shadow-md"
                        style={{
                          borderColor: isSelected ? ACCENT : '#E5E0D8',
                          backgroundColor: isSelected ? `${ACCENT}08` : undefined,
                        }}
                        onClick={() => setSelectedProfessional(professional._id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex gap-4">
                            {professional.images?.[0] || professional.avatar ? (
                              <Image
                                src={(professional.images?.[0] || professional.avatar) as string}
                                alt={professional.name}
                                width={64}
                                height={64}
                                className="h-16 w-16 rounded-xl object-cover"
                              />
                            ) : (
                              <div
                                className="flex h-16 w-16 items-center justify-center rounded-xl text-2xl font-bold text-white"
                                style={{ backgroundColor: ACCENT }}
                              >
                                {(professional.name || '?').charAt(0)}
                              </div>
                            )}
                            <div>
                              <h3 className="text-lg font-semibold text-[#0A0A0A]">{professional.name}</h3>
                              <p className="text-sm text-[#6B6B6B]">{professional.role}</p>
                              {professional.specialties?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {professional.specialties.map((specialty) => (
                                    <span
                                      key={specialty}
                                      className="rounded-full px-2 py-0.5 text-xs"
                                      style={{ backgroundColor: `${ACCENT}15`, color: ACCENT_DARK }}
                                    >
                                      {specialty}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div
                            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2"
                            style={{
                              borderColor: isSelected ? ACCENT : '#E5E0D8',
                              backgroundColor: isSelected ? ACCENT : undefined,
                              color: isSelected ? '#fff' : undefined,
                            }}
                          >
                            {isSelected && (
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 3: Date & Time */}
            {step === 3 &&
              (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayStr = today.toISOString().split('T')[0];
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                const tomorrowStr = tomorrow.toISOString().split('T')[0];

                const { year: calYear, month: calMonth } = calendarMonth;
                const firstDay = new Date(calYear, calMonth - 1, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth, 0).getDate();
                const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
                const dayNames = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'];

                const changeMonth = (delta: number) => {
                  const d = new Date(calYear, calMonth - 1 + delta, 1);
                  setCalendarMonth({ year: d.getFullYear(), month: d.getMonth() + 1 });
                };
                const selectDay = (day: number) => {
                  const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  if (dateStr < todayStr) return;
                  setSelectedDate(dateStr);
                  setSelectedTime('');
                };

                return (
                  <motion.div key="step-3" {...stepAnim}>
                    <h2 className="font-display mb-6 text-2xl font-light text-[#0A0A0A]">Fecha y Hora</h2>

                    <div className="mb-4 flex gap-2">
                      {[
                        { label: 'Hoy', val: todayStr },
                        { label: 'Mañana', val: tomorrowStr },
                      ].map((q) => (
                        <button
                          key={q.val}
                          onClick={() => {
                            setSelectedDate(q.val);
                            setSelectedTime('');
                          }}
                          className="rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md"
                          style={{
                            borderColor: selectedDate === q.val ? ACCENT : '#E5E0D8',
                            backgroundColor: selectedDate === q.val ? ACCENT : undefined,
                            color: selectedDate === q.val ? '#fff' : '#0A0A0A',
                          }}
                        >
                          {q.label}
                        </button>
                      ))}
                    </div>

                    <div className="mb-8 rounded-2xl border-2 border-[#E5E0D8] bg-white p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <button onClick={() => changeMonth(-1)} className="rounded-full p-2 text-[#0A0A0A] transition hover:opacity-70" aria-label="Mes anterior">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <span className="font-display text-lg text-[#0A0A0A]">
                          {monthNames[calMonth - 1]} {calYear}
                        </span>
                        <button onClick={() => changeMonth(1)} className="rounded-full p-2 text-[#0A0A0A] transition hover:opacity-70" aria-label="Mes siguiente">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      <div className="mb-2 grid grid-cols-7 gap-1">
                        {dayNames.map((d) => (
                          <div key={d} className="py-1 text-center text-xs font-semibold text-[#A8A29A]">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({ length: firstDay }).map((_, i) => (
                          <div key={`empty-${i}`} />
                        ))}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                          const day = i + 1;
                          const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                          const isPast = dateStr < todayStr;
                          const isSelected = dateStr === selectedDate;
                          const isToday = dateStr === todayStr;
                          return (
                            <button
                              key={day}
                              onClick={() => selectDay(day)}
                              disabled={isPast}
                              className={`flex aspect-square items-center justify-center rounded-xl text-sm font-medium transition-all ${
                                isPast ? 'cursor-not-allowed text-[#A8A29A] opacity-30' : isSelected ? 'text-white' : 'text-[#0A0A0A] hover:opacity-70'
                              }`}
                              style={{
                                backgroundColor: isSelected ? ACCENT : undefined,
                                ...(isToday && !isSelected ? { boxShadow: `inset 0 0 0 2px ${ACCENT}40` } : {}),
                              }}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {selectedDate && (
                      <div>
                        <label className="mb-3 block font-semibold text-[#0A0A0A]">Horarios Disponibles</label>
                        {loadingSlots ? (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {Array.from({ length: 6 }).map((_, i) => (
                              <div key={i} className="h-12 animate-pulse rounded-xl bg-[#EFEAE2]" />
                            ))}
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="py-10 text-center text-[#A8A29A]">
                            <p>No hay horarios disponibles para esta fecha.</p>
                            <button
                              onClick={() => {
                                setSelectedDate(tomorrowStr);
                                setSelectedTime('');
                              }}
                              className="mt-3 text-sm font-semibold underline transition hover:opacity-70"
                              style={{ color: ACCENT_DARK }}
                            >
                              Probar mañana
                            </button>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                            {availableSlots.map((slot) => (
                              <motion.button
                                key={slot.time}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedTime(slot.time)}
                                aria-label={`Reservar a las ${slot.time}`}
                                className="rounded-xl border-2 px-4 py-3.5 text-sm font-medium transition-all hover:shadow-md"
                                style={{
                                  borderColor: selectedTime === slot.time ? ACCENT : '#E5E0D8',
                                  backgroundColor: selectedTime === slot.time ? ACCENT : undefined,
                                  color: selectedTime === slot.time ? '#fff' : '#0A0A0A',
                                }}
                              >
                                {slot.time}
                              </motion.button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })()}

            {/* Step 4: Client Info */}
            {step === 4 && (
              <motion.div key="step-4" {...stepAnim}>
                <h2 className="font-display mb-2 text-2xl font-light text-[#0A0A0A]">Tus Datos</h2>
                <p className="mb-6 flex items-center gap-1.5 text-sm text-[#6B6B6B]">
                  <svg className="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Sin registro. Solo necesitamos tu nombre y teléfono.
                </p>
                <div className="space-y-5">
                  <div>
                    <label className="mb-2 block font-semibold text-[#0A0A0A]">Nombre Completo *</label>
                    <input
                      type="text"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Ej: Juan Pérez"
                      className="w-full rounded-xl border-2 bg-white px-4 py-3 text-[#0A0A0A] transition-colors focus:outline-none"
                      style={{ borderColor: clientName ? ACCENT : '#E5E0D8' }}
                    />
                  </div>
                  <div>
                    <label className="mb-2 block font-semibold text-[#0A0A0A]">Teléfono *</label>
                    <div
                      className="flex items-center rounded-xl border-2 bg-white px-4 py-3 transition-colors"
                      style={{ borderColor: clientPhone ? ACCENT : '#E5E0D8' }}
                    >
                      <PhoneInput
                        defaultCountry="VE"
                        value={clientPhone}
                        onChange={(val) => setClientPhone(val || '')}
                        placeholder="412 1234567"
                        className="booking-phone-input w-full text-[#0A0A0A]"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block font-semibold text-[#0A0A0A]">Notas (Opcional)</label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Alguna solicitud especial..."
                      rows={3}
                      className="w-full resize-none rounded-xl border-2 border-[#E5E0D8] bg-white px-4 py-3 text-[#0A0A0A] transition-colors focus:outline-none"
                    />
                  </div>
                  {depositWarning && (
                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-orange-800">
                      <p className="text-sm font-semibold">⚠ Se requiere depósito</p>
                      <p className="mt-1 text-sm">
                        Esta clínica requiere un depósito previo para confirmar tu reserva. Te contactarán con los detalles de pago.
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 5: Confirm */}
            {step === 5 && (
              <motion.div key="step-5" {...stepAnim}>
                <h2 className="font-display mb-6 text-2xl font-light text-[#0A0A0A]">Confirmar Reserva</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Servicios</h3>
                    {selectedPackageId &&
                      (() => {
                        const pkg = packages.find((p) => p._id === selectedPackageId);
                        return pkg ? (
                          <div className="rounded-xl bg-[#F7F3EE] p-4">
                            <div className="mb-2 flex items-center gap-2">
                              <span className="label-caps rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: `${ACCENT}18`, color: ACCENT_DARK }}>
                                Combo
                              </span>
                              <span className="font-semibold text-[#0A0A0A]">{pkg.name}</span>
                              <span className="ml-auto font-semibold" style={{ color: ACCENT_DARK }}>
                                ${pkg.price.amount.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ) : null;
                      })()}
                    {!selectedPackageId && (
                      <div className="space-y-2">
                        {selectedServices.map((selected) => {
                          const service = services.find((s) => s._id === selected.serviceId);
                          if (!service) return null;
                          return (
                            <div key={selected.serviceId} className="rounded-xl bg-[#F7F3EE] p-4">
                              <div className="flex justify-between">
                                <span className="font-semibold text-[#0A0A0A]">{service.name}</span>
                                <span className="font-semibold" style={{ color: ACCENT_DARK }}>${service.price.amount}</span>
                              </div>
                              <span className="text-sm text-[#A8A29A]">{service.duration} min</span>
                              {selected.addons.length > 0 && (
                                <div className="mt-2 border-l-2 pl-3" style={{ borderColor: `${ACCENT}40` }}>
                                  {selected.addons.map((addonName) => {
                                    const addon = service.addons?.find((a) => a.name === addonName);
                                    return addon ? (
                                      <div key={addonName} className="text-sm text-[#6B6B6B]">+ {addon.name} (+${addon.price})</div>
                                    ) : null;
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div>
                    <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Especialista</h3>
                    <div className="rounded-xl bg-[#F7F3EE] p-4 text-[#0A0A0A]">
                      {selectedProfessional ? professionals.find((p) => p._id === selectedProfessional)?.name : 'Primer disponible'}
                    </div>
                  </div>

                  <div>
                    <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Fecha y Hora</h3>
                    <div className="rounded-xl bg-[#F7F3EE] p-4">
                      <div className="font-semibold text-[#0A0A0A]">
                        {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="text-[#6B6B6B]">{selectedTime}</div>
                    </div>
                  </div>

                  <div>
                    <h3 className="label-caps mb-3 text-[10px] text-[#A8A29A]">Contacto</h3>
                    <div className="rounded-xl bg-[#F7F3EE] p-4">
                      <div className="font-semibold text-[#0A0A0A]">{clientName}</div>
                      <div className="text-[#6B6B6B]">{clientPhone}</div>
                      {notes && <div className="mt-2 text-sm italic text-[#A8A29A]">{notes}</div>}
                    </div>
                  </div>

                  <div className="border-t-2 border-[#E5E0D8] pt-5">
                    <div className="flex justify-between text-lg text-[#0A0A0A]">
                      <span className="font-medium">Duración total:</span>
                      <span>{totalDuration} minutos</span>
                    </div>
                    <div className="mt-2 flex justify-between text-2xl font-bold">
                      <span className="text-[#0A0A0A]">Total:</span>
                      <span style={{ color: ACCENT_DARK }}>${totalPrice.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sticky bottom nav */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4">
          <div className="mx-auto max-w-4xl">
            <div className="flex items-center gap-3 rounded-t-2xl border border-b-0 border-[#E5E0D8] bg-white/95 px-5 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.10)] backdrop-blur-md">
              <button
                onClick={prevStep}
                disabled={step === 1}
                className="flex-shrink-0 rounded-xl border-2 border-[#E5E0D8] px-4 py-2.5 text-sm font-semibold text-[#0A0A0A] transition-all disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Atrás
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0A0A0A]">
                  {selectedServices.length > 0
                    ? `${selectedServices.length} servicio${selectedServices.length > 1 ? 's' : ''} · ${totalDuration} min`
                    : '0 servicios'}
                </p>
                <p className="text-sm font-bold" style={{ color: ACCENT_DARK }}>${totalPrice.toFixed(2)}</p>
              </div>
              {step < 5 ? (
                <button
                  onClick={nextStep}
                  disabled={!canGoToStep(step + 1)}
                  className="flex-shrink-0 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-30"
                  style={{ backgroundColor: canGoToStep(step + 1) ? ACCENT : '#9CA3AF' }}
                >
                  Siguiente →
                </button>
              ) : (
                <motion.button
                  onClick={handleSubmit}
                  disabled={submitting}
                  whileTap={!submitting ? { scale: 0.95 } : undefined}
                  className="flex flex-shrink-0 items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ backgroundColor: !submitting ? ACCENT : '#9CA3AF' }}
                >
                  {submitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Reservando...
                    </>
                  ) : (
                    'Reservar mi cita ✓'
                  )}
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
