import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrmContext } from '@/context/CrmContext';
import { useAccountingContext } from '@/context/AccountingContext';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';

const METHOD_LABELS = {
  efectivo_usd: 'Efectivo (USD)',
  efectivo_ves: 'Efectivo (VES)',
  transferencia_usd: 'Transferencia (USD)',
  transferencia_ves: 'Transferencia (VES)',
  zelle_usd: 'Zelle',
  pago_movil_ves: 'Pago móvil',
  pos_ves: 'POS',
  tarjeta_ves: 'Tarjeta de crédito',
  otros_usd: 'Otro (USD)',
  otros_ves: 'Otro (VES)',
};

const METHOD_TO_DEPOSIT = {
  efectivo_usd: 'efectivo',
  efectivo_ves: 'efectivo',
  transferencia_usd: 'transferencia',
  transferencia_ves: 'transferencia',
  zelle_usd: 'zelle',
  pago_movil_ves: 'pago_movil',
  pos_ves: 'pos',
  tarjeta_ves: 'pos',
  otros_usd: 'otros',
  otros_ves: 'otros',
};

const VES_METHODS = new Set(Object.keys(METHOD_TO_DEPOSIT).filter((key) => key.endsWith('_ves')));
const NO_ACCOUNT_VALUE = '__NO_ACCOUNT__';
const PAYMENT_METHOD_UNSET = '__PAYMENT_METHOD_UNSET__';

const getDefaultPaymentMethodId = (methods = []) => {
  const candidate = methods.find(
    (method) => method && method.id && method.id !== 'pago_mixto',
  );
  return candidate?.id || PAYMENT_METHOD_UNSET;
};

const isVesMethod = (methodId) => VES_METHODS.has(methodId);

const resolveCurrencyFromMethod = (methodId, fallback = 'USD') => {
  if (!methodId) {
    return fallback;
  }
  return isVesMethod(methodId) ? 'VES' : 'USD';
};

const mapMethodToDepositChannel = (methodId) => {
  if (!methodId) {
    return 'otros';
  }
  return METHOD_TO_DEPOSIT[methodId] || METHOD_TO_DEPOSIT[`${methodId}_ves`] || 'otros';
};

const normalizeId = (value) => {
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    if (typeof value.toHexString === 'function') {
      return value.toHexString();
    }
    if (typeof value.toString === 'function') {
      const candidate = value.toString();
      if (candidate && candidate !== '[object Object]') {
        return candidate;
      }
    }
    if (value._id) {
      return normalizeId(value._id);
    }
  }
  return '';
};

const safeNumber = (value, defaultValue = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : defaultValue;
};

const formatCurrency = (value, currency = 'USD', fallback = '--') => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  try {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return `${currency} ${numeric.toFixed(2)}`;
  }
};

