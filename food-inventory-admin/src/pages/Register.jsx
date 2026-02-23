import { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link } from 'react-router-dom';
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
import { Eye, EyeOff, Check, Sparkles, Rocket, Shield } from 'lucide-react';
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

const stepConfig = [
  { id: 1, label: 'Tu negocio' },
  { id: 2, label: 'Tu cuenta' },
  { id: 3, label: 'Confirmación' },
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
    <div className="mt-2 grid grid-cols-3 text-xs text-muted-foreground">
      {stepConfig.map((step) => (
        <div key={`${step.id}-label`} className="text-center">
          {step.label}
        </div>
      ))}
    </div>
  </div>
);

const BusinessInfoStep = ({ formData, setFormData, onNext }) => {
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
      <div className="text-center space-y-2 mb-2">
        <Badge className="mx-auto flex items-center gap-1 bg-primary/10 text-primary dark:bg-primary/20">
          <Sparkles className="h-3 w-3" />
          14 días gratis — sin tarjeta de crédito
        </Badge>
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
      <div className="flex justify-end">
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

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-green-500/30 bg-green-500/10 dark:bg-green-500/20 p-4 text-sm">
        <div className="flex items-start gap-3">
          <Rocket className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-green-700 dark:text-green-300">Prueba gratuita de 14 días</p>
            <p className="text-green-600 dark:text-green-400 mt-1">
              Acceso completo a todos los módulos. Sin tarjeta de crédito. Sin compromisos.
            </p>
          </div>
        </div>
      </div>

      <h3 className="font-medium">Resumen de registro</h3>
      <div className="space-y-2 rounded-md border p-4">
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

      <div className="rounded-md border border-primary/20 bg-primary/5 dark:bg-primary/10 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary shrink-0" />
          <span>Te enviaremos un correo con un código de confirmación para activar tu cuenta.</span>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={loading}>
          Atrás
        </Button>
        <Button onClick={onSubmit} disabled={loading} size="lg">
          {loading ? 'Registrando...' : 'Comenzar mi prueba GRATIS de 14 días'}
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        ¿Ya decidiste? También puedes acceder directo al{' '}
        <Link to="/fundadores" className="text-primary hover:underline font-medium">
          Programa Clientes Fundadores
        </Link>{' '}
        y bloquear tu precio de por vida.
      </p>
    </div>
  );
};

function Register() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
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

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    const payload = {
      ...formData,
      businessType: formData.specificCategory,
      numberOfUsers: parseInt(formData.numberOfUsers || '0', 10),
      subscriptionPlan: 'trial',
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
            plan: 'trial',
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
        return (
          <BusinessInfoStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
          />
        );
      case 2:
        return (
          <AdminInfoStep
            formData={formData}
            setFormData={setFormData}
            onNext={handleNext}
            onBack={handleBack}
          />
        );
      case 3:
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
          <CardTitle className="text-2xl">Prueba SmartKubik gratis por 14 días</CardTitle>
          <CardDescription>Sin tarjeta de crédito. Acceso completo a todos los módulos.</CardDescription>
          <StepIndicator currentStep={step} />
        </CardHeader>
        <CardContent className="space-y-6">{renderStep()}</CardContent>
      </Card>
    </div>
  );
}

export default Register;
