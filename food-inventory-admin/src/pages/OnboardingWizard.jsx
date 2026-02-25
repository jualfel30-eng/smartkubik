import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  ChevronRight,
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
  ShoppingCart,
  PartyPopper,
  Check,
  LayoutDashboard,
  Globe,
  Package,
  Users,
  SkipForward,
} from 'lucide-react';
import {
  ONBOARDING_STEPS,
  STEP_LABELS,
  getVerticalConfig,
} from '@/config/onboardingConfig';

// ── Animation variants ───────────────────────────────────────
const pageVariants = {
  enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
};

const pageTrans = { type: 'tween', duration: 0.3, ease: 'easeInOut' };

// ── Progress bar ─────────────────────────────────────────────
function ProgressBar({ current, total }) {
  return (
    <div className="w-full max-w-xl mx-auto px-4 pt-6 pb-2">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: total }).map((_, i) => (
          <React.Fragment key={i}>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i < current
                  ? 'bg-emerald-500 text-white'
                  : i === current
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            {i < total - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 transition-colors ${
                  i < current ? 'bg-emerald-500' : 'bg-muted'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {Object.values(STEP_LABELS).map((label) => (
          <span key={label} className="w-8 text-center">
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Step 0: Welcome ──────────────────────────────────────────
function WelcomeStep({ tenant, vConfig, onNext, onSkipAll }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-10 max-w-lg mx-auto">
      <div className="text-6xl mb-6">{vConfig.emoji}</div>
      <h1 className="text-3xl font-bold text-foreground mb-2">
        ¡Bienvenido a SmartKubik!
      </h1>
      <p className="text-muted-foreground mb-1">
        <span className="font-semibold text-foreground">{tenant?.name}</span>
      </p>
      <p className="text-muted-foreground mb-8 max-w-sm">
        Vamos a configurar tu negocio en 5 minutos. Podrás cambiar todo esto
        después en Configuración.
      </p>
      <Button size="lg" className="w-full max-w-xs mb-3" onClick={onNext}>
        Empezar <ChevronRight className="ml-2 w-4 h-4" />
      </Button>
      <button
        onClick={onSkipAll}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
      >
        Saltar configuración
      </button>
    </div>
  );
}

// ── Step 1: Customize ────────────────────────────────────────
function CustomizeStep({ tenant, vConfig, onNext, onBack }) {
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(tenant?.logo || null);
  const [currency, setCurrency] = useState('USD');
  const [ivaRate, setIvaRate] = useState('16');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleNext = async () => {
    // Upload logo if selected
    if (logoFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', logoFile);
        await fetchApi('/tenant/logo', { method: 'POST', body: formData });
      } catch {
        // Non-blocking — logo can be uploaded later
      }
      setUploading(false);
    }

    // Update currency & tax settings
    try {
      await fetchApi('/tenant/settings', {
        method: 'PUT',
        body: JSON.stringify({
          settings: {
            currency: { primary: currency },
            taxes: { ivaRate: parseFloat(ivaRate) || 16 },
          },
        }),
      });
    } catch {
      // Non-blocking
    }

    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Personaliza tu negocio</h2>
      <p className="text-muted-foreground mb-6">
        Configura los datos básicos de tu {vConfig.label.toLowerCase()}.
      </p>

      {/* Logo */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Logo</label>
        <div className="flex items-center gap-4">
          <div
            className="w-20 h-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary/50 transition-colors bg-muted/30"
            onClick={() => fileRef.current?.click()}
          >
            {logoPreview ? (
              <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {logoPreview ? 'Cambiar' : 'Subir logo'}
            </Button>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG. Max 2 MB.</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Vertical display */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Tipo de negocio</label>
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg">
          <span className="text-lg">{vConfig.emoji}</span>
          <span className="text-sm font-medium">{vConfig.label}</span>
          <Badge variant="secondary" className="ml-auto text-xs">Configurado</Badge>
        </div>
      </div>

      {/* Currency */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm font-medium mb-2 block">Moneda principal</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="USD">USD - Dólar</option>
            <option value="VES">VES - Bolívar</option>
            <option value="COP">COP - Peso colombiano</option>
            <option value="MXN">MXN - Peso mexicano</option>
            <option value="ARS">ARS - Peso argentino</option>
            <option value="EUR">EUR - Euro</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Tasa IVA (%)</label>
          <Input
            type="number"
            value={ivaRate}
            onChange={(e) => setIvaRate(e.target.value)}
            placeholder="16"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={uploading}>
          {uploading ? 'Subiendo...' : 'Siguiente'}
          {!uploading && <ChevronRight className="ml-2 w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: First Products ───────────────────────────────────
function ProductsStep({ vConfig, onNext, onBack, addedProducts, setAddedProducts }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAddProduct = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetchApi('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          sellingPrice: parseFloat(price) || 0,
          category: category.trim() || 'General',
        }),
      });
      const product = res?.data || res;
      setAddedProducts((prev) => [...prev, { id: product?._id, name: name.trim(), price }]);
      setName('');
      setPrice('');
      setCategory('');
      toast.success(`"${name.trim()}" agregado`);
    } catch (err) {
      toast.error('Error al crear producto', { description: err.message });
    }
    setSaving(false);
  };

  const handleRemove = (idx) => {
    setAddedProducts((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Agrega tus primeros productos</h2>
      <p className="text-muted-foreground mb-6">
        Agrega hasta 3 {vConfig.productLabel}s para empezar. Puedes agregar más después.
      </p>

      {/* Added products list */}
      {addedProducts.length > 0 && (
        <div className="space-y-2 mb-4">
          {addedProducts.map((p, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-sm font-medium">{p.name}</span>
                {p.price && (
                  <span className="text-xs text-muted-foreground">${p.price}</span>
                )}
              </div>
              <button onClick={() => handleRemove(i)} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Quick add form */}
      {addedProducts.length < 3 && (
        <Card className="mb-6">
          <CardContent className="pt-4 space-y-3">
            <Input
              placeholder={vConfig.productPlaceholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="number"
                placeholder="Precio (ej: 10.00)"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <Input
                placeholder={vConfig.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddProduct}
              disabled={!name.trim() || saving}
            >
              <Plus className="w-4 h-4 mr-1" />
              {saving ? 'Guardando...' : 'Agregar producto'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button className="flex-1" onClick={onNext}>
          {addedProducts.length > 0 ? 'Siguiente' : 'Saltar'}
          <ChevronRight className="ml-2 w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 3: First Sale ───────────────────────────────────────
function SaleStep({ addedProducts, onNext, onBack }) {
  const [sold, setSold] = useState(false);
  const [selling, setSelling] = useState(false);

  const handleSell = async () => {
    if (addedProducts.length === 0) {
      // No products — just show celebration
      setSold(true);
      return;
    }
    setSelling(true);
    try {
      const product = addedProducts[0];
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: product.id, name: product.name, quantity: 1, price: parseFloat(product.price) || 0 }],
          status: 'completed',
          paymentStatus: 'paid',
        }),
      });
      setSold(true);
      toast.success('¡Venta registrada!');
    } catch {
      // Even if order creation fails, show celebration
      setSold(true);
    }
    setSelling(false);
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-8 text-center">
      <AnimatePresence mode="wait">
        {!sold ? (
          <motion.div
            key="pre-sale"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/10 flex items-center justify-center">
              <ShoppingCart className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Simula tu primera venta</h2>
            <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
              {addedProducts.length > 0
                ? `Vamos a registrar una venta de prueba con "${addedProducts[0].name}".`
                : 'Prueba cómo se siente completar una venta en SmartKubik.'}
            </p>
            <Button size="lg" onClick={handleSell} disabled={selling} className="mb-4">
              {selling ? 'Procesando...' : '¡Vender!'}
            </Button>
            <div>
              <button
                onClick={onNext}
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
              >
                Saltar
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="post-sale"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            {/* CSS Confetti animation */}
            <div className="relative mb-6">
              <div className="confetti-container">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="confetti-piece"
                    style={{
                      '--x': `${Math.random() * 100}%`,
                      '--delay': `${Math.random() * 0.5}s`,
                      '--color': ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'][i % 5],
                    }}
                  />
                ))}
              </div>
              <PartyPopper className="w-16 h-16 mx-auto text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">¡Felicidades!</h2>
            <p className="text-muted-foreground mb-8">
              Has completado tu primera venta. Así de fácil es usar SmartKubik.
            </p>
            <Button size="lg" onClick={onNext}>
              Continuar <ChevronRight className="ml-2 w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!sold && (
        <div className="mt-6">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
          </Button>
        </div>
      )}

      {/* Confetti CSS */}
      <style>{`
        .confetti-container {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          left: var(--x);
          top: 50%;
          background: var(--color);
          border-radius: 2px;
          animation: confetti-fall 1.5s ease-out var(--delay) forwards;
          opacity: 0;
        }
        @keyframes confetti-fall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; }
          100% { transform: translate(calc((var(--x) - 50%) * 0.5), -120px) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ── Step 4: Module Tour ──────────────────────────────────────
function ModulesStep({ tenant, vConfig, onNext, onBack }) {
  const [modules, setModules] = useState(() => {
    const enabled = tenant?.enabledModules || {};
    const result = {};
    vConfig.moduleTour.forEach((key) => {
      result[key] = enabled[key] !== false; // default on
    });
    return result;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (key) => {
    setModules((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNext = async () => {
    setSaving(true);
    try {
      // Build enabledModules update payload
      const enabledModules = { ...tenant?.enabledModules };
      Object.entries(modules).forEach(([key, val]) => {
        enabledModules[key] = val;
      });
      await fetchApi('/tenant/settings', {
        method: 'PUT',
        body: JSON.stringify({ enabledModules }),
      });
    } catch {
      // Non-blocking
    }
    setSaving(false);
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-8">
      <h2 className="text-2xl font-bold mb-1">Elige tus módulos</h2>
      <p className="text-muted-foreground mb-6">
        Activa los módulos que necesitas. Puedes cambiar esto después en Configuración.
      </p>

      <div className="space-y-2 mb-6">
        {vConfig.moduleTour.map((key) => (
          <div
            key={key}
            className="flex items-center justify-between px-4 py-3 rounded-xl border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium capitalize">
                {vConfig.moduleDescriptions[key]
                  ? key.replace(/([A-Z])/g, ' $1').trim()
                  : key}
              </p>
              {vConfig.moduleDescriptions[key] && (
                <p className="text-xs text-muted-foreground truncate">
                  {vConfig.moduleDescriptions[key]}
                </p>
              )}
            </div>
            <Switch checked={modules[key]} onCheckedChange={() => toggle(key)} />
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Atrás
        </Button>
        <Button className="flex-1" onClick={handleNext} disabled={saving}>
          {saving ? 'Guardando...' : 'Siguiente'}
          {!saving && <ChevronRight className="ml-2 w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ── Step 5: CTA Final ────────────────────────────────────────
function CtaStep({ navigate }) {
  const actions = [
    { label: 'Ir al Dashboard', icon: LayoutDashboard, path: '/dashboard', primary: true },
    { label: 'Configurar Web de Ventas', icon: Globe, path: '/storefront' },
    { label: 'Agregar más productos', icon: Package, path: '/inventory-management' },
    { label: 'Invitar equipo', icon: Users, path: '/settings' },
  ];

  return (
    <div className="max-w-lg mx-auto px-6 py-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', duration: 0.6 }}
      >
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold mb-2">¡Tu negocio está listo!</h2>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          SmartKubik está configurado y funcionando. ¿Qué quieres hacer ahora?
        </p>
      </motion.div>

      <div className="grid gap-3">
        {actions.map((action) => (
          <Button
            key={action.path}
            variant={action.primary ? 'default' : 'outline'}
            size="lg"
            className="w-full justify-start"
            onClick={() => navigate(action.path)}
          >
            <action.icon className="w-5 h-5 mr-3" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

// ── Main Wizard ──────────────────────────────────────────────
export default function OnboardingWizard() {
  const { tenant, updateTenantContext } = useAuth();
  const navigate = useNavigate();

  const vConfig = getVerticalConfig(tenant?.vertical);
  const [step, setStep] = useState(() => tenant?.onboardingStep || 0);
  const [direction, setDirection] = useState(1);
  const [addedProducts, setAddedProducts] = useState([]);

  // Persist progress to backend
  const persistProgress = useCallback(
    async (newStep, opts = {}) => {
      const stepsCompleted = ONBOARDING_STEPS.slice(0, newStep);
      const payload = {
        step: newStep,
        stepsCompleted,
        ...opts,
      };

      try {
        await fetchApi('/tenant/onboarding-progress', {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
      } catch {
        // Non-blocking
      }

      updateTenantContext({
        onboardingStep: newStep,
        onboardingStepsCompleted: stepsCompleted,
        ...(opts.completed ? { onboardingCompleted: true } : {}),
        ...(opts.skipped ? { onboardingCompleted: true } : {}),
      });
    },
    [updateTenantContext],
  );

  const goNext = useCallback(() => {
    const next = step + 1;
    setDirection(1);

    if (next >= ONBOARDING_STEPS.length) {
      // Final step — mark completed
      persistProgress(next, { completed: true });
      return;
    }

    setStep(next);
    persistProgress(next);
  }, [step, persistProgress]);

  const goBack = useCallback(() => {
    if (step <= 0) return;
    setDirection(-1);
    setStep(step - 1);
  }, [step]);

  const skipAll = useCallback(() => {
    persistProgress(ONBOARDING_STEPS.length, { skipped: true });
    navigate('/dashboard', { replace: true });
  }, [persistProgress, navigate]);

  // If wizard is already completed (e.g. user navigated here manually), redirect
  useEffect(() => {
    if (tenant?.onboardingCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [tenant?.onboardingCompleted, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProgressBar current={step} total={ONBOARDING_STEPS.length} />

      <div className="flex-1 flex items-start justify-center pt-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={pageVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={pageTrans}
            className="w-full"
          >
            {step === 0 && (
              <WelcomeStep
                tenant={tenant}
                vConfig={vConfig}
                onNext={goNext}
                onSkipAll={skipAll}
              />
            )}
            {step === 1 && (
              <CustomizeStep
                tenant={tenant}
                vConfig={vConfig}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 2 && (
              <ProductsStep
                vConfig={vConfig}
                onNext={goNext}
                onBack={goBack}
                addedProducts={addedProducts}
                setAddedProducts={setAddedProducts}
              />
            )}
            {step === 3 && (
              <SaleStep
                addedProducts={addedProducts}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 4 && (
              <ModulesStep
                tenant={tenant}
                vConfig={vConfig}
                onNext={goNext}
                onBack={goBack}
              />
            )}
            {step === 5 && <CtaStep navigate={navigate} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Skip link at bottom */}
      {step > 0 && step < 5 && (
        <div className="text-center pb-6">
          <button
            onClick={skipAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            <SkipForward className="w-3 h-3 inline mr-1" />
            Saltar todo e ir al dashboard
          </button>
        </div>
      )}
    </div>
  );
}