const calculateFinancialSummary = (appointment, resourceDetail, exchangeRate) => {
  if (!appointment) {
    return {
      baseAmount: 0,
      baseCurrency: 'USD',
      nights: 1,
      totalUsd: 0,
      totalVes: 0,
      paidUsd: 0,
      paidVes: 0,
      remainingUsd: 0,
      remainingVes: 0,
      addonsUsd: 0,
      addonsVes: 0,
    };
  }

  const metadata = (appointment && typeof appointment.metadata === 'object' && appointment.metadata) || {};
  const billingMetadata = (metadata && typeof metadata.billing === 'object' && metadata.billing) || {};

  const convertAmount = (amount, currency = 'USD') => {
    const numeric = safeNumber(amount, 0);
    const normalizedCurrency = (currency || 'USD').toUpperCase();
    if (normalizedCurrency === 'VES') {
      const usd = exchangeRate ? numeric / exchangeRate : 0;
      return { usd, ves: numeric };
    }
    if (normalizedCurrency === 'USD') {
      const ves = exchangeRate ? numeric * exchangeRate : 0;
      return { usd: numeric, ves };
    }
    // Fallback: treat as USD-equivalent
    const ves = exchangeRate ? numeric * exchangeRate : 0;
    return { usd: numeric, ves };
  };

  const addToTotals = (totals, amount, currency = 'USD') => {
    if (!amount) {
      return totals;
    }
    const { usd, ves } = convertAmount(amount, currency);
    return {
      totalUsd: totals.totalUsd + usd,
      totalVes: totals.totalVes + ves,
    };
  };

  const start = appointment.startTime ? new Date(appointment.startTime) : null;
  const end = appointment.endTime ? new Date(appointment.endTime) : null;
  let nights = 1;
  if (start instanceof Date && end instanceof Date && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
    const diffMs = Math.max(end.getTime() - start.getTime(), 0);
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    nights = Math.max(1, Math.ceil(diffDays || 0));
  }
  const metadataNights = safeNumber(billingMetadata.nights, 0);
  if (metadataNights > 0) {
    nights = metadataNights;
  }

  let baseAmount = 0;
  let baseCurrency = 'USD';
  const totals = { totalUsd: 0, totalVes: 0 };

  const metadataTotalUsd = safeNumber(
    billingMetadata.totalAmountUsd ?? billingMetadata.expectedTotalUsd,
    0,
  );
  const metadataTotal = safeNumber(
    billingMetadata.totalAmount ?? billingMetadata.expectedTotal,
    0,
  );

  let explicitTotal = 0;
  let explicitCurrency = (billingMetadata.totalCurrency || billingMetadata.currency || appointment.billing?.currency || appointment.currency || appointment.baseCurrency || 'USD').toUpperCase();

  if (metadataTotalUsd > 0) {
    explicitTotal = metadataTotalUsd;
    explicitCurrency = 'USD';
  } else if (metadataTotal > 0) {
    explicitTotal = metadataTotal;
    explicitCurrency = (billingMetadata.totalCurrency || billingMetadata.currency || explicitCurrency).toUpperCase();
  }

  if (explicitTotal <= 0) {
    const appointmentTotals = [
      appointment.totalAmount,
      appointment.billing?.total,
      appointment.billing?.totalAmount,
    ];
    for (const candidate of appointmentTotals) {
      const numeric = safeNumber(candidate, 0);
      if (numeric > 0) {
        explicitTotal = numeric;
        break;
      }
    }
  }

  if (explicitTotal > 0) {
    baseAmount = explicitTotal;
    baseCurrency = explicitCurrency || 'USD';
  } else if (safeNumber(appointment.servicePrice, 0) > 0) {
    baseAmount = safeNumber(appointment.servicePrice, 0);
    baseCurrency =
      appointment.metadata?.serviceCurrency ||
      appointment.currency ||
      'USD';
  } else if (safeNumber(billingMetadata.baseRateAmount, 0) > 0) {
    const rateAmount = safeNumber(billingMetadata.baseRateAmount, 0);
    const rateCurrency = billingMetadata.baseRateCurrency || billingMetadata.currency || 'USD';
    const nightsFactor = safeNumber(billingMetadata.nights, nights) || nights;
    baseAmount = safeNumber(
      billingMetadata.totalAmount ?? rateAmount * nightsFactor,
      rateAmount * nightsFactor,
    );
    baseCurrency = rateCurrency || 'USD';
  } else if (
    resourceDetail?.baseRate &&
    safeNumber(resourceDetail.baseRate.amount, 0) > 0
  ) {
    const rateAmount = safeNumber(resourceDetail.baseRate.amount, 0);
    const rateCurrency = resourceDetail.baseRate.currency || 'USD';
    baseAmount = rateAmount * nights;
    baseCurrency = rateCurrency;
  }

  const totalsWithBase = addToTotals(totals, baseAmount, baseCurrency);

  let addonsUsd = safeNumber(billingMetadata.addonsUsd, 0);
  if (addonsUsd <= 0) {
    addonsUsd = (Array.isArray(appointment.addons) ? appointment.addons : []).reduce(
      (sum, addon) =>
        sum +
        safeNumber(addon.price || addon.amount, 0) * safeNumber(addon.quantity, 1),
      0,
    );
  }

  const addonsCurrency =
    billingMetadata.addonsCurrency ||
    appointment.metadata?.addonsCurrency ||
    baseCurrency;

  const totalsWithAddons = addToTotals(
    totalsWithBase,
    addonsUsd,
    addonsCurrency,
  );

  let paidUsd = 0;
  let paidVes = 0;

  const confirmedDeposits = (appointment.depositRecords || []).filter(
    (record) => record.status === 'confirmed',
  );

  confirmedDeposits.forEach((record) => {
    const usdAmount = safeNumber(
      record.confirmedAmountUsd ??
        record.amountUsd ??
        (record.currency === 'USD'
          ? record.confirmedAmount ?? record.amount
          : undefined),
      0,
    );
    const vesAmount = safeNumber(
      record.confirmedAmountVes ??
        record.amountVes ??
        (record.currency === 'VES'
          ? record.confirmedAmount ?? record.amount
          : undefined),
      0,
    );

    if (usdAmount > 0) {
      paidUsd += usdAmount;
      if (exchangeRate) {
        paidVes += usdAmount * exchangeRate;
      }
    } else if (vesAmount > 0) {
      paidVes += vesAmount;
      if (exchangeRate) {
        paidUsd += vesAmount / exchangeRate;
      }
    } else {
      const fallback = convertAmount(
        record.confirmedAmount ?? record.amount ?? 0,
        record.currency,
      );
      paidUsd += fallback.usd;
      paidVes += fallback.ves;
    }
  });

  if (paidUsd <= 0 && paidVes <= 0 && safeNumber(appointment.paidAmount, 0) > 0) {
    const fallback = convertAmount(
      appointment.paidAmount,
      appointment.paymentCurrency || baseCurrency,
    );
    paidUsd += fallback.usd;
    paidVes += fallback.ves;
  }

  const totalUsd = totalsWithAddons.totalUsd;
  const totalVes = totalsWithAddons.totalVes;

  const remainingUsd = Math.max(0, totalUsd - paidUsd);
  const remainingVes = Math.max(
    0,
    totalVes > 0 ? totalVes - paidVes : exchangeRate ? remainingUsd * exchangeRate : 0,
  );

  return {
    baseAmount,
    baseCurrency,
    nights,
    totalUsd,
    totalVes,
    addonsUsd,
    addonsCurrency,
    paidUsd,
    paidVes,
    remainingUsd,
    remainingVes,
  };
};

