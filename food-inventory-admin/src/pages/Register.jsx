import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { fetchApi } from '@/lib/api';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { Eye, EyeOff, Check, Sparkles, ArrowRight } from 'lucide-react';
import smartkubikLogo from '@/assets/logo-smartkubik.png';

const businessVerticals = [
  {
    name: 'Servicios de Comida',
    value: 'FOOD_SERVICE',
    categories: ['Restaurante', 'Cafetería', 'Food Truck', 'Catering', 'Bar'],
  },
  {
    name: 'Minoristas / Distribución',
    value: 'RETAIL',
    categories: [
      'Supermercado',
      'Tienda de Abarrotes',
      'Distribuidor Mayorista',
      'Mercado de Agricultores',
      'Moda',
      'Calzado',
      'Juguetes',
      'Herramientas',
      'Deporte',
      'Tecnología',
    ],
  },
  {
    name: 'Servicios',
    value: 'SERVICES',
    categories: ['Hotel', 'Hospital', 'Escuela', 'Oficina Corporativa'],
  },
  {
    name: 'Logística',
    value: 'LOGISTICS',
    categories: ['Almacén', 'Centro de Distribución', 'Transporte Refrigerado'],
  },
  {
    name: 'Fabricantes / Manufactura',
    value: 'MANUFACTURING',
    categories: [
      'Alimentos y Bebidas',
      'Química y Cosméticos',
      'Farmacéutica y Suplementos',
      'Metalmecánica',
      'Textil y Confección',
      'Plásticos y Empaques',
      'Electrónica',
      'Muebles y Madera',
      'Otro',
    ],
  },
  {
    name: 'Mixta (Multi-vertical)',
    value: 'HYBRID',
    categories: [
      'Hotel con Restaurante',
      'Hotel con Tienda Boutique',
      'Restaurante + Tienda',
      'Resort Todo Incluido',
      'Centro Comercial Gastronómico',
    ],
  },
];

const subscriptionPlans = [
  {
    id: 'fundamental',
    name: 'Fundamental',
    price: '$39 / mes',
    description: 'Para pequeños negocios que quieren orden.',
    features: [
      '1 usuario',
      '1 sucursal',
      'Todos los módulos básicos incluídos',
      'Web de ventas vinculada al sistema',
      'Analítica y reportes básicos',
      'Backup mensual',
      'Soporte estandar',
    ],
  },
  {
    id: 'crecimiento',
    name: 'Crecimiento',
    price: '$99 / mes',
    description: 'Para empresas que crecen rápido.',
    features: [
      'Todo lo del plan Fundamental',
      'Todos los módulos + funciones IA avanzadas',
      'Hasta 5 usuarios',
      'Hasta 2 sucursales',
      'Integración WhatsApp + ventas/reservas',
      'Automatizaciones IA',
      'Agente IA de Análisis predictivo',
      'Mayor personalización de tu web',
      'Integraciones Full (Gmail/Outlook)',
      'Backup semanal',
      'Soporte prioritario',
    ],
  },
  {
    id: 'expansion',
    name: 'Expansión',
    price: '$149 / mes',
    description: 'Para grandes operaciones y franquicias.',
    features: [
      'Todo lo del plan Crecimiento',
      'Usuarios Ilimitados',
      'Sucursales Ilimitadas',
      'Soporte dedicado / SLA',
      'Migración gratuita',
      'Asistente IA Ilimitado',
      'Back up diario',
      'Dominio web propio',
      'Acceso prioritario a nuevas funciones',
      'Web sin publicidad',
    ],
  },
];

const stepConfig = [
  { id: 1, label: 'Seleccionar plan' },
  { id: 2, label: 'Datos del negocio' },
  { id: 3, label: 'Administrador' },
  { id: 4, label: 'Confirmación' },
];

