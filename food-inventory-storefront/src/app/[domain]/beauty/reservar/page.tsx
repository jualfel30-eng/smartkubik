'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getBeautyServices,
  getProfessionals,
  getAvailability,
  createBeautyBooking,
  type BeautyService,
  type Professional,
  type AvailabilitySlot,
} from '@/lib/beautyApi';

interface StorefrontConfig {
  tenantId: string;
  name: string;
  primaryColor?: string;
  beautyConfig?: {
    enabled: boolean;
  };
}

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const domain = params.domain as string;

  // State
  const [config, setConfig] = useState<StorefrontConfig | null>(null);
  const [services, setServices] = useState<BeautyService[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [availableSlots, setAvailableSlots] = useState<AvailabilitySlot[]>([]);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [selectedServices, setSelectedServices] = useState<Array<{
    serviceId: string;
    addons: string[];
  }>>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  const primaryColor = config?.primaryColor || '#D946EF';

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch config
        const configRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/public/storefront-config?domain=${domain}`
        );
        if (!configRes.ok) throw new Error('Config not found');
        const configData = await configRes.json();

        if (!(configData as any).beautyConfig?.enabled) {
          router.push(`/${domain}`);
          return;
        }

        setConfig(configData);

        // Fetch services and professionals
        const [servicesData, professionalsData] = await Promise.all([
          getBeautyServices(configData.tenantId),
          getProfessionals(configData.tenantId),
        ]);

        setServices(servicesData);
        setProfessionals(professionalsData);
      } catch (err) {
        setError('Failed to load booking data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [domain, router]);

  // Load availability when date/services change
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

  // Handle service selection
  const toggleService = (serviceId: string) => {
    setSelectedServices((prev) => {
      const exists = prev.find((s) => s.serviceId === serviceId);
      if (exists) {
        return prev.filter((s) => s.serviceId !== serviceId);
      } else {
        return [...prev, { serviceId, addons: [] }];
      }
    });
  };

  const toggleAddon = (serviceId: string, addonName: string) => {
    setSelectedServices((prev) =>
      prev.map((s) => {
        if (s.serviceId === serviceId) {
          const hasAddon = s.addons.includes(addonName);
          return {
            ...s,
            addons: hasAddon
              ? s.addons.filter((a) => a !== addonName)
              : [...s.addons, addonName],
          };
        }
        return s;
      })
    );
  };

  // Calculate totals
  const calculateTotals = () => {
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

  // Submit booking
  const handleSubmit = async () => {
    if (!config) return;

    setSubmitting(true);
    setError(null);

    try {
      const booking = await createBeautyBooking({
        tenantId: config.tenantId,
        client: {
          name: clientName,
          phone: clientPhone,
        },
        services: selectedServices.map((s) => ({
          service: s.serviceId,
          addonNames: s.addons,
        })),
        date: selectedDate,
        startTime: selectedTime,
        professionalId: selectedProfessional || undefined,
        notes: notes || undefined,
      });

      // Redirect to confirmation page
      router.push(`/${domain}/beauty/reserva/${booking.bookingNumber}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create booking');
      setSubmitting(false);
    }
  };

  // Navigation helpers
  const canGoToStep = (targetStep: number): boolean => {
    if (targetStep === 1) return true;
    if (targetStep === 2) return selectedServices.length > 0;
    if (targetStep === 3) return selectedServices.length > 0;
    if (targetStep === 4) return selectedDate && selectedTime;
    if (targetStep === 5) return clientName && clientPhone;
    return false;
  };

  const nextStep = () => {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: primaryColor }}></div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Booking not available</h1>
          <p className="text-gray-600">Unable to load booking configuration.</p>
        </div>
      </div>
    );
  }

  const { totalPrice, totalDuration } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/${domain}/beauty`)}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            ← Back to services
          </button>
          <h1 className="text-3xl font-bold">{(config as any).name}</h1>
          <p className="text-gray-600">Book your appointment</p>
        </div>

        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4, 5].map((num) => (
              <div
                key={num}
                className={`flex-1 ${num < 5 ? 'border-t-2' : ''} ${
                  step >= num ? 'border-current' : 'border-gray-300'
                }`}
                style={{ borderColor: step >= num ? primaryColor : undefined }}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold -mt-4 mx-auto ${
                    step >= num ? 'text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                  style={{ backgroundColor: step >= num ? primaryColor : undefined }}
                >
                  {num}
                </div>
                <div className="text-xs text-center mt-2">
                  {num === 1 && 'Services'}
                  {num === 2 && 'Professional'}
                  {num === 3 && 'Date &amp; Time'}
                  {num === 4 && 'Your Info'}
                  {num === 5 && 'Confirm'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Step content */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          {/* Step 1: Select Services */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Select Services</h2>
              <div className="space-y-4">
                {services.map((service) => {
                  const isSelected = selectedServices.some((s) => s.serviceId === service._id);
                  const selected = selectedServices.find((s) => s.serviceId === service._id);

                  return (
                    <div
                      key={service._id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        isSelected ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ borderColor: isSelected ? primaryColor : undefined }}
                      onClick={() => toggleService(service._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-lg">{service.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                          <div className="flex gap-4 mt-2 text-sm text-gray-500">
                            <span>⏱️ {service.duration} min</span>
                            <span>💰 ${service.price.amount}</span>
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            isSelected ? 'text-white' : ''
                          }`}
                          style={{
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined,
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>

                      {/* Addons */}
                      {isSelected && service.addons && service.addons.length > 0 && (
                        <div className="mt-4 pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                          <p className="text-sm font-semibold mb-2">Add extras:</p>
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
                                    <span className="text-sm">
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

          {/* Step 2: Select Professional */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Choose Professional (Optional)</h2>
              <div className="space-y-4">
                <div
                  className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                    !selectedProfessional ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  style={{ borderColor: !selectedProfessional ? primaryColor : undefined }}
                  onClick={() => setSelectedProfessional('')}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">No preference</h3>
                      <p className="text-sm text-gray-600">First available professional</p>
                    </div>
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        !selectedProfessional ? 'text-white' : ''
                      }`}
                      style={{
                        borderColor: !selectedProfessional ? primaryColor : undefined,
                        backgroundColor: !selectedProfessional ? primaryColor : undefined,
                      }}
                    >
                      {!selectedProfessional && '✓'}
                    </div>
                  </div>
                </div>

                {professionals.map((professional) => {
                  const isSelected = selectedProfessional === professional._id;
                  return (
                    <div
                      key={professional._id}
                      className={`border-2 rounded-lg p-4 cursor-pointer transition ${
                        isSelected ? 'border-current' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={{ borderColor: isSelected ? primaryColor : undefined }}
                      onClick={() => setSelectedProfessional(professional._id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4">
                          {professional.avatar ? (
                            <img
                              src={professional.avatar}
                              alt={professional.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl"
                              style={{ backgroundColor: primaryColor }}
                            >
                              {professional.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-lg">{professional.name}</h3>
                            <p className="text-sm text-gray-600">{professional.role}</p>
                            {professional.specialties && professional.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {professional.specialties.map((specialty) => (
                                  <span
                                    key={specialty}
                                    className="text-xs px-2 py-1 rounded"
                                    style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}
                                  >
                                    {specialty}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'text-white' : ''
                          }`}
                          style={{
                            borderColor: isSelected ? primaryColor : undefined,
                            backgroundColor: isSelected ? primaryColor : undefined,
                          }}
                        >
                          {isSelected && '✓'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Select Date &amp; Time */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Select Date &amp; Time</h2>

              {/* Date picker */}
              <div className="mb-6">
                <label className="block font-semibold mb-2">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime('');
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-current"
                  style={{ borderColor: selectedDate ? primaryColor : undefined }}
                />
              </div>

              {/* Time slots */}
              {selectedDate && (
                <div>
                  <label className="block font-semibold mb-2">Available Times</label>
                  {availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No available times for this date. Please try another date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot.time}
                          onClick={() => setSelectedTime(slot.time)}
                          className={`px-4 py-2 rounded-lg border-2 transition ${
                            selectedTime === slot.time
                              ? 'text-white font-bold'
                              : 'border-gray-300 hover:border-gray-400'
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
              <h2 className="text-2xl font-bold mb-4">Your Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block font-semibold mb-2">Full Name *</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-current"
                    style={{ borderColor: clientName ? primaryColor : undefined }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-2">Phone Number *</label>
                  <input
                    type="tel"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-current"
                    style={{ borderColor: clientPhone ? primaryColor : undefined }}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for USA, +58 for Venezuela)
                  </p>
                </div>

                <div>
                  <label className="block font-semibold mb-2">Special Requests (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests or notes..."
                    rows={4}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-current"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Confirm Booking</h2>

              <div className="space-y-6">
                {/* Services summary */}
                <div>
                  <h3 className="font-bold mb-2">Services</h3>
                  <div className="space-y-2">
                    {selectedServices.map((selected) => {
                      const service = services.find((s) => s._id === selected.serviceId);
                      if (!service) return null;

                      return (
                        <div key={selected.serviceId} className="bg-gray-50 p-3 rounded-lg">
                          <div className="font-semibold">{service.name}</div>
                          <div className="text-sm text-gray-600">
                            {service.duration} min · ${service.price.amount}
                          </div>
                          {selected.addons.length > 0 && (
                            <div className="mt-2 pl-4 border-l-2" style={{ borderColor: primaryColor }}>
                              {selected.addons.map((addonName) => {
                                const addon = service.addons?.find((a) => a.name === addonName);
                                if (!addon) return null;
                                return (
                                  <div key={addonName} className="text-sm text-gray-600">
                                    + {addon.name} (+${addon.price})
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Professional */}
                <div>
                  <h3 className="font-bold mb-2">Professional</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    {selectedProfessional ? (
                      <div>
                        {professionals.find((p) => p._id === selectedProfessional)?.name}
                      </div>
                    ) : (
                      <div className="text-gray-600">First available</div>
                    )}
                  </div>
                </div>

                {/* Date &amp; Time */}
                <div>
                  <h3 className="font-bold mb-2">Date &amp; Time</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div>{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                    <div className="text-gray-600">{selectedTime}</div>
                  </div>
                </div>

                {/* Client info */}
                <div>
                  <h3 className="font-bold mb-2">Contact Information</h3>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div>{clientName}</div>
                    <div className="text-gray-600">{clientPhone}</div>
                    {notes && (
                      <div className="mt-2 text-sm text-gray-600 italic">{notes}</div>
                    )}
                  </div>
                </div>

                {/* Total */}
                <div className="border-t-2 pt-4">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total Duration:</span>
                    <span>{totalDuration} minutes</span>
                  </div>
                  <div className="flex justify-between text-2xl font-bold mt-2">
                    <span>Total Price:</span>
                    <span style={{ color: primaryColor }}>${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex justify-between">
          <button
            onClick={prevStep}
            disabled={step === 1}
            className="px-6 py-3 rounded-lg border-2 border-gray-300 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Back
          </button>

          {step < 5 ? (
            <button
              onClick={nextStep}
              disabled={!canGoToStep(step + 1)}
              className="px-6 py-3 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: canGoToStep(step + 1) ? primaryColor : undefined }}
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-3 rounded-lg font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: !submitting ? primaryColor : undefined }}
            >
              {submitting ? 'Creating booking...' : 'Confirm Booking'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
