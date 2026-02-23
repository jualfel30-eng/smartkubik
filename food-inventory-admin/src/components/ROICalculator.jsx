import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

const SLIDER_STYLE = {
  WebkitAppearance: 'none',
  appearance: 'none',
  height: '6px',
  background: 'linear-gradient(90deg, #06b6d4, #10b981)',
  borderRadius: '999px',
  outline: 'none',
  cursor: 'pointer',
};

const SliderInput = ({ label, labelEn, value, onChange, min, max, step = 1, suffix, suffixEn, language }) => (
  <div>
    <div className="flex justify-between items-baseline mb-2">
      <label className="text-sm text-gray-400">
        <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>{label}</span>
        <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>{labelEn}</span>
      </label>
      <span className="text-lg font-bold text-white font-mono">
        {typeof value === 'number' && value >= 1000 ? value.toLocaleString() : value}
        <span className="text-gray-500 text-sm font-normal ml-1">
          <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>{suffix}</span>
          <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>{suffixEn}</span>
        </span>
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
      style={SLIDER_STYLE}
    />
    <div className="flex justify-between text-xs text-gray-600 mt-1">
      <span>{min}</span>
      <span>{max}</span>
    </div>
  </div>
);

const ResultCard = ({ label, labelEn, value, subtitle, subtitleEn, color, language }) => (
  <div className="text-center p-4 rounded-xl border border-white/10" style={{ background: 'rgba(255,255,255,0.03)' }}>
    <p className="text-xs text-gray-500 mb-1">
      <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>{label}</span>
      <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>{labelEn}</span>
    </p>
    <p className={`text-2xl md:text-3xl font-bold font-mono ${color}`}>
      {value}
    </p>
    {subtitle && (
      <p className="text-xs text-gray-500 mt-1">
        <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>{subtitle}</span>
        <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>{subtitleEn}</span>
      </p>
    )}
  </div>
);

