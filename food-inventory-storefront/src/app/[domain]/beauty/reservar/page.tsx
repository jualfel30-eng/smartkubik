'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { type ColorScheme, LIGHT, DARK } from '@/templates/BeautyStorefront/BeautyStorefront';

interface StorefrontConfig {
  tenantId: string;
  name: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const STEP_LABELS = ['Servicios', 'Profesional', 'Fecha y Hora', 'Tus Datos', 'Confirmar'];

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;

  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [packages, setPackages] = useState<BeautyPackage[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [canProceed, setCanProceed] = useState(true);
  const [depositWarning, setDepositWarning] = useState(false);

  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: string;
    addons: string[];
  }>>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const primaryColor = config?.primaryColor || '#D946EF';
  const secondaryColor = config?.secondaryColor || '#F97316';
  const colors: ColorScheme = darkMode ? DARK : LIGHT;

  // Load dark mode preference
  useEffect(() => {
    const stored = localStorage.getItem('beauty-dark-mode');
    if (stored === 'true') setDarkMode(true);
  }, []);

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    localStorage.setItem('beauty-dark-mode', String(next));
  };

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/storefront/by-domain/${domain}`
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configJson = await configRes.json();
        const configData = configJson.data || configJson;

        if (configData.templateType !== 'beauty') {
          router.push(`/${domain}`);
          return;
        }

        const tenantId = typeof configData.tenantId === 'object'
          ? configData.tenantId._id
          : configData.tenantId;
        const tenantName = typeof configData.tenantId === 'object'
          ? configData.tenantId.name
          : configData.seo?.title || 'Beauty Salon';

        setConfig({
          ...configData,
          tenantId,
          name: tenantName,
          primaryColor: configData.theme?.primaryColor,
          secondaryColor: configData.theme?.secondaryColor,
        });

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

      try {
        const serviceIds = selectedServices.map((s) => s.serviceId);
        const result = await getAvailability({
          tenantId: config.tenantId,
          date: selectedDate,
          serviceIds,
          professionalId: selectedProfessional || undefined,
        });
        setAvailableSlots(result.slots);
      } catch (err) {
        console.error('Error loading availability:', err);
        setAvailableSlots([]);
      }
    }

    loadAvailability();
  }, [config, selectedDate, selectedServices, selectedProfessional]);

  const toggleService = (serviceId: string) => {
    setSelectedPackageId(''); // clear package selection on manual toggle
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) return prev.filter((s) => s.serviceId !== serviceId);
      return [...prev, { serviceId, addons: [] }];
    });
  };

  const selectPackage = (pkg: BeautyPackage) => {
    const pkgId = pkg._id;
    if (selectedPackageId === pkgId) {
      // deselect
      setSelectedPackageId('');
      setSelectedServices([]);
    } else {
      setSelectedPackageId(pkgId);
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
      })
    );
  };

  const calculateTotals = () => {
    // If a package is selected, use the package price/duration directly
    if (selectedPackageId) {
      const pkg = packages.find((p) => p._id === selectedPackageId);
      if (pkg) {
        return { totalPrice: pkg.price.amount, totalDuration: pkg.totalDuration };
      }
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
        services: selectedServices.map((s) => ({
          service: s.serviceId,
          addonNames: s.addons,
        })),
        date: selectedDate,
        startTime: selectedTime,
        professionalId: selectedProfessional || undefined,
        notes: notes || undefined,
        packageId: selectedPackageId || undefined,
      });

      router.push(`/${domain}/beauty/reserva/${booking.bookingNumber}`);
    } catch (err: any) {
      setError(err.message || 'Error al crear la reserva');
      setSubmitting(false);
    }
  };

  // Check if client can book (no-show policy) — called when leaving step 4 (client data)
  const checkClientStatus = async (phone: string) => {
    if (!config || !phone) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/public/beauty-bookings/client-status?tenantId=${config.tenantId}&phone=${encodeURIComponent(phone)}`
      );
      if (!res.ok) return; // Fail open
      const data = await res.json();
      if (!data.canBook) {
        setError(data.message || 'No es posible realizar la reserva. Por favor contacta al negocio directamente.');
        setCanProceed(false);
      } else if (data.requiresDeposit) {
        setDepositWarning(true);
        setCanProceed(true);
      } else {
        setCanProceed(true);
        setDepositWarning(false);
      }
    } catch {
      // Fail open — don't block booking if check fails
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

  const nextStep = async () => {
    if (step === 4 && clientPhone) {
      // Check no-show policy before proceeding to confirmation
      await checkClientStatus(clientPhone);
    }
    if (canGoToStep(step + 1)) {
      setStep(step + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg} transition-colors`}>
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-transparent" style={{ borderTopColor: primaryColor, borderRightColor: primaryColor }}></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${colors.bg}`}>
        <div className="text-center">
          <h1 className={`text-2xl font-bold mb-2 ${colors.text}`}>Reservas no disponibles</h1>
          <p className={colors.textMuted}>No se pudo cargar la configuración.</p>
        </div>
      </div>
    );
  }

  const { totalPrice, totalDuration } = calculateTotals();

  return (
    <div className={`min-h-screen ${colors.bg} transition-colors duration-300 pb-24`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        darkMode ? 'bg-neutral-950/90 border-neutral-800' : 'bg-white/90 border-stone-200'
      }`}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className={`flex items-center gap-2 text-sm font-medium transition hover:opacity-70 ${colors.textMuted}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="font-bold tracking-tight" style={{ color: primaryColor }}>{config.name}</span>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition ${
              darkMode ? 'bg-neutral-800 text-amber-400 hover:bg-neutral-700' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
            }`}
          >
            {darkMode ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className={`text-3xl font-bold tracking-tight ${colors.text}`}>Reservar Cita</h1>
          <p className={`mt-1 ${colors.textMuted}`}>Selecciona tus servicios y agenda tu cita</p>
        </div>

        {/* Step indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            {/* Line behind dots */}
            <div className={`absolute top-4 left-0 right-0 h-0.5 ${darkMode ? 'bg-neutral-700' : 'bg-gray-200'}`} />
            <div className="absolute top-4 left-0 h-0.5 transition-all duration-500" style={{
              width: `${((step - 1) / 4) * 100}%`,
              background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})`,
            }} />

            {STEP_LABELS.map((label, idx) => {
              const num = idx + 1;
              const isActive = step >= num;
              const isCurrent = step === num;
              return (
                <div key={num} className="relative z-10 flex flex-col items-center" style={{ width: '20%' }}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                      isActive ? 'text-white shadow-lg' : `${colors.card} ${colors.textLight} border-2 ${colors.border}`
                    } ${isCurrent ? 'ring-4 ring-opacity-30' : ''}`}
                    style={{
                      backgroundColor: isActive ? primaryColor : undefined,
                      boxShadow: isCurrent ? `0 0 0 4px ${primaryColor}30` : undefined,
                    }}
                  >
                    {isActive && num < step ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      num
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium text-center hidden sm:block ${
                    isActive ? '' : colors.textLight
                  }`} style={isActive ? { color: primaryColor } : {}}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`mb-6 p-4 rounded-xl border ${
            darkMode ? 'bg-red-900/20 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Step content */}
        <div className={`${colors.card} rounded-2xl shadow-xl p-6 md:p-8 mb-6 border ${colors.border} transition-colors duration-300`}>
          {/* Step 1: Services */}
          {step === 1 && (
            <div>
              <h2 className={`text-2xl font-bold tracking-tight mb-6 ${colors.text}`}>Selecciona tus Servicios</h2>

              {/* Packages section */}
              {packages.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="text-xs font-bold tracking-widest uppercase px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                    >
                      Combos
                    </span>
                    <div className={`flex-1 h-px ${darkMode ? 'bg-neutral-700' : 'bg-stone-200'}`} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {packages.map((pkg) => {
                      const isSelected = selectedPackageId === pkg._id;
                      const savingsPct = pkg.price.amount > 0
                        ? Math.round((pkg.savings / (pkg.price.amount + pkg.savings)) * 100)
                        : 0;
                      return (
                        <div
                          key={pkg._id}
                          onClick={() => selectPackage(pkg)}
                          className={`relative border-2 rounded-2xl p-5 cursor-pointer transition-all duration-200 overflow-hidden ${
                            isSelected ? 'shadow-xl' : `${colors.border} hover:shadow-md`
                          }`}
                          style={{
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? `${primaryColor}08` : undefined,
                          }}
                        >
                          {/* Savings badge */}
                          {pkg.savings > 0 && (
                            <div
                              className="absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}
                            >
                              {savingsPct > 0 ? `Ahorras ${savingsPct}%` : `Ahorras $${pkg.savings}`}
                            </div>
                          )}

                          {/* Package image */}
                          {pkg.image && (
                            <img
                              src={pkg.image}
                              alt={pkg.name}
                              className="w-full h-28 object-cover rounded-xl mb-4"
                            />
                          )}

                          <h3 className={`font-bold text-lg pr-16 ${colors.text}`}>{pkg.name}</h3>
                          {pkg.description && (
                            <p className={`text-sm mt-1 ${colors.textMuted}`}>{pkg.description}</p>
                          )}

                          {/* Included services */}
                          <ul className="mt-3 space-y-1">
                            {pkg.services.map((svc) => (
                              <li key={svc._id} className={`flex items-center gap-1.5 text-sm ${colors.textMuted}`}>
                                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>{svc.name}</span>
                                <span className={`ml-auto text-xs ${colors.textLight}`}>{svc.duration} min</span>
                              </li>
                            ))}
                          </ul>

                          {/* Price row */}
                          <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: `${primaryColor}20` }}>
                            <div className={`flex items-center gap-1 text-sm ${colors.textLight}`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {pkg.totalDuration} min
                            </div>
                            <div className="text-right">
                              {pkg.savings > 0 && (
                                <div className={`text-xs line-through ${colors.textLight}`}>
                                  ${(pkg.price.amount + pkg.savings).toFixed(2)}
                                </div>
                              )}
                              <div className="text-xl font-bold" style={{ color: primaryColor }}>
                                ${pkg.price.amount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Selected indicator */}
                          {isSelected && (
                            <div
                              className="absolute inset-0 rounded-2xl pointer-events-none"
                              style={{ boxShadow: `inset 0 0 0 2px ${primaryColor}` }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider between packages and individual services */}
                  <div className="flex items-center gap-2 mt-8 mb-4">
                    <span className={`text-xs font-bold tracking-widest uppercase ${colors.textLight}`}>
                      O elige servicios individuales
                    </span>
                    <div className={`flex-1 h-px ${darkMode ? 'bg-neutral-700' : 'bg-stone-200'}`} />
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
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'shadow-lg'
                          : `${colors.border} hover:shadow-md`
                      }`}
                      style={{
                        borderColor: isSelected ? primaryColor : undefined,
                        backgroundColor: isSelected ? `${primaryColor}08` : undefined,
                      }}
                      onClick={() => toggleService(service._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className={`font-bold text-lg ${colors.text}`}>{service.name}</h3>
                          <p className={`text-sm mt-1 ${colors.textMuted}`}>{service.description}</p>
                          <div className={`flex gap-4 mt-3 text-sm ${colors.textLight}`}>
                            <span className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {service.duration} min
                            </span>
                            <span className="font-bold text-base" style={{ color: primaryColor }}>${service.price.amount}</span>
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ml-4 transition-all ${
                            isSelected ? 'text-white' : colors.border
                          }`}
                          style={{
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined,
                          }}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>

                      {isSelected && service.addons && service.addons.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2 ml-1" style={{ borderColor: `${primaryColor}40` }}>
                          <p className={`text-sm font-semibold mb-2 ${colors.textMuted}`}>Extras disponibles:</p>
                          <div className="space-y-2">
                            {service.addons
                              .filter((addon) => addon.isActive)
                              .map((addon) => {
                                const isAddonSelected = selected?.addons.includes(addon.name);
                                return (
                                  <label
                                    key={addon.name}
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAddonSelected}
                                      onChange={() => toggleAddon(service._id, addon.name)}
                                      className="rounded"
                                      style={{ accentColor: primaryColor }}
                                    />
                                    <span className={`text-sm ${colors.textMuted}`}>
                                      {addon.name} (+${addon.price}
                                      {addon.duration ? `, ${addon.duration} min` : ''})
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Professional */}
          {step === 2 && (
            <div>
              <h2 className={`text-2xl font-bold tracking-tight mb-6 ${colors.text}`}>Elige tu Profesional</h2>
              <p className={`mb-6 ${colors.textMuted}`}>Opcional — puedes dejarlo al azar</p>
              <div className="space-y-4">
                <div
                  className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                    !selectedProfessional ? 'shadow-lg' : `${colors.border} hover:shadow-md`
                  }`}
                  style={{
                    borderColor: !selectedProfessional ? primaryColor : undefined,
                    backgroundColor: !selectedProfessional ? `${primaryColor}08` : undefined,
                  }}
                  onClick={() => setSelectedProfessional('')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className={`font-bold ${colors.text}`}>Sin preferencia</h3>
                      <p className={`text-sm ${colors.textMuted}`}>Primer profesional disponible</p>
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                        !selectedProfessional ? 'text-white' : colors.border
                      }`}
                      style={{
                        borderColor: !selectedProfessional ? primaryColor : undefined,
                        backgroundColor: !selectedProfessional ? primaryColor : undefined,
                      }}
                    >
                      {!selectedProfessional && (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      className={`border-2 rounded-xl p-5 cursor-pointer transition-all duration-200 ${
                        isSelected ? 'shadow-lg' : `${colors.border} hover:shadow-md`
                      }`}
                      style={{
                        borderColor: isSelected ? primaryColor : undefined,
                        backgroundColor: isSelected ? `${primaryColor}08` : undefined,
                      }}
                      onClick={() => setSelectedProfessional(professional._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          {(professional.images?.[0] || professional.avatar) ? (
                            <img
                              src={professional.images?.[0] || professional.avatar}
                              alt={professional.name}
                              className="w-16 h-16 rounded-xl object-cover"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-2xl"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {(professional.name || '?').charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className={`font-bold text-lg ${colors.text}`}>{professional.name}</h3>
                            <p className={`text-sm ${colors.textMuted}`}>{professional.role}</p>
                            {professional.specialties?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {professional.specialties.map((specialty) => (
                                  <span
                                    key={specialty}
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
                                  >
                                    {specialty}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'text-white' : colors.border
                          }`}
                          style={{
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined,
                          }}
                        >
                          {isSelected && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div>
              <h2 className={`text-2xl font-bold tracking-tight mb-6 ${colors.text}`}>Fecha y Hora</h2>

              <div className="mb-8">
                <label className={`block font-semibold mb-2 ${colors.text}`}>Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors appearance-none ${colors.card} ${colors.text} ${colors.border}`}
                  style={{
                    borderColor: selectedDate ? primaryColor : undefined,
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    maxWidth: '100%',
                    minWidth: '0',
                    width: '100%',
                    boxSizing: 'border-box',
                    display: 'block',
                  }}
                />
              </div>

              {selectedDate && (
                <div>
                  <label className={`block font-semibold mb-3 ${colors.text}`}>Horarios Disponibles</label>
                  {availableSlots.length === 0 ? (
                    <div className={`text-center py-10 ${colors.textLight}`}>
                      No hay horarios disponibles para esta fecha. Intenta otro día.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`px-3 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${
                            selectedTime === slot.time
                              ? 'text-white shadow-lg'
                              : `${colors.border} ${colors.text} hover:shadow-md`
                          }`}
                          style={{
                            borderColor: selectedTime === slot.time ? primaryColor : undefined,
                            backgroundColor: selectedTime === slot.time ? primaryColor : undefined,
                          }}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Client Info */}
          {step === 4 && (
            <div>
              <h2 className={`text-2xl font-bold tracking-tight mb-6 ${colors.text}`}>Tus Datos</h2>
              <div className="space-y-5">
                <div>
                  <label className={`block font-semibold mb-2 ${colors.text}`}>Nombre Completo *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ej: Juan Pérez"
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors ${colors.card} ${colors.text} ${colors.border}`}
                    style={{ borderColor: clientName ? primaryColor : undefined }}
                  />
                </div>

                <div>
                  <label className={`block font-semibold mb-2 ${colors.text}`}>Teléfono *</label>
                  <div
                    className={`flex items-center border-2 rounded-xl px-4 py-3 transition-colors ${colors.card} ${colors.border}`}
                    style={{ borderColor: clientPhone ? primaryColor : undefined }}
                  >
                    <PhoneInput
                      defaultCountry="VE"
                      value={clientPhone}
                      onChange={(val) => setClientPhone(val || '')}
                      placeholder="412 1234567"
                      className={`w-full booking-phone-input ${colors.text}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block font-semibold mb-2 ${colors.text}`}>Notas (Opcional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Alguna solicitud especial..."
                    rows={3}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-colors resize-none ${colors.card} ${colors.text} ${colors.border}`}
                  />
                </div>

                {depositWarning && (
                  <div className={`p-4 rounded-xl border ${
                    darkMode ? 'bg-orange-900/20 border-orange-700 text-orange-300' : 'bg-orange-50 border-orange-200 text-orange-800'
                  }`}>
                    <p className="font-semibold text-sm">⚠ Se requiere depósito</p>
                    <p className="text-sm mt-1">Este negocio requiere un depósito previo para confirmar tu reserva. Te contactarán con los detalles de pago.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <div>
              <h2 className={`text-2xl font-bold tracking-tight mb-6 ${colors.text}`}>Confirmar Reserva</h2>

              <div className="space-y-6">
                <div>
                  <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${colors.textLight}`}>Servicios</h3>
                  {selectedPackageId && (() => {
                    const pkg = packages.find((p) => p._id === selectedPackageId);
                    return pkg ? (
                      <div className={`${colors.bgAlt} p-4 rounded-xl`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className="text-xs font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: `${primaryColor}18`, color: primaryColor }}
                          >
                            Combo
                          </span>
                          <span className={`font-semibold ${colors.text}`}>{pkg.name}</span>
                          <span className="ml-auto font-bold" style={{ color: primaryColor }}>${pkg.price.amount.toFixed(2)}</span>
                        </div>
                        <ul className="space-y-1">
                          {pkg.services.map((svc) => (
                            <li key={svc._id} className={`text-sm flex items-center gap-1.5 ${colors.textMuted}`}>
                              <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: primaryColor }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              {svc.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null;
                  })()}
                  {!selectedPackageId && (
                    <div className="space-y-2">
                      {selectedServices.map((selected) => {
                        const service = services.find((s) => s._id === selected.serviceId);
                        if (!service) return null;
                        return (
                          <div key={selected.serviceId} className={`${colors.bgAlt} p-4 rounded-xl`}>
                            <div className="flex justify-between">
                              <span className={`font-semibold ${colors.text}`}>{service.name}</span>
                              <span className="font-bold" style={{ color: primaryColor }}>${service.price.amount}</span>
                            </div>
                            <span className={`text-sm ${colors.textLight}`}>{service.duration} min</span>
                            {selected.addons.length > 0 && (
                              <div className="mt-2 pl-3 border-l-2" style={{ borderColor: `${primaryColor}40` }}>
                                {selected.addons.map((addonName) => {
                                  const addon = service.addons?.find((a) => a.name === addonName);
                                  return addon ? (
                                    <div key={addonName} className={`text-sm ${colors.textMuted}`}>
                                      + {addon.name} (+${addon.price})
                                    </div>
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
                  <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${colors.textLight}`}>Profesional</h3>
                  <div className={`${colors.bgAlt} p-4 rounded-xl ${colors.text}`}>
                    {selectedProfessional
                      ? professionals.find((p) => p._id === selectedProfessional)?.name
                      : 'Primer disponible'}
                  </div>
                </div>

                <div>
                  <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${colors.textLight}`}>Fecha y Hora</h3>
                  <div className={`${colors.bgAlt} p-4 rounded-xl`}>
                    <div className={`font-semibold ${colors.text}`}>
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className={colors.textMuted}>{selectedTime}</div>
                  </div>
                </div>

                <div>
                  <h3 className={`text-sm font-semibold tracking-wide uppercase mb-3 ${colors.textLight}`}>Contacto</h3>
                  <div className={`${colors.bgAlt} p-4 rounded-xl`}>
                    <div className={`font-semibold ${colors.text}`}>{clientName}</div>
                    <div className={colors.textMuted}>{clientPhone}</div>
                    {notes && <div className={`mt-2 text-sm italic ${colors.textLight}`}>{notes}</div>}
                  </div>
                </div>

                <div className={`border-t-2 pt-5 ${colors.border}`}>
                  <div className={`flex justify-between text-lg ${colors.text}`}>
                    <span className="font-medium">Duración total:</span>
                    <span>{totalDuration} minutos</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold mt-2">
                    <span className={colors.text}>Total:</span>
                    <span style={{ color: primaryColor }}>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky bottom nav bar — always visible */}
        <div className="fixed bottom-0 left-0 right-0 z-40 px-4">
          <div className="max-w-4xl mx-auto">
            <div
              className={`${darkMode ? 'bg-neutral-900/95 border-neutral-700' : 'bg-white/95 border-stone-200'} backdrop-blur-md rounded-t-2xl border border-b-0 px-5 py-4 flex items-center gap-3 shadow-[0_-4px_24px_rgba(0,0,0,0.12)]`}
            >
              {/* Atrás */}
              <button
                onClick={prevStep}
                disabled={step === 1}
                className={`flex-shrink-0 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed ${colors.border} ${colors.text}`}
              >
                ← Atrás
              </button>

              {/* Summary (shown when services selected and not on confirmation step) */}
              <div className="flex-1 min-w-0">
                {selectedServices.length > 0 ? (
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${colors.text} truncate`}>
                      {selectedServices.length} servicio{selectedServices.length > 1 ? 's' : ''} · {totalDuration} min
                    </p>
                    <p className="text-sm font-bold" style={{ color: primaryColor }}>${totalPrice.toFixed(2)}</p>
                  </div>
                ) : (
                  <div />
                )}
              </div>

              {/* Siguiente / Confirmar */}
              {step < 5 ? (
                <button
                  onClick={nextStep}
                  disabled={!canGoToStep(step + 1)}
                  className="flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm tracking-wide text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02]"
                  style={{ background: canGoToStep(step + 1) ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` : '#9CA3AF' }}
                >
                  Siguiente →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-shrink-0 px-6 py-2.5 rounded-xl font-semibold text-sm tracking-wide text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:scale-[1.02]"
                  style={{ background: !submitting ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` : '#9CA3AF' }}
                >
                  {submitting ? 'Procesando...' : 'Confirmar ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