const mapPaymentMethodToName = (methodId) => {
  const mapping = {
    efectivo_usd: 'Efectivo',
    efectivo_ves: 'Efectivo',
    transferencia_usd: 'Transferencia',
    transferencia_ves: 'Transferencia',
    zelle_usd: 'Zelle',
    pago_movil_ves: 'Pagomóvil',
    pos_ves: 'POS',
    tarjeta_ves: 'Tarjeta de Crédito',
  };
  return mapping[methodId] || methodId;
};

export function AppointmentsPaymentDialog({ isOpen, onClose, appointment, onPaymentSuccess }) {
  const { paymentMethods, loading: crmLoading } = useCrmContext();
  const { triggerRefresh } = useAccountingContext();

  const [paymentMode, setPaymentMode] = useState('single');
  const [singlePayment, setSinglePayment] = useState({
    method: PAYMENT_METHOD_UNSET,
    amount: '',
    reference: '',
    bankAccountId: '',
  });
  const [singleAmountTouched, setSingleAmountTouched] = useState(false);
  const [mixedPayments, setMixedPayments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [exchangeRate, setExchangeRate] = useState(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [resourceDetail, setResourceDetail] = useState(null);
  const [resourceLoading, setResourceLoading] = useState(false);

  const defaultPaymentMethodId = useMemo(
    () => getDefaultPaymentMethodId(paymentMethods),
    [paymentMethods],
  );

  const effectiveExchangeRate = useMemo(() => {
    if (exchangeRate) {
      return Number(exchangeRate);
    }
    if (Number(appointment?.exchangeRate)) {
      return Number(appointment.exchangeRate);
    }
    const derivedRate =
      Number(appointment?.totalAmountVes) && Number(appointment?.totalAmount)
        ? Number(appointment.totalAmountVes) / Number(appointment.totalAmount)
        : null;
    if (derivedRate && Number.isFinite(derivedRate) && derivedRate > 0) {
      return derivedRate;
    }
    return null;
  }, [appointment, exchangeRate]);

  const financialSummary = useMemo(
    () => calculateFinancialSummary(appointment, resourceDetail, effectiveExchangeRate),
    [appointment, resourceDetail, effectiveExchangeRate],
  );

  const {
    totalUsd,
    totalVes,
    paidUsd,
    paidVes,
    remainingUsd,
    remainingVes,
    baseAmount,
    baseCurrency,
    nights,
    addonsUsd,
    addonsCurrency,
  } = financialSummary;

  const remainingAmount = remainingUsd;
  const remainingAmountVes = remainingVes;

  const computeDefaultAmountForMethod = useCallback(
    (method) => {
      if (!method || method === PAYMENT_METHOD_UNSET) {
        return '';
      }
      if (isVesMethod(method)) {
        if (remainingAmountVes > 0) {
          return remainingAmountVes.toFixed(2);
        }
        if (effectiveExchangeRate) {
          return (remainingAmount * effectiveExchangeRate).toFixed(2);
        }
        return '';
      }
      return remainingAmount.toFixed(2);
    },
    [remainingAmount, remainingAmountVes, effectiveExchangeRate],
  );

  useEffect(() => {
    if (!isOpen || paymentMode !== 'single' || singleAmountTouched) {
      return;
    }
    setSinglePayment((prev) => ({
      ...prev,
      amount: computeDefaultAmountForMethod(prev.method),
    }));
  }, [
    isOpen,
    paymentMode,
    singleAmountTouched,
    computeDefaultAmountForMethod,
  ]);

  useEffect(() => {
    if (appointment && isOpen) {
      const method = defaultPaymentMethodId;
      setPaymentMode('single');
      setSinglePayment({
        method,
        amount: computeDefaultAmountForMethod(method),
        reference: '',
        bankAccountId: '',
      });
      setSingleAmountTouched(false);
      setMixedPayments([]);
    }
  }, [appointment, isOpen, defaultPaymentMethodId, computeDefaultAmountForMethod]);

  useEffect(() => {
    if (paymentMode === 'mixed' && mixedPayments.length === 0) {
      const method = defaultPaymentMethodId;
      setMixedPayments([
        { id: Date.now(), amount: '', method, reference: '', bankAccountId: '' },
        { id: Date.now() + 1, amount: '', method, reference: '', bankAccountId: '' },
      ]);
    }
  }, [paymentMode, mixedPayments.length, defaultPaymentMethodId]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setLoadingAccounts(true);
    fetchApi('/bank-accounts')
      .then((data) => {
        setBankAccounts(Array.isArray(data) ? data : data?.data || []);
      })
      .catch((err) => {
        console.error('Error loading bank accounts:', err);
        toast.error('Error al cargar las cuentas bancarias');
        setBankAccounts([]);
      })
      .finally(() => {
        setLoadingAccounts(false);
      });

    setLoadingRate(true);
    fetchApi('/exchange-rate/bcv')
      .then((data) => {
        if (data && data.rate) {
          setExchangeRate(data.rate);
        }
      })
      .catch((err) => {
        console.error('Error loading exchange rate:', err);
      })
      .finally(() => {
        setLoadingRate(false);
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setResourceDetail(null);
      setResourceLoading(false);
      return;
    }
    const servicePriceValue = safeNumber(appointment?.servicePrice, 0);
    const needsResourcePricing =
      appointment &&
      servicePriceValue <= 0 &&
      !appointment?.serviceId &&
      (appointment?.resourceId || appointment?.resource);

    const resourceId = normalizeId(
      appointment?.resourceId?._id ||
        appointment?.resourceId ||
        appointment?.resource?._id ||
        appointment?.resource,
    );

    if (!needsResourcePricing || !resourceId) {
      setResourceDetail(null);
      setResourceLoading(false);
      return;
    }

    let cancelled = false;
    const fetchResource = async () => {
      try {
        setResourceLoading(true);
        const response = await fetchApi(`/resources/${resourceId}`);
        if (cancelled) {
          return;
        }
        const detail =
          response?.data ||
          response?.resource ||
          response ||
          null;
        setResourceDetail(detail);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading resource pricing:', error);
          setResourceDetail(null);
        }
      } finally {
        if (!cancelled) {
          setResourceLoading(false);
        }
      }
    };

    fetchResource();

    return () => {
      cancelled = true;
    };
  }, [appointment, isOpen]);

  const filteredBankAccounts = useMemo(() => {
    if (!singlePayment.method || singlePayment.method === PAYMENT_METHOD_UNSET) {
      return [];
    }
    const methodName = mapPaymentMethodToName(singlePayment.method);
    return bankAccounts.filter(
      (account) =>
        Array.isArray(account.acceptedPaymentMethods) &&
        account.acceptedPaymentMethods.some(
          (pm) =>
            pm === methodName ||
            pm?.toLowerCase?.().includes(methodName.toLowerCase()),
        ),
    );
  }, [bankAccounts, singlePayment.method]);

  const singleMethodHasBankAccounts = filteredBankAccounts.length > 0;

  const handleAddPaymentLine = () => {
    const method = defaultPaymentMethodId;
    setMixedPayments((prev) => [
      ...prev,
      {
        id: Date.now(),
        amount: '',
        method,
        reference: '',
        bankAccountId: '',
      },
    ]);
  };

  const handleUpdatePaymentLine = (id, field, value) => {
    setMixedPayments((prev) =>
      prev.map((payment) => {
        if (payment.id === id) {
          if (field === 'method') {
            return {
              ...payment,
              method: value || PAYMENT_METHOD_UNSET,
              bankAccountId: '',
            };
          }
          if (field === 'bankAccountId') {
            return {
              ...payment,
              bankAccountId: value === NO_ACCOUNT_VALUE ? '' : value,
            };
          }
          return { ...payment, [field]: value };
        }
        return payment;
      }),
    );
  };

  const handleRemovePaymentLine = (id) => {
    setMixedPayments((prev) => prev.filter((payment) => payment.id !== id));
  };

  const mixedPaymentTotals = useMemo(() => {
    if (paymentMode !== 'mixed') {
      return { subtotalUSD: 0, totalUSD: 0, totalVES: 0 };
    }
    const rate = effectiveExchangeRate || 0;
    const totals = mixedPayments.reduce(
      (acc, line) => {
        const amount = Number(line.amount || 0);
        if (amount <= 0) {
          return acc;
        }
        if (isVesMethod(line.method)) {
          acc.totalVES += amount;
          if (rate > 0) {
            acc.subtotalUSD += amount / rate;
          }
        } else {
          acc.subtotalUSD += amount;
          if (rate > 0) {
            acc.totalVES += amount * rate;
          }
        }
        return acc;
      },
      { subtotalUSD: 0, totalVES: 0 },
    );
    return {
      subtotalUSD: totals.subtotalUSD,
      totalUSD: totals.subtotalUSD,
      totalVES: totals.totalVES,
    };
  }, [mixedPayments, paymentMode, effectiveExchangeRate]);

  const mapLineToPayload = useCallback(
    (line) => {
      const method = line.method;
      if (!method || method === PAYMENT_METHOD_UNSET) {
        throw new Error('Selecciona un método de pago.');
      }
      const currency = resolveCurrencyFromMethod(method);
      const rate = effectiveExchangeRate || 0;

      let amountUsd = line.amountUsd !== undefined ? Number(line.amountUsd) : undefined;
      let amountVes = line.amountVes !== undefined ? Number(line.amountVes) : undefined;

      if (amountUsd !== undefined && Number.isNaN(amountUsd)) {
        amountUsd = undefined;
      }
      if (amountVes !== undefined && Number.isNaN(amountVes)) {
        amountVes = undefined;
      }

      if (amountUsd === undefined && amountVes === undefined) {
        const rawAmount = Number(line.amount || 0);
        if (rawAmount <= 0) {
          throw new Error('El monto del pago debe ser mayor a cero.');
        }
        if (currency === 'VES') {
          amountVes = rawAmount;
          if (rate > 0) {
            amountUsd = rawAmount / rate;
          }
        } else {
          amountUsd = rawAmount;
          if (rate > 0) {
            amountVes = rawAmount * rate;
          }
        }
      }

      if (currency === 'VES' && (amountVes === undefined || amountVes <= 0)) {
        throw new Error('El monto en VES debe ser mayor a cero.');
      }
      if (currency === 'USD' && (amountUsd === undefined || amountUsd <= 0)) {
        throw new Error('El monto en USD debe ser mayor a cero.');
      }

      return {
        currency,
        method: mapMethodToDepositChannel(method),
        amountUsd: amountUsd !== undefined && amountUsd > 0 ? amountUsd : undefined,
        amountVes: amountVes !== undefined && amountVes > 0 ? amountVes : undefined,
        reference: line.reference?.trim() || undefined,
        bankAccountId:
          line.bankAccountId && line.bankAccountId !== NO_ACCOUNT_VALUE
            ? line.bankAccountId
            : undefined,
      };
    },
    [effectiveExchangeRate],
  );

  const registerDeposit = useCallback(
    async (appointmentId, payload, notes) => {
      let resolvedAmount =
        payload.amountUsd ?? payload.amountVes ?? payload.amount;
      if (payload.currency === 'USD' && payload.amountUsd !== undefined) {
        resolvedAmount = payload.amountUsd;
      } else if (
        payload.currency === 'VES' &&
        payload.amountVes !== undefined
      ) {
        resolvedAmount = payload.amountVes;
      }

      const confirmedAmount = Number(
        resolvedAmount ?? payload.amountUsd ?? payload.amountVes ?? 0,
      );

      const transactionDate = new Date().toISOString();

      const body = {
        amount: resolvedAmount,
        currency: payload.currency,
        method: payload.method,
        reference: payload.reference,
        bankAccountId: payload.bankAccountId,
        amountUsd: payload.amountUsd,
        amountVes: payload.amountVes,
        exchangeRate: effectiveExchangeRate || undefined,
        notes,
        status: 'confirmed',
        confirmedAmount,
        transactionDate,
      };

      await fetchApi(`/appointments/${appointmentId}/manual-deposits`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
    },
    [effectiveExchangeRate],
  );

  const handleSubmit = async () => {
    if (!appointment) {
      return;
    }

    const appointmentId = appointment._id || appointment.id;
    if (!appointmentId) {
      toast.error('No se pudo identificar la cita para registrar el pago.');
      return;
    }

    if (remainingAmount <= 0) {
      toast.error('No hay saldo pendiente para registrar.');
      return;
    }

    const normalizeBankAccountId = (value) =>
      value && value !== NO_ACCOUNT_VALUE ? value : undefined;

    let paymentLines = [];

    if (paymentMode === 'single') {
      if (
        !singlePayment.method ||
        singlePayment.method === PAYMENT_METHOD_UNSET
      ) {
        toast.error('Selecciona un método de pago.');
        return;
      }

      const rawAmount = Number(singlePayment.amount || 0);
      if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
        toast.error('Indica un monto mayor a 0 para registrar el pago.');
        return;
      }

      const isVesSingle = isVesMethod(singlePayment.method);
      const epsilon = 0.01;
      if (!isVesSingle && rawAmount - remainingAmount > epsilon) {
        toast.error('El monto en USD no puede exceder el saldo pendiente.');
        return;
      }
      if (isVesSingle) {
        if (remainingAmountVes > 0 && rawAmount - remainingAmountVes > 0.5) {
          toast.error('El monto en VES no puede exceder el saldo pendiente.');
          return;
        }
        if (remainingAmountVes <= 0 && effectiveExchangeRate) {
          const usdEquivalent = rawAmount / effectiveExchangeRate;
          if (usdEquivalent - remainingAmount > epsilon) {
            toast.error('El monto en VES excede el saldo pendiente.');
            return;
          }
        }
      }

      let payload;
      try {
        payload = mapLineToPayload({
          method: singlePayment.method,
          amount: rawAmount,
          amountUsd: isVesSingle ? undefined : rawAmount,
          amountVes: isVesSingle ? rawAmount : undefined,
          reference: singlePayment.reference,
          bankAccountId: normalizeBankAccountId(singlePayment.bankAccountId),
        });
      } catch (error) {
        toast.error(error?.message || 'Monto inválido para registrar el pago.');
        return;
      }

      paymentLines = [
        {
          payload,
          notes: 'Pago registrado desde Agenda (pago único)',
        },
      ];
    } else {
      if (mixedPayments.length === 0) {
        toast.error('Añade al menos una línea de pago.');
        return;
      }

      if (
        mixedPayments.some(
          (line) =>
            Number(line.amount) <= 0 ||
            !line.method ||
            line.method === PAYMENT_METHOD_UNSET,
        )
      ) {
        toast.error('Cada línea de pago debe tener un monto mayor a 0 y un método seleccionado.');
        return;
      }

      try {
        paymentLines = mixedPayments.map((line) => {
          const rawAmount = Number(line.amount || 0);
          const payload = mapLineToPayload({
            method: line.method,
            amount: rawAmount,
            amountUsd: isVesMethod(line.method) ? undefined : rawAmount,
            amountVes: isVesMethod(line.method) ? rawAmount : undefined,
            reference: line.reference,
            bankAccountId: normalizeBankAccountId(line.bankAccountId),
          });
          return {
            payload,
            notes: 'Pago mixto registrado desde Agenda',
          };
        });
        const totalUsdScheduled = paymentLines.reduce((sum, line) => {
          if (line.payload?.amountUsd && line.payload.amountUsd > 0) {
            return sum + line.payload.amountUsd;
          }
          if (
            line.payload?.currency === 'VES' &&
            line.payload.amountVes &&
            effectiveExchangeRate
          ) {
            return sum + line.payload.amountVes / effectiveExchangeRate;
          }
          return sum;
        }, 0);
        if (totalUsdScheduled - remainingAmount > 0.05) {
          toast.error('El total de los pagos excede el saldo pendiente.');
          return;
        }
      } catch (error) {
        toast.error(error?.message || 'Revisa los montos y métodos de pago.');
        return;
      }
    }

    try {
      setIsSubmitting(true);
      for (const line of paymentLines) {
        await registerDeposit(appointmentId, line.payload, line.notes);
      }
      toast.success('Pago registrado correctamente.');
      if (onPaymentSuccess) {
        await onPaymentSuccess();
      }
      triggerRefresh();
    } catch (error) {
      console.error('Error registering appointment payment:', error);
      toast.error(error?.message || 'No pudimos registrar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!appointment) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Registrar pago de reserva</DialogTitle>
          <DialogDescription>
            Cita #{appointment._id?.slice(-6) || appointment.id?.slice(-6) || ''}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-muted/40 px-3 py-2 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Total estimado</p>
              <p className="font-semibold">
                {formatCurrency(totalUsd, 'USD')}
              </p>
              {effectiveExchangeRate && totalVes > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(totalVes, 'VES')}
                </p>
              ) : null}
              {baseAmount > 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Tarifa base: {formatCurrency(baseAmount, baseCurrency)}{nights > 1 ? ` · ${nights} noches` : ''}
                  {addonsUsd > 0
                    ? ` · Extras ${formatCurrency(addonsUsd, (addonsCurrency || 'USD').toUpperCase())}`
                    : ''}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pagado</p>
              <p className="font-semibold">
                {formatCurrency(paidUsd, 'USD')}
              </p>
              {effectiveExchangeRate && paidVes > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(paidVes, 'VES')}
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Saldo pendiente</p>
              <p className="font-semibold">
                {formatCurrency(remainingAmount, 'USD')}
              </p>
              {effectiveExchangeRate && remainingAmountVes > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(remainingAmountVes, 'VES')}
                </p>
              ) : null}
            </div>
          </div>

          {totalUsd <= 0 && !resourceLoading ? (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              Configura una tarifa base en la habitación o asigna un servicio con precio para calcular el saldo automáticamente.
            </p>
          ) : null}

          <Select
            value={paymentMode}
            onValueChange={(value) => {
              setPaymentMode(value);
              if (value === 'single') {
                setSingleAmountTouched(false);
                setSinglePayment((prev) => {
                  const nextMethod =
                    prev.method && prev.method !== PAYMENT_METHOD_UNSET
                      ? prev.method
                      : defaultPaymentMethodId;
                  return {
                    ...prev,
                    method: nextMethod,
                    amount: computeDefaultAmountForMethod(nextMethod),
                  };
                });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Pago único</SelectItem>
              <SelectItem value="mixed">Pago mixto</SelectItem>
            </SelectContent>
          </Select>

          {paymentMode === 'single' ? (
            <div className="p-4 border rounded-lg space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-method" className="text-right">
                  Método
                </Label>
                <Select
                  value={singlePayment.method}
                  onValueChange={(value) => {
                    setSingleAmountTouched(false);
                    setSinglePayment((prev) => ({
                      ...prev,
                      method: value,
                      amount: computeDefaultAmountForMethod(value),
                      bankAccountId: '',
                    }));
                  }}
                  disabled={crmLoading}
                >
                  <SelectTrigger id="single-method" className="col-span-3">
                    <SelectValue placeholder="Selecciona un método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PAYMENT_METHOD_UNSET} disabled>
                      Selecciona un método
                    </SelectItem>
                    {paymentMethods
                      .filter((method) => method.id && method.id !== 'pago_mixto')
                      .map((method) => (
                        <SelectItem key={method.id} value={method.id}>
                          {method.name || METHOD_LABELS[method.id] || method.id}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-amount" className="text-right">
                  Monto ({isVesMethod(singlePayment.method) ? 'VES' : 'USD'})
                </Label>
                <Input
                  id="single-amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={singlePayment.amount}
                  onChange={(event) => {
                    setSingleAmountTouched(true);
                    setSinglePayment((prev) => ({ ...prev, amount: event.target.value }));
                  }}
                  className="col-span-3"
                  placeholder="0.00"
                />
              </div>

              {singleMethodHasBankAccounts && (
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="single-bank-account" className="text-right">
                    Cuenta bancaria
                  </Label>
                  <Select
                    value={singlePayment.bankAccountId || NO_ACCOUNT_VALUE}
                    onValueChange={(value) =>
                      setSinglePayment((prev) => ({
                        ...prev,
                        bankAccountId: value === NO_ACCOUNT_VALUE ? '' : value,
                      }))
                    }
                    disabled={
                      loadingAccounts ||
                      !singlePayment.method ||
                      singlePayment.method === PAYMENT_METHOD_UNSET
                    }
                  >
                    <SelectTrigger id="single-bank-account" className="col-span-3">
                      <SelectValue
                        placeholder={
                          loadingAccounts ? 'Cargando...' : 'Selecciona una cuenta (opcional)'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_ACCOUNT_VALUE}>Sin cuenta</SelectItem>
                      {filteredBankAccounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.bankName} · {account.accountNumber?.slice(-4)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="single-reference" className="text-right">
                  Referencia
                </Label>
                <Input
                  id="single-reference"
                  value={singlePayment.reference}
                  onChange={(event) =>
                    setSinglePayment((prev) => ({ ...prev, reference: event.target.value }))
                  }
                  className="col-span-3"
                  placeholder="Número o código de referencia"
                />
              </div>

              {effectiveExchangeRate && (
                <p className="text-xs text-muted-foreground">
                  Tasa de cambio (referencial): {effectiveExchangeRate.toFixed(2)}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  Distribuye el monto pendiente entre múltiples métodos de pago.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={handleAddPaymentLine}>
                  Añadir línea
                </Button>
              </div>

              <div className="space-y-3">
                {mixedPayments.map((paymentLine) => (
                  <div key={paymentLine.id} className="grid grid-cols-12 gap-2 items-end border p-3 rounded-md">
                    <div className="col-span-3 space-y-1">
                      <Label>Método</Label>
                      <Select
                        value={paymentLine.method}
                        onValueChange={(value) => handleUpdatePaymentLine(paymentLine.id, 'method', value)}
                        disabled={crmLoading}
                      >
                      <SelectTrigger>
                        <SelectValue placeholder="Método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PAYMENT_METHOD_UNSET} disabled>
                          Selecciona un método
                        </SelectItem>
                        {paymentMethods
                          .filter((method) => method.id && method.id !== 'pago_mixto')
                          .map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              {method.name || METHOD_LABELS[method.id] || method.id}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label>
                        Monto ({isVesMethod(paymentLine.method) ? 'VES' : 'USD'})
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={paymentLine.amount}
                        onChange={(event) =>
                          handleUpdatePaymentLine(paymentLine.id, 'amount', event.target.value)
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label>Referencia</Label>
                      <Input
                        value={paymentLine.reference}
                        onChange={(event) =>
                          handleUpdatePaymentLine(paymentLine.id, 'reference', event.target.value)
                        }
                        placeholder="Referencia"
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <Label>Cuenta bancaria</Label>
                      <Select
                        value={paymentLine.bankAccountId || NO_ACCOUNT_VALUE}
                        onValueChange={(value) =>
                          handleUpdatePaymentLine(paymentLine.id, 'bankAccountId', value)
                        }
                        disabled={loadingAccounts}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Opcional" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_ACCOUNT_VALUE}>Sin cuenta</SelectItem>
                          {bankAccounts.map((account) => (
                            <SelectItem key={account._id} value={account._id}>
                              {account.bankName} · {account.accountNumber?.slice(-4)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemovePaymentLine(paymentLine.id)}
                        disabled={mixedPayments.length <= 1}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                <p>
                  Total declarado: ${mixedPaymentTotals.totalUSD.toFixed(2)}
                  {mixedPaymentTotals.totalVES > 0 && effectiveExchangeRate
                    ? ` / Bs ${mixedPaymentTotals.totalVES.toFixed(2)}`
                    : ''}
                </p>
                <p>
                  Saldo pendiente original: ${remainingAmount.toFixed(2)}
                  {remainingAmountVes > 0 && effectiveExchangeRate
                    ? ` / Bs ${remainingAmountVes.toFixed(2)}`
                    : ''}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Registrando...' : 'Registrar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