const ROICalculator = ({ language = 'es' }) => {
  const [employees, setEmployees] = useState(5);
  const [monthlyRevenue, setMonthlyRevenue] = useState(10000);
  const [adminHours, setAdminHours] = useState(3);
  const [wastePercent, setWastePercent] = useState(8);

  const results = useMemo(() => {
    // Average hourly cost for LATAM SMB employee
    const hourlyRate = 5;

    // Time savings: SmartKubik typically saves ~60% of admin time
    const dailyHoursSaved = adminHours * 0.6;
    const monthlyHoursSaved = dailyHoursSaved * 26; // 26 working days
    const monthlyTimeSavings = monthlyHoursSaved * hourlyRate * employees;

    // Waste reduction: SmartKubik reduces waste by ~40%
    const currentMonthlyWaste = (monthlyRevenue * wastePercent) / 100;
    const wasteReduction = currentMonthlyWaste * 0.4;

    // Error reduction savings (conservative: 2% of revenue from fewer errors)
    const errorSavings = monthlyRevenue * 0.02;

    // Total monthly savings
    const totalMonthlySavings = monthlyTimeSavings + wasteReduction + errorSavings;
    const totalAnnualSavings = totalMonthlySavings * 12;

    // SmartKubik cost (matches plan tiers)
    let skCost = 19; // Starter
    if (employees >= 2 && employees <= 3) skCost = 39; // Fundamental
    else if (employees >= 4 && employees <= 8) skCost = 99; // Crecimiento
    else if (employees >= 9) skCost = 149; // Expansión

    // ROI percentage
    const roi = skCost > 0 ? Math.round(((totalMonthlySavings - skCost) / skCost) * 100) : 0;

    // Payback in days
    const paybackDays = totalMonthlySavings > 0 ? Math.max(1, Math.round((skCost / totalMonthlySavings) * 30)) : 30;

    return {
      dailyHoursSaved: dailyHoursSaved.toFixed(1),
      monthlyTimeSavings: Math.round(monthlyTimeSavings),
      wasteReduction: Math.round(wasteReduction),
      errorSavings: Math.round(errorSavings),
      totalMonthlySavings: Math.round(totalMonthlySavings),
      totalAnnualSavings: Math.round(totalAnnualSavings),
      skCost,
      roi,
      paybackDays,
    };
  }, [employees, monthlyRevenue, adminHours, wastePercent]);

  return (
    <div className="glass-card rounded-3xl p-6 md:p-10 max-w-4xl mx-auto border border-white/10">
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
          <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>
            Calculadora de{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">ROI</span>
          </span>
          <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>
            <span className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">ROI</span>{' '}
            Calculator
          </span>
        </h3>
        <p className="text-gray-400 text-sm">
          <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Descubre cuánto puede ahorrar tu negocio con SmartKubik</span>
          <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Discover how much your business can save with SmartKubik</span>
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Inputs */}
        <div className="space-y-6">
          <SliderInput
            label="Empleados" labelEn="Employees"
            value={employees} onChange={setEmployees}
            min={1} max={30}
            suffix="personas" suffixEn="people"
            language={language}
          />
          <SliderInput
            label="Ingreso mensual" labelEn="Monthly revenue"
            value={monthlyRevenue} onChange={setMonthlyRevenue}
            min={1000} max={100000} step={1000}
            suffix="USD" suffixEn="USD"
            language={language}
          />
          <SliderInput
            label="Horas diarias en tareas admin" labelEn="Daily admin hours"
            value={adminHours} onChange={setAdminHours}
            min={1} max={8}
            suffix="h/día" suffixEn="h/day"
            language={language}
          />
          <SliderInput
            label="Merma / desperdicio actual" labelEn="Current waste rate"
            value={wastePercent} onChange={setWastePercent}
            min={1} max={20}
            suffix="%" suffixEn="%"
            language={language}
          />
        </div>

        {/* Results */}
        <div className="space-y-4">
          {/* Breakdown */}
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">
                <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Ahorro en tiempo ({results.dailyHoursSaved}h/día)</span>
                <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Time savings ({results.dailyHoursSaved}h/day)</span>
              </span>
              <span className="text-emerald-400 font-mono font-semibold">+${results.monthlyTimeSavings.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">
                <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Reducción de merma (-40%)</span>
                <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Waste reduction (-40%)</span>
              </span>
              <span className="text-emerald-400 font-mono font-semibold">+${results.wasteReduction.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">
                <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Menos errores operativos</span>
                <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Fewer operational errors</span>
              </span>
              <span className="text-emerald-400 font-mono font-semibold">+${results.errorSavings.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">
                <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Costo SmartKubik</span>
                <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>SmartKubik cost</span>
              </span>
              <span className="text-red-400 font-mono font-semibold">-${results.skCost}</span>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <ResultCard
              label="Ahorro mensual" labelEn="Monthly savings"
              value={`$${results.totalMonthlySavings.toLocaleString()}`}
              subtitle="/mes" subtitleEn="/mo"
              color="text-emerald-400"
              language={language}
            />
            <ResultCard
              label="Ahorro anual" labelEn="Annual savings"
              value={`$${results.totalAnnualSavings.toLocaleString()}`}
              subtitle="/año" subtitleEn="/yr"
              color="text-cyan-400"
              language={language}
            />
            <ResultCard
              label="ROI" labelEn="ROI"
              value={`${results.roi}%`}
              subtitle={`${results.paybackDays} días payback`}
              subtitleEn={`${results.paybackDays} days payback`}
              color="text-amber-400"
              language={language}
            />
          </div>

          {/* CTA */}
          <Link
            to="/register"
            className="block w-full text-center py-3 rounded-xl text-white font-semibold transition-all duration-300 mt-2"
            style={{
              background: 'linear-gradient(135deg, #06b6d4 0%, #10b981 100%)',
              boxShadow: '0 6px 20px rgba(6, 182, 212, 0.3)',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(6, 182, 212, 0.5)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(6, 182, 212, 0.3)';
            }}
          >
            <span className={`lang-es ${language === 'es' ? '' : 'hidden'}`}>Probar Gratis 14 Días</span>
            <span className={`lang-en ${language === 'en' ? '' : 'hidden'}`}>Try Free for 14 Days</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ROICalculator;