const StepIndicator = ({ currentStep }) => (
  <div className="mb-6">
    <div className="flex items-center justify-between gap-2">
      {stepConfig.map((step, index) => {
        const isActive = currentStep === step.id;
        const isCompleted = currentStep > step.id;
        return (
          <div key={step.id} className="flex-1 flex items-center">
            <div
              className={`relative flex items-center justify-center rounded-full border-2 w-10 h-10 text-sm font-medium transition-colors
                ${isCompleted
                  ? 'border-green-500 bg-green-500 text-white'
                  : isActive
                    ? 'border-primary text-primary'
                    : 'border-muted-foreground/30 text-muted-foreground'
                }
              `}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : step.id}
            </div>
            {index < stepConfig.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded ${currentStep > step.id ? 'bg-green-500' : 'bg-muted-foreground/20'
                  }`}
              />
            )}
          </div>
        );
      })}
    </div>
    <div className="mt-2 grid grid-cols-4 text-xs text-muted-foreground">
      {stepConfig.map((step) => (
        <div key={`${step.id}-label`} className="text-center">
          {step.label}
        </div>
      ))}
    </div>
  </div>
);

const PlanSelectionStep = ({ selectedPlan, onSelectPlan }) => (
  <div className="space-y-6">
    <div className="text-center space-y-2">
      <Badge className="mx-auto flex items-center gap-1 bg-primary/10 text-primary dark:bg-primary/20">
        <Sparkles className="h-3 w-3" />
        Configura tu cuenta
      </Badge>
      <h2 className="text-2xl font-semibold">Elige el plan que mejor se adapte a tu negocio</h2>
      <p className="text-sm text-muted-foreground max-w-lg mx-auto">
        Puedes cambiar de plan en cualquier momento. Comenzamos con la información básica para personalizar tu experiencia.
      </p>
    </div>
    <div className="grid gap-4">
      {subscriptionPlans.map((plan) => {
        const isSelected = selectedPlan === plan.id;
        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelectPlan(plan.id)}
            className={`w-full text-left p-5 rounded-lg border transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary
              ${isSelected ? 'border-primary ring-2 ring-primary/40' : 'border-muted-foreground/20'}
            `}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  {plan.id === 'crecimiento' && (
                    <Badge className="bg-primary/10 text-primary">Más popular</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">{plan.price}</p>
                <p className="text-xs text-muted-foreground">Sin cargos ocultos</p>
              </div>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end">
              <span
                className={`inline-flex items-center gap-1 text-sm font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`}
              >
                {isSelected ? 'Plan seleccionado' : 'Seleccionar plan'}
                <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

const BusinessInfoStep = ({ formData, setFormData, onNext, onBack }) => {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (formData.vertical) {
      const vertical = businessVerticals.find((v) => v.value === formData.vertical);
      setCategories(vertical ? vertical.categories : []);
    }
  }, [formData.vertical]);

  const handleVerticalChange = (value) => {
    setFormData((prev) => ({ ...prev, vertical: value, specificCategory: '' }));
  };

  const handleCategoryChange = (value) => {
    setFormData((prev) => ({ ...prev, specificCategory: value }));
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const canContinue =
    formData.businessName &&
    formData.vertical &&
    formData.numberOfUsers &&
    (formData.specificCategory || categories.length === 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onNext();
      }}
      className="space-y-4"
    >
      <div className="rounded-md border border-primary/20 bg-primary/10 dark:bg-primary/20 p-3 text-xs text-primary">
        Plan seleccionado: <strong>{subscriptionPlans.find((p) => p.id === formData.plan)?.name || 'Sin plan'}</strong>
      </div>
      <div className="space-y-2">
        <Label htmlFor="businessName">Nombre del negocio</Label>
        <Input
          id="businessName"
          placeholder="Ej: Restaurante El Buen Sabor"
          value={formData.businessName}
          onChange={handleChange}
          required
        />
      </div>
      <div className="space-y-2">
        <Label>Vertical de negocio</Label>
        <Select onValueChange={handleVerticalChange} value={formData.vertical}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione una vertical" />
          </SelectTrigger>
          <SelectContent>
            {businessVerticals.map((vertical) => (
              <SelectItem key={vertical.value} value={vertical.value}>
                {vertical.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {formData.vertical && (
        <div className="space-y-2">
          <Label>Categoría específica</Label>
          <Select onValueChange={handleCategoryChange} value={formData.specificCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="numberOfUsers">Número de usuarios</Label>
        <Input
          id="numberOfUsers"
          type="number"
          placeholder="Ej: 5"
          value={formData.numberOfUsers}
          onChange={handleChange}
          required
        />
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button type="submit" disabled={!canContinue}>
          Siguiente
        </Button>
      </div>
    </form>
  );
};

const AdminInfoStep = ({ formData, setFormData, onNext, onBack }) => {
  const [phoneValue, setPhoneValue] = useState(formData.phone || '');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setPhoneValue(formData.phone || '');
  }, [formData.phone]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handlePhoneChange = (value) => {
    setFormData((prev) => ({ ...prev, phone: value }));
  };

  useEffect(() => {
    if (formData.password && confirmPassword && formData.password !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden.');
    } else {
      setPasswordError('');
    }
  }, [formData.password, confirmPassword]);

  const canContinue =
    formData.firstName && formData.lastName && formData.email && phoneValue && formData.password && formData.password === confirmPassword;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canContinue) onNext();
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input id="firstName" value={formData.firstName} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input id="lastName" value={formData.lastName} onChange={handleChange} required />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Teléfono</Label>
        <PhoneInput
          id="phone"
          placeholder="4122346587"
          value={phoneValue}
          onChange={handlePhoneChange}
          defaultCountry="VE"
          required
          className="rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            required
            autoComplete="new-password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute inset-y-0 right-2 flex items-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Usa al menos 8 caracteres, combinando letras, números y símbolos.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        {passwordError && <p className="text-sm text-destructive mt-1">{passwordError}</p>}
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Atrás
        </Button>
        <Button type="submit" disabled={!canContinue || !!passwordError}>
          Siguiente
        </Button>
      </div>
    </form>
  );
};

const SummaryStep = ({ formData, onBack, onSubmit, loading, error }) => {
  const verticalName =
    businessVerticals.find((v) => v.value === formData.vertical)?.name || formData.vertical;
  const selectedPlan = subscriptionPlans.find((plan) => plan.id === formData.plan);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-primary/30 bg-primary/10 dark:bg-primary/20 p-3 text-sm text-primary">
        Te enviaremos un correo con un código de confirmación para activar tu cuenta.
      </div>
      <h3 className="font-medium">Resumen de registro</h3>
      <div className="space-y-2 rounded-md border p-4">
        <p>
          <strong>Plan seleccionado:</strong> {selectedPlan?.name}
        </p>
        <p>
          <strong>Negocio:</strong> {formData.businessName}
        </p>
        <p>
          <strong>Vertical:</strong> {verticalName}
        </p>
        <p>
          <strong>Categoría:</strong> {formData.specificCategory || 'N/A'}
        </p>
        <p>
          <strong>Usuarios:</strong> {formData.numberOfUsers}
        </p>
        <p>
          <strong>Administrador:</strong> {formData.firstName} {formData.lastName}
        </p>
        <p>
          <strong>Email:</strong> {formData.email}
        </p>
        <p>
          <strong>Teléfono:</strong> {formData.phone}
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Atrás
        </Button>
        <Button onClick={onSubmit} disabled={loading}>
          {loading ? 'Registrando...' : 'Confirmar y registrar'}
        </Button>
      </div>
    </div>
  );
};

function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    plan: '',
    businessName: '',
    numberOfUsers: '',
    vertical: '',
    specificCategory: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState(false);
  const { isAuthenticated, loginWithTokens } = useAuth();
  const navigate = useNavigate();

  const handleNext = () => setStep((prev) => Math.min(prev + 1, stepConfig.length));
  const handleBack = () => setStep((prev) => Math.max(prev - 1, 1));
  const handlePlanSelect = (planId) => {
    setFormData((prev) => ({ ...prev, plan: planId }));
    setStep(2);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const payload = {
      ...formData,
      businessType: formData.specificCategory,
      numberOfUsers: parseInt(formData.numberOfUsers || '0', 10),
      subscriptionPlan: formData.plan,
    };

    try {
      const response = await fetchApi('/onboarding/register', {
        method: 'POST',
        body: JSON.stringify(payload),
        isPublic: true,
      });
      await loginWithTokens(response);

      setCompleted(true);

      if (response?.tenant?.isConfirmed === false) {
        navigate('/confirm-account', {
          state: {
            email: formData.email,
            plan: formData.plan,
            tenant: response?.tenant,
          },
        });
        return;
      }

      navigate('/organizations');
    } catch (err) {
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PlanSelectionStep selectedPlan={formData.plan} onSelectPlan={handlePlanSelect} />;
      case 2:
        return (
          <BusinessInfoStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
        return (
          <AdminInfoStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 4:
        return (
          <SummaryStep
            formData={formData}
            onBack={handleBack}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
          />
        );
      default:
        return null;
    }
  };

  if (completed && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 px-4 py-10">
      <img src={smartkubikLogo} alt="Smartkubik Logo" className="h-12 w-auto mb-8" />
      <Card className="w-full max-w-3xl shadow-lg border border-muted-foreground/10">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Registro en SmartKubik</CardTitle>
          <CardDescription>Te guiaremos paso a paso. Podrás cambiar de plan cuando quieras.</CardDescription>
          <StepIndicator currentStep={step} />
        </CardHeader>
        <CardContent className="space-y-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}

export default Register;
